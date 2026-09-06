import { StorageUnavailableError } from '@/server/data/kv';
import { HttpError, storageDown } from '@/server/http/errors';
import { describeError, redact } from '@/server/log';
import type { ApiErrorBody } from '@/lib/auth/types';

/**
 * Response construction and the single error boundary for account routes.
 *
 * Two properties are enforced here rather than trusted to twenty route files.
 * Every account response carries `Cache-Control: no-store` and `Vary: Cookie`, so
 * no CDN or intermediary can hand one person's profile to the next visitor. And no
 * unexpected error reaches the client: an exception becomes a generic 500 with a
 * short code, while the detail goes to the server log with secrets scrubbed out.
 */

/** Applied to every response from this module. */
const PRIVATE_HEADERS: Readonly<Record<string, string>> = {
  'cache-control': 'no-store, no-cache, must-revalidate, private',
  vary: 'Cookie',
  'referrer-policy': 'same-origin',
  'x-content-type-options': 'nosniff',
};

function withPrivateHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) merged.set(name, value);
  return merged;
}

export function jsonOk<T>(data: T, init: { status?: number; headers?: HeadersInit } = {}): Response {
  return Response.json(data, { status: init.status ?? 200, headers: withPrivateHeaders(init.headers) });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: withPrivateHeaders() });
}

/**
 * Removes anything that must never appear in a log line — see `src/server/log.ts`
 * for why this is applied unconditionally rather than per message.
 */

function errorBody(error: HttpError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
      ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
    },
  };
}

export function jsonError(error: HttpError): Response {
  const headers = withPrivateHeaders();
  if (error.retryAfter) headers.set('retry-after', String(error.retryAfter));
  return Response.json(errorBody(error), { status: error.status, headers });
}

/**
 * Wraps a route handler so every failure path produces the same response shape.
 *
 * `route` is only used for the log line, so a 500 in production can be located
 * without shipping a stack trace to the browser.
 */
export function route<Args extends unknown[]>(
  name: string,
  handler: (request: Request, ...args: Args) => Promise<Response>,
): (request: Request, ...args: Args) => Promise<Response> {
  return async (request, ...args) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof HttpError) return jsonError(error);
      if (error instanceof StorageUnavailableError) {
        console.error(`[cineora] ${name}: storage unavailable — ${redact(error.message)}`);
        return jsonError(storageDown());
      }
      const message = describeError(error);
      console.error(`[cineora] ${name} failed — ${message}`);
      return jsonError(new HttpError(500, 'server_error', 'Something went wrong on our side. Please try again.'));
    }
  };
}

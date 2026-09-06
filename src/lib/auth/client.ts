import type { ApiErrorBody } from '@/lib/auth/types';

/**
 * The browser's side of the account API.
 *
 * Two rules shape this file. The CSRF token lives in a module variable and never
 * touches `localStorage` — a value in storage survives an XSS long after the tab
 * closes, and there is nothing to gain from persisting a token the session endpoint
 * hands out on every load. And every failure arrives as one `ApiError`, so a form
 * can read `error.fields` without knowing which endpoint it called.
 *
 * Requests are `same-origin` with credentials: the session is an HttpOnly cookie,
 * so there is no header to attach and nothing for a script to read.
 */

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  readonly retryAfter?: number;

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields ?? {};
    this.retryAfter = body.retryAfter;
  }

  /** True when the account system is switched off or its storage is unreachable. */
  get isUnavailable(): boolean {
    return this.code === 'accounts_disabled' || this.code === 'storage_unavailable';
  }
}

/** A network failure, worded for a person rather than a console. */
const offline = (): ApiError =>
  new ApiError(0, {
    code: 'offline',
    message: 'Cineora could not reach the network. Check your connection and try again.',
  });

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Raw bytes for the avatar upload, which is not JSON. */
  blob?: Blob;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { accept: 'application/json' };

  if (method !== 'GET') {
    if (csrfToken) headers['x-cineora-csrf'] = csrfToken;
    // Marks the request as same-origin script traffic for servers behind a proxy
    // that strips `Sec-Fetch-Site`.
    headers['x-requested-with'] = 'cineora';
  }

  let body: BodyInit | undefined;
  if (options.blob) {
    body = options.blob;
    headers['content-type'] = options.blob.type || 'application/octet-stream';
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers['content-type'] = 'application/json';
  } else if (method !== 'GET') {
    // Every mutating route reads a JSON body, so an empty one still declares itself.
    body = '{}';
    headers['content-type'] = 'application/json';
  }

  try {
    return await fetch(path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal: options.signal,
    });
  } catch {
    throw offline();
  }
}

async function toError(response: Response): Promise<ApiError> {
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    // A response that is not JSON means something upstream answered instead of a
    // route. There is nothing useful to show the user beyond the status.
  }

  const error = (parsed as ApiErrorBody | null)?.error;
  if (error && typeof error.code === 'string' && typeof error.message === 'string') {
    return new ApiError(response.status, error);
  }
  return new ApiError(response.status, {
    code: 'server_error',
    message: 'Something went wrong on our end. Try again in a moment.',
  });
}

/**
 * One request, with a single retry when the CSRF token has gone stale.
 *
 * A tab left open overnight outlives its token. Rather than showing an error the
 * user cannot act on, the session endpoint is asked for a fresh token and the
 * original request runs once more — and only once, so a genuine rejection still
 * surfaces.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  if (response.status === 403 && options.method && options.method !== 'GET') {
    const error = await toError(response);
    if (error.code !== 'csrf_invalid') throw error;
    await refreshCsrfToken();
    response = await send(path, options);
  }

  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, {
      code: 'server_error',
      message: 'Cineora received an unexpected response. Try again.',
    });
  }
}

/** Re-reads the session endpoint purely for its token. */
async function refreshCsrfToken(): Promise<void> {
  try {
    const response = await send('/api/auth/session', {});
    if (!response.ok) return;
    const data = (await response.json()) as { csrfToken?: string | null };
    if (typeof data.csrfToken === 'string') csrfToken = data.csrfToken;
  } catch {
    // Leaves the old token in place; the caller's retry will fail honestly.
  }
}

import { createHmac } from 'node:crypto';
import { CSRF_COOKIE, CSRF_HEADER, readCookie } from '@/server/auth/cookies';
import { safeEqual } from '@/server/crypto/tokens';
import { sessionSecret } from '@/server/env';
import { badRequest, csrfFailed, forbidden, payloadTooLarge } from '@/server/http/errors';

/**
 * Everything a route needs to know about the request it is answering, and the two
 * checks it must pass before being allowed to change anything.
 */

/** Default ceiling for a JSON body. Account payloads are a few hundred bytes. */
export const JSON_LIMIT = 16 * 1024;

function header(request: Request, name: string): string | null {
  const value = request.headers.get(name);
  return value && value.trim().length > 0 ? value.trim() : null;
}

/**
 * The caller's address, as far as the platform will say.
 *
 * Netlify's own header is preferred because it is set by the edge and cannot be
 * spoofed by the client; `x-forwarded-for` is only consulted as a fallback, and
 * only its first entry, since the rest are appended hops. The value is used for
 * throttling and for distinguishing devices, never for geolocation, and it is
 * hashed before it is stored.
 */
export function clientIp(request: Request): string | null {
  const direct = header(request, 'x-nf-client-connection-ip') ?? header(request, 'cf-connecting-ip');
  if (direct) return direct;
  const forwarded = header(request, 'x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return header(request, 'x-real-ip');
}

/**
 * Keyed digest of an address.
 *
 * Truncated to 24 hex characters: enough to tell two sessions apart, short enough
 * that it is not a durable identifier, and keyed so it cannot be matched against a
 * precomputed table of the IPv4 space.
 */
export function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined;
  return createHmac('sha256', sessionSecret()).update(`ip:${ip}`).digest('hex').slice(0, 24);
}

export function userAgent(request: Request): string {
  // Truncated because it is stored, and a hostile client can send a very long one.
  return (header(request, 'user-agent') ?? 'Unknown device').slice(0, 300);
}

function requestHost(request: Request): string | null {
  const forwarded = header(request, 'x-forwarded-host');
  if (forwarded) return forwarded.split(',')[0]?.trim().toLowerCase() ?? null;
  const host = header(request, 'host');
  if (host) return host.toLowerCase();
  try {
    return new URL(request.url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extra origins allowed to make state-changing calls.
 *
 * Same-origin needs no configuration — the check below compares against the host
 * actually serving the request, so every Netlify branch and preview deploy works
 * untouched. This exists for the case of a wrapper application served from its own
 * scheme, and it is an explicit allowlist rather than a wildcard.
 */
function extraOrigins(): string[] {
  const raw = process.env.CINEORA_ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase().replace(/\/+$/, ''))
    .filter((value) => value.length > 0);
}

/**
 * Rejects a cross-site write.
 *
 * Three independent signals, in the order of how much they can be trusted.
 * `Sec-Fetch-Site` is set by the browser and unforgeable from script, so when it
 * is present it decides. Otherwise the `Origin` header is compared to the serving
 * host. A request with neither is allowed through to the CSRF token check, which
 * is the one an older WebView cannot fake either — it cannot read our cookie.
 */
function assertSameOrigin(request: Request): void {
  const fetchSite = header(request, 'sec-fetch-site');
  if (fetchSite) {
    if (fetchSite === 'same-origin') return;
    const origin = header(request, 'origin')?.toLowerCase().replace(/\/+$/, '');
    if (origin && extraOrigins().includes(origin)) return;
    throw forbidden('This request looks like it came from another site.');
  }

  const origin = header(request, 'origin');
  if (!origin) return;

  const normalised = origin.toLowerCase().replace(/\/+$/, '');
  if (extraOrigins().includes(normalised)) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw forbidden('This request looks like it came from another site.');
  }
  if (originHost !== requestHost(request)) {
    throw forbidden('This request looks like it came from another site.');
  }
}

/**
 * Double-submit check.
 *
 * The token lives in an `HttpOnly` cookie and is handed to the application in the
 * body of `/api/auth/session`, so only code running on this origin can echo it
 * back in the header. A cross-site page can cause the cookie to be *sent* but can
 * never read its value, which is what makes the pair meaningful.
 */
async function assertCsrfToken(request: Request): Promise<void> {
  const cookie = await readCookie(CSRF_COOKIE);
  const sent = header(request, CSRF_HEADER);
  if (!cookie || !sent || !safeEqual(cookie, sent)) {
    throw csrfFailed();
  }
}

/** Every state-changing route calls this before reading its body. */
export async function assertMutationAllowed(request: Request): Promise<void> {
  assertSameOrigin(request);
  await assertCsrfToken(request);
}

/** Reads a body while refusing to buffer more than `maxBytes`. */
export async function readLimitedBytes(request: Request, maxBytes: number): Promise<Buffer> {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) throw payloadTooLarge();

  const body = request.body;
  if (!body) return Buffer.alloc(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        // Stop pulling rather than draining a body that is already over budget.
        await reader.cancel().catch(() => undefined);
        throw payloadTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
  return (await readLimitedBytes(request, maxBytes)).toString('utf8');
}

/**
 * Parses a JSON body defensively.
 *
 * The return type is `unknown` on purpose: the field validators decide what the
 * payload contains. Nothing in this codebase casts a request body to an interface
 * and trusts it.
 */
export async function readJson(request: Request, maxBytes = JSON_LIMIT): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw badRequest('Expected a JSON body.');
  }
  const text = await readLimitedText(request, maxBytes);
  if (text.trim().length === 0) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw badRequest('That request body could not be read.');
  }
}

/** Rejects an oversized upload before its body is buffered by `formData()`. */
export function assertUploadSize(request: Request, maxBytes: number): void {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) throw payloadTooLarge();
}

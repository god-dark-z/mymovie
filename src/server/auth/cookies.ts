import { cookies } from 'next/headers';
import { newToken, sign, unsign } from '@/server/crypto/tokens';
import { IS_PRODUCTION } from '@/server/env';

/**
 * Cookie handling for the account system.
 *
 * Three deliberate choices, all of them the reason authentication state is not
 * kept in `localStorage`:
 *
 * - `httpOnly` on both cookies, so no script — including one injected through a
 *   cross-site scripting bug — can read a session id or the CSRF token.
 * - `sameSite: 'lax'`, so a cross-site form post cannot carry the session at all,
 *   while an ordinary link into Cineora from an email still arrives signed in.
 * - `secure` in production. It is off in development because `localhost` is
 *   served over plain HTTP and a `Secure` cookie there would simply be dropped.
 *
 * The session cookie value is HMAC-signed. That is not confidentiality — the id is
 * not a secret from its owner — it means a tampered value is rejected by
 * arithmetic before it costs a storage read.
 */

export const SESSION_COOKIE = 'cineora_session';
export const CSRF_COOKIE = 'cineora_csrf';
export const CSRF_HEADER = 'x-cineora-csrf';

interface WriteOptions {
  maxAge: number;
}

const base = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
} as const;

export async function readCookie(name: string): Promise<string | null> {
  const jar = await cookies();
  return jar.get(name)?.value ?? null;
}

/** The session id from the cookie, or null if absent, tampered with or malformed. */
export async function readSessionCookie(): Promise<string | null> {
  const raw = await readCookie(SESSION_COOKIE);
  if (!raw) return null;
  return unsign(raw);
}

export async function writeSessionCookie(sessionId: string, options: WriteOptions): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sign(sessionId), { ...base, maxAge: options.maxAge });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  // An immediate expiry rather than `delete`, so the browser is told to drop it
  // even when the response is served from a different path than it was set on.
  jar.set(SESSION_COOKIE, '', { ...base, maxAge: 0 });
}

/**
 * Returns the CSRF token, minting one when the visitor does not have it yet.
 *
 * Called by `/api/auth/session`, which the application loads before it can offer
 * any form, so a token is always in place by the time one is needed. The token is
 * unrelated to the session: it exists for anonymous visitors too, because sign-in
 * and password-reset requests need the same protection as authenticated writes.
 */
export async function ensureCsrfToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CSRF_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{32,}$/.test(existing)) return existing;

  const token = newToken();
  // A day is long enough to outlast any realistic form session and short enough
  // that a stale token is replaced routinely.
  jar.set(CSRF_COOKIE, token, { ...base, maxAge: 60 * 60 * 24 });
  return token;
}

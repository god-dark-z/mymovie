/**
 * Where to go after signing in.
 *
 * The `?next=` parameter is attacker-controllable — a link can be mailed to anyone
 * — so it is treated as a claim to be checked, never a destination to be trusted.
 * Only a single-slash relative path within this app is accepted, which rules out
 * `//evil.example` (a protocol-relative URL the browser reads as another origin),
 * absolute URLs, and `javascript:` payloads alike.
 */

const SAFE_PATH = /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@/%?#[\]]*$/;

/** Paths it makes no sense to return to, because they are part of getting in. */
const EXCLUDED = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'];

export function safeNextPath(value: string | null | undefined, fallback = '/account'): string {
  if (!value) return fallback;
  if (value.length > 512) return fallback;
  if (!SAFE_PATH.test(value)) return fallback;

  // A backslash is a slash to some browsers, so `/\evil.example` would escape.
  if (value.includes('\\')) return fallback;

  const path = value.split(/[?#]/)[0] ?? '';
  if (EXCLUDED.some((entry) => path === entry || path.startsWith(`${entry}/`))) return fallback;
  return value;
}

/** Builds the sign-in link that returns to where the user was. */
export function loginHref(from?: string | null): string {
  if (!from) return '/login';
  return `/login?next=${encodeURIComponent(from)}`;
}

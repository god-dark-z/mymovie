import { sign, unsign } from '@/server/crypto/tokens';

/**
 * Download grants.
 *
 * A grant is a short-lived capability naming one file and one account, signed with
 * the deployment's secret. It exists because a download cannot rely on a cookie: the
 * browser's own downloader — or a WebView host's download manager — follows the URL
 * in a separate request it may retry or resume, without the credentials the page had.
 *
 * The tradeoff is worth stating plainly rather than hiding: for fifteen minutes the
 * URL is the permission. It is not a session and cannot be exchanged for one, it
 * carries no personal data beyond an account id the holder already is, and it stops
 * working when the clock runs out or the signing secret is rotated. Nothing is
 * stored, which is what lets it survive on serverless with no shared state.
 */

/** Long enough to start a large file on a poor connection, short enough to matter. */
export const GRANT_TTL_SECONDS = 15 * 60;

/** Deliberately terse: this payload is base64url'd into a URL. */
interface GrantPayload {
  /** Account id, kept so the transfer can be attributed in the security log. */
  u: string;
  /** Catalogue key. */
  k: string;
  /** Expiry, epoch seconds. */
  e: number;
}

export interface Grant {
  userId: string;
  key: string;
  /** Epoch milliseconds, to match the rest of the codebase. */
  expiresAt: number;
}

export interface IssuedGrant extends Grant {
  token: string;
}

export function issueGrant(userId: string, key: string): IssuedGrant {
  const expires = Math.floor(Date.now() / 1000) + GRANT_TTL_SECONDS;
  const payload: GrantPayload = { u: userId, k: key, e: expires };
  const token = sign(Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url'));
  return { token, userId, key, expiresAt: expires * 1000 };
}

/**
 * Verifies a grant and returns what it permits, or null.
 *
 * Signature first, then expiry, then shape — an unsigned token is rejected before
 * anything inside it is parsed, so a stranger's JSON never reaches `JSON.parse`.
 */
export function readGrant(token: string): Grant | null {
  const encoded = unsign(token);
  if (!encoded) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;

  const { u, k, e } = payload as Partial<GrantPayload>;
  if (typeof u !== 'string' || typeof k !== 'string' || typeof e !== 'number') return null;
  if (!Number.isFinite(e) || e * 1000 <= Date.now()) return null;
  return { userId: u, key: k, expiresAt: e * 1000 };
}

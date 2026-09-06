import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { sessionSecret } from '@/server/env';

/**
 * Opaque identifiers and single-use secrets.
 *
 * Two rules shape this file. Anything a user could receive by email is stored
 * only as a SHA-256 digest, so a leaked database cannot be replayed against the
 * live site — the plaintext exists solely inside the outbound message. And every
 * comparison of a secret goes through `timingSafeEqual`, because a byte-by-byte
 * early return is enough to guess a token remotely given enough attempts.
 *
 * SHA-256 without a work factor is correct here and would be wrong for a
 * password: these tokens are 256 bits of `randomBytes`, so there is no
 * lower-entropy guess for an attacker to try.
 */

/** Sortable-enough unique id. UUIDv4 avoids leaking record counts. */
export const newId = (): string => randomUUID();

/** 32 raw bytes, URL-safe. Long enough to sit in a link without ambiguity. */
export const newToken = (): string => randomBytes(32).toString('base64url');

/**
 * A six-group code a person can retype from a phone: 24 bits of entropy in
 * `XXXX-XXXX` form, using an alphabet without the characters people confuse.
 * Codes are rate limited and single-use, which is what carries the security —
 * the code shape only has to be typeable.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newVerificationCode(): string {
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    if (i === 3) out += '-';
  }
  return out;
}

/** Normalises what a user typed so `AbC-d3f ` still matches. */
export const normalizeCode = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.{4})$/, '$1-$2');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('base64url');

/** Constant-time string comparison that tolerates differing lengths. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    // Still do the work, so length alone is not a timing oracle.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Attaches a keyed signature to a value.
 *
 * The session cookie carries a session id that is already unguessable, so the
 * signature is not what keeps sessions private — it lets us reject a tampered or
 * foreign cookie without a storage round trip, which keeps the hot path cheap.
 */
export function sign(value: string): string {
  const mac = createHmac('sha256', sessionSecret()).update(value).digest('base64url');
  return `${value}.${mac}`;
}

export function unsign(signed: string): string | null {
  const index = signed.lastIndexOf('.');
  if (index <= 0) return null;
  const value = signed.slice(0, index);
  const mac = signed.slice(index + 1);
  const expected = createHmac('sha256', sessionSecret()).update(value).digest('base64url');
  return safeEqual(mac, expected) ? value : null;
}

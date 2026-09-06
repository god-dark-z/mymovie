import { keys, kv } from '@/server/data/store';
import type { RateBucketRecord } from '@/server/data/types';
import { tooManyRequests } from '@/server/http/errors';

/**
 * Request throttling, backed by the same store as everything else.
 *
 * A counter in module scope would be worthless on a serverless platform where
 * each container starts fresh, so the buckets are persisted. The cost is one
 * extra read and write on a limited endpoint, which is the right trade against
 * an unmetered password-guessing loop.
 *
 * Blocks escalate with repetition and stop escalating at fifteen minutes. Nobody
 * gets locked out of their own account for mistyping a password: the door reopens
 * on its own, and a successful sign-in clears the bucket outright.
 */
export interface RateLimitRule {
  name: string;
  windowMs: number;
  max: number;
  /** First block length. Doubles per consecutive block, capped below. */
  blockMs: number;
}

const MAX_BLOCK_MS = 15 * 60 * 1000;

export const RATE_LIMITS = {
  login: { name: 'login', windowMs: 15 * 60_000, max: 8, blockMs: 60_000 },
  loginByIp: { name: 'login-ip', windowMs: 15 * 60_000, max: 30, blockMs: 60_000 },
  register: { name: 'register', windowMs: 60 * 60_000, max: 5, blockMs: 5 * 60_000 },
  resendVerification: { name: 'resend', windowMs: 60 * 60_000, max: 3, blockMs: 10 * 60_000 },
  verify: { name: 'verify', windowMs: 15 * 60_000, max: 12, blockMs: 60_000 },
  forgotPassword: { name: 'forgot', windowMs: 60 * 60_000, max: 5, blockMs: 5 * 60_000 },
  resetPassword: { name: 'reset', windowMs: 60 * 60_000, max: 10, blockMs: 60_000 },
  changePassword: { name: 'change-password', windowMs: 15 * 60_000, max: 5, blockMs: 60_000 },
  profile: { name: 'profile', windowMs: 5 * 60_000, max: 30, blockMs: 30_000 },
  avatar: { name: 'avatar', windowMs: 60 * 60_000, max: 12, blockMs: 60_000 },
  download: { name: 'download', windowMs: 60 * 60_000, max: 60, blockMs: 60_000 },
  exportData: { name: 'export', windowMs: 60 * 60_000, max: 4, blockMs: 5 * 60_000 },
  deleteAccount: { name: 'delete-account', windowMs: 60 * 60_000, max: 5, blockMs: 5 * 60_000 },
  /** Registration attempts aimed at one address, so a stranger cannot spam it. */
  registerByEmail: { name: 'register-email', windowMs: 60 * 60_000, max: 3, blockMs: 10 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export interface RateVerdict {
  allowed: boolean;
  /** Seconds to wait. Zero when allowed. */
  retryAfter: number;
  remaining: number;
}

const ALLOWED = (remaining: number): RateVerdict => ({ allowed: true, retryAfter: 0, remaining });

/**
 * Records one attempt against a bucket.
 *
 * `identity` is whatever makes the limit meaningful — an address digest, a user
 * id, an IP digest — and is hashed again into the storage key, so no identifier
 * is readable from a listing of the store.
 */
export async function consume(rule: RateLimitRule, identity: string): Promise<RateVerdict> {
  const store = kv();
  const key = keys.rate(`${rule.name}:${identity}`);
  const now = Date.now();

  let bucket: RateBucketRecord;
  try {
    bucket = (await store.getJson<RateBucketRecord>(key)) ?? { hits: [], strikes: 0 };
  } catch {
    // A throttle that cannot read its own state must not lock the door shut.
    return ALLOWED(rule.max);
  }

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000), remaining: 0 };
  }

  const hits = bucket.hits.filter((at) => now - at < rule.windowMs);
  // A quiet window means the previous escalation is forgiven.
  const strikes = hits.length === 0 ? 0 : bucket.strikes;
  hits.push(now);

  if (hits.length > rule.max) {
    const blockMs = Math.min(rule.blockMs * 2 ** Math.min(strikes, 4), MAX_BLOCK_MS);
    const next: RateBucketRecord = { hits: [], strikes: strikes + 1, blockedUntil: now + blockMs };
    await store.setJson(key, next).catch(() => undefined);
    return { allowed: false, retryAfter: Math.ceil(blockMs / 1000), remaining: 0 };
  }

  await store
    .setJson(key, { hits, strikes, blockedUntil: undefined } satisfies RateBucketRecord)
    .catch(() => undefined);
  return ALLOWED(rule.max - hits.length);
}

/** Clears a bucket after the attempt it was guarding finally succeeded. */
export async function forgive(rule: RateLimitRule, identity: string): Promise<void> {
  await kv()
    .delete(keys.rate(`${rule.name}:${identity}`))
    .catch(() => undefined);
}

/**
 * Records an attempt and throws a 429 if the bucket is exhausted.
 *
 * The thrown error carries `retryAfter`, which becomes both the `Retry-After`
 * header and a countdown in the form, so a blocked person is told how long rather
 * than left guessing.
 */
export async function enforce(rule: RateLimitRule, identity: string): Promise<void> {
  const verdict = await consume(rule, identity);
  if (!verdict.allowed) {
    throw tooManyRequests(
      verdict.retryAfter,
      verdict.retryAfter > 90
        ? `Too many attempts. Try again in about ${Math.ceil(verdict.retryAfter / 60)} minutes.`
        : `Too many attempts. Try again in ${verdict.retryAfter} seconds.`,
    );
  }
}

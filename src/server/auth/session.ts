import { cache } from 'react';
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from '@/server/auth/cookies';
import { describeDevice } from '@/server/auth/device';
import { newToken } from '@/server/crypto/tokens';
import { events } from '@/server/data/events';
import { sessions } from '@/server/data/sessions';
import { users } from '@/server/data/users';
import type { SecurityEventType, SessionRecord, UserRecord } from '@/server/data/types';
import { accountsStatus, serverConfig } from '@/server/env';
import { clientIp, hashIp, userAgent } from '@/server/http/request';
import { notConfigured, unauthorized } from '@/server/http/errors';

/**
 * Session lifecycle.
 *
 * The browser holds an opaque, signed session id and nothing else. Every request
 * that claims to be signed in is checked against the stored record, so revoking a
 * device takes effect on the device's next request rather than whenever a token
 * happens to expire. That is the whole reason this is not a self-contained JWT.
 */

export interface AuthContext {
  user: UserRecord;
  session: SessionRecord;
}

/** Bound so one account cannot grow an unbounded session index. */
const MAX_SESSIONS_PER_USER = 12;

let statusCache: ReturnType<typeof accountsStatus> | undefined;

export function accountsEnabled(): boolean {
  statusCache ??= accountsStatus();
  return statusCache.enabled;
}

/**
 * Throws the "not configured" error unless this deployment can run accounts.
 *
 * Called at the top of every account route, so a deployment missing its secrets
 * answers honestly instead of failing somewhere deep in a hash function.
 */
export function assertAccountsEnabled(): void {
  if (!accountsEnabled()) throw notConfigured();
}

export function sessionTtl(remember: boolean): number {
  const config = serverConfig();
  return remember ? config.rememberTtl : config.sessionTtl;
}

/**
 * Resolves the signed-in user, or null.
 *
 * Memoised per request so a layout and the page it renders share one lookup.
 * React's `cache` degrades to a plain call outside a request scope, which is
 * exactly the behaviour a route handler wants.
 */
export const currentAuth = cache(async (): Promise<AuthContext | null> => {
  if (!accountsEnabled()) return null;

  const sessionId = await readSessionCookie();
  if (!sessionId) return null;

  const session = await sessions.find(sessionId);
  if (!session) return null;

  const user = await users.findById(session.userId);
  if (!user) {
    // The account was deleted while a session was still live.
    await sessions.revoke(session.userId, session.id);
    return null;
  }

  const touched = await sessions.touch(session, sessionTtl(session.remember));
  return { user, session: touched };
});

export async function requireAuth(): Promise<AuthContext> {
  assertAccountsEnabled();
  const auth = await currentAuth();
  if (!auth) throw unauthorized();
  return auth;
}

/**
 * Some actions are too sensitive to allow from an unverified address.
 *
 * Reading and editing your own profile is not one of them — locking someone out of
 * their own settings because a verification email was delayed would be hostile.
 * Downloads and data export are, because both hand out content or personal data.
 */
export async function requireVerified(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (!auth.user.emailVerified) {
    throw unauthorized('Confirm your email address to use this feature.');
  }
  return auth;
}

export interface StartSessionOptions {
  request: Request;
  remember: boolean;
}

/**
 * Creates a session and sets the cookie.
 *
 * The id is 32 random bytes rather than a sequential value or a hash of anything
 * about the account, so one session id reveals nothing about another.
 */
export async function startSession(user: UserRecord, options: StartSessionOptions): Promise<SessionRecord> {
  const now = Date.now();
  const ttl = sessionTtl(options.remember);
  const ua = userAgent(options.request);

  const record: SessionRecord = {
    id: newToken(),
    userId: user.id,
    createdAt: now,
    expiresAt: now + ttl * 1000,
    lastActiveAt: now,
    device: describeDevice(ua),
    userAgent: ua,
    ipHash: hashIp(clientIp(options.request)),
    remember: options.remember,
  };

  await sessions.create(record);
  await writeSessionCookie(record.id, { maxAge: ttl });
  await pruneSessions(user.id, record.id);
  return record;
}

/** Drops the least recently used sessions once the cap is exceeded. */
async function pruneSessions(userId: string, keepId: string): Promise<void> {
  const all = await sessions.listForUser(userId);
  if (all.length <= MAX_SESSIONS_PER_USER) return;
  const surplus = all.filter((record) => record.id !== keepId).slice(MAX_SESSIONS_PER_USER - 1);
  for (const record of surplus) await sessions.revoke(userId, record.id);
}

export async function endSession(auth: AuthContext): Promise<void> {
  await sessions.revoke(auth.user.id, auth.session.id);
  await clearSessionCookie();
}

/**
 * Appends to the account's security log.
 *
 * Takes the request so device and address are derived in one place, and never
 * accepts a raw identifier: `detail` is a short human phrase such as
 * "display name", written to be readable in the activity list.
 */
export async function logEvent(options: {
  userId: string;
  type: SecurityEventType;
  request: Request;
  detail?: string;
}): Promise<void> {
  const ua = userAgent(options.request);
  await events.append({
    userId: options.userId,
    type: options.type,
    device: describeDevice(ua),
    ipHash: hashIp(clientIp(options.request)),
    detail: options.detail,
  });
}

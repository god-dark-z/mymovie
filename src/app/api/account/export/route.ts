import type { AccountExport } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { requireAuth } from '@/server/auth/session';
import { events } from '@/server/data/events';
import { sessions } from '@/server/data/sessions';
import { route } from '@/server/http/respond';

/**
 * Take your data with you.
 *
 * What this file contains is everything the account holds about the person. What
 * it deliberately does not contain: the password hash, session ids, verification or
 * reset tokens, and the keyed IP digests. An export lands in a downloads folder and
 * gets emailed around, so it must not carry anything replayable — a hash included
 * "for completeness" would be an offline cracking target handed over on request.
 *
 * Watchlist and history are not here because they live in the browser, not on the
 * server; the privacy screen says so rather than implying we hold more than we do.
 */
export const dynamic = 'force-dynamic';

const iso = (at: number): string => new Date(at).toISOString();

export const GET = route('account/export', async () => {
  const auth = await requireAuth();
  const { user } = auth;
  await enforce(RATE_LIMITS.exportData, user.id);

  const [deviceList, activity] = await Promise.all([
    sessions.listForUser(user.id),
    events.listForUser(user.id, 50),
  ]);

  const payload: AccountExport = {
    exportedAt: new Date().toISOString(),
    format: 1,
    account: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username ?? null,
      bio: user.bio ?? null,
      emailVerified: user.emailVerified,
      createdAt: iso(user.createdAt),
      updatedAt: iso(user.updatedAt),
    },
    preferences: user.preferences,
    sessions: deviceList.map((record) => ({
      device: record.device,
      createdAt: iso(record.createdAt),
      lastActiveAt: iso(record.lastActiveAt),
      current: record.id === auth.session.id,
    })),
    activity: activity.map((record) => ({
      type: record.type,
      at: iso(record.at),
      device: record.device,
      detail: record.detail ?? null,
    })),
    notes: [
      'This export contains no password, password hash, session token or IP address.',
      'Your watchlist and viewing history are stored on your device, not on Cineora servers, so they are not part of this file.',
    ],
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="cineora-account-${stamp}.json"`,
      'cache-control': 'no-store, no-cache, must-revalidate, private',
      vary: 'Cookie',
      'x-content-type-options': 'nosniff',
    },
  });
});

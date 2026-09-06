import type { SessionsResponse } from '@/lib/auth/types';
import { toSessionSummary } from '@/server/auth/serialize';
import { logEvent, requireAuth } from '@/server/auth/session';
import { sessions } from '@/server/data/sessions';
import { assertMutationAllowed, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';

/**
 * Signed-in devices.
 *
 * Device labels are derived from the user agent and are approximate — the UI says
 * so, because a confident-looking wrong label ("iPhone in Berlin") invites people
 * to dismiss a real intrusion. No IP address or location is shown or stored; only
 * a keyed digest exists, which is enough to tell two sessions apart.
 */
export const dynamic = 'force-dynamic';

export const GET = route('security/sessions/list', async () => {
  const auth = await requireAuth();
  const all = await sessions.listForUser(auth.user.id);
  return jsonOk<SessionsResponse>({
    sessions: all.map((record) => toSessionSummary(record, auth.session.id)),
  });
});

/**
 * Revokes one session, or every session except this one.
 *
 * The current session is never revocable here: signing yourself out is what
 * `/api/auth/logout` is for, and conflating the two makes "sign out everywhere
 * else" a coin flip on whether you keep your own page.
 */
export const POST = route('security/sessions/revoke', async (request) => {
  await assertMutationAllowed(request);
  const auth = await requireAuth();

  const fields = new Fields(await readJson(request));
  const sessionId = fields.optionalString('sessionId', { max: 200, label: 'Session' });
  const others = fields.boolean('others', false);
  fields.assert();

  if (others || !sessionId) {
    const revoked = await sessions.revokeAll(auth.user.id, auth.session.id);
    if (revoked > 0) {
      await logEvent({
        userId: auth.user.id,
        type: 'sessions.revoked-others',
        request,
        detail: `${revoked} ${revoked === 1 ? 'device' : 'devices'}`,
      });
    }
  } else {
    if (sessionId !== auth.session.id) {
      // Scoped to this user's own sessions, so a guessed id from another account
      // finds nothing to delete.
      await sessions.revoke(auth.user.id, sessionId);
      await logEvent({ userId: auth.user.id, type: 'session.revoked', request });
    }
  }

  const all = await sessions.listForUser(auth.user.id);
  return jsonOk<SessionsResponse>({
    sessions: all.map((record) => toSessionSummary(record, auth.session.id)),
  });
});

import type { ActivityResponse } from '@/lib/auth/types';
import { toActivityItem } from '@/server/auth/serialize';
import { requireAuth } from '@/server/auth/session';
import { events } from '@/server/data/events';
import { jsonOk, route } from '@/server/http/respond';

/**
 * The account's security log.
 *
 * Read-only on purpose: a log a user can edit is a log an intruder can edit. It
 * holds sign-ins, password changes and device revocations — never a token, session
 * id, password or raw IP address.
 */
export const dynamic = 'force-dynamic';

const MAX_ITEMS = 30;

export const GET = route('security/activity', async (request) => {
  const { user } = await requireAuth();

  const requested = Number(new URL(request.url).searchParams.get('limit'));
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_ITEMS) : MAX_ITEMS;

  const records = await events.listForUser(user.id, limit);
  return jsonOk<ActivityResponse>({ activity: records.map(toActivityItem) });
});

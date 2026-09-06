import { DELETE_CONFIRMATION } from '@/lib/auth/policy';
import type { AcknowledgedResponse } from '@/lib/auth/types';
import { clearSessionCookie } from '@/server/auth/cookies';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { requireAuth } from '@/server/auth/session';
import { verifyPassword } from '@/server/crypto/password';
import { avatars } from '@/server/data/avatars';
import { events } from '@/server/data/events';
import { sessions } from '@/server/data/sessions';
import { tokens } from '@/server/data/tokens';
import { users } from '@/server/data/users';
import { assertMutationAllowed, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { logFailure } from '@/server/log';
import { sendAccountDeleted } from '@/server/mail/send';

/**
 * Account deletion.
 *
 * Three deliberate acts are required: the current password, the phrase
 * "DELETE MY ACCOUNT" typed out, and the request itself. That is not friction for
 * its own sake — this is the one operation here with no undo, and a single
 * mis-tapped button on a phone must not be able to trigger it.
 *
 * The farewell email is sent before anything is removed, because afterwards there
 * is no address left to send it to.
 */
export const dynamic = 'force-dynamic';

export const POST = route('account/delete', async (request) => {
  await assertMutationAllowed(request);
  const auth = await requireAuth();
  const { user } = auth;
  await enforce(RATE_LIMITS.deleteAccount, user.id);

  const fields = new Fields(await readJson(request));
  const password = fields.password();
  const confirmation = fields.string('confirmation', { max: 64, label: 'Confirmation' });
  fields.assert();

  // Case is forgiven — a phone keyboard makes all-caps needlessly awkward — but the
  // whole phrase has to be there.
  if (confirmation.toUpperCase() !== DELETE_CONFIRMATION) {
    fields.reject('confirmation', `Type ${DELETE_CONFIRMATION} to confirm.`);
    fields.assert();
  }

  const check = await verifyPassword(password, user.passwordHash);
  if (!check.valid) {
    fields.reject('password', 'That is not your password.');
    fields.assert();
  }

  await sendAccountDeleted(user).catch((error) => logFailure('account deleted mail', error));

  // Order matters: sessions and tokens first, so nothing can act on the account
  // while the rest is being removed. The user record — which owns the email and
  // username index entries — goes last.
  await sessions.revokeAll(user.id);
  await tokens.revokeForUser(user.id, 'email-verification');
  await tokens.revokeForUser(user.id, 'password-reset');
  await events.deleteForUser(user.id);
  await avatars.delete(user.id);
  await users.delete(user.id);

  await clearSessionCookie();
  return jsonOk<AcknowledgedResponse>({ ok: true });
});

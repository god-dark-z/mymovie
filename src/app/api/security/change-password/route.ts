import { passwordProblem } from '@/lib/auth/policy';
import type { AcknowledgedResponse } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { logEvent, requireAuth } from '@/server/auth/session';
import { hashPassword, verifyPassword } from '@/server/crypto/password';
import { sessions } from '@/server/data/sessions';
import { users } from '@/server/data/users';
import { assertMutationAllowed, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { logFailure } from '@/server/log';
import { sendPasswordChanged } from '@/server/mail/send';

/**
 * Changing a password from inside the account.
 *
 * The current password is required even though the caller is already signed in.
 * A session left open on a shared machine is the exact case this defends against:
 * without the check, walking up to an unlocked browser would be enough to lock the
 * owner out permanently.
 *
 * Every other session is revoked on success, and this one is kept alive so the
 * person doing it is not thrown out of the page they are standing on.
 */
export const dynamic = 'force-dynamic';

export const POST = route('security/change-password', async (request) => {
  await assertMutationAllowed(request);
  const auth = await requireAuth();
  const { user } = auth;
  await enforce(RATE_LIMITS.changePassword, user.id);

  const fields = new Fields(await readJson(request));
  const currentPassword = fields.password('currentPassword');
  const password = fields.password('password');
  fields.assert();

  const check = await verifyPassword(currentPassword, user.passwordHash);
  if (!check.valid) {
    await logEvent({ userId: user.id, type: 'login.failed', request, detail: 'wrong current password' });
    fields.reject('currentPassword', 'That is not your current password.');
    fields.assert();
  }

  const problem = passwordProblem(password, { email: user.email, displayName: user.displayName });
  if (problem) {
    fields.reject('password', problem);
    fields.assert();
  }

  if (currentPassword === password) {
    fields.reject('password', 'Choose a password you have not used here before.');
    fields.assert();
  }

  const updated = (await users.update(user.id, { passwordHash: await hashPassword(password) })) ?? user;

  const revoked = await sessions.revokeAll(user.id, auth.session.id);
  await logEvent({ userId: user.id, type: 'password.changed', request });
  if (revoked > 0) {
    await logEvent({ userId: user.id, type: 'sessions.revoked-others', request, detail: 'password change' });
  }

  // Awaited: a serverless container can be frozen as soon as the response is
  // written, and this is the message that tells someone their password changed
  // without them.
  await sendPasswordChanged(updated, request).catch((error) => logFailure('password changed mail', error));

  return jsonOk<AcknowledgedResponse>({ ok: true });
});

import { passwordProblem } from '@/lib/auth/policy';
import type { AuthResultBody } from '@/lib/auth/types';
import { ensureCsrfToken } from '@/server/auth/cookies';
import { hashPassword } from '@/server/crypto/password';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { toPublicUser } from '@/server/auth/serialize';
import { assertAccountsEnabled, logEvent, startSession } from '@/server/auth/session';
import { sessions } from '@/server/data/sessions';
import { tokens } from '@/server/data/tokens';
import { users } from '@/server/data/users';
import { badRequest } from '@/server/http/errors';
import { assertMutationAllowed, clientIp, hashIp, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { logFailure } from '@/server/log';
import { sendPasswordChanged } from '@/server/mail/send';

/**
 * Finishes a password reset.
 *
 * Three things happen together, and the order matters. The token is consumed
 * first, so a link cannot be replayed. Then every existing session is revoked —
 * whoever prompted the reset loses access at that moment rather than keeping a
 * live session that outlives the password it was created with. Only then is a new
 * session started for the person holding the link.
 *
 * Redeeming a link mailed to the address also proves control of it, so an
 * account that never confirmed its email becomes verified here.
 */
export const dynamic = 'force-dynamic';

const GENERIC = 'That reset link is not valid any more. Request a new one.';

export const POST = route('auth/reset-password', async (request) => {
  assertAccountsEnabled();
  await assertMutationAllowed(request);

  const ipDigest = hashIp(clientIp(request)) ?? 'anonymous';
  await enforce(RATE_LIMITS.resetPassword, ipDigest);

  const fields = new Fields(await readJson(request));
  const token = fields.string('token', { max: 200, label: 'Reset token' });
  const password = fields.password();
  fields.assert();

  const record = await tokens.findByToken('password-reset', token);
  if (!record) throw badRequest(GENERIC);

  const user = await users.findById(record.userId);
  if (!user) throw badRequest(GENERIC);

  // Checked against the account's own name and address, which is why this runs
  // after the user is loaded rather than during field validation.
  const problem = passwordProblem(password, { email: user.email, displayName: user.displayName });
  if (problem) {
    // The token survives a rejected password: making someone request a new email
    // because they chose a weak one would be hostile.
    fields.reject('password', problem);
    fields.assert();
  }

  if (!(await tokens.redeem(record))) throw badRequest(GENERIC);

  const passwordHash = await hashPassword(password);
  const patch = user.emailVerified
    ? { passwordHash }
    : { passwordHash, emailVerified: true, emailVerifiedAt: Date.now() };
  const updated = (await users.update(user.id, patch)) ?? { ...user, ...patch };

  await sessions.revokeAll(user.id);
  await logEvent({ userId: user.id, type: 'password.reset', request });

  // Awaited: on a serverless platform the container can be frozen the moment the
  // response is written, and a floating promise would silently drop the notice
  // that tells someone their password was changed without them.
  await sendPasswordChanged(updated, request).catch((error) => logFailure('password changed mail', error));

  await startSession(updated, { request, remember: false });
  await logEvent({ userId: user.id, type: 'login.success', request, detail: 'after password reset' });

  const csrfToken = await ensureCsrfToken();
  return jsonOk<AuthResultBody>({ user: toPublicUser(updated), csrfToken });
});

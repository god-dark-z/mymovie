import type { AcknowledgedResponse } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { assertAccountsEnabled, logEvent } from '@/server/auth/session';
import { indexDigest } from '@/server/data/store';
import { users } from '@/server/data/users';
import { assertMutationAllowed, clientIp, hashIp, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { logFailure } from '@/server/log';
import { sendPasswordReset } from '@/server/mail/send';

/**
 * Starts a password reset.
 *
 * Always answers `{ ok: true }`. A "no account with that address" reply would
 * turn this into a free membership lookup for anyone with a list of emails, and
 * the person who actually needs the answer gets it in their inbox either way.
 *
 * No password is ever emailed. What goes out is a single-use token with a short
 * life, and requesting another one invalidates the last.
 */
export const dynamic = 'force-dynamic';

export const POST = route('auth/forgot-password', async (request) => {
  assertAccountsEnabled();
  await assertMutationAllowed(request);

  const ipDigest = hashIp(clientIp(request)) ?? 'anonymous';
  await enforce(RATE_LIMITS.forgotPassword, ipDigest);

  const fields = new Fields(await readJson(request));
  const email = fields.email();
  fields.assert();

  await enforce(RATE_LIMITS.forgotPassword, indexDigest(email));

  const user = await users.findByEmail(email);
  const response: AcknowledgedResponse = { ok: true };
  if (!user) return jsonOk(response);

  try {
    const sent = await sendPasswordReset(user, request);
    await logEvent({ userId: user.id, type: 'password.reset-requested', request });
    if (sent.devUrl) return jsonOk<AcknowledgedResponse>({ ok: true, devUrl: sent.devUrl });
  } catch (error) {
    logFailure('password reset mail', error);
  }

  return jsonOk(response);
});

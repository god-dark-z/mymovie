import type { AcknowledgedResponse } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { currentAuth, assertAccountsEnabled, logEvent } from '@/server/auth/session';
import { indexDigest } from '@/server/data/store';
import { users } from '@/server/data/users';
import { assertMutationAllowed, clientIp, hashIp, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { logFailure } from '@/server/log';
import { sendVerification } from '@/server/mail/send';

/**
 * Sends a fresh confirmation email.
 *
 * Answers identically for an address with an account, one without, and one that
 * is already confirmed, so this cannot be used to test whether an address is
 * registered. Issuing a new token retires the previous one — see `tokens.issue` —
 * so an older email in the same inbox stops working.
 */
export const dynamic = 'force-dynamic';

export const POST = route('auth/resend-verification', async (request) => {
  assertAccountsEnabled();
  await assertMutationAllowed(request);

  const ipDigest = hashIp(clientIp(request)) ?? 'anonymous';
  await enforce(RATE_LIMITS.resendVerification, ipDigest);

  // A half-finished sign-up has no session, so the address comes from the body.
  // Someone already signed in but unverified need not retype it.
  const body = await readJson(request);
  const fields = new Fields(body);
  const requested = fields.optionalString('email', { max: 254, label: 'Email address' });
  fields.assert();

  const auth = await currentAuth();
  const email = requested ? requested.toLowerCase() : auth?.user.email;

  const response: AcknowledgedResponse = { ok: true };
  if (!email) return jsonOk(response);

  // Per-address as well as per-IP: this endpoint sends mail to someone else's
  // inbox, so it must not become a way to bombard an address from many IPs.
  await enforce(RATE_LIMITS.resendVerification, indexDigest(email));

  const user = await users.findByEmail(email);
  if (!user || user.emailVerified) return jsonOk(response);

  try {
    const sent = await sendVerification(user, request);
    await logEvent({ userId: user.id, type: 'email.verification-sent', request, detail: 'resent' });
    if (sent.devUrl) return jsonOk<AcknowledgedResponse>({ ok: true, devUrl: sent.devUrl });
  } catch (error) {
    // A delivery failure is ours, not the caller's, and saying so here would
    // reveal that the address exists. It is logged instead.
    logFailure('resend verification', error);
  }

  return jsonOk(response);
});

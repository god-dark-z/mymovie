import { displayNameProblem, LIMITS, passwordProblem } from '@/lib/auth/policy';
import type { RegisterResponse } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { assertAccountsEnabled, logEvent } from '@/server/auth/session';
import { hashPassword } from '@/server/crypto/password';
import { indexDigest } from '@/server/data/store';
import { EmailTakenError, users } from '@/server/data/users';
import { assertMutationAllowed, clientIp, hashIp, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { sendSignupAttempt, sendVerification } from '@/server/mail/send';

/**
 * Account creation.
 *
 * The response is identical whether or not the address already has an account, and
 * both paths do the same amount of work — a password hash is computed either way.
 * That is what stops this endpoint from being used to test which addresses are
 * registered. The owner of an address that is already in use finds out by email
 * instead, which is the only party entitled to know.
 *
 * Registration deliberately does not create a session. Confirming the address is
 * what signs you in, so a stranger who guesses an address cannot occupy it, and
 * there is no window where an account exists in a half-usable state.
 */
export const dynamic = 'force-dynamic';

export const POST = route('auth/register', async (request) => {
  assertAccountsEnabled();
  await assertMutationAllowed(request);

  const ipDigest = hashIp(clientIp(request)) ?? 'anonymous';
  await enforce(RATE_LIMITS.register, ipDigest);

  const fields = new Fields(await readJson(request));
  const email = fields.email();
  const password = fields.password();
  const displayName = fields.string('displayName', {
    min: LIMITS.displayNameMin,
    max: LIMITS.displayNameMax,
    label: 'Your name',
  });
  fields.assert();

  const nameProblem = displayNameProblem(displayName);
  if (nameProblem) fields.reject('displayName', nameProblem);

  const problem = passwordProblem(password, { email, displayName });
  if (problem) fields.reject('password', problem);
  fields.assert();

  // A second bucket keyed to the address, so nobody can be buried in "someone
  // tried to sign up" notices by an attacker cycling through IP addresses.
  await enforce(RATE_LIMITS.registerByEmail, indexDigest(email));

  const existing = await users.findByEmail(email);
  if (existing) {
    // Same work, same answer. The hash is computed and thrown away so the two
    // branches cannot be told apart by how long they take.
    await hashPassword(password);
    await sendSignupAttempt(existing, request);
    return jsonOk<RegisterResponse>({ pending: true, email });
  }

  const passwordHash = await hashPassword(password);

  let created;
  try {
    created = await users.create({ email, passwordHash, displayName });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      // Lost a race with a simultaneous registration for the same address.
      return jsonOk<RegisterResponse>({ pending: true, email });
    }
    throw error;
  }

  await logEvent({ userId: created.id, type: 'account.created', request });
  const sent = await sendVerification(created, request);
  await logEvent({ userId: created.id, type: 'email.verification-sent', request });

  return jsonOk<RegisterResponse>({
    pending: true,
    email,
    ...(sent.devUrl ? { devVerificationUrl: sent.devUrl } : {}),
  });
});

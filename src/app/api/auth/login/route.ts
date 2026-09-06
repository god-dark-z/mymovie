import type { AuthResultBody } from '@/lib/auth/types';
import { ensureCsrfToken } from '@/server/auth/cookies';
import { describeDevice } from '@/server/auth/device';
import { enforce, forgive, RATE_LIMITS } from '@/server/auth/rate-limit';
import { toPublicUser } from '@/server/auth/serialize';
import { assertAccountsEnabled, logEvent, startSession } from '@/server/auth/session';
import { hashPassword, verifyPassword } from '@/server/crypto/password';
import { sessions } from '@/server/data/sessions';
import { indexDigest } from '@/server/data/store';
import { users } from '@/server/data/users';
import { unauthorized } from '@/server/http/errors';
import { assertMutationAllowed, clientIp, hashIp, readJson, userAgent } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { logFailure } from '@/server/log';
import { sendNewSignIn } from '@/server/mail/send';

/**
 * Sign-in.
 *
 * One failure message covers every reason a sign-in can fail — unknown address,
 * wrong password, malformed stored hash — because a specific message is a way to
 * confirm that an address is registered. An unknown address still costs a full
 * password hash, so the two cases cannot be separated by timing either.
 *
 * Signing in works before the address is confirmed. Locking someone out of the
 * account they just created because a verification email was delayed would be
 * hostile; features that hand out content or personal data are what require
 * verification.
 */
export const dynamic = 'force-dynamic';

const GENERIC = 'That email and password do not match an account.';

export const POST = route('auth/login', async (request) => {
  assertAccountsEnabled();
  await assertMutationAllowed(request);

  const ipDigest = hashIp(clientIp(request)) ?? 'anonymous';
  await enforce(RATE_LIMITS.loginByIp, ipDigest);

  const fields = new Fields(await readJson(request));
  const email = fields.email();
  const password = fields.password();
  const remember = fields.boolean('remember', true);
  fields.assert();

  // Keyed to the address as well, so one account cannot be ground down from a
  // rotating set of addresses, and one IP cannot grind down every account.
  const emailDigest = indexDigest(email);
  await enforce(RATE_LIMITS.login, emailDigest);

  const user = await users.findByEmail(email);
  if (!user) {
    // Same cost as a real attempt. Without this, a fast rejection would announce
    // that the address is not registered.
    await hashPassword(password);
    throw unauthorized(GENERIC);
  }

  const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await logEvent({ userId: user.id, type: 'login.failed', request });
    throw unauthorized(GENERIC);
  }

  if (needsRehash) {
    // The stored hash was made with weaker parameters than the current ones. This
    // is the only moment the plaintext is available, so it is upgraded here.
    try {
      await users.update(user.id, { passwordHash: await hashPassword(password) });
    } catch (error) {
      // A failed upgrade must not fail the sign-in; it will be retried next time.
      logFailure('password rehash', error);
    }
  }

  const knownDevice = (await sessions.listForUser(user.id)).some(
    (record) => record.device === describeDevice(userAgent(request)),
  );

  await startSession(user, { request, remember });
  await forgive(RATE_LIMITS.login, emailDigest);
  await logEvent({ userId: user.id, type: 'login.success', request });

  if (!knownDevice) {
    // Awaited on purpose: a serverless container can be frozen the moment the
    // response is returned, so a floating promise here would sometimes send the
    // notice and sometimes not. The transport's own timeouts bound the wait, and a
    // failure is logged rather than surfaced.
    await sendNewSignIn(user, request).catch((error) => logFailure('new sign-in notice', error));
  }

  const csrfToken = await ensureCsrfToken();
  return jsonOk<AuthResultBody>({ user: toPublicUser(user), csrfToken });
});

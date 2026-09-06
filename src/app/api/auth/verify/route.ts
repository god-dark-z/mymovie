import type { AuthResultBody } from '@/lib/auth/types';
import { ensureCsrfToken } from '@/server/auth/cookies';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { toPublicUser } from '@/server/auth/serialize';
import { assertAccountsEnabled, logEvent, startSession } from '@/server/auth/session';
import { normalizeCode } from '@/server/crypto/tokens';
import { indexDigest } from '@/server/data/store';
import { tokens } from '@/server/data/tokens';
import type { TokenRecord } from '@/server/data/types';
import { users } from '@/server/data/users';
import { badRequest } from '@/server/http/errors';
import { assertMutationAllowed, clientIp, hashIp, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';
import { logFailure } from '@/server/log';
import { sendWelcome } from '@/server/mail/send';

/**
 * Email confirmation, and the moment a new account becomes usable.
 *
 * Two ways in, one record behind both: the link from the message, or the printed
 * code plus the address it was sent to. Redeeming deletes the record, so a link
 * that is clicked twice — by a person, or by a mail scanner that prefetches it —
 * finds nothing the second time. That is what makes these single-use rather than
 * merely expiring.
 *
 * Confirming signs the account in, because control of the mailbox has just been
 * proven and asking for the password again immediately afterwards adds nothing.
 */
export const dynamic = 'force-dynamic';

/** One message for every failure: expired, already used, wrong, or never existed. */
const GENERIC = 'That confirmation link or code is not valid any more. Request a new one.';

export const POST = route('auth/verify', async (request) => {
  assertAccountsEnabled();
  await assertMutationAllowed(request);

  const ipDigest = hashIp(clientIp(request)) ?? 'anonymous';
  await enforce(RATE_LIMITS.verify, ipDigest);

  const body = await readJson(request);
  const fields = new Fields(body);
  const token = fields.optionalString('token', { max: 200, label: 'Token' });
  const rawCode = fields.optionalString('code', { max: 32, label: 'Code' });
  const email = rawCode ? fields.email() : undefined;
  fields.assert();

  if (!token && !rawCode) throw badRequest('Provide the link from your email, or the code it contains.');

  let record: TokenRecord | null = null;

  if (token) {
    record = await tokens.findByToken('email-verification', token);
  } else if (rawCode && email) {
    // The code is scoped to one account, so the address is needed to find it. A
    // wrong address and a wrong code fail identically.
    await enforce(RATE_LIMITS.verify, indexDigest(email));
    const candidate = await users.findByEmail(email);
    if (candidate) {
      record = await tokens.findByCode(candidate.id, 'email-verification', normalizeCode(rawCode));
    }
  }

  if (!record) throw badRequest(GENERIC);

  const user = await users.findById(record.userId);
  if (!user) throw badRequest(GENERIC);

  // Consuming before anything else: if two requests race, exactly one wins here.
  if (!(await tokens.redeem(record))) throw badRequest(GENERIC);

  if (!user.emailVerified) {
    await users.update(user.id, { emailVerified: true, emailVerifiedAt: Date.now() });
    await logEvent({ userId: user.id, type: 'email.verified', request });
    await sendWelcome(user, request).catch((error) => logFailure('welcome mail', error));
  }

  const verified = (await users.findById(user.id)) ?? user;
  await startSession(verified, { request, remember: true });
  await logEvent({ userId: verified.id, type: 'login.success', request, detail: 'after confirming email' });

  const csrfToken = await ensureCsrfToken();
  return jsonOk<AuthResultBody>({ user: toPublicUser(verified), csrfToken });
});

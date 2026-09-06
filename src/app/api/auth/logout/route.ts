import { clearSessionCookie } from '@/server/auth/cookies';
import { currentAuth, endSession, logEvent } from '@/server/auth/session';
import { assertMutationAllowed } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';

/**
 * Sign-out.
 *
 * The session record is deleted server-side, not merely forgotten by the browser,
 * so a copied cookie stops working at the same moment. Signing out when there is
 * nothing to sign out of succeeds quietly: the cookie is cleared either way, which
 * is what makes a stale tab's sign-out button behave sensibly.
 */
export const dynamic = 'force-dynamic';

export const POST = route('auth/logout', async (request) => {
  await assertMutationAllowed(request);

  const auth = await currentAuth();
  if (auth) {
    await logEvent({ userId: auth.user.id, type: 'logout', request });
    await endSession(auth);
  } else {
    await clearSessionCookie();
  }

  return jsonOk({ ok: true });
});

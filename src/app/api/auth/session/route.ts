import { ensureCsrfToken } from '@/server/auth/cookies';
import { accountsEnabled, currentAuth } from '@/server/auth/session';
import { toPublicUser } from '@/server/auth/serialize';
import { jsonOk, route } from '@/server/http/respond';
import type { SessionResponse } from '@/lib/auth/types';

/**
 * The endpoint the application hydrates from.
 *
 * Every page load asks this once: are accounts available, who is signed in, and
 * what CSRF token should writes carry. Doing it here rather than in a server
 * component is what keeps the home page, the browse pages and the watchlist
 * prerendered — a layout that read cookies would make every one of them dynamic.
 *
 * It is deliberately cheap for a visitor who is not signed in: a cookie read and
 * nothing else. No storage is touched until there is a session to look up.
 */
export const dynamic = 'force-dynamic';

export const GET = route('auth/session', async () => {
  if (!accountsEnabled()) {
    // An unconfigured deployment says so plainly, and the UI hides sign-in rather
    // than offering a form that cannot work.
    return jsonOk<SessionResponse>({ configured: false, user: null, csrfToken: null });
  }

  const csrfToken = await ensureCsrfToken();
  const auth = await currentAuth();

  return jsonOk<SessionResponse>({
    configured: true,
    user: auth ? toPublicUser(auth.user) : null,
    csrfToken,
  });
});

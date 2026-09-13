/**
 * Post-authentication navigation that cannot strand the user on the form.
 *
 * Next.js's client-side `router.replace` is fire-and-forget: when its internal RSC
 * fetch fails silently — which happens under flaky mobile networks and on cold
 * serverless deploys — the promise neither resolves nor surfaces an error, and the
 * person is left staring at the form they just successfully submitted. Signing in
 * again then looks like a loop.
 *
 * The fix is a belt-and-braces pair: start the soft navigation for speed, then
 * check shortly after whether the URL actually moved, and if it did not, force a
 * full-page navigation. A hard load always works — the session cookie is already
 * set by the time this runs.
 */
export function navigateAfterAuth(router: { replace: (url: string) => void }, target: string): void {
  router.replace(target);

  const started = window.location.pathname + window.location.search;
  window.setTimeout(() => {
    const current = window.location.pathname + window.location.search;
    const escapedForm = !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/signup') &&
      !window.location.pathname.startsWith('/verify-email') &&
      !window.location.pathname.startsWith('/reset-password');
    if (current === started && !escapedForm) {
      window.location.assign(target);
    }
  }, 2_500);
}

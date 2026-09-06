import type { Metadata } from 'next';

/**
 * The account entry screens.
 *
 * They deliberately do not use the `(app)` shell: the floating navigation and its
 * search field are a distraction from a single-purpose form, and on a handset the
 * bottom bar competes with the keyboard for the same 60px. `AuthShell` supplies the
 * frame instead.
 *
 * Nothing here should be indexed — these pages have no content of their own and a
 * search result pointing at a password reset form is only ever noise.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

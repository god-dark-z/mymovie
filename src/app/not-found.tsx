import type { Metadata } from 'next';
import Link from 'next/link';
import { CineoraLogo } from '@/components/brand/Logo';
import { NotFoundView } from '@/components/layout/NotFoundView';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

/**
 * Catches URLs that match no route at all. Those never reach the `(app)` group, so
 * this page renders without the header and carries its own wordmark and links out.
 */
export default function NotFound() {
  return (
    <div className="min-h-app flex flex-col pb-safe-b">
      <header className="gutter-x flex items-center pt-[calc(var(--spacing-safe-t)+1rem)]">
        <Link href="/" aria-label="Cineora home" className="tap -ml-1 flex items-center rounded-xl px-1 py-1.5">
          <CineoraLogo />
        </Link>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center">
        <NotFoundView
          title="This page is not here"
          description="The link may be broken or out of date. Everything in Cineora is reachable from the home page or a search."
        />
      </main>
    </div>
  );
}

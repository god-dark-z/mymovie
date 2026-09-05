import type { Metadata } from 'next';
import { NotFoundView } from '@/components/layout/NotFoundView';
import { PageShell } from '@/components/layout/Page';

export const metadata: Metadata = {
  title: 'Title not found',
  robots: { index: false, follow: true },
};

/**
 * Reached when a page calls `notFound()` — an id the catalogue cannot resolve, or a
 * season or episode that does not exist. Renders inside the app chrome, so the
 * header, search and navigation are all still there.
 */
export default function AppNotFound() {
  return (
    <PageShell>
      <NotFoundView
        title="We could not find that title"
        description="The id in this link is not in the catalogue. It may have been removed, or the link may be pointing at an identifier from another service."
      />
    </PageShell>
  );
}

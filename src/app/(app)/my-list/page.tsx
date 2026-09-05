import type { Metadata } from 'next';
import { LibraryView } from '@/components/library/LibraryView';
import { PageHeading, PageShell } from '@/components/layout/Page';

export const metadata: Metadata = {
  title: 'My List',
  description: 'Your saved movies, series and anime on Cineora, kept on this device.',
  // The list only exists in the visitor's browser, so there is nothing here for a
  // crawler to index — but the links out of it are worth following.
  robots: { index: false, follow: true },
  alternates: { canonical: '/my-list' },
};

export default function MyListPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Library"
        title="My List"
        description="Saved titles and what you opened last. Everything is stored on this device — no account, nothing uploaded."
      />
      <LibraryView />
    </PageShell>
  );
}

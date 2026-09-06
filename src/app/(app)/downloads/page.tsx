import type { Metadata } from 'next';
import { DownloadsLibrary } from '@/components/downloads/DownloadsLibrary';
import { PageHeading, PageShell } from '@/components/layout/Page';
import { allOffers } from '@/server/downloads/catalog';

/**
 * The catalogue is operator configuration rather than data, so an hour is plenty —
 * but it must not be baked in permanently either, or a deployment that gains a
 * licensed title would keep serving the empty state until the next build.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Downloads',
  description: 'Files Cineora is licensed to hand out, and the downloads started on this device.',
  // Half of this page is device-local and the other half is deployment-specific, so
  // there is nothing stable for a crawler to index — the links out of it still are.
  robots: { index: false, follow: true },
  alternates: { canonical: '/downloads' },
};

export default function DownloadsPage() {
  // Read on the server from the operator's own catalogue. It depends on nothing about
  // the reader, which is what keeps this page cacheable and free of account data.
  const offers = allOffers();

  return (
    <PageShell>
      <PageHeading
        eyebrow="Library"
        title="Downloads"
        description={
          offers.length === 0
            ? 'Cineora streams from providers it does not own, so it offers files only where this deployment holds the rights itself. Downloads started here are also listed, as a note kept on this device.'
            : 'Files this deployment is licensed to distribute, plus a note of what this device has started. Signing in is required before a download link is issued.'
        }
      />
      <DownloadsLibrary offers={offers} />
    </PageShell>
  );
}

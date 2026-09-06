'use client';

import { useState } from 'react';
import { DownloadSheet } from '@/components/downloads/DownloadSheet';
import { Button } from '@/components/ui/Button';
import { DownloadIcon } from '@/components/ui/Icons';
import { formatBytes, type DownloadOffer } from '@/lib/downloads/types';

/**
 * The download entry point on a title page.
 *
 * Rendered only when the deployment actually has authorized files for this title, so
 * the button never appears as decoration. The sheet holds every choice and every
 * caveat; this is just the door.
 */
export function DownloadButton({ offer }: { offer: DownloadOffer }) {
  const [open, setOpen] = useState(false);
  const smallest = offer.items.reduce(
    (best, item) => (best === null || item.sizeBytes < best ? item.sizeBytes : best),
    null as number | null,
  );

  return (
    <>
      <Button variant="glass" size="lg" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <DownloadIcon className="size-[1.125rem]" />
        Download
        {offer.items.length === 1 && smallest !== null ? (
          <span className="font-normal text-mist-400 tabular-nums">{formatBytes(smallest)}</span>
        ) : null}
      </Button>
      <DownloadSheet offer={offer} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

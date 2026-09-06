'use client';

import { useState } from 'react';
import { ProviderDownloadSheet } from '@/components/downloads/ProviderDownloadSheet';
import { Button } from '@/components/ui/Button';
import { DownloadIcon } from '@/components/ui/Icons';

/**
 * The download CTA for titles resolved through the provider network.
 *
 * Opens a three-step sheet — math gate, server picker, links — all backed by
 * Cineora's own proxy API, so the provider's origin never appears in the
 * visitor's network log or address bar.
 */
export function ProviderDownloadButton({
  title,
  tmdbId,
  kind,
  season,
  episode,
  className,
}: {
  title: string;
  tmdbId: string;
  kind: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="glass" size="lg" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <DownloadIcon className="size-[1.125rem]" />
        Download
      </Button>
      <ProviderDownloadSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        tmdbId={tmdbId}
        kind={kind}
        season={season}
        episode={episode}
      />
    </>
  );
}

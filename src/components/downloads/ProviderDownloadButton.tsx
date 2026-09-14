'use client';

import { useState } from 'react';
import { ProviderDownloadSheet } from '@/components/downloads/ProviderDownloadSheet';
import { Button } from '@/components/ui/Button';
import { DownloadIcon } from '@/components/ui/Icons';

/**
 * The download CTA on a title page.
 *
 * Opens the resolver sheet: one background pass resolves every server group and
 * its direct links — the provider's security nodes and endpoints stay entirely
 * server-side.
 */
export function ProviderDownloadButton({
  title,
  tmdbId,
  imdbId,
  kind,
  season,
  episode,
  className,
}: {
  title: string;
  tmdbId?: string;
  imdbId?: string;
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
        imdbId={imdbId}
        kind={kind}
        season={season}
        episode={episode}
      />
    </>
  );
}

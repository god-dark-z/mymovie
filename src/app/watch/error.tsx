'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { detailHref } from '@/lib/metadata/classify';
import type { MediaKind } from '@/types/media';

const KINDS: MediaKind[] = ['movie', 'tv', 'anime'];

/**
 * Boundary for the watch routes, which sit outside the app chrome — there is no
 * header here, so the escape hatch has to be part of the error itself. The link
 * back to the title is recovered from the path rather than guessed.
 */
export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const back = detailPath(pathname);

  return (
    <div className="min-h-app flex flex-col justify-center pt-safe-t pb-safe-b">
      <ErrorState
        as="h1"
        kind="playback"
        title="This page could not load"
        description="Something went wrong before the player could start. Trying again usually clears it; the title's page always works."
        onRetry={reset}
        action={back ? { label: 'Back to details', href: back } : { label: 'Go home', href: '/' }}
      />
      {error.digest ? (
        <p className="gutter-x text-center text-[0.6875rem] text-mist-500">Reference {error.digest}</p>
      ) : null}
    </div>
  );
}

/** `/watch/tv/tt0903747/1/2` → `/tv/tt0903747`, and nothing for anything unexpected. */
function detailPath(pathname: string): string | null {
  const [, root, kind, id] = pathname.split('/');
  if (root !== 'watch' || !id) return null;
  const media = KINDS.find((candidate) => candidate === kind);
  return media ? detailHref(media, decodeURIComponent(id)) : null;
}

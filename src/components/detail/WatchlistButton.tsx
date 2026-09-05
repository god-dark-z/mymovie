'use client';

import { useWatchlist } from '@/hooks/useWatchlist';
import { useMounted } from '@/hooks/useMounted';
import { Button } from '@/components/ui/Button';
import { BookmarkIcon, CheckIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { truncate } from '@/lib/utils/format';
import type { MediaSummary } from '@/types/media';

/**
 * My List toggle. Saved locally, so it works with no account — the storage layer
 * behind `useWatchlist` is swappable for an authenticated backend later.
 */
export function WatchlistButton({
  media,
  size = 'lg',
  labelled = true,
}: {
  media: MediaSummary;
  size?: 'md' | 'lg';
  labelled?: boolean;
}) {
  const mounted = useMounted();
  const { has, toggle } = useWatchlist();
  const { toast } = useToast();

  // Before mount `localStorage` is unreadable, so render the neutral state the
  // server rendered and let the first client pass correct it.
  const saved = mounted && has(media.id);
  const label = saved ? 'Remove from My List' : 'Add to My List';

  function onClick() {
    const added = toggle(media);
    toast(
      added ? `Added ${truncate(media.title, 40)} to My List` : `Removed ${truncate(media.title, 40)}`,
      { tone: added ? 'success' : 'neutral' },
    );
  }

  return (
    <Button
      onClick={onClick}
      variant={saved ? 'outline' : 'glass'}
      size={labelled ? size : 'icon'}
      aria-pressed={saved}
      aria-label={labelled ? undefined : label}
      title={labelled ? undefined : label}
    >
      {saved ? (
        <CheckIcon className="size-[1.0625rem] text-ruby-300" />
      ) : (
        <BookmarkIcon className="size-[1.0625rem]" />
      )}
      {labelled ? <span>{saved ? 'In My List' : 'My List'}</span> : null}
    </Button>
  );
}

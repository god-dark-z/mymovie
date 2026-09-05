'use client';

import { useState } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import { BookmarkIcon, CheckIcon, PlusIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { useMounted } from '@/hooks/useMounted';
import { useWatchlist } from '@/hooks/useWatchlist';
import { cn } from '@/lib/utils/cn';
import type { MediaSummary } from '@/types/media';

/**
 * Adds or removes a title from My List.
 *
 * The list lives in this browser only, which the toast says out loud rather than
 * implying an account exists. Until the store has hydrated the button renders in
 * its neutral state, so server and client markup agree.
 */
export function WatchlistButton({
  media,
  size = 'md',
  variant = 'glass',
  label,
  className,
}: {
  media: MediaSummary;
  size?: ButtonSize;
  variant?: ButtonVariant;
  /** Shows text next to the icon. Omit for an icon-only control. */
  label?: boolean;
  className?: string;
}) {
  const mounted = useMounted();
  const { has, toggle } = useWatchlist();
  const { toast } = useToast();
  const [pulse, setPulse] = useState(false);

  const saved = mounted && has(media.id);
  const iconOnly = !label;

  return (
    <Button
      variant={saved ? 'outline' : variant}
      size={iconOnly ? (size === 'sm' ? 'icon-sm' : 'icon') : size}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${media.title} from My List` : `Add ${media.title} to My List`}
      title={saved ? 'In My List' : 'Add to My List'}
      className={cn(saved && 'border-ruby-400/45 text-ruby-200', className)}
      onClick={() => {
        const added = toggle(media);
        setPulse(true);
        window.setTimeout(() => setPulse(false), 420);
        toast(added ? 'Added to My List on this device' : 'Removed from My List', {
          tone: added ? 'success' : 'neutral',
        });
      }}
    >
      {saved ? (
        <CheckIcon className={cn('size-[1.125rem]', pulse && 'animate-pop-in')} />
      ) : label ? (
        <PlusIcon className="size-[1.125rem]" />
      ) : (
        <BookmarkIcon className="size-[1.125rem]" />
      )}
      {label ? <span>{saved ? 'In My List' : 'My List'}</span> : null}
    </Button>
  );
}

import type { ReactNode } from 'react';
import { StarIcon } from '@/components/ui/Icons';
import { kindBadge } from '@/lib/metadata/classify';
import { cn } from '@/lib/utils/cn';
import { formatRating } from '@/lib/utils/format';
import type { MediaKind } from '@/types/media';

export function Badge({
  children,
  className,
  tone = 'glass',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'glass' | 'accent' | 'solid';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-[0.1875rem] text-[0.625rem] font-semibold tracking-[0.11em] uppercase',
        tone === 'glass' && 'glass-flat text-mist-100',
        tone === 'accent' && 'border border-ruby-400/35 bg-ruby-500/18 text-ruby-200',
        tone === 'solid' && 'bg-ink-950/75 text-mist-100',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** MOVIE / TV / ANIME — derived from real metadata, never guessed from a route. */
export function KindBadge({
  kind,
  isAnime,
  className,
}: {
  kind: MediaKind;
  isAnime: boolean;
  className?: string;
}) {
  return (
    <Badge tone={kind === 'anime' || isAnime ? 'accent' : 'glass'} className={className}>
      {kindBadge(kind, isAnime)}
    </Badge>
  );
}

/** Renders nothing when the provider has no rating — no placeholder score. */
export function RatingBadge({ rating, className }: { rating?: number; className?: string }) {
  const value = formatRating(rating);
  if (!value) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-mist-200 tabular-nums',
        className,
      )}
    >
      <StarIcon className="size-3 text-gold-400" />
      {value}
    </span>
  );
}

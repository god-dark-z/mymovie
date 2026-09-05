import Link from 'next/link';
import { KindBadge, RatingBadge } from '@/components/ui/Badge';
import { PlayIcon } from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { detailHref } from '@/lib/metadata/classify';
import { posterUrl } from '@/lib/metadata/images';
import { cn } from '@/lib/utils/cn';
import { joinNonEmpty } from '@/lib/utils/format';
import type { MediaSummary } from '@/types/media';

/**
 * Poster card used in rails and grids.
 *
 * `sizes` is deliberately explicit: a rail card is ~136px on a phone and ~184px
 * on a large screen, so this never downloads a full-width image for a thumbnail.
 */
const CARD_SIZES = '(min-width: 1280px) 200px, (min-width: 768px) 184px, (min-width: 640px) 30vw, 33vw';

export function MediaCard({
  media,
  priority,
  showKind = false,
  className,
}: {
  media: MediaSummary;
  priority?: boolean;
  /** Show the MOVIE / TV / ANIME badge — used where types are mixed. */
  showKind?: boolean;
  className?: string;
}) {
  const meta = joinNonEmpty([media.year ?? media.releaseInfo, media.genres[0]]);

  return (
    <Link
      href={detailHref(media.kind, media.id)}
      className={cn('tap group/card block w-full focus:outline-none', className)}
    >
      <div
        className={cn(
          'relative aspect-2/3 w-full overflow-hidden rounded-2xl bg-ink-850',
          'ring-1 ring-white/8 ring-inset transition duration-300 ease-glass',
          'group-focus-visible/card:ring-2 group-focus-visible/card:ring-ruby-400',
          'md:group-hover/card:-translate-y-1 md:group-hover/card:ring-white/18 md:group-hover/card:shadow-[0_22px_46px_-24px_rgba(0,0,0,0.95)]',
        )}
      >
        <PosterImage
          src={posterUrl(media.poster, 'medium')}
          alt={media.title}
          sizes={CARD_SIZES}
          priority={priority}
          className="transition-transform duration-500 ease-glass md:group-hover/card:scale-[1.04]"
        />

        <div
          className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-ink-950/85 to-transparent opacity-0 transition-opacity duration-300 md:group-hover/card:opacity-100"
          aria-hidden
        />

        {showKind ? (
          <div className="absolute top-2 left-2">
            <KindBadge kind={media.kind} isAnime={media.isAnime} />
          </div>
        ) : null}

        <span
          aria-hidden
          className="glass-flat absolute inset-0 m-auto hidden size-12 scale-90 items-center justify-center rounded-full text-white opacity-0 transition duration-300 ease-glass md:flex md:group-hover/card:scale-100 md:group-hover/card:opacity-100"
        >
          <PlayIcon className="size-5 translate-x-px" />
        </span>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="truncate text-[0.8125rem] font-medium text-mist-100 transition-colors duration-200 md:group-hover/card:text-white">
          {media.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {meta ? <span className="truncate text-[0.6875rem] text-mist-500">{meta}</span> : null}
          <RatingBadge rating={media.rating} className="ml-auto shrink-0" />
        </div>
      </div>
    </Link>
  );
}

/** Responsive poster grid used by browse hubs, search and My List. */
export function MediaGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6 xl:grid-cols-7 3xl:grid-cols-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Fixed-width wrapper so every rail card lines up. */
export function RailCard({ children }: { children: React.ReactNode }) {
  return <div className="w-[8.5rem] sm:w-[9.5rem] lg:w-[11rem]">{children}</div>;
}

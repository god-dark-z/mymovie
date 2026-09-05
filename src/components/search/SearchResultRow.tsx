import Link from 'next/link';
import { KindBadge } from '@/components/ui/Badge';
import { PosterImage } from '@/components/ui/PosterImage';
import { detailHref } from '@/lib/metadata/classify';
import { posterUrl } from '@/lib/metadata/images';
import { cn } from '@/lib/utils/cn';
import { formatRating } from '@/lib/utils/format';
import type { MediaSummary } from '@/types/media';

/**
 * One search result. Used in the overlay list; `active` reflects keyboard
 * position so pointer hover and arrow keys look identical.
 */
export function SearchResultRow({
  media,
  active,
  onSelect,
  innerRef,
}: {
  media: MediaSummary;
  active?: boolean;
  onSelect: () => void;
  innerRef?: (node: HTMLAnchorElement | null) => void;
}) {
  const rating = formatRating(media.rating);

  return (
    <Link
      ref={innerRef}
      href={detailHref(media.kind, media.id)}
      onClick={onSelect}
      data-active={active ? '' : undefined}
      className={cn(
        'tap flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150',
        active ? 'bg-white/10' : 'md:hover:bg-white/6',
      )}
    >
      <div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-850 ring-1 ring-white/8 ring-inset">
        <PosterImage src={posterUrl(media.poster, 'small')} alt={media.title} sizes="40px" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{media.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.6875rem] text-mist-500">
          {media.year ?? media.releaseInfo ? <span>{media.year ?? media.releaseInfo}</span> : null}
          {media.genres[0] ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{media.genres[0]}</span>
            </>
          ) : null}
          {rating ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{rating}</span>
            </>
          ) : null}
        </p>
      </div>

      <KindBadge kind={media.kind} isAnime={media.isAnime} className="shrink-0" />
    </Link>
  );
}

import Link from 'next/link';
import { KindBadge, RatingBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { InfoIcon, PlayIcon } from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { detailHref } from '@/lib/metadata/classify';
import { backdropUrl } from '@/lib/metadata/images';
import { joinNonEmpty } from '@/lib/utils/format';
import type { MediaSummary } from '@/types/media';

/**
 * The lead tile of a filtered grid: a full-width cinematic composition rather
 * than one more poster. The first result earns the banner; everything else
 * follows in the ordinary grid, which is what makes the grid feel curated
 * instead of uniform.
 *
 * Rendered only where the ranking has editorial meaning — the first page of an
 * unfiltered-but-sorted view. A genre-filtered or deep page is a list, and a
 * banner on a list is decoration.
 */
export function EditorialTile({ media }: { media: MediaSummary }) {
  const facts = joinNonEmpty([media.year ?? media.releaseInfo, media.genres.slice(0, 2).join(' · ')]);

  return (
    <article className="relative mb-8 overflow-hidden rounded-3xl ring-1 ring-white/8 ring-inset">
      {/* The artwork is the anchor: a wide backdrop with a scrim that falls
          toward the copy. Mobile keeps the same composition stacked. */}
      <div className="relative aspect-16/10 w-full sm:aspect-16/7 lg:aspect-21/9">
        <PosterImage
          src={backdropUrl(media.backdrop) ?? undefined}
          alt={media.title}
          sizes="(min-width: 110rem) 1760px, 100vw"
          priority
          wide
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/40 to-transparent md:bg-linear-to-r md:from-ink-950/95 md:via-ink-950/55 md:to-ink-950/10"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink-950 to-transparent md:hidden" />

        <div className="absolute inset-x-0 bottom-0 p-5 md:inset-y-0 md:right-0 md:flex md:max-w-[58%] md:flex-col md:justify-end md:p-8 lg:p-10">
          <div className="flex items-center gap-2.5">
            <KindBadge kind={media.kind} isAnime={media.isAnime} />
            <RatingBadge rating={media.rating} />
          </div>

          <h2 className="text-cinema mt-3 text-[1.5rem] leading-[1.06] font-semibold text-white sm:text-[1.875rem] lg:text-[2.25rem]">
            <Link href={detailHref(media.kind, media.id)} className="hover:underline">
              {media.title}
            </Link>
          </h2>

          {facts ? <p className="mt-2 text-[0.8125rem] text-mist-400">{facts}</p> : null}

          {media.overview ? (
            <p className="mt-3 line-clamp-3 max-w-xl text-pretty text-sm leading-relaxed text-mist-300">
              {media.overview}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <ButtonLink href={`/watch/${media.kind}/${media.id}`} variant="accent" size="md" prefetch={false}>
              <PlayIcon className="size-4" />
              Watch now
            </ButtonLink>
            <ButtonLink href={detailHref(media.kind, media.id)} variant="glass" size="md">
              <InfoIcon className="size-4" />
              More info
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}

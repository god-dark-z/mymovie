import { MediaCard, RailCard } from '@/components/media/MediaCard';
import { Rail } from '@/components/ui/Rail';
import { HUBS, browseHref, parseGenre } from '@/lib/metadata/browse';
import { metadata } from '@/lib/metadata/manager';
import type { CatalogNamespace, MediaDetail } from '@/types/media';

/**
 * "More like this".
 *
 * The metadata provider publishes no similarity endpoint, so this is an honest
 * genre shelf rather than a recommendation engine — same namespace, the title's
 * leading recognised genre, current title removed. When the title has no genre
 * we render nothing instead of a generic popular rail dressed up as related.
 */
export async function RelatedRail({ detail }: { detail: MediaDetail }) {
  const hub = detail.isAnime ? HUBS.anime : detail.kind === 'movie' ? HUBS.movies : HUBS.series;
  const namespace: CatalogNamespace = detail.kind === 'movie' ? 'movie' : 'series';

  // Anime lives in the Animation catalog; for everything else use the first genre
  // the browse layer recognises, so the request and the "See all" link agree.
  const genre = detail.isAnime
    ? 'Animation'
    : detail.genres.map((value) => parseGenre(hub, value)).find(Boolean);

  if (!genre) return null;

  const { data } = await metadata.getCatalog({
    namespace,
    sort: 'popular',
    genre,
    animeOnly: detail.isAnime ? true : undefined,
    excludeAnime: detail.isAnime ? undefined : true,
    limit: 24,
  });

  const items = data.filter((item) => item.id !== detail.id).slice(0, 18);
  if (items.length < 4) return null;

  const linkGenre = detail.isAnime ? parseGenre(hub, genre) : genre;

  return (
    <Rail
      title="More like this"
      subtitle={`Popular ${detail.isAnime ? 'anime' : genre.toLowerCase()} titles`}
      href={browseHref(hub, { sort: 'popular', genre: linkGenre })}
      ariaLabel="More like this"
    >
      {items.map((item) => (
        <RailCard key={item.id}>
          <MediaCard media={item} showKind={detail.isAnime} />
        </RailCard>
      ))}
    </Rail>
  );
}

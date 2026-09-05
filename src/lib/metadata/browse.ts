import { metadata } from '@/lib/metadata/manager';
import {
  ANIME_RAILS,
  BROWSE_GENRES,
  MOVIE_RAILS,
  TV_RAILS,
  type RailDefinition,
} from '@/lib/metadata/rails';
import type { CatalogRequest, CatalogSort, MediaSummary } from '@/types/media';

/**
 * Browse hubs.
 *
 * A hub has two faces: with no filter applied it shows editorial rails, and once
 * a genre or sort is chosen it becomes a paged grid. Both read the same
 * normalized `MediaSummary`, so nothing here knows which provider answered.
 */

/** Upstream catalog page size, measured against the live catalogs. */
const UPSTREAM_PAGE = 50;

export type HubId = 'movies' | 'series' | 'anime';

export const SORT_OPTIONS: ReadonlyArray<{ id: CatalogSort; label: string }> = [
  { id: 'popular', label: 'Popular' },
  { id: 'rating', label: 'Top rated' },
  { id: 'new', label: 'Newest' },
];

/**
 * Anime genres worth offering as a filter.
 *
 * Anime is found by reading the Animation catalogs and keeping Japanese titles,
 * then narrowing in memory. A chip is only listed when the live catalogue
 * actually holds enough titles carrying that genre — Romance and Sci-Fi are
 * deliberately absent, because fewer than five anime per ~170 sampled carry
 * them and a chip that lands on an empty grid reads as a bug.
 */
export const ANIME_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Family'] as const;

/** Genre labels are not perfectly consistent between upstream titles. */
const GENRE_ALIASES: Record<string, readonly string[]> = {
  'Sci-Fi': ['Sci-Fi', 'Science Fiction'],
};

export interface HubConfig {
  id: HubId;
  path: '/movies' | '/series' | '/anime';
  eyebrow: string;
  title: string;
  description: string;
  /** Editorial rails shown when no filter is applied. */
  rails: RailDefinition[];
  genres: readonly string[];
  /** Upstream catalogs a filtered grid reads from. */
  catalogs: (sort: CatalogSort, genre?: string) => CatalogRequest[];
  /** Upstream pages fetched per grid page. */
  span: number;
  /** True when the genre must be narrowed after normalization. */
  postFilterGenre: boolean;
}

export const HUBS: Record<HubId, HubConfig> = {
  movies: {
    id: 'movies',
    path: '/movies',
    eyebrow: 'Browse',
    title: 'Movies',
    description:
      'Every film in the public catalogue. Filter by genre, or re-sort by rating and release date.',
    rails: MOVIE_RAILS,
    genres: BROWSE_GENRES,
    catalogs: (sort, genre) => [{ namespace: 'movie', sort, genre, excludeAnime: true }],
    span: 2,
    postFilterGenre: false,
  },
  series: {
    id: 'series',
    path: '/series',
    eyebrow: 'Browse',
    title: 'Series',
    description:
      'Episodic television, from long-running staples to this year’s new seasons. Anime lives in its own hub.',
    rails: TV_RAILS,
    genres: BROWSE_GENRES,
    catalogs: (sort, genre) => [{ namespace: 'series', sort, genre, excludeAnime: true }],
    span: 2,
    postFilterGenre: false,
  },
  anime: {
    id: 'anime',
    path: '/anime',
    eyebrow: 'Browse',
    title: 'Anime',
    description: 'Japanese animation — series and films together, identified from the catalogue itself.',
    rails: ANIME_RAILS,
    genres: ANIME_GENRES,
    // Genre is applied in memory, so both catalogs stay on Animation where the
    // anime actually is.
    catalogs: (sort) => [
      { namespace: 'series', sort, genre: 'Animation', animeOnly: true },
      { namespace: 'movie', sort, genre: 'Animation', animeOnly: true },
    ],
    span: 4,
    postFilterGenre: true,
  },
};

export function parseSort(value?: string): CatalogSort {
  return SORT_OPTIONS.some((option) => option.id === value) ? (value as CatalogSort) : 'popular';
}

/** Only a genre the hub actually offers is accepted, so nothing arbitrary reaches upstream. */
export function parseGenre(hub: HubConfig, value?: string): string | undefined {
  if (!value) return undefined;
  return hub.genres.find((genre) => genre.toLowerCase() === value.toLowerCase());
}

export function parsePage(value?: string): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(page) && page > 1 ? Math.min(page, 40) : 1;
}

export interface BrowseQuery {
  sort: CatalogSort;
  genre?: string;
  page: number;
}

/** True when no filter is applied, i.e. the hub shows its editorial rails. */
export function isDefaultView(query: BrowseQuery): boolean {
  return query.sort === 'popular' && !query.genre && query.page === 1;
}

export function browseHref(hub: HubConfig, query: Partial<BrowseQuery>): string {
  const params = new URLSearchParams();
  if (query.genre) params.set('genre', query.genre);
  if (query.sort && query.sort !== 'popular') params.set('sort', query.sort);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return `${hub.path}${search ? `?${search}` : ''}`;
}

export interface BrowseResult {
  items: MediaSummary[];
  /** Every upstream read failed — distinct from "this filter has no titles". */
  degraded: boolean;
  hasMore: boolean;
}

export async function browseCatalog(hub: HubConfig, query: BrowseQuery): Promise<BrowseResult> {
  const base = hub.catalogs(query.sort, hub.postFilterGenre ? undefined : query.genre);
  const start = (query.page - 1) * hub.span;
  const displaySkips = Array.from({ length: hub.span }, (_, index) => (start + index) * UPSTREAM_PAGE);

  const [display, probe] = await Promise.all([
    gather(base, displaySkips),
    // One page past what we render: the only honest way to know whether a "next"
    // link would land on content.
    gather(base, [(start + hub.span) * UPSTREAM_PAGE]),
  ]);

  const narrow = (items: MediaSummary[]) =>
    hub.postFilterGenre && query.genre ? items.filter((item) => hasGenre(item, query.genre!)) : items;

  return {
    items: narrow(display.items),
    degraded: display.degraded,
    hasMore: narrow(probe.items).length > 0,
  };
}

function hasGenre(item: MediaSummary, genre: string): boolean {
  const accepted = GENRE_ALIASES[genre] ?? [genre];
  return item.genres.some((value) => accepted.some((label) => label.toLowerCase() === value.toLowerCase()));
}

/**
 * Reads every catalog across every page, then interleaves the catalogs so a mixed
 * hub alternates rather than listing all series before all films. Upstream
 * ranking is preserved inside each catalog.
 */
async function gather(
  requests: CatalogRequest[],
  skips: number[],
): Promise<{ items: MediaSummary[]; degraded: boolean }> {
  const results = await Promise.all(
    requests.map(async (request) => {
      const pages = await Promise.all(
        skips.map((skip) => metadata.getCatalog({ ...request, skip })),
      );
      return {
        items: pages.flatMap((page) => page.data),
        // Only a total failure counts: a page past the end of the catalogue is
        // expected to come back empty.
        degraded: pages.every((page) => page.degraded),
      };
    }),
  );

  const seen = new Set<string>();
  const items: MediaSummary[] = [];
  const longest = Math.max(0, ...results.map((result) => result.items.length));

  for (let index = 0; index < longest; index += 1) {
    for (const result of results) {
      const item = result.items[index];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }

  return { items, degraded: results.every((result) => result.degraded) };
}

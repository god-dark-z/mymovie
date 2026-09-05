import type { CatalogRequest } from '@/types/media';

/**
 * Home and browse rails.
 *
 * Every rail maps onto a real Cinemeta catalog, so the labels describe what the
 * data actually is: "Trending" is the provider's popularity ranking, "New
 * Releases" is its year catalog, "Top Rated" is its IMDb-rating catalog.
 */
export interface RailDefinition {
  id: string;
  title: string;
  subtitle?: string;
  request: CatalogRequest;
  /** Renders posters as wide 16:9 cards instead of portrait posters. */
  layout?: 'poster' | 'wide';
}

const LIMIT = 20;

export const HOME_RAILS: RailDefinition[] = [
  {
    id: 'trending-movies',
    title: 'Trending Movies',
    subtitle: 'What the world is watching right now',
    request: { namespace: 'movie', sort: 'popular', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'trending-series',
    title: 'Trending Series',
    subtitle: 'Binge-worthy and moving fast',
    request: { namespace: 'series', sort: 'popular', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'anime-spotlight',
    title: 'Anime Spotlight',
    subtitle: 'Japanese animation, hand-picked by popularity',
    request: { namespace: 'series', sort: 'popular', genre: 'Animation', animeOnly: true, limit: LIMIT },
  },
  {
    id: 'top-rated-movies',
    title: 'Top Rated Films',
    subtitle: 'Highest rated on IMDb',
    request: { namespace: 'movie', sort: 'rating', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'new-releases',
    title: 'New Releases',
    subtitle: 'Fresh arrivals this year',
    request: { namespace: 'movie', sort: 'new', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'action',
    title: 'Action & Adrenaline',
    request: { namespace: 'movie', sort: 'popular', genre: 'Action', limit: LIMIT },
  },
  {
    id: 'drama',
    title: 'Drama',
    request: { namespace: 'movie', sort: 'popular', genre: 'Drama', limit: LIMIT },
  },
  {
    id: 'comedy',
    title: 'Comedy',
    request: { namespace: 'movie', sort: 'popular', genre: 'Comedy', limit: LIMIT },
  },
  {
    id: 'horror',
    title: 'Horror',
    request: { namespace: 'movie', sort: 'popular', genre: 'Horror', limit: LIMIT },
  },
  {
    id: 'sci-fi',
    title: 'Sci-Fi & Beyond',
    request: { namespace: 'movie', sort: 'popular', genre: 'Sci-Fi', limit: LIMIT },
  },
  {
    id: 'animation',
    title: 'Animation',
    request: { namespace: 'movie', sort: 'popular', genre: 'Animation', limit: LIMIT },
  },
  {
    id: 'top-rated-series',
    title: 'Top Rated Series',
    subtitle: 'Highest rated on IMDb',
    request: { namespace: 'series', sort: 'rating', excludeAnime: true, limit: LIMIT },
  },
];

/** Rails used by the Movies hub. */
export const MOVIE_RAILS: RailDefinition[] = [
  {
    id: 'movies-popular',
    title: 'Popular Movies',
    request: { namespace: 'movie', sort: 'popular', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'movies-top-rated',
    title: 'Top Rated',
    request: { namespace: 'movie', sort: 'rating', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'movies-new',
    title: 'New Releases',
    request: { namespace: 'movie', sort: 'new', excludeAnime: true, limit: LIMIT },
  },
  { id: 'movies-thriller', title: 'Thriller', request: { namespace: 'movie', sort: 'popular', genre: 'Thriller', limit: LIMIT } },
  { id: 'movies-crime', title: 'Crime', request: { namespace: 'movie', sort: 'popular', genre: 'Crime', limit: LIMIT } },
  { id: 'movies-romance', title: 'Romance', request: { namespace: 'movie', sort: 'popular', genre: 'Romance', limit: LIMIT } },
  { id: 'movies-mystery', title: 'Mystery', request: { namespace: 'movie', sort: 'popular', genre: 'Mystery', limit: LIMIT } },
  { id: 'movies-fantasy', title: 'Fantasy', request: { namespace: 'movie', sort: 'popular', genre: 'Fantasy', limit: LIMIT } },
];

/** Rails used by the Series hub. */
export const TV_RAILS: RailDefinition[] = [
  {
    id: 'tv-popular',
    title: 'Popular Series',
    request: { namespace: 'series', sort: 'popular', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'tv-top-rated',
    title: 'Top Rated Series',
    request: { namespace: 'series', sort: 'rating', excludeAnime: true, limit: LIMIT },
  },
  {
    id: 'tv-new',
    title: 'New Seasons',
    request: { namespace: 'series', sort: 'new', excludeAnime: true, limit: LIMIT },
  },
  { id: 'tv-drama', title: 'Drama', request: { namespace: 'series', sort: 'popular', genre: 'Drama', excludeAnime: true, limit: LIMIT } },
  { id: 'tv-crime', title: 'Crime', request: { namespace: 'series', sort: 'popular', genre: 'Crime', excludeAnime: true, limit: LIMIT } },
  { id: 'tv-comedy', title: 'Comedy', request: { namespace: 'series', sort: 'popular', genre: 'Comedy', excludeAnime: true, limit: LIMIT } },
  { id: 'tv-scifi', title: 'Sci-Fi', request: { namespace: 'series', sort: 'popular', genre: 'Sci-Fi', excludeAnime: true, limit: LIMIT } },
  { id: 'tv-documentary', title: 'Documentary', request: { namespace: 'series', sort: 'popular', genre: 'Documentary', excludeAnime: true, limit: LIMIT } },
];

/** Rails used by the Anime hub. Every rail is filtered to Japanese animation. */
export const ANIME_RAILS: RailDefinition[] = [
  {
    id: 'anime-popular',
    title: 'Popular Anime',
    request: { namespace: 'series', sort: 'popular', genre: 'Animation', animeOnly: true, limit: LIMIT },
  },
  {
    id: 'anime-top-rated',
    title: 'Top Rated Anime',
    request: { namespace: 'series', sort: 'rating', genre: 'Animation', animeOnly: true, limit: LIMIT },
  },
  {
    id: 'anime-new',
    title: 'New Anime',
    request: { namespace: 'series', sort: 'new', genre: 'Animation', animeOnly: true, limit: LIMIT },
  },
  {
    id: 'anime-films',
    title: 'Anime Films',
    request: { namespace: 'movie', sort: 'popular', genre: 'Animation', animeOnly: true, limit: LIMIT },
  },
  {
    id: 'anime-action',
    title: 'Action Anime',
    request: { namespace: 'series', sort: 'popular', genre: 'Action', animeOnly: true, limit: LIMIT },
  },
  {
    id: 'anime-fantasy',
    title: 'Fantasy Anime',
    request: { namespace: 'series', sort: 'popular', genre: 'Fantasy', animeOnly: true, limit: LIMIT },
  },
];

/** Genre chips offered on the browse hubs. */
export const BROWSE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
] as const;

/** Browse hub a rail belongs to, used for its "See all" link. */
export function hubPath(request: CatalogRequest): '/movies' | '/series' | '/anime' {
  if (request.animeOnly) return '/anime';
  return request.namespace === 'movie' ? '/movies' : '/series';
}

/**
 * "See all" target for a rail: the same catalog on the hub that owns it, with the
 * genre and sort preserved so the grid matches what was clicked.
 */
export function railHref(request: CatalogRequest): string {
  const params = new URLSearchParams();
  if (request.genre) params.set('genre', request.genre);
  if (request.sort !== 'popular') params.set('sort', request.sort);
  const query = params.toString();
  return `${hubPath(request)}${query ? `?${query}` : ''}`;
}

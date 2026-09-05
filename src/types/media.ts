/**
 * The single normalized media shape used by every screen in Cineora.
 *
 * Nothing in `components/` or `app/` is allowed to touch a provider payload
 * directly — adapters in `lib/metadata/providers` map upstream data into these
 * types, so a provider can be swapped without touching the UI.
 */

/** Route namespace for a title. Anime is a first-class route, not a genre flag. */
export type MediaKind = 'movie' | 'tv' | 'anime';

/**
 * Nxsha's embed namespace. Deliberately distinct from `CatalogNamespace`: the
 * metadata provider calls episodic content `series` while Nxsha calls it `tv`,
 * and silently swapping one for the other is how broken embed URLs happen.
 */
export type PlaybackKind = 'movie' | 'tv';

/** Upstream metadata catalog namespace. */
export type CatalogNamespace = 'movie' | 'series';

/**
 * Identifiers are explicitly typed. A TMDb number must never be passed where an
 * IMDb id is expected, so both are stored separately and never coerced.
 */
export interface MediaIds {
  imdbId?: string;
  tmdbId?: string;
  tvdbId?: string;
}

export interface MediaSummary {
  /** Canonical route id. IMDb id when available, otherwise `tmdb:<id>`. */
  id: string;
  ids: MediaIds;
  kind: MediaKind;
  /** True for Japanese animation, used for badges and search grouping. */
  isAnime: boolean;
  title: string;
  /** e.g. `2008` or `2008–2013`, exactly as the provider expressed it. */
  releaseInfo?: string;
  year?: string;
  overview?: string;
  poster?: string;
  backdrop?: string;
  logo?: string;
  /** IMDb rating out of 10 when the provider exposes one. */
  rating?: number;
  genres: string[];
  /** Raw runtime string from the provider, e.g. `49 min`. */
  runtime?: string;
  country?: string;
  /** Provider popularity score, used only for ordering. */
  popularity?: number;
}

export interface Episode {
  /** Stable provider id, e.g. `tt0903747:1:1`. */
  id: string;
  season: number;
  episode: number;
  title: string;
  overview?: string;
  thumbnail?: string;
  airDate?: string;
  rating?: number;
  /** True when the air date is in the future. */
  unreleased: boolean;
}

export interface SeasonSummary {
  season: number;
  label: string;
  episodeCount: number;
  /** Air date of the first episode in the season. */
  firstAirDate?: string;
}

export interface MediaDetail extends MediaSummary {
  originalTitle?: string;
  /** Provider status for series, e.g. `Continuing` / `Ended`. */
  status?: string;
  releaseDate?: string;
  cast: string[];
  directors: string[];
  writers: string[];
  /** Series creators; for movies this is empty. */
  creators: string[];
  awards?: string;
  seasons: SeasonSummary[];
  episodes: Episode[];
  imdbUrl?: string;
  /** Alternative titles the provider exposed (anime frequently has several). */
  alternativeTitles: string[];
}

export type CatalogSort = 'popular' | 'new' | 'rating';

export interface CatalogRequest {
  /** Upstream namespace to read from. */
  namespace: CatalogNamespace;
  sort: CatalogSort;
  genre?: string;
  /** Only return Japanese animation. */
  animeOnly?: boolean;
  /** Exclude Japanese animation (keeps the Movies/TV rails clean). */
  excludeAnime?: boolean;
  limit?: number;
  skip?: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
}

export interface SearchResults {
  query: string;
  movies: MediaSummary[];
  tv: MediaSummary[];
  anime: MediaSummary[];
  total: number;
}

/** Result wrapper so the UI can distinguish "empty" from "provider is down". */
export interface ProviderResult<T> {
  data: T;
  /** Provider id that answered, or null when every provider failed. */
  source: string | null;
  degraded: boolean;
}

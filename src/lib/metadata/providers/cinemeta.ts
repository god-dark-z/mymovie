import type { MetadataProvider } from '@/lib/metadata/provider';
import { detectAnime, resolveKind } from '@/lib/metadata/classify';
import { fetchJson } from '@/lib/utils/http';
import { isFutureDate, seasonLabel } from '@/lib/utils/format';
import type {
  CatalogRequest,
  Episode,
  MediaDetail,
  MediaKind,
  MediaSummary,
  CatalogNamespace,
  SearchRequest,
  SeasonSummary,
} from '@/types/media';

/**
 * Cinemeta adapter.
 *
 * Cinemeta is the public, key-free metadata service behind Stremio's official
 * catalogs. It is IMDb-first (`tt…` ids) and also returns the matching TMDb id,
 * which is exactly the identity pair the Nxsha embed API accepts. No API key,
 * no account, no secrets.
 *
 * Verified endpoints (see `docs/INTEGRATIONS.md`):
 *   GET /manifest.json
 *   GET /catalog/{movie|series}/{top|year|imdbRating}[/genre=<g>&skip=<n>].json
 *   GET /catalog/{movie|series}/top/search=<query>.json
 *   GET /meta/{movie|series}/{ttId}.json
 */

const ORIGIN = (process.env.CINEORA_CINEMETA_ORIGIN ?? 'https://v3-cinemeta.strem.io').replace(/\/+$/, '');

const REVALIDATE = {
  catalog: 60 * 60,
  search: 60 * 10,
  meta: 60 * 60 * 6,
  health: 60 * 5,
} as const;

const CATALOG_IDS: Record<CatalogRequest['sort'], string> = {
  popular: 'top',
  new: 'year',
  rating: 'imdbRating',
};

interface RawVideo {
  id?: string;
  season?: number;
  episode?: number;
  number?: number;
  name?: string;
  title?: string;
  overview?: string;
  description?: string;
  thumbnail?: string;
  released?: string;
  firstAired?: string;
  rating?: string | number;
}

interface RawMeta {
  id?: string;
  imdb_id?: string;
  moviedb_id?: number | string;
  tvdb_id?: number | string;
  type?: string;
  name?: string;
  description?: string;
  poster?: string;
  background?: string;
  logo?: string;
  genre?: string[];
  genres?: string[];
  country?: string;
  imdbRating?: string | number;
  runtime?: string;
  year?: string;
  releaseInfo?: string;
  released?: string;
  status?: string;
  awards?: string;
  cast?: string[];
  director?: string[] | null;
  writer?: string[] | null;
  popularity?: number;
  videos?: RawVideo[];
}

interface CatalogResponse {
  metas?: RawMeta[];
}

interface MetaResponse {
  meta?: RawMeta;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function firstYear(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const match = candidate?.match(/\d{4}/);
    if (match) return match[0];
  }
  return undefined;
}

function uniqueStrings(values: Array<string | undefined | null> | null | undefined): string[] {
  if (!values) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value?.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

/** Cinemeta ids are IMDb ids. Anything else is namespaced so it can never be mistaken for one. */
function canonicalId(raw: RawMeta): string | null {
  const imdb = raw.imdb_id ?? (typeof raw.id === 'string' && raw.id.startsWith('tt') ? raw.id : undefined);
  if (imdb) return imdb;
  const tmdb = raw.moviedb_id;
  if (tmdb) return `tmdb:${tmdb}`;
  return null;
}

function normalizeSummary(raw: RawMeta): MediaSummary | null {
  const id = canonicalId(raw);
  const title = raw.name?.trim();
  if (!id || !title) return null;

  const genres = uniqueStrings(raw.genres ?? raw.genre);
  const isAnime = detectAnime({ genres, country: raw.country });
  const upstreamType = raw.type === 'movie' ? 'movie' : 'series';

  return {
    id,
    ids: {
      imdbId: raw.imdb_id ?? (id.startsWith('tt') ? id : undefined),
      tmdbId: raw.moviedb_id ? String(raw.moviedb_id) : undefined,
      tvdbId: raw.tvdb_id ? String(raw.tvdb_id) : undefined,
    },
    kind: resolveKind(upstreamType, isAnime),
    isAnime,
    title,
    releaseInfo: raw.releaseInfo ?? raw.year,
    year: firstYear(raw.releaseInfo, raw.year, raw.released),
    overview: raw.description?.trim() || undefined,
    poster: raw.poster,
    backdrop: raw.background,
    logo: raw.logo,
    rating: toNumber(raw.imdbRating),
    genres,
    runtime: raw.runtime,
    country: raw.country,
    popularity: toNumber(raw.popularity),
  };
}

function normalizeEpisodes(videos: RawVideo[] | undefined, seriesId: string): Episode[] {
  if (!videos?.length) return [];
  const episodes: Episode[] = [];

  for (const video of videos) {
    const season = typeof video.season === 'number' ? video.season : undefined;
    const episodeNumber = typeof video.episode === 'number' ? video.episode : video.number;
    if (season === undefined || typeof episodeNumber !== 'number') continue;

    const airDate = video.released ?? video.firstAired;
    episodes.push({
      id: video.id ?? `${seriesId}:${season}:${episodeNumber}`,
      season,
      episode: episodeNumber,
      title: video.name?.trim() || video.title?.trim() || `Episode ${episodeNumber}`,
      overview: (video.overview ?? video.description)?.trim() || undefined,
      thumbnail: video.thumbnail,
      airDate,
      rating: toNumber(video.rating),
      unreleased: isFutureDate(airDate),
    });
  }

  episodes.sort((a, b) => {
    // Specials (season 0) always sort after numbered seasons.
    const seasonA = a.season === 0 ? Number.MAX_SAFE_INTEGER : a.season;
    const seasonB = b.season === 0 ? Number.MAX_SAFE_INTEGER : b.season;
    if (seasonA !== seasonB) return seasonA - seasonB;
    return a.episode - b.episode;
  });

  return episodes;
}

function buildSeasons(episodes: Episode[]): SeasonSummary[] {
  const grouped = new Map<number, Episode[]>();
  for (const episode of episodes) {
    const bucket = grouped.get(episode.season);
    if (bucket) bucket.push(episode);
    else grouped.set(episode.season, [episode]);
  }

  return [...grouped.entries()]
    .map(([season, list]) => ({
      season,
      label: seasonLabel(season),
      episodeCount: list.length,
      firstAirDate: list.find((episode) => episode.airDate)?.airDate,
    }))
    .sort((a, b) => {
      const seasonA = a.season === 0 ? Number.MAX_SAFE_INTEGER : a.season;
      const seasonB = b.season === 0 ? Number.MAX_SAFE_INTEGER : b.season;
      return seasonA - seasonB;
    });
}

function normalizeDetail(raw: RawMeta): MediaDetail | null {
  const summary = normalizeSummary(raw);
  if (!summary) return null;

  const episodes = summary.kind === 'movie' ? [] : normalizeEpisodes(raw.videos, summary.id);
  const directors = uniqueStrings(raw.director);
  const writers = uniqueStrings(raw.writer);

  return {
    ...summary,
    status: raw.status,
    releaseDate: raw.released,
    cast: uniqueStrings(raw.cast).slice(0, 18),
    directors,
    writers,
    // Cinemeta has no dedicated "created by" field for series; writers are the
    // closest real signal, so movies keep an empty creators list instead of a guess.
    creators: summary.kind === 'movie' ? [] : writers,
    awards: raw.awards,
    seasons: buildSeasons(episodes),
    episodes,
    imdbUrl: summary.ids.imdbId ? `https://www.imdb.com/title/${summary.ids.imdbId}/` : undefined,
    alternativeTitles: [],
  };
}

function catalogPath(request: CatalogRequest): string {
  const namespace: CatalogNamespace = request.namespace;
  const catalogId = CATALOG_IDS[request.sort];
  const extras: string[] = [];
  if (request.genre) extras.push(`genre=${encodeURIComponent(request.genre)}`);
  if (request.skip && request.skip > 0) extras.push(`skip=${request.skip}`);
  const suffix = extras.length > 0 ? `/${extras.join('&')}` : '';
  return `${ORIGIN}/catalog/${namespace}/${catalogId}${suffix}.json`;
}

function applyFilters(items: MediaSummary[], request: CatalogRequest): MediaSummary[] {
  let out = items;
  if (request.animeOnly) out = out.filter((item) => item.isAnime);
  if (request.excludeAnime) out = out.filter((item) => !item.isAnime);
  if (request.limit && request.limit > 0) out = out.slice(0, request.limit);
  return out;
}

export class CinemetaProvider implements MetadataProvider {
  readonly id = 'cinemeta';
  readonly label = 'Cinemeta';

  async healthcheck(): Promise<boolean> {
    try {
      const manifest = await fetchJson<{ id?: string }>(`${ORIGIN}/manifest.json`, {
        revalidate: REVALIDATE.health,
        provider: this.label,
        timeoutMs: 4_000,
      });
      return Boolean(manifest?.id);
    } catch {
      return false;
    }
  }

  async search(request: SearchRequest): Promise<MediaSummary[]> {
    const query = request.query.trim();
    if (query.length < 2) return [];

    const encoded = encodeURIComponent(query);
    const namespaces: CatalogNamespace[] = ['movie', 'series'];

    const responses = await Promise.allSettled(
      namespaces.map((namespace) =>
        fetchJson<CatalogResponse>(`${ORIGIN}/catalog/${namespace}/top/search=${encoded}.json`, {
          revalidate: REVALIDATE.search,
          provider: this.label,
          timeoutMs: 7_000,
        }),
      ),
    );

    const seen = new Set<string>();
    const out: MediaSummary[] = [];

    for (const response of responses) {
      if (response.status !== 'fulfilled') continue;
      for (const raw of response.value.metas ?? []) {
        const summary = normalizeSummary(raw);
        if (!summary || seen.has(summary.id)) continue;
        seen.add(summary.id);
        out.push(summary);
      }
    }

    // Rank exact and prefix matches first, then fall back to provider popularity.
    const needle = query.toLowerCase();
    out.sort((a, b) => scoreMatch(b, needle) - scoreMatch(a, needle));

    return request.limit ? out.slice(0, request.limit) : out;
  }

  async getCatalog(request: CatalogRequest): Promise<MediaSummary[]> {
    const response = await fetchJson<CatalogResponse>(catalogPath(request), {
      revalidate: REVALIDATE.catalog,
      provider: this.label,
      tags: ['catalog'],
    });

    const normalized = (response.metas ?? [])
      .map(normalizeSummary)
      .filter((item): item is MediaSummary => item !== null);

    return applyFilters(normalized, request);
  }

  async getTitle(kind: MediaKind, id: string): Promise<MediaDetail | null> {
    if (!id.startsWith('tt')) return null;

    // Try the namespace the route implies first, then the other one so a
    // mis-routed link still resolves instead of 404-ing.
    const order: CatalogNamespace[] = kind === 'movie' ? ['movie', 'series'] : ['series', 'movie'];

    for (const namespace of order) {
      try {
        const response = await fetchJson<MetaResponse>(`${ORIGIN}/meta/${namespace}/${id}.json`, {
          revalidate: REVALIDATE.meta,
          provider: this.label,
          timeoutMs: 12_000,
        });
        if (!response.meta) continue;
        const detail = normalizeDetail(response.meta);
        if (detail) return detail;
      } catch {
        // Fall through to the alternate namespace.
      }
    }

    return null;
  }
}

function scoreMatch(item: MediaSummary, needle: string): number {
  const title = item.title.toLowerCase();
  let score = 0;
  if (title === needle) score += 1_000;
  else if (title.startsWith(needle)) score += 600;
  else if (title.includes(needle)) score += 300;
  // Titles with artwork and a rating are far more useful search results.
  if (item.poster) score += 40;
  if (item.rating) score += Math.round(item.rating * 4);
  if (item.popularity) score += Math.min(60, Math.round(item.popularity * 4));
  if (item.year) score += 10;
  return score;
}

export const cinemetaProvider = new CinemetaProvider();

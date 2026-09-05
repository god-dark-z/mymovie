import type { MetadataProvider } from '@/lib/metadata/provider';
import { cinemetaProvider } from '@/lib/metadata/providers/cinemeta';
import type {
  CatalogRequest,
  MediaDetail,
  MediaKind,
  MediaSummary,
  ProviderResult,
  SearchRequest,
  SearchResults,
} from '@/types/media';

/**
 * Composes metadata providers behind one façade.
 *
 * Today there is a single verified key-free source (Cinemeta). The manager still
 * exists because provider outages are a matter of when, not if: adding a second
 * adapter to `PROVIDERS` is enough to get automatic failover, with no changes
 * anywhere in `app/` or `components/`.
 */
class MetadataManager {
  private readonly providers: MetadataProvider[];

  constructor(providers: MetadataProvider[]) {
    this.providers = providers;
  }

  get primary(): MetadataProvider | undefined {
    return this.providers[0];
  }

  private async attempt<T>(
    run: (provider: MetadataProvider) => Promise<T>,
    isUsable: (value: T) => boolean,
    fallback: T,
  ): Promise<ProviderResult<T>> {
    let lastUsable: ProviderResult<T> | null = null;

    for (const provider of this.providers) {
      try {
        const value = await run(provider);
        if (isUsable(value)) {
          return { data: value, source: provider.id, degraded: false };
        }
        // An empty-but-successful answer is remembered, in case every provider
        // is reachable yet nothing matches.
        lastUsable ??= { data: value, source: provider.id, degraded: false };
      } catch {
        // Try the next provider.
      }
    }

    return lastUsable ?? { data: fallback, source: null, degraded: true };
  }

  async getCatalog(request: CatalogRequest): Promise<ProviderResult<MediaSummary[]>> {
    return this.attempt(
      (provider) => provider.getCatalog(request),
      (items) => items.length > 0,
      [],
    );
  }

  async getTitle(kind: MediaKind, id: string): Promise<ProviderResult<MediaDetail | null>> {
    return this.attempt(
      (provider) => provider.getTitle(kind, id),
      (detail) => detail !== null,
      null,
    );
  }

  async search(request: SearchRequest): Promise<ProviderResult<SearchResults>> {
    const flat = await this.attempt(
      (provider) => provider.search(request),
      (items) => items.length > 0,
      [] as MediaSummary[],
    );

    return {
      source: flat.source,
      degraded: flat.degraded,
      data: groupSearchResults(request.query, flat.data),
    };
  }

  async status(): Promise<Array<{ id: string; label: string; healthy: boolean }>> {
    return Promise.all(
      this.providers.map(async (provider) => ({
        id: provider.id,
        label: provider.label,
        healthy: await provider.healthcheck(),
      })),
    );
  }
}

/** Splits a flat result list into the groups the search UI renders. */
export function groupSearchResults(query: string, items: MediaSummary[]): SearchResults {
  const movies: MediaSummary[] = [];
  const tv: MediaSummary[] = [];
  const anime: MediaSummary[] = [];

  for (const item of items) {
    if (item.isAnime) anime.push(item);
    else if (item.kind === 'movie') movies.push(item);
    else tv.push(item);
  }

  return { query, movies, tv, anime, total: items.length };
}

const PROVIDERS: MetadataProvider[] = [cinemetaProvider];

export const metadata = new MetadataManager(PROVIDERS);

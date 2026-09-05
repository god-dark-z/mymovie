import type {
  CatalogRequest,
  MediaDetail,
  MediaKind,
  MediaSummary,
  SearchRequest,
} from '@/types/media';

/**
 * Contract every metadata source must satisfy. `MetadataManager` composes
 * providers behind this interface, so adding or replacing a source never
 * requires UI changes.
 */
export interface MetadataProvider {
  readonly id: string;
  readonly label: string;
  /** Cheap liveness probe used by the status endpoint. */
  healthcheck(): Promise<boolean>;
  search(request: SearchRequest): Promise<MediaSummary[]>;
  getCatalog(request: CatalogRequest): Promise<MediaSummary[]>;
  /**
   * Resolves one title. `kind` is a routing hint; providers should tolerate a
   * mismatch (an anime id arriving as `tv`, for example).
   */
  getTitle(kind: MediaKind, id: string): Promise<MediaDetail | null>;
}

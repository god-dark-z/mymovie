import type { MediaQuality } from '@/server/data/types';
import type { MediaKind } from '@/types/media';

/**
 * What crosses the wire for downloads.
 *
 * The omission is the point: an offer carries a title, a size and an opaque key,
 * never the URL of the underlying file. A browser learns where the bytes live only
 * after the server has checked who is asking, and then only through a short-lived
 * link of its own making.
 *
 * `MediaQuality` is borrowed from the storage model — a four-member union with
 * nothing private in it — so the account's download-quality preference and the
 * labels on this sheet cannot drift apart.
 */

export type { MediaQuality };

/** One downloadable file. `key` is meaningful only to the server. */
export interface DownloadItem {
  key: string;
  /** Episode heading such as "Season 1 · Episode 2", or null for a film. */
  group: string | null;
  quality: MediaQuality;
  sizeBytes: number;
  /** Container, for the label and the native handoff's MIME type. */
  contentType: string;
}

/**
 * Everything Cineora is licensed to hand out for one title.
 *
 * Deliberately free of anything user-specific, so a detail page carrying an offer
 * stays safe to cache and share. Which file is *recommended* depends on the
 * reader's quality preference and is decided in the browser.
 */
export interface DownloadOffer {
  titleId: string;
  title: string;
  kind: MediaKind;
  /** The operator's stated basis for distributing these files. Shown verbatim. */
  licence: string;
  items: DownloadItem[];
}

export interface DownloadGrantRequest {
  key: string;
}

/** The answer to a granted download. `url` is single-purpose and expires. */
export interface DownloadGrantResponse {
  url: string;
  /** Epoch milliseconds. After this the link is refused and must be reissued. */
  expiresAt: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  quality: MediaQuality;
  title: string;
}

export interface DownloadCatalogStatus {
  /** False when the deployment has no authorized catalogue at all. */
  configured: boolean;
  titles: number;
  files: number;
}

/**
 * Picks the file a reader most likely wants.
 *
 * `auto` and an exact match are easy. Otherwise the best available rung at or
 * below the request wins, because handing someone a larger file than they asked
 * for is the one outcome a data-conscious setting exists to prevent; only if
 * nothing is small enough do we fall back to the smallest file on offer.
 */
const LADDER: readonly MediaQuality[] = ['480p', '720p', '1080p'];

export function recommendedItem(items: readonly DownloadItem[], preferred: MediaQuality): DownloadItem | null {
  if (items.length === 0) return null;
  const byQuality = (quality: MediaQuality) => items.find((item) => item.quality === quality);

  if (preferred !== 'auto') {
    const exact = byQuality(preferred);
    if (exact) return exact;
    const ceiling = LADDER.indexOf(preferred);
    for (let index = ceiling - 1; index >= 0; index -= 1) {
      const lower = byQuality(LADDER[index]!);
      if (lower) return lower;
    }
    const smallest = [...items].sort((a, b) => a.sizeBytes - b.sizeBytes)[0];
    return smallest ?? null;
  }

  // `auto` means "you choose": the largest file, matching what an unconstrained
  // player would stream.
  return [...items].sort((a, b) => b.sizeBytes - a.sizeBytes)[0] ?? null;
}

/** Human file size. Binary units, because that is what download managers show. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded} ${units[unit]}`;
}

export function qualityLabel(quality: MediaQuality): string {
  return quality === 'auto' ? 'Source quality' : quality;
}

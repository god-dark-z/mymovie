import type { DownloadCatalogStatus, DownloadItem, DownloadOffer } from '@/lib/downloads/types';
import type { MediaQuality } from '@/server/data/types';
import { serverConfig } from '@/server/env';
import type { MediaKind } from '@/types/media';

/**
 * The authorized download catalogue.
 *
 * Cineora is a frontend over public metadata and a third-party player: it hosts no
 * video and holds no distribution rights of its own, so this catalogue is empty
 * unless an operator supplies one. Nothing here inspects, unwraps or re-hosts a
 * provider's stream — the only files Cineora will hand out are the ones an operator
 * has declared, together with the licence that permits it, in
 * `CINEORA_DOWNLOAD_CATALOG`. The schema is documented in `docs/DOWNLOADS.md`.
 *
 * Asset URLs never leave this module. A browser receives an opaque key; the bytes
 * arrive through `/api/downloads/file`, which accepts only a signed, expiring grant.
 */

/** The containers Cineora will serve, and the extension each one gets. */
const CONTAINERS: Readonly<Record<string, string>> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
};

const QUALITIES: readonly MediaQuality[] = ['auto', '480p', '720p', '1080p'];
const KINDS: readonly MediaKind[] = ['movie', 'tv', 'anime'];

export interface AuthorizedFile {
  quality: MediaQuality;
  sizeBytes: number;
  contentType: string;
  /** Server-side only. Never serialised into a response. */
  url: string;
  /**
   * `proxy` streams the bytes through Cineora, which keeps the origin private.
   * `redirect` hands over an operator-signed URL instead, which is what a large
   * file on a CDN needs — at the cost of that URL becoming visible to the client.
   */
  delivery: 'proxy' | 'redirect';
}

export interface AuthorizedAsset {
  titleId: string;
  kind: MediaKind;
  /** Null for a film; a number for an episode. */
  season: number | null;
  episode: number | null;
  title: string;
  licence: string;
  files: AuthorizedFile[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

/** Rejects anything that is not an absolute https URL. */
const assetUrl = (value: unknown): string | null => {
  const raw = text(value, 2048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const wholeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
    ? value
    : null;

/**
 * Absent reads as null, present-but-nonsense reads as `false`.
 *
 * The distinction matters: a season of `"two"` must reject the entry rather than
 * quietly become a film, which is what treating every bad value as absent would do.
 */
const optionalNumber = (value: unknown): number | null | false => {
  if (value === undefined || value === null) return null;
  return wholeNumber(value) ?? false;
};

function parseFile(value: unknown): AuthorizedFile | null {
  if (!isRecord(value)) return null;
  const quality = QUALITIES.find((candidate) => candidate === value.quality);
  const contentType = text(value.contentType, 60)?.toLowerCase();
  const url = assetUrl(value.url);
  const sizeBytes = wholeNumber(value.sizeBytes);
  if (!quality || !contentType || !url || sizeBytes === null) return null;
  if (!Object.hasOwn(CONTAINERS, contentType)) return null;
  return { quality, sizeBytes, contentType, url, delivery: value.delivery === 'redirect' ? 'redirect' : 'proxy' };
}

function parseAsset(value: unknown): AuthorizedAsset | null {
  if (!isRecord(value)) return null;
  const titleId = text(value.titleId, 64);
  const title = text(value.title, 160);
  const licence = text(value.licence, 240);
  const kind = KINDS.find((candidate) => candidate === value.kind);
  // A licence is not optional. Cineora offers a file only when the operator has
  // said, in writing, what permits them to distribute it.
  if (!titleId || !title || !licence || !kind) return null;
  // `~` separates the fields of a download key, so an id containing one would make
  // that key ambiguous.
  if (titleId.includes('~')) return null;

  const season = optionalNumber(value.season);
  const episode = optionalNumber(value.episode);
  if (season === false || episode === false) return null;

  const files = Array.isArray(value.files)
    ? value.files.map(parseFile).filter((file): file is AuthorizedFile => file !== null)
    : [];
  if (files.length === 0) return null;

  // One file per quality rung: two 1080p entries would make a key ambiguous, and
  // silently serving whichever came first is worse than dropping the duplicate.
  const byQuality = new Map(files.map((file) => [file.quality, file]));
  return { titleId, kind, season, episode, title, licence, files: [...byQuality.values()] };
}

/** Parsed once per process. The catalogue is configuration, not data. */
let cached: AuthorizedAsset[] | undefined;

export function authorizedAssets(): AuthorizedAsset[] {
  if (cached) return cached;

  const raw = serverConfig().downloadCatalog;
  if (!raw) return (cached = []);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // The message never includes the value: a catalogue holds signed asset URLs.
    console.error('[cineora] CINEORA_DOWNLOAD_CATALOG is not valid JSON. No downloads will be offered.');
    return (cached = []);
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.titles)
      ? parsed.titles
      : null;
  if (!entries) {
    console.error('[cineora] CINEORA_DOWNLOAD_CATALOG must be an array of entries. No downloads will be offered.');
    return (cached = []);
  }

  const assets: AuthorizedAsset[] = [];
  let rejected = 0;
  for (const entry of entries) {
    const asset = parseAsset(entry);
    if (asset) assets.push(asset);
    else rejected += 1;
  }
  if (rejected > 0) {
    console.error(
      `[cineora] download catalogue: ${rejected} ${rejected === 1 ? 'entry was' : 'entries were'} rejected as invalid. See docs/DOWNLOADS.md.`,
    );
  }
  return (cached = assets);
}

export function catalogStatus(): DownloadCatalogStatus {
  const assets = authorizedAssets();
  return {
    configured: serverConfig().downloadCatalog !== undefined,
    titles: new Set(assets.map((asset) => asset.titleId)).size,
    files: assets.reduce((total, asset) => total + asset.files.length, 0),
  };
}

/**
 * The opaque handle a browser gets. It names a file without describing where it
 * lives, and it is not a capability on its own — `/api/downloads/file` accepts only
 * a signed grant, so knowing a key gets you nothing.
 */
export const assetKey = (asset: AuthorizedAsset, file: AuthorizedFile): string =>
  `${asset.titleId}~${asset.season ?? '-'}~${asset.episode ?? '-'}~${file.quality}`;

const groupLabel = (asset: AuthorizedAsset): string | null =>
  asset.episode === null ? null : `Season ${asset.season ?? 1} · Episode ${asset.episode}`;

/** Episodes in running order, files smallest first within each. */
function toItems(assets: readonly AuthorizedAsset[]): DownloadItem[] {
  return [...assets]
    .sort((a, b) => (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0))
    .flatMap((asset) =>
      [...asset.files]
        .sort((a, b) => a.sizeBytes - b.sizeBytes)
        .map((file) => ({
          key: assetKey(asset, file),
          group: groupLabel(asset),
          quality: file.quality,
          sizeBytes: file.sizeBytes,
          contentType: file.contentType,
        })),
    );
}

const toOffer = (assets: readonly AuthorizedAsset[]): DownloadOffer | null => {
  const first = assets[0];
  if (!first) return null;
  return {
    titleId: first.titleId,
    title: first.title,
    kind: first.kind,
    licence: first.licence,
    items: toItems(assets),
  };
};

/**
 * What this deployment is authorized to hand out for one title, or null.
 *
 * Safe to call from a cached page render: the answer depends only on the operator's
 * configuration, never on who is asking.
 */
export const offerFor = (titleId: string): DownloadOffer | null =>
  toOffer(authorizedAssets().filter((asset) => asset.titleId === titleId));

/** Every authorized title, alphabetically, for the downloads library. */
export function allOffers(): DownloadOffer[] {
  const byTitle = new Map<string, AuthorizedAsset[]>();
  for (const asset of authorizedAssets()) {
    const existing = byTitle.get(asset.titleId);
    if (existing) existing.push(asset);
    else byTitle.set(asset.titleId, [asset]);
  }
  return [...byTitle.values()]
    .map(toOffer)
    .filter((offer): offer is DownloadOffer => offer !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export interface ResolvedFile {
  asset: AuthorizedAsset;
  file: AuthorizedFile;
}

/**
 * Turns a key back into a catalogue entry, or null.
 *
 * The lookup is a scan of the operator's own list rather than anything derived from
 * the key, so a forged or edited key cannot point at a URL that was never declared.
 */
export function resolveKey(key: string): ResolvedFile | null {
  const parts = key.split('~');
  if (parts.length !== 4) return null;
  const [titleId, season, episode, quality] = parts;
  for (const asset of authorizedAssets()) {
    if (asset.titleId !== titleId) continue;
    if (String(asset.season ?? '-') !== season) continue;
    if (String(asset.episode ?? '-') !== episode) continue;
    const file = asset.files.find((candidate) => candidate.quality === quality);
    if (file) return { asset, file };
  }
  return null;
}

/**
 * A descriptive filename that survives the handoff.
 *
 * Deliberately plain ASCII: this value crosses into `Content-Disposition` and then
 * into whatever download manager the device uses, and a filename is not the place to
 * discover how a given Android build handles a non-Latin title.
 */
export function fileNameFor(asset: AuthorizedAsset, file: AuthorizedFile): string {
  const stem =
    asset.title
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]+/g, ' ')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '.') || 'Cineora';
  const numbering =
    asset.episode === null
      ? ''
      : `.S${String(asset.season ?? 1).padStart(2, '0')}E${String(asset.episode).padStart(2, '0')}`;
  const quality = file.quality === 'auto' ? '' : `.${file.quality}`;
  return `${stem}${numbering}${quality}.${CONTAINERS[file.contentType] ?? 'mp4'}`;
}

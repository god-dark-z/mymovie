import type { MediaQuality } from '@/lib/downloads/types';
import { asArray, asNumber, asRecord, asString, createStore } from '@/lib/storage/store';
import type { MediaKind } from '@/types/media';

/**
 * What this device has downloaded.
 *
 * A record of what was started here — not a claim about what is on the filesystem.
 * Once a file leaves for the browser's own downloader or a native host, Cineora has
 * no way to know whether it finished, where it landed, or whether it has since been
 * deleted. So this list says what it is, and the screen that renders it says the same.
 *
 * It stays on the device. Which films someone saved is not something the account
 * needs to know; the server keeps only the fact that a download was authorised.
 */
export interface DownloadRecord {
  /** Catalogue key, so the same file can be requested again. */
  key: string;
  titleId: string;
  kind: MediaKind;
  title: string;
  /** Episode heading, or null for a film. */
  group: string | null;
  quality: MediaQuality;
  sizeBytes: number;
  fileName: string;
  startedAt: number;
  /** Which downloader took it. */
  handoff: 'browser' | 'native';
  /** The native host's handle, where it supplied one. */
  nativeId: string | null;
}

const MAX_ENTRIES = 80;

const KINDS: readonly MediaKind[] = ['movie', 'tv', 'anime'];
const QUALITIES: readonly MediaQuality[] = ['auto', '480p', '720p', '1080p'];

function parseEntry(value: unknown): DownloadRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const key = asString(record.key);
  const title = asString(record.title);
  const fileName = asString(record.fileName);
  const kind = KINDS.find((candidate) => candidate === record.kind);
  if (!key || !title || !fileName || !kind) return null;

  return {
    key,
    titleId: asString(record.titleId) ?? key,
    kind,
    title,
    group: asString(record.group) ?? null,
    quality: QUALITIES.find((candidate) => candidate === record.quality) ?? 'auto',
    sizeBytes: asNumber(record.sizeBytes) ?? 0,
    fileName,
    startedAt: asNumber(record.startedAt) ?? Date.now(),
    handoff: record.handoff === 'native' ? 'native' : 'browser',
    nativeId: asString(record.nativeId) ?? null,
  };
}

export const downloadsStore = createStore<DownloadRecord[]>({
  name: 'downloads',
  version: 1,
  fallback: [],
  parse: (value) => {
    const list = asArray(value);
    if (!list) return null;
    return list.map(parseEntry).filter((entry): entry is DownloadRecord => entry !== null);
  },
});

/** Notes a started download, replacing any earlier attempt at the same file. */
export function recordDownload(entry: Omit<DownloadRecord, 'startedAt'>): void {
  downloadsStore.update((current) => [
    { ...entry, startedAt: Date.now() },
    ...current.filter((item) => item.key !== entry.key),
  ].slice(0, MAX_ENTRIES));
}

/**
 * Removes an entry from this list.
 *
 * It does not delete a file. Nothing here can: the file belongs to the device's
 * downloads folder or to the host app, and the screen says so rather than offering a
 * delete button that quietly does less than it appears to.
 */
export function forgetDownload(key: string): void {
  downloadsStore.update((current) => current.filter((entry) => entry.key !== key));
}

export function clearDownloads(): void {
  downloadsStore.clear();
}

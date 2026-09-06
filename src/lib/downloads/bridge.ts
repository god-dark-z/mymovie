import type { MediaQuality } from '@/lib/downloads/types';

/**
 * The optional native download bridge.
 *
 * A web page cannot behave like Android's download manager. It cannot queue, pause,
 * resume across a restart, survive the tab closing, or learn how many bytes have
 * arrived — a browser download leaves the page's control the moment it starts. The
 * honest consequence is that Cineora shows no progress bar it cannot fill.
 *
 * A WebView host that *can* do those things may inject `window.CineoraNative`, and
 * downloads are handed to it instead. Nothing in this file ships as part of that
 * host: it is the contract Cineora will use if it finds one, every member is checked
 * before it is called, and its absence is the normal case rather than an error.
 */

export interface NativeDownloadRequest {
  /** Absolute, single-purpose and expiring. */
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  title: string;
  quality: MediaQuality;
  /** Epoch milliseconds. Past this the host must ask the page for a fresh link. */
  expiresAt: number;
}

export type NativeDownloadState = 'queued' | 'running' | 'paused' | 'done' | 'failed';

export interface NativeDownloadEntry {
  id: string;
  fileName: string;
  title: string;
  state: NativeDownloadState;
  /** 0–1 where the host tracks it, null where it does not. Never invented. */
  progress: number | null;
  sizeBytes: number;
}

export interface NativeDownloadBridge {
  /** Bumped if this contract ever changes shape; unknown versions are ignored. */
  version: 1;
  enqueue(request: NativeDownloadRequest): void | string | Promise<void | string>;
  list?(): NativeDownloadEntry[] | Promise<NativeDownloadEntry[]>;
  cancel?(id: string): void;
  remove?(id: string): void;
}

declare global {
  interface Window {
    CineoraNative?: { downloads?: NativeDownloadBridge };
  }
}

/** The bridge, if a host injected a version this build understands. */
export function nativeDownloads(): NativeDownloadBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = window.CineoraNative?.downloads;
  if (!bridge || bridge.version !== 1 || typeof bridge.enqueue !== 'function') return null;
  return bridge;
}

/** Where a download ended up. A host that refuses is reported as `unavailable`. */
export type Handoff = { via: 'native'; id: string | null } | { via: 'unavailable' };

/**
 * Offers a file to the host.
 *
 * A host that throws is reported as unavailable rather than propagated, so the
 * caller falls back to the browser instead of leaving the reader with nothing.
 */
export async function enqueueNative(request: NativeDownloadRequest): Promise<Handoff> {
  const bridge = nativeDownloads();
  if (!bridge) return { via: 'unavailable' };
  try {
    const handle = await bridge.enqueue(request);
    return { via: 'native', id: typeof handle === 'string' && handle.length > 0 ? handle : null };
  } catch {
    return { via: 'unavailable' };
  }
}

/** What the host says is in its queue. Empty when it does not report. */
export async function listNative(): Promise<NativeDownloadEntry[]> {
  const bridge = nativeDownloads();
  if (!bridge || typeof bridge.list !== 'function') return [];
  try {
    const entries = await bridge.list();
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

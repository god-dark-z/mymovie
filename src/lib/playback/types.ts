import type { MediaIds } from '@/types/media';
import type { PlaybackServerConfig } from '@/lib/nxsha/servers';

/** What we are asking a provider to play. Anime resolves to the `tv` shape. */
export type PlaybackTarget =
  | { kind: 'movie'; ids: MediaIds }
  | { kind: 'tv'; ids: MediaIds; season: number; episode: number };

export interface PlaybackPreferences {
  serverId?: string;
  lockServer?: boolean;
  language?: string | null;
  subtitle?: string | null;
  /** Which identifier family to hand the provider. */
  preferId?: 'imdb' | 'tmdb';
}

export interface PlaybackSource {
  providerId: string;
  /** Fully-formed embed URL. */
  url: string;
  /** Identifier actually used, so the UI can show what was sent. */
  identity: { value: string; kind: 'imdb' | 'tmdb' };
  serverId: string;
  /** `allow` attribute the provider documents for its iframe. */
  iframeAllow: string;
}

/**
 * An explicit, honest declaration of what the integration can and cannot do.
 *
 * The watch UI reads this to decide which controls to render and which
 * limitations to state out loud. Nothing here is aspirational: a capability is
 * only `true` when the provider documents a public mechanism for it.
 */
export interface PlaybackCapabilities {
  manualServerSelection: boolean;
  /** Provider performs its own node fallback (documented behaviour). */
  providerSideFailover: boolean;
  /** Provider accepts a strict single-node lock. */
  serverLock: boolean;
  preferredAudioLanguage: boolean;
  preferredSubtitleLanguage: boolean;
  /** Provider exposes which audio/subtitle tracks a title actually carries. */
  trackAvailabilityReporting: boolean;
  /** Provider emits playback position events we may consume. */
  playbackProgressReporting: boolean;
  /** Provider documents a control API (postMessage or similar). */
  playerControlApi: boolean;
}

export interface PlaybackProvider {
  readonly id: string;
  readonly label: string;
  readonly docsUrl: string;
  readonly capabilities: PlaybackCapabilities;
  readonly servers: PlaybackServerConfig[];
  /** True when this provider has a documented endpoint for the target. */
  supports(target: PlaybackTarget): boolean;
  /** Returns null when the target cannot be expressed as a documented URL. */
  buildSource(target: PlaybackTarget, preferences: PlaybackPreferences): PlaybackSource | null;
}

/** Why playback could not start, mapped to a polished UI state. */
export type PlaybackBlockReason =
  | 'missing-identifier'
  | 'unsupported-target'
  | 'no-provider'
  | 'unreleased';

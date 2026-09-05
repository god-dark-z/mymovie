import {
  NXSHA_DOCS_URL,
  NXSHA_IFRAME_ALLOW,
  buildMovieEmbedUrl,
  buildTvEmbedUrl,
  resolveIdentity,
} from '@/lib/nxsha/provider';
import { DEFAULT_SERVER_ID, PLAYBACK_SERVERS } from '@/lib/nxsha/servers';
import type {
  PlaybackCapabilities,
  PlaybackPreferences,
  PlaybackProvider,
  PlaybackSource,
  PlaybackTarget,
} from '@/lib/playback/types';

/**
 * Nxsha playback provider.
 *
 * Capabilities are stated from the documentation only. In particular:
 *  - Nxsha publishes no player control API, no events, and no track listing, so
 *    those capabilities are false and the UI never pretends otherwise.
 *  - `?lang` / `?sub` are documented *preferences*: they ask the player to
 *    preselect a track. Whether the track exists depends on the chosen source.
 */
const CAPABILITIES: PlaybackCapabilities = {
  manualServerSelection: true,
  providerSideFailover: true,
  serverLock: true,
  preferredAudioLanguage: true,
  preferredSubtitleLanguage: true,
  trackAvailabilityReporting: false,
  playbackProgressReporting: false,
  playerControlApi: false,
};

class NxshaPlaybackProvider implements PlaybackProvider {
  readonly id = 'nxsha';
  readonly label = 'Nxsha';
  readonly docsUrl = NXSHA_DOCS_URL;
  readonly capabilities = CAPABILITIES;
  readonly servers = PLAYBACK_SERVERS;

  supports(target: PlaybackTarget): boolean {
    return resolveIdentity(target.ids) !== null;
  }

  buildSource(target: PlaybackTarget, preferences: PlaybackPreferences): PlaybackSource | null {
    const identity = resolveIdentity(target.ids, preferences.preferId ?? 'imdb');
    if (!identity) return null;

    const shared = {
      id: identity.value,
      serverId: preferences.serverId ?? DEFAULT_SERVER_ID,
      lockServer: preferences.lockServer,
      language: preferences.language,
      subtitle: preferences.subtitle,
    };

    try {
      const url =
        target.kind === 'movie'
          ? buildMovieEmbedUrl(shared)
          : buildTvEmbedUrl({ ...shared, season: target.season, episode: target.episode });

      return {
        providerId: this.id,
        url,
        identity,
        serverId: shared.serverId,
        iframeAllow: NXSHA_IFRAME_ALLOW,
      };
    } catch {
      return null;
    }
  }
}

export const nxshaPlaybackProvider = new NxshaPlaybackProvider();

import { asRecord, asString, createStore } from '@/lib/storage/store';
import { DEFAULT_SERVER_ID, getServerConfig } from '@/lib/nxsha/servers';
import { normalizeLanguageCode } from '@/lib/nxsha/languages';

/**
 * Playback preferences that persist across titles: which server to try first,
 * and the preferred audio / subtitle languages sent as documented Nxsha
 * parameters.
 */
export interface PlaybackPreferencesState {
  serverId: string;
  lockServer: boolean;
  /** ISO 639-1 or null for "let the source decide". */
  language: string | null;
  subtitle: string | null;
  /** Try the TMDb id instead of the IMDb id. Off by default. */
  useTmdbId: boolean;
  /** Automatically try the next server when one fails to connect. */
  autoFailover: boolean;
}

export const DEFAULT_PLAYBACK_PREFERENCES: PlaybackPreferencesState = {
  serverId: DEFAULT_SERVER_ID,
  lockServer: false,
  language: null,
  subtitle: null,
  useTmdbId: false,
  autoFailover: true,
};

export const playbackPreferencesStore = createStore<PlaybackPreferencesState>({
  name: 'playback-preferences',
  version: 1,
  fallback: DEFAULT_PLAYBACK_PREFERENCES,
  parse: (value) => {
    const record = asRecord(value);
    if (!record) return null;
    const serverId = asString(record.serverId);
    return {
      serverId: serverId ? getServerConfig(serverId).id : DEFAULT_SERVER_ID,
      lockServer: record.lockServer === true,
      language: normalizeLanguageCode(asString(record.language)) ?? null,
      subtitle: normalizeLanguageCode(asString(record.subtitle)) ?? null,
      useTmdbId: record.useTmdbId === true,
      autoFailover: record.autoFailover !== false,
    };
  },
});

export function updatePlaybackPreferences(patch: Partial<PlaybackPreferencesState>): void {
  playbackPreferencesStore.update((current) => ({ ...current, ...patch }));
}

/**
 * Storage façade. Screens import from here, never from a concrete store, so the
 * whole layer can be re-pointed at an authenticated backend later.
 */
export { createStore, type PersistentStore } from '@/lib/storage/store';
export {
  watchlistStore,
  addToWatchlist,
  removeFromWatchlist,
  toggleWatchlist,
  isInWatchlist,
  toWatchlistEntry,
  type WatchlistEntry,
} from '@/lib/storage/watchlist';
export {
  historyStore,
  recordWatch,
  removeFromHistory,
  clearHistory,
  findHistoryEntry,
  type WatchHistoryEntry,
} from '@/lib/storage/history';
export {
  recentSearchesStore,
  rememberSearch,
  forgetSearch,
  clearRecentSearches,
} from '@/lib/storage/recent-searches';
export {
  playbackPreferencesStore,
  updatePlaybackPreferences,
  DEFAULT_PLAYBACK_PREFERENCES,
  type PlaybackPreferencesState,
} from '@/lib/storage/preferences';
export { setRecordingGates, recordingAllowed, type RecordingGate } from '@/lib/storage/privacy';
export {
  syncDisplayFlags,
  DEFAULT_DISPLAY_FLAGS,
  DISPLAY_BOOT_SCRIPT,
  type DisplayFlags,
} from '@/lib/storage/display';
export {
  downloadsStore,
  recordDownload,
  forgetDownload,
  clearDownloads,
  type DownloadRecord,
} from '@/lib/storage/downloads';

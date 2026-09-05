'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentStore } from '@/hooks/usePersistentStore';
import {
  playbackPreferencesStore,
  updatePlaybackPreferences,
  type PlaybackPreferencesState,
} from '@/lib/storage';

export function usePlaybackPreferences(): {
  preferences: PlaybackPreferencesState;
  update: (patch: Partial<PlaybackPreferencesState>) => void;
} {
  const preferences = usePersistentStore(playbackPreferencesStore);
  const update = useCallback(
    (patch: Partial<PlaybackPreferencesState>) => updatePlaybackPreferences(patch),
    [],
  );

  return useMemo(() => ({ preferences, update }), [preferences, update]);
}

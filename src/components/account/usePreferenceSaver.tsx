'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { api } from '@/lib/auth/client';
import { toFailure } from '@/lib/auth/form';
import type { AccountPreferences, PreferencesResponse } from '@/lib/auth/types';

/**
 * Preference writes, applied at once and saved shortly after.
 *
 * Settings screens have no Save button because a switch that needs confirming is a
 * switch people leave in the wrong position. The cost of that choice is handled
 * here: changes land in the UI immediately, are merged into one patch, and go out
 * as a single request once the tapping stops. If the request fails the UI is put
 * back to the last state the server acknowledged — a switch left on after a failed
 * write is a lie about what is stored.
 *
 * Only the changed keys are sent. The endpoint falls back to the stored value for
 * anything absent, so a screen that shows three settings cannot reset the twelve it
 * never displayed.
 */

export type PreferencePatch = Partial<{
  appearance: AccountPreferences['appearance'];
  interfaceLanguage: string;
  timezone: string;
  playback: Partial<AccountPreferences['playback']>;
  notifications: Partial<AccountPreferences['notifications']>;
  privacy: Partial<AccountPreferences['privacy']>;
  accessibility: Partial<AccountPreferences['accessibility']>;
}>;

/** Long enough to absorb a burst of taps, short enough to survive a fast exit. */
const SETTLE_MS = 400;
const SAVED_MS = 2400;

function mergePreferences(base: AccountPreferences, patch: PreferencePatch): AccountPreferences {
  return {
    appearance: patch.appearance ?? base.appearance,
    interfaceLanguage: patch.interfaceLanguage ?? base.interfaceLanguage,
    timezone: patch.timezone ?? base.timezone,
    playback: { ...base.playback, ...patch.playback },
    notifications: { ...base.notifications, ...patch.notifications },
    privacy: { ...base.privacy, ...patch.privacy },
    accessibility: { ...base.accessibility, ...patch.accessibility },
  };
}

function mergePatch(a: PreferencePatch, b: PreferencePatch): PreferencePatch {
  const merged: PreferencePatch = { ...a, ...b };
  if (a.playback ?? b.playback) merged.playback = { ...a.playback, ...b.playback };
  if (a.notifications ?? b.notifications) merged.notifications = { ...a.notifications, ...b.notifications };
  if (a.privacy ?? b.privacy) merged.privacy = { ...a.privacy, ...b.privacy };
  if (a.accessibility ?? b.accessibility) merged.accessibility = { ...a.accessibility, ...b.accessibility };
  return merged;
}

export interface PreferenceSaver {
  preferences: AccountPreferences | null;
  save: (patch: PreferencePatch) => void;
  pending: boolean;
  saved: boolean;
  error: string;
}

export function usePreferenceSaver(): PreferenceSaver {
  const { user, setPreferences } = useAuth();
  const preferences = user?.preferences ?? null;

  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [error, setError] = useState('');

  const queued = useRef<PreferencePatch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const confirmed = useRef<AccountPreferences | null>(null);
  const mounted = useRef(true);

  // The baseline for a rollback: whatever the server last told us it holds.
  if (confirmed.current === null && preferences) confirmed.current = preferences;

  const flush = useCallback<() => Promise<void>>(async () => {
    if (inFlight.current) return;
    const patch = queued.current;
    if (!patch) return;

    queued.current = null;
    inFlight.current = true;
    if (mounted.current) {
      setPending(true);
      setError('');
    }

    try {
      const data = await api<PreferencesResponse>('/api/preferences', { method: 'PATCH', body: patch });
      confirmed.current = data.preferences;
      setPreferences(data.preferences);
      if (mounted.current) setSavedTick((tick) => tick + 1);
    } catch (cause) {
      queued.current = null;
      if (confirmed.current) setPreferences(confirmed.current);
      if (mounted.current) setError(toFailure(cause).message);
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
      if (queued.current) void flush();
    }
  }, [setPreferences]);

  // Kept in a ref so unmount can send a change that is still waiting out the
  // settle delay, rather than dropping it on a fast navigation.
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (queued.current) void flushRef.current();
    };
  }, []);

  useEffect(() => {
    if (savedTick === 0) return;
    setSaved(true);
    const handle = setTimeout(() => setSaved(false), SAVED_MS);
    return () => clearTimeout(handle);
  }, [savedTick]);

  const save = useCallback(
    (patch: PreferencePatch) => {
      const base = confirmed.current ?? preferences;
      if (!base) return;

      queued.current = queued.current ? mergePatch(queued.current, patch) : patch;
      setPreferences(mergePreferences(base, queued.current));

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, SETTLE_MS);
    },
    [preferences, setPreferences, flush],
  );

  return { preferences, save, pending, saved, error };
}

/** Shared "Saving… / Saved" line so every settings screen reports state the same way. */
export function SaveState({ pending, saved, error }: Pick<PreferenceSaver, 'pending' | 'saved' | 'error'>) {
  if (error) return null;
  return (
    <p aria-live="polite" className="min-h-4 text-xs text-mist-500">
      {pending ? 'Saving…' : saved ? 'Saved' : ''}
    </p>
  );
}

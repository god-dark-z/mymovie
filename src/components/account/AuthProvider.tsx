'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api, setCsrfToken } from '@/lib/auth/client';
import type {
  AccountPreferences,
  AuthResultBody,
  PublicUser,
  SessionResponse,
} from '@/lib/auth/types';
import { normalizeLanguageCode } from '@/lib/nxsha/languages';
import {
  playbackPreferencesStore,
  setRecordingGates,
  syncDisplayFlags,
  updatePlaybackPreferences,
  type PlaybackPreferencesState,
} from '@/lib/storage';

/**
 * Client-side account state.
 *
 * The session itself is an HttpOnly cookie, so this holds no secret — only the
 * public view of the account plus the CSRF token the API needs echoed back. State
 * is hydrated from `/api/auth/session` after mount rather than on the server,
 * which keeps the home page, My List and the 404 statically prerendered: reading
 * cookies during render would opt every page into dynamic rendering.
 *
 * The cost is one request on load, answered with a cookie read and no storage
 * round trip for a signed-out visitor.
 */

export type AuthStatus = 'loading' | 'ready' | 'unavailable';

interface AuthApi {
  status: AuthStatus;
  /** False when this deployment cannot run accounts, so sign-in is hidden. */
  configured: boolean;
  user: PublicUser | null;
  signedIn: boolean;
  refresh: () => Promise<void>;
  signIn: (input: { email: string; password: string; remember: boolean }) => Promise<PublicUser>;
  signOut: () => Promise<void>;
  /** Adopts the result of verification or a password reset, both of which sign in. */
  adopt: (result: AuthResultBody) => void;
  /** Replaces the cached user after a profile or preference change. */
  setUser: (user: PublicUser) => void;
  setPreferences: (preferences: AccountPreferences) => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [configured, setConfigured] = useState(true);
  const [user, setUserState] = useState<PublicUser | null>(null);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await api<SessionResponse>('/api/auth/session');
      setConfigured(data.configured);
      setCsrfToken(data.csrfToken);
      setUserState(data.user);
      setStatus(data.configured ? 'ready' : 'unavailable');
    } catch (error) {
      // A failed session read must not block the rest of the app: browsing works
      // without an account, so this degrades to signed-out.
      setUserState(null);
      setStatus(error instanceof ApiError && error.isUnavailable ? 'unavailable' : 'ready');
    }
  }, []);

  useEffect(() => {
    // Guarded against the double invocation of Strict Mode in development.
    if (loaded.current) return;
    loaded.current = true;
    void load();
  }, [load]);

  const signIn = useCallback(async (input: { email: string; password: string; remember: boolean }) => {
    const result = await api<AuthResultBody>('/api/auth/login', { method: 'POST', body: input });
    setCsrfToken(result.csrfToken);
    setUserState(result.user);
    setStatus('ready');
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api<{ ok: true }>('/api/auth/logout', { method: 'POST' });
    } finally {
      // Cleared even if the request failed: the alternative is a UI that claims
      // someone is signed in when they have asked not to be.
      setUserState(null);
    }
  }, []);

  const adopt = useCallback((result: AuthResultBody) => {
    setCsrfToken(result.csrfToken);
    setUserState(result.user);
    setStatus('ready');
  }, []);

  const setUser = useCallback((next: PublicUser) => setUserState(next), []);

  const setPreferences = useCallback((preferences: AccountPreferences) => {
    setUserState((current) => (current ? { ...current, preferences } : current));
  }, []);

  // Appearance and accessibility choices are applied as attributes on <html> so one
  // CSS rule can honour them everywhere, including inside the player shell. The
  // same effect pushes the account's privacy and playback choices into the
  // device-local stores, which is where the rest of the app reads them from.
  useEffect(() => {
    const prefs = user?.preferences;

    // Nothing is touched while the session is still resolving: the boot script has
    // already applied what this device saw last time, and clearing that here would
    // reintroduce the flash it exists to prevent. Once resolved the account is
    // authoritative — including when it says signed out, which restores the default
    // look rather than leaving one reader's theme behind on a shared device.
    if (status !== 'loading') {
      syncDisplayFlags(prefs ? { appearance: prefs.appearance, ...prefs.accessibility } : null);
    }

    // Recording gates. Absence means allowed, so signing out restores the
    // behaviour a visitor without an account has always had.
    setRecordingGates({
      searchHistory: prefs?.privacy.storeSearchHistory !== false,
      watchHistory: prefs?.privacy.storeWatchHistory !== false,
    });

    // Playback languages are adopted only where this device has made no choice of
    // its own: an account default should furnish a new device, not overrule the
    // picker on one that has already been set.
    if (!prefs) return;
    const local = playbackPreferencesStore.get();
    const patch: Partial<PlaybackPreferencesState> = {};
    const audio = normalizeLanguageCode(prefs.playback.preferredAudio);
    const subtitle = normalizeLanguageCode(prefs.playback.preferredSubtitle);
    if (local.language === null && audio) patch.language = audio;
    if (local.subtitle === null && subtitle) patch.subtitle = subtitle;
    if (Object.keys(patch).length > 0) updatePlaybackPreferences(patch);
  }, [status, user?.preferences]);

  const value = useMemo<AuthApi>(
    () => ({
      status,
      configured,
      user,
      signedIn: user !== null,
      refresh: load,
      signIn,
      signOut,
      adopt,
      setUser,
      setPreferences,
    }),
    [status, configured, user, load, signIn, signOut, adopt, setUser, setPreferences],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

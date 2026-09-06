import type { PreferencesResponse } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { logEvent, requireAuth } from '@/server/auth/session';
import type { AccountPreferences, Appearance, MediaQuality } from '@/server/data/types';
import { users } from '@/server/data/users';
import { assertMutationAllowed, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';

/**
 * Account preferences.
 *
 * A partial patch: every field falls back to what is already stored, so a screen
 * that only knows about notifications can send only notifications without
 * silently resetting playback settings it never displayed.
 *
 * Preferences are read by the client on every load, which is why the whole object
 * comes back — the caller never has to reconstruct what the server decided.
 */
export const dynamic = 'force-dynamic';

const APPEARANCES = ['dark', 'midnight'] as const satisfies readonly Appearance[];
const QUALITIES = ['auto', '480p', '720p', '1080p'] as const satisfies readonly MediaQuality[];

/** `en`, `pt-BR`, `zh-Hant`. Deliberately narrow: this value reaches `Intl`. */
const LANGUAGE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/;

function isKnownTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Absent leaves it alone; `null` or `''` clears it back to "let the source decide". */
function optionalLanguage(fields: Fields, name: string, current: string | null): string | null {
  const value = fields.optionalString(name, { max: 12, label: 'Language' });
  if (value === undefined) return current;
  if (value === '') return null;
  if (!LANGUAGE_RE.test(value)) {
    fields.reject(name, 'That is not a language code we recognise.');
    return current;
  }
  return value;
}

export const GET = route('preferences/read', async () => {
  const { user } = await requireAuth();
  return jsonOk<PreferencesResponse>({ preferences: user.preferences });
});

export const PATCH = route('preferences/update', async (request) => {
  await assertMutationAllowed(request);
  const { user } = await requireAuth();
  await enforce(RATE_LIMITS.profile, user.id);

  const current = user.preferences;
  const fields = new Fields(await readJson(request));

  const timezone = fields.optionalString('timezone', { max: 64, label: 'Time zone' });
  if (timezone !== undefined && timezone !== '' && !isKnownTimeZone(timezone)) {
    fields.reject('timezone', 'That time zone is not recognised.');
  }

  const interfaceLanguage = optionalLanguage(fields, 'interfaceLanguage', current.interfaceLanguage);

  const playback = fields.group('playback');
  const notifications = fields.group('notifications');
  const privacy = fields.group('privacy');
  const accessibility = fields.group('accessibility');

  const next: AccountPreferences = {
    appearance: fields.oneOf('appearance', APPEARANCES, current.appearance),
    interfaceLanguage: interfaceLanguage ?? current.interfaceLanguage,
    timezone: timezone && isKnownTimeZone(timezone) ? timezone : current.timezone,
    playback: {
      autoplayNext: playback.boolean('autoplayNext', current.playback.autoplayNext),
      preferredAudio: optionalLanguage(playback, 'preferredAudio', current.playback.preferredAudio),
      preferredSubtitle: optionalLanguage(playback, 'preferredSubtitle', current.playback.preferredSubtitle),
      preferredQuality: playback.oneOf('preferredQuality', QUALITIES, current.playback.preferredQuality),
    },
    notifications: {
      accountActivity: notifications.boolean('accountActivity', current.notifications.accountActivity),
      productUpdates: notifications.boolean('productUpdates', current.notifications.productUpdates),
      emailAnnouncements: notifications.boolean('emailAnnouncements', current.notifications.emailAnnouncements),
    },
    privacy: {
      personalization: privacy.boolean('personalization', current.privacy.personalization),
      storeSearchHistory: privacy.boolean('storeSearchHistory', current.privacy.storeSearchHistory),
      storeWatchHistory: privacy.boolean('storeWatchHistory', current.privacy.storeWatchHistory),
    },
    accessibility: {
      reduceMotion: accessibility.boolean('reduceMotion', current.accessibility.reduceMotion),
      reduceTransparency: accessibility.boolean('reduceTransparency', current.accessibility.reduceTransparency),
      largerText: accessibility.boolean('largerText', current.accessibility.largerText),
      highContrast: accessibility.boolean('highContrast', current.accessibility.highContrast),
    },
  };

  fields.assert();

  const updated = await users.update(user.id, { preferences: next });
  const saved = updated?.preferences ?? next;

  // Logged without naming the setting: which options someone toggled is not
  // security-relevant, and the log is meant to stay readable.
  if (JSON.stringify(saved) !== JSON.stringify(current)) {
    await logEvent({ userId: user.id, type: 'preferences.updated', request });
  }

  return jsonOk<PreferencesResponse>({ preferences: saved });
});

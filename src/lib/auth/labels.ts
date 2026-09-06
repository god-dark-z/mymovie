import type { SecurityEventType } from '@/server/data/types';

/**
 * Wording shared by the security log, the account overview and the data export.
 *
 * Kept in one place because these strings are the user's only window onto what the
 * system recorded about them, and three screens describing the same event three
 * ways would read as three different events.
 */

export const EVENT_LABELS: Record<SecurityEventType, string> = {
  'account.created': 'Account created',
  'account.deleted': 'Account deleted',
  'email.verified': 'Email confirmed',
  'email.verification-sent': 'Confirmation email sent',
  'login.success': 'Signed in',
  'login.failed': 'Failed sign-in attempt',
  logout: 'Signed out',
  'password.changed': 'Password changed',
  'password.reset': 'Password reset completed',
  'password.reset-requested': 'Password reset requested',
  'profile.updated': 'Profile updated',
  'preferences.updated': 'Preferences updated',
  'session.revoked': 'Device signed out',
  'sessions.revoked-others': 'Other devices signed out',
  'download.authorized': 'Download authorised',
};

/** Events worth drawing attention to when they were not expected. */
export const NOTABLE_EVENTS: ReadonlySet<SecurityEventType> = new Set<SecurityEventType>([
  'login.failed',
  'password.changed',
  'password.reset',
  'password.reset-requested',
  'session.revoked',
  'sessions.revoked-others',
]);

/**
 * Formats a moment in the account's own time zone.
 *
 * A stored zone can become invalid — the IANA database drops entries — and `Intl`
 * throws rather than falling back, so the browser's zone is used if that happens.
 */
export function formatMoment(at: number, timeZone?: string): string {
  return format(at, timeZone, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(at: number, timeZone?: string): string {
  return format(at, timeZone, { day: 'numeric', month: 'long', year: 'numeric' });
}

function format(at: number, timeZone: string | undefined, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  if (timeZone) {
    try {
      return date.toLocaleString('en-GB', { ...options, timeZone });
    } catch {
      // Falls through to the browser's own zone.
    }
  }
  return date.toLocaleString('en-GB', options);
}

/**
 * Presentation helpers. These only format values that the metadata provider
 * actually returned — nothing is invented or estimated.
 */

/** `"148 min"` -> `"2h 28m"`. Returns null when no usable runtime exists. */
export function formatRuntime(runtime?: string | number | null): string | null {
  if (runtime === null || runtime === undefined) return null;
  const minutes =
    typeof runtime === 'number' ? runtime : Number.parseInt(String(runtime).replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** Formats a rating as a single decimal, e.g. `8.8`. */
export function formatRating(rating?: number | null): string | null {
  if (rating === null || rating === undefined || !Number.isFinite(rating) || rating <= 0) return null;
  return rating.toFixed(1);
}

/** ISO date -> `"21 Jan 2008"`. */
export function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** ISO date -> `"Jan 2008"`, used in dense episode rows. */
export function formatShortDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isFutureDate(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

/** `S1 · E4` label used across episode UI. */
export function episodeLabel(season: number, episode: number): string {
  if (season === 0) return `Special ${episode}`;
  return `S${season} E${episode}`;
}

export function seasonLabel(season: number): string {
  return season === 0 ? 'Specials' : `Season ${season}`;
}

/** Clamps long provider descriptions without cutting mid-word. */
export function truncate(text: string | undefined | null, max: number): string {
  if (!text) return '';
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).replace(/[,.;:\s]+$/, '')}…`;
}

/** Human-readable relative time for the "recently watched" rail. */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) {
    const value = Math.round(diff / minute);
    return `${value}m ago`;
  }
  if (diff < day) {
    const value = Math.round(diff / hour);
    return `${value}h ago`;
  }
  if (diff < 7 * day) {
    const value = Math.round(diff / day);
    return value <= 1 ? 'Yesterday' : `${value}d ago`;
  }
  return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function joinNonEmpty(values: Array<string | null | undefined>, separator = ' · '): string {
  return values.filter((value): value is string => Boolean(value && value.trim())).join(separator);
}

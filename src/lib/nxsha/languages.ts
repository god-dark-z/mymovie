/**
 * Language options offered as *playback preferences*.
 *
 * Nxsha documents `?lang=<ISO 639-1>` (preferred audio) and `?sub=<ISO 639-1>`
 * (preferred subtitle track). There is no documented API for asking which tracks
 * a specific title actually carries, so Cineora presents these as requests, and
 * says so in the UI. The player's own menu remains the source of truth for what
 * exists on a given source.
 */

export interface LanguageOption {
  /** ISO 639-1 code, exactly what Nxsha documents. */
  code: string;
  label: string;
  /** Endonym, shown as a secondary line. */
  native: string;
}

/** Valid ISO 639-1 codes. Nxsha's docs call out en, es, hi and fr explicitly. */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'ko', label: 'Korean', native: '한국어' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'th', label: 'Thai', native: 'ไทย' },
  { code: 'pl', label: 'Polish', native: 'Polski' },
];

const LANGUAGE_BY_CODE = new Map(LANGUAGE_OPTIONS.map((option) => [option.code, option]));

const ISO_639_1 = /^[a-z]{2}$/;

/** Returns the code only when it is a valid ISO 639-1 value we offer. */
export function normalizeLanguageCode(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const lower = code.trim().toLowerCase();
  if (!ISO_639_1.test(lower)) return undefined;
  return LANGUAGE_BY_CODE.has(lower) ? lower : undefined;
}

export function languageLabel(code: string | null | undefined): string | null {
  const normalized = normalizeLanguageCode(code);
  if (!normalized) return null;
  return LANGUAGE_BY_CODE.get(normalized)?.label ?? null;
}

export function languageOption(code: string | null | undefined): LanguageOption | null {
  const normalized = normalizeLanguageCode(code);
  if (!normalized) return null;
  return LANGUAGE_BY_CODE.get(normalized) ?? null;
}

/**
 * Anime is overwhelmingly Japanese audio with subtitles, so the anime watch page
 * surfaces this shortlist first. It is an ordering hint for the picker, not a
 * claim about a specific title.
 */
export const ANIME_PRIORITY_LANGUAGES = ['ja', 'en', 'hi', 'es', 'pt'];

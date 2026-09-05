/**
 * CINEORA brand geometry.
 *
 * Original artwork, drawn from scratch on two grids:
 *
 *  - the mark is a 64x64 aperture: an outer ring broken at the upper right
 *    (camera iris), a short inner counter-arc at the lower left, and a play
 *    glyph in the negative space
 *  - the wordmark is a 550x100 monoline construction with a 68-unit cap height
 *    and 22 units of ink-to-ink tracking; the O is the same broken ring as the
 *    mark, which is the signature that ties the two together
 *
 * Plain data with no imports, because both the React components and
 * `scripts/generate-icons.mjs` (plain Node) read from this one file.
 */

/* -- Mark, 64 x 64 -------------------------------------------------------- */

export const MARK_VIEWBOX = '0 0 64 64';

/** Outer iris ring, 320 degrees, opening centred on the upper-right diagonal. */
export const MARK_RING = 'M42.57 9.34 A25 25 0 1 0 54.66 21.43';
export const MARK_RING_WIDTH = 5;

/** Inner iris blade, held in the clear band left of the play glyph. */
export const MARK_ARC = 'M17.44 26.7 A15.5 15.5 0 0 0 17.95 38.55';
export const MARK_ARC_WIDTH = 2.5;

/** Play glyph, optically centred (a triangle's mass sits left of its bounds). */
export const MARK_PLAY = 'M25.5 22.5 L44.5 32 L25.5 41.5 Z';
export const MARK_PLAY_WIDTH = 3;

/* -- Wordmark, 538 x 100 -------------------------------------------------- */

export const WORDMARK_VIEWBOX = '0 0 538 100';
export const WORDMARK_STROKE = 9;
/** Ink extent, needed by anything that scales the wordmark to a target width. */
export const WORDMARK_INK_WIDTH = 528;

/**
 * C I N E · R A — the O is drawn separately so it can carry the accent.
 *
 * Sidebearings are optically corrected, not metric: gaps beside the open-sided
 * C, O and A are pulled in so they read the same as the flat-sided pairs.
 */
export const WORDMARK_LETTERS = [
  'M68.77 27.25 A34 34 0 1 0 68.77 72.75',
  'M93.5 16 V84',
  'M124.5 84 V16 L182.5 84 V16',
  'M266.5 16 H214.5 V84 H266.5 M214.5 50 H258.5',
  'M392.5 84 V16 H422.5 A20.5 20.5 0 0 1 422.5 57 H392.5 M419.5 57 L444 84',
  'M470.5 84 L499.5 16 L528.5 84 M482 57 H517',
].join(' ');

/** The O: the mark's broken ring, scaled to the cap height. */
export const WORDMARK_APERTURE = 'M345.46 19.98 A34 34 0 1 0 359.52 34.04';

/* -- Palette used by both ------------------------------------------------- */

export const BRAND_INK = '#05060a';
export const BRAND_RUBY = '#d4213d';

/** Brushed silver falling into ruby, on the mark's own diagonal. */
export const BRAND_SWEEP = [
  { offset: '0%', color: '#ffffff' },
  { offset: '30%', color: '#cfd4de' },
  { offset: '62%', color: '#f4506a' },
  { offset: '100%', color: '#b0142c' },
] as const;

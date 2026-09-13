/**
 * Deterministic content rotation for presentation rails.
 *
 * The catalogue's popular lists barely change hour to hour, so a home page built
 * straight from them reads as frozen. This shifts a list by a bucket derived from
 * the wall clock: every `intervalMs` (default 90 minutes) the whole ordering
 * steps by one, so content rotates naturally without randomness, without fake
 * data, and without a single extra API call — the same cached fetch, re-ordered.
 *
 * Deterministic matters twice over: every visitor sees the same rotation (it is
 * curation, not shuffle), and server renders inside the same bucket agree with
 * each other, which keeps the ISR'd home page coherent.
 */
export function rotatePeriodic<T>(items: readonly T[], intervalMs = 90 * 60 * 1000): T[] {
  if (items.length < 2) return [...items];
  const bucket = Math.floor(Date.now() / intervalMs);
  const shift = bucket % items.length;
  return [...items.slice(shift), ...items.slice(0, shift)];
}

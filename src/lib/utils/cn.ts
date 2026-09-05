/**
 * Tiny class-name joiner. Falsy values are dropped, so conditional classes can be
 * written inline without a helper library.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  let out = '';
  for (const value of values) {
    if (!value) continue;
    out = out ? `${out} ${value}` : value;
  }
  return out;
}

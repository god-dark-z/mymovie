/**
 * Artwork helpers for the public metahub image CDN.
 *
 * Cinemeta hands back `poster/small` URLs. Requesting a larger variant for hero
 * artwork keeps big surfaces sharp, while cards stay on the small variant so a
 * rail of 20 posters does not pull megabytes.
 */

const METAHUB_HOST = 'images.metahub.space';

type PosterSize = 'small' | 'medium' | 'large';

export function posterUrl(url: string | undefined, size: PosterSize = 'small'): string | undefined {
  if (!url) return undefined;
  if (!url.includes(METAHUB_HOST)) return url;
  return url.replace(/\/poster\/(small|medium|large)\//, `/poster/${size}/`);
}

export function backdropUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url;
}

/**
 * Blur-up placeholders in the app's ink palette.
 *
 * Inlined as literals rather than built with `Buffer` so client components can
 * import them without pulling a Node polyfill into the browser bundle.
 */
export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjEyIj48cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSIxMiIgZmlsbD0iIzBkMGQxNCIvPjwvc3ZnPg==';

export const BLUR_DATA_URL_WIDE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSI5Ij48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iOSIgZmlsbD0iIzBhMGIxMSIvPjwvc3ZnPg==';

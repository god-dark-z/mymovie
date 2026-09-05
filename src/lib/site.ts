/**
 * Single source of truth for brand strings and canonical URLs, used by page
 * metadata, the manifest, the sitemap and JSON-LD.
 *
 * `NEXT_PUBLIC_SITE_URL` is the only deployment-specific value, and it is a
 * public URL rather than a secret. Netlify and Vercel both publish the deploy's
 * own address as a build variable, so a normal deploy needs no configuration at
 * all — set `NEXT_PUBLIC_SITE_URL` only to pin a custom domain.
 */
const FALLBACK_URL = 'http://localhost:3000';

/** Trims trailing slashes and adds the scheme these hosts leave off. */
function normalise(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return normalise(explicit);

  // Netlify: `URL` is the site's production address, `DEPLOY_PRIME_URL` the
  // address of this particular branch or preview deploy. Preferring the former
  // keeps canonical tags and the sitemap pointing at production even when a
  // preview is what built them.
  const netlify = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  if (netlify) return normalise(netlify);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return normalise(vercel);

  return FALLBACK_URL;
}

export const SITE = {
  name: 'Cineora',
  tagline: 'Cinema, beautifully organised',
  description:
    'Discover and watch movies, series and anime in one cinematic place. Search a vast public catalogue, browse by genre, and pick your playback server, language and subtitles.',
  url: siteUrl(),
  ogImage: '/og.png',
  locale: 'en_US',
  themeColor: '#05060a',
} as const;

/** Absolute URL for canonical tags, OG images and sitemap entries. */
export function absoluteUrl(path: string): string {
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

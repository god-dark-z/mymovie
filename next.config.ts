import type { NextConfig } from 'next';

/**
 * Hosts the browser is allowed to reach, kept beside the image allowlist below so the
 * two cannot drift apart. Everything else a page needs is same-origin.
 */
const ARTWORK_HOSTS = [
  'https://images.metahub.space',
  'https://episodes.metahub.space',
  'https://live.metahub.space',
  'https://m.media-amazon.com',
] as const;

/**
 * The playback provider's origin, read from the same variable the provider itself
 * uses (`src/lib/nxsha/provider.ts`). Subdomains are allowed as well, because an
 * embed that redirects to a node hostname must not be broken by our own policy.
 */
function playerFrameSources(): string[] {
  const configured = (process.env.NEXT_PUBLIC_NXSHA_ORIGIN ?? 'https://nxsha.space').replace(/\/+$/, '');
  try {
    const { protocol, host, hostname } = new URL(configured);
    const parts = hostname.split('.');
    const registrable = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
    return [`${protocol}//${host}`, `${protocol}//*.${registrable}`];
  } catch {
    return ['https://nxsha.space', 'https://*.nxsha.space'];
  }
}

/**
 * Content Security Policy.
 *
 * `default-src 'self'` is the backstop rather than `'none'`. This app has no nonce
 * pipeline — introducing one would force every page to render per-request — so the
 * policy's real job is to stop a page reaching *other* origins, and for that goal a
 * missed fetch directive falling back to same-origin is the right failure mode.
 *
 * Two allowances cost something, and it is better to name them than to imply the
 * policy is stricter than it is:
 *
 *   - `script-src 'unsafe-inline'` — Next's hydration payload and the pre-paint
 *     appearance script are inline. Without per-request nonces they cannot be allowed
 *     individually, and making every page dynamic to obtain nonces would be a worse
 *     trade than this directive is worth.
 *   - `style-src 'unsafe-inline'` — React `style` attributes, which the glass surfaces
 *     and the sheet's drag transform rely on.
 *
 * What matters for injection is still shut: no external script origin, no plugins, no
 * `<base>` rewriting, no framing of this app, and a form can only post to this origin.
 */
function contentSecurityPolicy(dev: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'none'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    // `unsafe-eval` is React Refresh under `next dev`, and never in a build.
    'script-src': dev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    // `blob:` covers a locally previewed avatar before it is uploaded.
    'img-src': ["'self'", 'data:', 'blob:', ...ARTWORK_HOSTS],
    'font-src': ["'self'"],
    // The dev server's HMR socket, and nothing else off-origin.
    'connect-src': dev ? ["'self'", 'ws:', 'wss:'] : ["'self'"],
    'frame-src': playerFrameSources(),
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  // Pointless over http://localhost, and it would rewrite the dev HMR socket.
  if (!dev) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

/** Applied to every response, HTML and API alike. */
function baselineHeaders(dev: boolean) {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(dev) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    // Deliberately absent: autoplay, fullscreen, picture-in-picture, encrypted-media.
    // The player iframe is delegated those through its documented `allow` attribute,
    // and denying them at the document level would break playback.
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), display-capture=()',
    },
    // Browsers ignore this over plain http, so a dev server pays nothing for it. No
    // `preload`: submitting a domain to the preload list is an operator's decision,
    // not a side effect of a framework config.
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  ];
}

/**
 * Pages a shared cache must never hold.
 *
 * These screens hydrate client-side, so their HTML carries no personal data today.
 * This is what keeps that true if it ever changes, and what stops one reader's page
 * being served to another. API responses set their own private headers in
 * `src/server/http/respond.ts` and are left alone here.
 *
 * `Cache-Control` is the whole protection, deliberately. A `Vary: Cookie` used to sit
 * beside it and never arrived: the App Router overwrites `Vary` on page responses with
 * its own router list (`rsc, next-router-state-tree, …, Accept-Encoding`), so the
 * directive was config that read like a control while doing nothing. `no-store` is the
 * stronger statement anyway — it forbids storing the response at all, which makes
 * cache-key correctness moot. Route handlers do keep their own `Vary`, and
 * `respond.ts` sets `Vary: Cookie` there, where it survives.
 */
const PRIVATE_PAGES = ['/account', '/account/:path*', '/login', '/signup', '/welcome', '/forgot-password'] as const;

/** Pages reached with a one-time token in the URL. */
const TOKEN_PAGES = ['/verify-email', '/reset-password'] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Metadata artwork comes from the public Stremio/Cinemeta image CDN, and
    // Cinemeta's search results additionally hand back IMDb's own artwork host —
    // most search posters live there, so it has to be allowlisted or the
    // optimizer refuses them. The path is scoped so this stays an artwork
    // allowlist rather than an open image proxy.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.metahub.space' },
      { protocol: 'https', hostname: 'episodes.metahub.space' },
      { protocol: 'https', hostname: 'live.metahub.space' },
      { protocol: 'https', hostname: 'm.media-amazon.com', pathname: '/images/**' },
    ],
    deviceSizes: [360, 414, 640, 828, 1080, 1280, 1920, 2560],
    imageSizes: [96, 128, 180, 240, 320, 420, 640],
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    optimizePackageImports: [],
  },
  async headers() {
    const dev = process.env.NODE_ENV !== 'production';

    return [
      { source: '/(.*)', headers: baselineHeaders(dev) },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
      ...PRIVATE_PAGES.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'private, no-store, must-revalidate' }],
      })),
      ...TOKEN_PAGES.map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, must-revalidate' },
          // The token is in the query string, so nothing about this URL leaves the
          // origin — not even the origin on its own.
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      })),
    ];
  },
};

export default nextConfig;

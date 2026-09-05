import type { NextConfig } from 'next';

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
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ];
  },
};

export default nextConfig;

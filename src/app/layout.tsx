import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import { SearchProvider } from '@/components/search/SearchProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { SITE } from '@/lib/site';
import '@/app/globals.css';

/**
 * Sora carries the wordmark's geometry into headings; Plus Jakarta Sans is the
 * reading face. Both are self-hosted by `next/font`, so there is no request to
 * Google at runtime and no layout shift while they load.
 */
const display = Sora({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-sora',
  preload: true,
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jakarta',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: `${SITE.name} — ${SITE.tagline}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Content must reach under the status bar and gesture bar for the WebView
  // build; `env(safe-area-inset-*)` then does the actual protecting.
  viewportFit: 'cover',
  themeColor: '#05060a',
  colorScheme: 'dark',
  // Zoom stays available — disabling it would fail WCAG 1.4.4.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-[calc(env(safe-area-inset-top,0px)+0.75rem)] focus-visible:left-1/2 focus-visible:z-100 focus-visible:-translate-x-1/2 focus-visible:rounded-full focus-visible:bg-ink-800 focus-visible:px-4 focus-visible:py-2.5 focus-visible:font-display focus-visible:text-sm focus-visible:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>
          <SearchProvider>{children}</SearchProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

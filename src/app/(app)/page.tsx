import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ContinueWatchingRail } from '@/components/home/ContinueWatchingRail';
import { Hero } from '@/components/home/Hero';
import { MediaRail } from '@/components/home/MediaRail';
import { JsonLd } from '@/components/seo/JsonLd';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeroSkeleton, RailSkeleton } from '@/components/ui/Skeleton';
import { metadata as metadataManager } from '@/lib/metadata/manager';
import { HOME_RAILS } from '@/lib/metadata/rails';
import { websiteStructuredData } from '@/lib/seo/structured-data';
import { SITE } from '@/lib/site';
import type { MediaSummary } from '@/types/media';

// The catalog is a public, slow-moving dataset — an hour-old home page is fine
// and keeps the provider from being hammered.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: '/' },
};

const HERO_COUNT = 5;

export default function HomePage() {
  return (
    <div className="animate-fade-in pb-shell">
      <JsonLd data={websiteStructuredData()} />
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      <div className="relative z-10 -mt-4 flex flex-col gap-9 pt-2 md:-mt-8 md:gap-12">
        <ContinueWatchingRail />

        {HOME_RAILS.map((rail, index) => (
          <Suspense key={rail.id} fallback={<RailSkeleton />}>
            <MediaRail rail={rail} priority={index === 0} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}

/**
 * Hero titles come from the same trending catalogs as the first rails, preferring
 * entries that actually have wide artwork — a backdrop-less hero falls back to a
 * typographic plate, which reads as a broken page at full-bleed size.
 */
async function HeroSection() {
  const [movies, series] = await Promise.all([
    metadataManager.getCatalog({ namespace: 'movie', sort: 'popular', excludeAnime: true, limit: 12 }),
    metadataManager.getCatalog({ namespace: 'series', sort: 'popular', excludeAnime: true, limit: 12 }),
  ]);

  if (movies.degraded && series.degraded) {
    return (
      <div className="pt-shell gutter-x">
        <ErrorState kind="metadata" />
      </div>
    );
  }

  const pool = interleave(movies.data, series.data);
  const withArtwork = pool.filter((item) => Boolean(item.backdrop));
  const items = (withArtwork.length > 0 ? withArtwork : pool).slice(0, HERO_COUNT);

  if (items.length === 0) return null;

  return <Hero items={items} />;
}

/** Alternates movies and series so the hero is never five films in a row. */
function interleave(a: MediaSummary[], b: MediaSummary[]): MediaSummary[] {
  const out: MediaSummary[] = [];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index]) out.push(a[index]);
    if (b[index]) out.push(b[index]);
  }
  return out;
}

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { detailHref, kindLabel } from '@/lib/metadata/classify';
import { metadata as metadataManager } from '@/lib/metadata/manager';
import { SITE } from '@/lib/site';
import { joinNonEmpty, truncate } from '@/lib/utils/format';
import type { MediaDetail, MediaKind } from '@/types/media';

/**
 * Shared loading and SEO for the three title routes.
 *
 * A title is addressed by its canonical id, so `/movie/tt0903747` and
 * `/tv/tt0903747` can both be typed by hand or arrive from an old link. Rather
 * than rendering a series under the movie route, the resolved kind wins and the
 * request is redirected to the canonical URL — one page per title, which also
 * keeps the canonical tag and the sitemap consistent.
 */
export async function loadTitle(kind: MediaKind, rawId: string): Promise<MediaDetail> {
  const id = decodeURIComponent(rawId).trim();
  if (!id) notFound();

  const { data } = await metadataManager.getTitle(kind, id);
  if (!data) notFound();

  if (data.kind !== kind) redirect(detailHref(data.kind, data.id));
  // A stale or non-canonical id (e.g. a different case) also gets one URL.
  if (data.id !== id) redirect(detailHref(data.kind, data.id));

  return data;
}

export function titleMetadata(detail: MediaDetail): Metadata {
  const context = joinNonEmpty([
    kindLabel(detail.kind, detail.isAnime),
    detail.releaseInfo ?? detail.year,
  ]);
  const title = `${detail.title}${context ? ` (${context})` : ''}`;
  const description = detail.overview
    ? truncate(detail.overview, 200)
    : `Watch ${detail.title} on ${SITE.name}. Pick your playback server, audio language and subtitles.`;

  const image = detail.backdrop ?? detail.poster;
  const canonical = detailHref(detail.kind, detail.id);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: detail.kind === 'movie' ? 'video.movie' : 'video.tv_show',
      title,
      description,
      url: canonical,
      siteName: SITE.name,
      images: image ? [{ url: image, alt: detail.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

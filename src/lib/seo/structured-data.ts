import { SITE, absoluteUrl } from '@/lib/site';
import { detailHref } from '@/lib/metadata/classify';
import type { MediaDetail } from '@/types/media';

/**
 * Structured data builders.
 *
 * Every field here comes from the normalized provider payload. Nothing is inferred
 * or padded out: a missing date, rating or cast list is simply absent, because
 * invented structured data is worse than none at all.
 */
type Json = Record<string, unknown>;

/** Site-level entity plus the search action, emitted once on the home page. */
export function websiteStructuredData(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    alternateName: `${SITE.name} — ${SITE.tagline}`,
    url: SITE.url,
    description: SITE.description,
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** `Movie` or `TVSeries` for a detail page. */
export function titleStructuredData(detail: MediaDetail): Json {
  const isSeries = detail.kind !== 'movie';
  const url = absoluteUrl(detailHref(detail.kind, detail.id));

  const data: Json = {
    '@context': 'https://schema.org',
    '@type': isSeries ? 'TVSeries' : 'Movie',
    name: detail.title,
    url,
  };

  if (detail.overview) data.description = detail.overview;
  if (detail.poster) data.image = detail.poster;
  if (detail.genres.length > 0) data.genre = detail.genres;
  if (detail.alternativeTitles.length > 0) data.alternateName = detail.alternativeTitles.slice(0, 4);
  if (detail.originalTitle && detail.originalTitle !== detail.title) {
    data.alternateName = data.alternateName ?? detail.originalTitle;
  }
  if (detail.imdbUrl) data.sameAs = detail.imdbUrl;

  const published = isoDate(detail.releaseDate) ?? isoYear(detail.year);
  if (published) data.datePublished = published;

  if (isSeries && detail.seasons.length > 0) data.numberOfSeasons = detail.seasons.length;
  if (isSeries && detail.episodes.length > 0) data.numberOfEpisodes = detail.episodes.length;

  const people = [
    ...toPeople('actor', detail.cast.slice(0, 8)),
    ...toPeople('director', detail.directors.slice(0, 3)),
    ...toPeople('creator', detail.creators.slice(0, 3)),
  ];
  for (const [key, value] of people) {
    const existing = (data[key] as Json[] | undefined) ?? [];
    data[key] = [...existing, value];
  }

  if (typeof detail.rating === 'number' && detail.rating > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: detail.rating,
      bestRating: 10,
      worstRating: 1,
    };
  }

  return data;
}

function toPeople(key: 'actor' | 'director' | 'creator', names: string[]): Array<[string, Json]> {
  return names.map((name) => [key, { '@type': 'Person', name }]);
}

/** Keeps only a real ISO date; the provider is not consistent about this field. */
function isoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return match ? match[0] : undefined;
}

/** `2008` or `2008–2013` both publish as the first year. */
function isoYear(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^\d{4}/.exec(value);
  return match ? match[0] : undefined;
}

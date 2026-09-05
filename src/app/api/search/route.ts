import { NextResponse } from 'next/server';
import { metadata } from '@/lib/metadata/manager';
import type { MediaSummary, SearchResults } from '@/types/media';

/**
 * Search endpoint used by the overlay and the /search page.
 *
 * The provider call happens here, server-side, so it benefits from the shared
 * fetch cache and never exposes provider URLs or errors to the browser. The
 * response is trimmed to what a result row actually renders — a rail of 40
 * summaries with full overviews is a lot of bytes to send to a phone.
 */
const MIN_LENGTH = 2;
const MAX_PER_GROUP = 24;

function trim(item: MediaSummary): MediaSummary {
  return {
    id: item.id,
    ids: { imdbId: item.ids.imdbId, tmdbId: item.ids.tmdbId },
    kind: item.kind,
    isAnime: item.isAnime,
    title: item.title,
    year: item.year,
    releaseInfo: item.releaseInfo,
    poster: item.poster,
    rating: item.rating,
    genres: item.genres.slice(0, 2),
  };
}

const EMPTY = (query: string): SearchResults => ({ query, movies: [], tv: [], anime: [], total: 0 });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);

  if (query.length < MIN_LENGTH) {
    return NextResponse.json({ results: EMPTY(query), degraded: false });
  }

  try {
    const { data, degraded } = await metadata.search({ query, limit: 40 });
    const results: SearchResults = {
      query,
      movies: data.movies.slice(0, MAX_PER_GROUP).map(trim),
      tv: data.tv.slice(0, MAX_PER_GROUP).map(trim),
      anime: data.anime.slice(0, MAX_PER_GROUP).map(trim),
      total: data.total,
    };

    return NextResponse.json(
      { results, degraded },
      { headers: { 'Cache-Control': 'private, max-age=120' } },
    );
  } catch {
    // The manager already swallows provider faults; this only fires on a bug.
    return NextResponse.json({ results: EMPTY(query), degraded: true }, { status: 200 });
  }
}

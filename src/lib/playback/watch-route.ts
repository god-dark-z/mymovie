import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { metadata as metadataManager } from '@/lib/metadata/manager';
import {
  episodeByAbsoluteNumber,
  findEpisode,
  firstAiredEpisode,
  isAddressable,
  isPlayable,
  nextEpisodeAfter,
  previousEpisodeBefore,
} from '@/lib/playback/availability';
import { parseSegmentNumber, watchHref, type EpisodeRef } from '@/lib/playback/routes';
import type { PlaybackBlockReason } from '@/lib/playback/types';
import { SITE } from '@/lib/site';
import { episodeLabel, truncate } from '@/lib/utils/format';
import type { Episode, MediaDetail, MediaKind } from '@/types/media';

/**
 * Shared resolution and SEO for the watch routes.
 *
 * Two rules drive everything here:
 *
 *  1. The episode we play is resolved against the provider's real episode list —
 *     never by assuming season 1, and never by trusting numbers in the URL when
 *     the catalogue disagrees. A URL that cannot be resolved is redirected to one
 *     that can, so the address bar always states what is actually playing.
 *  2. The documented embed endpoint takes a 1-based episode, so an episode that
 *     has no representable URL is not offered at all.
 */
export interface WatchContext {
  detail: MediaDetail;
  /**
   * What the provider is asked to play. Null for movies. Named `episodeRef`
   * rather than `ref` because this object is spread into a client component, and
   * React reserves `ref` as a prop.
   */
  episodeRef: EpisodeRef | null;
  /** Catalogue entry behind `episodeRef`, when the provider lists one. */
  episode: Episode | null;
  next: Episode | null;
  previous: Episode | null;
  /** Non-null when playback must not be attempted at all. */
  blocked: PlaybackBlockReason | null;
}

export async function loadWatch(
  kind: MediaKind,
  rawId: string,
  segments: string[] = [],
): Promise<WatchContext> {
  const id = decodeURIComponent(rawId).trim();
  if (!id) notFound();

  const { data: detail } = await metadataManager.getTitle(kind, id);
  if (!detail) notFound();

  const episodeRef = resolveRef(detail, segments);

  // One canonical URL per playable episode. This absorbs a wrong kind, a
  // non-canonical id, the short absolute-number form, zero-padded numbers and
  // out-of-range episodes in a single comparison.
  const canonical = watchHref(detail.kind, detail.id, episodeRef ?? undefined);
  if (canonical !== requestedPath(kind, id, segments)) redirect(canonical);

  const episodes = forTransport(detail.episodes);
  const episode = episodeRef ? findEpisode(episodes, episodeRef) : null;

  return {
    detail: { ...detail, episodes },
    episodeRef,
    episode,
    next: episodeRef ? nextEpisodeAfter(episodes, episodeRef) : null,
    previous: episodeRef ? previousEpisodeBefore(episodes, episodeRef) : null,
    blocked: blockReason(detail, episodeRef, episode),
  };
}

export function watchMetadata({ detail, episodeRef, episode }: WatchContext): Metadata {
  const label = episodeRef ? episodeLabel(episodeRef.season, episodeRef.episode) : null;
  const episodeName = episode?.title ? truncate(episode.title, 60) : null;
  const suffix = label ? ` — ${label}${episodeName ? `: ${episodeName}` : ''}` : '';
  const title = `Watch ${detail.title}${suffix}`;
  const canonical = watchHref(detail.kind, detail.id, episodeRef ?? undefined);

  return {
    title,
    description: `Play ${detail.title}${suffix} on ${SITE.name}. Choose a playback server and set your preferred audio and subtitle languages.`,
    alternates: { canonical },
    // The player page duplicates the title page for a crawler and is only useful
    // to someone already watching, so the title page stays the indexable one.
    robots: { index: false, follow: true },
  };
}

/**
 * Resolves the URL segments to an episode the embed endpoint can address.
 * Returns null for movies.
 */
function resolveRef(detail: MediaDetail, segments: string[]): EpisodeRef | null {
  if (detail.kind === 'movie') return null;

  const first = parseSegmentNumber(segments[0], 0);
  const second = parseSegmentNumber(segments[1], 1);

  // `/watch/tv/{id}/{season}/{episode}` — the documented shape.
  if (first !== null && second !== null) {
    const exact = findEpisode(detail.episodes, { season: first, episode: second });
    if (exact && isAddressable(exact)) return { season: exact.season, episode: exact.episode };

    // No catalogue entry: honour the URL only when the provider lists no
    // episodes at all. A missing list is a metadata gap, not evidence that the
    // episode does not exist, and playback may still work.
    if (!exact && detail.episodes.length === 0) return { season: first, episode: second };
  }

  // `/watch/anime/{id}/{n}` — an absolute episode number, resolved against the
  // ordered list rather than assumed to be season 1.
  if (first !== null && segments.length === 1) {
    const absolute = episodeByAbsoluteNumber(detail.episodes, first);
    if (absolute) return { season: absolute.season, episode: absolute.episode };
  }

  return firstAiredEpisode(detail.episodes) ?? null;
}

function blockReason(
  detail: MediaDetail,
  ref: EpisodeRef | null,
  episode: Episode | null,
): PlaybackBlockReason | null {
  if (!isPlayable(detail.kind, detail.ids, ref ?? undefined)) return 'missing-identifier';
  if (episode?.unreleased) return 'unreleased';
  return null;
}

function requestedPath(kind: MediaKind, id: string, segments: string[]): string {
  const encoded = encodeURIComponent(id);
  if (kind === 'movie') return `/watch/movie/${encoded}`;
  const base = kind === 'anime' ? 'anime' : 'tv';
  const tail = segments.length > 0 ? `/${segments.join('/')}` : '';
  return `/watch/${base}/${encoded}${tail}`;
}

/**
 * Episode overviews are dropped before the list crosses to the client: the
 * switcher shows titles and air dates, and a long-running series would otherwise
 * ship a few hundred kilobytes of prose nobody reads here.
 */
function forTransport(episodes: Episode[]): Episode[] {
  return episodes.map((episode) => ({ ...episode, overview: undefined }));
}

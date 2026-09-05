import { playback } from '@/lib/playback/manager';
import type { EpisodeRef } from '@/lib/playback/routes';
import type { PlaybackTarget } from '@/lib/playback/types';
import type { Episode, MediaIds, MediaKind } from '@/types/media';

/**
 * Bridges normalized metadata to a playback target.
 *
 * Anime is a route namespace, not a playback namespace: Nxsha publishes `movie`
 * and `tv` endpoints only, so an anime series is played through `tv`. That
 * mapping happens here, once, rather than in every screen.
 */
export function toPlaybackTarget(
  kind: MediaKind,
  ids: MediaIds,
  episode?: EpisodeRef,
): PlaybackTarget {
  if (kind === 'movie') return { kind: 'movie', ids };
  return { kind: 'tv', ids, season: episode?.season ?? 1, episode: episode?.episode ?? 1 };
}

/** True when some provider has a documented endpoint for this title. */
export function isPlayable(kind: MediaKind, ids: MediaIds, episode?: EpisodeRef): boolean {
  return playback.providerFor(toPlaybackTarget(kind, ids, episode)) !== null;
}

/**
 * The episode a "Play" button should open: the first one that has actually aired.
 *
 * Season and episode numbering is provider data, never assumed — some series
 * start at season 0 (specials). Episode 0 is skipped because the documented
 * episodic endpoint takes a 1-based episode number, so there is no URL for it.
 */
export function firstAiredEpisode(episodes: Episode[]): EpisodeRef | undefined {
  const ordered = sortEpisodes(episodes).filter(isAddressable);
  const aired = ordered.find((episode) => !episode.unreleased) ?? ordered[0];
  return aired ? { season: aired.season, episode: aired.episode } : undefined;
}

/**
 * True when the documented embed endpoint can address this episode. Nxsha's `tv`
 * URL is `/embed/tv/{id}/{season}/{episode}` with a 1-based episode, so an
 * episode numbered 0 has no representable URL.
 */
export function isAddressable(episode: Episode): boolean {
  return episode.season >= 0 && episode.episode >= 1;
}

/** Finds an exact season/episode pair, or null when the series has no such episode. */
export function findEpisode(episodes: Episode[], ref: EpisodeRef): Episode | null {
  return (
    episodes.find((entry) => entry.season === ref.season && entry.episode === ref.episode) ?? null
  );
}

/**
 * Resolves a 1-based absolute episode number against the real ordered list.
 *
 * This backs the shorter `/watch/anime/{id}/{n}` link form. It is a deterministic
 * lookup in provider data — never "assume season 1", which silently sends viewers
 * to the wrong episode of any multi-season show.
 */
export function episodeByAbsoluteNumber(episodes: Episode[], position: number): Episode | null {
  const ordered = sortEpisodes(episodes).filter(
    (episode) => episode.season > 0 && isAddressable(episode),
  );
  return ordered[position - 1] ?? null;
}

/** Next episode in broadcast order, skipping anything that has not aired. */
export function nextEpisodeAfter(episodes: Episode[], ref: EpisodeRef): Episode | null {
  const ordered = sortEpisodes(episodes).filter(isAddressable);
  const index = ordered.findIndex(
    (entry) => entry.season === ref.season && entry.episode === ref.episode,
  );
  if (index === -1) return null;
  return ordered.slice(index + 1).find((entry) => !entry.unreleased) ?? null;
}

/** Previous episode in broadcast order. */
export function previousEpisodeBefore(episodes: Episode[], ref: EpisodeRef): Episode | null {
  const ordered = sortEpisodes(episodes).filter(isAddressable);
  const index = ordered.findIndex(
    (entry) => entry.season === ref.season && entry.episode === ref.episode,
  );
  if (index <= 0) return null;
  return ordered[index - 1] ?? null;
}

/** Broadcast order, with season 0 specials after the numbered seasons. */
function sortEpisodes(episodes: Episode[]): Episode[] {
  const rank = (season: number) => (season === 0 ? Number.MAX_SAFE_INTEGER : season);
  return [...episodes].sort((a, b) => rank(a.season) - rank(b.season) || a.episode - b.episode);
}

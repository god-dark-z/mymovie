'use client';

import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useMounted } from '@/hooks/useMounted';
import { ButtonLink } from '@/components/ui/Button';
import { PlayIcon } from '@/components/ui/Icons';
import { type EpisodeRef, watchHref } from '@/lib/playback/routes';
import { episodeLabel } from '@/lib/utils/format';
import type { MediaKind } from '@/types/media';

/**
 * Primary watch CTA.
 *
 * For a series it resumes the last episode the viewer *opened* — not a playback
 * position, which the provider does not expose. `start` is the first real
 * episode from the provider's list, so an anime that begins at S1 E0 or a series
 * whose first season is numbered 0 still gets a working link.
 *
 * Until mount it renders the server's markup (start episode) so hydration
 * matches; the resume label appears on the first client render.
 */
export function PlayButton({
  id,
  kind,
  start,
}: {
  id: string;
  kind: MediaKind;
  start?: EpisodeRef;
}) {
  const mounted = useMounted();
  const { find } = useWatchHistory();

  if (kind === 'movie') {
    return (
      <ButtonLink href={watchHref('movie', id)} variant="accent" size="lg" prefetch={false}>
        <PlayIcon className="size-[1.125rem]" />
        Play
      </ButtonLink>
    );
  }

  const entry = mounted ? find(id) : null;
  const resume =
    entry && entry.season !== undefined && entry.episode !== undefined
      ? { season: entry.season, episode: entry.episode }
      : null;
  const target = resume ?? start;

  return (
    <ButtonLink href={watchHref(kind, id, target)} variant="accent" size="lg" prefetch={false}>
      <PlayIcon className="size-[1.125rem]" />
      {resume ? 'Resume' : 'Play'}
      {target ? (
        <span className="font-normal text-white/75 tabular-nums">
          {episodeLabel(target.season, target.episode)}
        </span>
      ) : null}
    </ButtonLink>
  );
}

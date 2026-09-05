'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { WatchlistButton } from '@/components/detail/WatchlistButton';
import { EpisodeSheet } from '@/components/player/EpisodeSheet';
import { LanguageSheet } from '@/components/player/LanguageSheet';
import { NxshaPlayer, type PlayerPhase } from '@/components/player/NxshaPlayer';
import { ControlButton, ControlLink, PlayerBar } from '@/components/player/PlayerBar';
import { ServerSheet } from '@/components/player/ServerSheet';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState, type ErrorKind } from '@/components/ui/ErrorState';
import {
  ArrowLeftIcon,
  CaptionsIcon,
  ChevronLeftIcon,
  GlobeIcon,
  ListIcon,
  PlayIcon,
  RetryIcon,
  ServerIcon,
  SkipIcon,
  SpinnerIcon,
} from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { useToast } from '@/components/ui/Toast';
import { useMounted } from '@/hooks/useMounted';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { detailHref, kindLabel } from '@/lib/metadata/classify';
import { backdropUrl } from '@/lib/metadata/images';
import { ANIME_PRIORITY_LANGUAGES, languageLabel } from '@/lib/nxsha/languages';
import { getServerConfig, nextServerAfter, type PlaybackServerConfig } from '@/lib/nxsha/servers';
import { isAddressable, toPlaybackTarget } from '@/lib/playback/availability';
import { playback } from '@/lib/playback/manager';
import { watchHref } from '@/lib/playback/routes';
import type { PlaybackBlockReason } from '@/lib/playback/types';
import type { WatchContext } from '@/lib/playback/watch-route';
import { recordWatch } from '@/lib/storage';
import { episodeLabel, formatShortDate, joinNonEmpty, truncate } from '@/lib/utils/format';
import type { Episode } from '@/types/media';

/**
 * The watch screen: everything around the embed, and nothing inside it.
 *
 * Three rules shape this component.
 *
 *  1. **The embed URL is built once, from real preferences.** Server, audio and
 *     subtitle choices live in `localStorage`, which the server cannot read, so
 *     the player is gated on `useMounted()`. Rendering a default-preference
 *     iframe first and correcting it after hydration would request two documents
 *     and throw one away.
 *  2. **Failover is timeout-based and honest.** The only thing observable about a
 *     cross-origin iframe is whether its document loaded. A missing `load` event
 *     is a real network signal and triggers at most `MAX_AUTO_HOPS` automatic
 *     hops; after that the screen stops guessing and hands over to manual
 *     selection. A `load` that did fire proves nothing about the stream, so
 *     nothing is claimed about it.
 *  3. **An automatic hop is not a preference.** A manual pick is persisted; a
 *     recovery hop is remembered only for this title, so a one-off outage never
 *     rewrites the user's default server.
 */
const MAX_AUTO_HOPS = 2;
const PLAYER_TIMEOUT_MS = 14_000;

type OpenSheet = 'server' | 'audio' | 'subtitle' | 'episodes' | null;

/** Failover state is scoped to one target so it can never bleed across episodes. */
interface FailoverState {
  key: string;
  /** Server chosen by automatic failover, not by the user. */
  serverId: string | null;
  hops: number;
  /** Servers whose embed never loaded in this session. */
  unresponsive: string[];
}

export function WatchScreen({
  detail,
  episodeRef,
  episode,
  next,
  previous,
  blocked,
}: WatchContext) {
  const mounted = useMounted();
  const { online } = useNetworkStatus();
  const { preferences, update } = usePlaybackPreferences();
  const { toast } = useToast();

  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [attempt, setAttempt] = useState(0);

  const targetKey = `${detail.id}|${episodeRef?.season ?? ''}|${episodeRef?.episode ?? ''}`;
  const [failoverState, setFailoverState] = useState<FailoverState>({
    key: targetKey,
    serverId: null,
    hops: 0,
    unresponsive: [],
  });

  // Derived rather than reset in an effect: a stale override would otherwise
  // survive one frame after an episode change and load an iframe we then discard.
  const failover =
    failoverState.key === targetKey
      ? failoverState
      : { key: targetKey, serverId: null, hops: 0, unresponsive: [] };

  const serverId = failover.serverId ?? preferences.serverId;
  const serverConfig = getServerConfig(serverId);

  const target = useMemo(
    () => toPlaybackTarget(detail.kind, detail.ids, episodeRef ?? undefined),
    [detail.kind, detail.ids, episodeRef],
  );

  const resolved = useMemo(
    () =>
      playback.resolve(target, {
        serverId,
        lockServer: preferences.lockServer,
        language: preferences.language,
        subtitle: preferences.subtitle,
        preferId: preferences.useTmdbId ? 'tmdb' : 'imdb',
      }),
    [
      target,
      serverId,
      preferences.lockServer,
      preferences.language,
      preferences.subtitle,
      preferences.useTmdbId,
    ],
  );

  const source = 'source' in resolved ? resolved.source : null;
  const reason: PlaybackBlockReason | null =
    blocked ?? ('reason' in resolved ? resolved.reason : null);

  // One player instance per (url, attempt) pair, so `phase` can never describe a
  // document that is no longer on screen.
  const playerKey = `${source?.url ?? 'none'}#${attempt}`;
  const [phaseState, setPhaseState] = useState<{ key: string; phase: PlayerPhase }>({
    key: playerKey,
    phase: 'loading',
  });
  const phase: PlayerPhase = phaseState.key === playerKey ? phaseState.phase : 'loading';

  const handlePhase = useCallback(
    (nextPhase: PlayerPhase) => setPhaseState({ key: playerKey, phase: nextPhase }),
    [playerKey],
  );

  const handleUnreachable = useCallback(() => {
    const tried = failover.unresponsive.includes(serverId)
      ? failover.unresponsive
      : [...failover.unresponsive, serverId];

    if (!preferences.autoFailover || failover.hops >= MAX_AUTO_HOPS) {
      setFailoverState({ ...failover, unresponsive: tried });
      return;
    }

    const fallback = nextUntried(serverId, tried);
    if (!fallback) {
      setFailoverState({ ...failover, unresponsive: tried });
      return;
    }

    setFailoverState({
      key: targetKey,
      serverId: fallback.id,
      hops: failover.hops + 1,
      unresponsive: tried,
    });
    toast(`${serverConfig.label} did not respond — trying ${fallback.label}`);
  }, [failover, preferences.autoFailover, serverConfig.label, serverId, targetKey, toast]);

  const chooseServer = useCallback(
    (id: string) => {
      // A manual pick is a preference: persist it, drop any automatic override,
      // and re-arm the automatic hops the user has just overruled. The record of
      // which servers failed is kept — it is still true.
      setFailoverState({
        key: targetKey,
        serverId: null,
        hops: 0,
        unresponsive: failover.unresponsive,
      });
      setAttempt((value) => value + 1);
      update({ serverId: id });
      setSheet(null);
      if (id !== serverId) toast(`Switched to ${getServerConfig(id).label}`);
    },
    [failover.unresponsive, serverId, targetKey, toast, update],
  );

  const chooseLanguage = useCallback(
    (track: 'audio' | 'subtitle', code: string | null) => {
      update(track === 'audio' ? { language: code } : { subtitle: code });
      setSheet(null);
      const label = languageLabel(code);
      toast(
        label
          ? `Requesting ${label} ${track === 'audio' ? 'audio' : 'subtitles'} — reloading the player`
          : `Using the player's default ${track === 'audio' ? 'audio' : 'subtitles'}`,
      );
    },
    [toast, update],
  );

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Continue Watching records that the user opened this title, which is all the
  // provider lets us know. No progress is invented; `positionSeconds` stays unset
  // until a provider actually reports it.
  useEffect(() => {
    if (blocked) return;
    recordWatch({
      id: detail.id,
      kind: detail.kind,
      isAnime: detail.isAnime,
      title: detail.title,
      poster: detail.poster,
      backdrop: detail.backdrop,
      year: detail.year,
      imdbId: detail.ids.imdbId,
      tmdbId: detail.ids.tmdbId,
      season: episodeRef?.season,
      episode: episodeRef?.episode,
      episodeTitle: episode?.title,
    });
  }, [blocked, detail, episode, episodeRef]);

  const episodic = detail.kind !== 'movie';
  const backHref = detailHref(detail.kind, detail.id);
  const currentLabel = episodeRef ? episodeLabel(episodeRef.season, episodeRef.episode) : null;
  const upNext = next && !next.unreleased && isAddressable(next) ? next : null;
  const goBack = previous && isAddressable(previous) ? previous : null;
  const animeLike = detail.kind === 'anime' || detail.isAnime;
  const fallbackServer = nextUntried(serverId, failover.unresponsive);

  const subline = joinNonEmpty([
    currentLabel,
    episode?.title && episode.title !== currentLabel ? truncate(episode.title, 48) : undefined,
    !episodic ? kindLabel(detail.kind, detail.isAnime) : undefined,
    detail.year,
  ]);

  const backdrop = backdropUrl(detail.backdrop);

  let stage: ReactNode;
  if (reason) {
    const copy = blockedCopy(reason, episode);
    stage = (
      <StagePlate backdrop={backdrop}>
        <ErrorState
          compact
          kind={copy.kind}
          title={copy.title}
          description={copy.description}
          action={{ label: 'Back to details', href: backHref }}
        />
      </StagePlate>
    );
  } else if (!online) {
    // `navigator.onLine === false` means there is no network interface at all, so
    // this is a real signal — and blaming a server for it would be a lie.
    stage = (
      <StagePlate backdrop={backdrop}>
        <ErrorState
          compact
          kind="offline"
          description="Reconnect and the player will load. Your server and language choices are saved on this device."
          onRetry={retry}
        />
      </StagePlate>
    );
  } else if (!mounted || !source) {
    stage = (
      <StagePlate backdrop={backdrop}>
        <div role="status" className="flex flex-col items-center gap-3 py-14">
          <SpinnerIcon className="size-7 text-mist-200" />
          <p className="font-display text-[0.8125rem] text-mist-300">Preparing the player…</p>
        </div>
      </StagePlate>
    );
  } else {
    stage = (
      <NxshaPlayer
        key={playerKey}
        source={source}
        poster={backdrop ?? detail.poster}
        title={joinNonEmpty([detail.title, currentLabel], ' — ')}
        timeoutMs={PLAYER_TIMEOUT_MS}
        onPhaseChange={handlePhase}
        onUnreachable={handleUnreachable}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <header className="gutter-x flex items-center gap-3 pt-[calc(var(--spacing-safe-t)+0.625rem)] pb-2.5">
        <Link
          href={backHref}
          aria-label={`Back to ${detail.title}`}
          className="glass-1 tap flex size-11 shrink-0 items-center justify-center rounded-full text-mist-100 md:size-10 md:hover:bg-white/10"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-white md:text-base">
            <Link href={backHref} className="hover:underline">
              {detail.title}
            </Link>
          </h1>
          {subline ? <p className="truncate text-xs text-mist-500">{subline}</p> : null}
        </div>

        <WatchlistButton media={detail} labelled={false} />
      </header>

      {/* The black band lets the 16:9 stage letterbox on a wide or short viewport
          instead of being cropped or pushing the controls off-screen. */}
      <div className="bg-black">
        <div className="player-stage">{stage}</div>
      </div>

      <div className="gutter-x pt-4 pb-[calc(2.5rem+var(--spacing-safe-b))]">
        <PlayerBar>
          <ControlButton
            icon={<ServerIcon className="size-4.5" />}
            label="Server"
            value={serverConfig.label}
            onClick={() => setSheet('server')}
          />
          <ControlButton
            icon={<GlobeIcon className="size-4.5" />}
            label="Audio"
            value={languageLabel(preferences.language) ?? 'Player default'}
            onClick={() => setSheet('audio')}
          />
          <ControlButton
            icon={<CaptionsIcon className="size-4.5" />}
            label="Subtitles"
            value={languageLabel(preferences.subtitle) ?? 'Player default'}
            onClick={() => setSheet('subtitle')}
          />
          {episodic ? (
            <ControlButton
              icon={<ListIcon className="size-4.5" />}
              label="Episodes"
              value={currentLabel ?? 'Browse'}
              onClick={() => setSheet('episodes')}
            />
          ) : null}
          {goBack ? (
            <ControlLink
              icon={<ChevronLeftIcon className="size-4.5" />}
              label="Previous"
              value={episodeLabel(goBack.season, goBack.episode)}
              href={watchHref(detail.kind, detail.id, goBack)}
            />
          ) : null}
          {upNext ? (
            <ControlLink
              icon={<SkipIcon className="size-4.5" />}
              label="Next"
              value={episodeLabel(upNext.season, upNext.episode)}
              href={watchHref(detail.kind, detail.id, upNext)}
            />
          ) : null}
        </PlayerBar>

        {phase === 'timeout' && source ? (
          <section aria-live="polite" className="glass-2 mt-4 rounded-3xl p-4">
            <h2 className="font-display text-[0.9375rem] font-semibold text-white">
              {serverConfig.label} did not respond
            </h2>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-400">
              The embed did not load within {Math.round(PLAYER_TIMEOUT_MS / 1000)} seconds, which
              usually means this node is down or blocked on your network.
              {failover.hops > 0
                ? ` Automatic switching already tried ${failover.hops === 1 ? 'one other server' : `${failover.hops} other servers`}.`
                : ''}{' '}
              Cineora cannot see inside the player, so it will not guess any further.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              <Button variant="accent" size="sm" onClick={retry}>
                <RetryIcon className="size-4" />
                Try again
              </Button>
              {fallbackServer ? (
                <Button variant="glass" size="sm" onClick={() => chooseServer(fallbackServer.id)}>
                  Use {fallbackServer.label}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setSheet('server')}>
                <ServerIcon className="size-4" />
                All servers
              </Button>
            </div>
          </section>
        ) : null}
        {upNext ? (
          <section className="glass-1 mt-5 flex items-center gap-3.5 rounded-3xl p-3">
            <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-xl bg-ink-800 xs:w-28">
              <PosterImage
                src={upNext.thumbnail}
                alt={upNext.title || episodeLabel(upNext.season, upNext.episode)}
                sizes="(min-width: 26rem) 112px, 80px"
                wide
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.5625rem] font-semibold tracking-[0.12em] text-mist-500 uppercase">
                Up next
              </p>
              <p className="mt-1 truncate font-display text-[0.9375rem] font-medium text-white">
                {upNext.title || episodeLabel(upNext.season, upNext.episode)}
              </p>
              <p className="truncate text-xs text-mist-400">
                {joinNonEmpty([
                  episodeLabel(upNext.season, upNext.episode),
                  formatShortDate(upNext.airDate),
                ])}
              </p>
            </div>
            <ButtonLink
              href={watchHref(detail.kind, detail.id, upNext)}
              prefetch={false}
              variant="accent"
              size="sm"
              className="shrink-0"
            >
              <PlayIcon className="size-4" />
              Play
            </ButtonLink>
          </section>
        ) : null}

        <p className="mt-5 max-w-2xl text-xs leading-relaxed text-mist-500">
          Playback, quality and track switching happen inside the Nxsha player. Cineora passes your
          server, audio and subtitle choices as documented parameters — whether a source actually
          carries a language is decided by the provider, not by this app.
        </p>
      </div>
      <ServerSheet
        open={sheet === 'server'}
        onClose={() => setSheet(null)}
        activeId={serverId}
        lockServer={preferences.lockServer}
        autoFailover={preferences.autoFailover}
        unresponsive={failover.unresponsive}
        onPick={chooseServer}
        onLockChange={(value) => update({ lockServer: value })}
        onAutoFailoverChange={(value) => update({ autoFailover: value })}
      />

      <LanguageSheet
        open={sheet === 'audio'}
        onClose={() => setSheet(null)}
        track="audio"
        value={preferences.language}
        priority={animeLike ? ANIME_PRIORITY_LANGUAGES : undefined}
        hint={serverHint(serverConfig)}
        onPick={(code) => chooseLanguage('audio', code)}
      />

      <LanguageSheet
        open={sheet === 'subtitle'}
        onClose={() => setSheet(null)}
        track="subtitle"
        value={preferences.subtitle}
        priority={animeLike ? ANIME_PRIORITY_LANGUAGES : undefined}
        hint={serverHint(serverConfig)}
        onPick={(code) => chooseLanguage('subtitle', code)}
      />

      {episodic ? (
        <EpisodeSheet
          open={sheet === 'episodes'}
          onClose={() => setSheet(null)}
          id={detail.id}
          kind={detail.kind}
          seasons={detail.seasons}
          episodes={detail.episodes}
          current={episodeRef}
        />
      ) : null}
    </div>
  );
}
/**
 * Frame for anything that is not the embed. Deliberately not `aspect-video`: on a
 * 320px-wide phone a 16:9 box is 180px tall and would clip the copy inside it.
 */
function StagePlate({ backdrop, children }: { backdrop?: string; children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-64 w-full items-center justify-center overflow-hidden bg-black sm:min-h-80">
      {backdrop ? (
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-2xl"
          style={{ backgroundImage: `url("${backdrop}")` }}
        />
      ) : null}
      <div className="relative w-full">{children}</div>
    </div>
  );
}

/** Why playback was not attempted, in the user's terms. */
function blockedCopy(
  reason: PlaybackBlockReason,
  episode: Episode | null,
): { kind: ErrorKind; title: string; description: string } {
  if (reason === 'unreleased') {
    const airs = formatShortDate(episode?.airDate);
    return {
      kind: 'notFound',
      title: 'This episode has not aired yet',
      description: airs
        ? `The catalogue lists it for ${airs}. It will be playable once a source exists.`
        : 'The catalogue has no air date for it yet, so there is nothing to play.',
    };
  }

  if (reason === 'unsupported-target') {
    return {
      kind: 'playback',
      title: 'This entry cannot be played',
      description:
        'The player addresses episodes by season and number, and this entry has neither in a form it accepts.',
    };
  }

  if (reason === 'no-provider') {
    return {
      kind: 'playback',
      title: 'No playback provider',
      description: 'No playback integration is configured for this build, so nothing can be requested.',
    };
  }

  return {
    kind: 'playback',
    title: 'No playback identifier',
    description:
      'The catalogue has no IMDb or TMDb id for this title, and the player needs one to request a source. Nothing can be attempted without it.',
  };
}

/**
 * Walks forward past servers already known to be unresponsive, so an automatic hop
 * never re-tries a node that has already timed out in this session.
 */
function nextUntried(from: string, tried: string[]): PlaybackServerConfig | null {
  let cursor = nextServerAfter(from);
  while (cursor && tried.includes(cursor.id)) cursor = nextServerAfter(cursor.id);
  return cursor;
}

/** Honest caveat when the requested server is not one of the multi-language nodes. */
function serverHint(server: PlaybackServerConfig): string | undefined {
  if (server.multiLanguage) return undefined;
  return `${server.label} is not flagged as multi-language, so it may ignore this request.`;
}

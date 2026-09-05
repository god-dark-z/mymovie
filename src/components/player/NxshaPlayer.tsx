'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SpinnerIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';
import type { PlaybackSource } from '@/lib/playback/types';

/**
 * The Nxsha embed, and nothing more.
 *
 * Deliberately *not* a video player: Nxsha's player owns play/pause, seeking,
 * quality, audio tracks and subtitles, and publishes no control API, so this
 * component renders no transport controls it could not honour.
 *
 * What it can honestly observe is the iframe's own `load` event. That proves the
 * embed document was fetched — it does not prove a stream is playing, because the
 * frame is cross-origin and its contents are unreadable by design. So:
 *
 *   - before `load`, a cinematic loading state;
 *   - if `load` has not fired within `timeoutMs`, the embed is treated as
 *     unreachable (a real network signal) and `onUnreachable` fires once;
 *   - after `load`, no claim is made either way, and the manual "try another
 *     server" path stays one tap away.
 */
export type PlayerPhase = 'loading' | 'loaded' | 'timeout';

export function NxshaPlayer({
  source,
  poster,
  title,
  timeoutMs = 14_000,
  onPhaseChange,
  onUnreachable,
  className,
}: {
  source: PlaybackSource;
  /** Artwork shown behind the loading state. */
  poster?: string;
  /** Accessible name for the frame. */
  title: string;
  timeoutMs?: number;
  onPhaseChange?: (phase: PlayerPhase) => void;
  /** Fires once when the embed never loaded within the timeout. */
  onUnreachable?: (source: PlaybackSource) => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<PlayerPhase>('loading');

  // Callbacks live in refs so a parent re-render never re-arms the timer.
  const phaseRef = useRef<PlayerPhase>('loading');
  const onPhase = useRef(onPhaseChange);
  const onDead = useRef(onUnreachable);
  onPhase.current = onPhaseChange;
  onDead.current = onUnreachable;

  const enter = useCallback((next: PlayerPhase) => {
    if (phaseRef.current === next) return;
    phaseRef.current = next;
    setPhase(next);
    onPhase.current?.(next);
  }, []);

  // A new URL is a new document: reset the phase and re-arm the timer.
  useEffect(() => {
    phaseRef.current = 'loading';
    setPhase('loading');
    onPhase.current?.('loading');

    const timer = window.setTimeout(() => {
      if (phaseRef.current !== 'loading') return;
      phaseRef.current = 'timeout';
      setPhase('timeout');
      onPhase.current?.('timeout');
      onDead.current?.(source);
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [source, timeoutMs]);

  return (
    <div className={cn('relative isolate aspect-video w-full overflow-hidden bg-black', className)}>
      {poster && phase !== 'loaded' ? (
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-2xl"
          style={{ backgroundImage: `url("${poster}")` }}
        />
      ) : null}

      <iframe
        // Remounting on URL change avoids leaving a dead document on screen while
        // the next server loads.
        key={source.url}
        src={source.url}
        title={title}
        allow={source.iframeAllow}
        allowFullScreen
        referrerPolicy="origin-when-cross-origin"
        onLoad={() => enter('loaded')}
        className="absolute inset-0 size-full border-0"
      />

      {phase === 'loading' ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 grid place-items-center bg-ink-950/60"
        >
          <div className="flex flex-col items-center gap-3">
            <SpinnerIcon className="size-7 text-mist-200" />
            <p className="font-display text-[0.8125rem] text-mist-300">Connecting to the player…</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

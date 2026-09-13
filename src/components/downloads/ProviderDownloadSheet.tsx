'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DownloadIcon, ExternalIcon, SpinnerIcon } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/utils/cn';

/**
 * The download experience on a title.
 *
 * One tap on Download: the resolver works in the background (its security nodes
 * and data endpoints are Cineora-server business — the visitor waits at most a
 * few seconds at a loading state), then every working server group and its
 * direct files appear as cards. Links open in a new tab; Cineora never proxies
 * the bytes themselves.
 */

export interface ProviderDownloadSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The provider routes on the TMDb id; IMDb is sent alongside when present. */
  tmdbId?: string;
  imdbId?: string;
  kind: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  /** Where to send the reader if resolution fails outright. */
  fallbackHref?: string;
}

interface SourceLink {
  url: string;
  quality?: string;
  size?: string;
  tags: string[];
  label?: string;
}

interface ServerGroup {
  id: string;
  name: string;
  quality?: string;
  sources: SourceLink[];
}

type Phase = 'loading' | 'success' | 'error';

const LOADING_LINES = [
  'Bypassing security nodes…',
  'Fetching direct download streams…',
  'Preparing download links…',
];

export function ProviderDownloadSheet({
  open,
  onClose,
  title,
  tmdbId,
  imdbId,
  kind,
  season,
  episode,
  fallbackHref,
}: ProviderDownloadSheetProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [servers, setServers] = useState<ServerGroup[]>([]);
  const [error, setError] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const runId = useRef(0);

  async function resolve() {
    const run = ++runId.current;
    setPhase('loading');
    setError('');
    try {
      const body: Record<string, string> = {
        type: kind === 'movie' ? 'movie' : 'tv',
        id: tmdbId ?? '',
      };
      if (imdbId) body.imdbId = imdbId;
      if (kind !== 'movie') {
        body.season = String(season ?? 1);
        body.episode = String(episode ?? 1);
      }
      const res = await fetch('/api/downloads/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; servers?: ServerGroup[]; error?: string; detail?: string[] }
        | null;
      if (run !== runId.current) return;
      if (!res.ok || !data?.success) {
        throw new Error(data?.error === 'provider_unavailable' ? 'unavailable' : 'failed');
      }
      setServers(data.servers ?? []);
      setPhase('success');
    } catch {
      if (run !== runId.current) return;
      setPhase('error');
    }
  }

  // Resolve whenever the sheet opens.
  useEffect(() => {
    if (open) void resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Loading copy cycles so the wait reads as work, not a freeze.
  useEffect(() => {
    if (phase !== 'loading' || !open) return;
    const timer = window.setInterval(() => setLineIndex((v) => (v + 1) % LOADING_LINES.length), 1400);
    return () => window.clearInterval(timer);
  }, [phase, open]);

  const totalLinks = servers.reduce((sum, group) => sum + group.sources.length, 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={
        phase === 'success'
          ? `${servers.length} server ${servers.length === 1 ? 'group' : 'groups'} · ${totalLinks} download ${totalLinks === 1 ? 'link' : 'links'} resolved for you.`
          : 'Direct download links, resolved in the background.'
      }
      size="md"
    >
      {phase === 'loading' ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="relative grid size-16 place-items-center">
            <span aria-hidden className="absolute inset-0 animate-halo rounded-full bg-gold-400/15 blur-xl" />
            <SpinnerIcon className="relative size-8 text-gold-400" />
          </div>
          {/* Indeterminate progress: the resolver's stages are known even when the
              exact progress is not, and a moving bar reads as work in progress. */}
          <div
            aria-hidden
            className="h-1 w-48 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
          >
            <div className="h-full w-1/3 animate-progress rounded-full bg-gold-400" />
          </div>
          <p aria-live="polite" className="font-display text-[0.9375rem] font-medium text-mist-100">
            {LOADING_LINES[lineIndex]}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-mist-500">
            Cineora resolves everything in the background — no puzzles, no redirects. Large
            libraries can take a few seconds.
          </p>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm leading-relaxed text-mist-300">
            The download service did not respond just now. This is usually temporary — the
            nodes may be between refreshes.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button variant="accent" size="md" onClick={() => void resolve()}>
              Retry
            </Button>
            {fallbackHref ? (
              <a
                href={fallbackHref}
                target="_blank"
                rel="noopener noreferrer"
                className="tap inline-flex h-11 items-center gap-2 rounded-full border border-(--glass-line) px-5 text-[0.8125rem] font-medium text-mist-200 transition-colors duration-200 md:hover:bg-white/8"
              >
                Open source page <ExternalIcon className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'success' ? (
        servers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-mist-300">
              No downloadable files are listed for this title right now.
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-mist-500">
              Availability changes by server. Try again later, or check a different title.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {servers.map((group) => (
              <section key={group.id} aria-label={`Server ${group.name}`}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-display text-[0.9375rem] font-semibold text-white">{group.name}</h3>
                  {group.quality ? (
                    <span className="rounded-md border border-white/12 bg-white/5 px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-mist-400 uppercase">
                      {group.quality}
                    </span>
                  ) : null}
                  <span aria-hidden className="h-px flex-1 bg-(--glass-line)" />
                </div>

                <div className="flex flex-col gap-2">
                  {group.sources.map((source) => {
                    const headline = source.quality ?? source.size ?? 'Download';
                    return (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tap group/link flex min-h-14 items-center gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 py-2.5 transition-colors duration-200 md:hover:border-white/20 md:hover:bg-white/8"
                      >
                        <span className="shrink-0 rounded-lg bg-gold-400/15 px-2 py-1 font-display text-[0.6875rem] font-bold tracking-wide text-gold-400 uppercase">
                          {headline}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[0.75rem] text-mist-400">
                          {[source.size, ...source.tags].filter(Boolean).join(' · ') || source.label || 'Direct link'}
                        </span>
                        <span className="tap inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gold-400 px-3.5 text-[0.75rem] font-bold text-ink-950 transition-transform duration-200 md:group-hover/link:scale-[1.04]">
                          <DownloadIcon className="size-3.5" />
                          Get
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            ))}

            <p className="mt-1 border-t border-(--glass-line) pt-4 text-xs leading-relaxed text-mist-500">
              Cineora does not host these files. Links point at third-party storage and may
              expire — re-resolve for a fresh set if one stops working.
            </p>
          </div>
        )
      ) : null}
    </Sheet>
  );
}

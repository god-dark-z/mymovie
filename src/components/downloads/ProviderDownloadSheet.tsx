'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SpinnerIcon } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/utils/cn';

function generateChallenge(): { a: number; b: number; answer: number } {
  const a = Math.floor(Math.random() * 40) + 5;
  const b = Math.floor(Math.random() * 40) + 5;
  return { a, b, answer: a + b };
}

export interface ProviderSource {
  url: string;
  quality?: string;
  label?: string;
  type?: string;
  isEmbed?: boolean;
}

export interface ProviderDownloadSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tmdbId: string;
  kind: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
}

type Step = 'captcha' | 'servers' | 'sources';

async function postResolve(body: Record<string, string>) {
  const res = await fetch('/api/downloads/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(
      (detail && typeof detail === 'object' && 'error' in detail ? String(detail.error) : null) ||
        `request_failed_${res.status}`,
    );
  }
  return res.json();
}

export function ProviderDownloadSheet({
  open,
  onClose,
  title,
  tmdbId,
  kind,
  season,
  episode,
}: ProviderDownloadSheetProps) {
  const [step, setStep] = useState<Step>('captcha');
  const [challenge, setChallenge] = useState(() => generateChallenge());
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [servers, setServers] = useState<Array<Record<string, unknown>>>([]);
  const [sources, setSources] = useState<ProviderSource[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  const isEpisode = kind !== 'movie';

  useEffect(() => {
    if (!open) return;
    setStep('captcha');
    setChallenge(generateChallenge());
    setValue('');
    setError(false);
    setServers([]);
    setSources([]);
    setLoadError('');
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(false), 600);
    return () => window.clearTimeout(t);
  }, [error]);

  const correct = useMemo(() => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed === challenge.answer;
  }, [value, challenge.answer]);

  async function loadServers() {
    setBusy(true);
    setLoadError('');
    try {
      const result = (await postResolve({
        type: kind === 'movie' ? 'movie' : 'tv',
        id: tmdbId,
      })) as { items?: unknown[] };

      const list = (Array.isArray(result.items) ? result.items : [])
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .filter((s) => s.dl_support !== false);

      setServers(list);
      setStep('servers');
      if (list.length === 0) setLoadError('No download servers are available for this title right now.');
    } catch {
      setLoadError('The download service did not respond. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  async function pickServer(server: Record<string, unknown>) {
    const provider = server.scraper as string | undefined;
    if (!provider) return;
    setBusy(true);
    setLoadError('');
    try {
      const body: Record<string, string> = {
        type: kind === 'movie' ? 'movie' : 'tv',
        id: tmdbId,
        provider,
      };
      if (isEpisode) {
        body.season = String(season ?? 1);
        body.episode = String(episode ?? 1);
      }
      const result = (await postResolve(body)) as { items?: unknown[] };

      const list = (Array.isArray(result.items) ? result.items : [])
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .filter((s) => Boolean(s.url) && s.isEmbed !== true)
        .map(
          (s): ProviderSource => ({
            url: String(s.url),
            quality: typeof s.quality === 'string' ? s.quality : undefined,
            label: typeof s.label === 'string' ? s.label : undefined,
            type: typeof s.type === 'string' ? s.type : undefined,
          }),
        );

      setSources(list);
      setStep('sources');
      if (list.length === 0) setLoadError('This server has no downloadable files for this title.');
    } catch {
      setLoadError('Could not fetch the download links. Try another server.');
    } finally {
      setBusy(false);
    }
  }

  function verify() {
    if (correct) void loadServers();
    else {
      setError(true);
      inputRef.current?.focus();
    }
  }

  const stepLabels: Record<Step, string> = {
    captcha: 'Verify you are not a bot to unlock the download links.',
    servers: 'Choose a download server.',
    sources: 'Download links, resolved for you.',
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={stepLabels[step]}
      size={step === 'sources' ? 'md' : 'sm'}
    >
      {step === 'captcha' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white/4 p-5">
            <span className="font-display text-2xl font-semibold tabular-nums text-white">{challenge.a}</span>
            <span className="text-xl text-mist-400">+</span>
            <span className="font-display text-2xl font-semibold tabular-nums text-white">{challenge.b}</span>
            <span className="text-xl text-mist-400">=</span>
            <input
              ref={inputRef}
              id={labelId}
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  verify();
                }
              }}
              aria-label={`What is ${challenge.a} plus ${challenge.b}?`}
              aria-invalid={error}
              className={cn(
                'w-20 rounded-xl border bg-transparent px-3 py-2 text-center font-display text-xl font-semibold tabular-nums text-white outline-none transition-colors',
                error ? 'border-ruby-400 bg-ruby-500/10' : 'border-(--glass-line) focus-visible:border-ruby-400/60',
              )}
            />
          </div>

          {error ? (
            <p className="text-center text-xs font-medium text-ruby-300">That is not right. Try again.</p>
          ) : null}
          {loadError ? (
            <p className="text-center text-xs leading-relaxed text-ruby-300">{loadError}</p>
          ) : null}

          <Button variant="accent" size="lg" className="w-full" onClick={verify} disabled={busy || value.trim() === ''}>
            {busy ? <SpinnerIcon className="size-4.5" /> : null}
            {busy ? 'Fetching servers…' : 'Verify & Proceed'}
          </Button>

          <p className="text-center text-[0.6875rem] leading-relaxed text-mist-500">
            Links are resolved through Cineora. Files are streamed from third-party providers.
          </p>
        </div>
      ) : null}

      {step === 'servers' ? (
        <div className="space-y-2">
          {loadError ? <p className="text-sm text-mist-400">{loadError}</p> : null}
          {servers.map((server) => {
            const s = server as { id?: number | string; name?: string; quality?: string };
            return (
              <button
                key={String(s.id)}
                type="button"
                onClick={() => void pickServer(server)}
                disabled={busy}
                className={cn(
                  'tap flex min-h-12 w-full items-center gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-4 text-left text-[0.8125rem] font-medium text-mist-100 md:hover:bg-white/8',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{s.name ?? 'Server'}</span>
                {s.quality ? <span className="shrink-0 text-[0.6875rem] text-mist-500">{s.quality}</span> : null}
                <span className="shrink-0 text-mist-500">→</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 'sources' ? (
        <div className="space-y-2">
          {loadError ? <p className="text-sm text-mist-400">{loadError}</p> : null}
          {sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tap flex min-h-12 items-center gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-4 text-[0.8125rem] font-medium text-mist-100 md:hover:bg-white/8"
            >
              <span className="shrink-0 rounded-full bg-ruby-500/18 px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-ruby-200 uppercase">
                {source.quality?.trim().split(/\s+/)[0] || 'File'}
              </span>
              <span className="min-w-0 flex-1 truncate text-mist-300">
                {source.quality?.trim() || source.label?.trim() || 'Download file'}
              </span>
              <span className="shrink-0 text-mist-500">↗</span>
            </a>
          ))}

          <div className="mt-4 space-y-2 border-t border-(--glass-line) pt-4">
            <p className="text-xs leading-relaxed text-mist-400">
              Cineora does not host these files. The links point to third-party storage and may
              expire — fetch a fresh link if a download stops working.
            </p>
            <button
              type="button"
              onClick={() => setStep('servers')}
              className="text-xs font-medium text-mist-400 underline underline-offset-4 hover:text-white"
            >
              ← Choose a different server
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

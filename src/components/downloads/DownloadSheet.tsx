'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { Button } from '@/components/ui/Button';
import { InlineNotice } from '@/components/ui/ErrorState';
import { FormAlert } from '@/components/ui/Form';
import { DownloadIcon, SpinnerIcon } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { toFailure } from '@/lib/auth/form';
import { loginHref } from '@/lib/auth/redirect';
import { nativeDownloads } from '@/lib/downloads/bridge';
import { startDownload } from '@/lib/downloads/start';
import {
  formatBytes,
  qualityLabel,
  recommendedItem,
  type DownloadItem,
  type DownloadOffer,
} from '@/lib/downloads/types';
import { cn } from '@/lib/utils/cn';

/**
 * Choosing a file and starting it.
 *
 * The sheet is deliberate about the two things it will not pretend to do. There is no
 * progress bar, because once the browser's downloader has the URL the page is told
 * nothing further; and nothing here says the file is "in Cineora", because it lands
 * in the device's downloads folder like any other file. A WebView host that provides
 * a real download manager takes the file instead, and the wording follows.
 */

/** Groups consecutive items under their episode heading, keeping catalogue order. */
function groupItems(items: readonly DownloadItem[]): Array<{ label: string | null; items: DownloadItem[] }> {
  const groups: Array<{ label: string | null; items: DownloadItem[] }> = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.label === item.group) last.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }
  return groups;
}

export function DownloadSheet({
  offer,
  open,
  onClose,
}: {
  offer: DownloadOffer;
  open: boolean;
  onClose: () => void;
}) {
  const { user, signedIn, status } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const groupName = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(nativeDownloads() !== null);
  }, []);

  const preferred = user?.preferences.playback.preferredQuality ?? 'auto';
  // The account's quality preference is applied here rather than on the server, so a
  // cached page can never carry one reader's setting to the next.
  const suggested = useMemo(() => recommendedItem(offer.items, preferred), [offer.items, preferred]);

  useEffect(() => {
    if (open) setSelected((current) => current ?? suggested?.key ?? null);
  }, [open, suggested]);

  const groups = useMemo(() => groupItems(offer.items), [offer.items]);
  const chosen = offer.items.find((item) => item.key === selected) ?? null;
  const verified = user?.emailVerified === true;

  async function start(item: DownloadItem) {
    setBusy(true);
    setError('');
    try {
      const started = await startDownload({ titleId: offer.titleId, kind: offer.kind }, item);
      toast(started.via === 'native' ? 'Added to your downloads' : 'Download started', { tone: 'success' });
      onClose();
    } catch (cause) {
      setError(toFailure(cause).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={offer.title}
      size="lg"
      footer={
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          disabled={!signedIn || !verified || chosen === null || busy}
          onClick={() => {
            if (chosen) void start(chosen);
          }}
        >
          {busy ? <SpinnerIcon className="size-4.5" /> : <DownloadIcon className="size-4.5" />}
          {busy ? 'Authorising…' : chosen ? `Download · ${formatBytes(chosen.sizeBytes)}` : 'Download'}
        </Button>
      }
    >
      {error ? <FormAlert className="mb-4">{error}</FormAlert> : null}

      {status === 'unavailable' ? (
        <InlineNotice tone="warning" className="mb-4">
          Downloads need an account, and accounts are not configured on this deployment yet.
        </InlineNotice>
      ) : null}

      {status === 'ready' && !signedIn ? (
        <InlineNotice tone="warning" className="mb-4">
          <Link
            href={loginHref(pathname)}
            className="font-medium text-white underline underline-offset-2"
          >
            Sign in
          </Link>{' '}
          to download. Every file is authorised to one account, so the link has to belong to somebody.
        </InlineNotice>
      ) : null}

      {signedIn && !verified ? (
        <InlineNotice tone="warning" className="mb-4">
          Confirm your email address first —{' '}
          <Link href="/verify-email" className="font-medium text-white underline underline-offset-2">
            finish verification
          </Link>
          .
        </InlineNotice>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="sr-only">Choose a file</legend>
        {groups.map((group) => (
          <div key={group.label ?? '·'}>
            {group.label ? (
              <p className="mb-2 text-[0.6875rem] font-semibold tracking-[0.08em] text-mist-500 uppercase">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-2">
              {group.items.map((item) => {
                const active = selected === item.key;
                return (
                  <label key={item.key} className="tap relative block cursor-pointer">
                    <input
                      type="radio"
                      name={groupName}
                      value={item.key}
                      checked={active}
                      onChange={() => setSelected(item.key)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors duration-200',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-ruby-400/60',
                        active
                          ? 'border-ruby-400/45 bg-ruby-500/10'
                          : 'border-(--glass-line) bg-white/4 hover:bg-white/8',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-mist-50">
                          {qualityLabel(item.quality)}
                        </span>
                        <span className="mt-0.5 block text-xs text-mist-400 tabular-nums">
                          {formatBytes(item.sizeBytes)}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200',
                          active ? 'border-ruby-400 bg-ruby-500' : 'border-white/25',
                        )}
                      >
                        <span className={cn('size-1.5 rounded-full bg-white', active ? 'opacity-100' : 'opacity-0')} />
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="mt-5 space-y-2 border-t border-(--glass-line) pt-4">
        <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-mist-500 uppercase">
          Distribution licence
        </p>
        {/* The operator's own words, unedited. Cineora does not paraphrase a licence. */}
        <p className="text-xs leading-relaxed text-mist-400">{offer.licence}</p>
        <p className="text-xs leading-relaxed text-mist-500">
          {native
            ? 'Handed to this app’s download manager, which owns pausing, resuming and where it is kept.'
            : 'Your browser saves the file to this device’s downloads folder. It does not report progress back to the page, so there is none to show here.'}
        </p>
      </div>
    </Sheet>
  );
}

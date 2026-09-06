'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AccountCard } from '@/components/account/AccountShell';
import { useAuth } from '@/components/account/AuthProvider';
import { SaveState, usePreferenceSaver } from '@/components/account/usePreferenceSaver';
import { Button } from '@/components/ui/Button';
import { FormAlert, PasswordField, SubmitButton, SwitchField, SwitchGroup, TextField } from '@/components/ui/Form';
import { AlertIcon, DownloadIcon, ExportIcon, TrashIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure, type FormFailure } from '@/lib/auth/form';
import { DELETE_CONFIRMATION } from '@/lib/auth/policy';
import type { AccountExport } from '@/lib/auth/types';
import { clearHistory, clearRecentSearches } from '@/lib/storage';

/**
 * Privacy and data.
 *
 * The inventory is written out in full rather than summarised as "we care about
 * your privacy", because the only version of that claim worth anything is a list
 * someone can check against the export and the source.
 */

const SERVER_DATA = [
  'Your email address, display name, optional handle and optional bio.',
  'Your profile picture, if you uploaded one, re-encoded to WebP with its metadata stripped.',
  'Your preferences — appearance, time zone, playback defaults, notification and accessibility choices.',
  'One record per signed-in device: an approximate description taken from the browser, and when it was last active.',
  'A security log of sign-ins, failed attempts, password changes and device sign-outs.',
];

const NEVER_STORED = [
  'Your password. Only a scrypt hash of it, which cannot be turned back into the password.',
  'Your IP address. Sessions hold a keyed digest, which distinguishes two devices without recording where you are.',
  'Your location, at any precision.',
  'How far into anything you watched. The player is a third-party frame with no documented progress events, so there is nothing to record.',
  'Any third-party analytics or advertising identifier. There are none in the application.',
];

const DEVICE_DATA = [
  'Your watchlist.',
  'Which titles you opened and when, used for the Continue watching rail.',
  'Your recent searches.',
  'Your playback choices: preferred server, audio and subtitle language.',
];

function List({ items, tone = 'default' }: { items: readonly string[]; tone?: 'default' | 'muted' }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-mist-300">
          <span
            aria-hidden
            className={tone === 'muted' ? 'mt-1.5 size-1.5 shrink-0 rounded-full bg-mist-600' : 'mt-1.5 size-1.5 shrink-0 rounded-full bg-ruby-400/70'}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DataInventory() {
  return (
    <AccountCard
      title="What Cineora holds"
      description="Everything on the server is in the export below, and this is the whole list."
    >
      <p className="text-[0.8125rem] font-medium text-mist-100">On the server</p>
      <div className="mt-2">
        <List items={SERVER_DATA} />
      </div>

      <p className="mt-5 text-[0.8125rem] font-medium text-mist-100">On this device only</p>
      <p className="mt-1 text-xs leading-relaxed text-mist-500">
        These never reach the server, which is also why they do not follow you to another device.
      </p>
      <div className="mt-2">
        <List items={DEVICE_DATA} tone="muted" />
      </div>

      <p className="mt-5 text-[0.8125rem] font-medium text-mist-100">Never recorded</p>
      <div className="mt-2">
        <List items={NEVER_STORED} tone="muted" />
      </div>
    </AccountCard>
  );
}

/**
 * The two local logs, and the switches that stop them.
 *
 * Switching one off clears what is already there. Leaving the old entries behind
 * while promising to stop collecting is the kind of half-measure that makes a
 * privacy control worthless, and the copy says so before the tap.
 */
export function LocalDataCard() {
  const { preferences, save, pending, saved, error } = usePreferenceSaver();
  const { toast } = useToast();
  if (!preferences) return null;

  return (
    <AccountCard
      title="History on your devices"
      description="Turning one of these off stops the recording and clears what this device already holds."
    >
      {error ? <FormAlert className="mb-4">{error}</FormAlert> : null}

      <SwitchGroup>
        <SwitchField
          label="Remember what I open"
          description="Powers Continue watching. Off means nothing is written, so the rail stays empty."
          checked={preferences.privacy.storeWatchHistory}
          onChange={(value) => {
            save({ privacy: { storeWatchHistory: value } });
            if (!value) {
              clearHistory();
              toast('Watch history cleared', { tone: 'success' });
            }
          }}
        />
        <SwitchField
          label="Remember my searches"
          description="Shows recent queries under the search box on this device."
          checked={preferences.privacy.storeSearchHistory}
          onChange={(value) => {
            save({ privacy: { storeSearchHistory: value } });
            if (!value) {
              clearRecentSearches();
              toast('Recent searches cleared', { tone: 'success' });
            }
          }}
        />
      </SwitchGroup>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-(--glass-line) pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearHistory();
            toast('Watch history cleared', { tone: 'success' });
          }}
        >
          <TrashIcon aria-hidden className="size-4" />
          Clear watch history
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearRecentSearches();
            toast('Recent searches cleared', { tone: 'success' });
          }}
        >
          <TrashIcon aria-hidden className="size-4" />
          Clear searches
        </Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-mist-500">
        Your watchlist is not touched by either button — remove titles from{' '}
        <span className="text-mist-300">My list</span> if you want it emptied.
      </p>
      <div className="mt-2">
        <SaveState pending={pending} saved={saved} error={error} />
      </div>
    </AccountCard>
  );
}

/**
 * Data export.
 *
 * Fetched and turned into a file here rather than opened as a link, so a failure
 * can be reported in the page instead of replacing it with a raw error, and so the
 * request carries the same credentials and headers as every other API call.
 */
export function ExportCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  async function download() {
    setBusy(true);
    setError('');
    try {
      const payload = await api<AccountExport>('/api/account/export');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `cineora-account-${payload.exportedAt.slice(0, 10)}.json`;
      anchor.rel = 'noopener';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Revoked on the next tick: revoking synchronously can cancel the download
      // in some WebViews before it starts.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast('Export downloaded', { tone: 'success' });
    } catch (cause) {
      setError(toFailure(cause).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountCard
      title="Download your data"
      description="A readable JSON file with everything the server holds about this account."
    >
      {error ? <FormAlert className="mb-4">{error}</FormAlert> : null}
      <Button variant="glass" size="md" disabled={busy} onClick={() => void download()} className="w-full sm:w-auto">
        <ExportIcon aria-hidden className="size-4" />
        {busy ? 'Preparing…' : 'Download export'}
      </Button>
      <p className="mt-3 text-xs leading-relaxed text-mist-500">
        The file deliberately contains no password hash, session identifier or reset token: it is going to sit in a
        downloads folder, so it holds what is yours and nothing that could be replayed against the account. Your
        watchlist and history are not in it either, because they are on your device rather than the server.
      </p>
    </AccountCard>
  );
}

/**
 * Account deletion.
 *
 * Three deliberate acts, matching what the endpoint enforces: open the form, type
 * the password, type the phrase. This is the only operation in the account with no
 * undo, so a single mis-tap on a phone must not be able to reach it.
 */
export function DeleteAccountCard() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [wipeDevice, setWipeDevice] = useState(true);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    if (confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION) {
      setFailure({
        message: '',
        fields: { confirmation: `Type ${DELETE_CONFIRMATION} to confirm.` },
        unavailable: false,
      });
      return;
    }

    setPending(true);
    setFailure(NO_FAILURE);
    try {
      await api<{ ok: true }>('/api/account/delete', {
        method: 'POST',
        body: { password, confirmation: confirmation.trim() },
      });
      if (wipeDevice) {
        clearHistory();
        clearRecentSearches();
      }
      setPassword('');
      setConfirmation('');
      await refresh();
      router.replace('/');
    } catch (cause) {
      setFailure(toFailure(cause));
      setPassword('');
    } finally {
      setPending(false);
    }
  }

  return (
    <AccountCard
      tone="danger"
      title="Delete this account"
      description="Removes the account, its profile picture, every session and the security log. It cannot be undone and there is no grace period."
    >
      {failure.message ? <FormAlert className="mb-4">{failure.message}</FormAlert> : null}

      {open ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-ruby-500/30 bg-ruby-500/8 px-3.5 py-3">
            <AlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-ruby-300" />
            <p className="text-xs leading-relaxed text-ruby-100">
              Deleting the account frees the email address and handle for reuse. Download your export first if you
              want a copy — afterwards there is nothing left to export.
            </p>
          </div>

          <PasswordField
            label="Your password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={failure.fields.password}
            required
          />
          <TextField
            label={`Type ${DELETE_CONFIRMATION}`}
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            error={failure.fields.confirmation}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputClassName="uppercase"
            required
          />

          <label className="tap flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={wipeDevice}
              onChange={(event) => setWipeDevice(event.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="mt-px grid size-5 shrink-0 place-items-center rounded-md border border-white/22 bg-white/6 text-transparent transition-colors duration-200 ease-glass peer-checked:border-ruby-400 peer-checked:bg-ruby-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ruby-400"
            >
              <TrashIcon className="size-3" />
            </span>
            <span className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-mist-200">
              Also clear the history and searches stored on this device
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <SubmitButton pending={pending} pendingLabel="Deleting…" disabled={!password || !confirmation}>
              Delete my account
            </SubmitButton>
            <Button
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setPassword('');
                setConfirmation('');
                setFailure(NO_FAILURE);
              }}
              className="w-full sm:w-auto"
            >
              Keep my account
            </Button>
          </div>
        </form>
      ) : (
        <>
          <Button variant="outline" size="md" onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <TrashIcon aria-hidden className="size-4" />
            Delete account
          </Button>
          <p className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-mist-500">
            <DownloadIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Signing out on every device does the same job on a shared computer without losing the account — that is
              on the <span className="text-mist-300">Devices</span> screen.
            </span>
          </p>
        </>
      )}
    </AccountCard>
  );
}





'use client';

import { useEffect, useState } from 'react';
import { AccountCard } from '@/components/account/AccountShell';
import { useAuth } from '@/components/account/AuthProvider';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/Form';
import { DeviceIcon, SpinnerIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/auth/client';
import { toFailure } from '@/lib/auth/form';
import { formatMoment } from '@/lib/auth/labels';
import type { SessionSummary, SessionsResponse } from '@/lib/auth/types';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Signed-in devices.
 *
 * The current session is never listed with a revoke control: ending your own session
 * is what signing out is for, and putting both on one row makes "sign out everywhere
 * else" a coin flip on whether you keep the page you are standing on.
 */

export function SessionList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<SessionsResponse>('/api/security/sessions')
      .then((data) => {
        if (live) setSessions(data.sessions);
      })
      .catch((cause) => {
        if (live) setError(toFailure(cause).message);
      });
    return () => {
      live = false;
    };
  }, []);

  async function revoke(body: { sessionId: string } | { others: true }, key: string, message: string) {
    setBusy(key);
    setError('');
    try {
      const data = await api<SessionsResponse>('/api/security/sessions', { method: 'POST', body });
      setSessions(data.sessions);
      toast(message, { tone: 'success' });
    } catch (cause) {
      setError(toFailure(cause).message);
    } finally {
      setBusy(null);
    }
  }

  const others = sessions?.filter((session) => !session.current) ?? [];
  const zone = user?.preferences.timezone ?? undefined;

  return (
    <>
      <AccountCard
        title="Where you are signed in"
        description="One entry per browser or app that holds a session. Ending a session takes effect on that device's next request."
      >
        {error ? <FormAlert className="mb-4">{error}</FormAlert> : null}

        {!sessions && !error ? (
          <div className="flex items-center gap-2 py-4 text-[0.8125rem] text-mist-500">
            <SpinnerIcon className="size-4" />
            Loading your devices…
          </div>
        ) : null}

        {sessions ? (
          <ul className="divide-y divide-(--glass-line)">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl',
                      session.current ? 'bg-ruby-500/12 text-ruby-300' : 'bg-white/6 text-mist-400',
                    )}
                  >
                    <DeviceIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[0.875rem] font-medium text-white">
                      <span className="truncate">{session.device || 'Unrecognised device'}</span>
                      {session.current ? (
                        <span className="rounded-full border border-ruby-500/35 bg-ruby-500/12 px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-ruby-200 uppercase">
                          This device
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-mist-500">
                      Last active{' '}
                      <span title={formatMoment(session.lastActiveAt, zone)}>
                        {formatRelativeTime(session.lastActiveAt).toLowerCase()}
                      </span>
                      {' · '}
                      Signed in {formatMoment(session.createdAt, zone)}
                    </p>
                    <p className="mt-0.5 text-xs text-mist-500">
                      {session.remember ? 'Stays signed in' : 'Ends when the browser closes'} · Expires{' '}
                      {formatMoment(session.expiresAt, zone)}
                    </p>
                  </div>
                </div>

                {session.current ? null : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => void revoke({ sessionId: session.id }, session.id, 'Device signed out')}
                    className="sm:shrink-0"
                  >
                    {busy === session.id ? 'Signing out…' : 'Sign out'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </AccountCard>

      <AccountCard
        title="Sign out everywhere else"
        description="Ends every session except this one. Use it if you have signed in on a device you no longer have."
      >
        <Button
          variant="glass"
          size="md"
          disabled={busy !== null || others.length === 0}
          onClick={() => void revoke({ others: true }, 'others', 'Other devices signed out')}
          className="w-full sm:w-auto"
        >
          {busy === 'others'
            ? 'Signing out…'
            : others.length === 0
              ? 'No other devices'
              : `Sign out ${others.length} other ${others.length === 1 ? 'device' : 'devices'}`}
        </Button>
      </AccountCard>
    </>
  );
}

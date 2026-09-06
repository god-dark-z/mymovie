'use client';

import { useEffect, useState } from 'react';
import { AccountCard } from '@/components/account/AccountShell';
import { useAuth } from '@/components/account/AuthProvider';
import { FormAlert } from '@/components/ui/Form';
import { AlertIcon, CheckIcon, SpinnerIcon } from '@/components/ui/Icons';
import { api } from '@/lib/auth/client';
import { toFailure } from '@/lib/auth/form';
import { EVENT_LABELS, NOTABLE_EVENTS, formatMoment } from '@/lib/auth/labels';
import type { ActivityItem, ActivityResponse } from '@/lib/auth/types';
import { formatRelativeTime } from '@/lib/utils/format';

/**
 * The account's security log.
 *
 * Read-only, because a log the account holder can edit is a log an intruder can
 * edit. Device labels are guesses derived from a user agent and are described that
 * way — a confident wrong label teaches people to ignore the list.
 */

export function ActivityLog({ limit = 30 }: { limit?: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api<ActivityResponse>(`/api/security/activity?limit=${limit}`)
      .then((data) => {
        if (live) setItems(data.activity);
      })
      .catch((cause) => {
        if (live) setError(toFailure(cause).message);
      });
    return () => {
      live = false;
    };
  }, [limit]);

  return (
    <AccountCard
      title="Recent account activity"
      description="Sign-ins, password changes and device sign-outs. No IP address or location is recorded."
    >
      {error ? <FormAlert>{error}</FormAlert> : null}

      {!items && !error ? (
        <div className="flex items-center gap-2 py-4 text-[0.8125rem] text-mist-500">
          <SpinnerIcon className="size-4" />
          Loading your activity…
        </div>
      ) : null}

      {items && items.length === 0 ? (
        <p className="py-2 text-[0.8125rem] text-mist-500">
          Nothing recorded yet beyond creating this account.
        </p>
      ) : null}

      {items && items.length > 0 ? (
        <ol className="divide-y divide-(--glass-line)">
          {items.map((item) => {
            const notable = NOTABLE_EVENTS.has(item.type);
            return (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className={
                    notable
                      ? 'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-gold-400/12 text-gold-400'
                      : 'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/6 text-mist-500'
                  }
                >
                  {notable ? <AlertIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] font-medium text-white">{EVENT_LABELS[item.type]}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-mist-500">
                    <span title={formatMoment(item.at, user?.preferences.timezone ?? undefined)}>
                      {formatRelativeTime(item.at)}
                    </span>
                    {item.device ? <> · {item.device}</> : null}
                    {item.detail ? <> · {item.detail}</> : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      <p className="mt-4 border-t border-(--glass-line) pt-3 text-xs leading-relaxed text-mist-500">
        Device names are worked out from your browser&rsquo;s own description of itself, so they are
        approximate. If something here was not you, change your password and sign out the other devices.
      </p>
    </AccountCard>
  );
}

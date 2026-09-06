'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountCard } from '@/components/account/AccountShell';
import { useAuth } from '@/components/account/AuthProvider';
import { Avatar } from '@/components/account/Avatar';
import { VerifyEmailNotice } from '@/components/account/VerifyEmailNotice';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/Form';
import {
  BellIcon,
  CheckIcon,
  DeviceIcon,
  DownloadIcon,
  ExportIcon,
  LogOutIcon,
  ShieldIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { api } from '@/lib/auth/client';
import { EVENT_LABELS, formatDay, formatMoment } from '@/lib/auth/labels';
import type { ActivityResponse, SessionsResponse } from '@/lib/auth/types';
import { formatRelativeTime } from '@/lib/utils/format';

/**
 * Account overview.
 *
 * Two summaries are loaded here — device count and the last few security events —
 * because the point of this screen is to answer "is anything wrong with my account"
 * in one glance. Both are best-effort: a failed read leaves the tile blank rather
 * than replacing the whole page with an error.
 */
export function AccountOverview({ justReset }: { justReset: boolean }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<ActivityResponse['activity'] | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [sessions, activity] = await Promise.all([
        api<SessionsResponse>('/api/security/sessions').catch(() => null),
        api<ActivityResponse>('/api/security/activity?limit=4').catch(() => null),
      ]);
      if (!live) return;
      if (sessions) setDeviceCount(sessions.sessions.length);
      if (activity) setRecent(activity.activity);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!user) return null;
  const zone = user.preferences.timezone;

  async function onSignOut() {
    setLeaving(true);
    await signOut();
    router.replace('/');
  }

  return (
    <>
      {justReset ? (
        <FormAlert tone="success">
          Your password was changed and every other device was signed out.
        </FormAlert>
      ) : null}

      {user.emailVerified ? null : <VerifyEmailNotice email={user.email} />}

      <AccountCard>
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-white md:text-lg">
              {user.displayName}
            </p>
            <p className="mt-0.5 truncate text-[0.8125rem] text-mist-400">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-jade-400/30 bg-jade-400/10 px-2 py-0.5 text-[0.6875rem] font-medium text-jade-300">
                  <CheckIcon className="size-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/10 px-2 py-0.5 text-[0.6875rem] font-medium text-gold-400">
                  Unconfirmed email
                </span>
              )}
              {user.username ? (
                <span className="rounded-full border border-(--glass-line) px-2 py-0.5 text-[0.6875rem] text-mist-400">
                  @{user.username}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-4 border-t border-(--glass-line) pt-3.5 text-xs text-mist-500">
          Member since {formatDay(user.createdAt, zone)}
        </p>
      </AccountCard>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Tile
          href="/account/profile"
          icon={<UserIcon className="size-[1.125rem]" />}
          label="Profile"
          value={user.username ? `@${user.username}` : 'Add a handle'}
        />
        <Tile
          href="/account/sessions"
          icon={<DeviceIcon className="size-[1.125rem]" />}
          label="Devices"
          value={
            deviceCount === null
              ? '—'
              : deviceCount === 1
                ? 'This one only'
                : `${deviceCount} signed in`
          }
        />
        <Tile
          href="/account/security"
          icon={<ShieldIcon className="size-[1.125rem]" />}
          label="Security"
          value="Password & log"
        />
        <Tile
          href="/downloads"
          icon={<DownloadIcon className="size-[1.125rem]" />}
          label="Downloads"
          value="Offline library"
        />
      </div>

      <AccountCard
        title="Recent account activity"
        description="The last few things that happened to this account. The full log lives under Security."
      >
        {recent === null ? (
          <p className="text-[0.8125rem] text-mist-500">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-[0.8125rem] text-mist-500">Nothing recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-(--glass-line)">
            {recent.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-mist-100">{EVENT_LABELS[item.type]}</p>
                  <p className="mt-0.5 truncate text-xs text-mist-500">
                    {item.device}
                    {item.detail ? ` · ${item.detail}` : ''}
                  </p>
                </div>
                <time
                  dateTime={new Date(item.at).toISOString()}
                  title={formatMoment(item.at, zone)}
                  className="shrink-0 pt-0.5 text-xs text-mist-500"
                >
                  {formatRelativeTime(item.at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </AccountCard>

      <AccountCard
        title="Notifications and data"
        description="Choose what lands in your inbox, take a copy of your data, or close the account."
      >
        <div className="flex flex-col gap-2">
          <RowLink href="/account/notifications" icon={<BellIcon className="size-[1.0625rem]" />}>
            Email notifications
          </RowLink>
          <RowLink href="/account/privacy" icon={<ExportIcon className="size-[1.0625rem]" />}>
            Privacy, export and deletion
          </RowLink>
        </div>
      </AccountCard>

      <AccountCard>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onSignOut}
          disabled={leaving}
        >
          <LogOutIcon className="size-4" />
          {leaving ? 'Signing out…' : 'Sign out of this device'}
        </Button>
        <p className="mt-3 text-center text-xs text-mist-500">
          Signing out here leaves your other devices alone.{' '}
          <Link href="/account/sessions" className="underline decoration-white/25 underline-offset-4">
            Manage all devices
          </Link>
        </p>
      </AccountCard>
    </>
  );
}

function Tile({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="glass-1 tap flex min-h-[5.5rem] flex-col justify-between rounded-3xl px-3.5 py-3.5 transition-colors duration-200 ease-glass md:hover:bg-white/8"
    >
      <span aria-hidden className="text-mist-400">
        {icon}
      </span>
      <span>
        <span className="block text-[0.6875rem] font-medium tracking-wide text-mist-500 uppercase">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] font-medium text-mist-100">{value}</span>
      </span>
    </Link>
  );
}

function RowLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="tap flex min-h-12 items-center gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 text-[0.8125rem] font-medium text-mist-100 transition-colors duration-200 ease-glass md:hover:bg-white/7"
    >
      <span aria-hidden className="shrink-0 text-mist-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <span aria-hidden className="shrink-0 text-mist-600">
        →
      </span>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/components/account/AuthProvider';
import { ButtonLink } from '@/components/ui/Button';
import { CheckIcon, DownloadIcon, ListIcon, PaletteIcon } from '@/components/ui/Icons';

/**
 * The screen after a confirmed email.
 *
 * Three links, not a tour. Everything it points at is optional, and the primary
 * action is to leave — an onboarding flow that stands between someone and the thing
 * they came for is a cost, not a feature.
 */
export function WelcomePanel({ next }: { next: string }) {
  const { user, status } = useAuth();
  const firstName = user?.displayName.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full border border-jade-400/35 bg-jade-400/12 text-jade-300">
          <CheckIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-white">
            {/* Falls back to a name-free greeting while the session is still loading,
                rather than rendering an empty gap that then reflows. */}
            {status === 'loading' || !firstName ? 'Your account is ready' : `You're in, ${firstName}`}
          </p>
          <p className="text-[0.8125rem] text-mist-400">Email confirmed and signed in.</p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        <NextStep
          href="/account/profile"
          icon={<PaletteIcon className="size-[1.125rem]" />}
          title="Add a picture and a handle"
          detail="Optional. Takes ten seconds."
        />
        <NextStep
          href="/account/preferences"
          icon={<ListIcon className="size-[1.125rem]" />}
          title="Set your playback defaults"
          detail="Preferred server, subtitle language, quality."
        />
        <NextStep
          href="/downloads"
          icon={<DownloadIcon className="size-[1.125rem]" />}
          title="See what you can download"
          detail="Titles Cineora is licensed to hand out offline."
        />
      </ul>

      <div className="flex flex-col gap-2.5">
        <ButtonLink href={next} variant="accent" size="lg" className="w-full">
          Start watching
        </ButtonLink>
        <Link
          href="/account"
          className="tap grid h-12 place-items-center rounded-full text-[0.8125rem] font-medium text-mist-300 md:h-11 md:hover:text-mist-100"
        >
          Go to my account
        </Link>
      </div>
    </div>
  );
}

function NextStep({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="tap flex min-h-14 items-center gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 py-2.5 transition-colors duration-200 ease-glass md:hover:border-(--glass-line-strong) md:hover:bg-white/7"
      >
        <span aria-hidden className="shrink-0 text-mist-400">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] font-medium text-mist-100">{title}</span>
          <span className="block text-xs text-mist-400">{detail}</span>
        </span>
        <span aria-hidden className="shrink-0 text-mist-600">
          →
        </span>
      </Link>
    </li>
  );
}

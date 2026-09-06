'use client';

import { useEffect, useState } from 'react';
import type { PublicUser } from '@/lib/auth/types';
import { cn } from '@/lib/utils/cn';

/**
 * A person's picture, or their initials.
 *
 * A plain `<img>` rather than `next/image`: the source is an authenticated API
 * route on this origin that already returns a fixed 512px WebP, so there is
 * nothing for the optimizer to do and routing it through `/_next/image` would only
 * add a hop that has to carry the session cookie.
 *
 * The initials fallback is not a placeholder — it is the state most accounts stay
 * in, so it is drawn to look deliberate.
 */

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const BOX: Record<AvatarSize, string> = {
  sm: 'size-7 text-[0.625rem]',
  md: 'size-10 text-[0.8125rem]',
  lg: 'size-14 text-base',
  xl: 'size-24 text-2xl',
};

export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => /[\p{L}\p{N}]/u.test(part));
  if (parts.length === 0) return '?';
  const first = [...(parts[0] ?? '')][0] ?? '';
  const last = parts.length > 1 ? ([...(parts[parts.length - 1] ?? '')][0] ?? '') : '';
  return (first + last).toUpperCase();
}

interface AvatarProps {
  user: Pick<PublicUser, 'displayName' | 'avatarUrl'> | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ user, size = 'md', className }: AvatarProps) {
  const src = user?.avatarUrl ?? null;
  const [failed, setFailed] = useState(false);

  // A new upload changes the `?v=` query, so a previous failure must not stick.
  useEffect(() => setFailed(false), [src]);

  const shell = cn(
    'relative grid shrink-0 place-items-center overflow-hidden rounded-full',
    'bg-ink-700 font-display font-semibold text-mist-100 ring-1 ring-white/12',
    BOX[size],
    className,
  );

  if (!src || failed) {
    return (
      <span aria-hidden className={shell}>
        {initialsOf(user?.displayName ?? '')}
      </span>
    );
  }

  return (
    <span aria-hidden className={shell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={512}
        height={512}
        decoding="async"
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    </span>
  );
}

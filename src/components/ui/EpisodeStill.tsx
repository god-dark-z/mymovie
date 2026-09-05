'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BLUR_DATA_URL_WIDE } from '@/lib/metadata/images';

/**
 * Episode still with a fallback that survives a dead URL.
 *
 * Cinemeta advertises a still for every episode it lists, but the underlying
 * pattern URL 404s for episodes that have not aired yet — so a URL being present
 * is not evidence the image exists. Without the error branch those rows keep the
 * blur placeholder forever, which reads as a loading state that never finishes.
 */
export function EpisodeStill({
  src,
  number,
  sizes,
}: {
  src?: string;
  number: number;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      // Decorative: the episode number and title are already in the row heading.
      <span
        aria-hidden
        className="grid size-full place-items-center bg-linear-to-br from-ink-800 to-ink-950 font-display text-[0.6875rem] font-semibold tracking-[0.12em] text-mist-500"
      >
        EP {number}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL_WIDE}
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}

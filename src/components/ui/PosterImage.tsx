'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BLUR_DATA_URL, BLUR_DATA_URL_WIDE } from '@/lib/metadata/images';
import { cn } from '@/lib/utils/cn';

/**
 * Artwork with a real fallback.
 *
 * Open metadata fails two ways: no poster URL at all, and a URL the CDN has
 * stopped serving. Both land on the same typographic plate built from the title,
 * so a dead poster reads as a title card instead of leaving a blur placeholder
 * that never resolves. `sizes` is always explicit so a phone never downloads a
 * desktop-sized image.
 */
export function PosterImage({
  src,
  alt,
  sizes,
  priority,
  className,
  wide = false,
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Use the 16:9 placeholder tone for backdrops and episode stills. */
  wide?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex size-full items-center justify-center bg-linear-to-br from-ink-800 to-ink-950 p-3',
          className,
        )}
      >
        <span className="line-clamp-3 text-center font-display text-[0.6875rem] font-semibold tracking-[0.14em] text-mist-500 uppercase">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL={wide ? BLUR_DATA_URL_WIDE : BLUR_DATA_URL}
      onError={() => setFailed(true)}
      className={cn('size-full object-cover', className)}
    />
  );
}

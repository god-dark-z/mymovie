'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * The cinematic environment behind every authentication screen.
 *
 * Four quiet layers, back to front: the site's own trending artwork, blurred
 * almost past recognition and crossfading on a slow clock; two atmospheric light
 * blooms in the brand's ruby; a pointer-tracking pool of light on desktop; and a
 * static film-grain tile so the dark areas read as photographed space rather
 * than a solid div.
 *
 * Everything is decorative, non-interactive, and motion-governed: reduced-motion
 * holds the first frame and skips the pointer light entirely, the crossfade
 * pauses while the tab is hidden, and the pointer pool exists only where a fine
 * pointer exists.
 */
export function AuthAtmosphere({ backdrops }: { backdrops: string[] }) {
  const [index, setIndex] = useState(0);
  const lightRef = useRef<HTMLDivElement>(null);

  // The slow artwork crossfade. One interval, skipped when hidden or reduced.
  useEffect(() => {
    if (backdrops.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((current) => (current + 1) % backdrops.length);
    }, 9_000);
    return () => window.clearInterval(timer);
  }, [backdrops.length]);

  // The pointer pool. A lerped follower — the light drifts toward the cursor
  // rather than snapping, which is what makes it read as atmosphere rather than
  // a spotlight. rAF-throttled, fine-pointer only.
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!lightRef.current) return;

    const target = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.3 };
    const current = { ...target };
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
    };

    const tick = () => {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      // Skip the style write once the light has caught up: an idle pointer then
      // costs zero paint, and the rAF loop is just two float reads.
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        current.x += dx * 0.06;
        current.y += dy * 0.06;
        if (lightRef.current) {
          lightRef.current.style.transform = `translate3d(${current.x - 288}px, ${current.y - 288}px, 0)`;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="grain fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      {/* The site's own artwork, blurred past recognition — texture, not a subject. */}
      <div className="absolute inset-0">
        {backdrops.map((src, i) => (
          <div
            key={src}
            className={cn(
              'absolute inset-0 transition-opacity duration-[2400ms] ease-soft',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="size-full scale-110 object-cover opacity-[0.16] blur-2xl"
            />
          </div>
        ))}
      </div>

      {/* Scrims: the frame darkens toward the panel side and the base, so type
          always wins over the imagery. */}
      <div className="absolute inset-0 bg-linear-to-b from-ink-950/72 via-ink-950/55 to-ink-950/88" />
      <div className="absolute inset-0 [background:radial-gradient(120%_90%_at_50%_10%,transparent_40%,rgb(5_6_10/0.75)_100%)]" />

      {/* Atmospheric light: one ruby bloom high in the frame, one faint bounce
          low and opposite. Both fixed gradients — zero running cost. */}
      <div className="absolute -left-40 -top-40 size-[34rem] animate-halo rounded-full bg-ruby-500/8 blur-3xl" />
      <div className="absolute -bottom-48 -right-32 size-[30rem] rounded-full bg-white/[0.035] blur-3xl" />

      {/* The pointer pool. transform-only movement, one composited layer. */}
      <div
        ref={lightRef}
        className="pointer-events-none absolute left-0 top-0 hidden size-[36rem] rounded-full md:block"
        style={{
          background:
            'radial-gradient(closest-side, rgb(244 80 106 / 0.06), rgb(244 80 106 / 0.02) 55%, transparent 72%)',
          willChange: 'transform',
        }}
      />
    </div>
  );
}

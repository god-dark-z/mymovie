'use client';

import { Children, isValidElement, useEffect, useMemo, useRef, type ReactElement, type ReactNode } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils/cn';

/**
 * A 3D card-swap stack, adapted for Cineora.
 *
 * Cards sit in a perspective stack and cycle to the front on a timer, animated
 * with GSAP. Built for the home hero: each card is a poster, and the front card
 * drives the info panel beside it via `onIndexChange`.
 *
 * Motion governance: under `prefers-reduced-motion` the cards are placed at their
 * slots once and never animate, and a swap tick is skipped whenever the tab is
 * hidden — an unstoppable background animation is a usability bug, not a flourish.
 */

export interface CardSwapProps {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  /** Milliseconds between swaps. */
  delay?: number;
  pauseOnHover?: boolean;
  skewAmount?: number;
  easing?: 'linear' | 'elastic';
  /** Fires whenever the front card changes (including the initial placement). */
  onIndexChange?: (index: number) => void;
  /** Fires the instant a swap begins — the cue for paired UI (the hero info
      panel) to transition out, so text and artwork swap inside the same window. */
  onSwapStart?: () => void;
  onCardClick?: (index: number) => void;
  className?: string;
  children: ReactNode;
}

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
});

const placeNow = (el: HTMLElement, slot: Slot, skew: number) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  });

export function CardSwap({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  skewAmount = 6,
  easing = 'elastic',
  onIndexChange,
  onSwapStart,
  onCardClick,
  className,
  children,
}: CardSwapProps) {
  const childArr = useMemo(
    () => Children.toArray(children) as ReactElement<{ className?: string; children?: ReactNode }>[],
    [children],
  );

  const order = useRef<number[]>(Array.from({ length: childArr.length }, (_, i) => i));
  const cardEls = useRef<Array<HTMLElement | null>>([]);
  const intervalRef = useRef<number>(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const onScreen = useRef(true);
  const indexChange = useRef(onIndexChange);
  const swapStart = useRef(onSwapStart);
  indexChange.current = onIndexChange;
  swapStart.current = onSwapStart;

  useEffect(() => {
    const config =
      easing === 'elastic'
        ? { ease: 'elastic.out(0.6,0.9)', durDrop: 1.6, durMove: 1.6, durReturn: 1.6, promoteOverlap: 0.9, returnDelay: 0.05 }
        : { ease: 'power1.inOut', durDrop: 0.7, durMove: 0.7, durReturn: 0.7, promoteOverlap: 0.45, returnDelay: 0.2 };

    const total = childArr.length;
    if (total === 0) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cardAt = (i: number) => cardEls.current[i] ?? null;

    cardEls.current.forEach((el, i) => {
      if (el) placeNow(el, makeSlot(i, cardDistance, verticalDistance, total), reduced ? 0 : skewAmount);
    });
    indexChange.current?.(order.current[0] ?? 0);

    if (reduced || total < 2) return;

    const swap = () => {
      // A stack scrolled out of view is invisible work: the timer stays armed,
      // but the frame — and the GSAP timeline — are simply skipped until the
      // stack scrolls back in.
      if (document.hidden || !onScreen.current) return;
      const [front, ...rest] = order.current;
      const elFront = cardAt(front);
      if (!elFront) return;

      // Synchronization contract with the paired UI: `onSwapStart` fires this
      // frame (the partner fades its old state out), and `onIndexChange` fires
      // just before the incoming card settles into the front slot (~0.9s in) —
      // so the new poster and the new title/metadata arrive as one state, and
      // no frame ever shows one side of the old movie beside the other side of
      // the new one.
      swapStart.current?.();
      const nextFront = rest[0];

      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(elFront, { y: '+=500', duration: config.durDrop, ease: config.ease });

      tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);
      tl.call(() => indexChange.current?.(nextFront), undefined, 'promote+=1.1');
      rest.forEach((idx, i) => {
        const el = cardAt(idx);
        if (!el) return;
        const slot = makeSlot(i, cardDistance, verticalDistance, total);
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(el, { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease }, `promote+=${i * 0.15}`);
      });

      const backSlot = makeSlot(total - 1, cardDistance, verticalDistance, total);
      tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
      tl.call(() => gsap.set(elFront, { zIndex: backSlot.zIndex }), undefined, 'return');
      tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease }, 'return');
      tl.call(() => {
        order.current = [...rest, front];
      });    };

    intervalRef.current = window.setInterval(swap, delay);

    // Visibility gate for the timer above.
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry.isIntersecting;
      },
      { threshold: 0.15 },
    );
    if (container.current) observer.observe(container.current);

    const node = container.current;
    const pause = () => {
      tlRef.current?.pause();
      window.clearInterval(intervalRef.current);
    };
    const resume = () => {
      tlRef.current?.play();
      intervalRef.current = window.setInterval(swap, delay);
    };
    if (pauseOnHover && node) {
      node.addEventListener('mouseenter', pause);
      node.addEventListener('mouseleave', resume);
    }

    return () => {
      window.clearInterval(intervalRef.current);
      tlRef.current?.kill();
      observer.disconnect();
      if (pauseOnHover && node) {
        node.removeEventListener('mouseenter', pause);
        node.removeEventListener('mouseleave', resume);
      }
    };
  }, [childArr.length, cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child) ? (
      <div
        key={i}
        ref={(node) => {
          cardEls.current[i] = node?.firstElementChild as HTMLElement | null;
        }}
        className="absolute top-1/2 left-1/2"
        style={{ width, height }}
        onClick={() => onCardClick?.(i)}
      >
        <div
          className={cn(
            'h-full w-full overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-white/12',
            'shadow-[0_30px_60px_-25px_rgba(0,0,0,0.95)] cursor-pointer',
            '[transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden]',
            child.props.className,
          )}
        >
          {child.props.children}
        </div>
      </div>
    ) : null,
  );

  return (
    <div
      ref={container}
      className={cn('relative [perspective:1200px] transform-gpu', className)}
      style={{ width, height }}
    >
      <div className="absolute inset-0 [transform-style:preserve-3d]">{rendered}</div>
    </div>
  );
}

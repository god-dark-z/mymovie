import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'accent' | 'glass' | 'outline' | 'ghost' | 'solid';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<ButtonVariant, string> = {
  accent: 'btn-accent text-white border border-ruby-400/40 hover:brightness-110',
  glass: 'glass-2 text-mist-100 hover:bg-white/12',
  outline: 'border border-white/14 text-mist-100 hover:bg-white/8 hover:border-white/24',
  ghost: 'text-mist-300 hover:text-mist-50 hover:bg-white/8',
  solid: 'bg-mist-50 text-ink-950 hover:bg-white',
};

/**
 * Every size clears 44px on touch and tightens up from `md` where a pointer is
 * likely, so mobile taps stay reliable without bloating desktop chrome.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-4 text-[0.8125rem] md:h-9 md:px-3.5',
  md: 'h-12 px-5 text-sm md:h-11',
  lg: 'h-[3.25rem] px-6 text-[0.9375rem] md:h-12',
  icon: 'size-11 md:size-10',
  'icon-sm': 'size-11 md:size-9',
};

const BASE =
  'tap relative inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-medium leading-none whitespace-nowrap disabled:pointer-events-none disabled:opacity-45';

export function buttonClasses(
  variant: ButtonVariant = 'glass',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface Shared {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  href,
  ...props
}: Shared & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

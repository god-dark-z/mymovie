'use client';

import type { ReactNode } from 'react';
import { CheckIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';

/**
 * Selection primitives for the player sheets.
 *
 * These wrap real `<input type="radio">` / `<input type="checkbox">` elements
 * rather than re-implementing them with divs, so grouping, arrow-key movement,
 * screen-reader announcements and form semantics come from the platform. The
 * inputs are visually hidden but still focusable.
 */
export function OptionList({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('flex flex-col gap-1', className)}>
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}

const ROW =
  'tap flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left has-[:checked]:border-ruby-500/35 has-[:checked]:bg-ruby-500/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ruby-400 md:hover:bg-white/6';

export function OptionRow({
  name,
  value,
  checked,
  onSelect,
  title,
  subtitle,
  badge,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string | null;
  badge?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn(ROW, disabled && 'cursor-not-allowed opacity-45')}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-[0.9375rem] font-medium text-white">{title}</span>
          {badge}
        </span>
        {subtitle ? <span className="mt-0.5 block truncate text-xs text-mist-500">{subtitle}</span> : null}
      </span>
      <CheckIcon
        aria-hidden
        className="size-4.5 shrink-0 text-ruby-300 opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
      />
    </label>
  );
}

export function ToggleRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-(--glass-line) bg-white/4 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[0.875rem] font-medium text-white">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-mist-500">{description}</span>
      </span>
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full bg-white/14 p-0.5 transition-colors duration-200 ease-glass group-has-[:checked]:bg-ruby-500/85 group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-ruby-400"
      >
        <span className="size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-glass group-has-[:checked]:translate-x-4" />
      </span>
    </label>
  );
}

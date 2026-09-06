'use client';

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Button } from '@/components/ui/Button';
import { AlertIcon, CheckIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';

/**
 * Form primitives, built on real inputs.
 *
 * Every control here is a native `<input>` or `<textarea>` with a real `<label>`:
 * autofill, password managers, form submission on Enter, and screen-reader
 * announcements all come from the platform rather than being re-implemented.
 *
 * Sizing is the mobile-first rule used across Cineora — 48px tall on touch,
 * tightening at `md`. Font size stays at or above 16px on the inputs iOS would
 * otherwise zoom into on focus.
 */

const CONTROL_BASE =
  'w-full rounded-2xl border bg-white/5 px-3.5 text-base text-white placeholder:text-mist-500 md:text-[0.9375rem]';
const CONTROL_STATE =
  'border-(--glass-line) transition-colors duration-200 ease-glass focus:border-ruby-400/50 focus:bg-white/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-ruby-400/70 disabled:opacity-50';
const CONTROL_INVALID = 'border-ruby-500/60 bg-ruby-500/8';

export function controlClasses(invalid = false, className?: string): string {
  return cn(CONTROL_BASE, invalid ? CONTROL_INVALID : CONTROL_STATE, className);
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  /** Rendered on the label row — used for "Forgot password?". */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

function FieldShell({ id, label, error, hint, action, children, className }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-display text-[0.8125rem] font-medium text-mist-200">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[0.8125rem] text-ruby-300">
          <AlertIcon aria-hidden className="mt-px size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-mist-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
  inputClassName?: string;
};

export function TextField({ label, error, hint, action, className, inputClassName, ...props }: TextFieldProps) {
  const generated = useId();
  const id = props.name ? `f-${props.name}-${generated}` : generated;

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} action={action} className={className}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={controlClasses(Boolean(error), cn('h-12 md:h-11', inputClassName))}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
};

export function TextAreaField({ label, error, hint, className, ...props }: TextAreaFieldProps) {
  const generated = useId();
  const id = props.name ? `f-${props.name}-${generated}` : generated;

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={controlClasses(Boolean(error), 'min-h-24 resize-y py-3 leading-relaxed')}
        {...props}
      />
    </FieldShell>
  );
}

type PasswordFieldProps = TextFieldProps & {
  /** Renders the strength meter and its guidance. Off for "current password". */
  meter?: { strength: 0 | 1 | 2 | 3 | 4; label: string; hints: readonly string[] } | null;
};

const METER_TONE = ['bg-ruby-500', 'bg-ruby-500', 'bg-gold-400', 'bg-jade-400', 'bg-jade-300'];

/**
 * A password box with a reveal toggle.
 *
 * The toggle exists because the alternative on a phone is a mistyped password the
 * user cannot see, and a "confirm password" field only detects the mistake without
 * explaining it. `type` flips on the same input so an autofill entry is preserved.
 */
export function PasswordField({
  label,
  error,
  hint,
  action,
  className,
  meter,
  ...props
}: PasswordFieldProps) {
  const generated = useId();
  const id = props.name ? `f-${props.name}-${generated}` : generated;
  const [revealed, setRevealed] = useState(false);

  const described = [error ? `${id}-error` : hint ? `${id}-hint` : null, meter ? `${id}-meter` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} action={action} className={className}>
      <div className="relative">
        <input
          id={id}
          type={revealed ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={described || undefined}
          className={controlClasses(Boolean(error), 'h-12 pr-12 md:h-11')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          aria-pressed={revealed}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          className="tap absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-2xl text-mist-400 hover:text-mist-100"
        >
          {revealed ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>

      {meter ? (
        <div id={`${id}-meter`} className="mt-0.5">
          <div className="flex items-center gap-2">
            <div aria-hidden className="flex h-1 flex-1 gap-1">
              {[0, 1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-300 ease-glass',
                    step < meter.strength ? METER_TONE[meter.strength] : 'bg-white/12',
                  )}
                />
              ))}
            </div>
            <span className="w-16 shrink-0 text-right text-[0.6875rem] font-medium text-mist-400">
              {meter.label}
            </span>
          </div>
          {/* Announced politely: strength updates as you type, and an assertive
              region would interrupt on every keystroke. */}
          <p aria-live="polite" className="mt-1.5 text-xs leading-relaxed text-mist-500">
            {meter.hints[0] ?? 'Looks strong.'}
          </p>
        </div>
      ) : null}
    </FieldShell>
  );
}

/** Form-level message: a rate limit, a wrong password, a delivery failure. */
export function FormAlert({
  tone = 'error',
  children,
  className,
}: {
  tone?: 'error' | 'success' | 'info';
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === 'success' ? CheckIcon : AlertIcon;
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-2xl border px-3.5 py-3 text-[0.8125rem] leading-relaxed',
        tone === 'error' && 'border-ruby-500/35 bg-ruby-500/10 text-ruby-100',
        tone === 'success' && 'border-jade-400/30 bg-jade-400/10 text-jade-300',
        tone === 'info' && 'border-(--glass-line) bg-white/5 text-mist-200',
        className,
      )}
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * A submit button that owns its own pending state.
 *
 * `type="submit"` is passed through deliberately — the platform's Enter-to-submit
 * behaviour depends on it, and a form that only responds to a click is broken for
 * anyone using a keyboard or a phone's "go" key.
 */
export function SubmitButton({
  pending,
  children,
  pendingLabel,
  className,
  disabled,
  variant = 'accent',
}: {
  pending: boolean;
  children: ReactNode;
  /** Announced while the request is in flight. */
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'accent' | 'outline' | 'glass' | 'solid';
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size="lg"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={cn('w-full', className)}
    >
      {pending ? (
        <>
          <SpinnerIcon className="size-4" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className' | 'children'> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
};

/**
 * A native select.
 *
 * Deliberately not a custom listbox: the platform control gets the phone's wheel
 * picker, the keyboard's type-to-select, and correct behaviour inside a WebView —
 * none of which a div-based replacement reproduces for free.
 */
export function SelectField({ label, error, hint, options, className, ...props }: SelectFieldProps) {
  const generated = useId();
  const id = props.name ? `f-${props.name}-${generated}` : generated;

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={controlClasses(
            Boolean(error),
            'h-12 appearance-none pr-11 md:h-11 [&>option]:bg-ink-800 [&>option]:text-white',
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-mist-500"
        />
      </div>
    </FieldShell>
  );
}

/**
 * A labelled on/off switch for a settings row.
 *
 * The input, the track and the knob are all siblings so `peer-checked:` can reach
 * the track *and* the knob — the variant compiles to a sibling selector, so a knob
 * nested inside the track would never move.
 */
export function SwitchField({
  label,
  description,
  checked,
  onChange,
  name,
  disabled,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  name?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'tap flex min-h-12 cursor-pointer items-center justify-between gap-4 py-1.5',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.875rem] font-medium text-mist-100">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-mist-500">{description}</span>
        ) : null}
      </span>

      <span className="relative h-6 w-11 shrink-0">
        <input
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-white/16 bg-white/10 transition-colors duration-200 ease-glass peer-checked:border-ruby-400/60 peer-checked:bg-ruby-500 peer-focus-visible:ring-2 peer-focus-visible:ring-ruby-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ink-900"
        />
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white/85 transition-transform duration-200 ease-glass peer-checked:translate-x-5 peer-checked:bg-white"
        />
      </span>
    </label>
  );
}

/** Separator for stacked switch rows inside one card. */
export function SwitchGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-(--glass-line)">{children}</div>;
}

/** A checkbox with a label, used for "Keep me signed in" and consent rows. */
export function CheckboxField({
  label,
  description,
  checked,
  onChange,
  name,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  name?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'tap flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl px-1 py-1.5',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-px grid size-5 shrink-0 place-items-center rounded-md border border-white/22 bg-white/6 text-transparent transition-colors duration-200 ease-glass peer-checked:border-ruby-400 peer-checked:bg-ruby-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ruby-400"
      >
        {/* The tick inherits `currentColor` from the box: `peer-checked:` only
            reaches siblings of the input, never their descendants. */}
        <CheckIcon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8125rem] font-medium text-mist-100">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-mist-500">{description}</span> : null}
      </span>
    </label>
  );
}

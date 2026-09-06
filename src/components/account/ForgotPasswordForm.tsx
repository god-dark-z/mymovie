'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormAlert, SubmitButton, TextField } from '@/components/ui/Form';
import { MailIcon } from '@/components/ui/Icons';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure, type FormFailure } from '@/lib/auth/form';
import { isValidEmail } from '@/lib/auth/policy';
import type { AcknowledgedResponse } from '@/lib/auth/types';

/**
 * Password recovery, step one.
 *
 * The confirmation is identical whether or not the address has an account. That is
 * the whole point of this screen: a "no such account" message would turn a public
 * form into a way to test which addresses are registered, and the person who
 * genuinely owns the mailbox learns the answer from the mailbox.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ email: string; devUrl?: string } | null>(null);
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const address = email.trim();
    if (!isValidEmail(address)) {
      setFailure({ message: '', fields: { email: 'Enter a valid email address.' }, unavailable: false });
      return;
    }

    setPending(true);
    setFailure(NO_FAILURE);
    try {
      const result = await api<AcknowledgedResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: address },
      });
      setSent({ email: address, ...(result.devUrl ? { devUrl: result.devUrl } : {}) });
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid size-12 place-items-center rounded-2xl border border-(--glass-line) bg-white/6 text-ruby-300">
          <MailIcon className="size-6" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Check your inbox</h2>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-mist-400">
            If <span className="font-medium break-all text-mist-100">{sent.email}</span> has a
            Cineora account, a reset link is on its way. It works once and expires in 30
            minutes.
          </p>
        </div>

        {sent.devUrl ? (
          <FormAlert tone="info">
            Development mode: no message was sent.{' '}
            <a href={sent.devUrl} className="font-medium text-mist-100 underline underline-offset-4">
              Open the reset link
            </a>
            .
          </FormAlert>
        ) : null}

        <p className="text-xs leading-relaxed text-mist-500">
          Nothing arrived? Check spam, then confirm you used the address you signed up with.
          We cannot tell you which addresses have accounts.
        </p>

        <div className="flex flex-col gap-2.5">
          <Button variant="outline" size="lg" className="w-full" onClick={() => setSent(null)}>
            Use a different address
          </Button>
          <Link
            href="/login"
            className="tap grid h-12 place-items-center rounded-full text-[0.8125rem] font-medium text-mist-300 md:h-11 md:hover:text-mist-100"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}

      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={failure.fields.email}
        hint="We will send a single-use link that expires in 30 minutes."
        required
        autoFocus
      />

      <SubmitButton pending={pending} pendingLabel="Sending…" className="mt-1">
        Send reset link
      </SubmitButton>
    </form>
  );
}

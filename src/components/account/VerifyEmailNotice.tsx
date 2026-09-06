'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/Form';
import { MailIcon } from '@/components/ui/Icons';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure, type FormFailure } from '@/lib/auth/form';
import type { AcknowledgedResponse } from '@/lib/auth/types';

/**
 * The banner an unconfirmed account sees inside the app.
 *
 * It is a prompt, not a wall: browsing, search and playback all work without a
 * confirmed address. What confirmation unlocks is anything that trusts the mailbox
 * — password recovery, and the download authorisation flow.
 */
export function VerifyEmailNotice({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);

  async function resend() {
    if (pending) return;
    setPending(true);
    setFailure(NO_FAILURE);
    try {
      await api<AcknowledgedResponse>('/api/auth/resend-verification', { method: 'POST' });
      setSent(true);
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gold-400/28 bg-gold-400/8 px-4 py-4 md:px-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 shrink-0 text-gold-400">
          <MailIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[0.9375rem] font-semibold text-white">
            Confirm your email address
          </h2>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-300">
            We sent a link to <span className="font-medium break-all text-mist-100">{email}</span>.
            Until it is confirmed you cannot reset your password by email, and downloads stay
            locked.
          </p>

          {sent ? (
            <div className="mt-3">
              <FormAlert tone="success">
                A new link is on its way. It can take a minute — check spam if it does not arrive.
              </FormAlert>
            </div>
          ) : null}
          {failure.message ? (
            <div className="mt-3">
              <FormAlert>{failure.message}</FormAlert>
            </div>
          ) : null}

          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={resend} disabled={pending || sent}>
              {pending ? 'Sending…' : sent ? 'Email sent' : 'Resend the link'}
            </Button>
            <Link
              href="/verify-email"
              className="tap inline-flex min-h-11 items-center rounded-full px-1 text-[0.8125rem] font-medium text-mist-300 md:min-h-9 md:hover:text-mist-100"
            >
              Enter a code instead
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

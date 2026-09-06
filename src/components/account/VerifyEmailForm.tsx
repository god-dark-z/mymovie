'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { Button } from '@/components/ui/Button';
import { FormAlert, SubmitButton, TextField } from '@/components/ui/Form';
import { CheckIcon, MailIcon, SpinnerIcon } from '@/components/ui/Icons';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure, type FormFailure } from '@/lib/auth/form';
import { isValidEmail } from '@/lib/auth/policy';
import type { AcknowledgedResponse, AuthResultBody } from '@/lib/auth/types';

/**
 * Email confirmation, from either direction.
 *
 * With a token in the URL this runs on mount and the person watches it happen. With
 * no token it asks for the printed code — the fallback that matters when a mail
 * client mangles links, or when the message was opened on a different device from
 * the one being set up.
 *
 * The token is removed from the address bar as soon as it has been sent. It is
 * single-use and already spent by then, but leaving it in the URL would put it in
 * the browser's history and in the `Referer` of anything clicked from this page.
 */

type Phase = 'idle' | 'working' | 'done';

export function VerifyEmailForm({ token, next }: { token: string | null; next: string }) {
  const router = useRouter();
  const { adopt, user, signedIn } = useAuth();

  const [phase, setPhase] = useState<Phase>(token ? 'working' : 'idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);
  const [note, setNote] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const attempted = useRef(false);

  const finish = useCallback(
    (result: AuthResultBody) => {
      adopt(result);
      setPhase('done');
      // A short pause so the confirmation is actually seen rather than flashing past.
      window.setTimeout(() => router.replace(`/welcome?next=${encodeURIComponent(next)}`), 900);
    },
    [adopt, next, router],
  );

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    // Stripped before the request so it is gone from history either way.
    window.history.replaceState(null, '', window.location.pathname);

    void (async () => {
      try {
        finish(await api<AuthResultBody>('/api/auth/verify', { method: 'POST', body: { token } }));
      } catch (error) {
        setFailure(toFailure(error));
        setPhase('idle');
      }
    })();
  }, [token, finish]);

  // Someone already signed in can only be here because the address is unconfirmed,
  // so the address is known and does not need typing again.
  const knownEmail = signedIn ? user?.email ?? '' : '';

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'working') return;

    const address = (knownEmail || email).trim();
    const fields: Record<string, string> = {};
    if (!isValidEmail(address)) fields.email = 'Enter the address the code was sent to.';
    if (code.trim().length < 8) fields.code = 'Enter the eight-character code from the email.';
    if (Object.keys(fields).length > 0) {
      setFailure({ message: '', fields, unavailable: false });
      return;
    }

    setPhase('working');
    setFailure(NO_FAILURE);
    setNote(null);
    try {
      finish(
        await api<AuthResultBody>('/api/auth/verify', {
          method: 'POST',
          body: { email: address, code: code.trim() },
        }),
      );
    } catch (error) {
      setFailure(toFailure(error));
      setPhase('idle');
    }
  }

  async function resend() {
    if (resending) return;
    const address = (knownEmail || email).trim();
    if (!signedIn && !isValidEmail(address)) {
      setFailure({ message: '', fields: { email: 'Enter your address first.' }, unavailable: false });
      return;
    }

    setResending(true);
    setFailure(NO_FAILURE);
    setNote(null);
    try {
      await api<AcknowledgedResponse>('/api/auth/resend-verification', {
        method: 'POST',
        ...(signedIn ? {} : { body: { email: address } }),
      });
      setNote('If that address has an unconfirmed account, a new link is on its way.');
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setResending(false);
    }
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="grid size-12 place-items-center rounded-full border border-jade-400/35 bg-jade-400/12 text-jade-300">
          <CheckIcon className="size-6" />
        </div>
        <p className="font-display text-base font-semibold text-white">Email confirmed</p>
        <p className="text-[0.8125rem] text-mist-400">Signing you in…</p>
      </div>
    );
  }

  if (phase === 'working' && token) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <SpinnerIcon className="size-7 text-ruby-300" />
        <p className="text-[0.875rem] text-mist-300">Confirming your email…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {token === null && !failure.message ? (
        <div className="flex items-start gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 py-3">
          <MailIcon aria-hidden className="mt-px size-4 shrink-0 text-ruby-300" />
          <p className="text-[0.8125rem] leading-relaxed text-mist-400">
            The email contains a link and an eight-character code. Either one works — use the
            code if you opened the message on another device.
          </p>
        </div>
      ) : null}

      {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}
      {note ? <FormAlert tone="success">{note}</FormAlert> : null}

      <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
        {knownEmail ? (
          <p className="text-[0.8125rem] text-mist-400">
            Confirming <span className="font-medium break-all text-mist-100">{knownEmail}</span>.
          </p>
        ) : (
          <TextField
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={failure.fields.email}
            required
          />
        )}

        <TextField
          label="Confirmation code"
          name="code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="ABCD-2345"
          maxLength={9}
          value={code}
          // Upper-cased and hyphenated as it is typed so the field matches the email.
          onChange={(event) => setCode(formatCode(event.target.value))}
          error={failure.fields.code}
          inputClassName="font-mono tracking-[0.18em] uppercase"
          required
        />

        <SubmitButton pending={phase === 'working'} pendingLabel="Confirming…" className="mt-1">
          Confirm email
        </SubmitButton>
      </form>

      <div className="divider" />

      <div className="flex flex-col gap-2.5">
        <Button variant="outline" size="lg" className="w-full" onClick={resend} disabled={resending}>
          {resending ? 'Sending…' : 'Send a new email'}
        </Button>
        <Link
          href={signedIn ? next : '/login'}
          className="tap grid h-12 place-items-center rounded-full text-[0.8125rem] font-medium text-mist-300 md:h-11 md:hover:text-mist-100"
        >
          {signedIn ? 'Do this later' : 'Back to sign in'}
        </Link>
      </div>
    </div>
  );
}

/** `abcd2345` → `ABCD-2345`, matching how the code is printed in the email. */
function formatCode(value: string): string {
  const bare = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return bare.length > 4 ? `${bare.slice(0, 4)}-${bare.slice(4)}` : bare;
}

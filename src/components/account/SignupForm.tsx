'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  CheckboxField,
  FormAlert,
  PasswordField,
  SubmitButton,
  TextField,
} from '@/components/ui/Form';
import { MailIcon } from '@/components/ui/Icons';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure, type FormFailure } from '@/lib/auth/form';
import { assessPassword, displayNameProblem, isValidEmail, LIMITS, passwordProblem } from '@/lib/auth/policy';
import type { AcknowledgedResponse, RegisterResponse } from '@/lib/auth/types';

/**
 * Registration, in two deliberate steps.
 *
 * Splitting name and address from the password keeps each screen to one idea, and
 * it means the strength meter has the name and address to work with by the time it
 * appears — `passwordProblem` refuses a password containing either, so asking for
 * them first is what lets that check run before the request rather than after it.
 *
 * The same rules run here and on the server, from the same module. This copy only
 * exists to answer instantly; the endpoint is still the one that decides.
 */

type Stage = { kind: 'details' } | { kind: 'password' } | { kind: 'sent'; email: string; devUrl?: string };

export function SignupForm() {
  const [stage, setStage] = useState<Stage>({ kind: 'details' });
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);

  const assessment = useMemo(
    () => assessPassword(password, { email: email.trim(), displayName: displayName.trim() }),
    [password, email, displayName],
  );

  function advance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    const address = email.trim();

    const fields: Record<string, string> = {};
    const nameProblem = name.length === 0 ? 'Tell us what to call you.' : displayNameProblem(name);
    if (nameProblem) fields.displayName = nameProblem;
    if (!isValidEmail(address)) fields.email = 'Enter a valid email address.';

    if (Object.keys(fields).length > 0) {
      setFailure({ message: '', fields, unavailable: false });
      return;
    }
    setFailure(NO_FAILURE);
    setStage({ kind: 'password' });
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const name = displayName.trim();
    const address = email.trim();

    const problem = passwordProblem(password, { email: address, displayName: name });
    if (problem) {
      setFailure({ message: '', fields: { password: problem }, unavailable: false });
      return;
    }
    if (!accepted) {
      setFailure({
        message: 'Confirm you understand how Cineora works before creating an account.',
        fields: {},
        unavailable: false,
      });
      return;
    }

    setPending(true);
    setFailure(NO_FAILURE);
    try {
      const result = await api<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: { email: address, password, displayName: name },
      });
      // The password is dropped from memory as soon as it has been sent.
      setPassword('');
      setStage({
        kind: 'sent',
        email: result.email,
        ...(result.devVerificationUrl ? { devUrl: result.devVerificationUrl } : {}),
      });
    } catch (error) {
      const next = toFailure(error);
      setFailure(next);
      // A rejected address belongs to the first step, so send the user back to it.
      if (next.fields.email) setStage({ kind: 'details' });
    } finally {
      setPending(false);
    }
  }

  if (stage.kind === 'sent') {
    return <SignupSent email={stage.email} devUrl={stage.devUrl} />;
  }

  if (stage.kind === 'details') {
    return (
      <form onSubmit={advance} noValidate className="flex flex-col gap-4">
        <StepRail step={1} />
        {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}

        <TextField
          label="Your name"
          name="displayName"
          autoComplete="name"
          enterKeyHint="next"
          placeholder="Ada Lovelace"
          maxLength={LIMITS.displayNameMax}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={failure.fields.displayName}
          hint="Shown on your profile. You can change it later."
          required
        />

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
          maxLength={LIMITS.emailMax}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={failure.fields.email}
          hint="We send one confirmation message here. Nothing else without your say-so."
          required
        />

        <SubmitButton pending={false} className="mt-1">
          Continue
        </SubmitButton>
      </form>
    );
  }

  return (
    <form onSubmit={register} noValidate className="flex flex-col gap-4">
      <StepRail step={2} />
      {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}

      <p className="text-[0.8125rem] text-mist-400">
        Creating the account for{' '}
        <span className="font-medium break-all text-mist-100">{email.trim()}</span>.{' '}
        <button
          type="button"
          onClick={() => {
            setFailure(NO_FAILURE);
            setStage({ kind: 'details' });
          }}
          className="font-medium text-mist-200 underline decoration-white/25 underline-offset-4 md:hover:text-white"
        >
          Change
        </button>
      </p>

      {/* Hidden but present so a password manager files the entry under the right
          account: it reads the username field from the same form as the password. */}
      <input type="hidden" name="username" autoComplete="username" value={email.trim()} readOnly />

      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        enterKeyHint="go"
        maxLength={LIMITS.passwordMax}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={failure.fields.password}
        meter={assessment}
        autoFocus
      />

      <p className="text-xs leading-relaxed text-mist-500">
        At least {LIMITS.passwordMin} characters. A short phrase you will remember beats a
        short word with symbols in it.
      </p>

      <div className="-mx-1">
        <CheckboxField
          label="I understand what Cineora is"
          description="Cineora is a discovery interface over public metadata and third-party players. It is not a rights holder and does not host video."
          checked={accepted}
          onChange={setAccepted}
        />
      </div>

      <SubmitButton pending={pending} pendingLabel="Creating your account…" className="mt-1">
        Create account
      </SubmitButton>
    </form>
  );
}

function StepRail({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2.5">
      <div aria-hidden className="flex flex-1 gap-1.5">
        <span className="h-1 flex-1 rounded-full bg-ruby-500" />
        <span
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ease-glass ${
            step === 2 ? 'bg-ruby-500' : 'bg-white/12'
          }`}
        />
      </div>
      <p className="shrink-0 text-[0.6875rem] font-medium text-mist-500">Step {step} of 2</p>
    </div>
  );
}

/** The state after a successful submission: nothing to do here but read an email. */
function SignupSent({ email, devUrl }: { email: string; devUrl?: string }) {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);

  async function resend() {
    if (pending) return;
    setPending(true);
    setNote(null);
    setFailure(NO_FAILURE);
    try {
      await api<AcknowledgedResponse>('/api/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
      setNote('Sent. It can take a minute to arrive — check spam if it does not.');
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid size-12 place-items-center rounded-2xl border border-(--glass-line) bg-white/6 text-ruby-300">
        <MailIcon className="size-6" />
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-white">Confirm your email</h2>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-mist-400">
          We sent a confirmation link to{' '}
          <span className="font-medium break-all text-mist-100">{email}</span>. Opening it
          finishes setting up your account and signs you in.
        </p>
      </div>

      {/*
        Present only when mail is running in local outbox mode. A configured
        deployment sends the link and never returns it, so this cannot become a way
        to confirm an address from the browser.
      */}
      {devUrl ? (
        <FormAlert tone="info">
          Development mode: no message was sent.{' '}
          <a href={devUrl} className="font-medium text-mist-100 underline underline-offset-4">
            Open the confirmation link
          </a>
          .
        </FormAlert>
      ) : null}

      {note ? <FormAlert tone="success">{note}</FormAlert> : null}
      {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}

      <div className="flex flex-col gap-2.5">
        <Button variant="outline" size="lg" className="w-full" onClick={resend} disabled={pending}>
          {pending ? 'Sending…' : 'Resend the email'}
        </Button>
        <Link
          href="/verify-email"
          className="tap grid h-12 place-items-center rounded-full text-[0.8125rem] font-medium text-mist-300 md:h-11 md:hover:text-mist-100"
        >
          I have a code instead
        </Link>
      </div>
    </div>
  );
}

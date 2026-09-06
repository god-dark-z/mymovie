'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { FormAlert, PasswordField, SubmitButton, TextField } from '@/components/ui/Form';
import { CheckboxField } from '@/components/ui/Form';
import { NO_FAILURE, toFailure, type FormFailure } from '@/lib/auth/form';
import { isValidEmail } from '@/lib/auth/policy';

/**
 * Sign-in.
 *
 * The address is checked for shape before the request goes out — a typo does not
 * deserve a network round trip — but nothing else is pre-judged here. In particular
 * the form never tries to work out whether an account exists; the endpoint answers
 * the same way either way, and duplicating that logic on the client would leak it.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { signIn, status, configured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);

  const disabled = status === 'unavailable' || !configured;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setFailure({ message: '', fields: { email: 'Enter a valid email address.' }, unavailable: false });
      return;
    }
    if (password.length === 0) {
      setFailure({ message: '', fields: { password: 'Enter your password.' }, unavailable: false });
      return;
    }

    setPending(true);
    setFailure(NO_FAILURE);
    try {
      const user = await signIn({ email: trimmed, password, remember });
      // An unverified account can sign in, but the first thing it should see is the
      // one action that unlocks the rest of the product.
      router.replace(user.emailVerified ? next : `/verify-email?next=${encodeURIComponent(next)}`);
    } catch (error) {
      setFailure(toFailure(error));
      setPassword('');
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <FormAlert tone="info">
        Accounts are not switched on for this deployment, so there is nothing to sign in
        to. Everything else on Cineora works without one.
      </FormAlert>
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
        enterKeyHint="next"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={failure.fields.email}
        required
      />

      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        enterKeyHint="go"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={failure.fields.password}
        action={
          <Link
            href="/forgot-password"
            // `py-1 -my-1` buys a 24px-tall hit area without moving the text: the
            // padding grows the box, the negative margin keeps the label row and the
            // baseline exactly where they were.
            className="tap -my-1 py-1 text-xs font-medium text-mist-400 underline decoration-white/20 underline-offset-4 md:hover:text-mist-100"
          >
            Forgot password?
          </Link>
        }
      />

      <div className="-mx-1">
        <CheckboxField
          label="Keep me signed in"
          description="Stays signed in on this device for 30 days. Leave it off on a shared machine."
          name="remember"
          checked={remember}
          onChange={setRemember}
        />
      </div>

      <SubmitButton pending={pending} pendingLabel="Signing in…" className="mt-1">
        Sign in
      </SubmitButton>
    </form>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { FormAlert, PasswordField, SubmitButton } from '@/components/ui/Form';
import { KeyIcon } from '@/components/ui/Icons';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure, type FormFailure } from '@/lib/auth/form';
import { assessPassword, LIMITS, passwordProblem } from '@/lib/auth/policy';
import type { AuthResultBody } from '@/lib/auth/types';

/**
 * Password recovery, step two.
 *
 * The link's token arrives in the query string, because that is the only place a
 * link can carry it. It is moved into component state and erased from the address
 * bar on mount, so it is not left in browser history, in a bookmark, or in the
 * `Referer` header of anything the user clicks from this page.
 *
 * Completing this also signs in and revokes every other session — decided by the
 * endpoint, and stated here so the outcome is not a surprise.
 */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const { adopt } = useAuth();

  const [held, setHeld] = useState<string | null>(token);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<FormFailure>(NO_FAILURE);
  const scrubbed = useRef(false);

  useEffect(() => {
    if (!token || scrubbed.current) return;
    scrubbed.current = true;
    setHeld(token);
    window.history.replaceState(null, '', window.location.pathname);
  }, [token]);

  const assessment = useMemo(() => assessPassword(password), [password]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !held) return;

    const problem = passwordProblem(password);
    if (problem) {
      setFailure({ message: '', fields: { password: problem }, unavailable: false });
      return;
    }
    if (confirm !== password) {
      setFailure({ message: '', fields: { confirm: 'Those do not match.' }, unavailable: false });
      return;
    }

    setPending(true);
    setFailure(NO_FAILURE);
    try {
      const result = await api<AuthResultBody>('/api/auth/reset-password', {
        method: 'POST',
        body: { token: held, password },
      });
      setPassword('');
      setConfirm('');
      adopt(result);
      router.replace('/account?reset=1');
    } catch (error) {
      const next = toFailure(error);
      setFailure(next);
      setPending(false);
      // A rejected password leaves the link usable, so the form stays. Anything else
      // means the token is spent or expired and there is nothing to retry.
      if (!next.fields.password) setHeld(null);
    }
  }

  if (!held) {
    return (
      <div className="flex flex-col gap-4">
        {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}
        <div className="flex items-start gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 py-3">
          <KeyIcon aria-hidden className="mt-px size-4 shrink-0 text-mist-400" />
          <p className="text-[0.8125rem] leading-relaxed text-mist-400">
            Reset links work once and expire after 30 minutes. Request a new one and it will
            replace any earlier link.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="tap grid h-[3.25rem] place-items-center rounded-full border border-white/14 text-[0.9375rem] font-medium text-mist-100 md:h-12 md:hover:bg-white/8"
        >
          Request a new link
        </Link>
        <Link
          href="/login"
          className="tap grid h-12 place-items-center rounded-full text-[0.8125rem] font-medium text-mist-300 md:h-11 md:hover:text-mist-100"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}

      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        enterKeyHint="next"
        maxLength={LIMITS.passwordMax}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={failure.fields.password}
        meter={assessment}
        required
        autoFocus
      />

      <PasswordField
        label="Confirm new password"
        name="confirm"
        autoComplete="new-password"
        enterKeyHint="go"
        maxLength={LIMITS.passwordMax}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={failure.fields.confirm}
        required
      />

      <p className="text-xs leading-relaxed text-mist-500">
        Saving this signs you in here and signs out every other device, in case one of
        them is why you are resetting.
      </p>

      <SubmitButton pending={pending} pendingLabel="Saving…" className="mt-1">
        Set new password
      </SubmitButton>
    </form>
  );
}

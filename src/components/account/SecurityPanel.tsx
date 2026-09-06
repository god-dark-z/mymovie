'use client';

import { useState, type FormEvent } from 'react';
import { AccountCard } from '@/components/account/AccountShell';
import { useAuth } from '@/components/account/AuthProvider';
import { ButtonLink } from '@/components/ui/Button';
import { FormAlert, PasswordField, SubmitButton } from '@/components/ui/Form';
import { KeyIcon, ShieldIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure } from '@/lib/auth/form';
import { assessPassword, passwordProblem } from '@/lib/auth/policy';
import type { AcknowledgedResponse } from '@/lib/auth/types';

/**
 * Password changes and the honest state of everything else.
 *
 * The current password is required by the endpoint, and the form says why: a session
 * left open on a shared machine should not be enough to take an account over.
 */

export function ChangePasswordForm() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState(NO_FAILURE);
  const [done, setDone] = useState(false);

  const meter = assessPassword(password, {
    email: user?.email,
    displayName: user?.displayName,
    username: user?.username ?? undefined,
  });

  function clear() {
    setCurrent('');
    setPassword('');
    setConfirm('');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const problem = passwordProblem(password, {
      email: user?.email,
      displayName: user?.displayName,
      username: user?.username ?? undefined,
    });
    if (problem) {
      setDone(false);
      setFailure({ message: 'Choose a stronger password.', fields: { password: problem }, unavailable: false });
      return;
    }
    if (password !== confirm) {
      setDone(false);
      setFailure({
        message: 'Those passwords do not match.',
        fields: { confirm: 'This does not match the password above.' },
        unavailable: false,
      });
      return;
    }

    setPending(true);
    setFailure(NO_FAILURE);
    setDone(false);
    try {
      await api<AcknowledgedResponse>('/api/security/change-password', {
        method: 'POST',
        body: { currentPassword: current, password },
      });
      // Cleared immediately: there is no reason for either value to stay in a live
      // input, and a filled form invites a second submission that would now fail.
      clear();
      setDone(true);
      toast('Password changed', { tone: 'success' });
    } catch (cause) {
      const next = toFailure(cause);
      setFailure(next);
      // The new password is kept so a rejected "current password" does not cost the
      // work of typing the new one again.
      if (next.fields.password) setPassword('');
    } finally {
      setPending(false);
    }
  }

  return (
    <AccountCard
      title="Password"
      description="Changing it signs out every other device. This one stays signed in."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}
        {done ? (
          <FormAlert tone="success">
            Your password was changed and every other device was signed out. We have emailed you about it.
          </FormAlert>
        ) : null}

        <PasswordField
          label="Current password"
          name="currentPassword"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          autoComplete="current-password"
          required
          error={failure.fields.currentPassword}
        />

        <PasswordField
          label="New password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          error={failure.fields.password}
          meter={password.length > 0 ? meter : null}
        />

        <PasswordField
          label="Repeat new password"
          name="confirm"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          required
          error={failure.fields.confirm}
        />

        <div className="flex flex-col gap-2 pt-1 md:flex-row md:justify-end">
          <SubmitButton
            pending={pending}
            pendingLabel="Saving…"
            disabled={!current || !password || !confirm}
            className="md:w-auto md:min-w-40"
          >
            Change password
          </SubmitButton>
        </div>
      </form>
    </AccountCard>
  );
}

/**
 * What Cineora does not have yet.
 *
 * Stated plainly rather than shown as a switch that stores a flag. A toggle labelled
 * "two-factor authentication" that does not add a second factor is worse than
 * nothing: it tells someone they are protected when they are not.
 */
export function SecurityStatusCard() {
  return (
    <AccountCard title="How this account is protected">
      <ul className="flex flex-col gap-3">
        <Row
          icon={<KeyIcon className="size-4" />}
          title="Password hashing"
          body="Your password is stored only as a slow, salted scrypt hash. Nobody at Cineora can read it, and it is never emailed to you."
        />
        <Row
          icon={<ShieldIcon className="size-4" />}
          title="Session cookies"
          body="Sessions live in an HttpOnly cookie that scripts cannot read, are validated on the server on every request, and can be revoked per device."
        />
        <Row
          icon={<ShieldIcon className="size-4" />}
          title="Two-factor authentication"
          body="Not available yet. When it ships you will set it up here — until then this account is protected by its password alone, so make that password a good one."
          muted
        />
      </ul>
    </AccountCard>
  );
}

function Row({
  icon,
  title,
  body,
  muted = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  muted?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className={
          muted
            ? 'mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-white/5 text-mist-500'
            : 'mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-jade-500/12 text-jade-300'
        }
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.875rem] font-medium text-white">
          {title}
          {muted ? (
            <span className="ml-2 rounded-full border border-(--glass-line) px-1.5 py-0.5 align-middle text-[0.625rem] font-medium tracking-wide text-mist-400 uppercase">
              Planned
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-mist-400">{body}</p>
      </div>
    </li>
  );
}

/** Pointer to the device screen, so "somebody else is signed in" has an exit. */
export function DevicesShortcut() {
  return (
    <AccountCard
      title="Signed-in devices"
      description="Review where this account is signed in and end any session you do not recognise."
    >
      <ButtonLink href="/account/sessions" variant="glass" size="sm" className="self-start">
        Manage devices
      </ButtonLink>
    </AccountCard>
  );
}

'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { AccountCard } from '@/components/account/AccountShell';
import { AvatarPicker } from '@/components/account/AvatarPicker';
import { ButtonLink } from '@/components/ui/Button';
import { FormAlert, SubmitButton, TextAreaField, TextField } from '@/components/ui/Form';
import { CheckIcon, MailIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/auth/client';
import { NO_FAILURE, toFailure } from '@/lib/auth/form';
import { displayNameProblem, LIMITS, usernameProblem } from '@/lib/auth/policy';
import type { PublicUser, UserResponse } from '@/lib/auth/types';

/**
 * Profile editing.
 *
 * Only changed fields are sent. The endpoint patches partially, so sending the
 * whole object would mean a screen that does not know about a future field could
 * quietly reset it — and it would also log "changed: display name" for a save where
 * nothing changed at all.
 */

export function ProfileForm() {
  const { user } = useAuth();
  // The account shell holds its children back until the session has resolved, so a
  // null user here is the signed-out case rather than a form waiting for data. The
  // resolved user is handed down as a prop, which keeps the fields below — and the
  // submit handler, where a render-time narrowing would not reach — free of null
  // checks, and makes the initial field values impossible to capture as empty.
  if (!user) return null;
  return <ProfileFields user={user} />;
}

function ProfileFields({ user }: { user: PublicUser }) {
  const { setUser } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState(NO_FAILURE);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(
    () =>
      displayName.trim() !== user.displayName ||
      username.trim() !== (user.username ?? '') ||
      bio.trim() !== (user.bio ?? ''),
    [user, displayName, username, bio],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const name = displayName.trim();
    const handle = username.trim().toLowerCase();
    const about = bio.trim();

    const nameProblem =
      name.length < LIMITS.displayNameMin
        ? `Use at least ${LIMITS.displayNameMin} characters.`
        : displayNameProblem(name);
    const handleProblem = handle.length > 0 ? usernameProblem(handle) : null;

    if (nameProblem || handleProblem) {
      setSaved(false);
      setFailure({
        message: 'Check the highlighted fields.',
        fields: {
          ...(nameProblem ? { displayName: nameProblem } : {}),
          ...(handleProblem ? { username: handleProblem } : {}),
        },
        unavailable: false,
      });
      return;
    }

    // Only what actually differs, so the activity log stays truthful.
    const patch: Record<string, string> = {};
    if (name !== user.displayName) patch.displayName = name;
    if (handle !== (user.username ?? '')) patch.username = handle;
    if (about !== (user.bio ?? '')) patch.bio = about;

    setPending(true);
    setFailure(NO_FAILURE);
    setSaved(false);
    try {
      const result = await api<UserResponse>('/api/profile', { method: 'PATCH', body: patch });
      setUser(result.user);
      setDisplayName(result.user.displayName);
      setUsername(result.user.username ?? '');
      setBio(result.user.bio ?? '');
      setSaved(true);
      toast('Profile saved', { tone: 'success' });
    } catch (cause) {
      setFailure(toFailure(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AccountCard
        title="Profile picture"
        description="Shown next to your name in the account area. It is never shared publicly."
      >
        <AvatarPicker />
      </AccountCard>

      <AccountCard title="Your details" description="Your display name is the only required field.">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {failure.message ? <FormAlert>{failure.message}</FormAlert> : null}
          {saved && !dirty ? <FormAlert tone="success">Your profile has been saved.</FormAlert> : null}

          <TextField
            label="Display name"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            maxLength={LIMITS.displayNameMax}
            required
            error={failure.fields.displayName}
            hint="How Cineora addresses you."
          />

          <TextField
            label="Handle"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/\s+/g, ''))}
            autoComplete="username"
            inputMode="text"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={LIMITS.usernameMax}
            placeholder="optional"
            error={failure.fields.username}
            hint="Letters, numbers, dots and underscores. Leave it empty if you would rather not have one."
            inputClassName="lowercase"
          />

          <TextAreaField
            label="About you"
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={LIMITS.bioMax}
            rows={3}
            error={failure.fields.bio}
            hint={`${bio.trim().length} of ${LIMITS.bioMax} characters.`}
          />

          <div className="flex flex-col gap-2 pt-1 md:flex-row md:justify-end">
            <SubmitButton
              pending={pending}
              pendingLabel="Saving…"
              disabled={!dirty}
              className="md:w-auto md:min-w-40"
            >
              Save changes
            </SubmitButton>
          </div>
        </form>
      </AccountCard>

      <AccountCard
        title="Email address"
        description="Your address identifies the account, so it is changed through its own confirmed flow rather than a field here."
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 py-3">
            <MailIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-mist-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.875rem] text-white">{user.email}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-mist-500">
                {user.emailVerified ? (
                  <>
                    <CheckIcon aria-hidden className="size-3.5 text-jade-400" />
                    Confirmed
                  </>
                ) : (
                  'Not confirmed yet'
                )}
              </p>
            </div>
          </div>
          {user.emailVerified ? null : (
            <ButtonLink href="/verify-email" variant="glass" size="sm" className="self-start">
              Confirm this address
            </ButtonLink>
          )}
        </div>
      </AccountCard>
    </>
  );
}

'use client';

import { AccountCard } from '@/components/account/AccountShell';
import { SaveState, usePreferenceSaver } from '@/components/account/usePreferenceSaver';
import { FormAlert, SwitchField, SwitchGroup } from '@/components/ui/Form';
import { LockIcon, MailIcon } from '@/components/ui/Icons';

/**
 * Email preferences.
 *
 * Split into what cannot be switched off and what can. The security notices are
 * listed rather than offered as switches because an intruder who can silence the
 * one message that reveals them has been handed the account; the message itself
 * says why it arrived and cannot be stopped.
 *
 * The two optional switches control mail Cineora does not send today. They are
 * still here, and still off by default, because consent has to exist before the
 * first message rather than be assumed after it.
 */

const ALWAYS_SENT = [
  'Confirming your email address when you sign up or change it.',
  'A password reset link, but only when someone asks for one.',
  'A notice when your password is changed.',
  'A notice when someone tries to sign up with your address, so you know it is already yours.',
  'A goodbye when the account is deleted.',
];

export function NotificationsForm() {
  const { preferences, save, pending, saved, error } = usePreferenceSaver();
  if (!preferences) return null;

  return (
    <>
      {error ? <FormAlert>{error}</FormAlert> : null}

      <AccountCard
        title="Sign-in alerts"
        description="A short note when your account is used on a device it has not been used on before."
      >
        <SwitchGroup>
          <SwitchField
            label="Email me about new sign-ins"
            description="Includes the rough device description and the time in your zone. No location, because none is recorded."
            checked={preferences.notifications.accountActivity}
            onChange={(value) => save({ notifications: { accountActivity: value } })}
          />
        </SwitchGroup>
        <div className="mt-3">
          <SaveState pending={pending} saved={saved} error={error} />
        </div>
      </AccountCard>

      <AccountCard
        title="Optional email"
        description="Cineora sends none of this today. Your answer is stored now so that nothing is ever sent on an assumption."
      >
        <SwitchGroup>
          <SwitchField
            label="Product updates"
            description="Occasional notes about new features. Off unless you turn it on."
            checked={preferences.notifications.productUpdates}
            onChange={(value) => save({ notifications: { productUpdates: value } })}
          />
          <SwitchField
            label="Announcements"
            description="Wider announcements about the service. Also off unless you turn it on."
            checked={preferences.notifications.emailAnnouncements}
            onChange={(value) => save({ notifications: { emailAnnouncements: value } })}
          />
        </SwitchGroup>
        <div className="mt-3">
          <SaveState pending={pending} saved={saved} error={error} />
        </div>
      </AccountCard>

      <AccountCard
        title="Email that cannot be switched off"
        description="Five messages, all of them about the security of this account or a request you made."
      >
        <ul className="flex flex-col gap-2.5">
          {ALWAYS_SENT.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-mist-300">
              <MailIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-mist-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2.5 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 py-3 text-xs leading-relaxed text-mist-400">
          <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-mist-500" />
          <span>
            Anyone who took over your account could otherwise mute the one message that reveals it, so these stay
            on. Your address is never shared, sold or used for anything else.
          </span>
        </p>
      </AccountCard>
    </>
  );
}

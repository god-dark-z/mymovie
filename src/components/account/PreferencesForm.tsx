'use client';

import { useMemo } from 'react';
import { AccountCard } from '@/components/account/AccountShell';
import { SaveState, usePreferenceSaver } from '@/components/account/usePreferenceSaver';
import { Button } from '@/components/ui/Button';
import { FormAlert, SelectField, SwitchField, SwitchGroup } from '@/components/ui/Form';
import { CheckIcon } from '@/components/ui/Icons';
import type { AccountPreferences } from '@/lib/auth/types';
import { LANGUAGE_OPTIONS } from '@/lib/nxsha/languages';
import { updatePlaybackPreferences } from '@/lib/storage';
import { cn } from '@/lib/utils/cn';

/**
 * Appearance, language, playback defaults and accessibility.
 *
 * Everything rendered here changes something observable. Two fields the data model
 * carries are deliberately not exposed as controls: there is no autoplay-next
 * switch, because Cineora cannot see when a Nxsha episode ends and a switch that
 * silently does nothing is worse than no switch at all; and quality is offered as a
 * download default rather than a playback one, because the player documents no
 * quality parameter to send.
 */

type Appearance = AccountPreferences['appearance'];

const APPEARANCES: ReadonlyArray<{
  value: Appearance;
  label: string;
  description: string;
  swatch: string;
}> = [
  { value: 'dark', label: 'Dark', description: 'Deep ink, a trace of blue.', swatch: 'bg-ink-900' },
  { value: 'midnight', label: 'Midnight', description: 'True black, kinder to OLED.', swatch: 'bg-black' },
];

const QUALITIES: ReadonlyArray<{ value: AccountPreferences['playback']['preferredQuality']; label: string }> = [
  { value: 'auto', label: 'Best available' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
];

const LANGUAGE_CHOICES: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Let the source decide' },
  ...LANGUAGE_OPTIONS.map((option) => ({
    value: option.code,
    label: option.label === option.native ? option.label : `${option.label} · ${option.native}`,
  })),
];

const deviceZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Every zone the runtime knows, with the stored one guaranteed present.
 *
 * A native select is right for a list this long: phones give it a wheel picker and
 * desktop keyboards give it type-to-select, neither of which a custom listbox gets
 * for free.
 */
function zoneOptions(current: string): Array<{ value: string; label: string }> {
  let known: string[] = [];
  try {
    known = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  } catch {
    known = [];
  }
  const unique = [...new Set([current, deviceZone(), 'UTC', ...known].filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  return unique.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));
}

export function PreferencesForm() {
  const { preferences, save, pending, saved, error } = usePreferenceSaver();
  const zones = useMemo(() => zoneOptions(preferences?.timezone ?? 'UTC'), [preferences?.timezone]);
  if (!preferences) return null;

  const local = deviceZone();

  return (
    <>
      {error ? <FormAlert>{error}</FormAlert> : null}

      <AccountCard title="Appearance" description="Cineora is a dark product. Pick how dark.">
        <fieldset>
          <legend className="sr-only">Appearance</legend>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            {APPEARANCES.map((option) => (
              <label key={option.value} className="tap relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="appearance"
                  value={option.value}
                  checked={preferences.appearance === option.value}
                  onChange={() => save({ appearance: option.value })}
                  className="peer sr-only"
                />
                {/* Sibling of the input, not a descendant: `peer-checked:` compiles
                    to a sibling selector and cannot reach inside another element. */}
                <span className="flex items-center gap-3 rounded-2xl border border-(--glass-line) bg-white/4 p-3 transition-colors duration-200 ease-glass peer-checked:border-ruby-400/60 peer-checked:bg-ruby-500/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ruby-400/70">
                  <span
                    aria-hidden
                    className={cn(
                      'size-9 shrink-0 rounded-xl border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                      option.swatch,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-medium text-white">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-mist-500">{option.description}</span>
                  </span>
                  {preferences.appearance === option.value ? (
                    <CheckIcon aria-hidden className="size-4 shrink-0 text-ruby-300" />
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3">
          <SaveState pending={pending} saved={saved} error={error} />
        </div>
      </AccountCard>

      <AccountCard
        title="Language and region"
        description="Your time zone decides how every date on your account is written — sign-ins, devices, the security log."
      >
        <SelectField
          label="Time zone"
          name="timezone"
          options={zones}
          value={preferences.timezone}
          onChange={(event) => save({ timezone: event.target.value })}
          hint={`Dates are shown in this zone. This device reports ${local}.`}
        />
        {preferences.timezone === local ? null : (
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => save({ timezone: local })}>
              Use {local}
            </Button>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-(--glass-line) bg-white/4 px-3.5 py-3">
          <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-medium text-mist-100">
            Interface language: English
            <span className="rounded-full border border-white/14 px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-mist-400 uppercase">
              Only option today
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-mist-500">
            Cineora&rsquo;s own text has not been translated yet, so offering a list here would change nothing.
            Audio and subtitle languages are separate and do work — they are below.
          </p>
        </div>
        <div className="mt-3">
          <SaveState pending={pending} saved={saved} error={error} />
        </div>
      </AccountCard>

      <AccountCard
        title="Playback defaults"
        description="Applied to this device now, and used as the starting point on any device you sign in to. The player's own language menu still wins for a single title."
      >
        <div className="flex flex-col gap-4">
          <SelectField
            label="Preferred audio"
            name="preferredAudio"
            options={LANGUAGE_CHOICES}
            value={preferences.playback.preferredAudio ?? ''}
            onChange={(event) => {
              const code = event.target.value;
              save({ playback: { preferredAudio: code } });
              updatePlaybackPreferences({ language: code || null });
            }}
            hint="Sent as the documented lang parameter. It asks the source to preselect that track — it cannot add one that is not there."
          />
          <SelectField
            label="Preferred subtitles"
            name="preferredSubtitle"
            options={LANGUAGE_CHOICES}
            value={preferences.playback.preferredSubtitle ?? ''}
            onChange={(event) => {
              const code = event.target.value;
              save({ playback: { preferredSubtitle: code } });
              updatePlaybackPreferences({ subtitle: code || null });
            }}
            hint="Sent as the documented sub parameter, with the same caveat."
          />
          <SelectField
            label="Download quality"
            name="preferredQuality"
            options={QUALITIES}
            value={preferences.playback.preferredQuality}
            onChange={(event) =>
              save({
                playback: {
                  preferredQuality: event.target.value as AccountPreferences['playback']['preferredQuality'],
                },
              })
            }
            hint="Preselects a file on the download sheet. Streaming quality is chosen by the source, which exposes no setting for it."
          />
        </div>
        <div className="mt-3">
          <SaveState pending={pending} saved={saved} error={error} />
        </div>
      </AccountCard>

      <AccountCard
        title="Accessibility"
        description="These follow your account, so they are already on the next device you sign in to. Your system settings are respected on their own — this is for overriding them here."
      >
        <SwitchGroup>
          <SwitchField
            label="Reduce motion"
            description="Removes the fades and slide-ins. Nothing functional depends on them."
            checked={preferences.accessibility.reduceMotion}
            onChange={(value) => save({ accessibility: { reduceMotion: value } })}
          />
          <SwitchField
            label="Reduce transparency"
            description="Replaces the frosted glass with solid panels. Also the cheapest setting to render on an older phone."
            checked={preferences.accessibility.reduceTransparency}
            onChange={(value) => save({ accessibility: { reduceTransparency: value } })}
          />
          <SwitchField
            label="Larger text"
            description="Scales the interface up. Layouts reflow rather than clip."
            checked={preferences.accessibility.largerText}
            onChange={(value) => save({ accessibility: { largerText: value } })}
          />
          <SwitchField
            label="Higher contrast"
            description="Brightens borders and dimmed text against the dark background."
            checked={preferences.accessibility.highContrast}
            onChange={(value) => save({ accessibility: { highContrast: value } })}
          />
        </SwitchGroup>
        <div className="mt-3">
          <SaveState pending={pending} saved={saved} error={error} />
        </div>
      </AccountCard>



    </>
  );
}


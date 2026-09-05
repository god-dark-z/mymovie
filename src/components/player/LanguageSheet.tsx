'use client';

import { OptionList, OptionRow } from '@/components/player/SheetControls';
import { InlineNotice } from '@/components/ui/ErrorState';
import { Sheet } from '@/components/ui/Sheet';
import { LANGUAGE_OPTIONS, type LanguageOption } from '@/lib/nxsha/languages';
import { joinNonEmpty } from '@/lib/utils/format';

export type LanguageTrack = 'audio' | 'subtitle';

/**
 * Audio / subtitle preference picker.
 *
 * Nxsha documents `lang` and `sub` as *preferences* — they ask its player to
 * preselect a track — and publishes nothing that reports which tracks a given
 * title carries. So this sheet offers valid ISO 639-1 codes and says plainly that
 * availability depends on the source. Nothing here claims a title has a language.
 */
const COPY: Record<
  LanguageTrack,
  { title: string; description: string; defaultLabel: string; defaultNote: string; note: string }
> = {
  audio: {
    title: 'Audio language',
    description: 'Sent as the documented lang parameter, asking the player to preselect that audio track.',
    defaultLabel: 'Player default',
    defaultNote: 'Let the source decide — no language is requested',
    note: 'Cineora cannot list which audio tracks a title actually carries, because Nxsha publishes no API for that. This is a request; the player’s own menu is the final word.',
  },
  subtitle: {
    title: 'Subtitles',
    description: 'Sent as the documented sub parameter, asking the player to preselect that subtitle track.',
    defaultLabel: 'Player default',
    defaultNote: 'Let the source decide — no subtitle language is requested',
    note: 'Subtitle availability belongs to the source, and there is no documented way to read it in advance. If the track you asked for is missing, open the player’s own subtitle menu.',
  },
};

export function LanguageSheet({
  open,
  onClose,
  track,
  value,
  priority,
  hint,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  track: LanguageTrack;
  /** ISO 639-1 code, or null for the player default. */
  value: string | null;
  /** Codes to surface first. An ordering hint only. */
  priority?: string[];
  hint?: string;
  onPick: (code: string | null) => void;
}) {
  const copy = COPY[track];
  const options = order(priority);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={copy.title}
      description={joinNonEmpty([copy.description, hint], ' ')}
      size="md"
    >
      <OptionList label={copy.title}>
        <OptionRow
          name={`language-${track}`}
          value=""
          checked={value === null}
          onSelect={() => onPick(null)}
          title={copy.defaultLabel}
          subtitle={copy.defaultNote}
        />
        {options.map((option) => (
          <OptionRow
            key={option.code}
            name={`language-${track}`}
            value={option.code}
            checked={value === option.code}
            onSelect={() => onPick(option.code)}
            title={option.label}
            subtitle={option.native === option.label ? null : option.native}
          />
        ))}
      </OptionList>

      <InlineNotice className="mt-4">{copy.note}</InlineNotice>
    </Sheet>
  );
}

/** Stable sort that lifts the hinted codes to the top, preserving list order. */
function order(priority?: string[]): LanguageOption[] {
  if (!priority || priority.length === 0) return LANGUAGE_OPTIONS;
  const rank = (code: string) => {
    const index = priority.indexOf(code);
    return index === -1 ? priority.length : index;
  };
  return [...LANGUAGE_OPTIONS].sort((a, b) => rank(a.code) - rank(b.code));
}

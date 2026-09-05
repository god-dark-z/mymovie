import { nxshaPlaybackProvider } from '@/lib/playback/providers/nxsha';
import type {
  PlaybackBlockReason,
  PlaybackPreferences,
  PlaybackProvider,
  PlaybackSource,
  PlaybackTarget,
} from '@/lib/playback/types';

/**
 * Picks the first provider that has a documented endpoint for a target.
 *
 * Only Nxsha is wired up today, because it is the only integration we verified.
 * The seam matters though: an `AnimeProvider` (or any replacement) can be added
 * to `PROVIDERS` and every watch screen keeps working unchanged.
 */
class PlaybackManager {
  private readonly providers: PlaybackProvider[];

  constructor(providers: PlaybackProvider[]) {
    this.providers = providers;
  }

  get primary(): PlaybackProvider {
    return this.providers[0]!;
  }

  providerFor(target: PlaybackTarget): PlaybackProvider | null {
    return this.providers.find((provider) => provider.supports(target)) ?? null;
  }

  resolve(
    target: PlaybackTarget,
    preferences: PlaybackPreferences,
  ): { source: PlaybackSource; provider: PlaybackProvider } | { reason: PlaybackBlockReason } {
    if (this.providers.length === 0) return { reason: 'no-provider' };

    const provider = this.providerFor(target);
    if (!provider) {
      // Every provider needs an identifier it recognises; the usual cause is a
      // title with neither an IMDb nor a TMDb id in the metadata.
      return { reason: 'missing-identifier' };
    }

    const source = provider.buildSource(target, preferences);
    if (!source) return { reason: 'unsupported-target' };

    return { source, provider };
  }
}

const PROVIDERS: PlaybackProvider[] = [nxshaPlaybackProvider];

export const playback = new PlaybackManager(PROVIDERS);

import { Suspense } from 'react';
import { DetailHero } from '@/components/detail/DetailHero';
import { EpisodeBrowser } from '@/components/detail/EpisodeBrowser';
import { FactList } from '@/components/detail/FactList';
import { PlayButton } from '@/components/detail/PlayButton';
import { RelatedRail } from '@/components/detail/RelatedRail';
import { WatchlistButton } from '@/components/detail/WatchlistButton';
import { DownloadButton } from '@/components/downloads/DownloadButton';
import { JsonLd } from '@/components/seo/JsonLd';
import { InlineNotice } from '@/components/ui/ErrorState';
import { RailSkeleton } from '@/components/ui/Skeleton';
import { firstAiredEpisode, isPlayable } from '@/lib/playback/availability';
import { titleStructuredData } from '@/lib/seo/structured-data';
import { offerFor } from '@/server/downloads/catalog';
import type { MediaDetail } from '@/types/media';

/**
 * Shared body for `/movie/[id]`, `/tv/[id]` and `/anime/[id]`.
 *
 * The three routes differ only in how the id resolves; once a normalized
 * `MediaDetail` exists the page is identical, so the layout lives here and the
 * route files stay thin.
 */
export function TitlePage({
  detail,
  initialSeason,
}: {
  detail: MediaDetail;
  /** Preselects a season, e.g. arriving from an episode link. */
  initialSeason?: number;
}) {
  const episodic = detail.kind !== 'movie';
  const start = episodic ? firstAiredEpisode(detail.episodes) : undefined;

  // No usable identifier means no documented embed URL exists for this title, so
  // there is no Play button to offer — the alternative is a button that leads to
  // an error screen.
  const playable = isPlayable(detail.kind, detail.ids, start);
  const awaitingEpisodes = episodic && detail.episodes.length > 0 && start === undefined;

  // Resolved on the server, from the operator's own catalogue. Almost always null:
  // Cineora holds no rights to what the metadata and playback providers serve, so a
  // Download button appears only where the deployment has declared its own files.
  const offer = offerFor(detail.id);

  return (
    <div className="animate-fade-in pb-shell">
      <JsonLd data={titleStructuredData(detail)} />
      <DetailHero
        detail={detail}
        actions={
          <>
            {playable && !awaitingEpisodes ? (
              <PlayButton id={detail.id} kind={detail.kind} start={start} />
            ) : null}
            <WatchlistButton media={detail} />
            {offer ? <DownloadButton offer={offer} /> : null}
            {!playable ? (
              <InlineNotice tone="warning" className="mt-1 basis-full">
                This title has no IMDb or TMDb identifier in the catalogue, so no playback source can
                be requested for it.
              </InlineNotice>
            ) : null}
          </>
        }
      />

      <div className="gutter-x mt-10 md:mt-12">
        {episodic && detail.episodes.length > 0 ? (
          // The base column is pinned to minmax(0,1fr) rather than left to `auto`. An
          // auto track takes its floor from the widest min-content inside it, and the
          // season rail is a row of unwrappable pills, so on a phone the track grew to
          // the rail's full scroll width and pushed every episode row past the clip
          // edge of the page.
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
            <EpisodeBrowser
              id={detail.id}
              kind={detail.kind}
              seasons={detail.seasons}
              episodes={detail.episodes}
              initialSeason={initialSeason}
            />
            <div className="lg:pt-1">
              <FactList detail={detail} />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl">
            {episodic ? (
              <InlineNotice className="mb-6">
                The catalogue lists no episodes for this title yet.
              </InlineNotice>
            ) : null}
            <FactList detail={detail} />
          </div>
        )}
      </div>

      <div className="mt-12 md:mt-16">
        <Suspense fallback={<RailSkeleton count={6} />}>
          <RelatedRail detail={detail} />
        </Suspense>
      </div>
    </div>
  );
}

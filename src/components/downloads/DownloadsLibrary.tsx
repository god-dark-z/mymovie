'use client';

import { useState } from 'react';
import { DownloadSheet } from '@/components/downloads/DownloadSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CloseIcon, DownloadIcon, TrashIcon } from '@/components/ui/Icons';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useMounted } from '@/hooks/useMounted';
import { usePersistentStore } from '@/hooks/usePersistentStore';
import { formatBytes, qualityLabel, type DownloadOffer } from '@/lib/downloads/types';
import { kindLabel } from '@/lib/metadata/classify';
import { clearDownloads, downloadsStore, forgetDownload, type DownloadRecord } from '@/lib/storage';
import { formatRelativeTime, joinNonEmpty } from '@/lib/utils/format';

/**
 * The downloads screen.
 *
 * Two lists, and they are honestly different things. The first is what this
 * deployment is licensed to hand out — the same catalogue every visitor sees. The
 * second is what this browser has started, which is a note kept on the device:
 * nothing here can see the filesystem, so a file that was cancelled, moved or
 * deleted still appears until it is removed, and the screen says so plainly rather
 * than presenting itself as an offline library it cannot verify.
 */
export function DownloadsLibrary({ offers }: { offers: DownloadOffer[] }) {
  const mounted = useMounted();
  const records = usePersistentStore(downloadsStore);
  const [active, setActive] = useState<DownloadOffer | null>(null);

  return (
    <div className="gutter-x flex flex-col gap-11 md:gap-14">
      <section aria-labelledby="downloads-available">
        <SectionHeader
          id="downloads-available"
          title="Available to download"
          subtitle={
            offers.length === 0
              ? 'Nothing is licensed for download on this deployment'
              : `${offers.length} ${offers.length === 1 ? 'title' : 'titles'} this deployment is licensed to distribute`
          }
        />
        {offers.length === 0 ? (
          <EmptyState
            icon={<DownloadIcon />}
            title="No downloads are offered yet"
            description="Cineora plays from sources it does not own, so it never offers those streams as files. Only titles this deployment holds distribution rights for can appear here, and none are configured."
            action={{ label: 'Browse titles', href: '/' }}
          />
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {offers.map((offer) => (
              <OfferRow key={offer.titleId} offer={offer} onOpen={() => setActive(offer)} />
            ))}
          </ul>
        )}
      </section>

      {/* Rendered only after mount: this list lives in device storage, so the server
          has no idea what belongs in it and drawing it during hydration would flash. */}
      {mounted && records.length > 0 ? (
        <section aria-labelledby="downloads-device">
          <SectionHeader
            id="downloads-device"
            title="Started on this device"
            subtitle="A note kept in this browser, not a view of your storage"
          />
          <ul className="mt-4 flex flex-col gap-2">
            {records.map((record) => (
              <RecordRow key={record.key} record={record} onForget={() => forgetDownload(record.key)} />
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-mist-500">
              Removing an entry only clears it from this list. The files themselves belong to your device&rsquo;s
              downloads folder or to the app that fetched them, and Cineora cannot reach either.
            </p>
            <Button variant="ghost" size="sm" onClick={clearDownloads} className="self-start">
              <TrashIcon aria-hidden className="size-4" />
              Clear this list
            </Button>
          </div>
        </section>
      ) : null}

      {active ? <DownloadSheet offer={active} open onClose={() => setActive(null)} /> : null}
    </div>
  );
}

/** One licensed title. Sizes are summed across every file the offer contains. */
function OfferRow({ offer, onOpen }: { offer: DownloadOffer; onOpen: () => void }) {
  const episodes = new Set(offer.items.map((item) => item.group).filter((group) => group !== null)).size;
  const total = offer.items.reduce((sum, item) => sum + item.sizeBytes, 0);

  return (
    <li className="glass-flat flex items-center gap-4 rounded-2xl px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium text-white">{offer.title}</p>
        <p className="mt-1 truncate text-xs text-mist-500">
          {joinNonEmpty([
            kindLabel(offer.kind, offer.kind === 'anime'),
            episodes > 0 ? `${episodes} ${episodes === 1 ? 'episode' : 'episodes'}` : null,
            `${offer.items.length} ${offer.items.length === 1 ? 'file' : 'files'}`,
            formatBytes(total),
          ])}
        </p>
      </div>
      <Button variant="glass" size="sm" aria-haspopup="dialog" onClick={onOpen} className="shrink-0">
        Choose
      </Button>
    </li>
  );
}

/**
 * One entry from the device list.
 *
 * No progress and no status, because there is none to report: once the file is
 * handed to the browser or to a host's download manager, Cineora is out of the
 * loop. What it can say truthfully is what was asked for, how large it was, when,
 * and which of the two paths took it.
 */
function RecordRow({ record, onForget }: { record: DownloadRecord; onForget: () => void }) {
  return (
    <li className="glass-flat flex items-center gap-3 rounded-2xl px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium text-white">{record.title}</p>
        <p className="mt-1 truncate text-xs text-mist-500">
          {joinNonEmpty([
            record.group,
            qualityLabel(record.quality),
            formatBytes(record.sizeBytes),
            formatRelativeTime(record.startedAt),
            record.handoff === 'native' ? 'In-app downloader' : 'Browser download',
          ])}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onForget}
        aria-label={`Remove ${record.fileName} from this list`}
        className="shrink-0"
      >
        <CloseIcon aria-hidden className="size-4" />
      </Button>
    </li>
  );
}

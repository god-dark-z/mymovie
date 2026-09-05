import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ExternalIcon } from '@/components/ui/Icons';
import { formatDate } from '@/lib/utils/format';
import type { MediaDetail } from '@/types/media';

interface Fact {
  label: string;
  value: string;
}

/**
 * Credits and production facts. Rows are built from what the provider actually
 * returned, so nothing renders as "Unknown" or an empty value.
 */
export function FactList({ detail }: { detail: MediaDetail }) {
  const facts: Fact[] = [];
  const push = (label: string, value?: string | null) => {
    if (value) facts.push({ label, value });
  };
  const list = (label: string, values: string[], max = 8) => {
    if (values.length > 0) facts.push({ label, value: values.slice(0, max).join(', ') });
  };

  list('Cast', detail.cast, 10);
  list(detail.directors.length > 1 ? 'Directors' : 'Director', detail.directors, 4);
  list(detail.creators.length > 1 ? 'Creators' : 'Created by', detail.creators, 4);
  list(detail.writers.length > 1 ? 'Writers' : 'Writer', detail.writers, 4);
  push('Released', formatDate(detail.releaseDate) ?? detail.releaseInfo);
  push('Status', detail.status);
  push('Country', detail.country);
  push('Runtime', detail.runtime);
  push('Awards', detail.awards);
  list('Also known as', detail.alternativeTitles, 4);

  if (facts.length === 0 && !detail.imdbUrl) return null;

  return (
    <GlassPanel className="p-5 md:p-6">
      <h2 className="text-[0.6875rem] font-semibold tracking-[0.16em] text-mist-500 uppercase">
        Details
      </h2>

      {facts.length > 0 ? (
        <dl className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[0.75rem] text-mist-500">{fact.label}</dt>
              <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-mist-200 text-pretty">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {detail.imdbUrl ? (
        <Link
          href={detail.imdbUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="tap mt-5 inline-flex h-9 items-center gap-1.5 text-[0.75rem] text-mist-400 transition-colors duration-200 md:hover:text-mist-100"
        >
          View on IMDb
          <ExternalIcon className="size-3.5" />
        </Link>
      ) : null}
    </GlassPanel>
  );
}

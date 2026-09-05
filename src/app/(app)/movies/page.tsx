import type { Metadata } from 'next';
import { HubPage, hubMetadata, type HubSearchParams } from '@/components/browse/HubPage';
import { HUBS, parseGenre, parsePage, parseSort, type BrowseQuery } from '@/lib/metadata/browse';

const hub = HUBS.movies;

interface PageProps {
  searchParams: Promise<HubSearchParams>;
}

async function resolve(searchParams: PageProps['searchParams']): Promise<BrowseQuery> {
  const params = await searchParams;
  return {
    sort: parseSort(params.sort),
    genre: parseGenre(hub, params.genre),
    page: parsePage(params.page),
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return hubMetadata(hub, await resolve(searchParams));
}

export default async function MoviesPage({ searchParams }: PageProps) {
  return <HubPage hub={hub} query={await resolve(searchParams)} />;
}

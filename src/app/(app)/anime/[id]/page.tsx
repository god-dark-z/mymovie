import type { Metadata } from 'next';
import { TitlePage } from '@/components/detail/TitlePage';
import { loadTitle, titleMetadata } from '@/lib/metadata/title-route';
import { parseSegmentNumber } from '@/lib/playback/routes';

export const revalidate = 21600;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return titleMetadata(await loadTitle('anime', id));
}

export default async function AnimePage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await loadTitle('anime', id);
  return (
    <TitlePage detail={detail} initialSeason={parseSegmentNumber(query.season, 0) ?? undefined} />
  );
}

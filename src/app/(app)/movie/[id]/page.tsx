import type { Metadata } from 'next';
import { TitlePage } from '@/components/detail/TitlePage';
import { loadTitle, titleMetadata } from '@/lib/metadata/title-route';

/** Title metadata changes rarely; six hours matches the provider cache. */
export const revalidate = 21600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return titleMetadata(await loadTitle('movie', id));
}

export default async function MoviePage({ params }: PageProps) {
  const { id } = await params;
  const detail = await loadTitle('movie', id);
  return <TitlePage detail={detail} />;
}

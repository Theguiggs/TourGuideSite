import type { Metadata } from 'next';
import { LocalizedGuidePage, guideMetadata } from '../../../guides/[guideSlug]/page';

export const dynamic = 'force-dynamic';

interface GuidePageProps {
  params: Promise<{ guideSlug: string }>;
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { guideSlug } = await params;
  return guideMetadata(guideSlug, 'en');
}

export default async function EnglishGuideProfilePage(props: GuidePageProps) {
  return LocalizedGuidePage({ ...props, locale: 'en' });
}

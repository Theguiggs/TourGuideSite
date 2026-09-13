import type { Metadata } from 'next';
import Link from 'next/link';
import { MesVisitesContent } from '@/components/catalogue/mes-visites-content';
import { PageTitle } from '@murmure/design-system/web';
import { publicPath, publicUrl } from '@/lib/seo/urls';

export const metadata: Metadata = {
  title: 'My tours',
  description: 'Find the audio tours you purchased with your Murmure account.',
  robots: {index: false, follow: false},
  // Espace personnel : canonical auto-référente, aucun groupe hreflang — une
  // page `noindex` ne peut pas participer à un groupe réciproque.
  alternates: { canonical: publicUrl('/mes-achats', 'en') },
};

export default function MyPurchasesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-body text-ink-60 mb-6" aria-label="Breadcrumb">
        <Link href={publicPath('/catalogue', 'en')} className="hover:text-grenadine">Catalogue</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">My tours</span>
      </nav>
      <PageTitle className="mb-2">My tours</PageTitle>
      <MesVisitesContent locale="en" />
    </div>
  );
}

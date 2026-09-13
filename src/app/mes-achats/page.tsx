import { extendCopy } from '@/lib/i18n/translate';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MesVisitesContent } from '@/components/catalogue/mes-visites-content';
import { PageTitle } from '@murmure/design-system/web';

export const metadata: Metadata = {
  title: 'Mes visites',
  description: 'Retrouvez les visites audio que vous avez achetées.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/mes-achats',
    languages: extendCopy({fr: '/mes-achats', en: '/en/my-purchases'}),
  },
};

export default function MesVisitesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-body text-ink-60 mb-6" aria-label="Fil d'Ariane">
        <Link href="/catalogue" className="hover:text-grenadine">
          Catalogue
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Mes visites</span>
      </nav>

      <PageTitle className="mb-2">Mes visites</PageTitle>

      {/* Owner-scoped purchases resolved client-side (localStorage Cognito session). */}
      <MesVisitesContent />
    </div>
  );
}

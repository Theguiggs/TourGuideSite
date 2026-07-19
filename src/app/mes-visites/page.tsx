import type { Metadata } from 'next';
import Link from 'next/link';
import { MesVisitesContent } from '@/components/catalogue/mes-visites-content';

export const metadata: Metadata = {
  title: 'Mes achats — Murmure',
  description: 'Retrouvez les visites audio que vous avez achetées.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/mes-visites',
    languages: {fr: '/mes-visites', en: '/en/my-purchases'},
  },
};

export default function MesVisitesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-ink-60 mb-6" aria-label="Fil d'Ariane">
        <Link href="/catalogue" className="hover:text-grenadine">
          Catalogue
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Mes achats</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">Mes achats</h1>

      {/* Owner-scoped purchases resolved client-side (localStorage Cognito session). */}
      <MesVisitesContent />
    </div>
  );
}

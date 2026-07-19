import type { Metadata } from 'next';
import Link from 'next/link';
import { MesVisitesContent } from '@/components/catalogue/mes-visites-content';

export const metadata: Metadata = {
  title: 'My purchases - Murmure',
  description: 'Find the audio tours you purchased with your Murmure account.',
  robots: {index: false, follow: false},
  alternates: {
    canonical: '/en/my-purchases',
    languages: {fr: '/mes-visites', en: '/en/my-purchases'},
  },
};

export default function MyPurchasesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-ink-60 mb-6" aria-label="Breadcrumb">
        <Link href="/en/catalogue" className="hover:text-grenadine">Catalogue</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">My purchases</span>
      </nav>
      <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">My purchases</h1>
      <MesVisitesContent locale="en" />
    </div>
  );
}

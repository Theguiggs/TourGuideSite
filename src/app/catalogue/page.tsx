import type { InterfaceLocale } from '@/lib/i18n/locales';
import type { Metadata } from 'next';
import { catalogueMetadata } from '@/lib/seo/catalogue-metadata';
import { getCities, getAllTours } from '@/lib/api/tours-server';
import TrackPageView from '@/components/TrackPageView';
import { AnalyticsEvents } from '@/lib/analytics';
import { CatalogueViewCities } from './catalogue-view-cities';
import { MyPurchasesStripClient } from '@/components/catalogue/my-purchases-strip-client';

// Force dynamic rendering: server AppSync client reads cookies (generateServerClientUsingCookies),
// which is incompatible with static ISR. Switch to force-dynamic so Next.js doesn't attempt to
// statically pre-render the page at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = catalogueMetadata('fr');

export async function LocalizedCataloguePage({ searchParams, locale = 'fr' }: { searchParams: Promise<{ q?: string | string[] }>; locale?: InterfaceLocale }) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.slice(0, 120) : '';
  const [cities, tours] = await Promise.all([getCities(), getAllTours()]);

  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_CATALOGUE_BROWSE} />
      {/* Owner-scoped purchases resolved client-side (localStorage Cognito session). */}
      <MyPurchasesStripClient locale={locale} />
      <CatalogueViewCities key={query} cities={cities} tours={tours} initialQuery={query} locale={locale} />
    </>
  );
}

export default function CataloguePage(props: { searchParams: Promise<{ q?: string | string[] }> }) {
  return LocalizedCataloguePage({ ...props, locale: 'fr' });
}

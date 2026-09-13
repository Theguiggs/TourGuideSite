import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import Link from 'next/link';
import { Clock3, MapPin } from 'lucide-react';
import { getAllTours } from '@/lib/api/tours-server';
import { homeSelection } from '@/lib/catalogue/home-selection';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';
import { getCityAccent } from '@/lib/cities/accent-map';
import { tg } from '@murmure/design-system/tokens';
import { HomeResume } from './home-resume';
import { localizeTour, METADATA_FALLBACK_COPY } from '@/lib/catalogue/localized-tour';
import { publicPath } from '@/lib/seo/urls';

export async function HomeCatalogue({ locale }: { locale: InterfaceLocale }) {
  let selection: ReturnType<typeof homeSelection>;
  try { selection = homeSelection((await getAllTours()).map(tour => localizeTour(tour, locale))); }
  catch { selection = homeSelection([]); }
  
  const t = (fr: string, en: string) => translate(locale, fr, en);
  return <section aria-labelledby="home-tours-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
    <HomeResume tours={selection.resumeTours} locale={locale} />
    <h2 id="home-tours-title" className="font-display text-h4 sm:text-h3 text-ink">{t('Où souhaitez-vous aller ?', 'Where would you like to go?')}</h2>
    {selection.cities.length ? <>
      <nav aria-label={t('Destinations disponibles', 'Available destinations')} className="my-6 flex flex-wrap gap-2">
        {selection.cities.slice(0, 8).map(city => <Link key={city.slug} href={publicPath(`/catalogue/${city.slug}`, locale)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-pill border border-line bg-card px-4 py-2 text-body text-ink no-underline hover:border-grenadine">
          <MapPin size={16} className="shrink-0" aria-hidden="true" /><span className="break-words">{city.name}</span>
        </Link>)}
      </nav>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6" data-testid="home-tour-selection">
        {selection.featured.map(tour => <Link prefetch={false} key={tour.id} href={publicPath(`/catalogue/${tour.citySlug}/${tour.slug}`, locale)} data-testid="home-tour" className="flex min-w-0 flex-col rounded-lg p-5 text-ink no-underline sm:p-6" style={{ background: tg.colors[`${getCityAccent(tour.citySlug)}Soft`] }}>
          <span className="text-body font-semibold">{tour.city}</span>
          <h3 className="my-4 break-words font-display text-h5 leading-tight">{tour.title}</h3>
          {tour.metadataFallback && <p className="mb-3 text-caption text-ink-60">{METADATA_FALLBACK_COPY[locale]}</p>}
          <div className="mt-auto flex flex-wrap items-center gap-3 text-caption">
            {Number.isFinite(tour.duration) && tour.duration > 0 && <span className="inline-flex items-center gap-1"><Clock3 size={16} aria-hidden="true" />{tour.duration} min</span>}
            <TourPriceBadge tour={tour} locale={locale} />
          </div>
          <span className="mt-5 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{t('Découvrir cette visite', 'Discover this tour')}</span>
        </Link>)}
      </div>
    </> : <p role="status" className="my-6 max-w-2xl text-body text-ink-80">{t('Les suggestions ne sont pas disponibles pour le moment. Vous pouvez consulter le catalogue ou revenir un peu plus tard.', 'Suggestions are not available right now. You can browse the catalogue or come back shortly.')}</p>}
    <Link href={publicPath('/catalogue', locale)} className="mt-6 inline-flex min-h-11 items-center text-body font-semibold text-grenadine underline underline-offset-4">{t('Voir toutes les destinations', 'View all destinations')}</Link>
  </section>;
}

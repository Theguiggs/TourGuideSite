import { Suspense } from 'react';
import Link from 'next/link';
import { Headphones, MapPin, Footprints, Search } from 'lucide-react';
import TrackPageView from '@/components/TrackPageView';
import { AnalyticsEvents } from '@/lib/analytics';
import { HomeCatalogue } from './home-catalogue';

export function VisitorHome({ locale }: { locale: 'fr' | 'en' }) {
  const t = (fr: string, en: string) => locale === 'fr' ? fr : en;
  const prefix = locale === 'en' ? '/en' : '';
  const steps = [
    { icon: MapPin, title: t('Choisissez votre visite', 'Choose your tour'), body: t('Trouvez une ville et une histoire qui vous donnent envie.', 'Find a city and a story you want to explore.') },
    { icon: Headphones, title: t('Écoutez un extrait', 'Listen to a preview'), body: t('Découvrez la voix et le récit avant de vous décider.', 'Get a feel for the voice and story before you choose.') },
    { icon: Footprints, title: t('Explorez à votre rythme', 'Explore at your own pace'), body: t('Lancez votre visite sur le site et faites une pause quand vous le souhaitez.', 'Play your tour on the website and pause whenever you like.') },
  ];
  return <>
    <TrackPageView event={AnalyticsEvents.WEB_LANDING_VISIT} properties={{ locale }} />
    <section className="bg-paper" aria-labelledby="home-title">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-16">
        <div>
          <h1 id="home-title" className="max-w-2xl font-display text-h4 leading-tight text-ink sm:text-h3 lg:text-h2">{t('Découvrez la ville autrement.', 'Hear a different side of the city.')}</h1>
          <p className="mt-4 max-w-xl text-body text-ink-80 sm:text-body-lg">{t('Choisissez une visite audio, écoutez un extrait et laissez les lieux vous raconter leurs histoires.', 'Choose an audio tour, listen to a preview and discover the stories behind the places.')}</p>
        </div>
        <div>
          <form action={`${prefix}/catalogue`} method="get" role="search" aria-label={t('Trouver une visite', 'Find a tour')} className="rounded-lg bg-card p-4 sm:p-6">
            <label htmlFor="home-city" className="mb-2 block text-body font-semibold text-ink">{t('Dans quelle ville ?', 'Which city?')}</label>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <input id="home-city" name="q" type="search" autoComplete="off" placeholder={t('Nom d’une ville', 'City name')} maxLength={120} className="min-h-11 w-full min-w-0 rounded-md border border-line bg-paper px-3 py-3 text-body text-ink focus:border-grenadine focus:outline-none focus:ring-2 focus:ring-grenadine-soft" />
              <button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-pill bg-grenadine px-5 py-3 text-body font-bold text-paper"><Search size={18} aria-hidden="true" />{t('Trouver une visite', 'Find a tour')}</button>
            </div>
          </form>
          <Link href={locale === 'en' ? '/en/my-purchases' : '/mes-achats'} className="mt-2 inline-flex min-h-11 items-center gap-2 text-body font-semibold text-grenadine underline underline-offset-4"><Headphones size={18} aria-hidden="true" />{t('Mes visites', 'My tours')}</Link>
        </div>
      </div>
    </section>
    <Suspense fallback={<div role="status" className="mx-auto min-h-64 max-w-7xl px-4 py-8 text-body text-ink-60">{t('Chargement des destinations…', 'Loading destinations…')}</div>}>
      <HomeCatalogue locale={locale} />
    </Suspense>
    <section className="bg-paper-soft py-10 sm:py-16" aria-labelledby="home-how">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="home-how" className="font-display text-h4 text-ink sm:text-h3">{t('Votre prochaine visite commence ici.', 'Your next tour starts here.')}</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, index) => <li key={title} className="max-w-md">
            <div className="flex items-center gap-3 text-grenadine"><Icon size={24} aria-hidden="true" /><span className="text-body font-semibold">{index + 1}</span></div>
            <h3 className="mt-3 font-display text-h5 text-ink">{title}</h3><p className="mt-2 text-body text-ink-80">{body}</p>
          </li>)}
        </ol>
      </div>
    </section>
    <section className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
      <div><h2 className="font-display text-h5 text-ink">{t('Vous connaissez les histoires de votre ville ?', 'Know the stories of your city?')}</h2><p className="mt-2 text-body text-ink-80">{t('Partagez-les en créant vos propres visites audio.', 'Share them by creating your own audio tours.')}</p></div>
      <Link href={locale === 'en' ? '/en/create-tours' : '/creer-des-visites'} className="inline-flex min-h-11 shrink-0 items-center text-body font-semibold text-grenadine underline underline-offset-4">{t('Créer des visites', 'Create tours')}</Link>
    </section>
  </>;
}

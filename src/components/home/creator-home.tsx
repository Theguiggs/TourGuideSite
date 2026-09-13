import Link from 'next/link';
import { CreatorActions } from './creator-actions';
import { helpAnchorHref } from '@/lib/help-anchors';
import { translate } from '@/lib/i18n/translate';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';

export function CreatorHome({ locale }: { locale: InterfaceLocale }) {
  const t = (fr: string, en: string) => translate(locale, fr, en);
  const steps = [
    { anchor: 'creer' as const, title: t('Créez', 'Create'), body: t('Choisissez un titre et une ville pour votre parcours.', 'Choose a title and a city for your tour.') },
    { anchor: 'tracer' as const, title: t('Tracez', 'Map'), body: t('Placez vos points d’intérêt sur la carte et dessinez votre itinéraire.', 'Place points of interest on the map and shape your route.') },
    { anchor: 'raconter' as const, title: t('Racontez', 'Tell'), body: t('Écrivez, enregistrez votre voix ou utilisez la narration de synthèse.', 'Write, record your voice or use text-to-speech narration.') },
    { anchor: 'publier' as const, title: t('Publiez', 'Publish'), body: t('Traduisez votre visite et soumettez-la pour publication.', 'Translate your tour and submit it for publication.') },
  ];
  const benefits = [
    [t('Vos histoires, votre voix', 'Your stories, your voice'), t('Choisissez les lieux, le ton et les récits que vous souhaitez partager.', 'Choose the places, tone and stories you want to share.')],
    [t('Des outils réunis', 'Tools in one place'), t('Carte, enregistrement, transcription et traduction vous accompagnent dans le Studio.', 'Maps, recording, transcription and translation support your work in the Studio.')],
    [t('Vos visites et vos ventes', 'Your tours and sales'), t('Retrouvez vos parcours et suivez vos revenus depuis votre espace créateur.', 'Find your tours and track your revenue in your creator space.')],
  ];
  return <>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
      <h1 className="max-w-3xl font-display text-h4 text-ink sm:text-h3 lg:text-h2">{t('Donnez de la voix à votre ville.', 'Give your city a voice.')}</h1>
      <p className="mt-4 max-w-2xl text-body text-ink-80 sm:text-body-lg">{t('Transformez votre connaissance des lieux en visites audio que les voyageurs peuvent découvrir et écouter.', 'Turn your local knowledge into audio tours for travellers to discover and listen to.')}</p>
      <CreatorActions locale={locale} />
    </section>
    <section className="bg-paper-soft py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-h4 text-ink sm:text-h3">{t('Comment créer une visite ?', 'How do you create a tour?')}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => <li key={step.anchor}><Link href={helpAnchorHref(locale, step.anchor)} className="block h-full rounded-md bg-card p-5 text-ink no-underline"><span className="font-display text-h5 text-grenadine">{index + 1}</span><h3 className="mt-3 font-display text-h5">{step.title}</h3><p className="mt-2 text-body text-ink-80">{step.body}</p></Link></li>)}
        </ol>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h2 className="font-display text-h4 text-ink sm:text-h3">{t('Pourquoi créer sur Murmure ?', 'Why create with Murmure?')}</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">{benefits.map(([title, body]) => <div key={title}><h3 className="font-display text-h5 text-ink">{title}</h3><p className="mt-2 text-body text-ink-80">{body}</p></div>)}</div>
      <Link href={localizePublicPath('/catalogue', locale)} className="mt-8 inline-flex min-h-11 items-center text-body font-semibold text-grenadine underline underline-offset-4">{t('Découvrir les visites publiées', 'Discover published tours')}</Link>
    </section>
  </>;
}

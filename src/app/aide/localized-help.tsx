import Link from 'next/link';
import AidePage from './page';
import EnglishHelpPage from '../en/help/page';
import { VisitorHelp } from '@/components/catalogue/visitor-help';
import { CreatorActions } from '@/components/home/creator-actions';
import { LEGAL_IDENTITY } from '@/lib/legal/identity';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { HELP_COPY } from './_translated-content';
import StepCard from './_components/StepCard';
import Faq from './_components/Faq';

export function LocalizedHelpPage({locale}: {locale: InterfaceLocale}) {
  if (locale === 'fr') return <AidePage />;
  if (locale === 'en') return <EnglishHelpPage />;
  const copy = HELP_COPY[locale];
  return <>
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <p className="font-semibold text-grenadine">{copy.eyebrow}</p>
      <h1 className="mt-4 max-w-3xl break-words font-display text-h3 text-ink md:text-h2">{copy.title}</h1>
      <p className="mt-4 max-w-3xl text-body-lg text-ink-80">{copy.subtitle}</p>
    </section>
    <VisitorHelp locale={locale} />
    <section className="bg-paper-soft py-12"><div className="mx-auto max-w-3xl px-4 sm:px-6">
      <h2 className="font-display text-h4 text-ink">{copy.what}</h2><p className="mt-4 text-body-lg text-ink-80">{copy.introduction}</p>
    </div></section>
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h2 className="font-display text-h4 text-ink">{copy.stepsTitle}</h2><p className="mb-8 mt-4 text-body-lg text-ink-60">{copy.stepsIntro}</p>
      <div className="flex flex-col gap-6">{copy.steps.map(step => <StepCard key={step.id} step={step} locale={locale} />)}</div>
      <CreatorActions locale={locale} />
    </section>
    <section className="bg-paper-soft py-12"><div className="mx-auto max-w-4xl px-4 sm:px-6">
      <h2 className="font-display text-h4 text-ink">{copy.tipsTitle}</h2><ul className="mt-6 list-disc space-y-3 pl-5 text-body text-ink-80">{copy.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
    </div></section>
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h2 className="mb-8 font-display text-h4 text-ink">{copy.faqTitle}</h2>
      <h3 className="mb-3 font-display text-h5 text-ink">{copy.guides}</h3><Faq items={copy.guideFaq} />
      <h3 className="mb-3 mt-10 font-display text-h5 text-ink">{copy.visitors}</h3><Faq items={copy.visitorFaq} />
    </section>
    <section className="bg-grenadine py-12 text-paper"><div className="mx-auto max-w-3xl px-4 sm:px-6">
      <h2 className="font-display text-h4">{copy.contactTitle}</h2><div className="mt-5 flex flex-wrap gap-5">
        <a className="inline-flex min-h-11 items-center font-semibold text-paper underline" href={`mailto:${LEGAL_IDENTITY.contactEmail}`}>{copy.contact}</a>
        <Link className="inline-flex min-h-11 items-center text-paper underline" href={localizePublicPath('/catalogue', locale)}>{copy.catalogue}</Link>
      </div>
    </div></section>
  </>;
}

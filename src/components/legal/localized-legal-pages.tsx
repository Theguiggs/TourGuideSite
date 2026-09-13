import Link from 'next/link';
import { Fragment } from 'react';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';
import PrivacyFr from '@/app/confidentialite/page';
import PrivacyEn from '@/app/en/privacy/page';
import TermsFr from '@/app/cgu/page';
import TermsEn from '@/app/en/terms/page';
import DeletionFr from '@/app/supprimer-mon-compte/page';
import DeletionEn from '@/app/en/delete-account/page';
import { LEGAL_IDENTITY, RETENTION, publisherLine } from '@/lib/legal/identity';
import { LEGAL_PAGES, type AdditionalLegalLocale } from '@/lib/legal/translated-pages';
import { LEGAL_PATHS, type LegalPageKind } from '@/lib/legal/page-metadata';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { CookieChoiceButton } from './CookieChoiceButton';
import { LegalLanguageSwitcher } from './LegalLanguageSwitcher';

function LegalText({text, locale}: {text: string; locale: AdditionalLegalLocale}) {
  const copy = LEGAL_PAGES[locale];
  if (text === '{retention}') return <ul className="list-disc space-y-2 pl-5">{RETENTION.map(row => <li key={row.fr[0]}><strong>{row[locale][0]}</strong> : {row[locale][1]}.</li>)}</ul>;
  return <p>{text.split(/(\{(?:publisher|contact|authority|law|delete|privacy|cookies)\})/).map((part, index) => {
    const content = part === '{publisher}' ? publisherLine(locale)
      : part === '{contact}' ? <a className="break-words text-grenadine underline" href={`mailto:${LEGAL_IDENTITY.contactEmail}`}>{LEGAL_IDENTITY.contactEmail}</a>
      : part === '{authority}' ? LEGAL_IDENTITY.supervisoryAuthority[locale]
      : part === '{law}' ? LEGAL_IDENTITY.governingLaw[locale]
      : part === '{delete}' ? <Link className="text-grenadine underline" href={localizePublicPath(LEGAL_PATHS.deletion, locale)}>{copy.deleteLink}</Link>
      : part === '{privacy}' ? <Link className="text-grenadine underline" href={localizePublicPath(LEGAL_PATHS.privacy, locale)}>{copy.privacy.title}</Link>
      : part === '{cookies}' ? <CookieChoiceButton locale={locale} /> : part;
    return <Fragment key={index}>{content}</Fragment>;
  })}</p>;
}

function AdditionalLegalPage({locale, kind}: {locale: AdditionalLegalLocale; kind: LegalPageKind}) {
  const copy = LEGAL_PAGES[locale];
  const document = copy[kind];
  return <>
    <section className="bg-paper"><div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Eyebrow color={tg.colors.grenadine}>{copy.legal}</Eyebrow>
      <h1 className="mt-4 break-words font-display text-h3 text-ink md:text-h2">{document.title}</h1>
      {kind !== 'deletion' && <p className="mt-4 text-ink-60">{copy.updated} : {LEGAL_IDENTITY.effectiveDate[locale]}</p>}
      {document.intro && <p className="mt-6 text-body-lg text-ink-80">{document.intro}</p>}
    </div></section>
    <section className="bg-paper-soft"><div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {document.sections.map(section => <section key={section.title} className="mb-10">
        <h2 className="mb-3 break-words font-display text-h5 text-ink">{section.title}</h2>
        <div className="space-y-4 text-body leading-relaxed text-ink-80">{section.text.map((text, index) => <LegalText key={index} text={text} locale={locale} />)}</div>
      </section>)}
      {kind === 'deletion' && <a className="inline-flex min-h-11 items-center text-grenadine underline" href={`mailto:${LEGAL_IDENTITY.contactEmail}?subject=${encodeURIComponent(copy.emailSubject)}&body=${encodeURIComponent(copy.emailBody)}`}>{copy.deletionEmail}</a>}
      <div className="mt-8 flex flex-col items-start gap-3">
        {kind !== 'privacy' && <Link className="inline-flex min-h-11 items-center text-grenadine underline" href={localizePublicPath(LEGAL_PATHS.privacy, locale)}>{copy.privacyLink}</Link>}
        {kind === 'privacy' && <Link className="inline-flex min-h-11 items-center text-grenadine underline" href={localizePublicPath(LEGAL_PATHS.terms, locale)}>{copy.termsLink}</Link>}
        <LegalLanguageSwitcher locale={locale} frenchHref={LEGAL_PATHS[kind]} englishHref={localizePublicPath(LEGAL_PATHS[kind], 'en')} />
      </div>
    </div></section>
  </>;
}

export function LocalizedPrivacyPage({locale}: {locale: InterfaceLocale}) {
  return locale === 'fr' ? <PrivacyFr /> : locale === 'en' ? <PrivacyEn /> : <AdditionalLegalPage locale={locale} kind="privacy" />;
}
export function LocalizedTermsPage({locale}: {locale: InterfaceLocale}) {
  return locale === 'fr' ? <TermsFr /> : locale === 'en' ? <TermsEn /> : <AdditionalLegalPage locale={locale} kind="terms" />;
}
export function LocalizedAccountDeletionPage({locale}: {locale: InterfaceLocale}) {
  return locale === 'fr' ? <DeletionFr /> : locale === 'en' ? <DeletionEn /> : <AdditionalLegalPage locale={locale} kind="deletion" />;
}

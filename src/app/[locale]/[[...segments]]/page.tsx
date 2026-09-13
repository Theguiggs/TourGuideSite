import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isInterfaceLocale, type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { seoAlternates } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES } from '@/lib/seo/availability';
import { translate } from '@/lib/i18n/translate';
import { VisitorHome } from '@/components/home/visitor-home';
import { VisitorAuth } from '@/components/auth/visitor-auth';
import { MesVisitesContent } from '@/components/catalogue/mes-visites-content';
import { LocalizedCataloguePage } from '@/app/catalogue/page';
import { LocalizedCityPage, cityPageMetadata } from '@/app/catalogue/[city]/page';
import { LocalizedTourDetailPage, tourPageMetadata } from '@/app/catalogue/[city]/[tourSlug]/page';
import { LocalizedGuidePage, guideMetadata } from '@/app/guides/[guideSlug]/page';
import { homeMetadata } from '@/lib/home-metadata';
import { catalogueMetadata } from '@/lib/seo/catalogue-metadata';
import { LocalizedPrivacyPage, LocalizedTermsPage, LocalizedAccountDeletionPage } from '@/components/legal/localized-legal-pages';
import { legalPageMetadata } from '@/lib/legal/page-metadata';
import { LocalizedHelpPage } from '@/app/aide/localized-help';
import { CreatorHome } from '@/components/home/creator-home';
import { helpMetadata } from '@/lib/help-metadata';
import { creatorMetadata } from '@/lib/creator-metadata';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ locale: string; segments?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function newLocale(value: string): InterfaceLocale {
  if (!isInterfaceLocale(value) || value === 'fr' || value === 'en') notFound();
  return value;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const locale = newLocale(resolved.locale), segments = resolved.segments ?? [];
  if (!segments.length) return homeMetadata(locale);
  if (segments[0] === 'catalogue' && segments.length === 1) return catalogueMetadata(locale);
  if (segments[0] === 'catalogue' && segments.length === 2) return cityPageMetadata(segments[1], locale);
  if (segments[0] === 'catalogue' && segments.length === 3) return tourPageMetadata(segments[1], segments[2], locale);
  if (segments[0] === 'guides' && segments.length === 2) return guideMetadata(segments[1], locale);
  if (segments.length === 1) {
    if (segments[0] === 'help') return helpMetadata(locale);
    if (segments[0] === 'create-tours') return creatorMetadata(locale);
    if (segments[0] === 'privacy') return legalPageMetadata('privacy', locale);
    if (segments[0] === 'terms') return legalPageMetadata('terms', locale);
    if (segments[0] === 'delete-account') return legalPageMetadata('deletion', locale);
  }
  // Espaces personnels et parcours de compte : servis, jamais indexés — et
  // donc sans groupe hreflang, qu'aucune page indexable ne pourrait rendre.
  const isPrivate = segments.length === 1 && ['sign-in', 'sign-up', 'reset-password', 'my-purchases'].includes(segments[0]);
  const label = segments[0] === 'my-purchases' ? translate(locale, 'Mes visites', 'My tours')
    : segments[0] === 'sign-in' ? translate(locale, 'Se connecter', 'Sign in')
    : segments[0] === 'sign-up' ? translate(locale, 'Créer mon compte', 'Create my account')
    : segments[0] === 'reset-password' ? translate(locale, 'Réinitialiser mon mot de passe', 'Reset my password')
    : translate(locale, 'Catalogue des visites', 'Tour catalogue');
  const { alternates } = seoAlternates({
    sourcePath: localizePublicPath(`/en/${segments.join('/')}`, 'fr'),
    locale,
    published: isPrivate ? [] : EVERGREEN_LOCALES,
  });
  return { title: label, description: translate(locale, 'Visites audio pour découvrir les villes à votre rythme.', 'Audio tours to discover cities at your own pace.'),
    ...(isPrivate ? { robots: { index: false, follow: false } } : {}),
    alternates: isPrivate ? { canonical: alternates.canonical } : alternates };
}

export default async function LocalizedPublicPage({ params, searchParams }: Props) {
  const resolved = await params;
  const locale = newLocale(resolved.locale), segments = resolved.segments ?? [];
  if (!segments.length) return <VisitorHome locale={locale} />;
  if (segments[0] === 'catalogue') {
    if (segments.length === 1) return <LocalizedCataloguePage locale={locale} searchParams={searchParams} />;
    if (segments.length === 2) return <LocalizedCityPage locale={locale} params={Promise.resolve({ city: segments[1] })} searchParams={searchParams} />;
    if (segments.length === 3) {
      const query = await searchParams;
      return <LocalizedTourDetailPage locale={locale} params={Promise.resolve({ city: segments[1], tourSlug: segments[2] })}
        searchParams={Promise.resolve({ source: typeof query.source === 'string' ? query.source : undefined, office: typeof query.office === 'string' ? query.office : undefined })} />;
    }
  }
  if (segments[0] === 'guides' && segments.length === 2) return <LocalizedGuidePage locale={locale} params={Promise.resolve({ guideSlug: segments[1] })} />;
  if (segments.length === 1) {
    switch (segments[0]) {
      case 'help': return <LocalizedHelpPage locale={locale} />;
      case 'create-tours': return <CreatorHome locale={locale} />;
      case 'sign-in': return <VisitorAuth locale={locale} mode="login" />;
      case 'sign-up': return <VisitorAuth locale={locale} mode="signup" />;
      case 'reset-password': return <VisitorAuth locale={locale} mode="reset" />;
      case 'my-purchases': return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><h1 className="font-display text-h4 sm:text-h3">{translate(locale, 'Mes visites', 'My tours')}</h1><MesVisitesContent locale={locale} /></section>;
      case 'privacy': return <LocalizedPrivacyPage locale={locale} />;
      case 'terms': return <LocalizedTermsPage locale={locale} />;
      case 'delete-account': return <LocalizedAccountDeletionPage locale={locale} />;
    }
  }
  notFound();
}

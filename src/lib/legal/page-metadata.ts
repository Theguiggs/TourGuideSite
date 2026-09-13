import type { Metadata } from 'next';
import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { seoAlternates } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES } from '@/lib/seo/availability';
import { LEGAL_PAGES } from './translated-pages';

export type LegalPageKind = 'privacy' | 'terms' | 'deletion';
export const LEGAL_PATHS: Record<LegalPageKind, string> = {privacy: '/confidentialite', terms: '/cgu', deletion: '/supprimer-mon-compte'};
const original = {
  fr: {privacy: 'Politique de confidentialité', terms: 'Conditions Générales d’Utilisation', deletion: 'Supprimer mon compte'},
  en: {privacy: 'Privacy policy', terms: 'Terms of use', deletion: 'Delete my account'},
};
export function legalPageMetadata(kind: LegalPageKind, locale: InterfaceLocale): Metadata {
  const title = locale === 'fr' || locale === 'en' ? original[locale][kind] : LEGAL_PAGES[locale][kind].title;
  const {alternates} = seoAlternates({sourcePath: LEGAL_PATHS[kind], locale, published: EVERGREEN_LOCALES});
  return {title, description: `${title} — Murmure`, alternates,
    openGraph: {title, siteName: 'Murmure', url: alternates.canonical as string, locale: LOCALE_FORMATS[locale].replace('-', '_')}};
}

import type { Metadata } from 'next';
import { SITE_LOCALES, LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { LEGAL_PAGES } from './translated-pages';

export type LegalPageKind = 'privacy' | 'terms' | 'deletion';
export const LEGAL_PATHS: Record<LegalPageKind, string> = {privacy: '/confidentialite', terms: '/cgu', deletion: '/supprimer-mon-compte'};
const original = {
  fr: {privacy: 'Politique de confidentialité', terms: 'Conditions Générales d’Utilisation', deletion: 'Supprimer mon compte'},
  en: {privacy: 'Privacy policy', terms: 'Terms of use', deletion: 'Delete my account'},
};
export function legalPageMetadata(kind: LegalPageKind, locale: InterfaceLocale): Metadata {
  const title = locale === 'fr' || locale === 'en' ? original[locale][kind] : LEGAL_PAGES[locale][kind].title;
  const canonical = localizePublicPath(LEGAL_PATHS[kind], locale);
  return {title, description: `${title} — Murmure`, alternates: {
    canonical, languages: Object.fromEntries(SITE_LOCALES.map(lang => [lang, localizePublicPath(LEGAL_PATHS[kind], lang)])),
  }, openGraph: {title, url: canonical, locale: LOCALE_FORMATS[locale].replace('-', '_')}};
}

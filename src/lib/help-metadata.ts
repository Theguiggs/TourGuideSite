import type { Metadata } from 'next';
import { SITE_LOCALES, LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { HELP_COPY } from '@/app/aide/_translated-content';

export function helpMetadata(locale: InterfaceLocale): Metadata {
  const title = {fr: 'Aide', en: 'Help', es: 'Ayuda', de: 'Hilfe', it: 'Assistenza', nl: 'Hulp'}[locale];
  const description = locale === 'fr' ? 'Le guide complet de Murmure : créez un parcours audio étape par étape, et trouvez les réponses aux questions des guides comme des voyageurs.'
    : locale === 'en' ? 'Learn how to create, translate, publish and listen to multilingual Murmure audio tours.' : HELP_COPY[locale].subtitle;
  const canonical = localizePublicPath('/aide', locale);
  return {title, description, alternates: {canonical, languages: Object.fromEntries(SITE_LOCALES.map(lang => [lang, localizePublicPath('/aide', lang)]))}, openGraph: {title, description, url: canonical, locale: LOCALE_FORMATS[locale].replace('-', '_')}};
}

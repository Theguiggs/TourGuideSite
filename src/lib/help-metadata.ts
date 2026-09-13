import type { Metadata } from 'next';
import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { seoAlternates } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES } from '@/lib/seo/availability';
import { HELP_COPY } from '@/app/aide/_translated-content';

export function helpMetadata(locale: InterfaceLocale): Metadata {
  const title = {fr: 'Aide', en: 'Help', es: 'Ayuda', de: 'Hilfe', it: 'Assistenza', nl: 'Hulp'}[locale];
  const description = locale === 'fr' ? 'Le guide complet de Murmure : créez un parcours audio étape par étape, et trouvez les réponses aux questions des guides comme des voyageurs.'
    : locale === 'en' ? 'Learn how to create, translate, publish and listen to multilingual Murmure audio tours.' : HELP_COPY[locale].subtitle;
  const {alternates} = seoAlternates({sourcePath: '/aide', locale, published: EVERGREEN_LOCALES});
  return {title, description, alternates, openGraph: {title, description, siteName: 'Murmure', url: alternates.canonical as string, locale: LOCALE_FORMATS[locale].replace('-', '_')}};
}

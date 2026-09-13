import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate, extendCopy } from '@/lib/i18n/translate';
import type { Metadata } from 'next';

export function homeMetadata(locale: InterfaceLocale): Metadata {
  const title = translate(locale, 'Murmure — Découvrez les villes en visite audio', 'Murmure — Discover cities with audio tours');
  const description = translate(locale, 'Trouvez une ville, choisissez une visite audio et écoutez un extrait. Explorez à votre rythme et retrouvez vos visites sur le site Murmure.', 'Find a city, choose an audio tour and listen to a preview. Explore at your own pace and find your tours on the Murmure website.');
  const path = translate(locale, '/', '/en');
  const images = [{ url: translate(locale, '/opengraph-image', '/en/opengraph-image'), width: 1200, height: 630, alt: title }];
  return { title: { absolute: title }, description, alternates: { canonical: path, languages: extendCopy({ fr: '/', en: '/en' }) }, openGraph: { type: 'website', siteName: 'Murmure', url: path, locale: translate(locale, 'fr_FR', 'en_US'), title, description, images }, twitter: { card: 'summary_large_image', title, description, images } };
}

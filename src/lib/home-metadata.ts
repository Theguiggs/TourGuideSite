import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import type { Metadata } from 'next';
import { publicPath, seoAlternates } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES } from '@/lib/seo/availability';

export function homeMetadata(locale: InterfaceLocale): Metadata {
  const title = translate(locale, 'Murmure — Découvrez les villes en visite audio', 'Murmure — Discover cities with audio tours');
  const description = translate(locale, 'Trouvez une ville, choisissez une visite audio et écoutez un extrait. Explorez à votre rythme et retrouvez vos visites sur le site Murmure.', 'Find a city, choose an audio tour and listen to a preview. Explore at your own pace and find your tours on the Murmure website.');
  const { alternates } = seoAlternates({ sourcePath: '/', locale, published: EVERGREEN_LOCALES });
  const images = [{ url: `${publicPath('/', locale).replace(/\/$/, '')}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return { title: { absolute: title }, description, alternates,
    openGraph: { type: 'website', siteName: 'Murmure', url: alternates.canonical as string, locale: LOCALE_FORMATS[locale].replace('-', '_'), title, description, images },
    twitter: { card: 'summary_large_image', title, description, images } };
}

import type { Metadata } from 'next';

export function homeMetadata(locale: 'fr' | 'en'): Metadata {
  const title = locale === 'en' ? 'Murmure — Discover cities with audio tours' : 'Murmure — Découvrez les villes en visite audio';
  const description = locale === 'en' ? 'Find a city, choose an audio tour and listen to a preview. Explore at your own pace and find your tours on the Murmure website.' : 'Trouvez une ville, choisissez une visite audio et écoutez un extrait. Explorez à votre rythme et retrouvez vos visites sur le site Murmure.';
  const path = locale === 'en' ? '/en' : '/';
  const images = [{ url: locale === 'en' ? '/en/opengraph-image' : '/opengraph-image', width: 1200, height: 630, alt: title }];
  return { title: { absolute: title }, description, alternates: { canonical: path, languages: { fr: '/', en: '/en' } }, openGraph: { type: 'website', siteName: 'Murmure', url: path, locale: locale === 'en' ? 'en_US' : 'fr_FR', title, description, images }, twitter: { card: 'summary_large_image', title, description, images } };
}

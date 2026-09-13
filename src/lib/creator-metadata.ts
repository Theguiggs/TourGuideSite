import type { Metadata } from 'next';

export function creatorMetadata(locale: 'fr' | 'en'): Metadata {
  const title = locale === 'en' ? 'Create audio tours' : 'Créer des visites audio';
  const description = locale === 'en' ? 'Turn your local knowledge into an audio tour. Map, narrate and translate your stories with the Murmure Studio.' : 'Transformez votre connaissance des lieux en visite audio. Tracez, racontez et traduisez vos histoires avec le Studio Murmure.';
  const path = locale === 'en' ? '/en/create-tours' : '/creer-des-visites';
  const images = [{ url: `${path}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return { title, description, alternates: { canonical: path, languages: { fr: '/creer-des-visites', en: '/en/create-tours' } }, openGraph: { title, description, locale: locale === 'en' ? 'en_US' : 'fr_FR', url: path, type: 'website', siteName: 'Murmure', images }, twitter: { card: 'summary_large_image', title, description, images } };
}

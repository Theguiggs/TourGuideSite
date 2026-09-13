import type { Metadata } from 'next';
import { LOCALE_FORMATS, type InterfaceLocale } from './i18n/locales';
import { publicPath, seoAlternates } from './seo/urls';
import { EVERGREEN_LOCALES } from './seo/availability';

const COPY: Record<InterfaceLocale, [string, string]> = {
  fr: ['Créer des visites audio', 'Transformez votre connaissance des lieux en visite audio. Tracez, racontez et traduisez vos histoires avec le Studio Murmure.'],
  en: ['Create audio tours', 'Turn your local knowledge into an audio tour. Map, narrate and translate your stories with the Murmure Studio.'],
  es: ['Crear visitas de audio', 'Convierte tu conocimiento local en una visita de audio. Traza, narra y traduce tus historias con el Studio Murmure.'],
  de: ['Audiotouren erstellen', 'Verwandle dein Wissen über einen Ort in eine Audiotour. Plane, erzähle und übersetze deine Geschichten mit dem Murmure Studio.'],
  it: ['Crea visite audio', 'Trasforma la tua conoscenza dei luoghi in una visita audio. Traccia, racconta e traduci le tue storie con lo Studio Murmure.'],
  nl: ['Audiotours maken', 'Maak van je lokale kennis een audiotour. Stippel routes uit, vertel en vertaal je verhalen met de Murmure Studio.'],
};

export function creatorMetadata(locale: InterfaceLocale): Metadata {
  const [title, description] = COPY[locale];
  const { alternates } = seoAlternates({ sourcePath: '/creer-des-visites', locale, published: EVERGREEN_LOCALES });
  const images = [{ url: `${publicPath('/creer-des-visites', locale)}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return { title, description, alternates, openGraph: { title, description, locale: LOCALE_FORMATS[locale].replace('-', '_'), url: alternates.canonical as string, type: 'website', siteName: 'Murmure', images }, twitter: { card: 'summary_large_image', title, description, images } };
}

import type { Metadata } from 'next';
import { SITE_LOCALES, LOCALE_FORMATS, type InterfaceLocale } from './i18n/locales';
import { localizePublicPath } from './i18n/public-routes';

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
  const path = localizePublicPath('/creer-des-visites', locale);
  const images = [{ url: `${locale === 'fr' ? '/creer-des-visites' : `/${locale}/create-tours`}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return { title, description, alternates: { canonical: path, languages: Object.fromEntries(SITE_LOCALES.map(language => [language, localizePublicPath('/creer-des-visites', language)])) }, openGraph: { title, description, locale: LOCALE_FORMATS[locale].replace('-', '_'), url: path, type: 'website', siteName: 'Murmure', images }, twitter: { card: 'summary_large_image', title, description, images } };
}

import { formatDate, type InterfaceLocale } from '@/lib/i18n/locales';
import { launchFreeAccess } from '@/lib/launch-free-access';

type FreeAccessCopy = {
  homeTitle: string;
  homeDescription: (date: string) => string;
  cityTitle: (city: string) => string;
  cityDescription: (city: string, count: number, date: string) => string;
  tourLabel: (city: string) => string;
  tourLead: (city: string, date?: string) => string;
  heroTitle: string;
  heroDescription: (date: string) => string;
};

const COPY: Record<InterfaceLocale, FreeAccessCopy> = {
  fr: {
    homeTitle: 'Murmure — Visites audio gratuites',
    homeDescription: date => `Explorez Grasse, Nice et d’autres villes avec des visites audio gratuites jusqu’au ${date}. Choisissez une ville et commencez l’écoute.`,
    cityTitle: city => `Visites audio gratuites à ${city}`,
    cityDescription: (city, count, date) => `Découvrez ${count} visite${count === 1 ? '' : 's'} audio gratuite${count === 1 ? '' : 's'} à ${city} jusqu’au ${date}. Écoutez un extrait et explorez à votre rythme.`,
    tourLabel: city => `visite audio gratuite à ${city}`,
    tourLead: (city, date) => `Visite audio gratuite à ${city}${date ? ` jusqu’au ${date}` : ''}.`,
    heroTitle: 'Découvrez la ville gratuitement, en audio.',
    heroDescription: date => `Toutes les visites audio sont gratuites jusqu’au ${date}. Choisissez une ville, écoutez un extrait et partez à votre rythme.`,
  },
  en: {
    homeTitle: 'Murmure — Free audio tours',
    homeDescription: date => `Explore Grasse, Nice and more with free audio tours until ${date}. Choose a city and start listening at your own pace.`,
    cityTitle: city => `Free audio tours in ${city}`,
    cityDescription: (city, count, date) => `Discover ${count} free audio tour${count === 1 ? '' : 's'} in ${city} until ${date}. Listen to a preview and explore at your own pace.`,
    tourLabel: city => `free audio tour in ${city}`,
    tourLead: (city, date) => `Free audio tour in ${city}${date ? ` until ${date}` : ''}.`,
    heroTitle: 'Explore the city for free, with audio.',
    heroDescription: date => `All audio tours are free until ${date}. Choose a city, listen to a preview and explore at your own pace.`,
  },
  es: {
    homeTitle: 'Murmure — Visitas audio gratuitas',
    homeDescription: date => `Explora Grasse, Niza y otras ciudades con visitas audio gratuitas hasta el ${date}. Elige una ciudad y empieza a escuchar.`,
    cityTitle: city => `Visitas audio gratuitas en ${city}`,
    cityDescription: (city, count, date) => `Descubre ${count} visita${count === 1 ? '' : 's'} audio gratuita${count === 1 ? '' : 's'} en ${city} hasta el ${date}. Escucha un avance y explora a tu ritmo.`,
    tourLabel: city => `visita audio gratuita en ${city}`,
    tourLead: (city, date) => `Visita audio gratuita en ${city}${date ? ` hasta el ${date}` : ''}.`,
    heroTitle: 'Descubre la ciudad gratis, con audio.',
    heroDescription: date => `Todas las visitas audio son gratuitas hasta el ${date}. Elige una ciudad, escucha un avance y explora a tu ritmo.`,
  },
  de: {
    homeTitle: 'Murmure — Kostenlose Audiotouren',
    homeDescription: date => `Entdecke Grasse, Nizza und weitere Städte mit kostenlosen Audiotouren bis zum ${date}. Wähle eine Stadt und höre los.`,
    cityTitle: city => `Kostenlose Audiotouren in ${city}`,
    cityDescription: (city, count, date) => `Entdecke ${count} kostenlose Audiotour${count === 1 ? '' : 'en'} in ${city} bis zum ${date}. Höre eine Vorschau und erkunde die Stadt in deinem Tempo.`,
    tourLabel: city => `kostenlose Audiotour in ${city}`,
    tourLead: (city, date) => `Kostenlose Audiotour in ${city}${date ? ` bis zum ${date}` : ''}.`,
    heroTitle: 'Entdecke die Stadt kostenlos per Audio.',
    heroDescription: date => `Alle Audiotouren sind bis zum ${date} kostenlos. Wähle eine Stadt, höre eine Vorschau und erkunde sie in deinem Tempo.`,
  },
  it: {
    homeTitle: 'Murmure — Visite audio gratuite',
    homeDescription: date => `Esplora Grasse, Nizza e altre città con visite audio gratuite fino al ${date}. Scegli una città e inizia l’ascolto.`,
    cityTitle: city => `Visite audio gratuite a ${city}`,
    cityDescription: (city, count, date) => `Scopri ${count} ${count === 1 ? 'visita audio gratuita' : 'visite audio gratuite'} a ${city} fino al ${date}. Ascolta un’anteprima ed esplora al tuo ritmo.`,
    tourLabel: city => `visita audio gratuita a ${city}`,
    tourLead: (city, date) => `Visita audio gratuita a ${city}${date ? ` fino al ${date}` : ''}.`,
    heroTitle: 'Scopri la città gratis, con l’audio.',
    heroDescription: date => `Tutte le visite audio sono gratuite fino al ${date}. Scegli una città, ascolta un’anteprima ed esplora al tuo ritmo.`,
  },
  nl: {
    homeTitle: 'Murmure — Gratis audiotours',
    homeDescription: date => `Ontdek Grasse, Nice en andere steden met gratis audiotours tot ${date}. Kies een stad en begin met luisteren.`,
    cityTitle: city => `Gratis audiotours in ${city}`,
    cityDescription: (city, count, date) => `Ontdek ${count} gratis audiotour${count === 1 ? '' : 's'} in ${city} tot ${date}. Luister naar een fragment en verken op je eigen tempo.`,
    tourLabel: city => `gratis audiotour in ${city}`,
    tourLead: (city, date) => `Gratis audiotour in ${city}${date ? ` tot ${date}` : ''}.`,
    heroTitle: 'Ontdek de stad gratis met audio.',
    heroDescription: date => `Alle audiotours zijn gratis tot ${date}. Kies een stad, luister naar een fragment en verken op je eigen tempo.`,
  },
};

export type ActiveFreeAccessCopy = FreeAccessCopy & { endAt: string; endDate: string };

export function activeFreeAccessCopy(locale: InterfaceLocale, now = Date.now()): ActiveFreeAccessCopy | null {
  const offer = launchFreeAccess(now);
  if (!offer.active || !offer.endAt) return null;
  return {
    ...COPY[locale],
    endAt: offer.endAt,
    endDate: formatDate(Date.parse(offer.endAt), locale, { dateStyle: 'long' }),
  };
}

export function freeAccessCopy(locale: InterfaceLocale): FreeAccessCopy {
  return COPY[locale];
}

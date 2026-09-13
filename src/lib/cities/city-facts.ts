import type { Tour } from '@/types/tour';
import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { languageLabel } from '@/lib/i18n/languages';
import { normalizeLanguageTag } from '@/lib/api/audio-source-policy';

/**
 * Faits vérifiables d'une ville, tirés de son catalogue — jamais inventés.
 *
 * Une page ville se résumait à une grille de cartes : rien qui distingue Arles
 * d'Albi pour un moteur, et rien du tout dans cinq langues sur six. Ce module
 * fabrique la matière qui manque, à partir de ce que les visites disent
 * réellement : combien, combien de temps, dans quelles langues, par qui.
 *
 * Le contenu produit diffère donc d'une ville à l'autre par sa substance, pas
 * par une substitution de nom — c'est la ligne que le plan interdit de
 * franchir. Une introduction éditoriale relue, quand elle existe, vient s'y
 * ajouter (voir `city-intro.ts`).
 *
 * Les conjonctions et les nombres passent par `Intl` : « français et anglais »,
 * « francés e inglés », « Französisch und Englisch » ne s'écrivent pas à la main.
 */

export interface CityFacts {
  tourCount: number;
  durationMin?: number;
  durationMax?: number;
  /** Codes de langue audio réellement vendus dans la ville. */
  audioLanguages: string[];
  guideNames: string[];
  stopCount: number;
}

type FactsTour = Pick<Tour, 'duration' | 'availableLanguages' | 'guideName' | 'poiCount'>;

export function cityFacts(tours: readonly FactsTour[]): CityFacts {
  const durations = tours.map((t) => Math.round(t.duration)).filter((d) => d > 0);
  const languages = new Set<string>();
  for (const tour of tours) {
    for (const raw of tour.availableLanguages ?? []) {
      const code = normalizeLanguageTag(raw);
      if (code) languages.add(code);
    }
  }
  const guides = [...new Set(tours.map((t) => t.guideName).filter((name): name is string => Boolean(name?.trim())))];
  return {
    tourCount: tours.length,
    durationMin: durations.length > 0 ? Math.min(...durations) : undefined,
    durationMax: durations.length > 0 ? Math.max(...durations) : undefined,
    audioLanguages: [...languages].sort(),
    guideNames: guides.sort((a, b) => a.localeCompare(b)),
    stopCount: tours.reduce((total, tour) => total + (tour.poiCount || 0), 0),
  };
}

const list = (values: readonly string[], locale: InterfaceLocale): string =>
  new Intl.ListFormat(LOCALE_FORMATS[locale], { style: 'long', type: 'conjunction' }).format(values);

type Copy = {
  /** `n` visites, `duration` déjà formatée, `guides` et `langs` déjà joints. */
  summary: (city: string, n: number, duration: string, guides: string, langs: string) => string;
  duration: (min: number, max: number) => string;
  labels: { tours: string; duration: string; languages: string; guides: string; stops: string };
  otherCities: string;
  noTour: string;
  /**
   * Le français écrit « en français », pas « en Français » : `languageLabel`
   * rend un nom de liste, capitalisé. L'anglais, l'allemand et le néerlandais
   * gardent la majuscule, qui est la leur.
   */
  lowercaseLanguagesInSentence?: boolean;
};

const COPY: Record<InterfaceLocale, Copy> = {
  fr: {
    summary: (city, n, duration, guides, langs) =>
      `${n} visite${n > 1 ? 's' : ''} audio à ${city}${duration ? `, ${duration}` : ''}` +
      `${guides ? `, racontée${n > 1 ? 's' : ''} par ${guides}` : ''}.` +
      `${langs ? ` Écoute en ${langs}.` : ''}`,
    duration: (min, max) => (min === max ? `${min} minutes` : `de ${min} à ${max} minutes`),
    labels: { tours: 'Visites disponibles', duration: 'Durée', languages: 'Langues audio', guides: 'Guides', stops: 'Étapes' },
    otherCities: 'Autres destinations',
    noTour: 'Aucune visite publiée pour le moment dans cette ville.',
    lowercaseLanguagesInSentence: true,
  },
  en: {
    summary: (city, n, duration, guides, langs) =>
      `${n} audio tour${n > 1 ? 's' : ''} in ${city}${duration ? `, ${duration}` : ''}` +
      `${guides ? `, narrated by ${guides}` : ''}.` +
      `${langs ? ` Listen in ${langs}.` : ''}`,
    duration: (min, max) => (min === max ? `${min} minutes` : `${min} to ${max} minutes`),
    labels: { tours: 'Tours available', duration: 'Duration', languages: 'Audio languages', guides: 'Guides', stops: 'Stops' },
    otherCities: 'Other destinations',
    noTour: 'No published tour in this city yet.',
  },
  es: {
    summary: (city, n, duration, guides, langs) =>
      `${n} visita${n > 1 ? 's' : ''} audio en ${city}${duration ? `, ${duration}` : ''}` +
      `${guides ? `, narrada${n > 1 ? 's' : ''} por ${guides}` : ''}.` +
      `${langs ? ` Escucha en ${langs}.` : ''}`,
    duration: (min, max) => (min === max ? `${min} minutos` : `de ${min} a ${max} minutos`),
    labels: { tours: 'Visitas disponibles', duration: 'Duración', languages: 'Idiomas de audio', guides: 'Guías', stops: 'Etapas' },
    otherCities: 'Otros destinos',
    noTour: 'Todavía no hay ninguna visita publicada en esta ciudad.',
  },
  de: {
    summary: (city, n, duration, guides, langs) =>
      `${n} Audiotour${n > 1 ? 'en' : ''} in ${city}${duration ? `, ${duration}` : ''}` +
      `${guides ? `, erzählt von ${guides}` : ''}.` +
      `${langs ? ` Hören auf ${langs}.` : ''}`,
    duration: (min, max) => (min === max ? `${min} Minuten` : `${min} bis ${max} Minuten`),
    labels: { tours: 'Verfügbare Touren', duration: 'Dauer', languages: 'Audiosprachen', guides: 'Guides', stops: 'Stationen' },
    otherCities: 'Weitere Reiseziele',
    noTour: 'In dieser Stadt ist noch keine Tour veröffentlicht.',
  },
  it: {
    summary: (city, n, duration, guides, langs) =>
      `${n} visit${n > 1 ? 'e' : 'a'} audio a ${city}${duration ? `, ${duration}` : ''}` +
      `${guides ? `, raccontat${n > 1 ? 'e' : 'a'} da ${guides}` : ''}.` +
      `${langs ? ` Ascolta in ${langs}.` : ''}`,
    duration: (min, max) => (min === max ? `${min} minuti` : `da ${min} a ${max} minuti`),
    labels: { tours: 'Visite disponibili', duration: 'Durata', languages: 'Lingue audio', guides: 'Guide', stops: 'Tappe' },
    otherCities: 'Altre destinazioni',
    noTour: 'Nessuna visita pubblicata in questa città per ora.',
  },
  nl: {
    summary: (city, n, duration, guides, langs) =>
      `${n} audiotour${n > 1 ? 's' : ''} in ${city}${duration ? `, ${duration}` : ''}` +
      `${guides ? `, verteld door ${guides}` : ''}.` +
      `${langs ? ` Luister in het ${langs}.` : ''}`,
    duration: (min, max) => (min === max ? `${min} minuten` : `${min} tot ${max} minuten`),
    labels: { tours: 'Beschikbare tours', duration: 'Duur', languages: 'Audiotalen', guides: 'Gidsen', stops: 'Haltes' },
    otherCities: 'Andere bestemmingen',
    noTour: 'Nog geen gepubliceerde tour in deze stad.',
  },
};

export const cityFactsCopy = (locale: InterfaceLocale) => COPY[locale];

/** Durée du catalogue de la ville, dans la langue demandée. */
export function formatCityDuration(facts: CityFacts, locale: InterfaceLocale): string {
  if (facts.durationMin === undefined || facts.durationMax === undefined) return '';
  return COPY[locale].duration(facts.durationMin, facts.durationMax);
}

/** Les langues audio, nommées dans la langue de l'interface. */
export function formatCityLanguages(
  facts: CityFacts,
  locale: InterfaceLocale,
  { inSentence = false }: { inSentence?: boolean } = {},
): string {
  if (facts.audioLanguages.length === 0) return '';
  const lower = inSentence && COPY[locale].lowercaseLanguagesInSentence === true;
  const names = facts.audioLanguages.map((code) => {
    const label = languageLabel(code, locale);
    return lower ? label.toLocaleLowerCase(LOCALE_FORMATS[locale]) : label;
  });
  return list(names, locale);
}

export function formatCityGuides(facts: CityFacts, locale: InterfaceLocale): string {
  return facts.guideNames.length > 0 ? list(facts.guideNames, locale) : '';
}

/**
 * Une phrase, dans la langue demandée, qui ne dit que des faits du catalogue :
 * combien de visites, de quelle durée, par qui, dans quelles langues.
 */
export function cityFactsSentence(city: string, facts: CityFacts, locale: InterfaceLocale): string {
  if (facts.tourCount === 0) return COPY[locale].noTour;
  return COPY[locale].summary(
    city,
    facts.tourCount,
    formatCityDuration(facts, locale),
    formatCityGuides(facts, locale),
    formatCityLanguages(facts, locale, { inSentence: true }),
  );
}

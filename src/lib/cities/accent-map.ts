/**
 * City → DS accent color mapping (Story 4.3).
 *
 * V1.0 mapping statique, data-driven. Phase B : ajouter champ `accent` sur le
 * modèle `City` côté Amplify schema (hors scope ici).
 *
 * Les 4 accents disponibles correspondent aux paires `*Soft` / `*` du DS
 * (Story 1.2) : grenadine (sud terrien), ocre (Lubéron / arrière-pays),
 * mer (Côte / Méditerranée), olive (nature / collines).
 *
 * Si une ville n'est pas dans la map (e.g. nouvelle ville en prod), un
 * fallback déterministe basé sur le hash du slug retourne l'un des 4 accents
 * — garantit qu'aucun bloc ne reste sans couleur.
 */

import type { Tour } from '@/types/tour';

export type CityAccent = 'grenadine' | 'ocre' | 'mer' | 'olive';

/**
 * Mapping statique slug → accent. À étendre au fur et à mesure que de
 * nouvelles villes sont publiées.
 */
export const CITY_ACCENT_MAP: Record<string, CityAccent> = {
  // Sud terrien Provence — accent rouge brique chaud
  'aix-en-provence': 'grenadine',
  'avignon': 'grenadine',
  'arles': 'grenadine',

  // Lubéron / arrière-pays / pierre dorée
  'roussillon': 'ocre',
  'gordes': 'ocre',
  'grasse': 'ocre',

  // Côte d'Azur / Méditerranée — bleu
  'nice': 'mer',
  'cannes': 'mer',
  'menton': 'mer',
  'antibes': 'mer',
  'marseille': 'mer',

  // Nature / vert — fallback villes hors Sud
  'lyon': 'olive',
  'paris': 'olive',
  'saint-remy-de-provence': 'olive',
};

/**
 * Labels affichés sur les Chip filtres (Story 4.3 AC 5).
 * Lexique éditorial Story 1.4 — pas « catégorie », pas « tag ».
 */
export const ACCENT_LABELS: Record<CityAccent, string> = {
  grenadine: 'Provence',
  ocre: 'Ocre',
  mer: 'Côte',
  olive: 'Nature',
};

const ACCENT_ORDER: readonly CityAccent[] = [
  'grenadine',
  'ocre',
  'mer',
  'olive',
] as const;

/**
 * Retourne l'accent DS d'une ville. Mapping statique d'abord, sinon
 * fallback hash déterministe (somme des charcodes mod 4) — garantit
 * stabilité d'une exécution à l'autre.
 */
export function getCityAccent(citySlug: string): CityAccent {
  const mapped = CITY_ACCENT_MAP[citySlug];
  if (mapped) return mapped;

  // Fallback hash déterministe — somme des charcodes mod 4.
  let hash = 0;
  for (let i = 0; i < citySlug.length; i++) {
    hash += citySlug.charCodeAt(i);
  }
  return ACCENT_ORDER[hash % ACCENT_ORDER.length];
}

/**
 * Calcule la durée moyenne (minutes, arrondie) des tours d'une ville.
 * Retourne `0` si aucun tour publié pour cette ville.
 */
export function getCityAverageDuration(
  citySlug: string,
  allTours: ReadonlyArray<Pick<Tour, 'citySlug' | 'duration'>>,
): number {
  const tours = allTours.filter((t) => t.citySlug === citySlug);
  if (tours.length === 0) return 0;
  const total = tours.reduce((acc, t) => acc + (t.duration || 0), 0);
  return Math.round(total / tours.length);
}

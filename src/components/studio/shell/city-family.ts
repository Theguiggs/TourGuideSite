/**
 * city-family — résolution automatique de la famille couleur Murmure
 * pour une ville donnée. Le résultat pilote la couleur des cards, pins,
 * bandes latérales, badges de la charte (cf. brief refonte-studio §6).
 *
 * 4 familles : mer (côte) · ocre (terres chaudes) · olive (nature) · ardoise (urbain).
 */

export type CityFamily = 'mer' | 'ocre' | 'olive' | 'ardoise';

const CITY_DB: Record<string, CityFamily> = {
  // Mer — côte, port, eau
  nice: 'mer',
  cannes: 'mer',
  antibes: 'mer',
  marseille: 'mer',
  menton: 'mer',
  'saint-tropez': 'mer',
  'villefranche-sur-mer': 'mer',
  eze: 'mer',
  'éze': 'mer',

  // Ocre — terres chaudes, parfum, pierre
  grasse: 'ocre',
  avignon: 'ocre',
  arles: 'ocre',
  aix: 'ocre',
  'aix-en-provence': 'ocre',
  uzes: 'ocre',
  'uzès': 'ocre',

  // Olive — nature, montagne, sentier
  vence: 'olive',
  'saint-paul-de-vence': 'olive',
  autran: 'olive',
  gordes: 'olive',
  annecy: 'olive',
  cimiez: 'olive',

  // Ardoise — pierre froide, urbain
  paris: 'ardoise',
  lyon: 'ardoise',
  strasbourg: 'ardoise',
  lille: 'ardoise',
};

const FALLBACK: CityFamily = 'ardoise';

export function cityFamily(city: string | null | undefined): CityFamily {
  if (!city) return FALLBACK;
  const key = city.toLowerCase().trim();
  return CITY_DB[key] ?? FALLBACK;
}

/** Métadonnées d'affichage par famille — classes Tailwind en littéraux statiques
 * pour que le purger les conserve à coup sûr. */
export const FAMILY_META: Record<
  CityFamily,
  { label: string; bg: string; bgSoft: string; text: string; border: string }
> = {
  mer: { label: 'Mer', bg: 'bg-mer', bgSoft: 'bg-mer-soft', text: 'text-mer', border: 'border-mer' },
  ocre: { label: 'Ocre', bg: 'bg-ocre', bgSoft: 'bg-ocre-soft', text: 'text-ocre', border: 'border-ocre' },
  olive: { label: 'Olive', bg: 'bg-olive', bgSoft: 'bg-olive-soft', text: 'text-olive', border: 'border-olive' },
  ardoise: { label: 'Ardoise', bg: 'bg-ardoise', bgSoft: 'bg-paper-soft', text: 'text-ardoise', border: 'border-ardoise' },
};

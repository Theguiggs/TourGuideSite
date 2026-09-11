/**
 * Pays d'une ville du catalogue (code ISO 3166-1 alpha-2), pour les données
 * structurées. `addressCountry: 'FR'` était écrit en dur : Barcelone et
 * Monaco se déclaraient en France.
 */
const COUNTRY_BY_CITY_SLUG: Record<string, string> = {
  barcelone: 'ES',
  barcelona: 'ES',
  monaco: 'MC',
};

export function cityCountry(citySlug: string): string {
  return COUNTRY_BY_CITY_SLUG[citySlug.toLowerCase()] ?? 'FR';
}

import type { Tour } from '@/types/tour';

/** Carte publique minimale : aucune URL média ni donnée de session. */
export type HomeTour = Pick<Tour, 'id' | 'title' | 'city' | 'citySlug' | 'slug' | 'duration' | 'purchaseType' | 'priceCents' | 'availableLanguages'>;

export function homeSelection(tours: Tour[]) {
  const ids = new Set<string>();
  const paths = new Set<string>();
  const published = tours.filter(tour => {
    const path = `${tour.citySlug}/${tour.slug}`;
    if (tour.status !== 'published' || typeof tour.id !== 'string' || !tour.id || typeof tour.title !== 'string' || !tour.title.trim() || typeof tour.city !== 'string' || !tour.city.trim()
      || typeof tour.citySlug !== 'string' || typeof tour.slug !== 'string'
      || !/^[a-z0-9-]+$/.test(tour.citySlug) || !/^[a-z0-9-]+$/.test(tour.slug)
      || ids.has(tour.id) || paths.has(path)) return false;
    ids.add(tour.id); paths.add(path); return true;
  }).sort((a, b) => a.citySlug.localeCompare(b.citySlug) || a.slug.localeCompare(b.slug));
  const cities = Array.from(new Map(published.map(tour => [tour.citySlug, { slug: tour.citySlug, name: tour.city }])).values());
  const chosenCities = new Set<string>();
  const featured = published.filter(tour => {
    if (chosenCities.has(tour.citySlug)) return false;
    chosenCities.add(tour.citySlug); return true;
  }).slice(0, 3);
  for (const tour of published) {
    if (featured.length === 3) break;
    if (!featured.includes(tour)) featured.push(tour);
  }
  const project = (tour: Tour): HomeTour => ({ id: tour.id, title: tour.title, city: tour.city, citySlug: tour.citySlug, slug: tour.slug, duration: tour.duration, purchaseType: tour.purchaseType, priceCents: tour.priceCents, availableLanguages: tour.availableLanguages });
  return { cities, featured: featured.map(project), resumeTours: published.map(({ id, title, citySlug, slug }) => ({ id, title, citySlug, slug })) };
}

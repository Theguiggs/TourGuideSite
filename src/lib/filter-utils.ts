/**
 * Tour filtering logic — shared between catalogue and admin pages.
 * Client-side only: no backend calls per filter change.
 */

export interface TourFilters {
  langues: string[];
  dureeMin: number;
  dureeMax: number;
  ville: string;
  themes: string[];
  status?: string;
}

export const DEFAULT_FILTERS: TourFilters = {
  langues: [],
  dureeMin: 0,
  dureeMax: 180,
  ville: '',
  themes: [],
};

export const AVAILABLE_LANGUES = [
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'it', label: 'Italiano', flag: 'IT' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
] as const;

export const AVAILABLE_THEMES = [
  'histoire', 'gastronomie', 'art', 'nature',
  'architecture', 'culture', 'insolite', 'romantique',
  'famille', 'sportif',
] as const;

export const DURATION_STEPS = [15, 30, 45, 60, 90, 120, 150, 180] as const;

export interface FilterableTour {
  duration?: number | null;
  city?: string;
  languePrincipale?: string;
  themes?: string[];
  status?: string | null;
}

/** Filter tours using AND logic. Empty filter = no constraint. */
export function filterTours<T extends FilterableTour>(
  tours: T[],
  filters: TourFilters,
): T[] {
  return tours.filter((tour) => {
    // Language filter (OR within, AND with others)
    if (filters.langues.length > 0) {
      if (!tour.languePrincipale || !filters.langues.includes(tour.languePrincipale)) {
        return false;
      }
    }

    // Duration range
    const d = tour.duration ?? 0;
    if (filters.dureeMin > 0 && d < filters.dureeMin) return false;
    if (filters.dureeMax < 180 && d > filters.dureeMax) return false;

    // City
    if (filters.ville && tour.city?.toLowerCase() !== filters.ville.toLowerCase()) {
      return false;
    }

    // Themes (OR within, AND with others)
    if (filters.themes.length > 0) {
      const tourThemes = tour.themes ?? [];
      if (!filters.themes.some((t) => tourThemes.includes(t))) {
        return false;
      }
    }

    // Status (admin only)
    if (filters.status && tour.status !== filters.status) {
      return false;
    }

    return true;
  });
}

/** Count how many filters are actively set. */
export function getActiveFilterCount(filters: TourFilters): number {
  let count = 0;
  if (filters.langues.length > 0) count++;
  if (filters.dureeMin > 0 || filters.dureeMax < 180) count++;
  if (filters.ville) count++;
  if (filters.themes.length > 0) count++;
  if (filters.status) count++;
  return count;
}

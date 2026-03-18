import {
  filterTours,
  getActiveFilterCount,
  DEFAULT_FILTERS,
} from '../filter-utils';
import type { TourFilters, FilterableTour } from '../filter-utils';

const MOCK_TOURS: FilterableTour[] = [
  { duration: 45, city: 'Grasse', languePrincipale: 'fr', themes: ['histoire', 'architecture'], status: 'published' },
  { duration: 90, city: 'Nice', languePrincipale: 'en', themes: ['nature', 'art'], status: 'review' },
  { duration: 30, city: 'Grasse', languePrincipale: 'fr', themes: ['gastronomie'], status: 'published' },
  { duration: 120, city: 'Cannes', languePrincipale: 'es', themes: ['culture', 'histoire'], status: 'revision_requested' },
  { duration: 60, city: 'Nice', languePrincipale: 'fr', themes: ['insolite'], status: 'draft' },
];

describe('filter-utils', () => {
  describe('filterTours', () => {
    it('should return all tours when no filters active', () => {
      const result = filterTours(MOCK_TOURS, DEFAULT_FILTERS);
      expect(result).toHaveLength(5);
    });

    it('should filter by language', () => {
      const filters: TourFilters = { ...DEFAULT_FILTERS, langues: ['fr'] };
      const result = filterTours(MOCK_TOURS, filters);
      expect(result).toHaveLength(3);
      result.forEach((t) => expect(t.languePrincipale).toBe('fr'));
    });

    it('should filter by theme (OR within themes)', () => {
      const filters: TourFilters = { ...DEFAULT_FILTERS, themes: ['histoire'] };
      const result = filterTours(MOCK_TOURS, filters);
      expect(result).toHaveLength(2);
    });

    it('should apply AND logic across different filters', () => {
      const filters: TourFilters = { ...DEFAULT_FILTERS, langues: ['fr'], themes: ['histoire'] };
      const result = filterTours(MOCK_TOURS, filters);
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Grasse');
    });

    it('should filter by duration range', () => {
      const filters: TourFilters = { ...DEFAULT_FILTERS, dureeMin: 60, dureeMax: 120 };
      const result = filterTours(MOCK_TOURS, filters);
      expect(result).toHaveLength(3); // 90, 60, 120
    });

    it('should filter by city', () => {
      const filters: TourFilters = { ...DEFAULT_FILTERS, ville: 'Nice' };
      const result = filterTours(MOCK_TOURS, filters);
      expect(result).toHaveLength(2);
    });

    it('should filter by status (admin)', () => {
      const filters: TourFilters = { ...DEFAULT_FILTERS, status: 'review' };
      const result = filterTours(MOCK_TOURS, filters);
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Nice');
    });
  });

  describe('getActiveFilterCount', () => {
    it('should return 0 for default filters', () => {
      expect(getActiveFilterCount(DEFAULT_FILTERS)).toBe(0);
    });

    it('should count each active filter group', () => {
      const filters: TourFilters = {
        langues: ['fr'],
        dureeMin: 30,
        dureeMax: 180,
        ville: 'Grasse',
        themes: ['histoire'],
        status: 'review',
      };
      expect(getActiveFilterCount(filters)).toBe(5); // langue + duree + ville + themes + status
    });

    it('should count duration range as one filter', () => {
      const filters: TourFilters = { ...DEFAULT_FILTERS, dureeMin: 30, dureeMax: 90 };
      expect(getActiveFilterCount(filters)).toBe(1);
    });
  });
});

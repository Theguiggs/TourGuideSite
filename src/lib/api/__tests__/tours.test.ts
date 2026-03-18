import { getCities, getCityBySlug, getToursByCity, getTourBySlug, getAllTours } from '../tours';

describe('tours API', () => {
  describe('getCities', () => {
    it('should return all cities', async () => {
      const cities = await getCities();
      expect(cities.length).toBeGreaterThan(0);
      expect(cities[0]).toHaveProperty('id');
      expect(cities[0]).toHaveProperty('name');
      expect(cities[0]).toHaveProperty('slug');
      expect(cities[0]).toHaveProperty('tourCount');
    });
  });

  describe('getCityBySlug', () => {
    it('should return city for valid slug', async () => {
      const city = await getCityBySlug('grasse');
      expect(city).not.toBeNull();
      expect(city!.name).toBe('Grasse');
    });

    it('should return null for invalid slug', async () => {
      const city = await getCityBySlug('nonexistent');
      expect(city).toBeNull();
    });
  });

  describe('getToursByCity', () => {
    it('should return published tours for city', async () => {
      const tours = await getToursByCity('grasse');
      expect(tours.length).toBeGreaterThan(0);
      tours.forEach((tour) => {
        expect(tour.citySlug).toBe('grasse');
        expect(tour.status).toBe('published');
      });
    });

    it('should sort free tours first', async () => {
      const tours = await getToursByCity('grasse');
      if (tours.length >= 2) {
        const freeIndex = tours.findIndex((t) => t.isFree);
        const paidIndex = tours.findIndex((t) => !t.isFree);
        if (freeIndex >= 0 && paidIndex >= 0) {
          expect(freeIndex).toBeLessThan(paidIndex);
        }
      }
    });

    it('should return empty array for city with no tours', async () => {
      const tours = await getToursByCity('unknown-city');
      expect(tours).toEqual([]);
    });
  });

  describe('getTourBySlug', () => {
    it('should return tour detail with reviews and POIs', async () => {
      const tour = await getTourBySlug('grasse', 'ame-des-parfumeurs');
      expect(tour).not.toBeNull();
      expect(tour!.title).toBe("L'Ame des Parfumeurs");
      expect(tour!.pois.length).toBeGreaterThan(0);
      expect(tour!.reviews.length).toBeGreaterThan(0);
      expect(tour!.averageRating).toBeGreaterThan(0);
    });

    it('should return null for invalid slug', async () => {
      const tour = await getTourBySlug('grasse', 'nonexistent');
      expect(tour).toBeNull();
    });

    it('should return tour-specific POIs with correct coordinates', async () => {
      const grasse = await getTourBySlug('grasse', 'ame-des-parfumeurs');
      const paris = await getTourBySlug('paris', 'secrets-de-montmartre');
      expect(grasse).not.toBeNull();
      expect(paris).not.toBeNull();
      // Grasse POIs should be near Grasse (lat ~43.6)
      expect(grasse!.pois[0].latitude).toBeCloseTo(43.6, 0);
      // Paris POIs should be near Paris (lat ~48.8)
      expect(paris!.pois[0].latitude).toBeCloseTo(48.9, 0);
    });

    it('should compute average rating from tour reviews', async () => {
      const tour = await getTourBySlug('grasse', 'ame-des-parfumeurs');
      expect(tour).not.toBeNull();
      // 3 reviews: 5, 4, 5 → average 4.7
      expect(tour!.averageRating).toBe(4.7);
      expect(tour!.reviewCount).toBe(3);
    });
  });

  describe('getAllTours', () => {
    it('should return only published tours', async () => {
      const tours = await getAllTours();
      expect(tours.length).toBeGreaterThan(0);
      tours.forEach((tour) => {
        expect(tour.status).toBe('published');
      });
    });
  });
});

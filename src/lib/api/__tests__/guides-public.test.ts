import {
  getGuideBySlug,
  getGuidePublicTours,
  getAllPublicGuides,
  getGuidesByCity,
  getGuideSlugByGuideId,
  generateGuideSlug,
} from '../guides-public';

describe('guides-public API', () => {
  describe('generateGuideSlug', () => {
    it('should generate URL-friendly slug from name and city', () => {
      expect(generateGuideSlug('Marie Dupont', 'Grasse')).toBe('marie-dupont-grasse');
    });

    it('should remove accents', () => {
      expect(generateGuideSlug('Marie-Claire Dubois', 'Geneve')).toBe('marie-claire-dubois-geneve');
    });

    it('should handle special characters', () => {
      expect(generateGuideSlug("Jean d'Arc", 'Orleans')).toBe('jean-d-arc-orleans');
    });
  });

  describe('getGuideBySlug', () => {
    it('should return guide for valid slug', async () => {
      const guide = await getGuideBySlug('marie-dupont-grasse');
      expect(guide).not.toBeNull();
      expect(guide!.displayName).toBe('Marie Dupont');
      expect(guide!.city).toBe('Grasse');
      expect(guide!.totalListens).toBeGreaterThan(0);
    });

    it('should return null for unknown slug', async () => {
      const guide = await getGuideBySlug('nonexistent-guide');
      expect(guide).toBeNull();
    });

    it('should include slug field in response', async () => {
      const guide = await getGuideBySlug('marie-dupont-grasse');
      expect(guide!.slug).toBe('marie-dupont-grasse');
    });
  });

  describe('getGuidePublicTours', () => {
    it('should return published tours for guide', async () => {
      const tours = await getGuidePublicTours('guide-1');
      expect(tours.length).toBeGreaterThan(0);
      tours.forEach((t) => {
        expect(t.guideId).toBe('guide-1');
        expect(t.status).toBe('published');
      });
    });

    it('should return empty array for unknown guide', async () => {
      const tours = await getGuidePublicTours('nonexistent');
      expect(tours).toEqual([]);
    });
  });

  describe('getAllPublicGuides', () => {
    it('should return all guides with slugs', async () => {
      const guides = await getAllPublicGuides();
      expect(guides.length).toBeGreaterThan(0);
      guides.forEach((g) => {
        expect(g.slug).toBeTruthy();
        expect(g.displayName).toBeTruthy();
      });
    });
  });

  describe('getGuidesByCity', () => {
    it('should return guides for Grasse', async () => {
      const guides = await getGuidesByCity('grasse');
      expect(guides.length).toBe(2); // Marie + Pierre
      guides.forEach((g) => {
        expect(g.city).toBe('Grasse');
      });
    });

    it('should return empty array for city with no guides', async () => {
      const guides = await getGuidesByCity('unknown-city');
      expect(guides).toEqual([]);
    });
  });

  describe('getGuideSlugByGuideId', () => {
    it('should return slug for valid guide ID', async () => {
      const slug = await getGuideSlugByGuideId('guide-1');
      expect(slug).toBe('marie-dupont-grasse');
    });

    it('should return null for unknown guide ID', async () => {
      const slug = await getGuideSlugByGuideId('nonexistent');
      expect(slug).toBeNull();
    });
  });

  describe('guide profile fields', () => {
    it('should include all required public fields', async () => {
      const guide = await getGuideBySlug('marie-dupont-grasse');
      expect(guide).not.toBeNull();
      expect(guide!.displayName).toBeTruthy();
      expect(guide!.bio).toBeTruthy();
      expect(guide!.city).toBeTruthy();
      expect(guide!.specialties.length).toBeGreaterThan(0);
      expect(guide!.rating).toBeGreaterThan(0);
      expect(guide!.totalListens).toBeGreaterThan(0);
    });

    it('should include years of experience and parcours signature when available', async () => {
      const guide = await getGuideBySlug('marie-dupont-grasse');
      expect(guide!.yearsExperience).toBe(15);
      expect(guide!.parcoursSignature).toBe("L'Ame des Parfumeurs");
    });
  });

  describe('edge cases', () => {
    it('guide with no published tours returns empty array', async () => {
      const tours = await getGuidePublicTours('guide-unknown');
      expect(tours).toEqual([]);
    });

    it('all guides have verified status', async () => {
      const guides = await getAllPublicGuides();
      guides.forEach((g) => {
        expect(g.verified).toBe(true);
      });
    });
  });
});

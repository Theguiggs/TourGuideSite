import {
  getGuideDashboardStats,
  getGuideTours,
  getGuideRevenueSummary,
  getGuideRevenueMonths,
  getGuideRevenueTours,
  getGuideProfile,
  updateGuideProfile,
  submitTourForModeration,
  getGuideTourDetail,
  submitTourForReview,
  updateGuideTour,
  addAdminComment,
} from '../guide';

describe('guide API', () => {
  describe('getGuideDashboardStats', () => {
    it('should return stats with required fields', async () => {
      const stats = await getGuideDashboardStats('guide-1');
      expect(stats).toHaveProperty('totalListens');
      expect(stats).toHaveProperty('revenueThisMonth');
      expect(stats).toHaveProperty('averageRating');
      expect(stats).toHaveProperty('pendingToursCount');
      expect(stats.totalListens).toBeGreaterThan(0);
    });
  });

  describe('getGuideTours', () => {
    it('should return tours with status and stats', async () => {
      const tours = await getGuideTours('guide-1');
      expect(tours.length).toBeGreaterThan(0);
      const published = tours.find((t) => t.status === 'published');
      expect(published).toBeDefined();
      expect(published!.listens).toBeGreaterThan(0);
    });

    it('should include synced and review tours', async () => {
      const tours = await getGuideTours('guide-1');
      const synced = tours.find((t) => t.status === 'synced');
      const review = tours.find((t) => t.status === 'review');
      expect(synced).toBeDefined();
      expect(review).toBeDefined();
    });

    it('should include revision_requested tours with feedback', async () => {
      const tours = await getGuideTours('guide-1');
      const revision = tours.find((t) => t.status === 'revision_requested');
      expect(revision).toBeDefined();
      expect(revision!.rejectionFeedback).toBeTruthy();
    });
  });

  describe('getGuideRevenueSummary', () => {
    it('should return revenue summary', async () => {
      const revenue = await getGuideRevenueSummary('guide-1');
      expect(revenue.currency).toBe('EUR');
      expect(revenue.thisMonth).toBeGreaterThan(0);
      expect(revenue.total).toBeGreaterThan(revenue.thisMonth);
    });
  });

  describe('getGuideRevenueMonths', () => {
    it('should return monthly revenue with 70/30 split', async () => {
      const months = await getGuideRevenueMonths('guide-1');
      expect(months.length).toBeGreaterThan(0);
      months.forEach((m) => {
        const expectedGuide = Math.round(m.grossRevenue * 0.7 * 100) / 100;
        expect(m.guideShare).toBeCloseTo(expectedGuide, 1);
      });
    });
  });

  describe('getGuideRevenueTours', () => {
    it('should return tour revenue percentages summing to ~100', async () => {
      const tours = await getGuideRevenueTours('guide-1');
      const total = tours.reduce((sum, t) => sum + t.percentage, 0);
      expect(total).toBeCloseTo(100, 0);
    });
  });

  describe('getGuideProfile', () => {
    it('should return profile for valid guide', async () => {
      const profile = await getGuideProfile('guide-1');
      expect(profile).not.toBeNull();
      expect(profile!.displayName).toBe('Marie Dupont');
      expect(profile!.specialties.length).toBeGreaterThan(0);
    });

    it('should return null for unknown guide', async () => {
      const profile = await getGuideProfile('nonexistent');
      expect(profile).toBeNull();
    });
  });

  describe('updateGuideProfile', () => {
    it('should accept valid updates', async () => {
      const result = await updateGuideProfile('guide-1', { displayName: 'Marie D.' });
      expect(result.ok).toBe(true);
    });

    it('should reject name too short', async () => {
      const result = await updateGuideProfile('guide-1', { displayName: 'M' });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('2');
    });

    it('should reject bio too long', async () => {
      const result = await updateGuideProfile('guide-1', { bio: 'x'.repeat(501) });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('500');
    });
  });

  describe('submitTourForModeration', () => {
    it('should return ok', async () => {
      const result = await submitTourForModeration('tour-1');
      expect(result.ok).toBe(true);
    });
  });

  // ===== Epic 14 Story 14-1 Tests =====

  describe('getGuideTourDetail', () => {
    it('should return full detail for known synced tour', async () => {
      const detail = await getGuideTourDetail('grasse-vieille-ville');
      expect(detail).not.toBeNull();
      expect(detail!.status).toBe('synced');
      expect(detail!.title).toBe('La Vieille Ville de Grasse');
      expect(detail!.descriptionLongue).toBeTruthy();
      expect(detail!.scenes.length).toBe(3);
      expect(detail!.difficulty).toBe('facile');
      expect(detail!.themes).toContain('histoire');
      expect(detail!.languePrincipale).toBe('fr');
    });

    it('should return admin comments for revision_requested tour', async () => {
      const detail = await getGuideTourDetail('grasse-jardins-secrets');
      expect(detail).not.toBeNull();
      expect(detail!.status).toBe('revision_requested');
      expect(detail!.adminComments.length).toBeGreaterThan(0);
      const globalComment = detail!.adminComments.find((c) => !c.sceneId);
      expect(globalComment).toBeDefined();
      const sceneComment = detail!.adminComments.find((c) => c.sceneId === 'scene-2');
      expect(sceneComment).toBeDefined();
    });

    it('should return minimal detail for tour without full data', async () => {
      const detail = await getGuideTourDetail('grasse-ame-parfumeurs');
      expect(detail).not.toBeNull();
      expect(detail!.scenes).toEqual([]);
      expect(detail!.adminComments).toEqual([]);
    });

    it('should return null for unknown tour', async () => {
      const detail = await getGuideTourDetail('nonexistent');
      expect(detail).toBeNull();
    });
  });

  describe('submitTourForReview', () => {
    it('should return ok in stub mode', async () => {
      const result = await submitTourForReview('grasse-vieille-ville');
      expect(result.ok).toBe(true);
    });
  });

  describe('updateGuideTour (enriched)', () => {
    it('should accept enriched fields in stub mode', async () => {
      const result = await updateGuideTour('grasse-vieille-ville', {
        title: 'Updated Title',
        descriptionLongue: 'New description',
        difficulty: 'moyen',
        themes: ['histoire', 'art'],
        languePrincipale: 'en',
      });
      expect(result.ok).toBe(true);
    });
  });

  describe('addAdminComment', () => {
    it('should return ok in stub mode', async () => {
      const result = await addAdminComment('grasse-vieille-ville', {
        sceneId: 'scene-1',
        comment: 'Test comment',
        date: new Date().toISOString(),
        reviewerId: 'admin-1',
        reviewerName: 'Test Admin',
      });
      expect(result.ok).toBe(true);
    });
  });
});

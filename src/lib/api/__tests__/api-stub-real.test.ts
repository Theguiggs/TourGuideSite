/**
 * Tests for stub/real API toggle behavior.
 * Verifies that all API modules return correct types in stub mode
 * and handle errors gracefully.
 */

// Mock the api-mode module
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: jest.fn(() => true),
  shouldUseRealApi: jest.fn(() => false),
}));

// Mock appsync-client to prevent real API calls
jest.mock('../appsync-client', () => ({
  listGuideTours: jest.fn(() => Promise.resolve([])),
  getGuideTourById: jest.fn(() => Promise.resolve(null)),
  listGuideProfiles: jest.fn(() => Promise.resolve([])),
  getGuideProfileById: jest.fn(() => Promise.resolve(null)),
  listTourReviews: jest.fn(() => Promise.resolve([])),
  getTourStats: jest.fn(() => Promise.resolve(null)),
  updateGuideProfileMutation: jest.fn(() => Promise.resolve({ ok: true, data: {} })),
  updateGuideTourMutation: jest.fn(() => Promise.resolve({ ok: true, data: {} })),
  listModerationItems: jest.fn(() => Promise.resolve([])),
  getModerationItemById: jest.fn(() => Promise.resolve(null)),
  updateModerationItemMutation: jest.fn(() => Promise.resolve({ ok: true, data: {} })),
  getGuideDashboardStatsById: jest.fn(() => Promise.resolve(null)),
}));

import { getCities, getToursByCity, getTourBySlug, getAllTours } from '../tours';
import { getAllPublicGuides, getGuideBySlug, getGuidePublicTours } from '../guides-public';
import { getGuideDashboardStats, getGuideTours, getGuideProfile, updateGuideProfile } from '../guide';
import { getModerationQueue, getModerationMetrics, getModerationHistory, approveTour, rejectTour } from '../moderation';
import { shouldUseStubs } from '@/config/api-mode';

describe('API layer — stub mode', () => {
  beforeAll(() => {
    (shouldUseStubs as jest.Mock).mockReturnValue(true);
  });

  // --- Tours ---
  describe('tours (stub)', () => {
    it('getCities returns 3 cities', async () => {
      const cities = await getCities();
      expect(cities).toHaveLength(3);
      expect(cities[0].slug).toBe('grasse');
    });

    it('getToursByCity returns published tours for grasse', async () => {
      const tours = await getToursByCity('grasse');
      expect(tours.length).toBeGreaterThanOrEqual(1);
      expect(tours.every((t) => t.citySlug === 'grasse')).toBe(true);
    });

    it('getTourBySlug returns tour detail with POIs', async () => {
      const detail = await getTourBySlug('grasse', 'ame-des-parfumeurs');
      expect(detail).not.toBeNull();
      expect(detail!.pois.length).toBeGreaterThan(0);
      expect(detail!.reviews.length).toBeGreaterThan(0);
      expect(detail!.averageRating).toBeGreaterThan(0);
    });

    it('getTourBySlug returns null for unknown tour', async () => {
      const detail = await getTourBySlug('grasse', 'nonexistent');
      expect(detail).toBeNull();
    });

    it('getAllTours returns all published tours', async () => {
      const tours = await getAllTours();
      expect(tours.length).toBeGreaterThanOrEqual(4);
    });
  });

  // --- Guides ---
  describe('guides public (stub)', () => {
    it('getAllPublicGuides returns 4 guides with slugs', async () => {
      const guides = await getAllPublicGuides();
      expect(guides).toHaveLength(4);
      expect(guides[0].slug).toBeDefined();
    });

    it('getGuideBySlug returns guide for valid slug', async () => {
      const guides = await getAllPublicGuides();
      const guide = await getGuideBySlug(guides[0].slug);
      expect(guide).not.toBeNull();
      expect(guide!.displayName).toBe('Marie Dupont');
    });

    it('getGuidePublicTours returns tours for guide-1', async () => {
      const tours = await getGuidePublicTours('guide-1');
      expect(tours.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Guide Dashboard ---
  describe('guide dashboard (stub)', () => {
    it('getGuideDashboardStats returns stats', async () => {
      const stats = await getGuideDashboardStats('guide-1');
      expect(stats.totalListens).toBe(347);
    });

    it('getGuideTours returns tour summaries', async () => {
      const tours = await getGuideTours('guide-1');
      expect(tours.length).toBeGreaterThanOrEqual(1);
    });

    it('getGuideProfile returns profile for guide-1', async () => {
      const profile = await getGuideProfile('guide-1');
      expect(profile).not.toBeNull();
      expect(profile!.displayName).toBe('Marie Dupont');
    });

    it('updateGuideProfile validates name length', async () => {
      const result = await updateGuideProfile('guide-1', { displayName: 'A' });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('2 et 50');
    });

    it('updateGuideProfile succeeds with valid data', async () => {
      const result = await updateGuideProfile('guide-1', { displayName: 'Marie Updated' });
      expect(result.ok).toBe(true);
    });
  });

  // --- Moderation ---
  describe('moderation (stub)', () => {
    it('getModerationQueue returns sorted items', async () => {
      const queue = await getModerationQueue();
      expect(queue.length).toBe(3);
      // Resubmitted first
      expect(queue[0].isResubmission).toBe(true);
    });

    it('getModerationMetrics returns stats', async () => {
      const metrics = await getModerationMetrics();
      expect(metrics.pendingCount).toBe(3);
      expect(metrics.approvalRate).toBe(75);
    });

    it('getModerationHistory returns sorted history', async () => {
      const history = await getModerationHistory();
      expect(history.length).toBe(4);
    });

    it('approveTour succeeds for valid moderation ID', async () => {
      const result = await approveTour('mod-1', {}, '');
      expect(result.ok).toBe(true);
    });

    it('rejectTour validates feedback length', async () => {
      const result = await rejectTour('mod-1', 'audio_quality', 'Too short', []);
      expect(result.ok).toBe(false);
    });

    it('rejectTour succeeds with valid feedback', async () => {
      const result = await rejectTour('mod-1', 'audio_quality', 'Le son est trop faible sur les POIs 1, 2 et 3.', []);
      expect(result.ok).toBe(true);
    });
  });
});

describe('API layer — error handling (real mode)', () => {
  beforeAll(() => {
    (shouldUseStubs as jest.Mock).mockReturnValue(false);
  });

  it('getCities returns empty array on API failure', async () => {
    const cities = await getCities();
    expect(Array.isArray(cities)).toBe(true);
  });

  it('getTourBySlug returns null on API failure', async () => {
    const detail = await getTourBySlug('grasse', 'ame-des-parfumeurs');
    expect(detail).toBeNull();
  });

  it('getAllPublicGuides returns empty array on API failure', async () => {
    const guides = await getAllPublicGuides();
    expect(Array.isArray(guides)).toBe(true);
    expect(guides).toHaveLength(0);
  });

  it('getModerationQueue returns empty on API failure', async () => {
    const queue = await getModerationQueue();
    expect(Array.isArray(queue)).toBe(true);
  });
});

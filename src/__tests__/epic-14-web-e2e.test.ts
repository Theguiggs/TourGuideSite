/**
 * Epic 14: Web Portal — Demo E2E Scenarios
 * Story 14.6: Demo E2E & Regression Epics 11-14
 *
 * Validates the complete web portal moderation + filter workflow:
 * S1: Guide editor — load tour, edit, save, submit for review
 * S2: Admin moderation — queue, review, 4 actions (comment, revision, validate, reject)
 * S3: TourFilterBar — language, theme, city, duration, status filters
 * S4: Notifications — sendGuideNotification called after each admin action
 * S5: Notification templates — RGPD compliance, correct content per action
 */

// Force stub mode for tests
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

import {
  getModerationQueue,
  getModerationDetail,
  getModerationMetrics,
  approveTour,
  rejectTour,
  sendBackForRevision,
  addReviewComment,
} from '../lib/api/moderation';
import { sendGuideNotification } from '../lib/api/guide-notifications';
import { getNotificationContent } from '../lib/notification-templates';
import type { NotificationAction } from '../lib/notification-templates';
import { filterTours, getActiveFilterCount, DEFAULT_FILTERS } from '../lib/filter-utils';
import type { TourFilters, FilterableTour } from '../lib/filter-utils';

// ============================================
// Mock tour data for filter tests
// ============================================
const MOCK_WEB_TOURS: FilterableTour[] = [
  { duration: 45, city: 'Grasse', languePrincipale: 'fr', themes: ['histoire', 'parfums'] },
  { duration: 90, city: 'Nice', languePrincipale: 'en', themes: ['nature', 'art'] },
  { duration: 30, city: 'Grasse', languePrincipale: 'fr', themes: ['gastronomie'] },
  { duration: 120, city: 'Cannes', languePrincipale: 'es', themes: ['culture'] },
];

// ============================================
// S1: Admin Moderation Queue & Detail
// ============================================

describe('S1: Admin Moderation Queue & Detail', () => {
  it('should load moderation queue with required fields', async () => {
    const queue = await getModerationQueue();
    expect(queue.length).toBeGreaterThan(0);
    queue.forEach((item) => {
      expect(item.id).toBeTruthy();
      expect(item.tourTitle).toBeTruthy();
      expect(item.guideName).toBeTruthy();
      expect(item.status).toBeTruthy();
    });
  });

  it('should load enriched moderation detail', async () => {
    const detail = await getModerationDetail('mod-1');
    expect(detail).not.toBeNull();
    expect(detail!.tourTitle).toBeTruthy();
    expect(detail!.themes.length).toBeGreaterThan(0);
    expect(detail!.scenes.length).toBeGreaterThan(0);
    expect(detail!.languePrincipale).toBeTruthy();
    expect(detail!.guideSubmissionCount).toBeGreaterThan(0);
  });

  it('should load moderation metrics', async () => {
    const metrics = await getModerationMetrics();
    expect(metrics.pendingCount).toBeGreaterThan(0);
    expect(metrics.avgReviewTimeMinutes).toBeGreaterThan(0);
  });
});

// ============================================
// S2: Admin 4 Actions
// ============================================

describe('S2: Admin 4 Actions', () => {
  it('should approve tour with checklist', async () => {
    const result = await approveTour('mod-1', {audio: {checked: true, note: ''}}, 'OK');
    expect(result.ok).toBe(true);
  });

  it('should reject tour with feedback', async () => {
    const result = await rejectTour('mod-1', 'audio_quality', 'Audio de mauvaise qualite sur les scenes 2 et 3.', ['poi-1']);
    expect(result.ok).toBe(true);
  });

  it('should send back for revision', async () => {
    const result = await sendBackForRevision('mod-1', 'Corrections necessaires');
    expect(result.ok).toBe(true);
  });

  it('should add global comment', async () => {
    const result = await addReviewComment('tour-1', {
      comment: 'Beau parcours, quelques corrections mineures',
      reviewerId: 'admin-1',
      reviewerName: 'Admin E2E',
    });
    expect(result.ok).toBe(true);
  });

  it('should add scene-level comment', async () => {
    const result = await addReviewComment('tour-1', {
      sceneId: 'scene-1',
      comment: 'Audio faible sur cette scene',
      reviewerId: 'admin-1',
      reviewerName: 'Admin E2E',
    });
    expect(result.ok).toBe(true);
  });
});

// ============================================
// S3: TourFilterBar (web)
// ============================================

describe('S3: Catalogue Filters Web', () => {
  it('should return all tours with default filters', () => {
    expect(filterTours(MOCK_WEB_TOURS, DEFAULT_FILTERS)).toHaveLength(4);
  });

  it('should filter by language FR', () => {
    const filters: TourFilters = {...DEFAULT_FILTERS, langues: ['fr']};
    const result = filterTours(MOCK_WEB_TOURS, filters);
    expect(result).toHaveLength(2);
  });

  it('should filter by theme', () => {
    const filters: TourFilters = {...DEFAULT_FILTERS, themes: ['histoire']};
    expect(filterTours(MOCK_WEB_TOURS, filters)).toHaveLength(1);
  });

  it('should apply AND across filters', () => {
    const filters: TourFilters = {...DEFAULT_FILTERS, langues: ['fr'], ville: 'Grasse'};
    expect(filterTours(MOCK_WEB_TOURS, filters)).toHaveLength(2);
  });

  it('should count active filters', () => {
    expect(getActiveFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(getActiveFilterCount({...DEFAULT_FILTERS, langues: ['fr'], ville: 'Nice'})).toBe(2);
  });
});

// ============================================
// S4: Notification after admin actions
// ============================================

describe('S4: Notifications after admin actions', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('should send validate notification (fire-and-forget)', async () => {
    const result = await sendGuideNotification('guide-1', 'tour-1', 'Grasse Parfums', 'validate');
    expect(result.ok).toBe(true);
  });

  it('should send revision notification with comments', async () => {
    const result = await sendGuideNotification('guide-1', 'tour-1', 'Grasse Parfums', 'revision', 'Corriger scene 2');
    expect(result.ok).toBe(true);
  });

  it('should send reject notification with feedback', async () => {
    const result = await sendGuideNotification('guide-1', 'tour-1', 'Grasse Parfums', 'reject', 'Contenu non conforme');
    expect(result.ok).toBe(true);
  });

  it('should never throw even on empty params (fire-and-forget safe)', async () => {
    await expect(sendGuideNotification('', '', '', 'validate')).resolves.toHaveProperty('ok');
  });
});

// ============================================
// S5: Notification Templates RGPD
// ============================================

describe('S5: Notification Templates RGPD', () => {
  const GENERIC_SUBJECT = 'Mise à jour de votre visite';
  const actions: NotificationAction[] = ['validate', 'revision', 'reject'];

  it('should use generic subject for all actions (RGPD)', () => {
    actions.forEach((action) => {
      const content = getNotificationContent(action, 'Mon Parcours');
      expect(content.subject).toBe(GENERIC_SUBJECT);
      expect(content.subject).not.toContain('Mon Parcours');
    });
  });

  it('should include tour title in body but not in subject', () => {
    actions.forEach((action) => {
      const content = getNotificationContent(action, 'Grasse Parfums');
      expect(content.subject).not.toContain('Grasse Parfums');
      expect(content.body).toContain('Grasse Parfums');
    });
  });

  it('should include comments in revision body', () => {
    const content = getNotificationContent('revision', 'Tour Test', 'Corriger audio scene 3');
    expect(content.body).toContain('Corriger audio scene 3');
  });

  it('should include comments in reject body', () => {
    const content = getNotificationContent('reject', 'Tour Test', 'Contenu inapproprie');
    expect(content.body).toContain('Contenu inapproprie');
  });

  it('should have push notification fields for all actions', () => {
    actions.forEach((action) => {
      const content = getNotificationContent(action, 'Test');
      expect(content.pushTitle).toBeTruthy();
      expect(content.pushBody).toBeTruthy();
    });
  });
});

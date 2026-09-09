import { render, screen, waitFor } from '@testing-library/react';
import ModerationQueuePage from '../page';

const getLanguageModerationQueue = jest.fn();
const getModerationMetrics = jest.fn();

jest.mock('@/lib/api/moderation', () => ({
  getLanguageModerationQueue: (...args: unknown[]) => getLanguageModerationQueue(...args),
  getModerationMetrics: (...args: unknown[]) => getModerationMetrics(...args),
}));

jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AdminAnalyticsEvents: { ADMIN_MODERATION_QUEUE_VIEW: 'admin_moderation_queue_view' },
}));

describe('ModerationQueuePage', () => {
  beforeEach(() => {
    getLanguageModerationQueue.mockResolvedValue([
      {
        id: 'purchase-1',
        tourId: 'tour-1',
        sessionId: 'session-1',
        moderationItemId: 'moderation-1',
        tourTitle: 'Les remparts',
        guideName: 'Guide',
        guidePhotoUrl: null,
        city: 'Mennetou-sur-Cher',
        language: 'en',
        qualityTier: 'standard',
        submissionDate: '2026-09-09T08:00:00.000Z',
        moderationStatus: 'pending',
        purchaseId: 'purchase-1',
        isSourceLanguage: false,
      },
    ]);
    getModerationMetrics.mockResolvedValue({
      pendingCount: 1,
      avgReviewTimeMinutes: 0,
      approvalRate: 0,
      reviewedThisMonth: 0,
    });
  });

  it('ne propose aucune décision directe et impose le passage par Examiner', async () => {
    render(<ModerationQueuePage />);

    await waitFor(() => expect(screen.getByText('Les remparts')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Examiner' })).toHaveAttribute(
      'href',
      '/admin/moderation/moderation-1?lang=en',
    );
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeter' })).not.toBeInTheDocument();
  });
});

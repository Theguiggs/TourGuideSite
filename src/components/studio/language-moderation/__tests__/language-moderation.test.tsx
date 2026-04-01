import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageModerationBadges } from '../language-moderation-badges';
import { ModerationFeedbackForm } from '../moderation-feedback-form';
import {
  updateModerationStatusByLang,
  confirmLanguagePurchase,
  listLanguagePurchases,
  __resetLanguagePurchaseStubs,
  __getStubPurchases,
} from '@/lib/api/language-purchase';
import type { TourLanguagePurchase } from '@/types/studio';

// Force stub mode
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function makePurchase(language: string, moderationStatus: TourLanguagePurchase['moderationStatus']): TourLanguagePurchase {
  return {
    id: `purchase-test-${language}`,
    guideId: 'guide-1',
    sessionId: 'session-1',
    language,
    qualityTier: 'standard',
    provider: 'marianmt',
    purchaseType: 'single',
    amountCents: 199,
    stripePaymentIntentId: null,
    moderationStatus,
    status: 'active',
    refundedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('LanguageModerationBadges', () => {
  it('displays correct badges for each language status', () => {
    const purchases = [
      makePurchase('fr', 'approved'),
      makePurchase('en', 'submitted'),
      makePurchase('es', 'draft'),
    ];

    render(<LanguageModerationBadges purchases={purchases} />);

    const frBadge = screen.getByTestId('lang-badge-fr');
    expect(frBadge).toHaveTextContent('FR');
    expect(frBadge).toHaveTextContent('publie');

    const enBadge = screen.getByTestId('lang-badge-en');
    expect(enBadge).toHaveTextContent('EN');
    expect(enBadge).toHaveTextContent('en moderation');

    const esBadge = screen.getByTestId('lang-badge-es');
    expect(esBadge).toHaveTextContent('ES');
    expect(esBadge).toHaveTextContent('brouillon');
  });

  it('shows "Aucune langue" when no purchases', () => {
    render(<LanguageModerationBadges purchases={[]} />);
    expect(screen.getByTestId('no-languages')).toHaveTextContent('Aucune langue');
  });

  it('calls onLanguageClick when a badge is clicked', () => {
    const onClick = jest.fn();
    const purchases = [makePurchase('en', 'submitted')];

    render(<LanguageModerationBadges purchases={purchases} onLanguageClick={onClick} />);

    fireEvent.click(screen.getByTestId('lang-badge-en'));
    expect(onClick).toHaveBeenCalledWith('en');
  });
});

describe('updateModerationStatusByLang', () => {
  beforeEach(() => {
    __resetLanguagePurchaseStubs();
  });

  it('approves a language purchase', async () => {
    // Create a purchase first
    await confirmLanguagePurchase('session-1', ['en'], 'standard', 'pi_test');

    const result = await updateModerationStatusByLang('session-1', 'en', 'approved');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.moderationStatus).toBe('approved');
      expect(result.value.language).toBe('en');
    }
  });

  it('rejects a language purchase with feedback', async () => {
    await confirmLanguagePurchase('session-1', ['es'], 'standard', 'pi_test');

    const feedback = { 'scene-1': 'Pronunciation needs work' };
    const result = await updateModerationStatusByLang('session-1', 'es', 'rejected', feedback);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.moderationStatus).toBe('rejected');
    }
  });

  it('requires feedback for rejection', async () => {
    const result = await updateModerationStatusByLang('session-1', 'en', 'rejected');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Feedback is required');
    }
  });

  it('requires feedback for revision_requested', async () => {
    const result = await updateModerationStatusByLang('session-1', 'en', 'revision_requested');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Feedback is required');
    }
  });
});

describe('ModerationFeedbackForm', () => {
  const scenes = [
    { id: 'scene-1', title: 'Place aux Aires', index: 0 },
    { id: 'scene-2', title: 'Parfumerie', index: 1 },
  ];

  it('renders scene feedback textareas and submits feedback', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onCancel = jest.fn();

    render(
      <ModerationFeedbackForm
        language="en"
        scenes={scenes}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    // Check form renders
    expect(screen.getByTestId('moderation-feedback-form')).toBeInTheDocument();
    expect(screen.getByTestId('scene-feedback-scene-1')).toBeInTheDocument();
    expect(screen.getByTestId('scene-feedback-scene-2')).toBeInTheDocument();

    // Fill in feedback for scene-1
    fireEvent.change(screen.getByTestId('scene-feedback-scene-1'), {
      target: { value: 'Audio quality is poor in this scene' },
    });

    // Submit
    fireEvent.click(screen.getByTestId('submit-feedback-btn'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('revision_requested', {
        'scene-1': 'Audio quality is poor in this scene',
      });
    });
  });

  it('navigates to preview when language badge is clicked', () => {
    const onClick = jest.fn();
    const purchases = [
      makePurchase('fr', 'approved'),
      makePurchase('en', 'submitted'),
    ];

    render(<LanguageModerationBadges purchases={purchases} onLanguageClick={onClick} />);

    fireEvent.click(screen.getByTestId('lang-badge-en'));
    expect(onClick).toHaveBeenCalledWith('en');
  });
});

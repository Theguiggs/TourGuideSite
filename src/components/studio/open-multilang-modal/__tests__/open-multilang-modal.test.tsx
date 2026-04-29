import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenMultilangModal } from '../open-multilang-modal';
import { confirmLanguagePurchase, createPaymentIntent } from '@/lib/api/language-purchase';

// Mock provider-router
jest.mock('@/lib/multilang/provider-router', () => ({
  getPriceForLanguage: jest.fn().mockReturnValue({ ok: true, value: 199 }),
  isLanguagePremium: jest.fn().mockImplementation((lang: string) =>
    ['ja', 'zh', 'ko', 'ar', 'pt'].includes(lang),
  ),
  EU_LANGUAGES: ['en', 'es', 'de', 'it'],
  PREMIUM_LANGUAGES: ['ja', 'zh', 'ko', 'ar', 'pt'],
  PRICING_TABLE: [
    { purchaseType: 'single', qualityTier: 'standard', amountCents: 199 },
    { purchaseType: 'single', qualityTier: 'pro', amountCents: 299 },
    { purchaseType: 'pack_3', qualityTier: 'standard', amountCents: 499 },
    { purchaseType: 'pack_3', qualityTier: 'pro', amountCents: 699 },
    { purchaseType: 'free_first', qualityTier: 'standard', amountCents: 0 },
    { purchaseType: 'free_first', qualityTier: 'pro', amountCents: 0 },
  ],
}));

// Mock language purchase store
const mockSetPurchases = jest.fn();
jest.mock('@/lib/stores/language-purchase-store', () => ({
  useLanguagePurchaseStore: jest.fn().mockImplementation((selector: (s: unknown) => unknown) => {
    const state = {
      purchases: {},
      setPurchases: mockSetPurchases,
      removePurchase: jest.fn(),
    };
    return selector(state);
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock language-purchase API
jest.mock('@/lib/api/language-purchase', () => ({
  createPaymentIntent: jest.fn(),
  confirmLanguagePurchase: jest.fn(),
}));

const mockConfirm = confirmLanguagePurchase as jest.Mock;
const mockCreatePI = createPaymentIntent as jest.Mock;

const defaultProps = {
  sessionId: 'session-1',
  baseLanguage: 'fr',
  isOpen: true,
  onClose: jest.fn(),
  onLanguagesChanged: jest.fn(),
};

describe('OpenMultilangModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue({
      ok: true,
      value: [
        { id: 'p1', sessionId: 'session-1', language: 'en', qualityTier: 'manual', status: 'active', purchaseType: 'manual', amountCents: 0, provider: null, stripePaymentIntentId: null, moderationStatus: 'draft', refundedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
    });
    mockCreatePI.mockResolvedValue({
      ok: true,
      value: { clientSecret: 'cs_test', paymentIntentId: 'pi_test' },
    });
  });

  // --- Rendering ---

  it('does not render when isOpen is false', () => {
    render(<OpenMultilangModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('multilang-modal')).not.toBeInTheDocument();
  });

  it('renders step 1 when open', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    expect(screen.getByTestId('multilang-modal')).toBeInTheDocument();
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    expect(screen.getByText(/Quelles langues souhaitez-vous ajouter/)).toBeInTheDocument();
  });

  it('does not show base language in the grid', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    expect(screen.queryByTestId('language-card-fr')).not.toBeInTheDocument();
    expect(screen.getByTestId('language-card-en')).toBeInTheDocument();
  });

  // --- Step Navigation ---

  it('disables Suivant button when no language selected', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    const btn = screen.getByTestId('step1-next-btn');
    expect(btn).toBeDisabled();
  });

  it('navigates from step 1 to step 2 when a language is selected', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    // Select English
    fireEvent.click(screen.getByTestId('language-card-en'));
    // Click next
    fireEvent.click(screen.getByTestId('step1-next-btn'));
    expect(screen.getByTestId('step-2')).toBeInTheDocument();
  });

  it('navigates from step 2 to step 3 and back', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('language-card-en'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));
    // Step 2 -> Step 3
    fireEvent.click(screen.getByTestId('step2-next-btn'));
    expect(screen.getByTestId('step-3')).toBeInTheDocument();
    // Step 3 -> Step 2
    fireEvent.click(screen.getByTestId('step3-back-btn'));
    expect(screen.getByTestId('step-2')).toBeInTheDocument();
    // Step 2 -> Step 1
    fireEvent.click(screen.getByTestId('step2-back-btn'));
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
  });

  // --- Language selection ---

  it('allows toggling language selection', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    const enCard = screen.getByTestId('language-card-en');
    // Select
    fireEvent.click(enCard);
    expect(enCard).toHaveAttribute('aria-checked', 'true');
    // Deselect
    fireEvent.click(enCard);
    expect(enCard).toHaveAttribute('aria-checked', 'false');
  });

  // --- Mode selection ---

  it('shows translation mode options in step 2', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('language-card-en'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));

    expect(screen.getByTestId('mode-option-manual')).toBeInTheDocument();
    expect(screen.getByTestId('mode-option-standard')).toBeInTheDocument();
    expect(screen.getByTestId('mode-option-pro')).toBeInTheDocument();
  });

  it('disables Standard mode when premium language is selected', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    // Select Japanese (premium)
    fireEvent.click(screen.getByTestId('language-card-ja'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));

    const standardRadio = screen.getByTestId('mode-radio-standard');
    expect(standardRadio).toBeDisabled();
  });

  it('shows free first language note in standard mode', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('language-card-en'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));
    // Select standard mode
    fireEvent.click(screen.getByTestId('mode-radio-standard'));

    expect(screen.getByTestId('free-first-note')).toBeInTheDocument();
  });

  // --- Step 3 Recap ---

  it('shows recap with correct total in step 3 (manual = free)', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('language-card-en'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));
    // Manual mode by default
    fireEvent.click(screen.getByTestId('step2-next-btn'));

    expect(screen.getByTestId('step-3')).toBeInTheDocument();
    expect(screen.getByTestId('recap-total')).toHaveTextContent('Gratuit');
  });

  // --- Confirm ---

  it('calls confirmLanguagePurchase on confirm (manual)', async () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('language-card-en'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));
    fireEvent.click(screen.getByTestId('step2-next-btn'));
    fireEvent.click(screen.getByTestId('confirm-btn'));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        'session-1',
        ['en'],
        'manual',
        '',
      );
    });
  });

  it('calls onClose and onLanguagesChanged after successful confirm', async () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('language-card-en'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));
    fireEvent.click(screen.getByTestId('step2-next-btn'));
    fireEvent.click(screen.getByTestId('confirm-btn'));

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onLanguagesChanged).toHaveBeenCalled();
    });
  });

  it('shows error banner when confirm fails', async () => {
    mockConfirm.mockResolvedValueOnce({
      ok: false,
      error: { code: 2601, message: 'fail' },
    });

    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('language-card-en'));
    fireEvent.click(screen.getByTestId('step1-next-btn'));
    fireEvent.click(screen.getByTestId('step2-next-btn'));
    fireEvent.click(screen.getByTestId('confirm-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-error-banner')).toBeInTheDocument();
    });
  });

  // --- Close ---

  it('closes on X button click', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('modal-close-btn'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes on backdrop click', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('multilang-modal-backdrop'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  // --- Step indicators ---

  it('shows step indicators progressing', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    // Step 1: only first indicator active
    const s1 = screen.getByTestId('step-indicator-1');
    const s2 = screen.getByTestId('step-indicator-2');
    expect(s1.className).toContain('bg-grenadine');
    expect(s2.className).toContain('bg-paper-deep');
  });
});

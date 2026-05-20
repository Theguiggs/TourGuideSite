import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenMultilangModal } from '../open-multilang-modal';
import {
  confirmLanguagePurchaseMixed,
  createPaymentIntentMixed,
  upgradeLanguagesToAuto,
  languagesWithManualContent,
} from '@/lib/api/language-purchase';

// Mutable store state so tests can inject existing purchases.
let mockStorePurchases: Record<string, unknown> = {};
const mockSetPurchases = jest.fn();
jest.mock('@/lib/stores/language-purchase-store', () => ({
  useLanguagePurchaseStore: jest.fn().mockImplementation((selector: (s: unknown) => unknown) => {
    const state = {
      purchases: mockStorePurchases,
      setPurchases: mockSetPurchases,
      removePurchase: jest.fn(),
    };
    return selector(state);
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api/language-purchase', () => ({
  createPaymentIntentMixed: jest.fn(),
  confirmLanguagePurchaseMixed: jest.fn(),
  upgradeLanguagesToAuto: jest.fn(),
  languagesWithManualContent: jest.fn(),
}));

const mockConfirm = confirmLanguagePurchaseMixed as jest.Mock;
const mockCreatePI = createPaymentIntentMixed as jest.Mock;
const mockUpgrade = upgradeLanguagesToAuto as jest.Mock;
const mockManualContent = languagesWithManualContent as jest.Mock;

function manualPurchase(sessionId: string, lang: string) {
  return {
    id: `purchase-${sessionId}-${lang}`,
    sessionId,
    language: lang,
    qualityTier: 'manual',
    purchaseType: 'manual',
    status: 'active',
    provider: null,
    amountCents: 0,
  };
}
function autoPurchase(sessionId: string, lang: string) {
  return {
    ...manualPurchase(sessionId, lang),
    qualityTier: 'standard',
    purchaseType: 'single',
    provider: 'marianmt',
    amountCents: 199,
  };
}

const defaultProps = {
  sessionId: 'session-1',
  baseLanguage: 'fr',
  isOpen: true,
  onClose: jest.fn(),
  onLanguagesChanged: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorePurchases = {};
  mockCreatePI.mockResolvedValue({ ok: true, value: { clientSecret: 'cs', paymentIntentId: 'pi_1' } });
  mockConfirm.mockResolvedValue({ ok: true, value: [] });
  mockUpgrade.mockResolvedValue({ ok: true, value: [] });
  mockManualContent.mockResolvedValue([]);
});

describe('OpenMultilangModal (mixed per-language)', () => {
  it('renders a row per non-base language', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    expect(screen.getByTestId('lang-row-en')).toBeInTheDocument();
    expect(screen.getByTestId('lang-row-ja')).toBeInTheDocument();
    // base language fr should not appear
    expect(screen.queryByTestId('lang-row-fr')).not.toBeInTheDocument();
  });

  it('total starts empty and pay button disabled', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    expect(screen.getByTestId('recap-total')).toHaveTextContent('—');
    expect(screen.getByTestId('confirm-btn')).toBeDisabled();
  });

  it('selecting manual keeps total free', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mode-select-en'), { target: { value: 'manual' } });
    expect(screen.getByTestId('recap-total')).toHaveTextContent('Gratuit');
    expect(screen.getByTestId('confirm-btn')).not.toBeDisabled();
  });

  it('selecting auto standard shows a price (free first → offerte)', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mode-select-en'), { target: { value: 'standard' } });
    // First EU standard auto is offered (free first not used in empty store)
    expect(screen.getByTestId('recap-total')).toHaveTextContent('Gratuit');
  });

  it('premium language has no standard option', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    const jaSelect = screen.getByTestId('mode-select-ja') as HTMLSelectElement;
    const values = Array.from(jaSelect.options).map((o) => o.value);
    expect(values).toEqual(['none', 'manual', 'pro']);
  });

  it('mixing manual + auto bills only the auto one', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mode-select-en'), { target: { value: 'manual' } });
    fireEvent.change(screen.getByTestId('mode-select-ja'), { target: { value: 'pro' } });
    // ja premium pro = 4,99€
    expect(screen.getByTestId('recap-total')).toHaveTextContent('4,99');
  });

  it('selecting all 7 languages auto → Pack Toutes applied', () => {
    render(<OpenMultilangModal {...defaultProps} />);
    for (const lang of ['en', 'es', 'de', 'it']) {
      fireEvent.change(screen.getByTestId(`mode-select-${lang}`), { target: { value: 'standard' } });
    }
    for (const lang of ['ja', 'zh', 'pt']) {
      fireEvent.change(screen.getByTestId(`mode-select-${lang}`), { target: { value: 'pro' } });
    }
    expect(screen.getByTestId('pack-all-applied')).toBeInTheDocument();
    expect(screen.getByTestId('recap-total')).toHaveTextContent('12,99');
  });

  it('confirm triggers payment intent + purchase for paid order', async () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mode-select-ja'), { target: { value: 'pro' } });
    fireEvent.click(screen.getByTestId('confirm-btn'));
    await waitFor(() => expect(mockCreatePI).toHaveBeenCalled());
    expect(mockConfirm).toHaveBeenCalledWith('session-1', { ja: 'pro' }, 'pi_1');
  });

  it('manual-only confirm skips payment intent', async () => {
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mode-select-en'), { target: { value: 'manual' } });
    fireEvent.click(screen.getByTestId('confirm-btn'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockCreatePI).not.toHaveBeenCalled();
  });
});

describe('OpenMultilangModal — upgrade manual → auto', () => {
  it('manual-owned language shows an editable dropdown (not locked)', () => {
    mockStorePurchases = { 'session-1_en': manualPurchase('session-1', 'en') };
    render(<OpenMultilangModal {...defaultProps} />);
    // dropdown present, not the locked label
    expect(screen.getByTestId('mode-select-en')).toBeInTheDocument();
    expect(screen.queryByTestId('locked-auto-en')).not.toBeInTheDocument();
    // default value is manual
    expect((screen.getByTestId('mode-select-en') as HTMLSelectElement).value).toBe('manual');
  });

  it('auto-owned language is locked', () => {
    mockStorePurchases = { 'session-1_es': autoPurchase('session-1', 'es') };
    render(<OpenMultilangModal {...defaultProps} />);
    expect(screen.getByTestId('locked-auto-es')).toBeInTheDocument();
    expect(screen.queryByTestId('mode-select-es')).not.toBeInTheDocument();
  });

  it('upgrading manual → auto (no content) calls upgradeLanguagesToAuto', async () => {
    mockStorePurchases = { 'session-1_en': manualPurchase('session-1', 'en') };
    mockManualContent.mockResolvedValue([]); // no manual content
    render(<OpenMultilangModal {...defaultProps} />);
    // 'pro' is always charged (299), so a payment intent is created
    fireEvent.change(screen.getByTestId('mode-select-en'), { target: { value: 'pro' } });
    fireEvent.click(screen.getByTestId('confirm-btn'));
    await waitFor(() => expect(mockUpgrade).toHaveBeenCalled());
    expect(mockUpgrade).toHaveBeenCalledWith('session-1', { en: 'pro' }, 'pi_1', true);
    expect(mockConfirm).not.toHaveBeenCalled(); // no new languages
  });

  it('upgrading with existing manual content shows overwrite dialog', async () => {
    mockStorePurchases = { 'session-1_en': manualPurchase('session-1', 'en') };
    mockManualContent.mockResolvedValue(['en']); // has content
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mode-select-en'), { target: { value: 'pro' } });
    fireEvent.click(screen.getByTestId('confirm-btn'));
    await waitFor(() => expect(screen.getByTestId('overwrite-dialog')).toBeInTheDocument());
    // upgrade not yet called — waiting for choice
    expect(mockUpgrade).not.toHaveBeenCalled();
    // choose keep → overwrite=false
    fireEvent.click(screen.getByTestId('overwrite-keep'));
    await waitFor(() => expect(mockUpgrade).toHaveBeenCalledWith('session-1', { en: 'pro' }, 'pi_1', false));
  });

  it('overwrite choice passes overwrite=true', async () => {
    mockStorePurchases = { 'session-1_en': manualPurchase('session-1', 'en') };
    mockManualContent.mockResolvedValue(['en']);
    render(<OpenMultilangModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mode-select-en'), { target: { value: 'pro' } });
    fireEvent.click(screen.getByTestId('confirm-btn'));
    await waitFor(() => expect(screen.getByTestId('overwrite-dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('overwrite-confirm'));
    await waitFor(() => expect(mockUpgrade).toHaveBeenCalledWith('session-1', { en: 'pro' }, 'pi_1', true));
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenMultilangModal } from '../open-multilang-modal';
import { confirmLanguagePurchaseMixed, createPaymentIntentMixed } from '@/lib/api/language-purchase';

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

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api/language-purchase', () => ({
  createPaymentIntentMixed: jest.fn(),
  confirmLanguagePurchaseMixed: jest.fn(),
}));

const mockConfirm = confirmLanguagePurchaseMixed as jest.Mock;
const mockCreatePI = createPaymentIntentMixed as jest.Mock;

const defaultProps = {
  sessionId: 'session-1',
  baseLanguage: 'fr',
  isOpen: true,
  onClose: jest.fn(),
  onLanguagesChanged: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreatePI.mockResolvedValue({ ok: true, value: { clientSecret: 'cs', paymentIntentId: 'pi_1' } });
  mockConfirm.mockResolvedValue({ ok: true, value: [] });
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

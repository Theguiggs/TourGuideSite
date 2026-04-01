import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentSummary, computeOrderTotal } from '../payment-summary';

describe('computeOrderTotal', () => {
  it('returns empty when no languages selected', () => {
    const result = computeOrderTotal([], 'standard', true);
    expect(result.totalCents).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it('applies free first language when freeLanguageUsed=false', () => {
    const result = computeOrderTotal(['en'], 'standard', false);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].purchaseType).toBe('free_first');
    expect(result.lines[0].priceCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  it('charges second language normally when first is free', () => {
    const result = computeOrderTotal(['en', 'es'], 'standard', false);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].purchaseType).toBe('free_first');
    expect(result.lines[1].purchaseType).toBe('single');
    expect(result.lines[1].priceCents).toBe(199);
    expect(result.totalCents).toBe(199);
  });

  it('applies pack_3 pricing for 3 EU languages (standard)', () => {
    const result = computeOrderTotal(['en', 'es', 'de'], 'standard', true);
    expect(result.lines).toHaveLength(3);
    expect(result.lines.every((l) => l.purchaseType === 'pack_3')).toBe(true);
    // Pack price: 499 cents
    expect(result.totalCents).toBe(499);
  });

  it('applies pack_3 pricing for 3 EU languages (pro)', () => {
    const result = computeOrderTotal(['en', 'es', 'de'], 'pro', true);
    expect(result.totalCents).toBe(699);
  });

  it('charges 4th EU language as single on top of pack', () => {
    const result = computeOrderTotal(['en', 'es', 'de', 'it'], 'standard', true);
    const packLines = result.lines.filter((l) => l.purchaseType === 'pack_3');
    const singleLines = result.lines.filter((l) => l.purchaseType === 'single');
    expect(packLines).toHaveLength(3);
    expect(singleLines).toHaveLength(1);
    expect(singleLines[0].priceCents).toBe(199);
    // 499 (pack) + 199 (single) = 698
    expect(result.totalCents).toBe(698);
  });

  it('charges premium language as single pro (499)', () => {
    const result = computeOrderTotal(['ja'], 'pro', true);
    expect(result.lines[0].purchaseType).toBe('single');
    expect(result.lines[0].priceCents).toBe(499);
    expect(result.totalCents).toBe(499);
  });

  it('recalculates when tier changes from standard to pro', () => {
    const standard = computeOrderTotal(['en', 'es', 'de'], 'standard', true);
    const pro = computeOrderTotal(['en', 'es', 'de'], 'pro', true);
    expect(standard.totalCents).toBe(499);
    expect(pro.totalCents).toBe(699);
  });

  it('does NOT apply pack when free first reduces paid EU below 3', () => {
    // 3 EU selected but first is free -> only 2 paid EU -> no pack
    const result = computeOrderTotal(['en', 'es', 'de'], 'standard', false);
    expect(result.lines[0].purchaseType).toBe('free_first');
    expect(result.lines[1].purchaseType).toBe('single');
    expect(result.lines[2].purchaseType).toBe('single');
    // 0 + 199 + 199 = 398 (cheaper than pack at 499)
    expect(result.totalCents).toBe(398);
  });

  it('applies pack when free first + 3 paid EU (4 EU total)', () => {
    // 4 EU selected, first is free -> 3 paid EU -> pack applies
    const result = computeOrderTotal(['en', 'es', 'de', 'it'], 'standard', false);
    expect(result.lines[0].purchaseType).toBe('free_first');
    const packLines = result.lines.filter((l) => l.purchaseType === 'pack_3');
    expect(packLines).toHaveLength(3);
    // 0 (free) + 499 (pack for 3 paid EU) = 499
    expect(result.totalCents).toBe(499);
  });
});

describe('PaymentSummary', () => {
  const defaultProps = {
    selectedLanguages: [] as string[],
    qualityTier: 'standard' as const,
    freeLanguageUsed: true,
    sceneCount: 5,
    onPay: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables button when no language is selected', () => {
    render(<PaymentSummary {...defaultProps} />);
    const button = screen.getByTestId('pay-button');
    expect(button).toBeDisabled();
    expect(button.textContent).toContain('lectionnez une langue');
  });

  it('shows "Traduire gratuitement" when total is 0', () => {
    render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en']}
        freeLanguageUsed={false}
      />,
    );
    const button = screen.getByTestId('pay-button');
    expect(button).not.toBeDisabled();
    expect(button.textContent).toContain('Traduire gratuitement');
  });

  it('shows "Gratuit -- premiere langue offerte !" when freeLanguageUsed=false', () => {
    render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en']}
        freeLanguageUsed={false}
      />,
    );
    expect(screen.getByTestId('free-first-badge')).toBeInTheDocument();
    const badge = screen.getByTestId('free-first-badge');
    expect(badge.textContent).toContain('Gratuit');
    expect(badge.textContent).toContain('premi');
    expect(badge.textContent).toContain('offerte');
  });

  it('shows pay button with total when languages selected', () => {
    render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en', 'es']}
      />,
    );
    const button = screen.getByTestId('pay-button');
    expect(button).not.toBeDisabled();
    // 2 single standard = 2 x 199 = 398 = 3.98
    expect(button.textContent).toContain('Payer et traduire');
    expect(button.textContent).toContain('3,98');
  });

  it('recalculates total when quality tier changes', () => {
    const { rerender } = render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en', 'es', 'de']}
        qualityTier="standard"
      />,
    );
    // Standard pack: 4.99
    expect(screen.getByTestId('payment-total').textContent).toContain('4,99');

    rerender(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en', 'es', 'de']}
        qualityTier="pro"
      />,
    );
    // Pro pack: 6.99
    expect(screen.getByTestId('payment-total').textContent).toContain('6,99');
  });

  it('shows subtitle with scene count', () => {
    render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en']}
        sceneCount={8}
      />,
    );
    const subtitle = screen.getByTestId('payment-subtitle');
    expect(subtitle.textContent).toContain('8 sc');
    expect(subtitle.textContent).toContain('~2 min par langue');
  });

  it('calls onPay when button clicked', () => {
    const onPay = jest.fn();
    render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en']}
        onPay={onPay}
      />,
    );
    fireEvent.click(screen.getByTestId('pay-button'));
    expect(onPay).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en']}
        isLoading={true}
      />,
    );
    const button = screen.getByTestId('pay-button');
    expect(button).toBeDisabled();
    expect(button.textContent).toContain('Traitement en cours');
  });

  it('has aria-live on total for screen readers', () => {
    render(
      <PaymentSummary
        {...defaultProps}
        selectedLanguages={['en']}
      />,
    );
    const total = screen.getByTestId('payment-total');
    expect(total.getAttribute('aria-live')).toBe('polite');
  });
});

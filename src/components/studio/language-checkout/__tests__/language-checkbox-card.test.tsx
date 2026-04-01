import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageCheckboxCard } from '../language-checkbox-card';

describe('LanguageCheckboxCard', () => {
  const defaultProps = {
    langCode: 'en',
    langLabel: 'English',
    countryCode: 'gb',
    priceCents: 199,
    checked: false,
    onToggle: jest.fn(),
    currentTier: 'standard' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders flag, language name, and formatted price', () => {
    render(<LanguageCheckboxCard {...defaultProps} />);

    expect(screen.getByTestId('language-card-en')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    // Price uses non-breaking space before EUR symbol — use regex
    expect(screen.getByText(/1,99/)).toBeInTheDocument();
  });

  it('toggles checked state and calls onToggle', () => {
    const onToggle = jest.fn();
    render(<LanguageCheckboxCard {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('language-card-en'));
    expect(onToggle).toHaveBeenCalledWith('en', true);
  });

  it('calls onToggle with false when unchecking', () => {
    const onToggle = jest.fn();
    render(<LanguageCheckboxCard {...defaultProps} checked={true} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('language-card-en'));
    expect(onToggle).toHaveBeenCalledWith('en', false);
  });

  it('disables premium language in standard mode', () => {
    render(
      <LanguageCheckboxCard
        {...defaultProps}
        langCode="ja"
        langLabel="\u65E5\u672C\u8A9E"
        priceCents={499}
        isPremiumDisabled={true}
        currentTier="standard"
      />,
    );

    const card = screen.getByTestId('language-card-ja');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('premium-disabled-ja')).toHaveTextContent(
      'Disponible en Pro uniquement',
    );
  });

  it('enables premium language in pro mode with correct price and is toggleable', () => {
    const onToggle = jest.fn();
    render(
      <LanguageCheckboxCard
        {...defaultProps}
        langCode="ja"
        langLabel="\u65E5\u672C\u8A9E"
        priceCents={499}
        isPremiumDisabled={false}
        currentTier="pro"
        onToggle={onToggle}
      />,
    );

    const card = screen.getByTestId('language-card-ja');
    expect(card).not.toHaveAttribute('aria-disabled');
    expect(screen.getByText(/4,99/)).toBeInTheDocument();

    fireEvent.click(card);
    expect(onToggle).toHaveBeenCalledWith('ja', true);
  });

  it('shows purchased badge with tier and is not toggleable', () => {
    const onToggle = jest.fn();
    render(
      <LanguageCheckboxCard
        {...defaultProps}
        isPurchased={true}
        purchasedTier="pro"
        onToggle={onToggle}
      />,
    );

    expect(screen.getByTestId('purchased-badge-en')).toHaveTextContent('Achetée (Pro)');
    expect(screen.getByTestId('language-card-en')).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByTestId('language-card-en'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows purchased badge with Standard tier', () => {
    render(
      <LanguageCheckboxCard
        {...defaultProps}
        isPurchased={true}
        purchasedTier="standard"
      />,
    );

    expect(screen.getByTestId('purchased-badge-en')).toHaveTextContent('Achetée (Standard)');
  });

  it('shows generic purchased badge when tier is unknown', () => {
    render(
      <LanguageCheckboxCard
        {...defaultProps}
        isPurchased={true}
      />,
    );

    expect(screen.getByTestId('purchased-badge-en')).toHaveTextContent('Achetée');
    // Should not contain parenthesized tier
    expect(screen.getByTestId('purchased-badge-en')).not.toHaveTextContent('(');
  });

  it('shows base language badge and is not toggleable', () => {
    const onToggle = jest.fn();
    render(
      <LanguageCheckboxCard
        {...defaultProps}
        langCode="fr"
        langLabel="Fran\u00e7ais"
        isBaseLanguage={true}
        priceCents={null}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByTestId('base-badge-fr')).toHaveTextContent('Langue de base');
    expect(screen.getByTestId('language-card-fr')).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByTestId('language-card-fr'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('has correct aria role and aria-checked', () => {
    render(<LanguageCheckboxCard {...defaultProps} checked={true} />);

    const card = screen.getByRole('checkbox');
    expect(card).toHaveAttribute('aria-checked', 'true');
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageTab } from '../LanguageTab';

describe('LanguageTab', () => {
  it("rend code, label, counter", () => {
    render(<LanguageTab code="fr" label="Français" counter="6/6" isActive={false} />);
    expect(screen.getByText('FR')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('6/6')).toBeInTheDocument();
  });

  it("aria-current page quand actif", () => {
    render(<LanguageTab code="fr" label="Français" isActive />);
    expect(screen.getByTestId('language-tab-fr')).toHaveAttribute('aria-current', 'page');
  });

  it("appelle onClick", () => {
    const onClick = jest.fn();
    render(<LanguageTab code="fr" label="Français" isActive={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('language-tab-fr'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("masque le counter si absent", () => {
    render(<LanguageTab code="fr" label="Français" isActive={false} />);
    expect(screen.queryByText(/\d\/\d/)).toBeNull();
  });
});

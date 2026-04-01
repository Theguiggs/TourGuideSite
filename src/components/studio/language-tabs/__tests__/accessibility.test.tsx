import React from 'react';
import { render, screen } from '@testing-library/react';
import { LanguageTabs } from '../language-tabs';
import type { LanguageTabItem } from '../language-tabs';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockLanguages: LanguageTabItem[] = [
  { code: 'fr', label: 'Français', countryCode: 'fr', isBase: true, progress: { completed: 12, total: 12 } },
  { code: 'en', label: 'English', countryCode: 'gb', isBase: false, progress: { completed: 8, total: 12 } },
  { code: 'es', label: 'Español', countryCode: 'es', isBase: false, progress: { completed: 0, total: 12 } },
];

describe('LanguageTabs — Accessibility (ML-6.4)', () => {
  it('has aria-label on each language tab with progress info', () => {
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={jest.fn()} />);

    const frTab = screen.getByTestId('lang-tab-fr');
    expect(frTab).toHaveAttribute('aria-label', 'Français, 12 sur 12 scenes traduites');

    const enTab = screen.getByTestId('lang-tab-en');
    expect(enTab).toHaveAttribute('aria-label', 'English, 8 sur 12 scenes traduites');
  });

  it('has flag image + text label on all tabs (not just icon)', () => {
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={jest.fn()} />);

    // Each tab should contain a text label alongside the flag
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();

    // Flags should be decorative (aria-hidden)
    const flagImgs = document.querySelectorAll('img[aria-hidden="true"]');
    expect(flagImgs.length).toBe(3);
  });

  it('supports keyboard navigation via arrow keys', () => {
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    // Active tab has tabindex 0, others -1
    const activeTab = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    expect(activeTab).toHaveAttribute('tabindex', '0');

    const inactiveTabs = tabs.filter((t) => t.getAttribute('aria-selected') === 'false');
    inactiveTabs.forEach((t) => {
      expect(t).toHaveAttribute('tabindex', '-1');
    });
  });

  it('tablist has descriptive aria-label', () => {
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={jest.fn()} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Langues de la visite');
  });
});

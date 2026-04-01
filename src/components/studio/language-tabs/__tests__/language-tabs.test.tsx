import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageTabs } from '../language-tabs';
import type { LanguageTabItem } from '../language-tabs';

// Mock logger to avoid console noise
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockLanguages: LanguageTabItem[] = [
  { code: 'fr', label: 'Français', countryCode: 'fr', isBase: true, progress: { completed: 12, total: 12 } },
  { code: 'en', label: 'English', countryCode: 'gb', isBase: false, progress: { completed: 8, total: 12 } },
  { code: 'es', label: 'Español', countryCode: 'es', isBase: false, progress: { completed: 0, total: 12 } },
];

describe('LanguageTabs', () => {
  it('renders tabs with flags and progress counters', () => {
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={jest.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('8/12')).toBeInTheDocument();
    expect(screen.getByText('0/12')).toBeInTheDocument();
    expect(screen.getByText('12/12')).toBeInTheDocument();
  });

  it('calls onLanguageChange when a tab is clicked', () => {
    const handler = jest.fn();
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={handler} />);
    fireEvent.click(screen.getByTestId('lang-tab-en'));
    expect(handler).toHaveBeenCalledWith('en');
  });

  it('displays correct progress counter format', () => {
    const langs: LanguageTabItem[] = [
      { code: 'fr', label: 'Français', countryCode: 'fr', isBase: true, progress: { completed: 12, total: 12 } },
      { code: 'en', label: 'English', countryCode: 'gb', isBase: false, progress: { completed: 8, total: 12 } },
    ];
    render(<LanguageTabs languages={langs} activeLanguage="fr" onLanguageChange={jest.fn()} />);
    expect(screen.getByText('8/12')).toBeInTheDocument();
  });

  it('shows overflow dropdown when more than 5 languages', () => {
    const manyLangs: LanguageTabItem[] = [
      { code: 'fr', label: 'Français', countryCode: 'fr', isBase: true, progress: { completed: 12, total: 12 } },
      { code: 'en', label: 'English', countryCode: 'gb', isBase: false, progress: { completed: 8, total: 12 } },
      { code: 'es', label: 'Español', countryCode: 'es', isBase: false, progress: { completed: 0, total: 12 } },
      { code: 'de', label: 'Deutsch', countryCode: 'de', isBase: false, progress: { completed: 3, total: 12 } },
      { code: 'it', label: 'Italiano', countryCode: 'it', isBase: false, progress: { completed: 5, total: 12 } },
      { code: 'pt', label: 'Português', countryCode: 'pt', isBase: false, progress: { completed: 1, total: 12 } },
      { code: 'ja', label: '日本語', countryCode: 'jp', isBase: false, progress: { completed: 0, total: 12 } },
    ];
    const handler = jest.fn();
    render(<LanguageTabs languages={manyLangs} activeLanguage="fr" onLanguageChange={handler} />);

    // Should show 5 visible tabs + overflow button
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    const overflowBtn = screen.getByTestId('lang-tab-overflow');
    expect(overflowBtn).toBeInTheDocument();
    expect(overflowBtn).toHaveTextContent('+2');

    // Click overflow to open menu
    fireEvent.click(overflowBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);

    // Click an overflow item
    fireEvent.click(screen.getByTestId('lang-overflow-ja'));
    expect(handler).toHaveBeenCalledWith('ja');
  });

  it('renders nothing when no purchased languages (only base)', () => {
    const baseOnly: LanguageTabItem[] = [
      { code: 'fr', label: 'Français', countryCode: 'fr', isBase: true, progress: { completed: 12, total: 12 } },
    ];
    const { container } = render(<LanguageTabs languages={baseOnly} activeLanguage="fr" onLanguageChange={jest.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('supports keyboard navigation with arrow keys', () => {
    const handler = jest.fn();
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={handler} />);

    const frTab = screen.getByTestId('lang-tab-fr');
    frTab.focus();

    // ArrowRight: fr -> en
    fireEvent.keyDown(frTab, { key: 'ArrowRight' });
    expect(handler).toHaveBeenCalledWith('en');

    // ArrowLeft from fr (index 0): wraps to es (index 2)
    fireEvent.keyDown(frTab, { key: 'ArrowLeft' });
    expect(handler).toHaveBeenCalledWith('es');

    // Home: first tab
    fireEvent.keyDown(frTab, { key: 'Home' });
    expect(handler).toHaveBeenCalledWith('fr');

    // End: last tab
    fireEvent.keyDown(frTab, { key: 'End' });
    expect(handler).toHaveBeenCalledWith('es');

    // Check aria-selected
    expect(frTab).toHaveAttribute('aria-selected', 'true');
    const enTab = screen.getByTestId('lang-tab-en');
    expect(enTab).toHaveAttribute('aria-selected', 'false');

    // Check tabIndex
    expect(frTab).toHaveAttribute('tabindex', '0');
    expect(enTab).toHaveAttribute('tabindex', '-1');
  });

  it('renders flag images from flagcdn.com', () => {
    render(<LanguageTabs languages={mockLanguages} activeLanguage="fr" onLanguageChange={jest.fn()} />);
    const images = screen.getAllByRole('presentation', { hidden: true });
    // All flag images should have flagcdn.com src
    const flagImgs = document.querySelectorAll('img[src*="flagcdn.com"]');
    expect(flagImgs.length).toBe(3);
    expect(flagImgs[0]).toHaveAttribute('src', 'https://flagcdn.com/w40/fr.png');
    expect(flagImgs[1]).toHaveAttribute('src', 'https://flagcdn.com/w40/gb.png');
  });
});

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { LanguageSuggestionBanner } from '../language-suggestion-banner';

describe('bandeau de suggestion de langue', () => {
  afterEach(() => {
    cleanup();
    document.cookie = 'murmure-locale=; Path=/; Max-Age=0';
  });

  it.each(SITE_LOCALES)('parle la langue proposée, pas celle de la page, en %s', suggested => {
    render(<LanguageSuggestionBanner suggested={suggested} current="fr" href={`/${suggested}/catalogue`} />);
    const bandeau = screen.getByTestId('language-suggestion');
    // `lang` sur le bandeau : un lecteur d'écran doit changer de voix.
    expect(bandeau).toHaveAttribute('lang', suggested);
    const lien = screen.getByRole('link');
    expect(lien).toHaveAttribute('href', `/${suggested}/catalogue`);
    expect(lien).toHaveAttribute('hreflang', suggested);
    expect(bandeau.textContent).not.toBe('');
  });

  it('propose un texte distinct par langue, jamais un gabarit', () => {
    const textes = SITE_LOCALES.map(locale => {
      const { unmount } = render(<LanguageSuggestionBanner suggested={locale} current="fr" href="/x" />);
      const texte = screen.getByTestId('language-suggestion').textContent ?? '';
      unmount();
      return texte;
    });
    expect(new Set(textes).size).toBe(SITE_LOCALES.length);
  });

  it('mémorise la langue proposée quand on l’accepte', () => {
    render(<LanguageSuggestionBanner suggested="de" current="fr" href="/de/catalogue" />);
    fireEvent.click(screen.getByRole('link'));
    expect(document.cookie).toContain('murmure-locale=de');
  });

  it('mémorise la langue affichée quand on refuse, et se retire', () => {
    render(<LanguageSuggestionBanner suggested="de" current="fr" href="/de/catalogue" />);
    fireEvent.click(screen.getByRole('button'));
    expect(document.cookie).toContain('murmure-locale=fr');
    expect(screen.queryByTestId('language-suggestion')).not.toBeInTheDocument();
  });

  it('offre des cibles tactiles atteignables', () => {
    render(<LanguageSuggestionBanner suggested="nl" current="en" href="/nl" />);
    for (const cible of [screen.getByRole('link'), screen.getByRole('button')]) {
      expect(cible.className).toContain('min-h-11');
    }
  });
});

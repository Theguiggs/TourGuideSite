import { fireEvent, render, screen } from '@testing-library/react';
import { StudioLocaleProvider, useStudioLocale } from '../studio-locale';

function LocaleProbe() {
  const { locale, setLocale } = useStudioLocale();
  return (
    <div>
      <span data-testid="locale-value">{locale}</span>
      <button type="button" onClick={() => setLocale('en')}>English</button>
    </div>
  );
}

function setBrowserLanguage(language: string) {
  Object.defineProperty(window.navigator, 'language', { value: language, configurable: true });
}

describe('StudioLocaleProvider', () => {
  beforeEach(() => { window.localStorage.clear(); setBrowserLanguage('fr-FR'); });

  it('starts in French and persists an English selection', () => {
    render(
      <StudioLocaleProvider>
        <LocaleProbe />
      </StudioLocaleProvider>,
    );

    expect(screen.getByTestId('locale-value')).toHaveTextContent('fr');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByTestId('locale-value')).toHaveTextContent('en');
    expect(window.localStorage.getItem('murmure-studio-locale')).toBe('en');
  });

  it('suit la langue du navigateur quand rien n’est mémorisé, et le réglage mémorisé sinon', () => {
    setBrowserLanguage('en-GB');
    const first = render(<StudioLocaleProvider><LocaleProbe /></StudioLocaleProvider>);
    expect(screen.getByTestId('locale-value')).toHaveTextContent('en');
    first.unmount();

    window.localStorage.setItem('murmure-studio-locale', 'fr');
    render(<StudioLocaleProvider><LocaleProbe /></StudioLocaleProvider>);
    expect(screen.getByTestId('locale-value')).toHaveTextContent('fr');
  });
});

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

describe('StudioLocaleProvider', () => {
  beforeEach(() => window.localStorage.clear());

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
});

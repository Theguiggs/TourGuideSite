import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageTogglePills } from '../LanguageTogglePills';

describe('LanguageTogglePills', () => {
  it('rend toutes les langues par défaut', () => {
    render(<LanguageTogglePills value={[]} onChange={jest.fn()} />);
    expect(screen.getByTestId('language-pill-fr')).toBeInTheDocument();
    expect(screen.getByTestId('language-pill-en')).toBeInTheDocument();
    expect(screen.getByTestId('language-pill-it')).toBeInTheDocument();
    expect(screen.getByTestId('language-pill-es')).toBeInTheDocument();
    expect(screen.getByTestId('language-pill-de')).toBeInTheDocument();
    expect(screen.getByTestId('language-pill-pt')).toBeInTheDocument();
  });

  it("marque les langues sélectionnées via aria-pressed", () => {
    render(<LanguageTogglePills value={['fr', 'en']} onChange={jest.fn()} />);
    expect(screen.getByTestId('language-pill-fr')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('language-pill-en')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('language-pill-de')).toHaveAttribute('aria-pressed', 'false');
  });

  it("toggle: ajoute une langue non sélectionnée", () => {
    const onChange = jest.fn();
    render(<LanguageTogglePills value={['fr']} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('language-pill-en'));
    expect(onChange).toHaveBeenCalledWith(['fr', 'en']);
  });

  it("toggle: retire une langue sélectionnée", () => {
    const onChange = jest.fn();
    render(<LanguageTogglePills value={['fr', 'en']} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('language-pill-fr'));
    expect(onChange).toHaveBeenCalledWith(['en']);
  });

  it("affiche le badge NATIF sur la langue native sélectionnée", () => {
    render(<LanguageTogglePills value={['fr']} onChange={jest.fn()} nativeCode="fr" />);
    expect(screen.getByTestId('language-pill-fr')).toHaveTextContent('NATIF');
  });

  it("ne montre pas NATIF si la langue native n'est pas sélectionnée", () => {
    render(<LanguageTogglePills value={['en']} onChange={jest.fn()} nativeCode="fr" />);
    expect(screen.getByTestId('language-pill-fr')).not.toHaveTextContent('NATIF');
  });

  it("supporte options custom", () => {
    render(
      <LanguageTogglePills
        value={[]}
        onChange={jest.fn()}
        options={[{ code: 'ja', label: 'Japonais' }]}
      />,
    );
    expect(screen.getByTestId('language-pill-ja')).toBeInTheDocument();
    expect(screen.queryByTestId('language-pill-fr')).toBeNull();
  });
});

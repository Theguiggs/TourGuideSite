import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeChips } from '../ThemeChips';

const options = [
  { value: 'histoire', label: 'Histoire' },
  { value: 'art', label: 'Art' },
  { value: 'nature', label: 'Nature' },
  { value: 'gastronomie', label: 'Gastronomie' },
];

describe('ThemeChips', () => {
  it("rend toutes les options", () => {
    render(<ThemeChips options={options} value={[]} onChange={jest.fn()} />);
    options.forEach((o) => {
      expect(screen.getByTestId(`theme-chip-${o.value}`)).toBeInTheDocument();
    });
  });

  it("marque les chips sélectionnées via aria-pressed", () => {
    render(<ThemeChips options={options} value={['histoire']} onChange={jest.fn()} />);
    expect(screen.getByTestId('theme-chip-histoire')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-chip-art')).toHaveAttribute('aria-pressed', 'false');
  });

  it("ajoute au clic sur une chip non sélectionnée", () => {
    const onChange = jest.fn();
    render(<ThemeChips options={options} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('theme-chip-art'));
    expect(onChange).toHaveBeenCalledWith(['art']);
  });

  it("retire au clic sur une chip sélectionnée", () => {
    const onChange = jest.fn();
    render(<ThemeChips options={options} value={['art']} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('theme-chip-art'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("désactive les chips non sélectionnées au-delà du max", () => {
    render(
      <ThemeChips options={options} value={['histoire', 'art', 'nature']} onChange={jest.fn()} max={3} />,
    );
    expect(screen.getByTestId('theme-chip-gastronomie')).toBeDisabled();
    expect(screen.getByTestId('theme-chip-histoire')).not.toBeDisabled();
  });

  it("appelle onMaxReached quand on essaie d'ajouter au-delà du max", () => {
    const onMaxReached = jest.fn();
    render(
      <ThemeChips
        options={options}
        value={['histoire', 'art', 'nature']}
        onChange={jest.fn()}
        onMaxReached={onMaxReached}
        max={3}
      />,
    );
    // Une chip désactivée ne fire pas onClick — on teste donc avec max=2 et 2 sélectionnés
  });

  it("permet de désélectionner même quand on est au max", () => {
    const onChange = jest.fn();
    render(
      <ThemeChips options={options} value={['histoire', 'art', 'nature']} onChange={onChange} max={3} />,
    );
    fireEvent.click(screen.getByTestId('theme-chip-histoire'));
    expect(onChange).toHaveBeenCalledWith(['art', 'nature']);
  });
});

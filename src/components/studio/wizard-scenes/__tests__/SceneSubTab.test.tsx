import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneSubTab } from '../SceneSubTab';

describe('SceneSubTab', () => {
  it("rend label et icône", () => {
    render(<SceneSubTab label="POI" icon="◉" isActive={false} />);
    expect(screen.getByText('POI')).toBeInTheDocument();
    expect(screen.getByText('◉')).toBeInTheDocument();
  });

  it("affiche le compteur quand fourni", () => {
    render(<SceneSubTab label="Photos" count={3} isActive={false} />);
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it("masque le compteur quand absent ou 0", () => {
    render(<SceneSubTab label="Audio" isActive={false} />);
    expect(screen.queryByText(/\(\d\)/)).toBeNull();
  });

  it("count=0 reste affiché (number defined)", () => {
    render(<SceneSubTab label="Photos" count={0} isActive={false} />);
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  it("appelle onClick", () => {
    const onClick = jest.fn();
    render(<SceneSubTab label="POI" isActive={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('scene-sub-tab-poi'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aria-current page quand actif", () => {
    render(<SceneSubTab label="POI" isActive />);
    expect(screen.getByTestId('scene-sub-tab-poi')).toHaveAttribute('aria-current', 'page');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WizField } from '../WizField';

describe('WizField', () => {
  it('rend le label et les enfants', () => {
    render(
      <WizField label="Titre">
        <input data-testid="child" />
      </WizField>,
    );
    expect(screen.getByText('Titre')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it("affiche un astérisque grenadine quand required", () => {
    render(<WizField label="Titre" required><input /></WizField>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it("masque l'astérisque quand non required", () => {
    render(<WizField label="Titre"><input /></WizField>);
    expect(screen.queryByText('*')).toBeNull();
  });

  it("affiche le hint à droite", () => {
    render(<WizField label="Bio" hint="42 / 500"><input /></WizField>);
    expect(screen.getByText('42 / 500')).toBeInTheDocument();
  });

  it("affiche un helper italique quand fourni sans error", () => {
    render(<WizField label="Champ" helper="Conseil"><input /></WizField>);
    expect(screen.getByText('Conseil')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("priorité de l'error sur le helper", () => {
    render(
      <WizField label="X" error="Erreur" helper="Conseil"><input /></WizField>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Erreur');
    expect(screen.queryByText('Conseil')).toBeNull();
  });

  it("lie label htmlFor à un id custom", () => {
    render(
      <WizField label="Email" htmlFor="email-1">
        <input id="email-1" />
      </WizField>,
    );
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-1');
  });
});

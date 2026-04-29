import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileForm } from '../ProfileForm';
import type { GuideProfileDraft } from '@/lib/studio/profile-helpers';

const baseDraft: GuideProfileDraft = {
  displayName: 'Steffen Guillaume',
  bio: '',
  photoUrl: null,
  city: 'Grasse',
  yearsExperience: 2018,
  specialties: ['Parfumerie'],
  languages: ['fr', 'en'],
};

describe('ProfileForm', () => {
  it("affiche les valeurs initiales du draft", () => {
    render(<ProfileForm value={baseDraft} onChange={jest.fn()} />);
    expect((screen.getByTestId('profile-name') as HTMLInputElement).value).toBe('Steffen Guillaume');
    expect((screen.getByTestId('profile-city') as HTMLInputElement).value).toBe('Grasse');
    expect((screen.getByTestId('profile-year') as HTMLInputElement).value).toBe('2018');
  });

  it("appelle onChange en éditant le nom", () => {
    const onChange = jest.fn();
    render(<ProfileForm value={baseDraft} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('profile-name'), {
      target: { value: 'Nouveau Nom' },
    });
    expect(onChange).toHaveBeenCalledWith({ ...baseDraft, displayName: 'Nouveau Nom' });
  });

  it("affiche le compteur de caractères du nom", () => {
    render(<ProfileForm value={baseDraft} onChange={jest.fn()} />);
    // displayName = "Steffen Guillaume" = 17 chars
    expect(screen.getByText('17 / 50')).toBeInTheDocument();
  });

  it("affiche le compteur de bio (0 quand bio null)", () => {
    render(<ProfileForm value={{ ...baseDraft, bio: null }} onChange={jest.fn()} />);
    expect(screen.getByText('0 / 500')).toBeInTheDocument();
  });

  it("met à jour yearsExperience en tant que nombre", () => {
    const onChange = jest.fn();
    render(<ProfileForm value={baseDraft} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('profile-year'), { target: { value: '2020' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseDraft, yearsExperience: 2020 });
  });

  it("met à jour yearsExperience à null quand vidé", () => {
    const onChange = jest.fn();
    render(<ProfileForm value={baseDraft} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('profile-year'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseDraft, yearsExperience: null });
  });

  it("affiche le label famille couleur de la ville", () => {
    render(<ProfileForm value={baseDraft} onChange={jest.fn()} />);
    expect(screen.getByText(/Famille Ocre/)).toBeInTheDocument();
  });

  it("affiche message d'erreur quand displayName invalide", () => {
    render(<ProfileForm value={{ ...baseDraft, displayName: 'a' }} onChange={jest.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it("inclut SpecialtyChipsInput et LanguageTogglePills", () => {
    render(<ProfileForm value={baseDraft} onChange={jest.fn()} />);
    expect(screen.getByTestId('specialty-chips-input')).toBeInTheDocument();
    expect(screen.getByTestId('language-toggle-pills')).toBeInTheDocument();
  });

  it("désactive le bouton 'Importer' (hors scope cette PR)", () => {
    render(<ProfileForm value={baseDraft} onChange={jest.fn()} />);
    const btn = screen.getByText('Importer');
    expect(btn).toBeDisabled();
  });
});

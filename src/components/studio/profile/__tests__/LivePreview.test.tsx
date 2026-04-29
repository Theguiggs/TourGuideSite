import React from 'react';
import { render, screen } from '@testing-library/react';
import { LivePreview } from '../LivePreview';
import type { GuideProfileDraft } from '@/lib/studio/profile-helpers';

const baseDraft: GuideProfileDraft = {
  displayName: 'Steffen Guillaume',
  bio: 'Une bio sympathique.',
  photoUrl: null,
  city: 'Grasse',
  yearsExperience: 2018,
  specialties: ['Parfumerie', 'Histoire', 'Routes'],
  languages: ['fr', 'en'],
};

describe('LivePreview', () => {
  it('rend le nom et la ville+année', () => {
    render(<LivePreview value={baseDraft} toursCount={12} />);
    expect(screen.getByText('Steffen Guillaume')).toBeInTheDocument();
    expect(screen.getByText(/Grasse · depuis 2018/)).toBeInTheDocument();
  });

  it("rend la bio entre guillemets quand fournie", () => {
    render(<LivePreview value={baseDraft} toursCount={1} />);
    expect(screen.getByText(/Une bio sympathique\./)).toBeInTheDocument();
  });

  it("affiche un placeholder quand bio absente", () => {
    render(<LivePreview value={{ ...baseDraft, bio: null }} toursCount={1} />);
    expect(screen.getByText(/Votre biographie apparaîtra ici/i)).toBeInTheDocument();
  });

  it("affiche au max 2 chips spécialité + un compteur +N", () => {
    render(<LivePreview value={baseDraft} toursCount={1} />);
    expect(screen.getByText('Parfumerie')).toBeInTheDocument();
    expect(screen.getByText('Histoire')).toBeInTheDocument();
    expect(screen.queryByText('Routes')).toBeNull();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it("affiche '—' pour totalPlays et averageRating quand null", () => {
    render(<LivePreview value={baseDraft} toursCount={1} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("affiche les valeurs réelles quand fournies", () => {
    render(
      <LivePreview value={baseDraft} toursCount={12} totalPlays={1247} averageRating={4.7} />,
    );
    expect(screen.getByText('1247')).toBeInTheDocument();
    expect(screen.getByText('4,7★')).toBeInTheDocument();
  });

  it("affiche les sample tours en preview", () => {
    render(
      <LivePreview
        value={baseDraft}
        toursCount={2}
        sampleTours={[
          { city: 'Grasse', title: 'Les Routes du Parfum' },
          { city: 'Cannes', title: 'Du Suquet à la Croisette' },
        ]}
      />,
    );
    expect(screen.getByText('Les Routes du Parfum')).toBeInTheDocument();
    expect(screen.getByText('Du Suquet à la Croisette')).toBeInTheDocument();
  });

  it("fallback sur 'Votre nom' si displayName vide", () => {
    render(<LivePreview value={{ ...baseDraft, displayName: '' }} toursCount={0} />);
    expect(screen.getByText('Votre nom')).toBeInTheDocument();
  });
});

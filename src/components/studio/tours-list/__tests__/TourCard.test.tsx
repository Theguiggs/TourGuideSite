import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TourCard } from '../TourCard';
import type { StudioSession } from '@/types/studio';

function mkSession(partial: Partial<StudioSession> & { id: string }): StudioSession {
  return {
    guideId: 'g1',
    sourceSessionId: 'src',
    tourId: 'tour-1',
    title: 'Vence — Chapelle Matisse',
    status: 'draft',
    language: 'fr',
    transcriptionQuotaUsed: null,
    coverPhotoKey: null,
    availableLanguages: ['en'],
    translatedTitles: null,
    translatedDescriptions: null,
    version: 1,
    consentRGPD: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-22T00:00:00Z',
    ...partial,
  };
}

describe('TourCard', () => {
  it('rend la ville (extraite du titre) et le titre complet', () => {
    render(<TourCard session={mkSession({ id: 's1' })} />);
    expect(screen.getByText('Vence')).toBeInTheDocument();
    expect(screen.getByText('Vence — Chapelle Matisse')).toBeInTheDocument();
  });

  it("affiche le badge 'En cours' quand current=true", () => {
    render(<TourCard session={mkSession({ id: 's1' })} current />);
    expect(screen.getByText('En cours')).toBeInTheDocument();
  });

  it("CTA = 'Reprendre' grenadine quand current=true", () => {
    render(<TourCard session={mkSession({ id: 's1' })} current />);
    expect(screen.getByTestId('tour-card-cta')).toHaveTextContent('Reprendre');
  });

  it("CTA = 'Modifier' pour un tour publié non-courant", () => {
    render(<TourCard session={mkSession({ id: 's1', status: 'published' })} />);
    expect(screen.getByTestId('tour-card-cta')).toHaveTextContent('Modifier');
  });

  it("CTA = 'Continuer' pour un draft non-courant", () => {
    render(<TourCard session={mkSession({ id: 's1', status: 'draft' })} />);
    expect(screen.getByTestId('tour-card-cta')).toHaveTextContent('Continuer');
  });

  it('affiche la barre de progression sur draft avec scenesTotal>0', () => {
    const { container } = render(
      <TourCard session={mkSession({ id: 's1', status: 'draft' })} scenesTotal={6} scenesDone={4} />,
    );
    expect(screen.getByText('67%')).toBeInTheDocument();
    // progress bar exists
    const bars = container.querySelectorAll('div.bg-paper-deep > div');
    expect(bars.length).toBeGreaterThan(0);
  });

  it("masque la barre de progression sur tour publié", () => {
    render(<TourCard session={mkSession({ id: 's1', status: 'published' })} scenesTotal={6} scenesDone={6} />);
    expect(screen.queryByText('100%')).toBeNull();
    expect(screen.getByText(/Mis à jour le/)).toBeInTheDocument();
  });

  it("affiche '—' pour plays/rating null", () => {
    render(<TourCard session={mkSession({ id: 's1' })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it("affiche le rating avec virgule (FR) quand fourni", () => {
    render(<TourCard session={mkSession({ id: 's1', status: 'published' })} rating={4.8} />);
    expect(screen.getByText('★4,8')).toBeInTheDocument();
  });

  it('rend les codes langues en uppercase', () => {
    render(
      <TourCard session={mkSession({ id: 's1', language: 'fr', availableLanguages: ['en', 'es'] })} />,
    );
    expect(screen.getByText('FR')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('ES')).toBeInTheDocument();
  });

  it("affiche le pill statut adapté au bucket", () => {
    render(<TourCard session={mkSession({ id: 's1', status: 'published' })} />);
    expect(screen.getByText('En ligne')).toBeInTheDocument();
  });

  it("le ⋮ ouvre un menu ; « Supprimer » y appelle onDelete", () => {
    const onDelete = jest.fn();
    render(<TourCard session={mkSession({ id: 's1' })} onDelete={onDelete} />);
    expect(screen.queryByTestId('tour-card-delete')).toBeNull();
    fireEvent.click(screen.getByTestId('tour-card-menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tour-card-delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0].id).toBe('s1');
  });

  it("masque « Supprimer » si onDelete absent", () => {
    render(<TourCard session={mkSession({ id: 's1' })} />);
    fireEvent.click(screen.getByTestId('tour-card-menu'));
    expect(screen.queryByTestId('tour-card-delete')).toBeNull();
  });

  it("ne propose pas la suppression d'une visite publiée", () => {
    const onDelete = jest.fn();
    render(<TourCard session={mkSession({ id: 's1', status: 'published' })} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId('tour-card-menu'));
    expect(screen.queryByTestId('tour-card-delete')).toBeNull();
    expect(screen.getByTestId('tour-card-delete-blocked')).toBeInTheDocument();
  });

  it("affiche l'accès de la visite : gratuite, payante avec prix, abonnés", () => {
    const { rerender } = render(
      <TourCard session={mkSession({ id: 's1', status: 'published' })} access={{ purchaseType: 'free', priceCents: null }} />,
    );
    expect(screen.getByTestId('tour-card-access')).toHaveTextContent('Gratuite');

    rerender(<TourCard session={mkSession({ id: 's1', status: 'published' })} access={{ purchaseType: 'paid', priceCents: 499 }} />);
    expect(screen.getByTestId('tour-card-access')).toHaveTextContent('Payante');
    expect(screen.getByTestId('tour-card-access')).toHaveTextContent('4,99');

    rerender(<TourCard session={mkSession({ id: 's1', status: 'published' })} access={{ purchaseType: 'subscription_only', priceCents: null }} />);
    expect(screen.getByTestId('tour-card-access')).toHaveTextContent('Abonnés');
  });

  it("masque la pastille d'accès quand la visite n'existe pas encore", () => {
    render(<TourCard session={mkSession({ id: 's1' })} />);
    expect(screen.queryByTestId('tour-card-access')).not.toBeInTheDocument();
  });

  it("compte les langues créées transmises par la page, pas seulement celles vendues", () => {
    render(<TourCard session={mkSession({ id: 's1', availableLanguages: [] })} langs={['FR', 'EN', 'DE']} />);
    expect(screen.getByTestId('tour-card-langs')).toHaveTextContent('FR');
    expect(screen.getByTestId('tour-card-langs')).toHaveTextContent('DE');
    expect(screen.getByText(/3 langues/)).toBeInTheDocument();
  });

  it("nomme la mesure honnêtement : écoutes terminées", () => {
    render(<TourCard session={mkSession({ id: 's1', status: 'published' })} plays={12} />);
    expect(screen.getByText('Écoutes terminées')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});

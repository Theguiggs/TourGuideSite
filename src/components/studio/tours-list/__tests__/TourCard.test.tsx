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

  it("expose un bouton supprimer si onDelete fourni", () => {
    const onDelete = jest.fn();
    render(<TourCard session={mkSession({ id: 's1' })} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId('tour-card-delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0].id).toBe('s1');
  });

  it("masque le bouton supprimer si onDelete absent", () => {
    render(<TourCard session={mkSession({ id: 's1' })} />);
    expect(screen.queryByTestId('tour-card-delete')).toBeNull();
  });
});

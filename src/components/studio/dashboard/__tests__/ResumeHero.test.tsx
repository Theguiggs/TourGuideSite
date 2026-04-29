import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResumeHero } from '../ResumeHero';
import type { StudioSession } from '@/types/studio';

const baseSession: StudioSession = {
  id: 'sess-1',
  guideId: 'g1',
  sourceSessionId: 'src',
  tourId: 'tour-1',
  title: 'Vence — Chapelle Matisse',
  status: 'draft',
  language: 'fr',
  transcriptionQuotaUsed: null,
  coverPhotoKey: null,
  availableLanguages: [],
  translatedTitles: null,
  translatedDescriptions: null,
  version: 1,
  consentRGPD: true,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

describe('ResumeHero', () => {
  it('rend le titre de la session', () => {
    render(<ResumeHero session={baseSession} scenesTotal={6} scenesDone={4} />);
    expect(screen.getByText('Vence — Chapelle Matisse')).toBeInTheDocument();
  });

  it('calcule la progression (4/6 = 67%)', () => {
    render(<ResumeHero session={baseSession} scenesTotal={6} scenesDone={4} />);
    expect(screen.getByTestId('resume-pct')).toHaveTextContent('67%');
  });

  it('affiche 0% quand scenesTotal=0', () => {
    render(<ResumeHero session={baseSession} scenesTotal={0} scenesDone={0} />);
    expect(screen.getByTestId('resume-pct')).toHaveTextContent('0%');
  });

  it('lien Continuer pointe vers /scenes', () => {
    render(<ResumeHero session={baseSession} scenesTotal={6} scenesDone={2} />);
    const link = screen.getByTestId('resume-continue');
    expect(link).toHaveAttribute('href', '/guide/studio/sess-1/scenes');
  });

  it('inclut le greeting si guideName fourni', () => {
    render(
      <ResumeHero session={baseSession} scenesTotal={1} scenesDone={0} guideName="Steffen" />,
    );
    expect(screen.getByText(/Bonjour Steffen/i)).toBeInTheDocument();
  });

  it('utilise un titre par défaut si session sans titre', () => {
    const noTitle = { ...baseSession, title: null };
    render(<ResumeHero session={noTitle} scenesTotal={1} scenesDone={0} />);
    expect(screen.getByText(/sans titre/i)).toBeInTheDocument();
  });
});

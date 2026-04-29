import React from 'react';
import { render, screen } from '@testing-library/react';
import { WizardShell } from '../WizardShell';
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
  updatedAt: '2026-04-22T00:00:00Z',
};

describe('WizardShell', () => {
  it('rend le breadcrumb avec ville extraite et nom du parcours', () => {
    render(
      <WizardShell session={baseSession} activeTab="accueil">
        <div>body</div>
      </WizardShell>,
    );
    expect(screen.getByText('Vence')).toBeInTheDocument();
    expect(screen.getByText('Chapelle Matisse')).toBeInTheDocument();
  });

  it('affiche le code langue en uppercase', () => {
    render(
      <WizardShell session={baseSession} activeTab="accueil">
        <div />
      </WizardShell>,
    );
    expect(screen.getByText('FR')).toBeInTheDocument();
  });

  it('affiche un badge V2+ pour les versions > 1', () => {
    render(
      <WizardShell session={{ ...baseSession, version: 3 }} activeTab="accueil">
        <div />
      </WizardShell>,
    );
    expect(screen.getByText('V3')).toBeInTheDocument();
  });

  it("masque le badge version pour V1", () => {
    render(
      <WizardShell session={baseSession} activeTab="accueil">
        <div />
      </WizardShell>,
    );
    expect(screen.queryByText('V1')).toBeNull();
  });

  it('rend les 6 tabs numérotées', () => {
    render(
      <WizardShell session={baseSession} activeTab="accueil">
        <div />
      </WizardShell>,
    );
    expect(screen.getByTestId('wizard-tab-accueil')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-tab-general')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-tab-itinerary')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-tab-scenes')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-tab-preview')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-tab-submission')).toBeInTheDocument();
  });

  it("marque le tab actif via aria-current", () => {
    render(
      <WizardShell session={baseSession} activeTab="general">
        <div />
      </WizardShell>,
    );
    expect(screen.getByTestId('wizard-tab-general')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('wizard-tab-accueil')).not.toHaveAttribute('aria-current');
  });

  it('rend les enfants dans le body', () => {
    render(
      <WizardShell session={baseSession} activeTab="accueil">
        <div data-testid="body-content">CONTENT</div>
      </WizardShell>,
    );
    expect(screen.getByTestId('body-content')).toHaveTextContent('CONTENT');
  });

  it("affiche un skeleton quand headerLoading=true", () => {
    const { container } = render(
      <WizardShell session={null} activeTab="accueil" headerLoading>
        <div />
      </WizardShell>,
    );
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it("rend les hrefs des tabs vers /guide/studio/[sessionId]/...", () => {
    render(
      <WizardShell session={baseSession} activeTab="accueil">
        <div />
      </WizardShell>,
    );
    expect(screen.getByTestId('wizard-tab-accueil')).toHaveAttribute('href', '/guide/studio/sess-1');
    expect(screen.getByTestId('wizard-tab-general')).toHaveAttribute('href', '/guide/studio/sess-1/general');
    expect(screen.getByTestId('wizard-tab-submission')).toHaveAttribute(
      'href',
      '/guide/studio/sess-1/submission',
    );
  });
});

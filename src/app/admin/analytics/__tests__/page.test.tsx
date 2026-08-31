/**
 * Story 16, tâche 6 — « soit la page lit le réel, soit elle ne dit rien ».
 *
 * Ces épreuves tiennent l'écran, pas le module : c'est à l'écran que le « coût
 * supposé » qu'AD-16 §6 interdit était affiché.
 */
import { render, screen, waitFor } from '@testing-library/react';

import type { RapportDeDepense } from '@/lib/api/spend-ledger-report';

const mockAnalytics = jest.fn();
const mockGrandLivre = jest.fn();

jest.mock('@/lib/api/studio-analytics', () => ({
  getStudioAnalytics: () => mockAnalytics(),
}));

jest.mock('@/lib/api/spend-ledger-report', () => {
  const reel = jest.requireActual('@/lib/api/spend-ledger-report');
  return {
    ...reel,
    lireGrandLivre: () => mockGrandLivre(),
  };
});

import AdminAnalyticsPage from '../page';

const ANALYTIQUE = {
  funnel: {
    fieldSessions: 4,
    studioCreated: 4,
    transcribed: 3,
    recorded: 3,
    submitted: 2,
    published: 1,
  },
  statusDistribution: [{ status: 'published', count: 1, percentage: 25 }],
  tourProduction: [{ tourId: 't-1', tourTitle: 'Biarritz — Le Caprice', scenesWithAudio: 9 }],
};

const axe = (surcharge: Record<string, unknown> = {}) => ({
  enveloppe: 'visiteur',
  cle: 'tour-42',
  mesureMicros: 0,
  provisionOuverteMicros: 0,
  relacheMicros: 0,
  debitsConclus: 0,
  debitsEnVol: 0,
  debitsRelaches: 0,
  caracteresSoumis: 0,
  caracteresFactures: 0,
  jetonsEntree: 0,
  jetonsSortie: 0,
  ...surcharge,
});

describe('AdminAnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalytics.mockResolvedValue(ANALYTIQUE);
    mockGrandLivre.mockResolvedValue({
      ok: false,
      motif: 'registre-non-deploye',
      message: 'Le grand livre n’est pas encore lisible ici.',
    } satisfies RapportDeDepense);
  });

  it('n’affiche AUCUN coût unitaire par tour', async () => {
    const { container } = render(<AdminAnalyticsPage />);
    await waitFor(() => expect(screen.getByText('Production par Visite')).toBeInTheDocument());

    expect(screen.queryByText('Coût unitaire par tour')).not.toBeInTheDocument();
    // Les colonnes inventées sont parties avec les constantes qui les nourrissaient.
    expect(screen.queryByText(/Transcribe \(min\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/S3 \(Mo\)/)).not.toBeInTheDocument();
    // La ligne de production n'affiche que des faits comptés.
    const ligne = container.querySelector('[data-testid="production-t-1"]');
    expect(ligne?.textContent).toContain('9');
    expect(ligne?.textContent).not.toMatch(/\$/);
  });

  it('registre indisponible : un « — » honnête, et la cause', async () => {
    render(<AdminAnalyticsPage />);
    const bloc = await screen.findByTestId('depense-indisponible');

    expect(bloc.textContent).toContain('—');
    expect(bloc.textContent).toContain('Le grand livre n’est pas encore lisible ici.');
    expect(bloc.textContent).toMatch(/honnête vaut mieux/);
  });

  it('grand livre vierge : le DIT, et n’affiche pas 0 $', async () => {
    mockGrandLivre.mockResolvedValue({
      ok: true,
      vide: true,
      periodes: ['2026-09'],
      enveloppes: [
        {
          enveloppe: 'interne',
          armee: false,
          motif: 'ligne-absente',
          capMicros: null,
          engageMicros: 0,
          remplissagePourCent: null,
        },
      ],
      parEnveloppe: [axe({ enveloppe: 'interne', cle: 'interne' })],
      parPeriode: [],
      parLangue: [],
      parVisite: [],
    } satisfies RapportDeDepense);

    render(<AdminAnalyticsPage />);
    const bloc = await screen.findByTestId('grand-livre-vide');

    expect(bloc.textContent).toMatch(/aucun débit/);
    expect(bloc.textContent).toMatch(/rien de mesuré à ce jour/);
    expect(bloc.textContent).not.toMatch(/\$0/);
  });

  it('grand livre garni : rend le mesuré, le provisionné et le relâché, jamais leur somme', async () => {
    mockGrandLivre.mockResolvedValue({
      ok: true,
      vide: false,
      periodes: ['2026-09'],
      enveloppes: [
        {
          enveloppe: 'interne',
          armee: true,
          motif: null,
          capMicros: 30_000_000,
          engageMicros: 1_470_000,
          remplissagePourCent: 4.9,
        },
      ],
      parEnveloppe: [axe({ enveloppe: 'interne', cle: 'interne', mesureMicros: 1_470_000 })],
      parPeriode: [],
      parLangue: [],
      parVisite: [
        axe({
          cle: 'tour-42',
          mesureMicros: 160_000,
          provisionOuverteMicros: 20_000,
          relacheMicros: 30_000,
          debitsConclus: 7,
        }),
      ],
    } satisfies RapportDeDepense);

    render(<AdminAnalyticsPage />);
    const ligne = await screen.findByTestId('depense-visiteur-tour-42');

    expect(ligne.textContent).toContain('$0.1600');
    expect(ligne.textContent).toContain('$0.0200');
    expect(ligne.textContent).toContain('$0.0300');
    // La somme des trois (0,21 $) ne doit apparaître NULLE PART : les additionner
    // rendrait un total supérieur au compteur opposable de l'enveloppe.
    expect(ligne.textContent).not.toContain('$0.2100');
    expect(screen.getByTestId('enveloppe-interne').textContent).toContain('$1.47');
    expect(screen.getByTestId('enveloppe-interne').textContent).toContain('$30.00');
  });
});

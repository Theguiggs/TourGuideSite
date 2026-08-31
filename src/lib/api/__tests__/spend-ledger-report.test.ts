/** @jest-environment node */

const mockGetClient = jest.fn();

jest.mock('@/lib/api/appsync-client', () => ({
  getClient: () => mockGetClient(),
}));

import { formaterDollars, lireGrandLivre } from '../spend-ledger-report';

const axe = (surcharge: Record<string, unknown> = {}) => ({
  envelope: 'interne',
  key: 'interne:portail',
  measuredMicros: 0,
  openProvisionMicros: 0,
  releasedMicros: 0,
  closedDebits: 0,
  openDebits: 0,
  releasedDebits: 0,
  submittedCharacters: 0,
  billedCharacters: 0,
  inputTokens: 0,
  outputTokens: 0,
  ...surcharge,
});

function clientAvec(requete: unknown) {
  return { queries: { spendLedgerReport: requete } };
}

describe('lireGrandLivre', () => {
  const stubsOrigine = process.env.NEXT_PUBLIC_USE_STUBS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_USE_STUBS = 'false';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    process.env.NEXT_PUBLIC_USE_STUBS = stubsOrigine;
  });

  // ─── L'ORDRE DE DÉPLOIEMENT, ÉPROUVÉ CÔTÉ CONSULTATION ───
  //
  // `amplify_outputs.json` est une copie manuelle : tant qu'elle n'est pas
  // refaite, la requête n'existe pas dans le client. La page doit le DIRE.
  it('requête absente d’amplify_outputs : ne dit rien, et nomme pourquoi', async () => {
    mockGetClient.mockReturnValue({ queries: {} });

    const rapport = await lireGrandLivre();

    expect(rapport).toMatchObject({ ok: false, motif: 'registre-non-deploye' });
    if (rapport.ok) throw new Error('unreachable');
    expect(rapport.message).toMatch(/amplify_outputs\.json/);
  });

  it('mode bouchon : ne simule AUCUN coût', async () => {
    process.env.NEXT_PUBLIC_USE_STUBS = 'true';
    mockGetClient.mockReturnValue(clientAvec(jest.fn()));

    expect(await lireGrandLivre()).toMatchObject({ ok: false, motif: 'mode-bouchon' });
  });

  it('lit le réel, sépare les trois grandeurs, et ne les additionne pas', async () => {
    const requete = jest.fn().mockResolvedValue({
      data: {
        ok: true,
        complete: true,
        periods: ['2026-08', '2026-09'],
        envelopes: [
          {
            envelope: 'interne',
            armed: true,
            reason: null,
            capMicros: 30_000_000,
            engagedMicros: 1_470_000,
            fillPercent: 4.9,
          },
        ],
        byEnvelope: [axe({ measuredMicros: 1_200_000, releasedMicros: 270_000, closedDebits: 6 })],
        byPeriod: [],
        byLanguage: [axe({ key: 'it', measuredMicros: 900_000, closedDebits: 4 })],
        byTour: [
          axe({
            envelope: 'visiteur',
            key: 'tour-42',
            measuredMicros: 160_000,
            openProvisionMicros: 20_000,
            releasedMicros: 30_000,
            closedDebits: 7,
          }),
        ],
      },
    });
    mockGetClient.mockReturnValue(clientAvec(requete));

    const rapport = await lireGrandLivre(13);

    expect(requete).toHaveBeenCalledWith({ months: 13 }, { authMode: 'userPool' });
    expect(rapport.ok).toBe(true);
    if (!rapport.ok) throw new Error('unreachable');
    expect(rapport.vide).toBe(false);
    expect(rapport.periodes).toEqual(['2026-08', '2026-09']);
    expect(rapport.enveloppes[0]).toMatchObject({
      enveloppe: 'interne',
      armee: true,
      capMicros: 30_000_000,
      engageMicros: 1_470_000,
    });
    const visite = rapport.parVisite[0];
    expect(visite.mesureMicros).toBe(160_000);
    expect(visite.provisionOuverteMicros).toBe(20_000);
    expect(visite.relacheMicros).toBe(30_000);
  });

  // « Si le grand livre est vide (il l'est : il part de zéro), la page doit le
  // DIRE, pas afficher 0 $. »
  it('grand livre vierge : le signale au lieu de rendre zéro', async () => {
    mockGetClient.mockReturnValue(
      clientAvec(
        jest.fn().mockResolvedValue({
          data: {
            ok: true,
            complete: true,
            periods: ['2026-09'],
            envelopes: [
              {
                envelope: 'interne',
                armed: false,
                reason: 'ligne-absente',
                capMicros: null,
                engagedMicros: 0,
                fillPercent: null,
              },
            ],
            byEnvelope: [axe()],
            byPeriod: [],
            byLanguage: [],
            byTour: [],
          },
        }),
      ),
    );

    const rapport = await lireGrandLivre();
    expect(rapport.ok).toBe(true);
    if (!rapport.ok) throw new Error('unreachable');
    expect(rapport.vide).toBe(true);
  });

  it('lecture incomplète : retient les agrégats plutôt que de sous-déclarer', async () => {
    mockGetClient.mockReturnValue(
      clientAvec(
        jest.fn().mockResolvedValue({
          data: { ok: false, complete: false, code: 2808, byEnvelope: [], byTour: [] },
        }),
      ),
    );

    const rapport = await lireGrandLivre();
    expect(rapport).toMatchObject({ ok: false, motif: 'lecture-incomplete' });
  });

  it('refus admin et panne sont distingués, et aucun des deux n’invente', async () => {
    mockGetClient.mockReturnValue(
      clientAvec(
        jest
          .fn()
          .mockResolvedValue({ errors: [{ message: 'Not Authorized to access spendLedgerReport' }] }),
      ),
    );
    expect(await lireGrandLivre()).toMatchObject({ ok: false, motif: 'refuse' });

    mockGetClient.mockReturnValue(
      clientAvec(jest.fn().mockRejectedValue(new Error('network down'))),
    );
    expect(await lireGrandLivre()).toMatchObject({ ok: false, motif: 'panne' });
  });
});

describe('formaterDollars', () => {
  it('garde quatre décimales sous le dollar — 0,0004 $ n’est pas 0,00 $', () => {
    expect(formaterDollars(400)).toBe('$0.0004');
    expect(formaterDollars(164_200)).toBe('$0.1642');
    expect(formaterDollars(0)).toBe('$0.00');
    expect(formaterDollars(20_000_000)).toBe('$20.00');
  });
});

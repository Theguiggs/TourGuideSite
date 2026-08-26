/**
 * Story 1 — format de fil de `GuideTour.languageAudioTypes`.
 *
 * `languageAudioTypes` est un champ `a.json()` (AWSJSON) : il DOIT partir en
 * chaîne JSON. Passé en objet, AppSync rejette la mutation entière
 * («Variable has an invalid value»), `updateGuideTourMutation` retourne
 * `{ok:false}` — et l'appelant qui ignorait ce retour publiait une Visite sans
 * mention. Ce fichier fige le format et l'aller-retour sans perte.
 *
 * Le mock global de `appsync-client` (src/__mocks__/appsync-client-mock.ts) est
 * levé ici : c'est la vraie implémentation qu'on met à l'épreuve, avec un client
 * Amplify simulé.
 */

jest.unmock('@/lib/api/appsync-client');

const mockGuideTourUpdate = jest.fn();
const mockGuideTourGet = jest.fn();

jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    models: { GuideTour: { update: mockGuideTourUpdate, get: mockGuideTourGet } },
  }),
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: () => ({ API: { GraphQL: { endpoint: 'https://example.test/graphql' } } }),
  },
}));

jest.mock('@/lib/amplify/config', () => ({ configureAmplify: jest.fn() }));

import fs from 'node:fs';
import path from 'node:path';
import {
  GUIDE_TOUR_JSON_FIELDS,
  GUIDE_TOUR_JSON_FIELDS_EXCLUS,
  getGuideTourById,
  getGuideTourResult,
  updateGuideTourMutation,
} from '../appsync-client';
import { AUDIO_DISCLOSURE_ERR } from '../audio-source-policy';

/** Ce que le résolveur AWSJSON fait de la valeur reçue : il exige une chaîne. */
function appsyncAwsJsonRoundTrip(wireValue: unknown): unknown {
  if (typeof wireValue !== 'string') {
    throw new Error('Variable has an invalid value: AWSJSON expects a JSON string');
  }
  return JSON.parse(wireValue);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGuideTourUpdate.mockResolvedValue({ data: { id: 'tour-1' }, errors: undefined });
});

describe('updateGuideTourMutation — sérialisation des champs AWSJSON', () => {
  it('envoie languageAudioTypes en chaîne JSON, pas en objet', async () => {
    const result = await updateGuideTourMutation('tour-1', {
      status: 'published',
      languageAudioTypes: { fr: 'tts', en: 'recording' },
    });

    expect(result.ok).toBe(true);
    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(typeof sent.languageAudioTypes).toBe('string');
    expect(() => appsyncAwsJsonRoundTrip(sent.languageAudioTypes)).not.toThrow();
  });

  it('aller-retour sans perte : ce qui est relu est identique à ce qui est écrit', async () => {
    const written = { fr: 'mixed', nl: 'tts', en: 'recording' };
    await updateGuideTourMutation('tour-1', { languageAudioTypes: written });

    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(appsyncAwsJsonRoundTrip(sent.languageAudioTypes)).toEqual(written);
  });

  it('est idempotent : une mention déjà sérialisée traverse intacte', async () => {
    const already = JSON.stringify({ fr: 'tts' });
    await updateGuideTourMutation('tour-1', { languageAudioTypes: already });

    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(sent.languageAudioTypes).toBe(already);
    expect(appsyncAwsJsonRoundTrip(sent.languageAudioTypes)).toEqual({ fr: 'tts' });
  });

  it('envoie translatedTitles en chaîne JSON — story 3', async () => {
    // Le champ est de l'AWSJSON au même titre que `languageAudioTypes`. Non
    // sérialisé, il ferait rejeter la mutation ENTIÈRE : la Visite ne serait
    // alors pas publiée du tout, pas seulement privée de ses titres.
    const titles = { en: 'Aix — Squares and Gates', de: 'Aix — Plätze und Tore' };
    const result = await updateGuideTourMutation('tour-1', {
      status: 'published',
      languageAudioTypes: { fr: 'tts' },
      translatedTitles: titles,
    });

    expect(result.ok).toBe(true);
    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(typeof sent.translatedTitles).toBe('string');
    expect(appsyncAwsJsonRoundTrip(sent.translatedTitles)).toEqual(titles);
  });

  it('laisse translatedAudioKeys NON sérialisé — délibérément', async () => {
    // Le sérialiser rendrait vivante l'écriture d'approbation de langue, qui
    // remplace ses cartes en bloc : on passerait de « rien ne s'écrit » à
    // « tout est écrasé ». À réactiver avec la fusion, pas avant.
    await updateGuideTourMutation('tour-1', { translatedAudioKeys: { en: { s1: 'k.mp3' } } });

    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(typeof sent.translatedAudioKeys).toBe('object');
  });

  it('laisse les champs non-JSON intacts', async () => {
    await updateGuideTourMutation('tour-1', { title: 'Titre', availableLanguages: ['fr', 'en'] });

    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(sent.title).toBe('Titre');
    expect(sent.availableLanguages).toEqual(['fr', 'en']);
  });

  it('ne lève jamais : un rejet serveur devient { ok: false }', async () => {
    mockGuideTourUpdate.mockResolvedValue({ data: null, errors: [{ message: 'Unauthorized' }] });

    const result = await updateGuideTourMutation('tour-1', { title: 'Titre' });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain('Unauthorized');
  });

  it('ne lève jamais : une exception réseau devient { ok: false }', async () => {
    mockGuideTourUpdate.mockRejectedValue(new Error('network down'));

    const result = await updateGuideTourMutation('tour-1', { title: 'Titre' });

    expect(result.ok).toBe(false);
  });
});

describe('updateGuideTourMutation — garde d ecriture (29xx)', () => {
  it('refuse une écriture publiant sans mention, sans même appeler AppSync', async () => {
    const result = await updateGuideTourMutation('tour-1', { status: 'published' });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain(
      String(AUDIO_DISCLOSURE_ERR.PUBLISH_WITHOUT_DISCLOSURE),
    );
    expect(mockGuideTourUpdate).not.toHaveBeenCalled();
  });

  it('refuse une mention vide à la publication', async () => {
    const result = await updateGuideTourMutation('tour-1', { status: 'published', languageAudioTypes: {} });

    expect(result.ok).toBe(false);
    expect(mockGuideTourUpdate).not.toHaveBeenCalled();
  });

  it('refuse une écriture qui dépouillerait une Visite déjà publiée, sans status', async () => {
    // L invariant est maintenu tout au long du cycle de vie, pas seulement posé
    // au moment de la transition vers `published`.
    const result = await updateGuideTourMutation('tour-1', { languageAudioTypes: {} });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain(
      String(AUDIO_DISCLOSURE_ERR.DISCLOSURE_STRIPPED),
    );
    expect(mockGuideTourUpdate).not.toHaveBeenCalled();
  });

  it('laisse passer les écritures qui ne publient pas', async () => {
    const result = await updateGuideTourMutation('tour-1', { status: 'archived' });

    expect(result.ok).toBe(true);
    expect(mockGuideTourUpdate).toHaveBeenCalled();
  });

  it('laisse passer une mention non vide écrite hors publication', async () => {
    const result = await updateGuideTourMutation('tour-1', { languageAudioTypes: { fr: 'tts' } });

    expect(result.ok).toBe(true);
  });
});

describe('getGuideTourResult — « absente » n est pas « lecture en echec »', () => {
  it('rend { ok: true, data: null } pour une Visite absente', async () => {
    mockGuideTourGet.mockResolvedValue({ data: null });

    await expect(getGuideTourResult('absent')).resolves.toEqual({ ok: true, data: null });
  });

  it('rend { ok: false } sur exception réseau', async () => {
    mockGuideTourGet.mockRejectedValue(new Error('network down'));

    const result = await getGuideTourResult('unreadable');

    expect(result.ok).toBe(false);
  });

  it('rend { ok: false } sur erreurs GraphQL renvoyées sans exception', async () => {
    mockGuideTourGet.mockResolvedValue({ data: null, errors: [{ message: 'Unauthorized' }] });

    const result = await getGuideTourResult('tour-1');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain('Unauthorized');
  });

  it('getGuideTourById aplatit les deux cas en null — d où le besoin du Result', async () => {
    mockGuideTourGet.mockResolvedValue({ data: null });
    await expect(getGuideTourById('absent')).resolves.toBeNull();

    mockGuideTourGet.mockRejectedValue(new Error('network down'));
    await expect(getGuideTourById('unreadable')).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SÉCURITÉ (porte 2) — availableLanguages, translatedAudioKeys, languageAudioTypes.
//
// Ces trois champs SONT l'effet visible de l'approbation : l'app mobile les lit
// pour savoir quelles langues sont disponibles. Le schéma les réserve désormais
// au groupe admin en écriture (propriétaire en lecture seule).
//
// ⚠️ Les refus ci-dessous sont SIMULÉS — c'est la réponse qu'AppSync renverrait à
// un jeton guide. La règle de champ elle-même ne peut être exercée que sur le bac
// à sable. Ce qui est prouvé ici : le refus ressort en { ok: false } avec le nom
// du champ, au lieu d'un « Enregistré ✓ » mensonger.
// ---------------------------------------------------------------------------

describe('champs de publication réservés à la modération', () => {
  it.each([
    ['availableLanguages', { availableLanguages: ['fr', 'en'] }],
    ['translatedAudioKeys', { translatedAudioKeys: { en: { 's1': 'a.mp3' } } }],
    ['languageAudioTypes', { languageAudioTypes: { fr: 'tts' } }],
  ])('un refus sur %s ressort en { ok: false }', async (field, updates) => {
    mockGuideTourUpdate.mockResolvedValue({
      data: null,
      errors: [{ message: `Not Authorized to access ${field} on type GuideTour` }],
    });

    const result = await updateGuideTourMutation('tour-1', updates as Record<string, unknown>);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain(field);
  });

  it('le chemin administrateur écrit les trois champs d un coup, sans être altéré', async () => {
    mockGuideTourUpdate.mockResolvedValue({ data: { id: 'tour-1' }, errors: undefined });

    const result = await updateGuideTourMutation('tour-1', {
      availableLanguages: ['fr', 'en', 'es'],
      translatedAudioKeys: { en: { 's1': 'en.mp3' } },
      languageAudioTypes: { fr: 'recording', en: 'tts' },
    });

    expect(result.ok).toBe(true);
    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(sent.availableLanguages).toEqual(['fr', 'en', 'es']);
    expect(typeof sent.languageAudioTypes).toBe('string');
    expect(JSON.parse(sent.languageAudioTypes)).toEqual({ fr: 'recording', en: 'tts' });
    // `translatedAudioKeys` est délibérément NON sérialisé : il part en objet,
    // AppSync rejette alors la mutation entière, et c'est ce rejet qui bloque
    // l'écriture d'approbation — laquelle remplace les trois cartes en bloc
    // sans fusionner. À sérialiser en même temps que la fusion, pas avant.
    expect(typeof sent.translatedAudioKeys).toBe('object');
  });
});

describe('coherence schema <-> liste de serialisation', () => {
  /**
   * La liste est tenue A LA MAIN, dans un dépôt, pour un schéma qui vit dans un
   * AUTRE dépôt. Un champ `a.json()` ajouté sans y être inscrit fait rejeter la
   * mutation ENTIÈRE par AppSync — donc, sur le chemin de publication, la Visite
   * n'est pas publiée du tout. Cette épreuve remplace la convention par un
   * contrôle : elle lit l'introspection réellement déployée.
   */
  const champsAwsJson = (): string[] => {
    const p = path.join(process.cwd(), 'amplify_outputs.json');
    if (!fs.existsSync(p)) return [];
    const outputs = JSON.parse(fs.readFileSync(p, 'utf8'));
    const fields = outputs?.data?.model_introspection?.models?.GuideTour?.fields ?? {};
    return Object.values(fields as Record<string, { name: string; type: unknown }>)
      .filter((f) => f.type === 'AWSJSON')
      .map((f) => f.name);
  };

  it("tout champ AWSJSON de GuideTour est serialise, ou exclu deliberement", () => {
    const champs = champsAwsJson();
    // Sans amplify_outputs.json (poste non configuré), l'épreuve ne peut rien
    // affirmer — mais elle doit le DIRE plutôt que passer en silence.
    expect(champs.length).toBeGreaterThan(0);
    const oublies = champs.filter(
      (f) => !GUIDE_TOUR_JSON_FIELDS.includes(f) && !GUIDE_TOUR_JSON_FIELDS_EXCLUS.includes(f),
    );
    expect(oublies).toEqual([]);
  });

  it("aucun champ de la liste n'a disparu du schema", () => {
    const champs = champsAwsJson();
    expect(champs.length).toBeGreaterThan(0);
    for (const f of GUIDE_TOUR_JSON_FIELDS) expect(champs).toContain(f);
  });

  it('translatedTitles est bien present dans le schema deploye', () => {
    expect(champsAwsJson()).toContain('translatedTitles');
  });
});

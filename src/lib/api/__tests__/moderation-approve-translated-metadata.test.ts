/**
 * Story 3 — les métadonnées traduites voyagent avec la publication.
 *
 * `GuideTour` est ce que lit le catalogue ; les titres et descriptions traduits
 * vivent sur la `StudioSession`, que le Studio édite. Rien ne les projetait :
 * une Visite publiée par le Studio n'emportait aucune métadonnée traduite.
 *
 * Ce fichier fige les deux moitiés du contrat :
 *  - la fonction pure (`translated-metadata.ts`), qui porte la règle seule —
 *    lecture tolérante aux deux formes de stockage, fusion, rejet des vides ;
 *  - son branchement dans `approveTour`, qui la fait voyager dans la MÊME
 *    mutation que `status: 'published'`.
 *
 * Mode réel forcé (NEXT_PUBLIC_USE_STUBS=false), appsync-client + studio moqués.
 */

jest.mock('../appsync-client', () => ({
  getModerationItemById: jest.fn(),
  listModerationItems: jest.fn(),
  getGuideTourById: jest.fn(),
  getGuideTourResult: jest.fn(),
  listStudioScenesBySession: jest.fn(),
  updateModerationItemMutation: jest.fn(),
  updateGuideTourMutation: jest.fn(),
  updateStudioSessionMutation: jest.fn(),
}));

jest.mock('../studio', () => ({
  getStudioSession: jest.fn(),
  listStudioScenes: jest.fn(),
}));

jest.mock('../tour-comments', () => ({
  addTourComment: jest.fn().mockResolvedValue(undefined),
}));

import { approveTour, adminSetTourStatus } from '../moderation';
import {
  mergeTranslatedMetadata,
  parseTranslatedMetadata,
  translatedMetadataUpdate,
} from '../translated-metadata';
import * as appsyncModule from '../appsync-client';
import * as studioModule from '../studio';

const mockGetModerationItemById = appsyncModule.getModerationItemById as jest.Mock;
const mockGetGuideTourResult = appsyncModule.getGuideTourResult as jest.Mock;
const mockListScenesBySession = appsyncModule.listStudioScenesBySession as jest.Mock;
const mockUpdateModerationItem = appsyncModule.updateModerationItemMutation as jest.Mock;
const mockUpdateGuideTour = appsyncModule.updateGuideTourMutation as jest.Mock;
const mockUpdateStudioSession = appsyncModule.updateStudioSessionMutation as jest.Mock;
const mockGetStudioSession = studioModule.getStudioSession as jest.Mock;

const scenesRead = (scenes: unknown[]) => ({ ok: true, data: scenes });
const tourRead = (tour: Record<string, unknown> | null) => ({ ok: true, data: tour });

/** Les cinq langues du Périmètre, telles qu'elles sont en base sur le catalogue. */
const CINQ_TITRES = {
  en: 'Aix-en-Provence — Squares and Gates',
  es: 'Aix-en-Provence — Plazas y puertas',
  de: 'Aix-en-Provence — Plätze und Tore',
  it: 'Aix-en-Provence — Piazze e porte',
  nl: 'Aix-en-Provence — Pleinen en poorten',
};

/** La charge de la mutation qui publie — la PREMIÈRE, celle qui porte `status`. */
const chargeDePublication = () => {
  expect(mockUpdateGuideTour).toHaveBeenCalled();
  return mockUpdateGuideTour.mock.calls[0][1] as Record<string, unknown>;
};

const STUBS_AVANT = process.env.NEXT_PUBLIC_USE_STUBS;

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
});

afterAll(() => {
  // Restaurer, pas reposer une valeur en dur : les fichiers suivants du même
  // worker Jest hériteraient sinon d'un état qui n'était pas le leur.
  if (STUBS_AVANT === undefined) delete process.env.NEXT_PUBLIC_USE_STUBS;
  else process.env.NEXT_PUBLIC_USE_STUBS = STUBS_AVANT;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetModerationItemById.mockResolvedValue({ id: 'mod-1', tourId: 'tour-1', sessionId: 'session-1' });
  mockUpdateModerationItem.mockResolvedValue({ ok: true });
  mockUpdateGuideTour.mockResolvedValue({ ok: true });
  mockUpdateStudioSession.mockResolvedValue({ ok: true });
  mockGetStudioSession.mockResolvedValue({ id: 'session-1', language: 'fr', version: 1 });
  mockGetGuideTourResult.mockResolvedValue(
    tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: null, availableLanguages: [] }),
  );
  mockListScenesBySession.mockResolvedValue(scenesRead([]));
});

describe('matrice — approbation, session complète', () => {
  it('publie les deux cartes dans la MÊME mutation que status', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      translatedTitles: CINQ_TITRES,
      translatedDescriptions: { en: 'Urban history.', es: 'Historia urbana.' },
    });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    const charge = chargeDePublication();
    expect(charge.status).toBe('published');
    expect(charge.languageAudioTypes).toBeDefined();
    expect(charge.translatedTitles).toEqual(CINQ_TITRES);
    expect(charge.translatedDescriptions).toEqual({ en: 'Urban history.', es: 'Historia urbana.' });
    // Ce qui compte n'est pas le nombre d'appels — approveTour en émet d'autres
    // selon la fixture (version, infos visiteur) — mais qu'AUCUN appel autre que
    // celui qui publie ne porte de métadonnée traduite : pas d'écriture séparée
    // qui pourrait échouer après coup et laisser la Visite publiée sans elles.
    const apres = mockUpdateGuideTour.mock.calls.slice(1).map((c) => c[1] as Record<string, unknown>);
    expect(apres.some((u) => 'translatedTitles' in u || 'translatedDescriptions' in u)).toBe(false);
  });

  it('lit une carte stockée en objet comme une carte stockée en chaîne JSON', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      translatedTitles: JSON.stringify(CINQ_TITRES),
    });

    await approveTour('mod-1', {}, 'ok');

    expect(chargeDePublication().translatedTitles).toEqual(CINQ_TITRES);
  });
});

describe('matrice — approbation, session muette', () => {
  it.each([
    ['absente', undefined],
    ['nulle', null],
    ['illisible', '{ pas du json'],
    ['vide', {}],
  ])('publie normalement quand la carte est %s, sans écrire de clé', async (_cas, valeur) => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      translatedTitles: valeur,
    });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    const charge = chargeDePublication();
    expect(charge.status).toBe('published');
    expect(charge).not.toHaveProperty('translatedTitles');
  });

  it("laisse intacte la carte déjà persistée quand la session n'apporte rien", async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({
        id: 'tour-1',
        sessionId: 'session-1',
        languageAudioTypes: null,
        availableLanguages: [],
        translatedTitles: { de: 'Plätze und Tore' },
      }),
    );
    mockGetStudioSession.mockResolvedValue({ id: 'session-1', language: 'fr', version: 1 });

    await approveTour('mod-1', {}, 'ok');

    // Rien de neuf à écrire : la clé est omise, donc la valeur en base survit.
    expect(chargeDePublication()).not.toHaveProperty('translatedTitles');
  });
});

describe('matrice — fusion', () => {
  it("une publication qui n'apporte qu'une langue n'efface pas les autres", async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({
        id: 'tour-1',
        sessionId: 'session-1',
        languageAudioTypes: null,
        availableLanguages: [],
        translatedTitles: { de: 'Plätze und Tore' },
      }),
    );
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      translatedTitles: { en: 'Squares and Gates' },
    });

    await approveTour('mod-1', {}, 'ok');

    expect(chargeDePublication().translatedTitles).toEqual({
      de: 'Plätze und Tore',
      en: 'Squares and Gates',
    });
  });

  it('la charge entrante prime sur la carte persistée, langue par langue', () => {
    expect(mergeTranslatedMetadata({ en: 'Ancien' }, { en: 'Nouveau', de: 'Neu' })).toEqual({
      en: 'Nouveau',
      de: 'Neu',
    });
  });
});

describe('matrice — titre vide ou blanc', () => {
  it('écarte la clé plutôt que de persister un titre blanc', () => {
    expect(parseTranslatedMetadata({ en: 'Titre', de: '   ', es: '' })).toEqual({ en: 'Titre' });
  });

  it('un blanc entrant ne dépouille pas une traduction déjà persistée', () => {
    expect(mergeTranslatedMetadata({ de: 'Plätze' }, { de: '   ' })).toEqual({ de: 'Plätze' });
  });

  it('élague les titres qui traînent des blancs', () => {
    expect(parseTranslatedMetadata({ en: '  Squares and Gates  ' })).toEqual({
      en: 'Squares and Gates',
    });
  });
});

describe('matrice — carte stockée en Map DynamoDB', () => {
  it.each([
    ['objet — écriture DynamoDB directe', { en: 'Squares and Gates' }],
    ['chaîne JSON — écriture AppSync', JSON.stringify({ en: 'Squares and Gates' })],
  ])('lit indifféremment la forme %s', (_forme, valeur) => {
    expect(parseTranslatedMetadata(valeur)).toEqual({ en: 'Squares and Gates' });
  });

  it.each([
    ['un tableau', ['en', 'de']],
    ['un nombre', 42],
    ['une chaîne non-JSON', 'pas du json'],
    ['null', null],
  ])('rend une carte vide sur %s, sans lever', (_cas, valeur) => {
    expect(() => parseTranslatedMetadata(valeur)).not.toThrow();
    expect(parseTranslatedMetadata(valeur)).toEqual({});
  });

  it('écarte les clés qui ne sont pas des balises de langue, et normalise les autres', () => {
    expect(parseTranslatedMetadata({ 'EN-GB': 'Squares', '': 'Vide', xyzt: 'Non', de: 'Plätze' })).toEqual({
      en: 'Squares',
      de: 'Plätze',
    });
  });
});

describe('matrice — ré-exécution', () => {
  it("n'écrit rien quand la carte persistée porte déjà tout", () => {
    expect(translatedMetadataUpdate(CINQ_TITRES, CINQ_TITRES)).toBeUndefined();
  });

  it("n'écrit rien quand les deux côtés sont vides", () => {
    expect(translatedMetadataUpdate(null, undefined)).toBeUndefined();
  });

  it("écrit dès qu'une langue manque ou change", () => {
    expect(translatedMetadataUpdate({ en: 'Ancien' }, { en: 'Nouveau' })).toEqual({ en: 'Nouveau' });
    expect(translatedMetadataUpdate({ en: 'Titre' }, { de: 'Titel' })).toEqual({
      en: 'Titre',
      de: 'Titel',
    });
  });

  it('une seconde approbation identique ne réécrit pas les métadonnées', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({
        id: 'tour-1',
        sessionId: 'session-1',
        languageAudioTypes: null,
        availableLanguages: [],
        translatedTitles: CINQ_TITRES,
      }),
    );
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      translatedTitles: CINQ_TITRES,
    });

    await approveTour('mod-1', {}, 'ok');

    expect(chargeDePublication()).not.toHaveProperty('translatedTitles');
  });
});

describe('publication refusée', () => {
  it('ne tente aucune écriture séparée des métadonnées quand la publication échoue', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      translatedTitles: CINQ_TITRES,
    });
    mockUpdateGuideTour.mockResolvedValue({ ok: false, error: 'Unauthorized' });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    // Une seule tentative, et elle portait tout : rien n'a pu atterrir à moitié.
    expect(mockUpdateGuideTour).toHaveBeenCalledTimes(1);
    expect(chargeDePublication()).toHaveProperty('translatedTitles');
  });
});

describe('adminSetTourStatus — le second chemin de publication', () => {
  const tourPublie = (extra: Record<string, unknown> = {}) =>
    tourRead({
      id: 'tour-1',
      sessionId: 'session-1',
      // La réactivation EXIGE une mention déjà portée pour la langue source.
      languageAudioTypes: { fr: 'tts' },
      availableLanguages: ['fr'],
      ...extra,
    });

  it('emporte les métadonnées traduites de la session, comme approveTour', async () => {
    mockGetGuideTourResult.mockResolvedValue(tourPublie());
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1', language: 'fr', version: 1,
      translatedTitles: CINQ_TITRES,
      translatedDescriptions: { en: 'Urban history.' },
    });

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(true);
    const charge = chargeDePublication();
    expect(charge.status).toBe('published');
    expect(charge.languageAudioTypes).toEqual({ fr: 'tts' });
    expect(charge.translatedTitles).toEqual(CINQ_TITRES);
    expect(charge.translatedDescriptions).toEqual({ en: 'Urban history.' });
  });

  it('fusionne au lieu de remplacer sur ce chemin aussi', async () => {
    mockGetGuideTourResult.mockResolvedValue(tourPublie({ translatedTitles: { de: 'Plätze und Tore' } }));
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1', language: 'fr', version: 1,
      translatedTitles: { en: 'Squares and Gates' },
    });

    await adminSetTourStatus('tour-1', 'published');

    expect(chargeDePublication().translatedTitles).toEqual({
      de: 'Plätze und Tore',
      en: 'Squares and Gates',
    });
  });

  it("n'écrit aucune clé quand rien de neuf n'est apporté", async () => {
    mockGetGuideTourResult.mockResolvedValue(tourPublie({ translatedTitles: CINQ_TITRES }));
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1', language: 'fr', version: 1, translatedTitles: CINQ_TITRES,
    });

    await adminSetTourStatus('tour-1', 'published');

    expect(chargeDePublication()).not.toHaveProperty('translatedTitles');
  });

  it("ne touche à aucune métadonnée lors d'un archivage", async () => {
    await adminSetTourStatus('tour-1', 'archived');

    const charge = chargeDePublication();
    expect(charge).toEqual({ status: 'archived' });
  });
});

describe('réparation des cartes déjà sales en base', () => {
  it('réécrit une carte persistée portant un titre blanc, pour la nettoyer', () => {
    // Comparer l'assaini à l'assaini aurait dit « inchangé » et laissé le blanc
    // en base indéfiniment.
    expect(translatedMetadataUpdate({ en: 'Titre', de: '  ' }, { en: 'Titre' })).toEqual({
      en: 'Titre',
    });
  });

  it('réécrit une carte persistée dont une clé est dénormalisée', () => {
    expect(translatedMetadataUpdate({ 'EN-GB': 'Titre' }, {})).toEqual({ en: 'Titre' });
  });

  it("n'écrit pas quand la carte persistée est déjà propre, même stockée en chaîne", () => {
    expect(translatedMetadataUpdate(JSON.stringify(CINQ_TITRES), CINQ_TITRES)).toBeUndefined();
  });
});

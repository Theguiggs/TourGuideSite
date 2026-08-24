/**
 * Contrat de publication de la mention de source audio (`GuideTour.languageAudioTypes`).
 *
 * Deux voies applicatives y mènent, et ce fichier les couvre toutes les deux :
 *  - `approveTour` — dérive la mention, la fait voyager dans la MÊME mutation que
 *    `status: 'published'`, vérifie le retour, et refuse plutôt que de deviner
 *    quand une lecture échoue ;
 *  - `adminSetTourStatus` — ne dérive rien, mais exige que la mention soit déjà
 *    portée pour la langue source avant de republier.
 *
 * Les fixtures reflètent ce qui circule réellement sur le fil : `languageAudioTypes`
 * est un champ AWSJSON, donc tantôt un objet côté lecture, tantôt une chaîne JSON.
 * Les deux formes sont exercées.
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
import * as appsyncModule from '../appsync-client';
import * as studioModule from '../studio';

const mockGetModerationItemById = appsyncModule.getModerationItemById as jest.Mock;
const mockGetGuideTourResult = appsyncModule.getGuideTourResult as jest.Mock;
const mockListScenesBySession = appsyncModule.listStudioScenesBySession as jest.Mock;
const mockUpdateModerationItem = appsyncModule.updateModerationItemMutation as jest.Mock;
const mockUpdateGuideTour = appsyncModule.updateGuideTourMutation as jest.Mock;
const mockUpdateStudioSession = appsyncModule.updateStudioSessionMutation as jest.Mock;
const mockGetStudioSession = studioModule.getStudioSession as jest.Mock;

/** Raccourci : les scènes lues via le Result de `listStudioScenesBySession`. */
const scenesRead = (scenes: unknown[]) => ({ ok: true, data: scenes });
const tourRead = (tour: Record<string, unknown> | null) => ({ ok: true, data: tour });

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
});

afterAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetModerationItemById.mockResolvedValue({
    id: 'mod-1',
    tourId: 'tour-1',
    sessionId: 'session-1',
  });
  mockUpdateModerationItem.mockResolvedValue({ ok: true });
  mockUpdateGuideTour.mockResolvedValue({ ok: true });
  mockUpdateStudioSession.mockResolvedValue({ ok: true });
  mockGetStudioSession.mockResolvedValue({ id: 'session-1', language: 'fr', version: 1 });
  mockGetGuideTourResult.mockResolvedValue(
    tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: null, availableLanguages: [] }),
  );
  mockListScenesBySession.mockResolvedValue(scenesRead([]));
});

describe('approveTour — dérivation de la mention', () => {
  it('déclare "tts" quand toutes les scènes portent le marqueur de synthèse', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        { id: 'scene-1', archived: false, baseAudioSource: 'tts', studioAudioKey: null, originalAudioKey: null },
        { id: 'scene-2', archived: false, baseAudioSource: 'tts', studioAudioKey: null, originalAudioKey: null },
      ]),
    );

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ languageAudioTypes: { fr: 'tts' }, availableLanguages: ['fr'] }),
    );
  });

  it('fusionne au lieu d écraser les traductions déjà approuvées', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: { en: 'recording' }, availableLanguages: ['en'] }),
    );
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        { id: 'scene-1', archived: false, baseAudioSource: 'recording', studioAudioKey: null, originalAudioKey: null },
      ]),
    );

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        languageAudioTypes: { en: 'recording', fr: 'recording' },
        availableLanguages: expect.arrayContaining(['fr', 'en']),
      }),
    );
  });

  it('retombe sur l heuristique de clé pour les scènes antérieures au marqueur', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        { id: 'scene-1', archived: false, baseAudioSource: null, studioAudioKey: 'audio/tts-scene-1.wav', originalAudioKey: null },
      ]),
    );

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ languageAudioTypes: { fr: 'tts' } }),
    );
  });

  it('déclare "mixed" quand les scènes mêlent synthèse et voix humaine', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        { id: 'scene-1', archived: false, baseAudioSource: 'tts', studioAudioKey: null, originalAudioKey: null },
        { id: 'scene-2', archived: false, baseAudioSource: 'recording', studioAudioKey: null, originalAudioKey: null },
      ]),
    );

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ status: 'published', languageAudioTypes: { fr: 'mixed' } }),
    );
  });

  it('ne laisse pas une scène encore vide faire basculer une visite humaine en "mixed"', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        { id: 'scene-1', archived: false, baseAudioSource: 'recording', studioAudioKey: null, originalAudioKey: null },
        { id: 'scene-2', archived: false, baseAudioSource: 'recording', studioAudioKey: null, originalAudioKey: null },
        { id: 'scene-3', archived: false, baseAudioSource: null, studioAudioKey: null, originalAudioKey: null },
      ]),
    );

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ languageAudioTypes: { fr: 'recording' } }),
    );
  });

  it('déclare "tts" quand aucune scène ne porte de preuve de source', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        { id: 'scene-1', archived: false, baseAudioSource: null, studioAudioKey: null, originalAudioKey: null },
        { id: 'scene-2', archived: false, baseAudioSource: null, studioAudioKey: 'scene-2_1750000000000.wav', originalAudioKey: null },
      ]),
    );

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ status: 'published', languageAudioTypes: { fr: 'tts' } }),
    );
  });

  it('normalise la langue source lue sur la session', async () => {
    mockGetStudioSession.mockResolvedValue({ id: 'session-1', language: 'FR-fr', version: 1 });
    mockListScenesBySession.mockResolvedValue(
      scenesRead([{ id: 'scene-1', archived: false, baseAudioSource: 'tts' }]),
    );

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ languageAudioTypes: { fr: 'tts' } }),
    );
  });

  it('retombe sur "fr" plutôt que sur la clé vide quand la session ne porte pas de langue', async () => {
    mockGetStudioSession.mockResolvedValue({ id: 'session-1', language: '   ', version: 1 });
    mockListScenesBySession.mockResolvedValue(
      scenesRead([{ id: 'scene-1', archived: false, baseAudioSource: 'tts' }]),
    );

    await approveTour('mod-1', {}, 'ok');

    const written = mockUpdateGuideTour.mock.calls[0][1].languageAudioTypes;
    expect(written).toEqual({ fr: 'tts' });
    expect(Object.keys(written)).not.toContain('');
  });

  it('n écrase pas availableLanguages quand la valeur lue n est pas exploitable', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: null, availableLanguages: null }),
    );

    await approveTour('mod-1', {}, 'ok');

    const written = mockUpdateGuideTour.mock.calls[0][1];
    expect(written).not.toHaveProperty('availableLanguages');
    expect(written.languageAudioTypes).toEqual({ fr: 'tts' });
  });
});

describe('approveTour — la mention conditionne la publication', () => {
  it('publie et déclare dans la MÊME mutation : status et mention voyagent ensemble', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([{ id: 'scene-1', archived: false, baseAudioSource: 'tts' }]),
    );

    await approveTour('mod-1', {}, 'ok');

    const publishCall = mockUpdateGuideTour.mock.calls.find((c) => c[1]?.status === 'published');
    expect(publishCall).toBeDefined();
    expect(publishCall![1]).toEqual(
      expect.objectContaining({ status: 'published', languageAudioTypes: { fr: 'tts' } }),
    );
    // Plus aucune écriture de mention détachée de la publication.
    const disclosureOnly = mockUpdateGuideTour.mock.calls.filter(
      (c) => c[1]?.languageAudioTypes !== undefined && c[1]?.status !== 'published',
    );
    expect(disclosureOnly).toHaveLength(0);
  });

  it('accorde la publication avec "tts" quand le ModerationItem n a pas de sessionId', async () => {
    // resolveModerationItem auto-crée des items sans sessionId : les scènes sont
    // inatteignables — cas « sans preuve », pas une panne de lecture.
    mockGetModerationItemById.mockResolvedValue({ id: 'mod-1', tourId: 'tour-1', sessionId: null });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    expect(mockListScenesBySession).not.toHaveBeenCalled();
    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ status: 'published', languageAudioTypes: { fr: 'tts' } }),
    );
  });

  it('laisse la Visite non publiée ET l item en file quand le serveur refuse l écriture', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([{ id: 'scene-1', archived: false, baseAudioSource: 'tts' }]),
    );
    mockUpdateGuideTour.mockResolvedValue({ ok: false, error: 'Mise à jour refusée : Unauthorized' });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2901');
    expect(result.error).toContain('Unauthorized');
    // Rien d autre n a bougé : sans cela l item quitterait la file de modération
    // alors que la Visite reste non publiée, et le recours disparaîtrait.
    expect(mockUpdateModerationItem).not.toHaveBeenCalled();
    expect(mockUpdateStudioSession).not.toHaveBeenCalled();
  });

  it('refuse la publication quand la lecture du parcours échoue (invérifiable, 2902)', async () => {
    mockGetGuideTourResult.mockResolvedValue({ ok: false, error: 'network down' });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2902');
    expect(mockUpdateGuideTour).not.toHaveBeenCalled();
    expect(mockUpdateModerationItem).not.toHaveBeenCalled();
  });

  it('distingue la Visite inexistante (2903) de la lecture en échec', async () => {
    mockGetGuideTourResult.mockResolvedValue(tourRead(null));

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2903');
    expect(mockUpdateGuideTour).not.toHaveBeenCalled();
  });

  it('refuse plutôt que de déclarer "tts" quand la lecture des scènes échoue', async () => {
    // `listStudioScenes` rend `[]` aussi bien pour « aucune scène » que pour une
    // lecture ratée : publier une visite humaine en « voix de synthèse » sur une
    // panne serait un mensonge sans correction ultérieure possible.
    mockListScenesBySession.mockResolvedValue({ ok: false, error: 'Erreur lors du chargement des scènes' });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2902');
    expect(mockUpdateGuideTour).not.toHaveBeenCalled();
  });

  it('conserve les mentions des autres langues, y compris depuis une chaîne AWSJSON', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({
        id: 'tour-1',
        sessionId: 'session-1',
        languageAudioTypes: JSON.stringify({ en: 'recording', nl: 'tts' }),
        availableLanguages: ['en', 'nl'],
      }),
    );
    mockListScenesBySession.mockResolvedValue(
      scenesRead([{ id: 'scene-1', archived: false, baseAudioSource: 'tts' }]),
    );

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        languageAudioTypes: { en: 'recording', nl: 'tts', fr: 'tts' },
        availableLanguages: expect.arrayContaining(['fr', 'en', 'nl']),
      }),
    );
  });
});

describe('adminSetTourStatus — le chemin admin exige la mention', () => {
  it('refuse "published" quand la mention ne couvre pas la langue source (2900)', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: null }),
    );

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2900');
    expect(mockUpdateGuideTour).not.toHaveBeenCalled();
  });

  it('refuse "published" quand la mention ne porte que d autres langues', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: { en: 'tts' } }),
    );

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2900');
  });

  it('accorde "published" quand la mention couvre la langue source et la réécrit', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: { fr: 'mixed', en: 'tts' } }),
    );

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(true);
    expect(mockUpdateGuideTour).toHaveBeenCalledWith('tour-1', {
      status: 'published',
      languageAudioTypes: { fr: 'mixed', en: 'tts' },
    });
  });

  it('accepte une mention stockée en chaîne AWSJSON et la réécrit telle quelle', async () => {
    // C est la forme qui circule réellement sur le fil depuis que
    // `serializeJsonFields` couvre `languageAudioTypes`.
    const stored = JSON.stringify({ fr: 'tts', en: 'recording' });
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: stored }),
    );

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(true);
    expect(mockUpdateGuideTour).toHaveBeenCalledWith('tour-1', {
      status: 'published',
      languageAudioTypes: stored,
    });
  });

  it('réécrit la valeur BRUTE : une entrée hors domaine survit à la réactivation', async () => {
    // `parseLanguageAudioTypes` élaguerait `en:'human'` ; le chemin admin ne
    // redérive rien et ne doit donc rien perdre.
    const legacy = { fr: 'tts', en: 'human' };
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: legacy }),
    );

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(true);
    expect(mockUpdateGuideTour).toHaveBeenCalledWith('tour-1', {
      status: 'published',
      languageAudioTypes: legacy,
    });
  });

  it('reconnaît une clé de mention héritée en majuscules', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: { FR: 'tts' } }),
    );

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(true);
  });

  it('refuse "published" sur lecture en échec (2902) et sur Visite inexistante (2903)', async () => {
    mockGetGuideTourResult.mockResolvedValue({ ok: false, error: 'network down' });
    const unreadable = await adminSetTourStatus('tour-1', 'published');
    expect(unreadable.ok).toBe(false);
    expect(unreadable.error).toContain('2902');

    mockGetGuideTourResult.mockResolvedValue(tourRead(null));
    const missing = await adminSetTourStatus('tour-1', 'published');
    expect(missing.ok).toBe(false);
    expect(missing.error).toContain('2903');

    expect(mockUpdateGuideTour).not.toHaveBeenCalled();
  });

  it('n impose rien à "archived"', async () => {
    const result = await adminSetTourStatus('tour-1', 'archived');

    expect(result.ok).toBe(true);
    expect(mockGetGuideTourResult).not.toHaveBeenCalled();
    expect(mockUpdateGuideTour).toHaveBeenCalledWith('tour-1', { status: 'archived' });
  });

  it('remonte un refus serveur en 2901', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({ id: 'tour-1', sessionId: 'session-1', languageAudioTypes: { fr: 'tts' } }),
    );
    mockUpdateGuideTour.mockResolvedValue({ ok: false, error: 'Unauthorized' });

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2901');
  });
});

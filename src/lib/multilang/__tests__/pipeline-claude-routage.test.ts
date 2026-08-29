/**
 * Story 4 — le troisième chemin de traduction est EXPLICITE et ASYNCHRONE.
 *
 * Le routage était déduit par défaut : « si marianmt, microservice ; sinon,
 * AppSync ». Un nom de moteur nouveau y basculait donc tout son trafic sur
 * AppSync sans que personne l'ait écrit. Ce fichier fige l'inverse — chaque
 * moteur a sa branche, le moteur de langue se demande par son nom, et aucun
 * palier ne l'active tout seul.
 *
 * Il fige aussi le TRANSPORT : la mutation rend un `jobId` sans attendre, et
 * `getTranslationStatus` sonde `checkTranslation`. Une opération synchrone
 * aurait été coupée à 30 s par AppSync sur la Scène de 7 308 caractères, et le
 * lot l'aurait réessayée — appel facturé deux fois.
 *
 * Et ce qui distingue ce chemin des deux autres : la Scène part ENTIÈRE,
 * balisage compris, sans découpage en phrases ni extraction de balises, et le
 * contexte de Visite voyage avec elle.
 */

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => false,
  shouldUseRealApi: () => true,
}));

jest.mock('@/lib/logger', () => ({
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

const mockMutationRequestTranslation = jest.fn();
const mockQueryCheckTranslation = jest.fn();

jest.mock('@/lib/api/appsync-client', () => ({
  getClient: () => ({
    mutations: {
      requestTranslation: (...args: unknown[]) => mockMutationRequestTranslation(...args),
    },
    queries: {
      checkTranslation: (...args: unknown[]) => mockQueryCheckTranslation(...args),
    },
  }),
}));

import {
  classerEchecAppsync,
  getTranslationStatus,
  providerForJob,
  requestTranslation,
  __resetTranslationStubs,
} from '@/lib/api/translation';
import {
  getProviderForRequest,
  getProviderForTier,
  isLanguageInScope,
  isLlmPairSupported,
  LLM_PROVIDER,
} from '../provider-router';

const SCENE_FR = [
  'Arrête-toi sur la place Sainte-Cécile.',
  '',
  '<break time="3s"/>',
  '',
  'Devant toi, la cathédrale.',
  '',
  '<break time="2s"/>',
  '',
  'Regarde-la vraiment.',
].join('\n');

const OPTIONS_LLM = {engine: 'llm' as const, sceneId: 'scene-1'};

function accuse(surcharge: Record<string, unknown> = {}) {
  return {
    data: {
      jobId: 'claude-abc',
      status: 'processing',
      translatedText: null,
      provider: LLM_PROVIDER,
      costProvider: null,
      costCharged: null,
      ...surcharge,
    },
  };
}

/** Les arguments du dernier appel à la mutation. */
function dernierArgument(): Record<string, unknown> {
  const appels = mockMutationRequestTranslation.mock.calls;
  return appels[appels.length - 1][0] as Record<string, unknown>;
}

beforeEach(() => {
  __resetTranslationStubs();
  mockMutationRequestTranslation.mockReset();
  mockQueryCheckTranslation.mockReset();
  global.fetch = jest.fn(async () => {
    throw new Error('aucun appel réseau ne doit sortir de cette suite');
  }) as unknown as typeof fetch;
});

// --- Le routeur -------------------------------------------------------------

describe('provider-router — le moteur de langue s’ajoute, il ne remplace pas', () => {
  it('laisse les paliers existants intacts', () => {
    expect(getProviderForTier('standard')).toBe('marianmt');
    expect(getProviderForTier('pro')).toBe('deepl');
    expect(getProviderForRequest('standard')).toBe('marianmt');
    expect(getProviderForRequest('pro')).toBe('deepl');
    expect(getProviderForRequest('standard', 'tier')).toBe('marianmt');
    expect(getProviderForRequest('pro', 'tier')).toBe('deepl');
  });

  it('ne rend le moteur de langue que s’il est demandé', () => {
    expect(getProviderForRequest('standard', 'llm')).toBe(LLM_PROVIDER);
    expect(getProviderForRequest('pro', 'llm')).toBe(LLM_PROVIDER);
    expect(LLM_PROVIDER).toBe('claude');
  });

  it('borne les paires au français source et aux cinq cibles du corpus', () => {
    expect(isLlmPairSupported('fr', 'de')).toBe(true);
    expect(isLlmPairSupported('fr', 'it')).toBe(true);
    expect(isLlmPairSupported('fr', 'nl')).toBe(true);
    expect(isLlmPairSupported('fr', 'ja')).toBe(false);
    // Une source anglaise serait le pivot que CAP-5 interdit.
    expect(isLlmPairSupported('en', 'it')).toBe(false);
    expect(isLlmPairSupported('fr', 'fr')).toBe(false);
  });

  it('distingue le périmètre de FABRICATION du périmètre de VENTE', () => {
    // Le néerlandais est traduisible et pas encore vendable. Les deux listes
    // sont distinctes, et le tarificateur refuse plutôt que d'inventer un prix.
    expect(isLlmPairSupported('fr', 'nl')).toBe(true);
    expect(isLanguageInScope('nl')).toBe(false);
    expect(isLanguageInScope('en')).toBe(true);
    expect(isLanguageInScope('ja')).toBe(true);
  });
});

// --- Le troisième chemin ----------------------------------------------------

describe('requestTranslation — troisième chemin', () => {
  it('envoie la Scène ENTIÈRE, balisage compris, en un seul appel', async () => {
    mockMutationRequestTranslation.mockResolvedValueOnce(accuse());

    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro', OPTIONS_LLM);

    expect(mockMutationRequestTranslation).toHaveBeenCalledTimes(1);
    // Aucun découpage en phrases, aucune extraction de balise : le texte
    // transmis est le texte source, au caractère près.
    expect(dernierArgument().text).toBe(SCENE_FR);
    expect(r.provider).toBe(LLM_PROVIDER);
  });

  it('rend un jobId sans attendre : le transport est asynchrone', async () => {
    mockMutationRequestTranslation.mockResolvedValueOnce(accuse());
    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro', OPTIONS_LLM);

    expect(r.status).toBe('processing');
    expect(r.jobId).toBe('claude-abc');
    expect(r.translatedText).toBeNull();
    // Le moteur réel est retenu pour ce job : une expiration de sondage ne
    // pourra plus inventer « marianmt ».
    expect(providerForJob('claude-abc')).toBe(LLM_PROVIDER);
  });

  it('nomme le moteur ET la Scène qui autorise la dépense', async () => {
    mockMutationRequestTranslation.mockResolvedValueOnce(accuse());
    await requestTranslation('seg-1', SCENE_FR, 'fr', 'it', 'standard', OPTIONS_LLM);

    expect(dernierArgument().provider).toBe(LLM_PROVIDER);
    expect(dernierArgument().sceneId).toBe('scene-1');
    expect(dernierArgument().sourceLang).toBe('fr');
    expect(dernierArgument().targetLang).toBe('it');
    expect(dernierArgument().kind).toBe('scene');
  });

  it('refuse sans sceneId — la propriété autorise la dépense', async () => {
    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro', {engine: 'llm'});
    expect(mockMutationRequestTranslation).not.toHaveBeenCalled();
    expect(r.status).toBe('failed');
    expect(r.errorCode).toBe(2624);
  });

  it('fait voyager le contexte de Visite avec la Scène', async () => {
    mockMutationRequestTranslation.mockResolvedValueOnce(accuse());
    await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro', {
      ...OPTIONS_LLM,
      context: {
        tourTitle: 'Albi — La forteresse de brique rouge',
        city: 'Albi',
        sceneTitle: 'Place Sainte-Cécile',
        sceneIndex: 3,
        sceneCount: 7,
      },
    });

    expect(dernierArgument()).toMatchObject({
      tourTitle: 'Albi — La forteresse de brique rouge',
      city: 'Albi',
      sceneTitle: 'Place Sainte-Cécile',
      sceneIndex: 3,
      sceneCount: 7,
    });
  });

  it('rend une traduction déjà livrée sans repasser par le sondage', async () => {
    mockMutationRequestTranslation.mockResolvedValueOnce(
      accuse({status: 'completed', translatedText: 'Halt an.', costProvider: 2, costCharged: 6}),
    );
    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro', OPTIONS_LLM);

    expect(r).toEqual({
      jobId: 'claude-abc',
      status: 'completed',
      translatedText: 'Halt an.',
      provider: LLM_PROVIDER,
      costProvider: 2,
      costCharged: 6,
    });
    // Terminal : rien à suivre.
    expect(providerForJob('claude-abc')).toBeNull();
  });

  it('remonte le code d’erreur du serveur tel quel', async () => {
    mockMutationRequestTranslation.mockResolvedValueOnce(
      accuse({status: 'failed', errorCode: 2609}),
    );
    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro', OPTIONS_LLM);
    expect(r.status).toBe('failed');
    expect(r.errorCode).toBe(2609);
  });

  it('refuse une paire hors périmètre AVANT tout appel', async () => {
    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'ja', 'pro', OPTIONS_LLM);
    expect(mockMutationRequestTranslation).not.toHaveBeenCalled();
    expect(r.errorCode).toBe(2406);
    expect(r.provider).toBe(LLM_PROVIDER);
  });
});

// --- Le sondage -------------------------------------------------------------

describe('getTranslationStatus — la moitié « query » du transport', () => {
  async function demanderPuisSonder() {
    mockMutationRequestTranslation.mockResolvedValueOnce(accuse());
    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro', OPTIONS_LLM);
    return getTranslationStatus(r.jobId);
  }

  it('rend la traduction quand l’ouvrier a conclu', async () => {
    mockQueryCheckTranslation.mockResolvedValueOnce({
      data: {
        jobId: 'claude-abc',
        status: 'completed',
        translatedText: 'Halt an.',
        provider: LLM_PROVIDER,
        costProvider: 2,
        costCharged: 6,
      },
    });
    const r = await demanderPuisSonder();
    expect(r).toMatchObject({status: 'completed', translatedText: 'Halt an.', costProvider: 2});
    expect(mockQueryCheckTranslation).toHaveBeenCalledWith(
      {jobId: 'claude-abc'},
      expect.objectContaining({authMode: 'userPool'}),
    );
  });

  it('continue à sonder tant que l’ouvrier travaille', async () => {
    mockQueryCheckTranslation.mockResolvedValueOnce({
      data: {jobId: 'claude-abc', status: 'processing', provider: LLM_PROVIDER},
    });
    const r = await demanderPuisSonder();
    expect(r?.status).toBe('processing');
  });

  it('porte le VRAI moteur, jamais une étiquette par défaut', async () => {
    mockQueryCheckTranslation.mockResolvedValueOnce({data: null, errors: []});
    const r = await demanderPuisSonder();
    expect(r?.provider).toBe(LLM_PROVIDER);
  });
});

// --- Classement des échecs AppSync ------------------------------------------

describe('classerEchecAppsync — « réessayez » n’est pas la réponse à tout', () => {
  it('traite une charge nulle SANS erreur comme transitoire', () => {
    expect(classerEchecAppsync(undefined)).toBe(2609);
    expect(classerEchecAppsync([])).toBe(2609);
  });

  it('nomme une autorisation refusée pour ce qu’elle est', () => {
    // 2404 disait « fournisseur indisponible » — donc « réessayez » — pour un
    // refus d autorisation. 2624 existe pour ça, et le guide qui lit l écran
    // doit savoir que réessayer ne servira à rien.
    expect(classerEchecAppsync([{errorType: 'Unauthorized', message: 'Not Authorized'}])).toBe(2624);
  });

  it('n attrape pas trois chiffres au hasard pour un code HTTP', () => {
    // /5\d\d/ non ancré attrapait « 500 caractères » et n importe quel
    // fragment d identifiant.
    expect(classerEchecAppsync([{message: 'Le texte fait 500 caracteres de trop'}])).toBe(2401);
    expect(classerEchecAppsync([{message: 'HTTP 503'}])).toBe(2609);
  });

  it('ne fait PAS réessayer une erreur de validation GraphQL', () => {
    expect(
      classerEchecAppsync([{message: "Validation error: unknown field 'sceneName'"}]),
    ).toBe(2401);
  });

  it('fait réessayer une limitation ou une panne serveur', () => {
    expect(classerEchecAppsync([{message: 'Request throttled'}])).toBe(2609);
    expect(classerEchecAppsync([{errorType: 'InternalFailure', message: 'boom'}])).toBe(2609);
  });
});

// --- Les deux autres chemins n’ont pas bougé --------------------------------

describe('Les chemins existants', () => {
  it('le palier pro reste sur deepl et appelle la mutation, qui existe désormais', async () => {
    mockMutationRequestTranslation.mockResolvedValueOnce({
      data: {
        jobId: '',
        status: 'failed',
        translatedText: null,
        provider: 'deepl',
        costProvider: null,
        costCharged: null,
        errorCode: 2404,
      },
    });

    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'pro');

    expect(r.provider).toBe('deepl');
    expect(mockMutationRequestTranslation).toHaveBeenCalledTimes(1);
    // Le contrat est complet — plus d'échec silencieux sur une opération
    // absente de l'API.
    expect(r).toMatchObject({
      jobId: '',
      status: 'failed',
      translatedText: null,
      costProvider: null,
      costCharged: null,
      errorCode: 2404,
    });
  });

  it('le palier standard ne touche jamais AppSync', async () => {
    global.fetch = jest.fn(async () => ({
      status: 202,
      ok: true,
      headers: {get: () => null},
      json: async () => ({ok: true, job_id: 'job-1', status: 'queued'}),
    })) as unknown as typeof fetch;

    const r = await requestTranslation('seg-1', SCENE_FR, 'fr', 'de', 'standard');

    expect(r.provider).toBe('marianmt');
    expect(mockMutationRequestTranslation).not.toHaveBeenCalled();
  });
});

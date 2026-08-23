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

import { getGuideTourById, getGuideTourResult, updateGuideTourMutation } from '../appsync-client';
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

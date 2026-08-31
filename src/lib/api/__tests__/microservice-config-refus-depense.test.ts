/** @jest-environment node */

jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(() =>
    Promise.resolve({ tokens: { accessToken: { toString: () => 'jeton' } } }),
  ),
}));

import { submitMicroserviceJob } from '../microservice-config';
import { ENTETE_REFUS_DEPENSE } from '../spend-refusal';

function refus429(marque: boolean): Response {
  return new Response(JSON.stringify({ ok: false, motif: 'enveloppe-interne-epuisee' }), {
    status: 429,
    headers: marque
      ? { [ENTETE_REFUS_DEPENSE]: 'enveloppe-interne-epuisee' }
      : { 'Retry-After': '1' },
  });
}

describe('submitMicroserviceJob face à un refus de dépense', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  // UN PLAFOND N'EST PAS UNE FILE D'ATTENTE : la contre-pression du microservice
  // se vide, une enveloppe épuisée non. Réessayer coûterait vingt secondes et
  // cinq débits refusés pour aboutir au même refus.
  it('ne réessaie PAS un 429 marqué « refus de dépense »', async () => {
    global.fetch = jest.fn().mockResolvedValue(refus429(true));

    const response = await submitMicroserviceJob('/v1/tts/generate', { text: 'Bonjour' });

    expect(response.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('réessaie toujours un 429 de contre-pression, qui lui se vide', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(refus429(false))
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, job_id: 'j-1' }), { status: 202 }));
    global.fetch = fetchMock;

    // Le repli attend `Retry-After` (ici 1 s) avant la SECONDE tentative.
    const response = await submitMicroserviceJob('/v1/tts/generate', { text: 'Bonjour' });

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 20_000);
});

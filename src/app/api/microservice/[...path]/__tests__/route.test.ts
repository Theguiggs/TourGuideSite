/** @jest-environment node */

import { NextRequest } from 'next/server';

const mockRequireServerRole = jest.fn();

jest.mock('@/lib/auth/server-token', () => {
  class MockServerAuthError extends Error {
    constructor(
      readonly status: 401 | 403,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    requireServerRole: (...args: unknown[]) => mockRequireServerRole(...args),
    ServerAuthError: MockServerAuthError,
  };
});

const mockDebiter = jest.fn();
const mockMesurer = jest.fn();

jest.mock('@/lib/api/internal-spend', () => ({
  ENTETE_REFUS_DEPENSE: 'x-murmure-refus-depense',
  debiterSyntheseInterne: (...args: unknown[]) => mockDebiter(...args),
  mesurerCorpsDeSynthese: (...args: unknown[]) => mockMesurer(...args),
}));

import { ServerAuthError } from '@/lib/auth/server-token';
import { GET, POST } from '../route';

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('/api/microservice proxy', () => {
  const originalApiKey = process.env.MICROSERVICE_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MICROSERVICE_API_KEY = 'server-secret';
    mockRequireServerRole.mockResolvedValue({
      payload: { sub: 'guide-1' },
      roles: ['guide'],
    });
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, job_id: 'tts-abc' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      }),
    );
    mockMesurer.mockReturnValue({ ok: true, caracteres: 7, langue: 'fr' });
    mockDebiter.mockResolvedValue({ relayer: true, debitId: 'd-1', microsDebites: 112 });
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.MICROSERVICE_API_KEY;
    else process.env.MICROSERVICE_API_KEY = originalApiKey;
  });

  it('rejects a missing token before calling upstream', async () => {
    mockRequireServerRole.mockRejectedValue(new ServerAuthError(401, 'Unauthorized'));
    const response = await GET(
      new NextRequest('http://localhost/api/microservice/health'),
      context(['health']),
    );

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a forged token before calling upstream', async () => {
    mockRequireServerRole.mockRejectedValue(new ServerAuthError(401, 'Unauthorized'));
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: { Authorization: 'Bearer forged', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Bonjour', language: 'fr' }),
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an authenticated tourist before calling upstream', async () => {
    mockRequireServerRole.mockRejectedValue(new ServerAuthError(403, 'Forbidden'));
    const response = await GET(
      new NextRequest('http://localhost/api/microservice/health', {
        headers: { Authorization: 'Bearer tourist-token' },
      }),
      context(['health']),
    );

    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses an exact allowlist', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate-evil', {
        method: 'POST',
        body: '{}',
      }),
      context(['v1', 'tts', 'generate-evil']),
    );

    expect(response.status).toBe(403);
    expect(mockRequireServerRole).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a declared oversized body before reading or forwarding it', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid',
          'Content-Type': 'application/json',
          'Content-Length': '1000001',
        },
        body: '{}',
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('stops reading an oversized streamed body without Content-Length', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid',
          'Content-Type': 'application/json',
        },
        body: 'x'.repeat(1_000_001),
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards an authorized request with only the server API key upstream', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Bonjour', language: 'fr' }),
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(202);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/tts/generate',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'server-secret',
        },
      }),
    );
    const upstreamInit = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(upstreamInit.headers).not.toHaveProperty('Authorization');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('fails closed when the server API key contains only whitespace', async () => {
    process.env.MICROSERVICE_API_KEY = '   ';

    const response = await GET(
      new NextRequest('http://localhost/api/microservice/health', {
        headers: { Authorization: 'Bearer valid-user-token' },
      }),
      context(['health']),
    );

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  // =========================================================================
  // STORY 16, TÂCHE 5 — DÉBITER D'ABORD, RELAYER ENSUITE
  //
  // AD-16 §2 : « un appel qui n'a pas débité ne part pas », panne comprise.
  // =========================================================================

  const corpsSynthese = JSON.stringify({ text: 'Bonjour', language: 'fr' });

  const posterSynthese = (corps: string = corpsSynthese) =>
    POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer jeton-de-guide',
          'Content-Type': 'application/json',
        },
        body: corps,
      }),
      context(['v1', 'tts', 'generate']),
    );

  it('plafond atteint : ne relaie pas, et rend 429 nommé', async () => {
    mockDebiter.mockResolvedValue({
      relayer: false,
      status: 429,
      motif: 'enveloppe-interne-epuisee',
      code: 2823,
      message: 'Internal spend envelope exhausted — synthesis refused, nothing was sent.',
    });

    const response = await posterSynthese();

    expect(response.status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
    // NOMMÉE, pas opaque : le Studio doit lire la cause, pas deviner.
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, motif: 'enveloppe-interne-epuisee', code: 2823 });
    expect(body.error).toMatch(/envelope exhausted/i);
    expect(response.headers.get('x-murmure-refus-depense')).toBe('enveloppe-interne-epuisee');
  });

  it('quota horaire du compte atteint : ne relaie pas, et rend 429 nommé', async () => {
    mockDebiter.mockResolvedValue({
      relayer: false,
      status: 429,
      motif: 'quota-horaire-compte',
      code: 2814,
      message:
        'Hourly synthesis quota reached for this account — synthesis refused, nothing was sent.',
    });

    const response = await posterSynthese();

    expect(response.status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, motif: 'quota-horaire-compte', code: 2814 });
    expect(body.error).toMatch(/hourly/i);
    // LE MARQUEUR TERMINAL : sans lui, `submitMicroserviceJob` réessaierait cinq
    // fois un plafond qui ne se vide pas avant l'heure suivante.
    expect(response.headers.get('x-murmure-refus-depense')).toBe('quota-horaire-compte');
  });

  it('ok: true : relaie, et le corps relayé est INCHANGÉ', async () => {
    // INDENTÉ ET ACCENTUÉ À DESSEIN : une comparaison sémantique passerait sur
    // un corps re-sérialisé ; celle-ci exige les MÊMES OCTETS.
    const corps = JSON.stringify({ text: 'Été à Biarritz — 3 €', language: 'fr' }, null, 2);
    mockMesurer.mockReturnValue({ ok: true, caracteres: 20, langue: 'fr' });

    const response = await posterSynthese(corps);

    expect(response.status).toBe(202);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(Buffer.from(init.body as Buffer).toString('utf8')).toBe(corps);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('server-secret');
  });

  it('panne du registre : ne relaie pas', async () => {
    mockDebiter.mockResolvedValue({
      relayer: false,
      status: 503,
      motif: 'registre-en-panne',
      message: 'Spend ledger unreachable — synthesis refused rather than relayed uncounted.',
    });

    const response = await posterSynthese();

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.headers.get('x-murmure-refus-depense')).toBe('registre-en-panne');
  });

  // ORDRE DE DÉPLOIEMENT : le portail se déploie à la fusion, le backend à la
  // main. Entre les deux la mutation n'existe pas. Choix assumé : échec FERMÉ.
  it('mutation absente du schéma : ne relaie pas, et le refus nomme son remède', async () => {
    mockDebiter.mockResolvedValue({
      relayer: false,
      status: 503,
      motif: 'registre-non-deploye',
      message:
        'Spend ledger not deployed: deploy the backend, re-copy amplify_outputs.json, then retry.',
    });

    const response = await posterSynthese();

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.headers.get('x-murmure-refus-depense')).toBe('registre-non-deploye');
    expect((await response.json()).error).toMatch(/amplify_outputs\.json/);
  });

  it('corps sans texte mesurable : ne relaie pas', async () => {
    mockMesurer.mockReturnValue({ ok: false, motif: 'corps-non-mesurable' });

    const response = await posterSynthese('{"language":"fr"}');

    expect(response.status).toBe(400);
    expect(mockDebiter).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('débite sur text.length, passe la langue telle quelle, et trace le compte', async () => {
    mockRequireServerRole.mockResolvedValue({
      payload: { sub: 'sub-du-guide' },
      roles: ['guide'],
    });
    mockMesurer.mockReturnValue({ ok: true, caracteres: 7, langue: 'de-DE' });

    await posterSynthese();

    expect(mockDebiter).toHaveBeenCalledWith({
      jetonAcces: 'jeton-de-guide',
      caracteres: 7,
      langue: 'de-DE',
      reference: 'sub-du-guide',
    });
  });

  it('ne débite QUE la synthèse — traduction, silence et sondes restent gratuites', async () => {
    for (const chemin of [
      ['v1', 'translate', 'marianmt'],
      ['v1', 'translate', 'batch'],
      ['v1', 'silence-detect'],
    ]) {
      await POST(
        new NextRequest(`http://localhost/api/microservice/${chemin.join('/')}`, {
          method: 'POST',
          headers: { Authorization: 'Bearer jeton', 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Bonjour', language: 'fr' }),
        }),
        context(chemin),
      );
    }
    await GET(
      new NextRequest('http://localhost/api/microservice/v1/jobs/abc-123', {
        headers: { Authorization: 'Bearer jeton' },
      }),
      context(['v1', 'jobs', 'abc-123']),
    );

    expect(mockDebiter).not.toHaveBeenCalled();
    expect(mockMesurer).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});

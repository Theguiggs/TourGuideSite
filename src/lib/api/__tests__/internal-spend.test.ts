/** @jest-environment node */

import {
  CODES_DEPENSE,
  debiterSyntheseInterne,
  mesurerCorpsDeSynthese,
} from '../internal-spend';

const encoder = new TextEncoder();

function reponseGraphQL(charge: unknown, status = 200): Response {
  return new Response(JSON.stringify(charge), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function debit(charge: unknown) {
  return reponseGraphQL({ data: { debitInternalSpend: charge } });
}

describe('mesurerCorpsDeSynthese', () => {
  it('mesure text.length, et rien d’autre', () => {
    const corps = encoder.encode(JSON.stringify({ text: 'Bonjour Biarritz', language: 'fr' }));
    expect(mesurerCorpsDeSynthese(corps)).toEqual({
      ok: true,
      caracteres: 16,
      langue: 'fr',
    });
  });

  it('compte les caractères, pas les octets — un accent ne coûte pas deux', () => {
    const corps = encoder.encode(JSON.stringify({ text: 'éàü', language: 'fr' }));
    expect(corps.byteLength).toBeGreaterThan(JSON.stringify({ text: 'eau', language: 'fr' }).length);
    const mesure = mesurerCorpsDeSynthese(corps);
    expect(mesure).toMatchObject({ ok: true, caracteres: 3 });
  });

  it('n’invente JAMAIS une langue quand le corps n’en porte pas', () => {
    const corps = encoder.encode(JSON.stringify({ text: 'Bonjour' }));
    expect(mesurerCorpsDeSynthese(corps)).toEqual({ ok: true, caracteres: 7, langue: null });
  });

  it('passe une langue mal formée TELLE QUELLE — le backend la range sous « inconnu »', () => {
    const corps = encoder.encode(JSON.stringify({ text: 'Guten Tag', language: 'de-DE' }));
    expect(mesurerCorpsDeSynthese(corps)).toEqual({ ok: true, caracteres: 9, langue: 'de-DE' });
  });

  it('refuse un corps illisible, vide, ou sans texte', () => {
    expect(mesurerCorpsDeSynthese(undefined)).toEqual({ ok: false, motif: 'corps-non-mesurable' });
    expect(mesurerCorpsDeSynthese(encoder.encode('pas du json'))).toEqual({
      ok: false,
      motif: 'corps-non-mesurable',
    });
    expect(mesurerCorpsDeSynthese(encoder.encode(JSON.stringify({ text: '' })))).toEqual({
      ok: false,
      motif: 'corps-non-mesurable',
    });
    expect(mesurerCorpsDeSynthese(encoder.encode(JSON.stringify({ text: 42 })))).toEqual({
      ok: false,
      motif: 'corps-non-mesurable',
    });
  });
});

describe('debiterSyntheseInterne', () => {
  const appel = {
    jetonAcces: 'jeton-de-guide',
    caracteres: 128,
    langue: 'it',
    reference: 'guide-sub-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('respecte le contrat de la mutation à la lettre', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      debit({ ok: true, debitId: 'd-1', microsDebited: 2048, remainingMicros: 10, armed: true }),
    );

    await debiterSyntheseInterne(appel);

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const envoi = JSON.parse(String(init.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    expect(envoi.query).toContain(
      'mutation DebitInternalSpend($characters: Int!, $language: String, $reference: String)',
    );
    expect(envoi.variables).toEqual({ characters: 128, language: 'it', reference: 'guide-sub-1' });
    // Jeton BRUT, sans `Bearer` — la forme qu'AppSync attend en userPool.
    expect((init.headers as Record<string, string>).Authorization).toBe('jeton-de-guide');
  });

  it('ok: true ⇒ le proxy relaie', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(debit({ ok: true, debitId: 'd-2', microsDebited: 2048 }));

    await expect(debiterSyntheseInterne(appel)).resolves.toEqual({
      relayer: true,
      debitId: 'd-2',
      microsDebites: 2048,
    });
  });

  it('2823 ⇒ 429 nommé, jamais de relais', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      debit({
        ok: false,
        code: CODES_DEPENSE.INTERNAL_SPEND_SUSPENDED,
        error: 'Internal spend envelope exhausted — do not relay this synthesis',
        armed: true,
        capMicros: 30_000_000,
        remainingMicros: 0,
      }),
    );

    const verdict = await debiterSyntheseInterne(appel);
    expect(verdict.relayer).toBe(false);
    if (verdict.relayer) throw new Error('unreachable');
    expect(verdict.status).toBe(429);
    expect(verdict.motif).toBe('enveloppe-interne-epuisee');
    expect(verdict.code).toBe(2823);
    expect(verdict.message).toMatch(/exhausted/i);
  });

  // ─── DEUX PLAFONDS, DEUX 429, DEUX REMÈDES ───
  it('2814 ⇒ 429 nommé, jamais de relais', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      debit({
        ok: false,
        code: CODES_DEPENSE.QUOTA_EXCEEDED,
        error:
          'Hourly studio synthesis quota reached for this account (120000 characters or 300 ' +
          'calls per hour). Nothing was debited and nothing was relayed. ' +
          'Resets at 2026-09-01T12:00:00.000Z.',
      }),
    );

    const verdict = await debiterSyntheseInterne(appel);
    expect(verdict.relayer).toBe(false);
    if (verdict.relayer) throw new Error('unreachable');
    expect(verdict.status).toBe(429);
    expect(verdict.motif).toBe('quota-horaire-compte');
    expect(verdict.code).toBe(2814);
    // Le refus PORTE son remède, et ce n'est PAS celui de 2823 : le seau se vide
    // tout seul, relever l'enveloppe n'y changerait rien.
    expect(verdict.message).toMatch(/hourly/i);
    expect(verdict.message).toMatch(/next hourly window/i);
    // Le détail du backend — dont l'heure de remise à zéro — est conservé.
    expect(verdict.message).toMatch(/Resets at 2026-09-01T12:00:00\.000Z/);
  });

  it("le message de 2814 ne se confond pas avec celui de 2823", async () => {
    const message = async (code: number) => {
      global.fetch = jest.fn().mockResolvedValue(debit({ ok: false, code, error: 'peu importe' }));
      const verdict = await debiterSyntheseInterne(appel);
      if (verdict.relayer) throw new Error('unreachable');
      return verdict;
    };

    const quota = await message(CODES_DEPENSE.QUOTA_EXCEEDED);
    const enveloppe = await message(CODES_DEPENSE.INTERNAL_SPEND_SUSPENDED);

    // Même statut, même caractère terminal — mais jamais le même remède.
    expect(quota.status).toBe(enveloppe.status);
    expect(quota.motif).not.toBe(enveloppe.motif);
    expect(quota.message).not.toBe(enveloppe.message);
    // 2823 envoie relever l'enveloppe ; 2814 ne le fait PAS, il l'écarte.
    expect(enveloppe.message).toMatch(/Raise the internal cap \(setSpendEnvelope\)/);
    expect(quota.message).toMatch(/raising it \(setSpendEnvelope\) changes nothing here/i);
  });

  it('2801 ⇒ pas de relais', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(debit({ ok: false, code: CODES_DEPENSE.INVALID_INPUT, error: 'bad count' }));

    const verdict = await debiterSyntheseInterne(appel);
    expect(verdict).toMatchObject({ relayer: false, status: 400, motif: 'caracteres-refuses' });
  });

  it('2800 et 2803 ⇒ pas de relais', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(debit({ ok: false, code: CODES_DEPENSE.AUTH, error: 'no identity' }));
    expect(await debiterSyntheseInterne(appel)).toMatchObject({
      relayer: false,
      status: 401,
      motif: 'identite-refusee',
    });

    global.fetch = jest
      .fn()
      .mockResolvedValue(debit({ ok: false, code: CODES_DEPENSE.FORBIDDEN, error: 'wrong group' }));
    expect(await debiterSyntheseInterne(appel)).toMatchObject({
      relayer: false,
      status: 403,
      motif: 'identite-refusee',
    });
  });

  it('2804 — panne du registre ⇒ pas de relais (AD-16 §2, panne comprise)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(debit({ ok: false, code: CODES_DEPENSE.FAILED, error: 'ledger down' }));

    expect(await debiterSyntheseInterne(appel)).toMatchObject({
      relayer: false,
      status: 503,
      motif: 'registre-en-panne',
    });
  });

  it('registre injoignable ⇒ pas de relais', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await debiterSyntheseInterne(appel)).toMatchObject({
      relayer: false,
      motif: 'registre-en-panne',
    });
  });

  it('réponse illisible ou sans verdict ⇒ pas de relais', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
    expect(await debiterSyntheseInterne(appel)).toMatchObject({
      relayer: false,
      motif: 'registre-en-panne',
    });

    global.fetch = jest.fn().mockResolvedValue(reponseGraphQL({ data: { debitInternalSpend: null } }));
    expect(await debiterSyntheseInterne(appel)).toMatchObject({
      relayer: false,
      motif: 'registre-en-panne',
    });
  });

  // ─── L'ORDRE DE DÉPLOIEMENT, ÉPROUVÉ ───
  //
  // Fusionner le portail le déploie immédiatement ; le backend se déploie à la
  // main. Entre les deux, AppSync répond « FieldUndefined ». Choix assumé :
  // ÉCHEC FERMÉ, avec un motif distinct de la panne, qui nomme son remède.
  it('mutation absente du schéma ⇒ 503 nommé, jamais de relais', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      reponseGraphQL(
        {
          errors: [
            {
              message:
                "Validation error of type FieldUndefined: Field 'debitInternalSpend' in type 'Mutation' is undefined @ 'debitInternalSpend'",
            },
          ],
        },
        400,
      ),
    );

    const verdict = await debiterSyntheseInterne(appel);
    expect(verdict.relayer).toBe(false);
    if (verdict.relayer) throw new Error('unreachable');
    expect(verdict.status).toBe(503);
    expect(verdict.motif).toBe('registre-non-deploye');
    // Le refus PORTE son remède : sans cela l'exploitant chercherait une panne
    // DynamoDB qui n'existe pas.
    expect(verdict.message).toMatch(/Deploy the backend/i);
    expect(verdict.message).toMatch(/amplify_outputs\.json/);
  });

  it('appelant hors groupe Cognito ⇒ refus nommé, jamais de relais', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      reponseGraphQL({
        errors: [{ message: 'Not Authorized to access debitInternalSpend on type Mutation' }],
      }),
    );

    const verdict = await debiterSyntheseInterne(appel);
    expect(verdict).toMatchObject({ relayer: false, status: 403, motif: 'identite-refusee' });
    if (verdict.relayer) throw new Error('unreachable');
    expect(verdict.message).toMatch(/Cognito group/i);
  });
});

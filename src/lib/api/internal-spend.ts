import outputs from '../../../amplify_outputs.json';
import { logger } from '@/lib/logger';
import { ENTETE_REFUS_DEPENSE, type MotifDeRefus } from './spend-refusal';

export { ENTETE_REFUS_DEPENSE };
export type { MotifDeRefus };

/**
 * LE DÉBIT DE L'ENVELOPPE INTERNE, AVANT QUE LE PROXY RELAIE — story 16, tâche 5.
 *
 * ─── CE QUE CE MODULE EXISTE POUR RÉPARER ───
 *
 * `POST v1/tts/generate` fait facturer Azure. Le proxy l'ouvre à tout compte des
 * groupes `guide` ou `admin`, jusqu'à 1 Mo de corps, **sans plafond, sans
 * compteur, sans trace**. La décision humaine du 2026-08-31 tranche : « le
 * compter sous l'enveloppe interne. Le fermer aurait cassé le Studio. »
 *
 * ─── LA RÈGLE, ET ELLE N'A QU'UN SENS ───
 *
 * AD-16 §2 : « un appel qui n'a pas débité ne part pas », panne comprise. Le
 * proxy n'émet donc QUE sur `relayer: true`. L'inversion — relayer puis débiter
 * — laisserait facturé tout ce qui échoue entre les deux, ce qui est exactement
 * la sous-déclaration que cette story combat.
 *
 * Il n'existe AUCUNE mutation de relâchement pour ce chemin : le débit est clos
 * dans le même appel côté backend (pour la synthèse, le caractère soumis EST ce
 * qu'Azure facture). Si le relais échoue APRÈS le débit, on sur-déclare — et
 * c'est le sens d'erreur voulu.
 *
 * ─── POURQUOI UN `fetch` NU ET NON `client.mutations.debitInternalSpend` ───
 *
 * Deux raisons, toutes deux dirimantes :
 *
 * 1. `generateClient()` construit `client.mutations` depuis le
 *    `model_introspection` d'`amplify_outputs.json`, qui est une COPIE MANUELLE
 *    du backend (voir `lib/amplify/config.ts`). Tant que la copie n'est pas
 *    refaite, `client.mutations.debitInternalSpend` est `undefined` — un
 *    `TypeError` opaque au lieu d'un refus nommé.
 * 2. Côté serveur il n'y a aucune session Amplify : `authMode: 'userPool'` lit
 *    `fetchAuthSession()`, qui ne rend rien dans une route Next. L'identité
 *    dont le backend a besoin est celle de l'APPELANT, et le proxy la tient
 *    déjà — c'est le jeton d'accès qu'il vient de vérifier.
 *
 * Le `fetch` porte donc le jeton de l'appelant tel quel dans `Authorization`,
 * exactement comme Amplify le fait en `userPool` (jeton brut, sans `Bearer`,
 * cf. `@aws-amplify/api-graphql/.../graphqlAuth.mjs`).
 */

const SERVICE_NAME = 'InternalSpend';

const APPSYNC_URL = (outputs as { data: { url: string } }).data.url;

/** Le débit ne doit pas retenir le proxy aussi longtemps que le relais lui-même. */
const DEBIT_TIMEOUT_MS = 10_000;

/**
 * Les codes du backend, recopiés — et il faut le dire.
 *
 * La source de vérité est `TourGuideApp/amplify/shared/language-scope.ts`
 * (`NARRATION_ERROR_CODES`). Le portail ne peut pas l'IMPORTER : l'alias
 * `@amplify-schema` ne sert qu'aux types, et un import de valeur depuis le dépôt
 * voisin ne survivrait ni au `next build` ni au conteneur. Cette table est donc
 * une copie, assumée comme telle, et les épreuves l'épinglent par leur nombre.
 */
export const CODES_DEPENSE = {
  /** 2800 — aucune identité. */
  AUTH: 2800,
  /** 2801 — `characters` absent, non entier, négatif, ou au-delà de 10 000. */
  INVALID_INPUT: 2801,
  /** 2803 — l'appelant n'est ni `guide` ni `admin` AUX YEUX DU BACKEND. */
  FORBIDDEN: 2803,
  /** 2804 — panne du registre. « Un appel qui n'a pas débité ne part pas. » */
  FAILED: 2804,
  /**
   * 2814 — quota HORAIRE de ce compte atteint sur le guichet (120 000
   * caractères ou 300 appels par heure, `debit-internal-spend/quota.ts`).
   * Rien n'a été débité, rien ne doit être relayé.
   */
  QUOTA_EXCEEDED: 2814,
  /** 2823 — enveloppe interne épuisée. */
  INTERNAL_SPEND_SUSPENDED: 2823,
} as const;

export type VerdictDeDepense =
  | { relayer: true; debitId: string | null; microsDebites: number | null }
  | {
      relayer: false;
      status: number;
      motif: MotifDeRefus;
      message: string;
      code?: number;
    };

interface ReponseDebit {
  ok: boolean;
  debitId?: string | null;
  microsDebited?: number | null;
  remainingMicros?: number | null;
  armed?: boolean | null;
  capMicros?: number | null;
  error?: string | null;
  code?: number | null;
}

/**
 * Le contrat exact, déjà déployé côté schéma. Aucun champ n'est deviné.
 */
const MUTATION_DEBIT = `mutation DebitInternalSpend($characters: Int!, $language: String, $reference: String) {
  debitInternalSpend(characters: $characters, language: $language, reference: $reference) {
    ok
    debitId
    microsDebited
    remainingMicros
    armed
    capMicros
    error
    code
  }
}`;

/**
 * CE QUE LE CORPS RELAYÉ DIT DE LA DÉPENSE — une LECTURE, jamais une écriture.
 *
 * Le corps est relayé OCTET POUR OCTET : cette fonction décode une copie pour
 * mesurer, elle ne réécrit rien. `text.length` est l'unité qu'Azure facture.
 *
 * `language` est passée TELLE QUELLE quand c'est une chaîne : le backend la
 * normalise (`normalizeLanguage`) et range sous l'axe « inconnu » ce qui n'est
 * pas deux lettres. Inventer `fr` ici aurait produit un chiffre faux sous un
 * bon nom — la faute exacte qu'AD-16 §6 interdit.
 */
export function mesurerCorpsDeSynthese(
  corps: Uint8Array | undefined,
): { ok: true; caracteres: number; langue: string | null } | { ok: false; motif: 'corps-non-mesurable' } {
  if (!corps || corps.byteLength === 0) {
    return { ok: false, motif: 'corps-non-mesurable' };
  }
  let charge: unknown;
  try {
    charge = JSON.parse(new TextDecoder().decode(corps));
  } catch {
    return { ok: false, motif: 'corps-non-mesurable' };
  }
  if (typeof charge !== 'object' || charge === null) {
    return { ok: false, motif: 'corps-non-mesurable' };
  }
  const { text, language } = charge as { text?: unknown; language?: unknown };
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, motif: 'corps-non-mesurable' };
  }
  return {
    ok: true,
    caracteres: text.length,
    langue: typeof language === 'string' ? language : null,
  };
}

/**
 * Une erreur GraphQL qui dit « ce champ n'existe pas », et non « ça a raté ».
 *
 * C'est le cas d'ORDRE DE DÉPLOIEMENT : fusionner le portail le déploie
 * immédiatement, alors que le backend se déploie à la main. Entre les deux, le
 * schéma vivant ne connaît pas encore la mutation, et AppSync répond par une
 * erreur de VALIDATION — déterministe, jamais transitoire. La distinguer d'une
 * panne permet de la NOMMER dans le refus, au lieu de laisser l'exploitant
 * chercher une panne DynamoDB qui n'existe pas.
 */
function estChampInconnu(messages: string[]): boolean {
  return messages.some(
    (message) =>
      /debitInternalSpend/i.test(message) &&
      /(FieldUndefined|Cannot query field|undefined field|Validation error)/i.test(message),
  );
}

function estNonAutorise(messages: string[]): boolean {
  return messages.some((message) => /not\s+authoriz/i.test(message));
}

/**
 * Débite l'enveloppe interne, et rend le verdict que le proxy doit appliquer.
 *
 * Ne relaie rien, n'écrit rien d'autre que le grand livre : la moitié « ne pas
 * émettre » de la règle appartient à l'appelant.
 */
export async function debiterSyntheseInterne(params: {
  /** Le jeton d'accès de l'appelant, déjà vérifié par `requireServerRole`. */
  jetonAcces: string;
  caracteres: number;
  langue: string | null;
  /** Trace libre, assainie côté backend (`[A-Za-z0-9._:-]`, 64 car.). */
  reference: string | null;
}): Promise<VerdictDeDepense> {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), DEBIT_TIMEOUT_MS);

  let reponse: Response;
  try {
    reponse = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Jeton BRUT, sans `Bearer` — la forme qu'AppSync attend en
        // `AMAZON_COGNITO_USER_POOLS`, et celle qu'Amplify envoie.
        Authorization: params.jetonAcces,
      },
      body: JSON.stringify({
        query: MUTATION_DEBIT,
        variables: {
          characters: params.caracteres,
          language: params.langue,
          reference: params.reference,
        },
      }),
      cache: 'no-store',
      signal: controleur.signal,
    });
  } catch (erreur) {
    logger.error(SERVICE_NAME, 'registre injoignable — aucun relais', {
      error: String(erreur),
    });
    return refusRegistre('Spend ledger unreachable');
  } finally {
    clearTimeout(minuterie);
  }

  let charge: { data?: { debitInternalSpend?: ReponseDebit | null } | null; errors?: Array<{ message?: string }> };
  try {
    charge = (await reponse.json()) as typeof charge;
  } catch {
    logger.error(SERVICE_NAME, 'réponse du registre illisible — aucun relais', {
      status: reponse.status,
    });
    return refusRegistre('Spend ledger returned an unreadable response');
  }

  const messages = (charge.errors ?? []).map((e) => String(e?.message ?? ''));
  if (messages.length > 0) {
    // ─── L'ORDRE DE DÉPLOIEMENT, TRAITÉ ET NON SUBI ───
    //
    // ÉCHEC FERMÉ, DÉLIBÉRÉMENT. Le comportement transitoire — « relayer quand
    // même en attendant le backend » — aurait été le scénario que ce garde-fou
    // existe pour éviter : il RÉUSSIT, donc rien ne le signale, et il survivrait
    // à un déploiement backend oublié sans que personne le voie. L'échec fermé,
    // lui, se voit à la première synthèse du Studio et nomme son remède. Le prix
    // — le Studio muet entre les deux déploiements — est borné, réversible, et
    // sous le contrôle de l'exploitant ; celui de la dépense non comptée ne
    // l'est pas.
    //
    // D'où l'ORDRE REQUIS : déployer le backend à la main, RECOPIER
    // `amplify_outputs.json`, puis seulement fusionner le portail.
    if (estChampInconnu(messages)) {
      logger.error(
        SERVICE_NAME,
        'mutation debitInternalSpend absente du schéma vivant — déployer le backend AVANT de fusionner le portail',
        { errors: messages.join(' | ') },
      );
      return {
        relayer: false,
        status: 503,
        motif: 'registre-non-deploye',
        message:
          'Spend ledger not deployed: the live GraphQL schema has no debitInternalSpend mutation. ' +
          'Deploy the backend (gh workflow run deploy-backend.yml), re-copy amplify_outputs.json, then retry. ' +
          'Synthesis is refused rather than relayed uncounted (AD-16 §2).',
      };
    }
    if (estNonAutorise(messages)) {
      logger.error(SERVICE_NAME, 'appelant refusé par AppSync — aucun relais', {
        errors: messages.join(' | '),
      });
      return {
        relayer: false,
        status: 403,
        motif: 'identite-refusee',
        message:
          'Spend ledger refused this identity: debitInternalSpend requires the Cognito group ' +
          '"guide" or "admin". Synthesis is refused rather than relayed uncounted (AD-16 §2).',
      };
    }
    logger.error(SERVICE_NAME, 'registre en erreur — aucun relais', {
      errors: messages.join(' | '),
    });
    return refusRegistre('Spend ledger returned an error');
  }

  const resultat = charge.data?.debitInternalSpend ?? null;
  if (!resultat || typeof resultat.ok !== 'boolean') {
    logger.error(SERVICE_NAME, 'registre sans verdict — aucun relais', {
      status: reponse.status,
    });
    return refusRegistre('Spend ledger returned no verdict');
  }

  if (resultat.ok) {
    logger.info(SERVICE_NAME, 'débit inscrit — relais autorisé', {
      debitId: resultat.debitId ?? null,
      microsDebited: resultat.microsDebited ?? null,
      remainingMicros: resultat.remainingMicros ?? null,
    });
    return {
      relayer: true,
      debitId: resultat.debitId ?? null,
      microsDebites: resultat.microsDebited ?? null,
    };
  }

  const code = typeof resultat.code === 'number' ? resultat.code : undefined;
  const detail = typeof resultat.error === 'string' && resultat.error.length > 0 ? resultat.error : null;

  // 2823 — LE SEUL REFUS QUI VAUT 429. L'enveloppe interne est épuisée : rien
  // n'est en panne, rien n'est mal formé, la dépense est simplement suspendue.
  if (code === CODES_DEPENSE.INTERNAL_SPEND_SUSPENDED) {
    logger.warn(SERVICE_NAME, 'enveloppe interne épuisée — aucun relais', {
      remainingMicros: resultat.remainingMicros ?? null,
      capMicros: resultat.capMicros ?? null,
    });
    return {
      relayer: false,
      status: 429,
      motif: 'enveloppe-interne-epuisee',
      code,
      message:
        'Internal spend envelope exhausted — synthesis refused, nothing was sent to the provider. ' +
        'Raise the internal cap (setSpendEnvelope) or wait for the next period. ' +
        (detail ?? ''),
    };
  }

  // 2814 — L'AUTRE REFUS QUI VAUT 429, ET IL NE SE CONFOND PAS AVEC 2823.
  //
  // Le seau horaire du guichet borne ce qu'UN COMPTE peut soumettre par heure ;
  // l'enveloppe borne ce que TOUS les producteurs peuvent dépenser sur la
  // période. Sans cette branche, 2814 tombait dans le fourre-tout d'en bas et
  // sortait en 503 « registre-en-panne » : l'exploitant serait allé chercher une
  // panne DynamoDB inexistante, alors que rien n'est en panne et que le remède
  // ne lui appartient même pas — le seau se vide tout seul à l'heure suivante.
  //
  // Le marqueur terminal est posé pour la même raison que 2823 : un plafond
  // n'est pas une file d'attente, et `submitMicroserviceJob` réessaierait cinq
  // fois pour aboutir au même refus.
  if (code === CODES_DEPENSE.QUOTA_EXCEEDED) {
    logger.warn(SERVICE_NAME, 'quota horaire du compte atteint — aucun relais', {
      code,
    });
    return {
      relayer: false,
      status: 429,
      motif: 'quota-horaire-compte',
      code,
      message:
        'Hourly synthesis quota reached for this account — synthesis refused, nothing was sent to the provider. ' +
        'This is not the internal spend cap: raising it (setSpendEnvelope) changes nothing here. ' +
        'Wait for the next hourly window. ' +
        (detail ?? ''),
    };
  }

  if (code === CODES_DEPENSE.INVALID_INPUT) {
    return {
      relayer: false,
      status: 400,
      motif: 'caracteres-refuses',
      code,
      message: `Spend ledger refused the character count — nothing was sent to the provider. ${detail ?? ''}`,
    };
  }

  if (code === CODES_DEPENSE.AUTH || code === CODES_DEPENSE.FORBIDDEN) {
    return {
      relayer: false,
      status: code === CODES_DEPENSE.AUTH ? 401 : 403,
      motif: 'identite-refusee',
      code,
      message: `Spend ledger refused this identity — nothing was sent to the provider. ${detail ?? ''}`,
    };
  }

  // 2804 et tout code inconnu : panne du registre. AD-16 §2 s'applique en
  // entier — « un appel qui n'a pas débité ne part pas », PANNE COMPRISE.
  logger.error(SERVICE_NAME, 'débit refusé — aucun relais', { code: code ?? null });
  return refusRegistre(detail ?? 'Spend ledger debit failed', code);
}

function refusRegistre(message: string, code?: number): VerdictDeDepense {
  return {
    relayer: false,
    status: 503,
    motif: 'registre-en-panne',
    code,
    message: `${message} — synthesis refused rather than relayed uncounted (AD-16 §2).`,
  };
}

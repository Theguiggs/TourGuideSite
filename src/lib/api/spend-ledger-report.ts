import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { getClient } from './appsync-client';

/**
 * LE GRAND LIVRE, LU — story 16, tâche 6 (seconde moitié).
 *
 * ─── CE QUE CE MODULE REMPLACE ───
 *
 * `studio-analytics.ts` portait quatre constantes en dur (Whisper $/min, S3
 * $/Go/mois, minutes par Scène, Mo par Scène), les multipliait par un nombre de
 * Scènes, et affichait le produit comme un « Coût unitaire par tour ». C'est le
 * « coût supposé » qu'AD-16 §6 interdit, et il était déjà à l'écran.
 *
 * La règle est simple et n'a pas de troisième terme : **soit la page lit le
 * réel, soit elle ne dit rien.** Un « — » honnête vaut mieux qu'un chiffre faux.
 *
 * ─── TROIS GRANDEURS, JAMAIS ADDITIONNÉES ───
 *
 * MESURÉ (débit conclu) · PROVISIONNÉ (débit encore en vol) · RELÂCHÉ (l'appel
 * est mort avant d'émettre — c'est là que le gaspillage devient visible). Les
 * additionner rendrait un total supérieur au compteur opposable de l'enveloppe.
 * Ce module les transporte séparées, et la page les affiche séparées.
 *
 * ─── ET POURQUOI L'APPEL EST DÉFENSIF ───
 *
 * `amplify_outputs.json` du portail est une COPIE MANUELLE de celui du backend.
 * Tant que le backend n'est pas déployé ET la copie refaite,
 * `client.queries.spendLedgerReport` est `undefined` — et le portail se déploie
 * à la fusion, le backend à la main. Ce cas est donc NOMMÉ, pas subi : la page
 * dit « le registre n'est pas encore déployé », elle ne se remet pas à inventer.
 */

const SERVICE_NAME = 'SpendLedgerReport';

/** Un millionième de dollar — l'unité du grand livre (décision du 2026-08-31). */
export const MICROS_PAR_DOLLAR = 1_000_000;

/** Le TTL des lignes de débit couvre treize périodes ; au-delà il n'y a rien. */
export const PERIODES_MAX = 13;

export interface LigneDeDepense {
  enveloppe: string;
  cle: string;
  /** Débits CONCLUS : la mesure. Jamais une estimation. */
  mesureMicros: number;
  /** Débits encore OUVERTS. À ne jamais additionner au mesuré. */
  provisionOuverteMicros: number;
  /** Provisions RENDUES : l'appel est mort avant d'émettre — le gaspillage. */
  relacheMicros: number;
  debitsConclus: number;
  debitsEnVol: number;
  debitsRelaches: number;
  caracteresSoumis: number;
  caracteresFactures: number;
  jetonsEntree: number;
  jetonsSortie: number;
}

export interface EtatEnveloppe {
  enveloppe: string;
  /** `false` = aucune ligne de configuration : rien ne s'oppose (table neuve). */
  armee: boolean;
  motif: string | null;
  capMicros: number | null;
  engageMicros: number;
  remplissagePourCent: number | null;
}

export type MotifIndisponible =
  | 'mode-bouchon'
  | 'registre-non-deploye'
  | 'lecture-incomplete'
  | 'refuse'
  | 'panne';

export type RapportDeDepense =
  | {
      ok: true;
      /** `true` quand AUCUN débit n'a jamais été inscrit — à DIRE, pas à afficher 0 $. */
      vide: boolean;
      periodes: string[];
      enveloppes: EtatEnveloppe[];
      parEnveloppe: LigneDeDepense[];
      parPeriode: LigneDeDepense[];
      parLangue: LigneDeDepense[];
      parVisite: LigneDeDepense[];
    }
  | { ok: false; motif: MotifIndisponible; message: string };

/** Les montants sont des ENTIERS de micro-dollars transportés en `Float`. */
export function dollarsDeMicros(micros: number): number {
  return micros / MICROS_PAR_DOLLAR;
}

/**
 * Assez de décimales pour qu'une Paire à 0,16 $ ne s'affiche pas « 0,16 $ »
 * quand elle vaut 0,1642 $, et pas « 0,00 $ » quand elle vaut 0,0004 $.
 */
export function formaterDollars(micros: number): string {
  const dollars = dollarsDeMicros(micros);
  if (dollars !== 0 && Math.abs(dollars) < 1) {
    return `$${dollars.toFixed(4)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

interface AxeBrut {
  envelope?: unknown;
  key?: unknown;
  measuredMicros?: unknown;
  openProvisionMicros?: unknown;
  releasedMicros?: unknown;
  closedDebits?: unknown;
  openDebits?: unknown;
  releasedDebits?: unknown;
  submittedCharacters?: unknown;
  billedCharacters?: unknown;
  inputTokens?: unknown;
  outputTokens?: unknown;
}

function nombre(valeur: unknown): number {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : 0;
}

function ligne(axe: AxeBrut): LigneDeDepense {
  return {
    enveloppe: typeof axe.envelope === 'string' ? axe.envelope : 'inconnu',
    cle: typeof axe.key === 'string' ? axe.key : 'inconnu',
    mesureMicros: nombre(axe.measuredMicros),
    provisionOuverteMicros: nombre(axe.openProvisionMicros),
    relacheMicros: nombre(axe.releasedMicros),
    debitsConclus: nombre(axe.closedDebits),
    debitsEnVol: nombre(axe.openDebits),
    debitsRelaches: nombre(axe.releasedDebits),
    caracteresSoumis: nombre(axe.submittedCharacters),
    caracteresFactures: nombre(axe.billedCharacters),
    jetonsEntree: nombre(axe.inputTokens),
    jetonsSortie: nombre(axe.outputTokens),
  };
}

function axes(valeur: unknown): LigneDeDepense[] {
  return Array.isArray(valeur) ? valeur.filter((a) => a !== null).map((a) => ligne(a as AxeBrut)) : [];
}

interface ReponseRapport {
  ok?: unknown;
  complete?: unknown;
  periods?: unknown;
  envelopes?: unknown;
  byEnvelope?: unknown;
  byPeriod?: unknown;
  byLanguage?: unknown;
  byTour?: unknown;
  error?: unknown;
  code?: unknown;
}

type RequeteAppSync = (
  args: Record<string, unknown>,
  options?: Record<string, unknown>,
) => Promise<{ data?: unknown; errors?: Array<{ message?: string }> }>;

/**
 * Lit `spendLedgerReport` (groupe admin), ou dit pourquoi elle ne peut pas.
 *
 * N'invente RIEN : aucune moyenne, aucun ordre de grandeur, aucune
 * extrapolation. Toute branche d'échec rend `ok: false` et un motif nommé.
 */
export async function lireGrandLivre(mois = PERIODES_MAX): Promise<RapportDeDepense> {
  if (shouldUseStubs()) {
    // MÊME EN MODE BOUCHON, AUCUN CHIFFRE INVENTÉ. Un faux grand livre serait le
    // mensonge que cette tâche retire, replacé sous un autre nom.
    return {
      ok: false,
      motif: 'mode-bouchon',
      message: 'Mode bouchon : le grand livre n’est pas interrogé, et aucun coût n’est simulé.',
    };
  }

  let requete: RequeteAppSync | undefined;
  try {
    const client = getClient() as unknown as {
      queries?: Record<string, RequeteAppSync | undefined>;
    };
    requete = client?.queries?.spendLedgerReport;
  } catch (erreur) {
    logger.error(SERVICE_NAME, 'client AppSync indisponible', { error: String(erreur) });
    return { ok: false, motif: 'panne', message: 'Client AppSync indisponible.' };
  }

  // ─── L'ORDRE DE DÉPLOIEMENT, NOMMÉ PLUTÔT QUE SUBI ───
  //
  // `client.queries` est construit depuis le `model_introspection` d'
  // `amplify_outputs.json`, copie MANUELLE du backend. Tant que le backend n'est
  // pas déployé et la copie refaite, cette requête est `undefined`.
  if (typeof requete !== 'function') {
    logger.warn(SERVICE_NAME, 'spendLedgerReport absente d’amplify_outputs.json');
    return {
      ok: false,
      motif: 'registre-non-deploye',
      message:
        'Le grand livre n’est pas encore lisible ici : déployer le backend, puis recopier ' +
        'amplify_outputs.json depuis TourGuideApp.',
    };
  }

  let brut: ReponseRapport | null = null;
  try {
    const reponse = await requete({ months: mois }, { authMode: 'userPool' });
    if (reponse.errors && reponse.errors.length > 0) {
      const messages = reponse.errors.map((e) => String(e?.message ?? '')).join(' | ');
      logger.error(SERVICE_NAME, 'spendLedgerReport a rendu des erreurs', { errors: messages });
      return {
        ok: false,
        motif: /not\s+authoriz/i.test(messages) ? 'refuse' : 'panne',
        message: 'Le grand livre n’a pas pu être lu.',
      };
    }
    brut = (reponse.data ?? null) as ReponseRapport | null;
  } catch (erreur) {
    logger.error(SERVICE_NAME, 'spendLedgerReport a échoué', { error: String(erreur) });
    return { ok: false, motif: 'panne', message: 'Le grand livre n’a pas pu être lu.' };
  }

  if (!brut || brut.ok !== true) {
    // `complete: false` ⇒ la lecture a touché sa borne : le backend RETIENT ses
    // agrégats plutôt que de sous-déclarer. La page fait la même chose.
    const incomplete = brut?.complete === false;
    logger.error(SERVICE_NAME, 'spendLedgerReport sans verdict exploitable', {
      code: typeof brut?.code === 'number' ? brut.code : null,
    });
    return {
      ok: false,
      motif: incomplete ? 'lecture-incomplete' : 'panne',
      message: incomplete
        ? 'Lecture incomplète du grand livre : les agrégats sont retenus plutôt que sous-déclarés.'
        : 'Le grand livre n’a pas pu être lu.',
    };
  }

  const enveloppes: EtatEnveloppe[] = Array.isArray(brut.envelopes)
    ? brut.envelopes
        .filter((e) => e !== null)
        .map((e) => {
          const etat = e as Record<string, unknown>;
          return {
            enveloppe: typeof etat.envelope === 'string' ? etat.envelope : 'inconnue',
            armee: etat.armed === true,
            motif: typeof etat.reason === 'string' ? etat.reason : null,
            capMicros: typeof etat.capMicros === 'number' ? etat.capMicros : null,
            engageMicros: nombre(etat.engagedMicros),
            remplissagePourCent:
              typeof etat.fillPercent === 'number' ? etat.fillPercent : null,
          };
        })
    : [];

  const parEnveloppe = axes(brut.byEnvelope);
  const rapport = {
    ok: true as const,
    // VIDE EST UN ÉTAT, ET IL SE DIT. Le grand livre part de zéro : tout
    // l'historique a été journalisé avant qu'il existe. Afficher « 0 $ »
    // laisserait croire qu'on n'a rien dépensé.
    vide: parEnveloppe.every(
      (a) => a.debitsConclus === 0 && a.debitsEnVol === 0 && a.debitsRelaches === 0,
    ),
    periodes: Array.isArray(brut.periods)
      ? brut.periods.filter((p): p is string => typeof p === 'string')
      : [],
    enveloppes,
    parEnveloppe,
    parPeriode: axes(brut.byPeriod),
    parLangue: axes(brut.byLanguage),
    parVisite: axes(brut.byTour),
  };

  logger.info(SERVICE_NAME, 'grand livre lu', {
    periodes: rapport.periodes.length,
    vide: rapport.vide,
  });
  return rapport;
}

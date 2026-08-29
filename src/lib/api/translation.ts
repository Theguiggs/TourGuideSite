import type { TranslationProvider, TranslationJobStatus, QualityTier } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';
import {
  CARACTERES_PAR_JETON,
  getProviderForRequest,
  isLanguagePremium,
  isLlmPairSupported,
  LLM_PROVIDER,
  type LlmTextKind,
  type TranslationEngine,
} from '@/lib/multilang/provider-router';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TranslationAPI';

/**
 * Split text into sentences for sentence-level translation models (MarianMT).
 * Splits on sentence-ending punctuation (.!?) followed by a space or end of string.
 * Preserves the punctuation with each sentence.
 */
function splitIntoSentences(text: string): string[] {
  if (text.length < 150) return [text]; // Short text: translate as-is
  // Split on . ! ? followed by space (keep delimiter with the sentence)
  const parts = text.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!parts || parts.length <= 1) return [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

// SSML <break .../> tags are markup, not translatable content — MarianMT would
// drop them. We split the source on break tags, translate only the text blocks,
// then reassemble with the tags preserved at their original positions.
const BREAK_TAG_RE = /<break\b[^>]*?\/?>/gi;

interface TextToken { type: 'text' | 'break'; content: string }

function tokenizeWithBreaks(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let last = 0;
  for (const m of text.matchAll(BREAK_TAG_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) tokens.push({ type: 'text', content: text.slice(last, idx) });
    tokens.push({ type: 'break', content: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', content: text.slice(last) });
  return tokens;
}

// --- Types ---

export interface TranslationResult {
  jobId: string;
  status: TranslationJobStatus;
  translatedText: string | null;
  provider: TranslationProvider;
  costProvider: number | null;   // centimes
  costCharged: number | null;    // centimes
  /**
   * Multiplicateur RÉELLEMENT appliqué par le serveur (lu dans SSM).
   *
   * Le portail affichait un devis à marge 3 codée en dur pendant que le serveur
   * facturait au multiplicateur SSM : les deux pouvaient diverger d'un facteur
   * quelconque sans que rien ne le dise.
   */
  marge?: number | null;
  errorCode?: number;
}

/**
 * Contexte de Visite qui voyage AVEC la Scène sur le troisième chemin.
 *
 * Un modèle de langue ne tient les toponymes et le registre d'une Scène à
 * l'autre que s'il sait de quelle Visite elle vient. C'est tout l'écart avec un
 * traducteur statistique, qui n'a rien à faire de ce contexte.
 */
export interface SceneContext {
  tourTitle?: string | null;
  city?: string | null;
  sceneTitle?: string | null;
  /** Rang de la Scène dans la Visite, 1-based. */
  sceneIndex?: number | null;
  sceneCount?: number | null;
}

export interface TranslationRequestOptions {
  /**
   * Le moteur, DEMANDÉ. Absent = comportement historique par palier
   * (standard → marianmt, pro → deepl). Le troisième chemin s'écrit `'llm'` :
   * rien ne l'active par défaut.
   */
  engine?: TranslationEngine;
  /**
   * La Scène dont la PROPRIÉTÉ autorise la dépense. Le serveur la vérifie avant
   * tout appel facturé ; sans elle, il refuse. Ce n'est pas du contexte : c'est
   * la pièce d'autorisation.
   */
  sceneId?: string;
  /** `scene` (narration) ou `title`. Un titre n'obéit pas aux mêmes règles. */
  kind?: LlmTextKind;
  context?: SceneContext;
}

/**
 * Les arguments EXACTS envoyés à la mutation, construits en un seul endroit.
 *
 * Exporté à dessein : l'appel passe par `(client as any)`, ce qui jette tout
 * typage — renommer un argument dans le schéma laissait les trois suites
 * vertes. L'épreuve de portage compare ces clés à celles déclarées dans
 * `TourGuideApp/amplify/data/resource.ts`, et rougit sur un renommage.
 */
export function buildTranslationMutationArgs(params: {
  segmentId: string;
  text: string;
  sourceLang: string;
  targetLang: string;
  provider: TranslationProvider;
  sceneId?: string;
  kind?: LlmTextKind;
  context?: SceneContext;
}): Record<string, unknown> {
  const ctx = params.context ?? {};
  return {
    segmentId: params.segmentId,
    sceneId: params.sceneId ?? null,
    text: params.text,
    sourceLang: params.sourceLang,
    targetLang: params.targetLang,
    provider: params.provider,
    kind: params.kind ?? 'scene',
    tourTitle: ctx.tourTitle ?? null,
    city: ctx.city ?? null,
    sceneTitle: ctx.sceneTitle ?? null,
    sceneIndex: ctx.sceneIndex ?? null,
    sceneCount: ctx.sceneCount ?? null,
  };
}

/**
 * Une charge nulle rendue par AppSync n'est PAS forcément transitoire.
 *
 * Elle l'était pour tout le monde : le code retombait sur 2609, que
 * `batch-translation-service` lit comme « réessayez ». Une autorisation refusée
 * ou une erreur de validation GraphQL se lisait donc « le service est
 * temporairement indisponible » — et se rejouait en boucle sans jamais aboutir.
 */
export function classerEchecAppsync(errors: unknown): number {
  const liste = Array.isArray(errors) ? errors : [];
  if (liste.length === 0) {
    // Aucune erreur GraphQL et pas de données : couche réseau, donc transitoire.
    return 2609;
  }
  const texte = liste
    .map((e) => `${(e as { errorType?: string })?.errorType ?? ''} ${(e as { message?: string })?.message ?? ''}`)
    .join(' ')
    .toLowerCase();
  // Une autorisation refusée n'est pas « fournisseur indisponible » : 2624
  // existe pour ça, et le guide qui lit l'écran doit savoir que réessayer ne
  // servira à rien.
  if (/unauthorized|not authorized|access denied|forbidden/.test(texte)) {
    return 2624;
  }
  // Le 5xx doit être ANNONCÉ comme un statut. `/5\d\d/` non ancré attrapait
  // « 500 caractères » et n'importe quel fragment d'identifiant ; `\b` n'y
  // changeait rien — un nombre isolé est justement entouré de limites de mot.
  if (
    /throttl|timeout|unavailable|internal ?(failure|error)|serviceerror/.test(texte) ||
    /\b(?:http|status|statuscode|code)\s*:?\s*5\d\d\b/.test(texte)
  ) {
    return 2609;
  }
  // Validation, champ inconnu, argument manquant : rien de tout cela ne se
  // répare en réessayant.
  return 2401;
}

export interface CostEstimate {
  provider: TranslationProvider;
  charCount: number;
  costProvider: number;  // centimes
  costCharged: number;   // centimes
  isFree: boolean;
}

export interface MicroserviceHealth {
  tts: boolean;
  translation: boolean;
  silence_detection: boolean;
}

// --- Stub state ---

const stubJobs = new Map<string, {
  segmentId: string;
  text: string;
  targetLang: string;
  provider: TranslationProvider;
  startedAt: number;
  durationMs: number;
}>();

const STUB_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    default: 'Welcome to this wonderful tour through the historic streets of the city...',
  },
  it: {
    default: 'Benvenuti in questo meraviglioso tour attraverso le strade storiche della città...',
  },
  de: {
    default: 'Willkommen zu dieser wunderbaren Tour durch die historischen Straßen der Stadt...',
  },
  es: {
    default: 'Bienvenidos a este maravilloso tour por las calles históricas de la ciudad...',
  },
};

let stubHealthGpuDown = false;
const stubProviderDown = new Map<TranslationProvider, boolean>();

// --- Real-mode microservice jobs (marianmt) ---
// The microservice translate endpoint is async: submit → job_id → poll. We keep
// the SSML token template here, keyed by job_id, so getTranslationStatus can
// re-interleave the <break/> tags once the batch job completes.
interface MicroserviceTranslationJob {
  tokens: TextToken[];
  sentencesPerToken: string[][];
  provider: TranslationProvider;
}
const microserviceTranslationJobs = new Map<string, MicroserviceTranslationJob>();

/**
 * Moteur réel derrière un `jobId` suivi par AppSync.
 *
 * Sans ce registre, une expiration de sondage devait inventer un moteur — et
 * `pollTranslation` inventait « marianmt », quel que soit celui qui avait
 * réellement traduit. Une fausse étiquette sur la route d'échec du nouveau
 * chemin, exactement ce que la story interdit ailleurs.
 */
const appsyncTranslationJobs = new Map<string, TranslationProvider>();

/** Le moteur derrière un `jobId`, ou `null` si personne ne le sait. */
export function providerForJob(jobId: string): TranslationProvider | null {
  const microservice = microserviceTranslationJobs.get(jobId);
  if (microservice) return microservice.provider;
  return appsyncTranslationJobs.get(jobId) ?? null;
}

/**
 * Oublie un job suivi.
 *
 * Les entrées n'étaient retirées que sur un sondage TERMINAL : une expiration
 * les laissait à jamais, et la carte grossissait à chaque lot. L'appelant qui
 * renonce le dit maintenant.
 */
export function forgetJob(jobId: string): void {
  appsyncTranslationJobs.delete(jobId);
  microserviceTranslationJobs.delete(jobId);
}

/** Re-interleave translated text blocks with the preserved SSML break tags. */
function reassembleBreaks(
  tokens: TextToken[],
  sentencesPerToken: string[][],
  translations: string[],
): string {
  let cursor = 0;
  const pieces: string[] = [];
  tokens.forEach((tok, i) => {
    if (tok.type === 'break') {
      pieces.push(tok.content);
      return;
    }
    const n = sentencesPerToken[i].length;
    const joined = translations.slice(cursor, cursor + n).join(' ').trim();
    cursor += n;
    if (joined) pieces.push(joined);
  });
  return pieces.join('\n\n');
}

// --- Stub API ---

function stubRequestTranslation(
  segmentId: string,
  text: string,
  _sourceLang: string,
  targetLang: string,
  provider: TranslationProvider,
): TranslationResult {
  // Simulate provider unavailable
  if (stubProviderDown.get(provider)) {
    logger.error(SERVICE_NAME, 'Stub provider unavailable', { provider, segmentId });
    return {
      jobId: '',
      status: 'failed',
      translatedText: null,
      provider,
      costProvider: null,
      costCharged: null,
      errorCode: 2609,
    };
  }

  const jobId = `trans-${Date.now()}-${segmentId}`;
  stubJobs.set(jobId, {
    segmentId,
    text,
    targetLang,
    provider,
    startedAt: Date.now(),
    durationMs: provider === 'marianmt' ? 3000 : 2000,
  });

  logger.info(SERVICE_NAME, 'Stub translation triggered', { jobId, segmentId, provider, targetLang });

  // Le moteur de langue est asynchrone comme les autres : la demande rend un
  // `jobId`, le sondage rend le texte. Un bouchon terminal masquerait le
  // transport réel — c'est-à-dire précisément ce que la revue a corrigé.
  return {
    jobId,
    status: 'processing',
    translatedText: null,
    provider,
    costProvider: null,
    costCharged: null,
  };
}

/**
 * Traduction bouchon du moteur de langue : le balisage `<break/>` de la source
 * est reporté à l'identique, au même endroit. Sans cela, le bouchon produirait
 * une sortie que le contrôle de balisage rejetterait — un faux échec en mode
 * démonstration.
 */
function stubLlmTranslation(text: string, targetLang: string): string {
  // Le bouchon remplaçait chaque bloc par une chaîne FIXE : la parité de
  // paragraphes et le rapport de longueur s'effondraient, et il ne « marchait »
  // que parce que le chemin bouchonné n'exécute jamais le vérificateur. Il
  // conserve désormais la structure — mêmes blocs, mêmes balises, longueur
  // voisine — et passerait les contrôles de sortie de la Lambda.
  const marque = `[${targetLang.toUpperCase()}] `;
  return text
    .split(/(\n\s*\n)/)
    .map((bloc) =>
      bloc.trim() && !/^<break\b/.test(bloc.trim()) ? `${marque}${bloc.trim()}` : bloc,
    )
    .join('');
}

function stubGetStatus(jobId: string): TranslationResult | null {
  const job = stubJobs.get(jobId);
  if (!job) return null;

  const elapsed = Date.now() - job.startedAt;

  if (elapsed < job.durationMs) {
    return {
      jobId,
      status: 'processing',
      translatedText: null,
      provider: job.provider,
      costProvider: null,
      costCharged: null,
    };
  }

  // Le moteur de langue est terminal : même sortie qu'à la demande, balisage
  // reporté, et aucun coût inventé (il ne vient que des jetons rendus).
  if (job.provider === LLM_PROVIDER) {
    return {
      jobId,
      status: 'completed',
      translatedText: stubLlmTranslation(job.text, job.targetLang),
      provider: job.provider,
      costProvider: null,
      costCharged: null,
    };
  }

  const translatedText = STUB_TRANSLATIONS[job.targetLang]?.default
    ?? `[${job.targetLang.toUpperCase()}] ${job.text.substring(0, 100)}...`;

  const cost = job.provider === 'marianmt' ? 0 : Math.ceil(job.text.length * 0.002);
  const margin = job.provider === 'marianmt' ? 1 : 3;

  return {
    jobId,
    status: 'completed',
    translatedText,
    provider: job.provider,
    costProvider: cost,
    costCharged: cost * margin,
  };
}

/**
 * Ordre de grandeur du préfixe système du moteur de langue, en jetons.
 *
 * Dérivé de sa LONGUEUR RÉELLE (épinglée par l'épreuve de portage) divisée par
 * `CARACTERES_PAR_JETON`. Ce n'est qu'une estimation d'avant-achat : le préfixe
 * est compté PLEIN, sans escompte de cache, parce qu'aucune économie de cache
 * n'a été constatée — et qu'aucune absence d'économie ne l'a été non plus.
 */
export const JETONS_PROMPT_SYSTEME = 1015;

/**
 * Marge appliquée à l'ESTIMATION affichée avant achat. La marge RÉELLE est lue
 * dans SSM par le serveur (`/tourguide/translation_margin_multiplier`) ; les
 * deux peuvent diverger, et c'est le serveur qui fait foi.
 */
const MARGE_ESTIMATION = 3;

function stubEstimateCost(
  text: string,
  provider: TranslationProvider,
): CostEstimate {
  const charCount = text.length;

  if (provider === 'marianmt') {
    return { provider, charCount, costProvider: 0, costCharged: 0, isFree: true };
  }

  // Moteur de langue : le coût RÉEL vient des jetons rendus par l'API et de
  // rien d'autre — c'est le serveur qui le calcule, sur `usage`. Ce qui suit
  // n'est qu'une ESTIMATION d'avant-achat, et elle passe quand même par des
  // jetons : ~3,5 caractères par jeton, plus le prompt système facturé PLEIN
  // (≈ 950 jetons), sans escompte de cache — on ne suppose pas une économie
  // qu'on n'a pas constatée. Tarif Haiku 4.5 : 1 $/M en entrée, 5 $/M en sortie.
  if (provider === LLM_PROVIDER) {
    const jetonsEntree = Math.ceil(charCount / CARACTERES_PAR_JETON) + JETONS_PROMPT_SYSTEME;
    const jetonsSortie = Math.ceil((charCount / CARACTERES_PAR_JETON) * 1.15);
    const costProvider = Math.ceil((jetonsEntree * 100 + jetonsSortie * 500) / 1_000_000);
    return {
      provider,
      charCount,
      costProvider,
      costCharged: costProvider * MARGE_ESTIMATION,
      isFree: false,
    };
  }

  // DeepL: ~0.002€/char, OpenAI: ~0.003€/char (in centimes)
  const ratePerChar = provider === 'deepl' ? 0.002 : 0.003;
  const costProvider = Math.ceil(charCount * ratePerChar);
  const costCharged = costProvider * 3; // default margin x3

  return { provider, charCount, costProvider, costCharged, isFree: false };
}

// --- Public API ---

export async function requestTranslation(
  segmentId: string,
  text: string,
  sourceLang: string,
  targetLang: string,
  qualityTier: QualityTier,
  options?: TranslationRequestOptions,
): Promise<TranslationResult> {
  const engine: TranslationEngine = options?.engine ?? 'tier';

  // Le moteur est demandé, jamais déduit : sans `engine: 'llm'`, la dérivation
  // par palier reste exactement celle d'avant.
  let provider = getProviderForRequest(qualityTier, engine);

  // Premium languages force deepl even if standard tier.
  // Ne vaut que pour la dérivation par palier : un moteur demandé nommément
  // n'est pas remplacé en silence par un autre.
  if (engine === 'tier' && isLanguagePremium(targetLang) && provider === 'marianmt') {
    logger.warn(SERVICE_NAME, 'Premium language override: forcing deepl', { targetLang, qualityTier });
    provider = 'deepl';
  }

  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 300));
    return stubRequestTranslation(segmentId, text, sourceLang, targetLang, provider);
  }

  // Real mode: route to microservice or Lambda based on provider.
  // Le choix est EXPLICITE, chemin par chemin. Il l'était par défaut — « si
  // marianmt, microservice ; sinon AppSync » — et un nom de moteur nouveau
  // aurait basculé tout son trafic sur AppSync sans que personne l'écrive.
  try {
    if (provider === 'marianmt') {
      // Preserve SSML <break/> tags: translate only text blocks, keep tags in place.
      // All sentences across all text blocks go in ONE batched request (~8x faster
      // than one call per sentence on CPU).
      const tokens = tokenizeWithBreaks(text);
      const sentencesPerToken: string[][] = tokens.map((tok) =>
        tok.type === 'break' ? [] : splitIntoSentences(tok.content.trim()).filter(Boolean),
      );
      const flat: string[] = sentencesPerToken.flat();

      // No translatable text (e.g. only break tags) → return source unchanged.
      if (flat.length === 0) {
        return { jobId: `trans-${Date.now()}-${segmentId}`, status: 'completed', translatedText: text, provider, costProvider: 0, costCharged: 0 };
      }

      // Async: submit the batch and return a job id. The microservice queues the
      // work (serialized inference) and we poll GET /v1/jobs/{id} via
      // getTranslationStatus, which re-interleaves the break tags on completion.
      const response = await submitMicroserviceJob('/v1/translate/batch', {
        texts: flat,
        source_lang: sourceLang,
        target_lang: targetLang,
      });

      // 429 = backpressure exhausted after retries; 503 = provider down. Both are
      // transient — surface 2609 so the scene stays flagged and can be retried.
      if (response.status === 429 || response.status === 503) {
        logger.error(SERVICE_NAME, 'Translation submit unavailable', { provider, status: response.status });
        return { jobId: '', status: 'failed', translatedText: null, provider, costProvider: null, costCharged: null, errorCode: 2609 };
      }

      const data = await response.json();
      if (!data.ok || !data.job_id) {
        const unavailable = data.error === 'provider_unavailable';
        logger.error(SERVICE_NAME, 'Translation submit failed', { provider, error: data.error });
        return {
          jobId: '', status: 'failed', translatedText: null, provider,
          costProvider: null, costCharged: null,
          ...(unavailable ? { errorCode: 2609 } : {}),
        };
      }

      // Stash the reassembly template so getTranslationStatus can rebuild the
      // text (with break tags) once the job finishes.
      microserviceTranslationJobs.set(data.job_id, { tokens, sentencesPerToken, provider });
      return {
        jobId: data.job_id,
        status: 'processing',
        translatedText: null,
        provider,
        costProvider: 0,
        costCharged: 0,
      };
    }

    // --- Troisième chemin : le moteur de langue ---------------------------
    // La Scène part ENTIÈRE, balisage `<break/>` compris. Ni découpage en
    // phrases, ni extraction des balises : c'est exactement ce que le chemin
    // MarianMT est obligé de faire, et c'est ce qui retire au modèle son seul
    // avantage — la cohérence d'un bout à l'autre de la Visite.
    //
    // TRANSPORT ASYNCHRONE : la mutation dépose une demande et rend un `jobId`
    // en quelques centaines de millisecondes ; `getTranslationStatus` sonde
    // ensuite `checkTranslation`. Un résolveur AppSync est coupé à 30 s, et la
    // Scène de 7 308 caractères n'y tient pas — en synchrone, le délai
    // remontait sans code nommé et le lot réessayait une Scène déjà payée.
    if (provider === LLM_PROVIDER) {
      // Le refus de langue double celui du serveur : il évite un aller-retour,
      // il ne s'y substitue pas.
      if (!isLlmPairSupported(sourceLang, targetLang)) {
        logger.error(SERVICE_NAME, 'LLM pair out of scope', { sourceLang, targetLang });
        return {
          jobId: '', status: 'failed', translatedText: null, provider,
          costProvider: null, costCharged: null, errorCode: 2406,
        };
      }
      // La propriété de la Scène est ce qui autorise la dépense côté serveur ;
      // sans `sceneId`, il refusera. On le dit ici plutôt que d'aller le faire
      // dire par un aller-retour.
      if (!options?.sceneId) {
        logger.error(SERVICE_NAME, 'LLM request without sceneId', { segmentId });
        return {
          jobId: '', status: 'failed', translatedText: null, provider,
          costProvider: null, costCharged: null, errorCode: 2624,
        };
      }

      const { getClient } = await import('@/lib/api/appsync-client');
      const client = getClient();
      const args = buildTranslationMutationArgs({
        segmentId, text, sourceLang, targetLang, provider,
        sceneId: options.sceneId,
        kind: options.kind,
        context: options.context,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).mutations.requestTranslation(args, {
        authMode: 'userPool',
      });
      const data = result?.data;
      if (!data) {
        const errorCode = classerEchecAppsync(result?.errors);
        logger.error(SERVICE_NAME, 'LLM translation returned no payload', {
          segmentId, targetLang, errorCode, errors: result?.errors,
        });
        return {
          jobId: '', status: 'failed', translatedText: null, provider,
          costProvider: null, costCharged: null, errorCode,
        };
      }
      // Le job est suivi ici pour que `getTranslationStatus` sache par où
      // sonder — et surtout pour qu'une expiration de sondage porte le VRAI
      // moteur, pas une étiquette par défaut.
      if (data.jobId && data.status !== 'completed' && data.status !== 'failed') {
        appsyncTranslationJobs.set(data.jobId, provider);
      }
      return {
        jobId: data.jobId ?? '',
        status: data.status ?? 'failed',
        translatedText: data.translatedText ?? null,
        // Le moteur rendu par le serveur fait foi : c'est lui qui sera écrit
        // dans `translationProvider` et relu par la certification.
        provider: (data.provider as TranslationProvider) ?? provider,
        costProvider: data.costProvider ?? null,
        costCharged: data.costCharged ?? null,
        ...(data.marge != null ? { marge: data.marge } : {}),
        ...(data.errorCode ? { errorCode: data.errorCode } : {}),
      };
    }

    // Premium providers: call Lambda
    if (provider === 'deepl' || provider === 'openai') {
      const { getClient } = await import('@/lib/api/appsync-client');
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).mutations.requestTranslation(
        buildTranslationMutationArgs({ segmentId, text, sourceLang, targetLang, provider }),
        { authMode: 'userPool' },
      );
      const data = result?.data;
      if (!data) {
        const errorCode = classerEchecAppsync(result?.errors);
        return {
          jobId: '', status: 'failed', translatedText: null, provider,
          costProvider: null, costCharged: null, errorCode,
        };
      }
      if (data.jobId && data.status !== 'completed' && data.status !== 'failed') {
        appsyncTranslationJobs.set(data.jobId, provider);
      }
      return {
        jobId: data.jobId ?? '',
        status: data.status ?? 'failed',
        translatedText: data.translatedText ?? null,
        provider,
        costProvider: data.costProvider ?? null,
        costCharged: data.costCharged ?? null,
        ...(data.errorCode ? { errorCode: data.errorCode } : {}),
      };
    }

    // Aucun chemin ne réclame ce moteur. Un échec nommé vaut mieux qu'un
    // routage par défaut : c'est le défaut que ce fichier vient de fermer.
    logger.error(SERVICE_NAME, 'No route for translation provider', { provider });
    return {
      jobId: '', status: 'failed', translatedText: null, provider,
      costProvider: null, costCharged: null, errorCode: 2404,
    };
  } catch (err) {
    logger.error(SERVICE_NAME, 'requestTranslation failed', { error: String(err) });
    return {
      jobId: '',
      status: 'failed',
      translatedText: null,
      provider,
      costProvider: null,
      costCharged: null,
    };
  }
}

export async function getTranslationStatus(
  jobId: string,
  /**
   * Le moteur que l'appelant a demandé. Sert UNIQUEMENT de dernier recours pour
   * étiqueter un échec : le repli valait `'claude'` en dur, ce qui réétiquetait
   * un job DeepL en Claude — la fausse étiquette que la story proscrit, avec un
   * autre défaut.
   */
  providerAttendu?: TranslationProvider,
): Promise<TranslationResult | null> {
  if (shouldUseStubs()) {
    return stubGetStatus(jobId);
  }

  // marianmt jobs run on the microservice: poll /v1/jobs/{id} and reassemble.
  const tracked = microserviceTranslationJobs.get(jobId);
  if (tracked) {
    const body = await pollMicroserviceJob(jobId);
    // Transient network error → keep the caller polling.
    if (!body) {
      return { jobId, status: 'processing', translatedText: null, provider: tracked.provider, costProvider: null, costCharged: null };
    }
    if (body.status === 'completed') {
      microserviceTranslationJobs.delete(jobId);
      const translations = Array.isArray(body.translations) ? (body.translations as string[]) : [];
      return {
        jobId,
        status: 'completed',
        translatedText: reassembleBreaks(tracked.tokens, tracked.sentencesPerToken, translations),
        provider: tracked.provider,
        costProvider: 0,
        costCharged: 0,
      };
    }
    if (body.status === 'failed') {
      microserviceTranslationJobs.delete(jobId);
      const unavailable = body.error === 'provider_unavailable' || body.error === 'busy';
      return {
        jobId, status: 'failed', translatedText: null, provider: tracked.provider,
        costProvider: null, costCharged: null,
        ...(unavailable ? { errorCode: 2609 } : {}),
      };
    }
    // queued | processing
    return { jobId, status: 'processing', translatedText: null, provider: tracked.provider, costProvider: null, costCharged: null };
  }

  // Les autres moteurs sont suivis par AppSync. `checkTranslation` existe
  // désormais sur l'API : c'est la moitié « query » du transport asynchrone, et
  // c'est aussi ce qui réparait le sondage cassé de deepl et d'openai.
  const suivi = appsyncTranslationJobs.get(jobId) ?? providerAttendu ?? null;
  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).queries.checkTranslation(
      { jobId },
      { authMode: 'userPool' },
    );
    const data = result?.data;
    if (!data) {
      const errorCode = classerEchecAppsync(result?.errors);
      logger.error(SERVICE_NAME, 'checkTranslation returned no payload', {
        jobId, errorCode, errors: result?.errors,
      });
      // Transitoire : on laisse l'appelant continuer à sonder. Sinon, on
      // conclut — un sondage qui tourne sur une erreur définitive fait perdre
      // une minute pour rien.
      if (errorCode === 2609) {
        return {
          jobId, status: 'processing', translatedText: null,
          provider: suivi ?? LLM_PROVIDER, costProvider: null, costCharged: null,
        };
      }
      appsyncTranslationJobs.delete(jobId);
      return {
        jobId, status: 'failed', translatedText: null,
        provider: suivi ?? LLM_PROVIDER, costProvider: null, costCharged: null, errorCode,
      };
    }
    if (data.status === 'completed' || data.status === 'failed') {
      appsyncTranslationJobs.delete(jobId);
    }
    return {
      jobId: data.jobId ?? jobId,
      status: data.status ?? 'failed',
      translatedText: data.translatedText ?? null,
      provider: (data.provider as TranslationProvider) ?? suivi ?? LLM_PROVIDER,
      costProvider: data.costProvider ?? null,
      costCharged: data.costCharged ?? null,
      ...(data.marge != null ? { marge: data.marge } : {}),
      ...(data.errorCode ? { errorCode: data.errorCode } : {}),
    };
  } catch (err) {
    logger.error(SERVICE_NAME, 'getTranslationStatus failed', { jobId, error: String(err) });
    return null;
  }
}

export async function estimateCost(
  text: string,
  provider: TranslationProvider,
): Promise<CostEstimate> {
  if (shouldUseStubs()) {
    return stubEstimateCost(text, provider);
  }

  // Real mode: cost calculation can be done client-side for estimates
  return stubEstimateCost(text, provider);
}

export async function checkMicroserviceHealth(): Promise<MicroserviceHealth> {
  if (shouldUseStubs()) {
    return {
      tts: !stubHealthGpuDown,
      translation: !stubHealthGpuDown,
      silence_detection: true,
    };
  }

  try {
    const response = await fetch(`${getMicroserviceUrl()}/health`, {
      headers: {
        ...(await getMicroserviceHeaders()),
        'ngrok-skip-browser-warning': 'true',
      },
      signal: AbortSignal.timeout(5000),
    });
    return await response.json();
  } catch {
    return { tts: false, translation: false, silence_detection: false };
  }
}

/**
 * Trigger batch translation for all scenes in a session across multiple target languages.
 * This kicks off the translation pipeline — results will be polled via getTranslationStatus.
 */
export async function triggerBatchTranslation(
  sessionId: string,
  sourceLang: string,
  targetLangs: string[],
): Promise<void> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 1000));
    logger.info('TranslationAPI', 'Batch translation triggered (stub)', { sessionId, sourceLang, targetLangs });
    return;
  }

  const response = await fetch(`${getMicroserviceUrl()}/v1/translate/batch`, {
    method: 'POST',
    headers: await getMicroserviceHeaders(),
    body: JSON.stringify({ session_id: sessionId, source_lang: sourceLang, target_langs: targetLangs }),
  });
  if (!response.ok) {
    throw new Error(`Batch translation request failed: ${response.status}`);
  }
  logger.info('TranslationAPI', 'Batch translation triggered', { sessionId, sourceLang, targetLangs });
}

// Re-export from shared config
import {
  getMicroserviceUrl,
  getMicroserviceHeaders,
  submitMicroserviceJob,
  pollMicroserviceJob,
} from './microservice-config';

/** Test-only: reset stub state */
export function __resetTranslationStubs(): void {
  stubJobs.clear();
  microserviceTranslationJobs.clear();
  appsyncTranslationJobs.clear();
  stubHealthGpuDown = false;
  stubProviderDown.clear();
}

/** Test-only: simulate GPU down */
export function __setStubGpuDown(down: boolean): void {
  stubHealthGpuDown = down;
}

/** Test-only: simulate a specific provider being unavailable */
export function __setStubProviderDown(provider: TranslationProvider, down: boolean): void {
  stubProviderDown.set(provider, down);
}

import type { QualityTier, PurchaseType, TranslationProvider } from '@/types/studio';

// --- Constants ---

export const EU_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'] as const;
export const PREMIUM_LANGUAGES = ['ja', 'zh', 'ko', 'ar', 'pt'] as const;

export interface LanguagePricing {
  purchaseType: PurchaseType;
  qualityTier: QualityTier;
  amountCents: number;
}

/** Pricing table (amounts in centimes) */
export const PRICING_TABLE: readonly LanguagePricing[] = [
  { purchaseType: 'single', qualityTier: 'standard', amountCents: 199 },
  { purchaseType: 'single', qualityTier: 'pro', amountCents: 299 },
  { purchaseType: 'pack_3', qualityTier: 'standard', amountCents: 499 },
  { purchaseType: 'pack_3', qualityTier: 'pro', amountCents: 699 },
  /** pack_all = all EU + all premium (4+3=7 langues). 12,99€. Multi-tier:
   *  EU langs are billed as Standard (MarianMT), premium as Pro (Deepl). */
  { purchaseType: 'pack_all', qualityTier: 'pro', amountCents: 1299 },
  { purchaseType: 'free_first', qualityTier: 'standard', amountCents: 0 },
  { purchaseType: 'free_first', qualityTier: 'pro', amountCents: 0 },
] as const;

/** Premium single pro price */
const PREMIUM_SINGLE_PRO_CENTS = 499;

// --- Error type ---

export interface ProviderRouterError {
  code: number;
  message: string;
}

// --- Functions ---

/**
 * Returns the translation provider for a given quality tier.
 * Standard -> marianmt, Pro -> deepl
 */
export function getProviderForTier(tier: QualityTier): TranslationProvider {
  return tier === 'standard' ? 'marianmt' : 'deepl';
}

// --- Troisième chemin : le moteur de langue (story 4) -----------------------

/**
 * Le moteur de langue porte son propre nom dans `translationProvider`.
 * Ni `openai`, ni `marianmt` : c'est ce champ que lit la certification pour
 * décider si un segment vient d'un moteur proscrit.
 */
export const LLM_PROVIDER: TranslationProvider = 'claude';

/**
 * Le moteur est DEMANDÉ, jamais déduit d'un palier.
 *
 * `'tier'` = comportement historique, inchangé : standard → marianmt,
 * pro → deepl. `'llm'` = le troisième chemin, et il faut l'écrire pour
 * l'obtenir. Aucun palier ne bascule tout seul : router par défaut vers un
 * moteur payant enverrait tout le trafic standard sur une facture.
 */
export type TranslationEngine = 'tier' | 'llm';

export function getProviderForRequest(
  tier: QualityTier,
  engine: TranslationEngine = 'tier',
): TranslationProvider {
  return engine === 'llm' ? LLM_PROVIDER : getProviderForTier(tier);
}

/**
 * Langues que le moteur de langue sait servir — les cinq cibles de
 * `content/translations/CONSIGNES.md` § Langues, depuis le français seul.
 *
 * Le refus côté portail double celui de la Lambda : il évite un aller-retour
 * réseau, il ne le remplace pas. Le contrôle qui fait autorité reste celui du
 * serveur, avant tout appel facturé.
 */
export const LLM_SOURCE_LANGUAGE = 'fr';
export const LLM_TARGET_LANGUAGES = ['en', 'es', 'de', 'it', 'nl'] as const;

/**
 * Rapport caractères/jeton, MIROIR de
 * `TourGuideApp/amplify/functions/translate-claude/contrat.ts`.
 *
 * Une seule grandeur, un seul nombre. Le portail portait `charCount / 3.5` et la
 * Lambda `source.length / 1.2` : un facteur trois sur la même quantité, dans une
 * story dont la thèse est précisément que l'estimation au caractère est le
 * défaut à corriger. L'égalité entre les deux dépôts est épinglée par l'épreuve
 * de portage.
 */
export const CARACTERES_PAR_JETON = 3.5;

/**
 * Budget de l'ouvrier de traduction, en millisecondes. MIROIR de
 * `TourGuideApp/amplify/functions/translate-claude/contrat.ts`.
 *
 * Le sondage du portail valait 60 s pour un ouvrier qui s'autorise 300 s : une
 * seule reprise sur 429 suffisait à faire annoncer « fournisseur indisponible »
 * au guide pendant que l'ouvrier travaillait — et que la facture courait.
 * L'épreuve de portage épingle l'égalité entre les deux dépôts.
 */
export const BUDGET_OUVRIER_MS = 300_000;

/** Nature du texte soumis au moteur de langue. */
export type LlmTextKind = 'scene' | 'title';

export function isLlmPairSupported(sourceLang: string, targetLang: string): boolean {
  return (
    sourceLang === LLM_SOURCE_LANGUAGE &&
    (LLM_TARGET_LANGUAGES as readonly string[]).includes(targetLang)
  );
}

/**
 * Returns true if the language is a premium language (no MarianMT support).
 */
export function isLanguagePremium(lang: string): boolean {
  return (PREMIUM_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * Une langue que le catalogue sait vendre — européenne ou premium.
 *
 * Le néerlandais est délibérément ABSENT des deux listes : le moteur de langue
 * sait le produire (`LLM_TARGET_LANGUAGES`), le catalogue ne sait pas encore le
 * vendre. Les deux périmètres sont distincts et le resteront tant que
 * l'ouverture n'aura pas été décidée.
 */
export function isLanguageInScope(lang: string): boolean {
  return (
    (EU_LANGUAGES as readonly string[]).includes(lang) ||
    (PREMIUM_LANGUAGES as readonly string[]).includes(lang)
  );
}

/**
 * Returns the price in centimes for a language purchase.
 * Premium languages with standard tier is an invalid combination (no MarianMT model).
 */
export function getPriceForLanguage(
  lang: string,
  tier: QualityTier,
  purchaseType: PurchaseType,
): { ok: true; value: number } | { ok: false; error: ProviderRouterError } {
  // free_first and manual are always 0.
  // AVANT le contrôle de périmètre, et pas après : une langue offerte coûte 0
  // quoi qu'il arrive, et la faire échouer en 2611 aurait cassé la première
  // langue gratuite au moment même où le périmètre s'élargit.
  if (purchaseType === 'free_first' || purchaseType === 'manual' || tier === 'manual') {
    return { ok: true, value: 0 };
  }

  // Une langue qui n'est dans AUCUNE des deux listes n'a pas de prix : la
  // tarifer depuis la table reviendrait à la vendre alors qu'elle n'est pas au
  // Périmètre. C'est le cas du néerlandais — cible du moteur de langue, mais
  // pas encore ouvert à la vente : l'ouvrir est une décision d'exploitation
  // (CAP-6), pas un effet de bord d'un tableau de prix.
  if (!isLanguageInScope(lang)) {
    return {
      ok: false,
      error: {
        code: 2611,
        message:
          `La langue « ${lang} » n'est ni au périmètre européen ni au périmètre premium : ` +
          "elle n'a pas de prix tant qu'elle n'est pas ouverte à la vente.",
      },
    };
  }

  const premium = isLanguagePremium(lang);

  // Premium + standard is invalid (MarianMT has no model for premium languages)
  if (premium && tier === 'standard') {
    return {
      ok: false,
      error: {
        code: 2609,
        message: `Premium language "${lang}" is not available with standard tier (MarianMT). Use pro tier instead.`,
      },
    };
  }

  // Premium single pro
  if (premium && purchaseType === 'single' && tier === 'pro') {
    return { ok: true, value: PREMIUM_SINGLE_PRO_CENTS };
  }

  // EU languages: lookup from pricing table
  const entry = PRICING_TABLE.find(
    (p) => p.purchaseType === purchaseType && p.qualityTier === tier,
  );

  if (!entry) {
    return {
      ok: false,
      error: {
        code: 2610,
        message: `No pricing found for purchaseType="${purchaseType}" tier="${tier}"`,
      },
    };
  }

  return { ok: true, value: entry.amountCents };
}

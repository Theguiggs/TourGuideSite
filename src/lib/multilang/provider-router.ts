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

/**
 * Returns true if the language is a premium language (no MarianMT support).
 */
export function isLanguagePremium(lang: string): boolean {
  return (PREMIUM_LANGUAGES as readonly string[]).includes(lang);
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
  // free_first and manual are always 0
  if (purchaseType === 'free_first' || purchaseType === 'manual' || tier === 'manual') {
    return { ok: true, value: 0 };
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

/**
 * Per-language pricing for the multilingual checkout.
 *
 * Unlike the legacy single-tier flow, the guide picks a mode PER language
 * (manual / standard / pro), so a polyglot guide can hand-translate the
 * languages they speak and automate the rest. This module computes the order
 * total from that per-language map, applying the same discounts as before:
 *  - free_first : first EU language in Standard auto is offered (once per guide)
 *  - pack_3     : 3+ paid EU Standard languages bundle to a flat price
 *  - pack_all   : all purchasable languages in auto → flat Pack Toutes price
 *
 * Premium languages (ja/zh/pt…) have no MarianMT model, so 'standard' is
 * coerced to 'pro' for them.
 */
import {
  EU_LANGUAGES,
  PREMIUM_LANGUAGES,
  PRICING_TABLE,
  isLanguagePremium,
} from './provider-router';

export type LangMode = 'manual' | 'standard' | 'pro';

/** Map of langCode → chosen mode. Languages absent from the map are not purchased. */
export type LangSelections = Record<string, LangMode>;

export type LineBilling = 'manual' | 'free_first' | 'single' | 'pack_3' | 'pack_all';

export interface MixedOrderLine {
  language: string;
  mode: LangMode;
  /** premium languages are billed as 'pro' regardless of the chosen mode */
  effectiveTier: 'manual' | 'standard' | 'pro';
  priceCents: number;
  billing: LineBilling;
}

export interface MixedOrder {
  lines: MixedOrderLine[];
  totalCents: number;
  /** true when the whole order collapsed to the flat Pack Toutes price */
  packAllApplied: boolean;
  /** number of extra languages that would need to switch to auto to unlock
   *  Pack Toutes (null when already applied or not relevant) */
  packAllMissing: number | null;
}

const SINGLE_EU_STANDARD = 199;
const SINGLE_EU_PRO = 299;
const SINGLE_PREMIUM_PRO = 499;
const PURCHASABLE_EU = ['en', 'es', 'de', 'it']; // fr is the base/source language
const PURCHASABLE_PREMIUM = ['ja', 'zh', 'pt'];

function packPrice(type: 'pack_3' | 'pack_all', tier: 'standard' | 'pro'): number {
  return PRICING_TABLE.find((p) => p.purchaseType === type && p.qualityTier === tier)?.amountCents ?? 0;
}

/**
 * Resolve the effective tier for a language given the chosen mode.
 * Premium languages always resolve to 'pro' (no MarianMT model).
 */
export function effectiveTierFor(lang: string, mode: LangMode): 'manual' | 'standard' | 'pro' {
  if (mode === 'manual') return 'manual';
  if (isLanguagePremium(lang)) return 'pro';
  return mode;
}

/** Unit price for a single auto language (before free_first/pack adjustments). */
function unitPrice(lang: string, tier: 'standard' | 'pro'): number {
  if (isLanguagePremium(lang)) return SINGLE_PREMIUM_PRO;
  return tier === 'standard' ? SINGLE_EU_STANDARD : SINGLE_EU_PRO;
}

export function computeMixedOrder(
  selections: LangSelections,
  freeLanguageUsed: boolean,
): MixedOrder {
  const langs = Object.keys(selections);
  if (langs.length === 0) {
    return { lines: [], totalCents: 0, packAllApplied: false, packAllMissing: null };
  }

  const autoLangs = langs.filter((l) => selections[l] !== 'manual');
  const euAuto = autoLangs.filter((l) => (EU_LANGUAGES as readonly string[]).includes(l) && l !== 'fr');
  const premiumAuto = autoLangs.filter((l) => isLanguagePremium(l));

  // ─── Pack Toutes: all purchasable langs in auto → flat 12,99€ ───
  const allEuAuto = PURCHASABLE_EU.every((l) => euAuto.includes(l));
  const allPremiumAuto = PURCHASABLE_PREMIUM.every((l) => premiumAuto.includes(l));
  if (allEuAuto && allPremiumAuto) {
    const flat = packPrice('pack_all', 'pro');
    const lines: MixedOrderLine[] = langs.map((lang, idx) => {
      const mode = selections[lang];
      if (mode === 'manual') {
        return { language: lang, mode, effectiveTier: 'manual', priceCents: 0, billing: 'manual' };
      }
      return {
        language: lang,
        mode,
        effectiveTier: effectiveTierFor(lang, mode),
        priceCents: idx === firstAutoIndex(langs, selections) ? flat : 0,
        billing: 'pack_all',
      };
    });
    return { lines, totalCents: flat, packAllApplied: true, packAllMissing: 0 };
  }

  // ─── Per-language pricing with free_first + pack_3 (EU standard) ───
  const lines: MixedOrderLine[] = [];
  let freeApplied = freeLanguageUsed;

  // EU-standard auto languages that will actually be paid (after free_first)
  const euStandardAuto = euAuto.filter((l) => selections[l] === 'standard');
  // free_first consumes the first EU-standard auto language
  const freeFirstLang =
    !freeApplied && euStandardAuto.length > 0 ? euStandardAuto[0] : null;
  const paidEuStandard = euStandardAuto.filter((l) => l !== freeFirstLang);
  const pack3Applies = paidEuStandard.length >= 3;
  const pack3LangsSet = new Set(pack3Applies ? paidEuStandard.slice(0, 3) : []);

  for (const lang of langs) {
    const mode = selections[lang];
    if (mode === 'manual') {
      lines.push({ language: lang, mode, effectiveTier: 'manual', priceCents: 0, billing: 'manual' });
      continue;
    }
    const tier = effectiveTierFor(lang, mode) as 'standard' | 'pro';

    if (lang === freeFirstLang) {
      freeApplied = true;
      lines.push({ language: lang, mode, effectiveTier: tier, priceCents: 0, billing: 'free_first' });
      continue;
    }
    if (pack3LangsSet.has(lang)) {
      lines.push({ language: lang, mode, effectiveTier: tier, priceCents: 0, billing: 'pack_3' });
      continue;
    }
    lines.push({ language: lang, mode, effectiveTier: tier, priceCents: unitPrice(lang, tier), billing: 'single' });
  }

  // Total: pack_3 flat (if applied) + sum of singles
  let total = 0;
  if (pack3Applies) total += packPrice('pack_3', 'standard');
  for (const line of lines) {
    if (line.billing === 'single') total += line.priceCents;
  }

  // How many more auto languages to unlock Pack Toutes? (only hint when close)
  const totalAutoNeeded = PURCHASABLE_EU.length + PURCHASABLE_PREMIUM.length; // 7
  const missing = totalAutoNeeded - autoLangs.length;
  const packAllMissing = missing > 0 && missing <= 3 ? missing : null;

  return { lines, totalCents: total, packAllApplied: false, packAllMissing };
}

/** Index of the first auto (non-manual) language in the list — used to place the pack price. */
function firstAutoIndex(langs: string[], selections: LangSelections): number {
  return langs.findIndex((l) => selections[l] !== 'manual');
}

/** Re-export for convenience. */
export { PURCHASABLE_EU, PURCHASABLE_PREMIUM, PREMIUM_LANGUAGES };

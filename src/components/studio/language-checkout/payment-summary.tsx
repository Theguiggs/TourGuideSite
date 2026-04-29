'use client';

import type { QualityTier, PurchaseType } from '@/types/studio';
import {
  getPriceForLanguage,
  isLanguagePremium,
  EU_LANGUAGES,
  PRICING_TABLE,
} from '@/lib/multilang/provider-router';
import { LANGUAGE_CONFIG, formatPrice } from './language-checkbox-card';

// --- Types ---

export interface OrderLine {
  language: string;
  label: string;
  priceCents: number;
  purchaseType: PurchaseType;
}

export interface OrderTotal {
  lines: OrderLine[];
  totalCents: number;
}

// --- Helpers ---

/** Check if guide is eligible for free first language — Standard tier only, EU languages only */
export function isFreeFirstEligible(freeLanguageUsed: boolean, qualityTier: QualityTier): boolean {
  return !freeLanguageUsed && qualityTier === 'standard';
}

// --- Compute order total ---

export function computeOrderTotal(
  selectedLanguages: string[],
  qualityTier: QualityTier,
  freeLanguageUsed: boolean,
): OrderTotal {
  if (selectedLanguages.length === 0) {
    return { lines: [], totalCents: 0 };
  }

  // Manual tier: all languages are free
  if (qualityTier === 'manual') {
    const lines: OrderLine[] = selectedLanguages.map((lang) => {
      const config = LANGUAGE_CONFIG.find((c) => c.code === lang);
      return { language: lang, label: config?.label ?? lang, priceCents: 0, purchaseType: 'manual' as const };
    });
    return { lines, totalCents: 0 };
  }

  const lines: OrderLine[] = [];
  let freeApplied = freeLanguageUsed;

  // Separate EU and premium languages
  const euLangs = selectedLanguages.filter((l) =>
    (EU_LANGUAGES as readonly string[]).includes(l),
  );
  const premiumLangs = selectedLanguages.filter((l) => isLanguagePremium(l));

  // Count how many EU languages will actually be paid (exclude free first)
  // Free first only applies in Standard tier for EU languages
  const firstLangIsEuFree =
    !freeApplied &&
    qualityTier === 'standard' &&
    selectedLanguages.length > 0 &&
    (EU_LANGUAGES as readonly string[]).includes(selectedLanguages[0]);
  const paidEuCount = firstLangIsEuFree ? euLangs.length - 1 : euLangs.length;

  // Determine if pack applies (3+ PAID EU languages)
  const packApplies = paidEuCount >= 3;
  const packEntry = PRICING_TABLE.find(
    (p) => p.purchaseType === 'pack_3' && p.qualityTier === qualityTier,
  );
  const packPrice = packEntry?.amountCents ?? 0;

  // Process languages in selection order
  for (const lang of selectedLanguages) {
    const config = LANGUAGE_CONFIG.find((c) => c.code === lang);
    const label = config?.label ?? lang;
    const premium = isLanguagePremium(lang);
    const isEu = (EU_LANGUAGES as readonly string[]).includes(lang);

    // Free first language — Standard tier only, EU languages only
    if (!freeApplied && qualityTier === 'standard' && isEu) {
      freeApplied = true;
      lines.push({ language: lang, label, priceCents: 0, purchaseType: 'free_first' });
      continue;
    }

    // Premium: always single pro
    if (premium) {
      const result = getPriceForLanguage(lang, 'pro', 'single');
      lines.push({
        language: lang,
        label,
        priceCents: result.ok ? result.value : 0,
        purchaseType: 'single',
      });
      continue;
    }

    // EU language with pack
    if (isEu && packApplies) {
      // Count how many EU languages already added (non-free)
      const euLinesAdded = lines.filter(
        (line) =>
          line.purchaseType === 'pack_3' &&
          (EU_LANGUAGES as readonly string[]).includes(line.language),
      ).length;

      if (euLinesAdded < 3) {
        // Part of the pack: distribute pack price across 3 languages
        // We show pack_3 type — the total pack price is added once (first EU in pack)
        // For display clarity: first EU in pack shows full pack price, others show 0
        // Actually simpler: mark all as pack_3, compute total from pack price
        lines.push({ language: lang, label, priceCents: 0, purchaseType: 'pack_3' });
        continue;
      }
    }

    // Regular single price
    const result = getPriceForLanguage(lang, qualityTier, 'single');
    lines.push({
      language: lang,
      label,
      priceCents: result.ok ? result.value : 0,
      purchaseType: 'single',
    });
  }

  // Compute total
  let totalCents = 0;

  // Count pack_3 lines (EU languages in pack)
  const packLines = lines.filter((l) => l.purchaseType === 'pack_3');
  if (packLines.length > 0) {
    totalCents += packPrice;
  }

  // Sum non-pack lines (excluding free_first which is 0)
  for (const line of lines) {
    if (line.purchaseType === 'single') {
      totalCents += line.priceCents;
    }
  }

  return { lines, totalCents };
}

// --- Props ---

export interface PaymentSummaryProps {
  selectedLanguages: string[];
  qualityTier: QualityTier;
  freeLanguageUsed: boolean;
  sceneCount: number;
  onPay: () => void;
  isLoading: boolean;
}

// --- Component ---

export function PaymentSummary({
  selectedLanguages,
  qualityTier,
  freeLanguageUsed,
  sceneCount,
  onPay,
  isLoading,
}: PaymentSummaryProps) {
  const order = computeOrderTotal(selectedLanguages, qualityTier, freeLanguageUsed);
  const hasLanguages = selectedLanguages.length > 0;

  // Button text
  let buttonText: string;
  if (!hasLanguages) {
    buttonText = 'S\u00E9lectionnez une langue';
  } else if (qualityTier === 'manual') {
    buttonText = 'Ajouter les langues (gratuit)';
  } else if (order.totalCents === 0) {
    buttonText = 'Traduire gratuitement';
  } else {
    buttonText = `Payer et traduire \u2014 ${formatPrice(order.totalCents)}`;
  }

  // Button aria-label
  const buttonAriaLabel = !hasLanguages
    ? 'S\u00E9lectionnez au moins une langue pour continuer'
    : qualityTier === 'manual'
      ? 'Ajouter les langues pour traduire manuellement'
      : order.totalCents === 0
        ? 'Traduire gratuitement'
        : `Payer ${formatPrice(order.totalCents)} et lancer la traduction`;

  return (
    <div data-testid="payment-summary" className="rounded-lg border border-line bg-white p-4 space-y-4">
      {/* Subtitle */}
      {hasLanguages && (
        <p className="text-sm text-ink-80" data-testid="payment-subtitle">
          Vos {sceneCount} sc&egrave;nes seront traduites et l&apos;audio g&eacute;n&eacute;r&eacute;
          automatiquement (~2 min par langue)
        </p>
      )}

      {/* Line items */}
      {order.lines.length > 0 && (
        <ul className="space-y-2" data-testid="payment-lines">
          {order.lines.map((line) => (
            <li
              key={line.language}
              className="flex items-center justify-between text-sm"
              data-testid={`payment-line-${line.language}`}
            >
              <span className="text-ink-80">{line.label}</span>
              <span className="font-medium text-ink">
                {line.purchaseType === 'free_first' ? (
                  <span className="text-grenadine" data-testid="free-first-badge">
                    Gratuit &mdash; premi&egrave;re langue offerte !
                  </span>
                ) : line.purchaseType === 'pack_3' ? (
                  <span className="text-grenadine">Pack</span>
                ) : (
                  formatPrice(line.priceCents)
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Total */}
      <div
        className="flex items-center justify-between border-t border-line pt-3"
        aria-live="polite"
        data-testid="payment-total"
      >
        <span className="text-sm font-semibold text-ink">Total</span>
        <span className="text-lg font-bold text-ink">
          {hasLanguages ? formatPrice(order.totalCents) : '\u2014'}
        </span>
      </div>

      {/* Pay button */}
      <button
        type="button"
        onClick={onPay}
        disabled={!hasLanguages || isLoading}
        aria-disabled={!hasLanguages || isLoading || undefined}
        aria-label={buttonAriaLabel}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-grenadine focus-visible:ring-offset-2 ${
          !hasLanguages || isLoading
            ? 'bg-paper-deep text-ink-40 cursor-not-allowed'
            : 'bg-grenadine text-white hover:opacity-90 active:bg-grenadine'
        }`}
        data-testid="pay-button"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Traitement en cours...
          </span>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}

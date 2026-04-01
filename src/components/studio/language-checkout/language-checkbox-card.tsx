'use client';

import type { QualityTier, PurchaseType } from '@/types/studio';

// --- Language config ---

/** ISO 3166-1 alpha-2 country code for flag display (lowercase) */
export const LANG_TO_COUNTRY: Record<string, string> = {
  en: 'gb',
  es: 'es',
  de: 'de',
  it: 'it',
  ja: 'jp',
  zh: 'cn',
  pt: 'pt',
  fr: 'fr',
  ko: 'kr',
  ar: 'sa',
};

export const LANGUAGE_CONFIG = [
  { code: 'fr', label: 'Fran\u00E7ais', countryCode: 'fr' },
  { code: 'en', label: 'English', countryCode: 'gb' },
  { code: 'es', label: 'Espa\u00f1ol', countryCode: 'es' },
  { code: 'de', label: 'Deutsch', countryCode: 'de' },
  { code: 'it', label: 'Italiano', countryCode: 'it' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E', countryCode: 'jp' },
  { code: 'zh', label: '\u4E2D\u6587', countryCode: 'cn' },
  { code: 'pt', label: 'Portugu\u00EAs', countryCode: 'pt' },
] as const;

// --- Price formatter ---

export function formatPrice(amountCents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amountCents / 100);
}

// --- Props ---

export interface LanguageCheckboxCardProps {
  langCode: string;
  langLabel: string;
  countryCode: string;
  priceCents: number | null;
  checked: boolean;
  onToggle: (langCode: string, checked: boolean) => void;
  isBaseLanguage?: boolean;
  isPurchased?: boolean;
  purchasedTier?: QualityTier | null;
  purchasedType?: PurchaseType | null;
  isPremiumDisabled?: boolean;
  currentTier: QualityTier;
}

export function LanguageCheckboxCard({
  langCode,
  langLabel,
  countryCode,
  priceCents,
  checked,
  onToggle,
  isBaseLanguage = false,
  isPurchased = false,
  purchasedTier = null,
  purchasedType = null,
  isPremiumDisabled = false,
  currentTier,
}: LanguageCheckboxCardProps) {
  // Manual purchases can be toggled (removed), paid purchases cannot
  const isPaidPurchase = isPurchased && purchasedType !== 'manual';
  const isDisabled = isBaseLanguage || isPaidPurchase || isPremiumDisabled;

  const handleClick = () => {
    if (isDisabled) return;
    onToggle(langCode, !checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(langCode, !checked);
    }
  };

  // Build aria-label
  let ariaLabel = langLabel;
  if (isBaseLanguage) {
    ariaLabel = `${langLabel}, langue de base`;
  } else if (isPurchased) {
    const tierLabel = purchasedTier === 'pro' ? 'Pro' : purchasedTier === 'standard' ? 'Standard' : '';
    ariaLabel = tierLabel
      ? `${langLabel}, d\u00e9j\u00e0 achet\u00e9e (${tierLabel})`
      : `${langLabel}, d\u00e9j\u00e0 achet\u00e9e`;
  } else if (isPremiumDisabled) {
    ariaLabel = `${langLabel}, disponible en Pro uniquement`;
  } else if (priceCents !== null) {
    ariaLabel = `${langLabel}, ${formatPrice(priceCents)}`;
  }

  // Card styles
  let cardClasses =
    'relative flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer';

  if (isBaseLanguage) {
    cardClasses += ' bg-teal-50 border-teal-300 cursor-default';
  } else if (isPurchased) {
    cardClasses += ' bg-gray-50 border-gray-300 opacity-60 cursor-default';
  } else if (isPremiumDisabled) {
    cardClasses += ' bg-white border-gray-200 opacity-50 cursor-not-allowed';
  } else if (checked) {
    cardClasses += ' bg-white border-teal-400 ring-1 ring-teal-400';
  } else {
    cardClasses += ' bg-white border-gray-200 hover:border-teal-400';
  }

  if (!isDisabled) {
    cardClasses += ' focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2';
  }

  return (
    <div
      role="checkbox"
      aria-checked={isBaseLanguage || isPurchased ? true : checked}
      aria-disabled={isDisabled || undefined}
      aria-label={ariaLabel}
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cardClasses}
      data-testid={`language-card-${langCode}`}
    >
      {/* Checkbox visual */}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          (checked || isBaseLanguage || isPurchased) && !isPremiumDisabled
            ? 'bg-teal-600 border-teal-600 text-white'
            : 'border-gray-300 bg-white'
        }`}
        aria-hidden="true"
      >
        {(checked || isBaseLanguage || isPurchased) && !isPremiumDisabled && (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Flag */}
      <img
        src={`https://flagcdn.com/w40/${countryCode}.png`}
        srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
        width="20"
        height="15"
        alt=""
        aria-hidden="true"
        className="shrink-0"
      />

      {/* Label + price */}
      <div className="flex flex-1 flex-col min-w-0">
        <span className="text-sm font-semibold text-gray-900 truncate">{langLabel}</span>
        {isBaseLanguage && (
          <span className="text-xs text-teal-700" data-testid={`base-badge-${langCode}`}>
            Langue de base
          </span>
        )}
        {isPurchased && (
          <span className="text-xs text-green-600 flex items-center gap-1" data-testid={`purchased-badge-${langCode}`}>
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {purchasedType === 'manual'
              ? 'Ajout\u00e9e (manuel)'
              : purchasedTier
                ? `Achet\u00e9e (${purchasedTier === 'pro' ? 'Pro' : 'Standard'})`
                : 'Achet\u00e9e'}
          </span>
        )}
        {isPremiumDisabled && (
          <span className="text-xs text-gray-400" data-testid={`premium-disabled-${langCode}`}>
            Disponible en Pro uniquement
          </span>
        )}
      </div>

      {/* Price */}
      {priceCents !== null && !isBaseLanguage && !isPurchased && (
        <span
          className={`text-sm font-medium shrink-0 ${
            isPremiumDisabled ? 'text-gray-400' : 'text-gray-700'
          }`}
        >
          {formatPrice(priceCents)}
        </span>
      )}
    </div>
  );
}

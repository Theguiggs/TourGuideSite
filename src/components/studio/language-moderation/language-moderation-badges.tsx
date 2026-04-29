'use client';

import type { TourLanguagePurchase, PurchaseModerationStatus } from '@/types/studio';

const STATUS_CONFIG: Record<PurchaseModerationStatus, { label: string; icon: string; className: string }> = {
  draft: { label: 'brouillon', icon: '', className: 'bg-paper-soft text-ink-80' },
  submitted: { label: 'en moderation', icon: '', className: 'bg-ocre-soft text-ocre' },
  approved: { label: 'publie', icon: '', className: 'bg-olive-soft text-success' },
  rejected: { label: 'refuse', icon: '', className: 'bg-grenadine-soft text-danger' },
  revision_requested: { label: 'revision', icon: '', className: 'bg-ocre-soft text-ocre' },
};

const REFUNDED_CONFIG = { label: 'rembourse', icon: '', className: 'bg-grenadine-soft text-grenadine' };

const LANG_LABELS: Record<string, string> = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  it: 'IT',
  de: 'DE',
  pt: 'PT',
  nl: 'NL',
  ja: 'JA',
  zh: 'ZH',
};

interface LanguageModerationBadgesProps {
  purchases: TourLanguagePurchase[];
  onLanguageClick?: (language: string) => void;
}

export function LanguageModerationBadges({ purchases, onLanguageClick }: LanguageModerationBadgesProps) {
  if (purchases.length === 0) {
    return (
      <span className="text-xs text-ink-40" data-testid="no-languages">
        Aucune langue
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="language-moderation-badges">
      {purchases.map((purchase) => {
        const config = purchase.status === 'refunded'
          ? REFUNDED_CONFIG
          : STATUS_CONFIG[purchase.moderationStatus] ?? STATUS_CONFIG.draft;
        const langLabel = LANG_LABELS[purchase.language] ?? purchase.language.toUpperCase();

        return (
          <button
            key={purchase.id}
            onClick={() => onLanguageClick?.(purchase.language)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${config.className}`}
            data-testid={`lang-badge-${purchase.language}`}
            title={`${langLabel} — ${config.label}`}
          >
            <span>{langLabel}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

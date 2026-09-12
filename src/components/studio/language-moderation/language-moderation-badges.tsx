'use client';

import type { TourLanguagePurchase, PurchaseModerationStatus } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const STATUS_CONFIG: Record<PurchaseModerationStatus, { label: string; labelEn: string; icon: string; className: string }> = {
  draft: { label: 'brouillon', labelEn: 'draft', icon: '', className: 'bg-paper-soft text-ink-80' },
  submitted: { label: 'en moderation', labelEn: 'in moderation', icon: '', className: 'bg-ocre-soft text-ocre-ink' },
  approved: { label: 'publié', labelEn: 'published', icon: '', className: 'bg-olive-soft text-success' },
  rejected: { label: 'refuse', labelEn: 'rejected', icon: '', className: 'bg-grenadine-soft text-danger' },
  revision_requested: { label: 'revision', labelEn: 'revision', icon: '', className: 'bg-ocre-soft text-ocre-ink' },
};

const REFUNDED_CONFIG = { label: 'rembourse', labelEn: 'refunded', icon: '', className: 'bg-grenadine-soft text-grenadine' };

interface LanguageModerationBadgesProps {
  purchases: TourLanguagePurchase[];
  onLanguageClick?: (language: string) => void;
}

export function LanguageModerationBadges({ purchases, onLanguageClick }: LanguageModerationBadgesProps) {
  const { t } = useStudioLocale();
  if (purchases.length === 0) {
    return (
      <span className="text-meta text-ink-40" data-testid="no-languages">
        {t('Aucune langue', 'No languages')}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="language-moderation-badges">
      {purchases.map((purchase) => {
        const config = purchase.status === 'refunded'
          ? REFUNDED_CONFIG
          : STATUS_CONFIG[purchase.moderationStatus] ?? STATUS_CONFIG.draft;
        const langLabel = purchase.language.toUpperCase();
        const statusLabel = t(config.label, config.labelEn);

        return (
          <button
            key={purchase.id}
            onClick={() => onLanguageClick?.(purchase.language)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-meta font-medium transition-opacity hover:opacity-80 ${config.className}`}
            data-testid={`lang-badge-${purchase.language}`}
            title={`${langLabel} — ${statusLabel}`}
          >
            <span>{langLabel}</span>
            <span>{statusLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

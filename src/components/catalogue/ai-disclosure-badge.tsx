import {
  AI_DISCLOSURE_COPY,
  isAiDevelopedTour,
  type AiDisclosureLocale,
} from '@/lib/catalogue/ai-disclosure';

interface AiDisclosureBadgeProps {
  tourId: string;
  locale?: AiDisclosureLocale;
  detailed?: boolean;
}

export function AiDisclosureBadge({
  tourId,
  locale = 'fr',
  detailed = false,
}: AiDisclosureBadgeProps) {
  if (!isAiDevelopedTour(tourId)) return null;

  const copy = AI_DISCLOSURE_COPY[locale];

  if (detailed) {
    return (
      <aside
        data-testid="ai-disclosure-detail"
        className="mb-5 rounded-xl border border-mer/30 bg-mer-soft px-4 py-3"
        aria-label={copy.badge}
      >
        <p className="text-body font-semibold text-ink">{copy.badge}</p>
        <p className="mt-1 text-body leading-relaxed text-ink-60">{copy.detail}</p>
      </aside>
    );
  }

  return (
    <span
      data-testid="ai-disclosure-badge"
      className="inline-flex items-center rounded-pill bg-mer-soft px-2 py-0.5 text-meta font-medium text-mer"
      title={copy.detail}
    >
      {copy.badge}
    </span>
  );
}

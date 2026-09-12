import type { QualityResult } from '@/lib/studio/quality-analyzer';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface QualityFeedbackProps {
  result: QualityResult | null;
}

export function QualityFeedback({ result }: QualityFeedbackProps) {
  const { t } = useStudioLocale();
  if (!result || !result.overall) return null;

  const isGood = result.overall === 'good';

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded text-body ${
        isGood ? 'bg-olive-soft text-success' : 'bg-ocre-soft text-ocre-ink'
      }`}
      role="status"
      data-testid="quality-feedback"
    >
      <span aria-hidden="true" className="text-h6">{isGood ? '✓' : '⚠'}</span>
      <div>
        <p className="font-medium">{isGood ? t('Bonne qualité', 'Good quality') : t('À améliorer', 'Needs improvement')}</p>
        <p className="text-meta opacity-75">{result.message}</p>
      </div>
    </div>
  );
}

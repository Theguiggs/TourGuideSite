import type { QualityResult } from '@/lib/studio/quality-analyzer';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface QualityFeedbackProps {
  result: QualityResult | null;
}

export function QualityFeedback({ result }: QualityFeedbackProps) {
  const { t, locale } = useStudioLocale();
  if (!result || !result.overall) return null;

  const isGood = result.overall === 'good';
  const message = locale === 'fr' ? result.message : result.details.peakClipping ? t('Saturation détectée — baissez le gain du micro', 'Clipping detected — reduce microphone gain')
    : result.details.averageVolume < -30 ? t('Volume trop bas — rapprochez-vous du micro', 'Volume too low — move closer to the microphone')
    : result.details.silenceRatio > 40 ? t('Trop de silence — vérifiez que le micro est actif', 'Too much silence — check that the microphone is active')
    : t('Qualité : Bonne', 'Quality: Good');

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
        <p className="text-meta opacity-75">{message}</p>
      </div>
    </div>
  );
}

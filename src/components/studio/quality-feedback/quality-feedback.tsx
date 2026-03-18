import type { QualityResult } from '@/lib/studio/quality-analyzer';

interface QualityFeedbackProps {
  result: QualityResult | null;
}

export function QualityFeedback({ result }: QualityFeedbackProps) {
  if (!result || !result.overall) return null;

  const isGood = result.overall === 'good';

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded text-sm ${
        isGood ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
      }`}
      role="status"
      data-testid="quality-feedback"
    >
      <span aria-hidden="true" className="text-lg">{isGood ? '✓' : '⚠'}</span>
      <div>
        <p className="font-medium">{isGood ? 'Bonne qualité' : 'À améliorer'}</p>
        <p className="text-xs opacity-75">{result.message}</p>
      </div>
    </div>
  );
}

import type { TranscriptionQuota } from '@/lib/api/transcription';

interface QuotaDisplayProps {
  quota: TranscriptionQuota | null;
}

export function QuotaDisplay({ quota }: QuotaDisplayProps) {
  if (!quota) return null;

  const percentage = Math.round((quota.usedMinutes / quota.limitMinutes) * 100);

  return (
    <div className="flex items-center gap-3 p-3 bg-paper-soft rounded-lg" data-testid="quota-display">
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-ink-80">Quota transcription</span>
          <span className={quota.isExceeded ? 'text-danger font-medium' : quota.isWarning ? 'text-ocre font-medium' : 'text-ink-80'}>
            {quota.usedMinutes} / {quota.limitMinutes} min
          </span>
        </div>
        <div className="w-full bg-paper-deep rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              quota.isExceeded ? 'bg-danger' : quota.isWarning ? 'bg-ocre' : 'bg-grenadine'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuenow={quota.usedMinutes}
            aria-valuemax={quota.limitMinutes}
            aria-label={`${quota.usedMinutes} minutes utilisées sur ${quota.limitMinutes}`}
          />
        </div>
      </div>
      {quota.isExceeded && (
        <span className="text-xs text-danger font-medium whitespace-nowrap" role="alert">
          Quota atteint
        </span>
      )}
      {quota.isWarning && !quota.isExceeded && (
        <span className="text-xs text-ocre font-medium whitespace-nowrap">
          Attention
        </span>
      )}
    </div>
  );
}

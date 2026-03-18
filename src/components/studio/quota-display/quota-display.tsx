import type { TranscriptionQuota } from '@/lib/api/transcription';

interface QuotaDisplayProps {
  quota: TranscriptionQuota | null;
}

export function QuotaDisplay({ quota }: QuotaDisplayProps) {
  if (!quota) return null;

  const percentage = Math.round((quota.usedMinutes / quota.limitMinutes) * 100);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid="quota-display">
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">Quota transcription</span>
          <span className={quota.isExceeded ? 'text-red-600 font-medium' : quota.isWarning ? 'text-amber-600 font-medium' : 'text-gray-600'}>
            {quota.usedMinutes} / {quota.limitMinutes} min
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              quota.isExceeded ? 'bg-red-500' : quota.isWarning ? 'bg-amber-500' : 'bg-teal-500'
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
        <span className="text-xs text-red-600 font-medium whitespace-nowrap" role="alert">
          Quota atteint
        </span>
      )}
      {quota.isWarning && !quota.isExceeded && (
        <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
          Attention
        </span>
      )}
    </div>
  );
}

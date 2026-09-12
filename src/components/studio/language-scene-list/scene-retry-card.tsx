'use client';

import { getErrorMessage } from '@/lib/multilang/batch-translation-service';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

// --- Types ---

export interface SceneRetryCardProps {
  sceneId: string;
  sceneTitle: string | null;
  errorCode: number;
  errorMessage: string;
  isRetrying: boolean;
  onRetry: (sceneId: string) => void;
}

// --- Component ---

export function SceneRetryCard({
  sceneId,
  sceneTitle,
  errorCode,
  errorMessage,
  isRetrying,
  onRetry,
}: SceneRetryCardProps) {
  const { t, locale } = useStudioLocale();
  const displayTitle = sceneTitle ?? `Scene ${sceneId}`;
  const readableError = getErrorMessage(errorCode, locale);

  return (
    <div
      data-testid={`scene-retry-card-${sceneId}`}
      className="rounded-lg border border-grenadine-soft bg-grenadine-soft p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-body font-medium text-ink">{displayTitle}</h4>
            <span
              data-testid={`badge-failed-${sceneId}`}
              className="inline-flex items-center rounded-pill bg-grenadine-soft px-2 py-0.5 text-meta font-medium text-danger"
            >
              {t('Echoue', 'Failed')}
            </span>
          </div>
          <p className="mt-1 text-body text-danger">{readableError}</p>
          {errorMessage && (
            <p className="mt-0.5 text-meta text-ink-60">{errorMessage}</p>
          )}
        </div>
        <button
          data-testid={`retry-button-${sceneId}`}
          type="button"
          disabled={isRetrying}
          onClick={() => onRetry(sceneId)}
          className="ml-4 inline-flex items-center rounded-md bg-danger px-3 py-1.5 text-body font-medium text-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRetrying ? (
            <>
              <svg
                data-testid={`spinner-${sceneId}`}
                className="mr-1.5 h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
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
              {t('En cours...', 'Retrying...')}
            </>
          ) : (
            t('Réessayer', 'Retry')
          )}
        </button>
      </div>
    </div>
  );
}

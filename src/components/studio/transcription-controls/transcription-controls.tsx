import type { TranscriptionStatus } from '@/types/studio';

interface TranscriptionControlsProps {
  sceneId: string;
  sceneTitle: string;
  transcriptionStatus: TranscriptionStatus | null;
  transcriptText: string | null;
  error: string | null;
  isQuotaExceeded: boolean;
  onTrigger: (sceneId: string) => void;
  onRetry: (sceneId: string) => void;
}

export function TranscriptionControls({
  sceneId,
  sceneTitle,
  transcriptionStatus,
  transcriptText,
  error,
  isQuotaExceeded,
  onTrigger,
  onRetry,
}: TranscriptionControlsProps) {
  // Already transcribed — show text
  if (transcriptionStatus === 'completed' && transcriptText) {
    return (
      <div className="mt-2 p-2 bg-grenadine-soft rounded text-sm text-ink-80" data-testid={`transcript-${sceneId}`}>
        <p className="text-xs font-medium text-grenadine mb-1">Texte transcrit :</p>
        <p className="line-clamp-2">{transcriptText}</p>
      </div>
    );
  }

  // Processing — spinner
  if (transcriptionStatus === 'processing') {
    return (
      <div className="mt-2 flex items-center gap-2 text-sm text-mer" data-testid={`transcribing-${sceneId}`}>
        <span className="animate-spin inline-block w-4 h-4 border-2 border-mer border-t-transparent rounded-full" aria-hidden="true" />
        Transcription en cours...
      </div>
    );
  }

  // Failed — error + retry
  if (transcriptionStatus === 'failed') {
    return (
      <div className="mt-2" data-testid={`failed-${sceneId}`}>
        <p className="text-sm text-danger mb-1">{error || 'Échec de la transcription.'}</p>
        <button
          onClick={() => onRetry(sceneId)}
          disabled={isQuotaExceeded}
          className="text-sm font-medium text-danger underline hover:opacity-80 disabled:text-ink-40 disabled:no-underline"
          data-testid={`retry-btn-${sceneId}`}
        >
          Relancer
        </button>
      </div>
    );
  }

  // Default — trigger button (for pending, null, or scenes without transcription)
  return (
    <button
      onClick={() => onTrigger(sceneId)}
      disabled={isQuotaExceeded}
      className="mt-2 text-sm font-medium text-grenadine hover:opacity-80 disabled:text-ink-40"
      data-testid={`trigger-btn-${sceneId}`}
      title={isQuotaExceeded ? 'Quota de transcription atteint' : `Transcrire ${sceneTitle}`}
    >
      {isQuotaExceeded ? 'Quota atteint' : 'Transcrire'}
    </button>
  );
}

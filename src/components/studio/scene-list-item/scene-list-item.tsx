import type { StudioScene } from '@/types/studio';
import type { SceneTranscriptionState } from '@/lib/stores/transcription-store';
import { getSceneStatusConfig } from '@/lib/api/studio';
import { TranscriptionControls } from '@/components/studio/transcription-controls';

interface SceneListItemProps {
  scene: StudioScene;
  isPlaying: boolean;
  onPlayToggle: (scene: StudioScene) => void;
  transcription?: SceneTranscriptionState | null;
  isQuotaExceeded?: boolean;
  onTriggerTranscription?: (sceneId: string) => void;
  onRetryTranscription?: (sceneId: string) => void;
}

export function SceneListItem({
  scene,
  isPlaying,
  onPlayToggle,
  transcription,
  isQuotaExceeded = false,
  onTriggerTranscription,
  onRetryTranscription,
}: SceneListItemProps) {
  const statusConfig = getSceneStatusConfig(scene.status);
  const hasAudio = !!scene.originalAudioKey;
  const showTranscriptionControls = hasAudio && onTriggerTranscription && onRetryTranscription;

  // Use transcription store status if available, else fall back to scene data
  const txStatus = transcription?.status ?? scene.transcriptionStatus;
  const txText = transcription?.transcriptText ?? scene.transcriptText;
  const txError = transcription?.error ?? null;

  return (
    <div
      className="p-3 rounded-lg border border-gray-200 hover:border-teal-200 transition-colors"
      data-testid={`scene-item-${scene.id}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
          {scene.sceneIndex + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {scene.title || `Scène ${scene.sceneIndex + 1}`}
          </p>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        {hasAudio && (
          <button
            onClick={() => onPlayToggle(scene)}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              isPlaying
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-100 text-gray-600 hover:bg-teal-100 hover:text-teal-700'
            }`}
            aria-label={isPlaying ? `Pause scène ${scene.sceneIndex + 1}` : `Écouter scène ${scene.sceneIndex + 1}`}
            data-testid={`play-btn-${scene.id}`}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        )}
      </div>

      {showTranscriptionControls && (
        <TranscriptionControls
          sceneId={scene.id}
          sceneTitle={scene.title || `Scène ${scene.sceneIndex + 1}`}
          transcriptionStatus={txStatus}
          transcriptText={txText}
          error={txError}
          isQuotaExceeded={isQuotaExceeded}
          onTrigger={onTriggerTranscription}
          onRetry={onRetryTranscription}
        />
      )}
    </div>
  );
}

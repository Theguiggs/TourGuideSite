'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { requestTTS } from '@/lib/api/tts';
import { useTTSStore, selectSegmentTTS } from '@/lib/stores/tts-store';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { shouldUseStubs } from '@/config/api-mode';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import type { SceneSegment } from '@/types/studio';

const SERVICE_NAME = 'TTSControls';

interface TTSControlsProps {
  segment: SceneSegment;
  text: string;
  language: string;
  gpuAvailable: boolean;
}

export function TTSControls({ segment, text, language, gpuAvailable }: TTSControlsProps) {
  const ttsState = useTTSStore(selectSegmentTTS(segment.id));
  const setSegmentStatus = useTTSStore((s) => s.setSegmentStatus);
  const startPolling = useTTSStore((s) => s.startPolling);

  const [isTriggering, setIsTriggering] = useState(false);

  const isProcessing = ttsState?.status === 'processing';
  const isCompleted = ttsState?.status === 'completed';
  const isFailed = ttsState?.status === 'failed';
  const hasText = text.length > 0;

  const handleGenerate = useCallback(async () => {
    if (!hasText || isTriggering) return;

    setIsTriggering(true);
    try {
      setSegmentStatus(segment.id, { status: 'processing', language });

      const result = await requestTTS(segment.id, text, language);

      if (result.status === 'completed') {
        setSegmentStatus(segment.id, {
          status: 'completed',
          audioKey: result.audioKey,
          language: result.language,
          durationMs: result.durationMs,
        });
        logger.info(SERVICE_NAME, 'TTS completed immediately', { segmentId: segment.id });
      } else if (result.status === 'processing' && result.jobId) {
        setSegmentStatus(segment.id, { jobId: result.jobId });
        startPolling(segment.id, result.jobId);
      } else {
        setSegmentStatus(segment.id, {
          status: 'failed',
          error: 'Échec de la génération audio.',
        });
      }
    } catch (err) {
      logger.error(SERVICE_NAME, 'TTS trigger failed', { error: String(err) });
      setSegmentStatus(segment.id, { status: 'failed', error: 'Erreur inattendue.' });
    } finally {
      setIsTriggering(false);
    }
  }, [hasText, isTriggering, segment.id, text, language, setSegmentStatus, startPolling]);

  const handlePlay = useCallback(async () => {
    if (!ttsState?.audioKey) return;
    try {
      const url = shouldUseStubs()
        ? ttsState.audioKey
        : await studioUploadService.getPlayableUrl(ttsState.audioKey);
      audioPlayerService.play(url);
    } catch (err) {
      logger.error(SERVICE_NAME, 'Failed to play TTS audio', { error: String(err) });
    }
  }, [ttsState?.audioKey]);

  if (!gpuAvailable) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg" data-testid="tts-gpu-unavailable">
        <p className="text-sm text-amber-700">Génération audio temporairement indisponible</p>
        <p className="text-xs text-amber-500 mt-1">Le service TTS nécessite un GPU — réessayez plus tard.</p>
      </div>
    );
  }

  if (!hasText) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center" data-testid="tts-no-text">
        Pas de texte disponible pour la génération audio.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="tts-controls">
      {/* Status indicator */}
      {isProcessing && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg animate-pulse" data-testid="tts-processing">
          <p className="text-sm text-blue-700">Génération audio en cours...</p>
          <p className="text-xs text-blue-500 mt-1">Langue : {language.toUpperCase()}</p>
        </div>
      )}

      {isFailed && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg" data-testid="tts-failed">
          <p className="text-sm text-red-700">{ttsState?.error ?? 'Échec de la génération.'}</p>
          <button
            onClick={handleGenerate}
            className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
            data-testid="tts-retry-btn"
          >
            Réessayer
          </button>
        </div>
      )}

      {isCompleted && ttsState?.audioKey && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg" data-testid="tts-completed">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Audio TTS généré</p>
              <p className="text-xs text-green-600 mt-0.5">
                Langue : {(ttsState.language ?? language).toUpperCase()}
                {ttsState.durationMs && ` | Durée : ${Math.round(ttsState.durationMs / 1000)}s`}
              </p>
            </div>
            <button
              onClick={handlePlay}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-4 rounded-lg transition-colors"
              data-testid="tts-play-btn"
            >
              Écouter
            </button>
          </div>
        </div>
      )}

      {/* Generate button */}
      {!isProcessing && !isCompleted && (
        <button
          onClick={handleGenerate}
          disabled={isTriggering}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          data-testid="tts-generate-btn"
        >
          {isTriggering ? 'Lancement...' : 'Générer l\'audio'}
        </button>
      )}

      {/* Re-generate if already completed */}
      {isCompleted && (
        <button
          onClick={handleGenerate}
          disabled={isTriggering}
          className="w-full border border-teal-300 text-teal-700 hover:bg-teal-50 font-medium py-2 rounded-lg text-sm transition-colors"
          data-testid="tts-regenerate-btn"
        >
          Regénérer l&apos;audio
        </button>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { requestTTS } from '@/lib/api/tts';
import { useTTSStore, selectSegmentTTS } from '@/lib/stores/tts-store';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { shouldUseStubs } from '@/config/api-mode';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import { SSMLToolbar } from '@/components/studio/ssml-toolbar';
import type { SceneSegment } from '@/types/studio';

const SERVICE_NAME = 'TTSControls';

interface TTSControlsProps {
  segment: SceneSegment;
  text: string;
  language: string;
  gpuAvailable: boolean;
  /** Called when the guide wants to save the TTS audio as the scene's audio */
  onSaveAsSceneAudio?: (audioDataUrl: string, language: string) => void;
}

export function TTSControls({ segment, text, language, gpuAvailable, onSaveAsSceneAudio }: TTSControlsProps) {
  const ttsState = useTTSStore(selectSegmentTTS(segment.id));
  const setSegmentStatus = useTTSStore((s) => s.setSegmentStatus);
  const startPolling = useTTSStore((s) => s.startPolling);

  const [isTriggering, setIsTriggering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editableText, setEditableText] = useState(text);
  const [showEditor, setShowEditor] = useState(false);
  const ttsTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync editable text when prop changes
  useEffect(() => { setEditableText(text); }, [text]);

  // Auto-save when TTS completes via polling (not just immediate completion)
  const autoSavedRef = useRef(false);
  useEffect(() => {
    if (ttsState?.status === 'completed' && ttsState.audioKey && onSaveAsSceneAudio && !autoSavedRef.current) {
      autoSavedRef.current = true;
      onSaveAsSceneAudio(ttsState.audioKey, ttsState.language ?? language);
    }
    if (ttsState?.status !== 'completed') {
      autoSavedRef.current = false;
    }
  }, [ttsState?.status, ttsState?.audioKey, ttsState?.language, language, onSaveAsSceneAudio]);

  const isProcessing = ttsState?.status === 'processing';
  const isCompleted = ttsState?.status === 'completed';
  const isFailed = ttsState?.status === 'failed';
  const hasText = editableText.length > 0;
  const hasSSML = /&lt;(break|prosody|emphasis)/.test(editableText) || /<(break|prosody|emphasis)/.test(editableText);

  const handleGenerate = useCallback(async () => {
    if (!hasText || isTriggering) return;

    setIsTriggering(true);
    try {
      setSegmentStatus(segment.id, { status: 'processing', language });

      const result = await requestTTS(segment.id, editableText, language);

      if (result.status === 'completed') {
        setSegmentStatus(segment.id, {
          status: 'completed',
          audioKey: result.audioKey,
          language: result.language,
          durationMs: result.durationMs,
        });
        // Auto-save audio to segment (no need for manual "Utiliser" button click)
        if (result.audioKey && onSaveAsSceneAudio) {
          onSaveAsSceneAudio(result.audioKey, result.language ?? language);
        }
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
  }, [hasText, isTriggering, segment.id, editableText, language, setSegmentStatus, startPolling]);

  const handlePlay = useCallback(async () => {
    if (!ttsState?.audioKey) return;
    try {
      // Data URLs (from microservice) are playable directly, S3 keys need signed URL
      const url = ttsState.audioKey.startsWith('data:')
        ? ttsState.audioKey
        : shouldUseStubs()
          ? ttsState.audioKey
          : await studioUploadService.getPlayableUrl(ttsState.audioKey);
      audioPlayerService.play(url);
    } catch (err) {
      logger.error(SERVICE_NAME, 'Failed to play TTS audio', { error: String(err) });
    }
  }, [ttsState?.audioKey]);

  if (!gpuAvailable) {
    return (
      <div className="p-4 bg-ocre-soft border border-ocre-soft rounded-lg" data-testid="tts-gpu-unavailable">
        <p className="text-sm text-ocre">Génération audio temporairement indisponible</p>
        <p className="text-xs text-ocre mt-1">Le service TTS nécessite un GPU — réessayez plus tard.</p>
      </div>
    );
  }

  if (!hasText) {
    return (
      <div className="p-4 bg-paper-soft rounded-lg text-sm text-ink-60 text-center" data-testid="tts-no-text">
        Pas de texte disponible pour la génération audio.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="tts-controls">
      {/* Status indicator */}
      {isProcessing && (
        <div className="p-3 bg-mer-soft border border-mer-soft rounded-lg animate-pulse" data-testid="tts-processing">
          <p className="text-sm text-mer">Génération audio en cours...</p>
          <p className="text-xs text-mer mt-1">Langue : {language.toUpperCase()}</p>
        </div>
      )}

      {isFailed && (
        <div className="p-3 bg-grenadine-soft border border-grenadine-soft rounded-lg" data-testid="tts-failed">
          <p className="text-sm text-danger">{ttsState?.error ?? 'Échec de la génération.'}</p>
          <button
            onClick={handleGenerate}
            className="mt-2 text-sm font-medium text-danger underline hover:opacity-80"
            data-testid="tts-retry-btn"
          >
            Réessayer
          </button>
        </div>
      )}

      {isCompleted && ttsState?.audioKey && (
        <div className="p-3 bg-olive-soft border border-olive-soft rounded-lg" data-testid="tts-completed">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-success">Audio TTS généré</p>
              <p className="text-xs text-success mt-0.5">
                Langue : {(ttsState.language ?? language).toUpperCase()}
                {ttsState.durationMs && ` | Durée : ${Math.round(ttsState.durationMs / 1000)}s`}
              </p>
            </div>
            <button
              onClick={handlePlay}
              className="bg-success hover:opacity-90 text-white text-xs font-medium py-1.5 px-4 rounded-lg transition"
              data-testid="tts-play-btn"
            >
              Écouter
            </button>
          </div>
        </div>
      )}

      {/* Text editor with SSML toolbar */}
      {!isProcessing && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="text-xs text-mer hover:opacity-80 font-medium"
              data-testid="toggle-ssml-editor"
            >
              {showEditor ? 'Masquer editeur' : 'Editer le texte / ajouter effets'}
            </button>
            {hasSSML && (
              <span className="text-[10px] bg-mer-soft text-mer px-1.5 py-0.5 rounded font-medium">SSML</span>
            )}
          </div>

          {showEditor && (
            <div className="space-y-1">
              <SSMLToolbar
                textareaRef={ttsTextareaRef}
                value={editableText}
                onChange={setEditableText}
              />
              <textarea
                ref={ttsTextareaRef}
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                rows={6}
                className="w-full p-2 border border-line rounded-lg text-sm text-ink leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-mer font-mono"
                placeholder="Texte pour la synthese vocale..."
                data-testid="tts-text-editor"
              />
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      {!isProcessing && !isCompleted && (
        <button
          onClick={handleGenerate}
          disabled={isTriggering || !hasText}
          className="w-full bg-grenadine hover:opacity-90 disabled:bg-paper-deep text-white font-medium py-2.5 rounded-lg text-sm transition"
          data-testid="tts-generate-btn"
        >
          {isTriggering ? 'Lancement...' : hasSSML ? 'Generer l\'audio (avec effets)' : 'Generer l\'audio'}
        </button>
      )}

      {/* Save as scene audio */}
      {isCompleted && ttsState?.audioKey && onSaveAsSceneAudio && (
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!ttsState.audioKey) return;
              setIsSaving(true);
              setSaved(false);
              try {
                onSaveAsSceneAudio(ttsState.audioKey, ttsState.language ?? language);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
                logger.info(SERVICE_NAME, 'Audio saved as scene audio', { segmentId: segment.id, language: ttsState.language });
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving || saved}
            className="flex-1 bg-mer hover:opacity-90 disabled:bg-paper-deep text-white font-medium py-2 rounded-lg text-sm transition"
            data-testid="tts-save-scene-btn"
          >
            {isSaving ? 'Sauvegarde...' : saved ? 'Sauvegarde !' : 'Utiliser comme audio de la scene'}
          </button>
        </div>
      )}
      {saved && (
        <p className="text-xs text-success text-center">Audio TTS enregistre comme audio de cette scene</p>
      )}

      {/* Re-generate if already completed */}
      {isCompleted && (
        <button
          onClick={handleGenerate}
          disabled={isTriggering}
          className="w-full border border-grenadine-soft text-grenadine hover:bg-grenadine-soft font-medium py-2 rounded-lg text-sm transition"
          data-testid="tts-regenerate-btn"
        >
          Regenerer l&apos;audio
        </button>
      )}
    </div>
  );
}

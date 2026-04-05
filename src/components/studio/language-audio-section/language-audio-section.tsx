'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { TTSControls } from '@/components/studio/tts-controls';
import { AudioRecorder } from '@/components/studio/audio-recorder';
import { AudioPlayerBar } from '@/components/studio/audio-player';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { updateSceneSegment, createSceneSegment } from '@/lib/api/studio';
import { shouldUseStubs } from '@/config/api-mode';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import type { SceneSegment, AudioSource } from '@/types/studio';

const SERVICE_NAME = 'LanguageAudioSection';

export interface LanguageAudioSectionProps {
  segment: SceneSegment;
  sessionId: string;
  targetLanguage: string;
  translatedText: string;
  gpuAvailable: boolean;
  /** Called after TTS or recording audio is saved to the segment */
  onAudioSaved?: () => void;
}

type ActiveTool = 'tts' | 'recorder' | null;

export function LanguageAudioSection({
  segment,
  sessionId,
  targetLanguage,
  translatedText,
  gpuAvailable,
  onAudioSaved,
}: LanguageAudioSectionProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [audioSource, setAudioSource] = useState<AudioSource | undefined>(segment.audioSource);
  const [audioKey, setAudioKey] = useState<string | null>(segment.audioKey);
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);

  // Resolve S3 key to playable signed URL when segment changes
  useEffect(() => {
    const key = audioKey ?? segment.audioKey;
    if (!key) { setPlayableUrl(null); return; }
    // Data URLs are directly playable
    if (key.startsWith('data:')) { setPlayableUrl(key); return; }
    // TTS markers are not playable
    if (key.startsWith('tts-')) { setPlayableUrl(null); return; }
    // S3 keys need a signed URL
    let cancelled = false;
    import('@/lib/studio/studio-upload-service').then(({ getPlayableUrl: getUrl }) => {
      getUrl(key).then(url => { if (!cancelled) setPlayableUrl(url); });
    }).catch(() => { if (!cancelled) setPlayableUrl(null); });
    return () => { cancelled = true; };
  }, [audioKey, segment.audioKey]);

  // --- TTS save callback ---

  // Track real segment ID (may change from pending to real)
  const realSegmentIdRef = useRef(segment.id);
  useEffect(() => {
    if (!segment.id.startsWith('pending-') || realSegmentIdRef.current.startsWith('pending-')) {
      realSegmentIdRef.current = segment.id;
    }
  }, [segment.id]);

  const handleTTSSave = useCallback(async (audioDataUrl: string, language: string) => {
    const segmentId = realSegmentIdRef.current;
    logger.info(SERVICE_NAME, 'Saving TTS audio to segment', { segmentId, language, isPending: segmentId.startsWith('pending-') });

    // Upload base64 data URL to S3 — never store raw base64 in AppSync (too large for DynamoDB)
    let audioKeyToStore = audioDataUrl;
    if (audioDataUrl.startsWith('data:')) {
      try {
        const { uploadAudio } = await import('@/lib/studio/studio-upload-service');
        // Convert data URL to Blob
        const response = await fetch(audioDataUrl);
        const blob = new Blob([await response.blob()], { type: 'audio/wav' });
        const sceneIndex = segment.segmentIndex ?? 0;
        // Use uploadAudio which handles auth + S3 path correctly
        const uploadResult = await uploadAudio(blob, sessionId, sceneIndex);
        if (uploadResult.ok) {
          audioKeyToStore = uploadResult.s3Key;
          logger.info(SERVICE_NAME, 'TTS audio uploaded to S3', { s3Key: audioKeyToStore });
        } else {
          logger.error(SERVICE_NAME, 'S3 upload failed', { error: uploadResult.error });
          audioKeyToStore = `tts-${language}-${segment.sceneId}-${Date.now()}`;
        }
      } catch (uploadErr) {
        logger.error(SERVICE_NAME, 'S3 upload exception', { error: String(uploadErr) });
        audioKeyToStore = `tts-${language}-${segment.sceneId}-${Date.now()}`;
      }
    }

    setAudioKey(audioDataUrl); // Keep data URL in local state for playback
    setAudioSource('tts');

    // If segment doesn't exist yet (pending), create it first
    if (segmentId.startsWith('pending-')) {
      const createResult = await createSceneSegment({
        sceneId: segment.sceneId,
        segmentIndex: 0,
        language: segment.language,
        audioKey: audioKeyToStore,
        status: 'tts_generated',
      });
      if (createResult.ok) {
        realSegmentIdRef.current = createResult.segment.id;
        logger.info(SERVICE_NAME, 'Segment created for TTS', { newId: createResult.segment.id });
        onAudioSaved?.();
        return;
      }
      logger.error(SERVICE_NAME, 'Failed to create segment for TTS', { error: createResult.error });
      return;
    }

    const result = await updateSceneSegment(segmentId, {
      audioKey: audioKeyToStore,
      audioSource: 'tts',
    });

    if (!result.ok) {
      logger.error(SERVICE_NAME, 'Failed to persist TTS audio', { segmentId, error: result.error });
    } else {
      onAudioSaved?.();
    }
  }, [segment.id, segment.sceneId, segment.segmentIndex, segment.language, sessionId, onAudioSaved]);

  // --- Recording complete callback ---

  const handleRecordingComplete = useCallback(async (sceneId: string) => {
    logger.info(SERVICE_NAME, 'Recording completed for segment', {
      segmentId: segment.id,
      sceneId,
    });

    // AudioRecorder saves audio via recording store; update audioSource
    setAudioSource('recording');

    const result = await updateSceneSegment(segment.id, {
      audioSource: 'recording',
    });

    if (!result.ok) {
      logger.error(SERVICE_NAME, 'Failed to persist recording audioSource', {
        segmentId: segment.id,
        error: result.error,
      });
    } else {
      onAudioSaved?.();
    }

    setActiveTool(null);
  }, [segment.id, onAudioSaved]);

  // --- Play audio ---

  const handlePlay = useCallback(async () => {
    if (!playableUrl) {
      logger.warn(SERVICE_NAME, 'No playable audio URL available');
      return;
    }
    try {
      audioPlayerService.play(playableUrl);
    } catch (err) {
      logger.error(SERVICE_NAME, 'Failed to play audio', { error: String(err) });
    }
  }, [playableUrl]);

  // --- Source badge ---

  const renderSourceBadge = () => {
    if (!audioSource) return null;

    if (audioSource === 'tts') {
      return (
        <span
          data-testid="audio-source-badge"
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
        >
          TTS automatique
        </span>
      );
    }

    return (
      <span
        data-testid="audio-source-badge"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
      >
        Enregistrement personnel
      </span>
    );
  };

  return (
    <div className="space-y-3 mt-4" data-testid="language-audio-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Audio</h3>
        {renderSourceBadge()}
      </div>

      {/* Player when audio exists and is playable */}
      {(playableUrl || audioKey) && (
        <div data-testid="audio-player-container">
          {playableUrl ? (
            <>
              <button
                onClick={handlePlay}
                className="mb-2 text-sm font-medium text-teal-700 hover:text-teal-900"
                data-testid="play-audio-btn"
              >
                ▶ Ecouter
              </button>
              <AudioPlayerBar compact label={`Audio ${targetLanguage.toUpperCase()}`} />
            </>
          ) : (
            <p className="text-sm text-teal-600">Audio genere ✅ (chargement...)</p>
          )}
        </div>
      )}

      {/* No audio message */}
      {!audioKey && !playableUrl && (
        <p className="text-sm text-gray-500" data-testid="no-audio-message">
          Aucun audio pour cette scene
        </p>
      )}

      {/* Primary action: record with prompter */}
      <Link
        href={`/guide/studio/${sessionId}/record?sceneId=${segment.sceneId}&lang=${targetLanguage}`}
        className="flex items-center justify-center gap-2 w-full text-sm font-medium py-2.5 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        data-testid="record-with-prompter-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4 3a1 1 0 011-1h10a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V3zm2 1v12h8V4H6zm2 2h4v1H8V6zm0 3h4v1H8V9zm0 3h3v1H8v-1z" clipRule="evenodd" />
        </svg>
        Enregistrer avec le prompteur
      </Link>

      {/* Secondary actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTool(activeTool === 'tts' ? null : 'tts')}
          className={`flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-colors ${
            activeTool === 'tts'
              ? 'bg-teal-700 text-white'
              : 'border border-teal-500 text-teal-700 hover:bg-teal-50'
          }`}
          data-testid="toggle-tts-btn"
        >
          Regenerer TTS
        </button>
        <button
          onClick={() => setActiveTool(activeTool === 'recorder' ? null : 'recorder')}
          className={`flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-colors ${
            activeTool === 'recorder'
              ? 'bg-gray-600 text-white'
              : 'border border-gray-400 text-gray-600 hover:bg-gray-50'
          }`}
          data-testid="toggle-recorder-btn"
        >
          Enregistrement rapide
        </button>
      </div>

      {/* TTS Controls */}
      {activeTool === 'tts' && (
        <TTSControls
          segment={segment}
          text={translatedText}
          language={targetLanguage}
          gpuAvailable={gpuAvailable}
          onSaveAsSceneAudio={handleTTSSave}
        />
      )}

      {/* Audio Recorder */}
      {activeTool === 'recorder' && (
        <AudioRecorder
          sceneId={segment.id}
          onRecordingComplete={handleRecordingComplete}
        />
      )}
    </div>
  );
}

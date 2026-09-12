'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { TTSControls } from '@/components/studio/tts-controls';
import { AudioRecorder } from '@/components/studio/audio-recorder';
import { AudioPlayerBar } from '@/components/studio/audio-player';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { updateSceneSegment, createSceneSegment } from '@/lib/api/studio';
import type { SceneSegment, AudioSource } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { t } = useStudioLocale();
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [audioSource, setAudioSource] = useState<AudioSource | undefined>(segment.audioSource);
  const [audioKey, setAudioKey] = useState<string | null>(segment.audioKey);
  /**
   * Échec du dernier enregistrement d'audio pour cette langue. Il DOIT se voir :
   * sans lui, un envoi raté laissait l'impression d'une langue prête.
   */
  const [saveError, setSaveError] = useState<string | null>(null);
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);

  // The player bar reflects a GLOBAL singleton shared by every scene's section.
  // Track which URL is currently loaded so this section only renders the bar
  // when ITS audio is the one playing — otherwise every scene shows the same
  // (e.g. scene 1's) player even though you want to listen to scene 2.
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  useEffect(() => {
    setPlayerUrl(audioPlayerService.getState().currentUrl);
    return audioPlayerService.subscribe((s) => setPlayerUrl(s.currentUrl));
  }, []);
  const isLoadedInPlayer = !!playableUrl && playerUrl === playableUrl;

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
        // Use uploadAudio which handles auth + S3 path correctly. The S3 object is
        // keyed by the immutable sceneId AND the language, so per-language takes
        // never collide and the key itself says which language it carries.
        const uploadResult = await uploadAudio(blob, sessionId, sceneIndex, segment.sceneId, language);
        if (uploadResult.ok) {
          audioKeyToStore = uploadResult.s3Key;
          logger.info(SERVICE_NAME, 'TTS audio uploaded to S3', { s3Key: audioKeyToStore });
        } else {
          // ÉCHEC = ÉCHEC. Un marqueur `tts-…` était écrit à la place de la clé,
          // et le segment passait quand même en `tts_generated` : la langue
          // paraissait prête (puce, checklist, soumission acceptée) alors
          // qu'AUCUN son n'existait. Le touriste se retrouvait devant le silence.
          logger.error(SERVICE_NAME, 'S3 upload failed — segment left untouched', { error: uploadResult.error });
          setSaveError(uploadResult.error);
          return;
        }
      } catch (uploadErr) {
        logger.error(SERVICE_NAME, 'S3 upload exception — segment left untouched', { error: String(uploadErr) });
        setSaveError(t('Envoi de l’audio impossible. La langue reste sans son.', 'Could not upload the audio. This language still has no sound.'));
        return;
      }
    }
    setSaveError(null);

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
      setSaveError(createResult.error);
      return;
    }

    const result = await updateSceneSegment(segmentId, {
      audioKey: audioKeyToStore,
      audioSource: 'tts',
    });

    if (!result.ok) {
      logger.error(SERVICE_NAME, 'Failed to persist TTS audio', { segmentId, error: result.error });
      setSaveError(result.error);
    } else {
      onAudioSaved?.();
    }
  }, [segment.sceneId, segment.segmentIndex, segment.language, sessionId, onAudioSaved, t]);

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
          className="inline-flex items-center px-2 py-0.5 rounded-pill text-meta font-medium bg-grenadine-soft text-grenadine"
        >
          {t('TTS automatique', 'Automatic TTS')}
        </span>
      );
    }

    return (
      <span
        data-testid="audio-source-badge"
        className="inline-flex items-center px-2 py-0.5 rounded-pill text-meta font-medium bg-mer-soft text-mer"
      >
        {t('Enregistrement personnel', 'Own recording')}
      </span>
    );
  };

  return (
    <div className="space-y-3 mt-4" data-testid="language-audio-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-body font-semibold text-ink">Audio</h3>
        {renderSourceBadge()}
      </div>

      {/* Un échec d'enregistrement se voit : la langue n'a PAS de son. */}
      {saveError && (
        <p
          className="rounded-lg border border-danger bg-grenadine-soft p-2 text-meta text-ink"
          role="alert"
          data-testid="language-audio-save-error"
        >
          {t('Audio non enregistré :', 'Audio not saved:')} {saveError}
        </p>
      )}

      {/* Player when audio exists and is playable */}
      {(playableUrl || audioKey) && (
        <div data-testid="audio-player-container">
          {playableUrl ? (
            <>
              <button
                onClick={handlePlay}
                className="mb-2 text-body font-medium text-grenadine hover:opacity-80"
                data-testid="play-audio-btn"
              >
                ▶ {t('Écouter', 'Listen')}
              </button>
              {isLoadedInPlayer && <AudioPlayerBar compact label={`Audio ${targetLanguage.toUpperCase()}`} />}
            </>
          ) : (
            <p className="text-body text-grenadine">{t('Audio genere ✅ (chargement...)', 'Audio generated ✅ (loading...)')}</p>
          )}
        </div>
      )}

      {/* No audio message */}
      {!audioKey && !playableUrl && (
        <p className="text-body text-ink-60" data-testid="no-audio-message">
          {t('Aucun audio pour cette scene', 'No audio for this scene')}
        </p>
      )}

      {/* Primary action: record with prompter */}
      <Link
        href={`/guide/studio/${sessionId}/record?sceneId=${segment.sceneId}&lang=${targetLanguage}`}
        className="flex items-center justify-center gap-2 w-full text-body font-medium py-2.5 px-4 rounded-lg bg-mer text-white hover:opacity-90 transition"
        data-testid="record-with-prompter-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4 3a1 1 0 011-1h10a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V3zm2 1v12h8V4H6zm2 2h4v1H8V6zm0 3h4v1H8V9zm0 3h3v1H8v-1z" clipRule="evenodd" />
        </svg>
        {t('Enregistrer avec le prompteur', 'Record with the prompter')}
      </Link>

      {/* Secondary actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTool(activeTool === 'tts' ? null : 'tts')}
          className={`flex-1 text-body font-medium py-2 px-4 rounded-lg transition ${
            activeTool === 'tts'
              ? 'bg-grenadine text-white'
              : 'border border-grenadine text-grenadine hover:bg-grenadine-soft'
          }`}
          data-testid="toggle-tts-btn"
        >
          {t('Regenerer TTS', 'Regenerate TTS')}
        </button>
        <button
          onClick={() => setActiveTool(activeTool === 'recorder' ? null : 'recorder')}
          className={`flex-1 text-body font-medium py-2 px-4 rounded-lg transition ${
            activeTool === 'recorder'
              ? 'bg-ink-80 text-white'
              : 'border border-ink-40 text-ink-80 hover:bg-paper-soft'
          }`}
          data-testid="toggle-recorder-btn"
        >
          {t('Enregistrement rapide', 'Quick recording')}
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

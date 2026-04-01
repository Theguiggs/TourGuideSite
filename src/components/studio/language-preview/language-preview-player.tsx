'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { getTransitionMessage } from '@/lib/multilang/i18n-transitions';
import { logger } from '@/lib/logger';
import type { StudioScene, SceneSegment } from '@/types/studio';

const SERVICE_NAME = 'LanguagePreviewPlayer';

// --- Types ---

export interface LanguagePreviewPlayerProps {
  scenes: StudioScene[];
  segments: SceneSegment[];
  language: string;
  teaserMode?: boolean;
}

type PlaybackMode = 'idle' | 'teaser' | 'full';

// --- Helpers ---

const TEASER_DURATION_MS = 10_000;

function getSegmentAudioKey(
  scene: StudioScene,
  segments: SceneSegment[],
  language: string,
): string | null {
  // Find the segment for this scene in the target language
  const seg = segments.find(
    (s) => s.sceneId === scene.id && s.language === language,
  );
  if (seg?.audioKey) return seg.audioKey;

  // Fallback: if target lang is the base language, use scene audio
  if (language === 'fr') {
    return scene.studioAudioKey || scene.originalAudioKey || null;
  }

  return null;
}

function getMissingScenesCount(
  scenes: StudioScene[],
  segments: SceneSegment[],
  language: string,
): number {
  return scenes.filter(
    (scene) => !getSegmentAudioKey(scene, segments, language),
  ).length;
}

// --- Component ---

export function LanguagePreviewPlayer({
  scenes,
  segments,
  language,
  teaserMode = false,
}: LanguagePreviewPlayerProps) {
  const [mode, setMode] = useState<PlaybackMode>('idle');
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const teaserTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const missingCount = getMissingScenesCount(scenes, segments, language);

  // Cleanup teaser timeout on unmount
  useEffect(() => {
    return () => {
      if (teaserTimeoutRef.current) {
        clearTimeout(teaserTimeoutRef.current);
      }
    };
  }, []);

  // Listen for audio end to advance playlist in full mode
  useEffect(() => {
    if (mode !== 'full') return;

    const unsub = audioPlayerService.subscribe((state) => {
      if (!state.isPlaying && currentSceneIndex !== null) {
        // Find next scene with audio
        let nextIndex = currentSceneIndex + 1;
        while (nextIndex < scenes.length) {
          const key = getSegmentAudioKey(scenes[nextIndex], segments, language);
          if (key) break;
          nextIndex++;
        }

        if (nextIndex < scenes.length) {
          const key = getSegmentAudioKey(scenes[nextIndex], segments, language)!;
          setCurrentSceneIndex(nextIndex);

          // Log the transition message (in a real app, TTS would read it)
          const nextTitle = scenes[nextIndex].title || `Scene ${nextIndex + 1}`;
          const transitionMsg = getTransitionMessage(language, nextTitle);
          logger.info(SERVICE_NAME, 'Transition', { message: transitionMsg, sceneIndex: nextIndex });

          audioPlayerService.play(key);
        } else {
          // Playlist finished
          setMode('idle');
          setCurrentSceneIndex(null);
          logger.info(SERVICE_NAME, 'Full preview complete');
        }
      }
    });

    return unsub;
  }, [mode, currentSceneIndex, scenes, segments, language]);

  const handleTeaser = useCallback(async () => {
    if (mode === 'teaser') {
      // Stop teaser
      audioPlayerService.stop();
      if (teaserTimeoutRef.current) {
        clearTimeout(teaserTimeoutRef.current);
        teaserTimeoutRef.current = null;
      }
      setMode('idle');
      setCurrentSceneIndex(null);
      return;
    }

    setAlertMessage(null);

    // Find first scene with audio in target language
    const firstIndex = scenes.findIndex(
      (scene) => !!getSegmentAudioKey(scene, segments, language),
    );

    if (firstIndex < 0) {
      setAlertMessage(`Aucun audio disponible en ${language.toUpperCase()}`);
      logger.warn(SERVICE_NAME, 'No audio for teaser', { language });
      return;
    }

    if (missingCount > 0) {
      setAlertMessage(
        `${missingCount} scene(s) sans audio en ${language.toUpperCase()}`,
      );
    }

    const key = getSegmentAudioKey(scenes[firstIndex], segments, language)!;
    setMode('teaser');
    setCurrentSceneIndex(firstIndex);

    logger.info(SERVICE_NAME, 'Starting teaser', { language, sceneIndex: firstIndex });
    await audioPlayerService.play(key);

    // Stop after 10s
    teaserTimeoutRef.current = setTimeout(() => {
      audioPlayerService.stop();
      setMode('idle');
      setCurrentSceneIndex(null);
      logger.info(SERVICE_NAME, 'Teaser timeout reached');
    }, TEASER_DURATION_MS);
  }, [mode, scenes, segments, language, missingCount]);

  const handleFullPreview = useCallback(async () => {
    if (mode === 'full') {
      // Stop full preview
      audioPlayerService.stop();
      setMode('idle');
      setCurrentSceneIndex(null);
      return;
    }

    setAlertMessage(null);

    const firstIndex = scenes.findIndex(
      (scene) => !!getSegmentAudioKey(scene, segments, language),
    );

    if (firstIndex < 0) {
      setAlertMessage(`Aucun audio disponible en ${language.toUpperCase()}`);
      logger.warn(SERVICE_NAME, 'No audio for full preview', { language });
      return;
    }

    if (missingCount > 0) {
      setAlertMessage(
        `${missingCount} scene(s) sans audio en ${language.toUpperCase()}`,
      );
    }

    const key = getSegmentAudioKey(scenes[firstIndex], segments, language)!;
    setMode('full');
    setCurrentSceneIndex(firstIndex);

    logger.info(SERVICE_NAME, 'Starting full preview', { language, sceneIndex: firstIndex });
    await audioPlayerService.play(key);
  }, [mode, scenes, segments, language, missingCount]);

  return (
    <div className="space-y-3" data-testid="language-preview-player">
      {/* Alert for missing audio */}
      {alertMessage && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700"
          role="alert"
          data-testid="preview-alert"
        >
          {alertMessage}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTeaser}
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'teaser'
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}
          data-testid="teaser-btn"
        >
          {mode === 'teaser' ? 'Arreter' : 'Ecouter un extrait'}
        </button>

        <button
          onClick={handleFullPreview}
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'full'
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
          }`}
          data-testid="full-preview-btn"
        >
          {mode === 'full' ? 'Arreter' : 'Preview complete'}
        </button>

        {currentSceneIndex !== null && (
          <span className="text-xs text-gray-500" data-testid="current-scene-info">
            Scene {currentSceneIndex + 1}/{scenes.length}
            {scenes[currentSceneIndex]?.title
              ? ` — ${scenes[currentSceneIndex].title}`
              : ''}
          </span>
        )}
      </div>
    </div>
  );
}

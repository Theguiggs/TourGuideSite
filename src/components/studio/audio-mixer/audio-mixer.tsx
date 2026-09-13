'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { audioMixerService, type MixerState } from '@/lib/studio/audio-mixer-service';
import { getAmbianceById, getAmbianceUrl, type SceneAudioMix } from '@/lib/studio/ambiance-catalog';
import { AmbiancePicker } from './ambiance-picker';
import { useGuideAmbianceStore } from '@/lib/stores/guide-ambiance-store';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import type { AmbianceSound } from '@/lib/studio/ambiance-catalog';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface AudioMixerProps {
  /** The speech audio URL (data: URL or S3 key) */
  speechUrl: string | null;
  /** Current mix settings */
  mix: SceneAudioMix;
  /** Called when mix settings change */
  onMixChange: (mix: SceneAudioMix) => void;
  /** Guide ID — required so the picker can show the guide's personal sound bank */
  guideId: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioMixer({ speechUrl, mix, onMixChange, guideId }: AudioMixerProps) {
  const { t } = useStudioLocale();
  const [mixerState, setMixerState] = useState<MixerState>(audioMixerService.getState());
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Resolve ambiance sound from standard catalog or guide's custom bank
  // Use raw `sounds` array selector + useMemo (stable selector -> avoids Zustand getSnapshot loop)
  const allCustomSounds = useGuideAmbianceStore((s) => s.sounds);
  const ambianceSound = useMemo<AmbianceSound | null>(() => {
    if (!mix.ambiance) return null;
    const standard = getAmbianceById(mix.ambiance.soundId);
    if (standard) return standard;
    const custom = allCustomSounds.find((s) => s.id === mix.ambiance!.soundId);
    if (!custom) return null;
    return {
      id: custom.id,
      label: custom.title,
      icon: custom.icon || '🎵',
      category: custom.category,
      file: custom.s3Key,
      durationSec: custom.durationSec,
    };
  }, [mix.ambiance, allCustomSounds]);

  // Subscribe to mixer state
  useEffect(() => {
    const unsub = audioMixerService.subscribe(setMixerState);
    return unsub;
  }, []);

  // Load speech when URL changes — supports raw URLs, data: URLs, and S3 keys
  useEffect(() => {
    if (!speechUrl) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        // S3 keys (e.g. guide-studio/...) need to be resolved to a signed URL before fetching
        const isS3Key = !speechUrl.startsWith('data:') && !speechUrl.startsWith('http') && !speechUrl.startsWith('blob:');
        const url = isS3Key ? await getPlayableUrl(speechUrl) : speechUrl;
        if (cancelled) return;
        await audioMixerService.loadSpeech(url);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [speechUrl]);

  // Load ambiance when selected — supports both standard catalog files and custom S3 sounds
  useEffect(() => {
    if (!mix.ambiance || !ambianceSound) return;
    let cancelled = false;
    (async () => {
      try {
        const url = ambianceSound.file.startsWith('guide-studio/')
          ? await getPlayableUrl(ambianceSound.file)
          : getAmbianceUrl(ambianceSound);
        if (!cancelled) audioMixerService.loadAmbiance(url);
      } catch { /* swallow — picker will retry */ }
    })();
    return () => { cancelled = true; };
  }, [mix.ambiance?.soundId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync gains
  useEffect(() => {
    audioMixerService.setSpeechGain(mix.speechGain);
  }, [mix.speechGain]);

  useEffect(() => {
    if (mix.ambiance) {
      audioMixerService.setAmbianceGain(mix.ambiance.gain);
    }
  }, [mix.ambiance?.gain]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = useCallback(() => {
    if (mixerState.isPlaying) {
      audioMixerService.pause();
    } else {
      audioMixerService.play();
    }
  }, [mixerState.isPlaying]);

  const handleStop = useCallback(() => {
    audioMixerService.stop();
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    audioMixerService.seek(parseFloat(e.target.value));
  }, []);

  const handleSelectAmbiance = useCallback((sound: AmbianceSound) => {
    onMixChange({ ...mix, ambiance: { soundId: sound.id, gain: mix.ambiance?.gain ?? 30 } });
    setShowPicker(false);
  }, [mix, onMixChange]);

  const handleRemoveAmbiance = useCallback(() => {
    audioMixerService.clearAmbiance();
    onMixChange({ ...mix, ambiance: null });
  }, [mix, onMixChange]);

  if (!speechUrl) {
    return (
      <div className="p-3 bg-paper-soft rounded-lg text-body text-ink-60 text-center">
        {t('Sélectionnez un audio de voix pour utiliser le mixeur', 'Select a voice audio to use the mixer')}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="audio-mixer">
      <h3 className="text-meta font-semibold text-ink-40 uppercase tracking-wider">{t('Mixer audio', 'Audio mixer')}</h3>

      {/* Speech gain */}
      <div className="p-3 bg-paper-soft rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-meta font-medium text-ink-80">🎙️ Speech (guide)</span>
          <span className="text-meta text-ink-60 font-mono">{mix.speechGain}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={mix.speechGain}
          onChange={(e) => onMixChange({ ...mix, speechGain: parseInt(e.target.value) })}
          className="w-full h-2 accent-grenadine cursor-pointer"
          aria-label={t('Volume speech', 'Speech volume')}
          data-testid="speech-gain-slider"
        />
      </div>

      {/* Ambiance gain */}
      <div className="p-3 bg-paper-soft rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-meta font-medium text-ink-80">
            {ambianceSound ? `${ambianceSound.icon} ${t('Ambiance', 'Ambience')} : ${ambianceSound.label}` : `🔇 ${t('Ambiance : aucune', 'Ambience: none')}`}
          </span>
          <div className="flex items-center gap-2">
            {ambianceSound && (
              <span className="text-meta text-ink-60 font-mono">{mix.ambiance?.gain ?? 0}%</span>
            )}
            {ambianceSound && (
              <button
                onClick={handleRemoveAmbiance}
                className="text-meta text-danger hover:opacity-80"
                title={t("Retirer l'ambiance", 'Remove ambience')}
              >
                X
              </button>
            )}
          </div>
        </div>
        {ambianceSound && mix.ambiance ? (
          <input
            type="range"
            min={0}
            max={100}
            value={mix.ambiance.gain}
            onChange={(e) => onMixChange({
              ...mix,
              ambiance: { ...mix.ambiance!, gain: parseInt(e.target.value) },
            })}
            className="w-full h-2 accent-mer cursor-pointer"
            aria-label={t('Volume ambiance', 'Ambience volume')}
            data-testid="ambiance-gain-slider"
          />
        ) : (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full py-2 border border-dashed border-mer-soft rounded-lg text-meta text-mer hover:bg-mer-soft transition"
            data-testid="add-ambiance-btn"
          >
            + {t('Ajouter une ambiance sonore', 'Add background sound')}
          </button>
        )}
        {ambianceSound && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="mt-1 text-meta text-mer hover:opacity-80"
          >
            {t("Changer d'ambiance", 'Change ambience')}
          </button>
        )}
      </div>

      {/* Ambiance picker */}
      {showPicker && (
        <AmbiancePicker
          guideId={guideId}
          onSelect={handleSelectAmbiance}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Mix player */}
      <div className="bg-ink rounded-lg p-3 space-y-2">
        <p className="text-meta text-ink-40 font-medium">{t('Preview du mix', 'Mix preview')}</p>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className="text-meta text-ink-40 w-10 text-right font-mono">{formatTime(mixerState.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={mixerState.duration || 1}
            step={0.1}
            value={mixerState.currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 accent-grenadine cursor-pointer"
            aria-label={t('Position mix', 'Mix position')}
          />
          <span className="text-meta text-ink-40 w-10 font-mono">{formatTime(mixerState.duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={handleStop} title={t('Arrêter', 'Stop')}
            className="w-8 h-8 rounded-pill bg-ink-80 hover:bg-ink-80 text-ink-20 flex items-center justify-center text-body transition">
            {'\u25A0'}
          </button>
          <button onClick={() => audioMixerService.seek(mixerState.currentTime - 10)} title={t('Reculer 10s', 'Back 10s')}
            className="w-8 h-8 rounded-pill bg-ink-80 hover:bg-ink-80 text-ink-20 flex items-center justify-center text-eyebrow font-bold transition">
            -10
          </button>
          <button onClick={handlePlayPause} title={mixerState.isPlaying ? 'Pause' : t('Lecture', 'Play')}
            disabled={isLoading}
            className="w-10 h-10 rounded-pill bg-grenadine hover:opacity-90 disabled:bg-ink-80 text-white flex items-center justify-center text-h6 transition">
            {isLoading ? '...' : mixerState.isPlaying ? '||' : '\u25B6'}
          </button>
          <button onClick={() => audioMixerService.seek(mixerState.currentTime + 10)} title={t('Avancer 10s', 'Forward 10s')}
            className="w-8 h-8 rounded-pill bg-ink-80 hover:bg-ink-80 text-ink-20 flex items-center justify-center text-eyebrow font-bold transition">
            +10
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { audioMixerService, type MixerState } from '@/lib/studio/audio-mixer-service';
import { getAmbianceById, getAmbianceUrl, type SceneAudioMix, DEFAULT_MIX } from '@/lib/studio/ambiance-catalog';
import { AmbiancePicker } from './ambiance-picker';
import type { AmbianceSound } from '@/lib/studio/ambiance-catalog';

interface AudioMixerProps {
  /** The speech audio URL (data: URL or S3 key) */
  speechUrl: string | null;
  /** Current mix settings */
  mix: SceneAudioMix;
  /** Called when mix settings change */
  onMixChange: (mix: SceneAudioMix) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioMixer({ speechUrl, mix, onMixChange }: AudioMixerProps) {
  const [mixerState, setMixerState] = useState<MixerState>(audioMixerService.getState());
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ambianceSound = mix.ambiance ? getAmbianceById(mix.ambiance.soundId) : null;

  // Subscribe to mixer state
  useEffect(() => {
    const unsub = audioMixerService.subscribe(setMixerState);
    return unsub;
  }, []);

  // Load speech when URL changes
  useEffect(() => {
    if (!speechUrl) return;
    setIsLoading(true);
    audioMixerService.loadSpeech(speechUrl).finally(() => setIsLoading(false));
  }, [speechUrl]);

  // Load ambiance when selected
  useEffect(() => {
    if (mix.ambiance && ambianceSound) {
      audioMixerService.loadAmbiance(getAmbianceUrl(ambianceSound));
    }
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
      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
        Selectionnez un audio de speech pour utiliser le mixer
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="audio-mixer">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mixer audio</h3>

      {/* Speech gain */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">🎙️ Speech (guide)</span>
          <span className="text-xs text-gray-500 font-mono">{mix.speechGain}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={mix.speechGain}
          onChange={(e) => onMixChange({ ...mix, speechGain: parseInt(e.target.value) })}
          className="w-full h-2 accent-teal-600 cursor-pointer"
          aria-label="Volume speech"
          data-testid="speech-gain-slider"
        />
      </div>

      {/* Ambiance gain */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">
            {ambianceSound ? `${ambianceSound.icon} Ambiance : ${ambianceSound.label}` : '🔇 Ambiance : aucune'}
          </span>
          <div className="flex items-center gap-2">
            {ambianceSound && (
              <span className="text-xs text-gray-500 font-mono">{mix.ambiance?.gain ?? 0}%</span>
            )}
            {ambianceSound && (
              <button
                onClick={handleRemoveAmbiance}
                className="text-xs text-red-500 hover:text-red-700"
                title="Retirer l'ambiance"
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
            className="w-full h-2 accent-indigo-600 cursor-pointer"
            aria-label="Volume ambiance"
            data-testid="ambiance-gain-slider"
          />
        ) : (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full py-2 border border-dashed border-indigo-300 rounded-lg text-xs text-indigo-600 hover:bg-indigo-50 transition-colors"
            data-testid="add-ambiance-btn"
          >
            + Ajouter une ambiance sonore
          </button>
        )}
        {ambianceSound && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="mt-1 text-xs text-indigo-600 hover:text-indigo-800"
          >
            Changer d&apos;ambiance
          </button>
        )}
      </div>

      {/* Ambiance picker */}
      {showPicker && (
        <AmbiancePicker
          onSelect={handleSelectAmbiance}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Mix player */}
      <div className="bg-gray-900 rounded-lg p-3 space-y-2">
        <p className="text-xs text-gray-400 font-medium">Preview du mix</p>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10 text-right font-mono">{formatTime(mixerState.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={mixerState.duration || 1}
            step={0.1}
            value={mixerState.currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 accent-teal-500 cursor-pointer"
            aria-label="Position mix"
          />
          <span className="text-xs text-gray-400 w-10 font-mono">{formatTime(mixerState.duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={handleStop} title="Arreter"
            className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-sm transition-colors">
            {'\u25A0'}
          </button>
          <button onClick={() => audioMixerService.seek(mixerState.currentTime - 10)} title="Reculer 10s"
            className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-[10px] font-bold transition-colors">
            -10
          </button>
          <button onClick={handlePlayPause} title={mixerState.isPlaying ? 'Pause' : 'Lecture'}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 text-white flex items-center justify-center text-lg transition-colors">
            {isLoading ? '...' : mixerState.isPlaying ? '||' : '\u25B6'}
          </button>
          <button onClick={() => audioMixerService.seek(mixerState.currentTime + 10)} title="Avancer 10s"
            className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-[10px] font-bold transition-colors">
            +10
          </button>
        </div>
      </div>
    </div>
  );
}

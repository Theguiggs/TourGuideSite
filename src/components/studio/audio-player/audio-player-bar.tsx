'use client';

import { useState, useEffect, useCallback } from 'react';
import { audioPlayerService, type AudioPlayerState } from '@/lib/studio/audio-player-service';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface AudioPlayerBarProps {
  /** Label displayed above the player */
  label?: string;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function AudioPlayerBar({ label, compact = false }: AudioPlayerBarProps) {
  const [state, setState] = useState<AudioPlayerState>(audioPlayerService.getState());

  useEffect(() => {
    const unsub = audioPlayerService.subscribe(setState);
    return unsub;
  }, []);

  const handlePlayPause = useCallback(() => {
    if (state.isPlaying) {
      audioPlayerService.pause();
    } else if (state.currentUrl) {
      audioPlayerService.play(state.currentUrl);
    }
  }, [state.isPlaying, state.currentUrl]);

  const handleStop = useCallback(() => {
    audioPlayerService.stop();
  }, []);

  const handleSkipBack = useCallback(() => {
    audioPlayerService.seek(state.currentTime - 10);
  }, [state.currentTime]);

  const handleSkipForward = useCallback(() => {
    audioPlayerService.seek(state.currentTime + 10);
  }, [state.currentTime]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    audioPlayerService.seek(parseFloat(e.target.value));
  }, []);

  // Don't render if no audio loaded
  if (!state.currentUrl) return null;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-900 rounded-lg" data-testid="audio-player-bar">
        <button onClick={handlePlayPause} className="w-7 h-7 rounded-full bg-white text-gray-900 flex items-center justify-center text-xs font-bold hover:bg-gray-100 transition-colors">
          {state.isPlaying ? '||' : '\u25B6'}
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-8 text-right">{formatTime(state.currentTime)}</span>
          <input type="range" min={0} max={state.duration || 1} step={0.1} value={state.currentTime}
            onChange={handleSeek} className="flex-1 h-1 accent-teal-500" />
          <span className="text-[10px] text-gray-400 w-8">{formatTime(state.duration)}</span>
        </div>
        <button onClick={handleStop} className="text-gray-400 hover:text-white text-xs px-1">X</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-3 space-y-2" data-testid="audio-player-bar">
      {label && <p className="text-xs text-gray-400 font-medium truncate">{label}</p>}

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-10 text-right font-mono">{formatTime(state.currentTime)}</span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={state.duration || 1}
            step={0.1}
            value={state.currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 accent-teal-500 cursor-pointer"
            aria-label="Position audio"
          />
        </div>
        <span className="text-xs text-gray-400 w-10 font-mono">{formatTime(state.duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={handleStop} title="Arreter"
          className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-sm transition-colors">
          {'\u25A0'}
        </button>
        <button onClick={handleSkipBack} title="Reculer 10s"
          className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-[10px] font-bold transition-colors">
          -10
        </button>
        <button onClick={handlePlayPause} title={state.isPlaying ? 'Pause' : 'Lecture'}
          className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center text-lg transition-colors">
          {state.isPlaying ? '||' : '\u25B6'}
        </button>
        <button onClick={handleSkipForward} title="Avancer 10s"
          className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-[10px] font-bold transition-colors">
          +10
        </button>
      </div>
    </div>
  );
}

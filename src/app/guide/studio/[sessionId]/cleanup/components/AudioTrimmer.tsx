'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AudioTrimmer';

interface AudioTrimmerProps {
  audioUrl: string | null;
  trimStart: number | null;
  trimEnd: number | null;
  onTrimChange: (trimStart: number, trimEnd: number) => void;
  onDelete?: () => void;
  disabled?: boolean;
}

/**
 * Dual-range audio trimmer with HTML5 audio preview.
 * Uses two native range inputs stacked for a custom dual-range slider
 * (react-range is not installed).
 */
export function AudioTrimmer({
  audioUrl,
  trimStart,
  trimEnd,
  onTrimChange,
  onDelete,
  disabled,
}: AudioTrimmerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const effectiveStart = trimStart ?? 0;
  const effectiveEnd = trimEnd ?? duration;

  const handleLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setDuration(Number.isFinite(el.duration) ? el.duration : 0);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    // Clamp playback to [trimStart, trimEnd]
    if (trimEnd != null && el.currentTime >= trimEnd) {
      el.pause();
      el.currentTime = trimStart ?? 0;
      setIsPlaying(false);
    }
  }, [trimStart, trimEnd]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      if (el.currentTime < (trimStart ?? 0) || (trimEnd != null && el.currentTime >= trimEnd)) {
        el.currentTime = trimStart ?? 0;
      }
      el.play().then(() => {
        // Guard: component may have unmounted (or user switched scenes) between
        // the play() call and the promise resolution — don't setState on a dead tree.
        if (mountedRef.current) setIsPlaying(true);
      }).catch((err) => {
        logger.warn(SERVICE_NAME, 'audio play failed', { err: String(err) });
      });
    }
  }, [isPlaying, trimStart, trimEnd]);

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el && !el.paused) el.pause();
    };
  }, []);

  const handleStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    // Fallback to 0 on NaN (empty input, locale issues).
    const newStart = Number.isFinite(raw) ? raw : 0;
    const safeEnd = effectiveEnd > 0 ? effectiveEnd : duration;
    // Clamp into [0, safeEnd - 0.1]. Never negative, never past end.
    const clamped = Math.max(0, Math.min(newStart, Math.max(0, safeEnd - 0.1)));
    onTrimChange(clamped, safeEnd);
  }, [effectiveEnd, duration, onTrimChange]);

  const handleEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const newEnd = Number.isFinite(raw) ? raw : 0;
    // Clamp into [effectiveStart + 0.1, duration]. Never before start, never past media length.
    const upperBound = duration > 0 ? duration : newEnd;
    const clamped = Math.min(upperBound, Math.max(newEnd, effectiveStart + 0.1));
    onTrimChange(effectiveStart, clamped);
  }, [effectiveStart, duration, onTrimChange]);

  const fmt = (t: number) => {
    if (!Number.isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return (
      <div className="bg-paper-soft rounded-lg p-3 text-sm text-ink-60" data-testid="audio-trimmer-empty">
        Aucun audio
      </div>
    );
  }

  const effectiveMax = duration > 0 ? duration : 1;

  return (
    <div
      className="border border-line rounded-lg p-3 bg-white"
      data-testid="audio-trimmer"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={disabled}
          data-testid="audio-trim-play"
          aria-label={isPlaying ? 'Pause' : 'Lecture'}
          className="w-9 h-9 rounded-full bg-grenadine hover:opacity-90 disabled:bg-paper-deep text-white text-sm flex items-center justify-center"
        >
          {isPlaying ? 'II' : '>'}
        </button>
        <div className="flex-1 text-xs text-ink-80 tabular-nums">
          <span data-testid="audio-trim-current">{fmt(currentTime)}</span>
          {' / '}
          <span data-testid="audio-trim-duration">{fmt(duration)}</span>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            data-testid="audio-trim-delete"
            className="text-xs text-danger hover:opacity-80 disabled:text-ink-20"
          >
            Supprimer
          </button>
        )}
      </div>

      <div className="relative h-8">
        <div className="absolute inset-x-0 top-3 h-1 bg-paper-deep rounded-full" />
        <div
          className="absolute top-3 h-1 bg-grenadine rounded-full"
          style={{
            left: `${(effectiveStart / effectiveMax) * 100}%`,
            width: `${Math.max(0, ((effectiveEnd - effectiveStart) / effectiveMax) * 100)}%`,
          }}
          data-testid="audio-trim-range"
        />
        <input
          type="range"
          min={0}
          max={effectiveMax}
          step={0.1}
          value={effectiveStart}
          onChange={handleStartChange}
          disabled={disabled || duration === 0}
          aria-label="Début"
          data-testid="audio-trim-start"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto accent-grenadine"
        />
        <input
          type="range"
          min={0}
          max={effectiveMax}
          step={0.1}
          value={effectiveEnd}
          onChange={handleEndChange}
          disabled={disabled || duration === 0}
          aria-label="Fin"
          data-testid="audio-trim-end"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto accent-grenadine"
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-ink-60 tabular-nums">
        <span>Début: <span data-testid="audio-trim-start-label">{fmt(effectiveStart)}</span></span>
        <span>Fin: <span data-testid="audio-trim-end-label">{fmt(effectiveEnd)}</span></span>
      </div>
    </div>
  );
}

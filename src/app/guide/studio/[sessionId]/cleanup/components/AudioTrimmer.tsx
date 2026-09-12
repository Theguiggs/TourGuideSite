'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'AudioTrimmer';

interface AudioTrimmerProps {
  audioUrl: string | null;
  trimStart: number | null;
  trimEnd: number | null;
  onTrimChange: (trimStart: number, trimEnd: number) => void;
  onDelete?: () => void;
  disabled?: boolean;
}

/** « 1:05 », « 65 » ou « 65,3 » → secondes ; null si illisible. */
export function parseClock(value: string): number | null {
  const v = value.trim().replace(',', '.');
  const m = v.match(/^(\d+):([0-5]?\d)(?:\.(\d+))?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(`0.${m[3]}`) : 0);
  const n = Number(v);
  return v !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Découpe audio à deux poignées avec aperçu HTML5 (lot 6.2).
 *
 * Deux `<input type="range">` empilés : avant, celui du dessus captait tous
 * les clics sur toute la barre, la poignée de début était inatteignable à la
 * souris. Les pistes sont désormais transparentes aux pointeurs, seules les
 * poignées les reçoivent ; et deux champs mm:ss permettent une valeur exacte.
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

  const { t } = useStudioLocale();
  const [startField, setStartField] = useState<string | null>(null);
  const [endField, setEndField] = useState<string | null>(null);

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

  const fmt = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const commitStart = () => {
    if (startField === null) return;
    const parsed = parseClock(startField);
    setStartField(null);
    if (parsed === null) return;
    const safeEnd = effectiveEnd > 0 ? effectiveEnd : duration;
    onTrimChange(Math.max(0, Math.min(parsed, Math.max(0, safeEnd - 0.1))), safeEnd);
  };
  const commitEnd = () => {
    if (endField === null) return;
    const parsed = parseClock(endField);
    setEndField(null);
    if (parsed === null) return;
    const upperBound = duration > 0 ? duration : parsed;
    onTrimChange(effectiveStart, Math.min(upperBound, Math.max(parsed, effectiveStart + 0.1)));
  };
  const onEnter = (commit: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
  };

  if (!audioUrl) {
    return (
      <div className="bg-paper-soft rounded-lg p-3 text-body text-ink-60" data-testid="audio-trimmer-empty">
        {t('Aucun audio', 'No audio')}
      </div>
    );
  }

  const effectiveMax = duration > 0 ? duration : 1;

  return (
    <div
      className="border border-line rounded-lg p-3 bg-card"
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
          aria-label={isPlaying ? t('Pause', 'Pause') : t('Lecture', 'Play')}
          className="w-9 h-9 rounded-pill bg-grenadine hover:opacity-90 disabled:bg-paper-deep text-white text-body flex items-center justify-center"
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="flex-1 text-meta text-ink-80 tabular-nums">
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
            className="text-meta text-danger hover:opacity-80 disabled:text-ink-20"
          >
            {t('Supprimer', 'Delete')}
          </button>
        )}
      </div>

      <div className="relative h-8">
        <div className="absolute inset-x-0 top-3 h-1 bg-paper-deep rounded-pill" />
        <div
          className="absolute top-3 h-1 bg-grenadine rounded-pill"
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
          aria-label={t('Début', 'Start')}
          data-testid="audio-trim-start"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none accent-grenadine [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        />
        <input
          type="range"
          min={0}
          max={effectiveMax}
          step={0.1}
          value={effectiveEnd}
          onChange={handleEndChange}
          disabled={disabled || duration === 0}
          aria-label={t('Fin', 'End')}
          data-testid="audio-trim-end"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none accent-grenadine [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        />
      </div>

      <div className="mt-2 flex justify-between gap-3 text-meta text-ink-60 tabular-nums">
        <label className="flex items-center gap-1.5">
          <span>{t('Début', 'Start')} : <span data-testid="audio-trim-start-label">{fmt(effectiveStart)}</span></span>
          <input
            type="text"
            inputMode="numeric"
            value={startField ?? fmt(effectiveStart)}
            onChange={(e) => setStartField(e.target.value)}
            onBlur={commitStart}
            onKeyDown={onEnter(commitStart)}
            disabled={disabled || duration === 0}
            aria-label={t('Début (mm:ss)', 'Start (mm:ss)')}
            data-testid="audio-trim-start-field"
            className="w-16 rounded border border-line bg-card px-1.5 py-0.5 text-meta text-ink text-center"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={endField ?? fmt(effectiveEnd)}
            onChange={(e) => setEndField(e.target.value)}
            onBlur={commitEnd}
            onKeyDown={onEnter(commitEnd)}
            disabled={disabled || duration === 0}
            aria-label={t('Fin (mm:ss)', 'End (mm:ss)')}
            data-testid="audio-trim-end-field"
            className="w-16 rounded border border-line bg-card px-1.5 py-0.5 text-meta text-ink text-center"
          />
          <span>{t('Fin', 'End')} : <span data-testid="audio-trim-end-label">{fmt(effectiveEnd)}</span></span>
        </label>
      </div>
    </div>
  );
}

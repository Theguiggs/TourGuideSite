'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PrompterEngine, type PrompterState } from '@/lib/studio/prompter-engine';

interface TeleprompterProps {
  text: string;
  onComplete?: () => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function Teleprompter({ text, onComplete }: TeleprompterProps) {
  const engineRef = useRef<PrompterEngine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PrompterState>({
    isScrolling: false,
    isPaused: false,
    currentWordIndex: 0,
    scrollPosition: 0,
    speed: 5,
    elapsedMs: 0,
  });

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Initialize engine — stable deps only (no onComplete in deps)
  useEffect(() => {
    const engine = new PrompterEngine();
    engineRef.current = engine;

    const unsub = engine.subscribe((s) => {
      setState(s);
      // Auto-scroll: keep highlighted word visible
      if (scrollRef.current && s.isScrolling) {
        const wordEl = scrollRef.current.querySelector(`[data-word-index="${s.currentWordIndex}"]`);
        if (wordEl) {
          wordEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
      // Notify completion
      if (!s.isScrolling && !s.isPaused && s.currentWordIndex >= words.length - 1 && s.elapsedMs > 0) {
        onCompleteRef.current?.();
      }
    });

    return () => {
      unsub();
      engine.destroy();
    };
  }, [words.length]);

  const handleStartResume = useCallback(() => {
    engineRef.current?.start(words.length);
  }, [words.length]);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    engineRef.current?.setSpeed(Number(e.target.value));
  }, []);

  // Keyboard: Space = toggle pause, Escape = stop
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept Space in text inputs
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        engineRef.current?.togglePause();
      } else if (e.code === 'Escape') {
        engineRef.current?.stop();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const isActive = state.isScrolling || state.isPaused;

  return (
    <div className="flex flex-col h-full" data-testid="teleprompter">
      {/* Teleprompter display */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-hidden bg-gray-900 rounded-lg p-8 relative"
        style={{ willChange: 'scroll-position' }}
      >
        <div className="max-w-2xl mx-auto leading-[2.5] text-2xl lg:text-3xl font-medium">
          {words.map((word, i) => (
            <span
              key={i}
              className={`inline-block mr-2 transition-all duration-150 ${
                i === state.currentWordIndex
                  ? 'text-amber-400 scale-105'
                  : i < state.currentWordIndex
                    ? 'text-gray-400'
                    : 'text-gray-100'
              }`}
              data-word-index={i}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-b-lg" data-testid="prompter-controls">
        {/* Play/Pause/Resume */}
        {!isActive ? (
          <button
            onClick={handleStartResume}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-5 rounded-lg transition-colors"
            data-testid="prompter-start"
          >
            ▶ Démarrer
          </button>
        ) : state.isPaused ? (
          <button
            onClick={handleStartResume}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-5 rounded-lg transition-colors"
            data-testid="prompter-resume"
          >
            ▶ Reprendre
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-5 rounded-lg transition-colors"
            data-testid="prompter-pause"
          >
            ⏸ Pause
          </button>
        )}

        {isActive && (
          <button
            onClick={handleStop}
            className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            data-testid="prompter-stop"
          >
            ⏹ Stop
          </button>
        )}

        {/* Speed control */}
        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="speed-slider" className="text-xs text-gray-400">
            Vitesse
          </label>
          <input
            id="speed-slider"
            type="range"
            min={1}
            max={10}
            value={state.speed}
            onChange={handleSpeedChange}
            className="w-24 accent-teal-500"
            data-testid="speed-slider"
          />
          <span className="text-xs text-gray-300 w-4 text-center">{state.speed}</span>
        </div>

        {/* Chronomètre */}
        <div className="text-lg font-mono text-gray-200 tabular-nums" role="timer" aria-live="off" data-testid="chronometre">
          {formatElapsed(state.elapsedMs)}
        </div>
      </div>
    </div>
  );
}

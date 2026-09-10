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
  const [autoFollow, setAutoFollow] = useState(true);
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
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Initialize engine — stable deps only (no onComplete in deps)
  useEffect(() => {
    const engine = new PrompterEngine();
    engineRef.current = engine;

    const unsub = engine.subscribe((s) => {
      setState(s);
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

  // Keep the active word inside the comfortable reading area without moving
  // the whole page. This runs only when the highlighted word changes, rather
  // than on every animation frame.
  const bringActiveWordIntoView = useCallback((wordIndex: number, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current;
    const word = container?.querySelector<HTMLElement>(`[data-word-index="${wordIndex}"]`);
    if (!container || !word) return;

    const containerRect = container.getBoundingClientRect();
    const wordRect = word.getBoundingClientRect();
    const readingMargin = containerRect.height * 0.25;
    const safeTop = containerRect.top + readingMargin;
    const safeBottom = containerRect.bottom - readingMargin;

    if (wordRect.bottom > safeBottom) {
      container.scrollBy({ top: wordRect.bottom - safeBottom, behavior });
    } else if (wordRect.top < safeTop) {
      container.scrollBy({ top: wordRect.top - safeTop, behavior });
    }
  }, []);

  useEffect(() => {
    if (state.isScrolling && !state.isPaused && autoFollow) {
      bringActiveWordIntoView(state.currentWordIndex);
    }
  }, [autoFollow, bringActiveWordIntoView, state.currentWordIndex, state.isPaused, state.isScrolling]);

  const handleStartResume = useCallback(() => {
    if (!state.isScrolling && !state.isPaused) setAutoFollow(true);
    engineRef.current?.start(words.length);
  }, [state.isPaused, state.isScrolling, words.length]);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    engineRef.current?.setSpeed(Number(e.target.value));
  }, []);

  const releaseAutoFollow = useCallback(() => {
    if (state.isScrolling) setAutoFollow(false);
  }, [state.isScrolling]);

  const resumeAutoFollow = useCallback(() => {
    setAutoFollow(true);
    bringActiveWordIntoView(state.currentWordIndex);
  }, [bringActiveWordIntoView, state.currentWordIndex]);

  const handlePrompterKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
      releaseAutoFollow();
    }
  }, [releaseAutoFollow]);

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
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-ink rounded-lg p-8 relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocre"
        tabIndex={0}
        role="region"
        aria-label="Texte du prompteur"
        onWheel={releaseAutoFollow}
        onTouchStart={releaseAutoFollow}
        onPointerDown={releaseAutoFollow}
        onKeyDown={handlePrompterKeyDown}
        data-testid="prompter-scroll-area"
      >
        <div className="max-w-2xl mx-auto leading-[2.5] text-2xl lg:text-3xl font-medium">
          {words.map((word, i) => (
            <span
              key={i}
              className={`inline-block mr-2 rounded px-0.5 text-paper transition-colors duration-150 ${
                i === state.currentWordIndex
                  ? 'bg-ocre text-ink'
                  : ''
              }`}
              data-word-index={i}
              aria-current={i === state.currentWordIndex ? 'true' : undefined}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-ink rounded-b-lg" data-testid="prompter-controls">
        {/* Play/Pause/Resume */}
        {!isActive ? (
          <button
            onClick={handleStartResume}
            className="bg-grenadine hover:opacity-90 text-white font-medium py-2 px-5 rounded-lg transition"
            data-testid="prompter-start"
          >
            ▶ Démarrer
          </button>
        ) : state.isPaused ? (
          <button
            onClick={handleStartResume}
            className="bg-grenadine hover:opacity-90 text-white font-medium py-2 px-5 rounded-lg transition"
            data-testid="prompter-resume"
          >
            ▶ Reprendre
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="bg-ocre hover:opacity-90 text-white font-medium py-2 px-5 rounded-lg transition"
            data-testid="prompter-pause"
          >
            ⏸ Pause
          </button>
        )}

        {isActive && (
          <button
            onClick={handleStop}
            className="bg-ink-80 hover:bg-ink-60 text-white font-medium py-2 px-4 rounded-lg transition"
            data-testid="prompter-stop"
          >
            ⏹ Stop
          </button>
        )}

        {state.isScrolling && !state.isPaused && !autoFollow && (
          <button
            type="button"
            onClick={resumeAutoFollow}
            className="border border-ocre text-ocre hover:bg-ocre hover:text-ink font-medium py-2 px-4 rounded-lg transition-colors"
            data-testid="prompter-follow"
          >
            Suivre le texte
          </button>
        )}

        {/* Speed control */}
        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="speed-slider" className="text-xs text-ink-40">
            Vitesse
          </label>
          <input
            id="speed-slider"
            type="range"
            min={1}
            max={10}
            value={state.speed}
            onChange={handleSpeedChange}
            className="w-24 accent-grenadine"
            data-testid="speed-slider"
          />
          <span className="text-xs text-ink-20 w-4 text-center">{state.speed}</span>
        </div>

        {/* Chronomètre */}
        <div className="text-lg font-mono text-paper-soft tabular-nums" role="timer" aria-live="off" data-testid="chronometre">
          {formatElapsed(state.elapsedMs)}
        </div>
      </div>
    </div>
  );
}

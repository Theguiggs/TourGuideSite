'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PrompterEngine, type PrompterState } from '@/lib/studio/prompter-engine';

interface TeleprompterProps {
  text: string;
  onComplete?: () => void;
  onStartRequested?: () => boolean | Promise<boolean>;
  onPauseRequested?: () => void;
  onResumeRequested?: () => boolean | Promise<boolean>;
  onStopRequested?: () => void | Promise<void>;
  startLabel?: string;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function Teleprompter({
  text,
  onComplete,
  onStartRequested,
  onPauseRequested,
  onResumeRequested,
  onStopRequested,
  startLabel = 'Démarrer',
}: TeleprompterProps) {
  const engineRef = useRef<PrompterEngine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [pendingAction, setPendingAction] = useState<'starting' | 'stopping' | null>(null);
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

  const handleStartResume = useCallback(async () => {
    if (pendingAction) return;
    const isFreshStart = !state.isScrolling && !state.isPaused;
    if (isFreshStart) {
      const beginPrompter = () => {
        setAutoFollow(true);
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        engineRef.current?.start(words.length);
      };
      if (!onStartRequested) {
        beginPrompter();
        return;
      }
      setPendingAction('starting');
      try {
        const canStart = await onStartRequested();
        if (!canStart) return;
        beginPrompter();
      } finally {
        setPendingAction(null);
      }
      return;
    }
    if (state.isPaused && onResumeRequested) {
      const canResume = await onResumeRequested();
      if (!canResume) return;
    }
    engineRef.current?.start(words.length);
  }, [onResumeRequested, onStartRequested, pendingAction, state.isPaused, state.isScrolling, words.length]);

  const handlePause = useCallback(() => {
    onPauseRequested?.();
    engineRef.current?.pause();
  }, [onPauseRequested]);

  const handleStop = useCallback(async () => {
    if (pendingAction) return;
    engineRef.current?.stop();
    if (!onStopRequested) return;
    setPendingAction('stopping');
    try {
      await onStopRequested();
    } finally {
      setPendingAction(null);
    }
  }, [onStopRequested, pendingAction]);

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
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLButtonElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLAnchorElement
        || target.isContentEditable
      ) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.isPaused) void handleStartResume();
        else if (state.isScrolling) handlePause();
      } else if (e.code === 'Escape') {
        if (state.isScrolling || state.isPaused) void handleStop();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlePause, handleStartResume, handleStop, state.isPaused, state.isScrolling]);

  const isActive = state.isScrolling || state.isPaused;
  const progress = words.length > 1
    ? Math.round((state.currentWordIndex / (words.length - 1)) * 100)
    : 0;
  const readingStatus = state.isPaused
    ? 'En pause'
    : pendingAction === 'starting'
      ? 'Activation du micro…'
      : pendingAction === 'stopping'
        ? 'Finalisation de la prise…'
    : state.isScrolling
      ? autoFollow ? 'Lecture guidée' : 'Défilement libre'
      : 'Prêt à lire';

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-80 bg-ink shadow-lg"
      data-testid="teleprompter"
    >
      {/* Controls stay above the script so the first line remains visible. */}
      <div
        className="flex flex-wrap items-center gap-3 border-b border-paper/10 bg-ink px-4 py-3 sm:px-5"
        data-testid="prompter-controls"
      >
        {!isActive ? (
          <button
            type="button"
            onClick={handleStartResume}
            disabled={pendingAction !== null}
            className="rounded-lg bg-grenadine px-5 py-2.5 font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            data-testid="prompter-start"
          >
            {pendingAction === 'starting'
              ? 'Activation du micro…'
              : pendingAction === 'stopping'
                ? 'Finalisation…'
                : `● ${startLabel}`}
          </button>
        ) : state.isPaused ? (
          <button
            type="button"
            onClick={handleStartResume}
            disabled={pendingAction !== null}
            className="rounded-lg bg-grenadine px-5 py-2.5 font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            data-testid="prompter-resume"
          >
            ▶ Reprendre
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="rounded-lg bg-ocre px-5 py-2.5 font-semibold text-ink transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            data-testid="prompter-pause"
          >
            ⏸ Pause
          </button>
        )}

        {isActive && (
          <button
            type="button"
            onClick={handleStop}
            disabled={pendingAction !== null}
            className="rounded-lg bg-ink-80 px-4 py-2.5 font-semibold text-white transition hover:bg-ink-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            data-testid="prompter-stop"
          >
            ⏹ Stop
          </button>
        )}

        {state.isScrolling && !state.isPaused && !autoFollow && (
          <button
            type="button"
            onClick={resumeAutoFollow}
            className="rounded-lg border border-ocre px-4 py-2.5 font-semibold text-ocre transition-colors hover:bg-ocre hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            data-testid="prompter-follow"
          >
            Suivre le texte
          </button>
        )}

        <div className="order-last flex w-full items-center gap-3 sm:order-none sm:ml-auto sm:w-auto">
          <label htmlFor="speed-slider" className="text-sm text-paper-soft">
            Vitesse
          </label>
          <input
            id="speed-slider"
            type="range"
            min={1}
            max={10}
            value={state.speed}
            onChange={handleSpeedChange}
            className="min-w-0 flex-1 accent-grenadine sm:w-28 sm:flex-none"
            data-testid="speed-slider"
          />
          <span className="w-4 text-center text-sm tabular-nums text-paper-soft">{state.speed}</span>
          <div
            className="ml-auto min-w-[4.5rem] text-right font-mono text-lg tabular-nums text-paper sm:ml-2"
            role="timer"
            aria-live="off"
            data-testid="chronometre"
          >
            {formatElapsed(state.elapsedMs)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-paper/10 px-5 py-2.5 text-xs text-paper-soft">
        <span className="flex shrink-0 items-center gap-2" role="status" data-testid="prompter-status">
          <span className={`h-2 w-2 rounded-full ${state.isScrolling && !state.isPaused ? 'bg-ocre' : 'bg-paper/40'}`} />
          {readingStatus}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper/10" aria-hidden="true">
          <div
            className="h-full rounded-full bg-ocre transition-[width] duration-150 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
            data-testid="prompter-progress"
          />
        </div>
        <span className="w-9 text-right tabular-nums">{progress}%</span>
      </div>

      {/* Teleprompter display */}
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-ink px-5 py-8 scroll-py-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ocre sm:px-10 sm:py-10 sm:scroll-py-10"
        tabIndex={0}
        role="region"
        aria-label="Texte du prompteur"
        onWheel={releaseAutoFollow}
        onTouchStart={releaseAutoFollow}
        onPointerDown={releaseAutoFollow}
        onKeyDown={handlePrompterKeyDown}
        data-testid="prompter-scroll-area"
      >
        <div className="mx-auto max-w-3xl text-left text-2xl font-medium leading-[2.15] sm:text-3xl sm:leading-[2.2]">
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
    </div>
  );
}

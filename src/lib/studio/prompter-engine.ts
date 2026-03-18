import { logger } from '@/lib/logger';

const SERVICE_NAME = 'PrompterEngine';

export interface PrompterState {
  isScrolling: boolean;
  isPaused: boolean;
  currentWordIndex: number;
  scrollPosition: number;
  speed: number; // 1-10 scale
  elapsedMs: number;
}

type StateListener = (state: PrompterState) => void;

const DEFAULT_SPEED = 5;
const MIN_SPEED = 1;
const MAX_SPEED = 10;
// Pixels per second at speed 1 and speed 10
const PX_PER_SEC_MIN = 20;
const PX_PER_SEC_MAX = 120;

export class PrompterEngine {
  private state: PrompterState = {
    isScrolling: false,
    isPaused: false,
    currentWordIndex: 0,
    scrollPosition: 0,
    speed: DEFAULT_SPEED,
    elapsedMs: 0,
  };

  private listeners = new Set<StateListener>();
  private rafId: number | null = null;
  private lastFrameTime: number | null = null;
  private totalWords = 0;
  private wordsPerSecond = 0;

  getState(): PrompterState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  private getPixelsPerSecond(): number {
    const ratio = (this.state.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED);
    return PX_PER_SEC_MIN + ratio * (PX_PER_SEC_MAX - PX_PER_SEC_MIN);
  }

  start(totalWords: number): void {
    if (this.state.isScrolling && !this.state.isPaused) return;

    this.totalWords = totalWords;
    // Estimate words per second based on speed (average reading: ~2.5 words/sec at speed 5)
    this.wordsPerSecond = 1 + (this.state.speed / MAX_SPEED) * 3;

    if (this.state.isPaused) {
      // Resume
      this.state.isPaused = false;
      this.lastFrameTime = performance.now();
      this.scheduleFrame();
      logger.info(SERVICE_NAME, 'Resumed');
    } else {
      // Fresh start
      this.state = {
        ...this.state,
        isScrolling: true,
        isPaused: false,
        currentWordIndex: 0,
        scrollPosition: 0,
        elapsedMs: 0,
      };
      this.lastFrameTime = performance.now();
      this.scheduleFrame();
      logger.info(SERVICE_NAME, 'Started', { totalWords, speed: this.state.speed });
    }
    this.notify();
  }

  pause(): void {
    if (!this.state.isScrolling || this.state.isPaused) return;
    this.state.isPaused = true;
    this.cancelFrame();
    this.notify();
    logger.info(SERVICE_NAME, 'Paused', { elapsedMs: this.state.elapsedMs });
  }

  stop(): void {
    this.cancelFrame();
    this.state = {
      ...this.state,
      isScrolling: false,
      isPaused: false,
    };
    this.lastFrameTime = null;
    this.notify();
    logger.info(SERVICE_NAME, 'Stopped');
  }

  reset(): void {
    this.cancelFrame();
    this.state = {
      isScrolling: false,
      isPaused: false,
      currentWordIndex: 0,
      scrollPosition: 0,
      speed: DEFAULT_SPEED,
      elapsedMs: 0,
    };
    this.lastFrameTime = null;
    this.notify();
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    this.wordsPerSecond = 1 + (this.state.speed / MAX_SPEED) * 3;
    this.notify();
  }

  togglePause(): void {
    if (this.state.isPaused) {
      this.start(this.totalWords);
    } else if (this.state.isScrolling) {
      this.pause();
    }
  }

  private scheduleFrame(): void {
    this.rafId = requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  private cancelFrame(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(timestamp: number): void {
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
    }

    const deltaMs = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // Update elapsed time
    this.state.elapsedMs += deltaMs;

    // Update scroll position
    const pxPerSec = this.getPixelsPerSecond();
    this.state.scrollPosition += (pxPerSec * deltaMs) / 1000;

    // Update current word index based on elapsed time
    const elapsedSec = this.state.elapsedMs / 1000;
    const estimatedWordIndex = Math.floor(elapsedSec * this.wordsPerSecond);
    this.state.currentWordIndex = Math.min(estimatedWordIndex, this.totalWords - 1);

    // Check if we've reached the end
    if (this.state.currentWordIndex >= this.totalWords - 1) {
      this.state.isScrolling = false;
      this.cancelFrame();
      logger.info(SERVICE_NAME, 'Reached end');
    } else {
      this.scheduleFrame();
    }

    this.notify();
  }

  destroy(): void {
    this.cancelFrame();
    this.listeners.clear();
  }
}

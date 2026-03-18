import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AudioPlayerService';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentUrl: string | null;
}

type StateListener = (state: AudioPlayerState) => void;

class AudioPlayerServiceImpl {
  private audio: HTMLAudioElement | null = null;
  private _currentUrl: string | null = null;
  private listeners = new Set<StateListener>();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private onEnded: (() => void) | null = null;
  private onError: (() => void) | null = null;

  getState(): AudioPlayerState {
    if (!this.audio) {
      return { isPlaying: false, currentTime: 0, duration: 0, currentUrl: null };
    }
    return {
      isPlaying: !this.audio.paused,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      currentUrl: this._currentUrl,
    };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  private startUpdates() {
    this.stopUpdates();
    this.updateInterval = setInterval(() => this.notify(), 250);
  }

  private stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private cleanupAudio() {
    if (this.audio) {
      if (this.onEnded) this.audio.removeEventListener('ended', this.onEnded);
      if (this.onError) this.audio.removeEventListener('error', this.onError);
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.onEnded = null;
    this.onError = null;
    this._currentUrl = null;
  }

  async play(url: string): Promise<boolean> {
    if (!url) {
      logger.warn(SERVICE_NAME, 'No URL provided');
      return false;
    }

    // If same URL, just resume
    if (this.audio && this._currentUrl === url && this.audio.paused) {
      try {
        await this.audio.play();
        this.startUpdates();
        this.notify();
        logger.info(SERVICE_NAME, 'Resumed playback');
        return true;
      } catch (e) {
        logger.error(SERVICE_NAME, 'Failed to resume', { error: String(e) });
        return false;
      }
    }

    // New URL — stop current and start new
    this.stop();
    this.audio = new Audio(url);
    this._currentUrl = url;

    this.onEnded = () => {
      this.stopUpdates();
      this.notify();
      logger.info(SERVICE_NAME, 'Playback ended');
    };

    this.onError = () => {
      this.stopUpdates();
      this.notify();
      logger.error(SERVICE_NAME, 'Playback error', { url });
    };

    this.audio.addEventListener('ended', this.onEnded);
    this.audio.addEventListener('error', this.onError);

    try {
      await this.audio.play();
      this.startUpdates();
      this.notify();
      logger.info(SERVICE_NAME, 'Started playback', { url });
      return true;
    } catch (e) {
      logger.error(SERVICE_NAME, 'Failed to start playback', { error: String(e) });
      this.cleanupAudio();
      this.notify();
      return false;
    }
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.stopUpdates();
      this.notify();
      logger.info(SERVICE_NAME, 'Paused');
    }
  }

  stop(): void {
    this.cleanupAudio();
    this.stopUpdates();
    this.notify();
  }

  seek(time: number): void {
    if (this.audio && isFinite(time)) {
      const duration = this.audio.duration || 0;
      this.audio.currentTime = Math.max(0, Math.min(time, duration));
      this.notify();
    }
  }
}

export const audioPlayerService = new AudioPlayerServiceImpl();

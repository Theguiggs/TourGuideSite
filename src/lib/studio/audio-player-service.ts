import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AudioPlayerService';

/** Human-readable label for an HTMLMediaElement MediaError code. */
function describeMediaError(code?: number): string {
  switch (code) {
    case 1: return 'aborted';
    case 2: return 'network (fetch failed — often a 404/expired URL)';
    case 3: return 'decode (corrupt or empty audio)';
    case 4: return 'src-not-supported (missing object, bad format, or CORS)';
    default: return 'unknown';
  }
}

/** Short, secret-free summary of an audio URL for logging (signed URLs carry
 *  credentials in the query string; data URLs are huge). */
function summarizeUrl(url: string | null): string {
  if (!url) return '(none)';
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    return `${url.slice(0, comma > 0 ? comma : 16)} (${url.length} chars)`;
  }
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.slice(0, 80);
  }
}

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
  private onLoaded: (() => void) | null = null;

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

  private _blobUrl: string | null = null;

  private cleanupAudio() {
    if (this.audio) {
      if (this.onEnded) this.audio.removeEventListener('ended', this.onEnded);
      if (this.onError) this.audio.removeEventListener('error', this.onError);
      if (this.onLoaded) this.audio.removeEventListener('loadedmetadata', this.onLoaded);
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }
    this.onEnded = null;
    this.onError = null;
    this.onLoaded = null;
    this._currentUrl = null;
  }

  /** Convert data: URL to blob URL for reliable playback of large audio */
  private toPlayableUrl(url: string): string {
    if (!url.startsWith('data:')) return url;
    try {
      const [header, b64] = url.split(',');
      const mime = header.split(':')[1].split(';')[0];
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      this._blobUrl = URL.createObjectURL(blob);
      return this._blobUrl;
    } catch {
      return url;
    }
  }

  /**
   * Prepare an audio source without auto-playing, so the player bar reflects the
   * active scene immediately. Used when switching scenes / after (re)generating
   * TTS: the bar shows the new track (paused, correct duration once metadata
   * loads) instead of keeping the previously played one. No-op if the same URL
   * is already loaded so it never interrupts ongoing playback of that track.
   */
  load(url: string): void {
    if (!url) {
      this.stop();
      return;
    }
    if (this._currentUrl === url) return;

    this.stop();
    const playableUrl = this.toPlayableUrl(url);
    this.audio = new Audio(playableUrl);
    this._currentUrl = url;

    this.onEnded = () => {
      this.stopUpdates();
      this.notify();
    };
    this.onError = () => {
      this.stopUpdates();
      this.notify();
      const code = this.audio?.error?.code;
      logger.error(SERVICE_NAME, 'Audio load error', {
        code: code ?? null,
        detail: describeMediaError(code),
        url: summarizeUrl(url),
      });
    };
    // Duration is unknown until metadata loads; notify so the bar refreshes
    // without needing playback to start the update interval.
    this.onLoaded = () => this.notify();

    this.audio.addEventListener('ended', this.onEnded);
    this.audio.addEventListener('error', this.onError);
    this.audio.addEventListener('loadedmetadata', this.onLoaded);
    this.audio.load();
    this.notify();
    logger.info(SERVICE_NAME, 'Loaded audio (paused)', { url });
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
    const playableUrl = this.toPlayableUrl(url);
    this.audio = new Audio(playableUrl);
    this._currentUrl = url;

    this.onEnded = () => {
      this.stopUpdates();
      this.notify();
      logger.info(SERVICE_NAME, 'Playback ended');
    };

    this.onError = () => {
      this.stopUpdates();
      this.notify();
      const code = this.audio?.error?.code;
      logger.error(SERVICE_NAME, 'Playback error', {
        code: code ?? null,
        detail: describeMediaError(code),
        url: summarizeUrl(url),
      });
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
      const err = e as Error;
      // AbortError is benign — fires when a new play() call interrupts
      // the previous one (legitimate during fast scene switching).
      if (err?.name === 'AbortError') {
        logger.info(SERVICE_NAME, 'Playback aborted (interrupted by newer play call)');
      } else {
        logger.error(SERVICE_NAME, 'Failed to start playback', {
          errorName: err?.name,
          errorMessage: err?.message,
        });
      }
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

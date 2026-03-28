/**
 * AudioMixerService — mixes speech + ambiance using Web Audio API.
 * Speech plays once, ambiance loops underneath.
 */

import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AudioMixerService';

export interface MixerState {
  isPlaying: boolean;
  speechGain: number;
  ambianceGain: number;
  currentTime: number;
  duration: number;
}

type MixerListener = (state: MixerState) => void;

class AudioMixerServiceImpl {
  private ctx: AudioContext | null = null;
  private speechSource: AudioBufferSourceNode | null = null;
  private ambianceSource: AudioBufferSourceNode | null = null;
  private speechGainNode: GainNode | null = null;
  private ambianceGainNode: GainNode | null = null;
  private speechBuffer: AudioBuffer | null = null;
  private ambianceBuffer: AudioBuffer | null = null;
  private _isPlaying = false;
  private _speechGain = 0.8;
  private _ambianceGain = 0.3;
  private _startTime = 0;
  private _pauseOffset = 0;
  private listeners = new Set<MixerListener>();
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: MixerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  getState(): MixerState {
    return {
      isPlaying: this._isPlaying,
      speechGain: Math.round(this._speechGain * 100),
      ambianceGain: Math.round(this._ambianceGain * 100),
      currentTime: this._isPlaying && this.ctx
        ? this.ctx.currentTime - this._startTime + this._pauseOffset
        : this._pauseOffset,
      duration: this.speechBuffer?.duration ?? 0,
    };
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  async loadSpeech(url: string): Promise<void> {
    const ctx = this.ensureContext();
    try {
      let audioData: ArrayBuffer;
      if (url.startsWith('data:')) {
        const [, b64] = url.split(',');
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        audioData = bytes.buffer;
      } else {
        const response = await fetch(url);
        audioData = await response.arrayBuffer();
      }
      this.speechBuffer = await ctx.decodeAudioData(audioData);
      logger.info(SERVICE_NAME, 'Speech loaded', { duration: this.speechBuffer.duration });
    } catch (e) {
      logger.error(SERVICE_NAME, 'Failed to load speech', { error: String(e) });
    }
  }

  async loadAmbiance(url: string): Promise<void> {
    const ctx = this.ensureContext();
    try {
      const response = await fetch(url);
      const audioData = await response.arrayBuffer();
      this.ambianceBuffer = await ctx.decodeAudioData(audioData);
      logger.info(SERVICE_NAME, 'Ambiance loaded', { duration: this.ambianceBuffer.duration });
    } catch (e) {
      logger.error(SERVICE_NAME, 'Failed to load ambiance', { error: String(e) });
    }
  }

  clearAmbiance(): void {
    if (this.ambianceSource) {
      try { this.ambianceSource.stop(); } catch {}
      this.ambianceSource = null;
    }
    this.ambianceBuffer = null;
    if (this._isPlaying) {
      // Restart without ambiance
      this.stop();
    }
    this.notify();
  }

  play(): void {
    if (!this.speechBuffer) return;
    const ctx = this.ensureContext();

    this.stopSources();

    // Speech
    this.speechGainNode = ctx.createGain();
    this.speechGainNode.gain.value = this._speechGain;
    this.speechSource = ctx.createBufferSource();
    this.speechSource.buffer = this.speechBuffer;
    this.speechSource.connect(this.speechGainNode).connect(ctx.destination);
    this.speechSource.onended = () => {
      this._isPlaying = false;
      this._pauseOffset = 0;
      this.stopSources();
      this.stopUpdates();
      this.notify();
    };

    // Ambiance (loop)
    if (this.ambianceBuffer) {
      this.ambianceGainNode = ctx.createGain();
      this.ambianceGainNode.gain.value = this._ambianceGain;
      this.ambianceSource = ctx.createBufferSource();
      this.ambianceSource.buffer = this.ambianceBuffer;
      this.ambianceSource.loop = true;
      this.ambianceSource.connect(this.ambianceGainNode).connect(ctx.destination);
      this.ambianceSource.start(0);
    }

    this.speechSource.start(0, this._pauseOffset);
    this._startTime = ctx.currentTime;
    this._isPlaying = true;
    this.startUpdates();
    this.notify();
  }

  pause(): void {
    if (!this._isPlaying || !this.ctx) return;
    this._pauseOffset += this.ctx.currentTime - this._startTime;
    this.stopSources();
    this._isPlaying = false;
    this.stopUpdates();
    this.notify();
  }

  stop(): void {
    this.stopSources();
    this._isPlaying = false;
    this._pauseOffset = 0;
    this.stopUpdates();
    this.notify();
  }

  seek(time: number): void {
    const duration = this.speechBuffer?.duration ?? 0;
    this._pauseOffset = Math.max(0, Math.min(time, duration));
    if (this._isPlaying) {
      this.play(); // restart from new position
    }
    this.notify();
  }

  setSpeechGain(percent: number): void {
    this._speechGain = Math.max(0, Math.min(1, percent / 100));
    if (this.speechGainNode) {
      this.speechGainNode.gain.value = this._speechGain;
    }
    this.notify();
  }

  setAmbianceGain(percent: number): void {
    this._ambianceGain = Math.max(0, Math.min(1, percent / 100));
    if (this.ambianceGainNode) {
      this.ambianceGainNode.gain.value = this._ambianceGain;
    }
    this.notify();
  }

  private stopSources(): void {
    if (this.speechSource) {
      try { this.speechSource.stop(); } catch {}
      this.speechSource = null;
    }
    if (this.ambianceSource) {
      try { this.ambianceSource.stop(); } catch {}
      this.ambianceSource = null;
    }
  }

  private startUpdates(): void {
    this.stopUpdates();
    this.updateInterval = setInterval(() => this.notify(), 250);
  }

  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.speechBuffer = null;
    this.ambianceBuffer = null;
  }
}

export const audioMixerService = new AudioMixerServiceImpl();

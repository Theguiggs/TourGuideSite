import { logger } from '@/lib/logger';
import { StudioErrorCode, createStudioError, type StudioError } from '@/types/studio';

const SERVICE_NAME = 'MediaRecorderService';
/** Délai de garde : au-delà, `stopRecording` rend ce qui a été capté. */
const STOP_TIMEOUT_MS = 5000;

export type RecorderState = 'idle' | 'requesting_permission' | 'ready' | 'recording' | 'paused' | 'stopped';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

type RecorderStateListener = (state: RecorderState) => void;

function getPreferredMimeType(): string {
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  }
  return 'audio/webm'; // fallback
}

class MediaRecorderServiceImpl {
  private state: RecorderState = 'idle';
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private pausedDuration = 0;
  private pauseStartTime = 0;
  private mimeType = '';
  private listeners = new Set<RecorderStateListener>();

  getState(): RecorderState {
    return this.state;
  }

  subscribe(listener: RecorderStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(newState: RecorderState) {
    this.state = newState;
    this.listeners.forEach((l) => l(newState));
  }

  async enumerateDevices(): Promise<{ ok: true; devices: AudioDevice[] } | { ok: false; error: StudioError }> {
    try {
      // Need permission first to get labels
      if (!this.stream) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Micro ${d.deviceId.slice(0, 8)}` }));
      logger.info(SERVICE_NAME, 'Devices enumerated', { count: audioInputs.length });
      return { ok: true, devices: audioInputs };
    } catch (e) {
      logger.error(SERVICE_NAME, 'Device enumeration failed', { error: String(e) });
      return { ok: false, error: createStudioError(StudioErrorCode.MIC_PERMISSION_DENIED, 'Impossible de lister les micros.') };
    }
  }

  async requestPermission(deviceId?: string): Promise<{ ok: true } | { ok: false; error: StudioError }> {
    this.setState('requesting_permission');
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mimeType = getPreferredMimeType();
      this.setState('ready');
      logger.info(SERVICE_NAME, 'Permission granted', { mimeType: this.mimeType });
      return { ok: true };
    } catch (e) {
      this.setState('idle');
      logger.warn(SERVICE_NAME, 'Permission denied', { error: String(e) });
      return { ok: false, error: createStudioError(StudioErrorCode.MIC_PERMISSION_DENIED, 'Permission micro refusée.') };
    }
  }

  startRecording(): { ok: true } | { ok: false; error: StudioError } {
    if (!this.stream) {
      return { ok: false, error: createStudioError(StudioErrorCode.RECORDER_START_FAILED, 'Stream non disponible. Demandez la permission d\'abord.') };
    }

    try {
      this.chunks = [];
      this.recorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType,
        audioBitsPerSecond: 128000,
      });

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.recorder.onerror = () => {
        logger.error(SERVICE_NAME, 'Recorder error — releasing stream');
        this.setState('stopped');
        // Stop all tracks so the mic indicator clears and stopRecording() resolves
        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
        }
        this.recorder = null;
      };

      this.recorder.start(1000); // collect data every second
      this.startTime = Date.now();
      this.pausedDuration = 0;
      this.pauseStartTime = 0;
      this.setState('recording');
      logger.info(SERVICE_NAME, 'Recording started', { mimeType: this.mimeType });
      return { ok: true };
    } catch (e) {
      logger.error(SERVICE_NAME, 'Start recording failed', { error: String(e) });
      return { ok: false, error: createStudioError(StudioErrorCode.RECORDER_START_FAILED, 'Impossible de démarrer l\'enregistrement.') };
    }
  }

  pauseRecording(): void {
    if (this.recorder && this.state === 'recording') {
      this.recorder.pause();
      this.pauseStartTime = Date.now();
      this.setState('paused');
      logger.info(SERVICE_NAME, 'Recording paused');
    }
  }

  resumeRecording(): void {
    if (this.recorder && this.state === 'paused') {
      this.recorder.resume();
      this.pausedDuration += Date.now() - this.pauseStartTime;
      this.pauseStartTime = 0;
      this.setState('recording');
      logger.info(SERVICE_NAME, 'Recording resumed');
    }
  }

  /**
   * Arrête l'enregistrement et rend la prise.
   *
   * La promesse se résout TOUJOURS. Elle ne dépendait que de `onstop` : si le
   * périphérique était débranché pendant l'enregistrement, `onerror` partait,
   * `onstop` ne venait jamais, et la promesse restait pendante — le bouton
   * restait figé sur « Arrêter » et l'état de l'enregistreur devenait
   * incohérent. Deux issues de secours sont posées : l'erreur du recorder, et
   * un délai de garde.
   */
  stopRecording(): Promise<RecordingResult | null> {
    return new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder || (this.state !== 'recording' && this.state !== 'paused')) {
        resolve(null);
        return;
      }

      let settled = false;
      let guard: ReturnType<typeof setTimeout> | null = null;

      const finish = (result: RecordingResult | null) => {
        if (settled) return;
        settled = true;
        if (guard) clearTimeout(guard);
        this.setState('stopped');
        resolve(result);
      };

      /** Assemble ce qui a été capté jusqu'ici — mieux qu'une prise perdue. */
      const collected = (): RecordingResult | null => {
        if (this.chunks.length === 0) return null;
        const blob = new Blob(this.chunks, { type: this.mimeType });
        const totalPaused = this.pausedDuration + (this.pauseStartTime > 0 ? Date.now() - this.pauseStartTime : 0);
        const durationMs = Date.now() - this.startTime - totalPaused;
        return { blob, mimeType: this.mimeType, durationMs };
      };

      recorder.onstop = () => {
        const result = collected();
        logger.info(SERVICE_NAME, 'Recording stopped', {
          size: result?.blob.size ?? 0,
          durationMs: result?.durationMs ?? 0,
        });
        finish(result);
      };

      recorder.onerror = () => {
        logger.error(SERVICE_NAME, 'Recorder error while stopping — returning what was captured');
        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
        }
        this.recorder = null;
        finish(collected());
      };

      // Filet de sécurité : un `onstop` qui ne vient jamais ne doit pas figer
      // l'interface. Cinq secondes après l'arrêt demandé, on rend ce qu'on a.
      guard = setTimeout(() => {
        logger.warn(SERVICE_NAME, 'onstop never fired — resolving from collected chunks');
        finish(collected());
      }, STOP_TIMEOUT_MS);

      try {
        recorder.stop();
      } catch (e) {
        logger.error(SERVICE_NAME, 'recorder.stop() threw', { error: String(e) });
        finish(collected());
      }
    });
  }

  releaseStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
    this.setState('idle');
    logger.info(SERVICE_NAME, 'Stream released');
  }

  getMimeType(): string {
    return this.mimeType;
  }
}

export const mediaRecorderService = new MediaRecorderServiceImpl();

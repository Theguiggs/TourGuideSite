import { mediaRecorderService } from '../media-recorder-service';

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  static lastInstance: FakeMediaRecorder | null = null;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeMediaRecorder.lastInstance = this;
  }

  start() {}
  pause() {}
  resume() {}
  stop() {
    this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/mp4' }) } as BlobEvent);
    this.onstop?.();
  }
}

describe('mediaRecorderService', () => {
  beforeEach(() => {
    FakeMediaRecorder.lastInstance = null;
    mediaRecorderService.releaseStream();
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn(async () => ({ getTracks: () => [{ stop: jest.fn() }] })),
        enumerateDevices: jest.fn(async () => []),
      },
    });
    Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
  });

  afterEach(() => mediaRecorderService.releaseStream());

  it('returns a non-empty recording and settles back to ready after stop', async () => {
    await expect(mediaRecorderService.requestPermission()).resolves.toEqual({ ok: true });
    expect(mediaRecorderService.startRecording()).toEqual({ ok: true });

    const result = await mediaRecorderService.stopRecording();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.recording.blob.size).toBeGreaterThan(0);
    expect(mediaRecorderService.getState()).toBe('ready');
  });

  it('returns an error immediately instead of hanging when nothing is recording', async () => {
    const result = await mediaRecorderService.stopRecording();
    expect(result.ok).toBe(false);
    expect(mediaRecorderService.getState()).toBe('idle');
  });

  it('reports an asynchronous recorder failure and returns to an honest idle state', async () => {
    await expect(mediaRecorderService.requestPermission()).resolves.toEqual({ ok: true });
    expect(mediaRecorderService.startRecording()).toEqual({ ok: true });

    FakeMediaRecorder.lastInstance?.onerror?.();

    expect(mediaRecorderService.getState()).toBe('idle');
    expect(mediaRecorderService.getLastError()?.message).toMatch(/interrompu/);
  });

  it('rejects an empty recording instead of creating an unusable take', async () => {
    await mediaRecorderService.requestPermission();
    mediaRecorderService.startRecording();
    if (FakeMediaRecorder.lastInstance) {
      FakeMediaRecorder.lastInstance.stop = function stopWithoutData() {
        this.onstop?.();
      };
    }

    const result = await mediaRecorderService.stopRecording();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/vide/);
  });

  it('settles with an error when MediaRecorder emits an error while stopping', async () => {
    await mediaRecorderService.requestPermission();
    mediaRecorderService.startRecording();
    if (FakeMediaRecorder.lastInstance) {
      FakeMediaRecorder.lastInstance.stop = function stopWithError() {
        this.onerror?.();
      };
    }

    const result = await mediaRecorderService.stopRecording();

    expect(result.ok).toBe(false);
    expect(mediaRecorderService.getState()).toBe('ready');
  });

  it('settles with an error when MediaRecorder.stop throws synchronously', async () => {
    await mediaRecorderService.requestPermission();
    mediaRecorderService.startRecording();
    if (FakeMediaRecorder.lastInstance) {
      FakeMediaRecorder.lastInstance.stop = () => {
        throw new Error('device disconnected');
      };
    }

    const result = await mediaRecorderService.stopRecording();

    expect(result.ok).toBe(false);
    expect(mediaRecorderService.getState()).toBe('ready');
  });
});

import { validateAndImportFile, MAX_FILE_SIZE_BYTES } from '../file-import-service';

// Mock Audio element for duration detection
(global as Record<string, unknown>).Audio = class {
  listeners: Record<string, (() => void)[]> = {};
  duration = 60; // 60 seconds

  addEventListener(event: string, cb: () => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    // Auto-fire loadedmetadata
    if (event === 'loadedmetadata') setTimeout(cb, 0);
  }
};

(global as Record<string, unknown>).URL = {
  createObjectURL: jest.fn(() => 'blob:test'),
  revokeObjectURL: jest.fn(),
};

describe('validateAndImportFile', () => {
  it('accepts valid MP3 file', async () => {
    const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await validateAndImportFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.fileName).toBe('test.mp3');
      expect(result.result.mimeType).toBe('audio/mpeg');
    }
  });

  it('accepts valid WAV file', async () => {
    const file = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
    const result = await validateAndImportFile(file);
    expect(result.ok).toBe(true);
  });

  it('accepts file by extension when type is empty', async () => {
    const file = new File(['audio data'], 'test.m4a', { type: '' });
    const result = await validateAndImportFile(file);
    expect(result.ok).toBe(true);
  });

  it('rejects unsupported file type', async () => {
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    const result = await validateAndImportFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(2309);
      expect(result.error.message).toContain('Format non supporté');
    }
  });

  it('rejects file exceeding size limit', async () => {
    // Create a file larger than MAX_FILE_SIZE
    const data = new ArrayBuffer(MAX_FILE_SIZE_BYTES + 1);
    const file = new File([data], 'huge.mp3', { type: 'audio/mpeg' });
    const result = await validateAndImportFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(2309);
      expect(result.error.message).toContain('trop volumineux');
    }
  });

  it('returns file size in MB', async () => {
    const file = new File(['x'.repeat(1024 * 1024)], 'test.mp3', { type: 'audio/mpeg' });
    const result = await validateAndImportFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.fileSizeMB).toBeGreaterThan(0);
    }
  });
});

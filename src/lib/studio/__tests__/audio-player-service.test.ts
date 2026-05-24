import { audioPlayerService } from '../audio-player-service';

// Mock HTMLAudioElement
const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockPause = jest.fn();
const mockLoad = jest.fn();

class MockAudio {
  src = '';
  currentTime = 0;
  duration = 120;
  paused = true;
  listeners: Record<string, (() => void)[]> = {};

  play() {
    this.paused = false;
    return mockPlay();
  }
  pause() {
    this.paused = true;
    mockPause();
  }
  load() { mockLoad(); }
  addEventListener(event: string, cb: () => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
  removeEventListener(event: string, cb: () => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
    }
  }
  removeAttribute() {}
}

(global as Record<string, unknown>).Audio = MockAudio;

describe('AudioPlayerService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    audioPlayerService.stop();
    jest.clearAllMocks();
  });

  afterEach(() => {
    audioPlayerService.stop();
    jest.useRealTimers();
  });

  it('starts with idle state', () => {
    const state = audioPlayerService.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentUrl).toBeNull();
    expect(state.currentTime).toBe(0);
  });

  it('plays audio from URL and returns true', async () => {
    const result = await audioPlayerService.play('https://example.com/audio.aac');
    expect(result).toBe(true);
    expect(audioPlayerService.getState().isPlaying).toBe(true);
    expect(audioPlayerService.getState().currentUrl).toBe('https://example.com/audio.aac');
  });

  it('pauses playing audio', async () => {
    await audioPlayerService.play('https://example.com/audio.aac');
    audioPlayerService.pause();
    expect(audioPlayerService.getState().isPlaying).toBe(false);
  });

  it('stops and resets state', async () => {
    await audioPlayerService.play('https://example.com/audio.aac');
    audioPlayerService.stop();
    const state = audioPlayerService.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentUrl).toBeNull();
  });

  it('returns false for empty URL', async () => {
    const result = await audioPlayerService.play('');
    expect(result).toBe(false);
    expect(audioPlayerService.getState().isPlaying).toBe(false);
  });

  it('returns false when play() throws', async () => {
    mockPlay.mockRejectedValueOnce(new Error('Autoplay blocked'));
    const result = await audioPlayerService.play('https://blocked.com/audio.aac');
    expect(result).toBe(false);
  });

  it('notifies subscribers on state change', async () => {
    const listener = jest.fn();
    const unsub = audioPlayerService.subscribe(listener);
    await audioPlayerService.play('https://example.com/audio.aac');
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it('resumes same URL without recreating audio', async () => {
    await audioPlayerService.play('https://example.com/audio.aac');
    audioPlayerService.pause();
    const result = await audioPlayerService.play('https://example.com/audio.aac');
    expect(result).toBe(true);
    // play() should be called twice (initial + resume)
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('clamps seek to valid range', async () => {
    await audioPlayerService.play('https://example.com/audio.aac');
    audioPlayerService.seek(-5);
    expect(audioPlayerService.getState().currentTime).toBe(0);
  });

  it('load() prepares a URL without auto-playing', () => {
    audioPlayerService.load('https://example.com/scene-a.wav');
    const state = audioPlayerService.getState();
    expect(state.currentUrl).toBe('https://example.com/scene-a.wav');
    expect(state.isPlaying).toBe(false);
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('load() switches the loaded track when the URL changes', () => {
    audioPlayerService.load('https://example.com/scene-a.wav');
    audioPlayerService.load('https://example.com/scene-b.wav');
    expect(audioPlayerService.getState().currentUrl).toBe('https://example.com/scene-b.wav');
  });

  it('load() of the same URL does not interrupt ongoing playback', async () => {
    await audioPlayerService.play('https://example.com/scene-a.wav');
    expect(audioPlayerService.getState().isPlaying).toBe(true);
    audioPlayerService.load('https://example.com/scene-a.wav');
    // Same URL → no-op, still playing the same track
    expect(audioPlayerService.getState().isPlaying).toBe(true);
    expect(audioPlayerService.getState().currentUrl).toBe('https://example.com/scene-a.wav');
  });

  it('load() with empty URL stops the player', async () => {
    await audioPlayerService.play('https://example.com/scene-a.wav');
    audioPlayerService.load('');
    expect(audioPlayerService.getState().currentUrl).toBeNull();
    expect(audioPlayerService.getState().isPlaying).toBe(false);
  });
});

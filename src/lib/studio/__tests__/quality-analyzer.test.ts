import { analyzeAudioQuality } from '../quality-analyzer';

// Mock AudioContext — always returns a moderate-volume signal
class MockAudioContext {
  async decodeAudioData(): Promise<AudioBuffer> {
    const samples = new Float32Array(44100);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin(i * 0.1) * 0.3;
    }
    return {
      getChannelData: (_channel: number) => samples,
      sampleRate: 44100,
      length: samples.length,
      duration: 1,
      numberOfChannels: 1,
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;
  }
  async close() {}
}

(global as Record<string, unknown>).AudioContext = MockAudioContext;

describe('analyzeAudioQuality', () => {
  it('analyzes audio and returns structured result', async () => {
    const blob = new Blob(['fake audio'], { type: 'audio/wav' });
    const result = await analyzeAudioQuality(blob);
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('details');
    expect(result).toHaveProperty('message');
    expect(result.details).toHaveProperty('averageVolume');
    expect(result.details).toHaveProperty('peakClipping');
    expect(result.details).toHaveProperty('silenceRatio');
  });

  it('returns valid overall score (good, needs_improvement, or null)', async () => {
    const blob = new Blob(['fake audio'], { type: 'audio/wav' });
    const result = await analyzeAudioQuality(blob);
    expect([null, 'good', 'needs_improvement']).toContain(result.overall);
  });

  it('returns numeric averageVolume', async () => {
    const blob = new Blob(['fake audio'], { type: 'audio/wav' });
    const result = await analyzeAudioQuality(blob);
    expect(typeof result.details.averageVolume).toBe('number');
  });

  it('returns silenceRatio as percentage', async () => {
    const blob = new Blob(['fake audio'], { type: 'audio/wav' });
    const result = await analyzeAudioQuality(blob);
    expect(result.details.silenceRatio).toBeGreaterThanOrEqual(0);
    expect(result.details.silenceRatio).toBeLessThanOrEqual(100);
  });
});

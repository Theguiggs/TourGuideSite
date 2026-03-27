import { detectSilences } from '../silence-detection';

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('SilenceDetectionAPI', () => {
  it('returns segments in stub mode', async () => {
    const result = await detectSilences('guide-studio/test/audio.wav');
    expect(result.ok).toBe(true);
    expect(result.segments.length).toBeGreaterThanOrEqual(3);
    expect(result.segments.length).toBeLessThanOrEqual(5);
  });

  it('segments have valid timestamps', async () => {
    const result = await detectSilences('guide-studio/test/audio.wav');
    expect(result.ok).toBe(true);

    for (const seg of result.segments) {
      expect(seg.startMs).toBeGreaterThanOrEqual(0);
      expect(seg.endMs).toBeGreaterThan(seg.startMs);
    }
  });

  it('segments are ordered', async () => {
    const result = await detectSilences('guide-studio/test/audio.wav');
    expect(result.ok).toBe(true);

    for (let i = 1; i < result.segments.length; i++) {
      expect(result.segments[i].startMs).toBeGreaterThanOrEqual(result.segments[i - 1].startMs);
    }
  });
});

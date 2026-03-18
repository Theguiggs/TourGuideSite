import {
  triggerTranscription,
  getTranscriptionStatus,
  getTranscriptionQuota,
  __resetTranscriptionStubs,
} from '../transcription';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

beforeEach(() => {
  __resetTranscriptionStubs();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('triggerTranscription', () => {
  it('returns ok with jobId for valid scene', async () => {
    const promise = triggerTranscription('scene-1', 3);
    jest.advanceTimersByTime(600);
    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.jobId).toMatch(/^job-/);
      expect(result.estimatedMinutes).toBeGreaterThan(0);
    }
  });

  it('rejects when quota exceeded', async () => {
    // Exhaust quota quickly — each trigger adds minutes to stub quota
    // Start at 35.5, need >120. 29 * 3 = 87 + 35.5 = 122.5
    for (let i = 0; i < 29; i++) {
      const p = triggerTranscription(`scene-exhaust-${i}`, 3);
      jest.advanceTimersByTime(600);
      await p;
    }
    const p = triggerTranscription('scene-blocked', 3);
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(2307);
    }
  });
});

describe('getTranscriptionStatus', () => {
  it('returns processing for recent job', async () => {
    const p = triggerTranscription('scene-1', 3);
    jest.advanceTimersByTime(600);
    const trigger = await p;
    if (!trigger.ok) throw new Error('trigger failed');

    const status = await getTranscriptionStatus(trigger.jobId);
    expect(status).not.toBeNull();
    expect(status!.status).toBe('processing');
    expect(status!.sceneId).toBe('scene-1');
  });

  it('returns null for unknown job', async () => {
    const status = await getTranscriptionStatus('nonexistent-job');
    expect(status).toBeNull();
  });

  it('returns completed after simulated duration', async () => {
    const p = triggerTranscription('scene-2', 3);
    jest.advanceTimersByTime(600);
    const trigger = await p;
    if (!trigger.ok) throw new Error('trigger failed');

    // Advance past the 8s simulated transcription
    jest.advanceTimersByTime(9000);

    const status = await getTranscriptionStatus(trigger.jobId);
    expect(status).not.toBeNull();
    expect(status!.status).toBe('completed');
    expect(status!.transcriptText).toBeTruthy();
  });

  it('returns failed for scene-vv-3', async () => {
    const p = triggerTranscription('scene-vv-3', 3);
    jest.advanceTimersByTime(600);
    const trigger = await p;
    if (!trigger.ok) throw new Error('trigger failed');

    jest.advanceTimersByTime(9000);

    const status = await getTranscriptionStatus(trigger.jobId);
    expect(status).not.toBeNull();
    expect(status!.status).toBe('failed');
  });
});

describe('getTranscriptionQuota', () => {
  it('returns quota with initial used minutes', async () => {
    const quota = await getTranscriptionQuota('guide-1');
    expect(quota.usedMinutes).toBe(35.5);
    expect(quota.limitMinutes).toBe(120);
    expect(quota.remainingMinutes).toBe(84.5);
    expect(quota.isWarning).toBe(false);
    expect(quota.isExceeded).toBe(false);
  });

  it('updates quota after triggering transcription', async () => {
    const p = triggerTranscription('scene-1', 10);
    jest.advanceTimersByTime(600);
    await p;
    const quota = await getTranscriptionQuota('guide-1');
    expect(quota.usedMinutes).toBe(45.5);
  });

  it('shows warning when >100 min used', async () => {
    // Add 65 minutes (35.5 + 65 = 100.5)
    for (let i = 0; i < 13; i++) {
      const p = triggerTranscription(`scene-warn-${i}`, 5);
      jest.advanceTimersByTime(600);
      await p;
    }
    const quota = await getTranscriptionQuota('guide-1');
    expect(quota.isWarning).toBe(true);
    expect(quota.isExceeded).toBe(false);
  });
});

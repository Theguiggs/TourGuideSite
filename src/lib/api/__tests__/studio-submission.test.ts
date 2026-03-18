import { submitSessionForModeration, resubmitSession, deleteSession, updateSessionStatus, addModerationFeedback, submitForReview, retractSubmission } from '../studio-submission';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

describe('submitSessionForModeration', () => {
  it('returns ok in stub mode', async () => {
    jest.useFakeTimers();
    const p = submitSessionForModeration('session-1');
    jest.advanceTimersByTime(1000);
    const result = await p;
    expect(result.ok).toBe(true);
    jest.useRealTimers();
  });
});

describe('resubmitSession', () => {
  it('returns ok in stub mode', async () => {
    jest.useFakeTimers();
    const p = resubmitSession('session-1');
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(true);
    jest.useRealTimers();
  });
});

describe('deleteSession', () => {
  it('returns ok in stub mode', async () => {
    jest.useFakeTimers();
    const p = deleteSession('session-1');
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(true);
    jest.useRealTimers();
  });
});

describe('updateSessionStatus', () => {
  it('returns ok for any status', async () => {
    const result = await updateSessionStatus('session-1', 'published');
    expect(result.ok).toBe(true);
  });
});

describe('addModerationFeedback', () => {
  it('returns ok in stub mode', async () => {
    const result = await addModerationFeedback('scene-1', 'Améliorer le volume');
    expect(result.ok).toBe(true);
  });
});

describe('submitForReview', () => {
  it('returns ok in stub mode', async () => {
    jest.useFakeTimers();
    const p = submitForReview('session-1', 'tour-1');
    jest.advanceTimersByTime(1000);
    const result = await p;
    expect(result.ok).toBe(true);
    jest.useRealTimers();
  });
});

describe('retractSubmission', () => {
  it('returns ok in stub mode', async () => {
    jest.useFakeTimers();
    const p = retractSubmission('session-1', 'tour-1');
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(true);
    jest.useRealTimers();
  });
});

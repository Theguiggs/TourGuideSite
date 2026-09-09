import { resubmitSession, deleteSession, updateSessionStatus, addModerationFeedback, submitForReview, retractSubmission } from '../studio-submission';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
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
  it('blocks an unknown historical version instead of submitting blindly', async () => {
    const result = await submitForReview('session-1', 'tour-1');
    expect(result).toEqual({ ok: false, error: 'Version de visite introuvable.' });
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

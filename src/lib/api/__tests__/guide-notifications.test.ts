import { sendGuideNotification } from '../guide-notifications';

// Force stub mode for tests
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

describe('guide-notifications', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('should send validate notification (stub)', async () => {
    const result = await sendGuideNotification('guide-1', 'tour-1', 'Test Tour', 'validate');
    expect(result.ok).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GuideNotification]'),
      expect.objectContaining({ guideId: 'guide-1', action: 'validate' }),
    );
  });

  it('should send revision notification with comments (stub)', async () => {
    const result = await sendGuideNotification('guide-1', 'tour-1', 'Test Tour', 'revision', 'Fix audio');
    expect(result.ok).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GuideNotification]'),
      expect.objectContaining({ action: 'revision' }),
    );
  });

  it('should send reject notification (stub)', async () => {
    const result = await sendGuideNotification('guide-1', 'tour-1', 'Test Tour', 'reject', 'Contenu inapproprie');
    expect(result.ok).toBe(true);
  });

  it('should be fire-and-forget safe (never throws)', async () => {
    // Even in error scenarios, the function should return a result, not throw
    const result = await sendGuideNotification('', '', '', 'validate');
    expect(result).toHaveProperty('ok');
  });
});

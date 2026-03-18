import { createStudioSession, createTourWithSession, listStudioSessions, __resetStubStore } from '../studio';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

beforeEach(() => {
  __resetStubStore();
});

describe('createStudioSession', () => {
  it('creates a new session for a valid source', async () => {
    const result = await createStudioSession('new-source-id', 'guide-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.sourceSessionId).toBe('new-source-id');
      expect(result.session.guideId).toBe('guide-1');
      expect(result.session.status).toBe('draft');
      expect(result.session.consentRGPD).toBe(true);
    }
  });

  it('prevents duplicate creation for same source', async () => {
    // MOCK_SESSIONS has sourceSessionId: 'mobile-session-001' for guide-1
    const result = await createStudioSession('mobile-session-001', 'guide-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.existingSessionId).toBeTruthy();
      expect(result.error).toContain('existe');
    }
  });

  it('allows different guides to create from same source', async () => {
    const result = await createStudioSession('mobile-session-001', 'guide-999');
    expect(result.ok).toBe(true);
  });

  it('returns new session with generated id', async () => {
    const result = await createStudioSession('another-source', 'guide-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.id).toMatch(/^studio-/);
    }
  });
});

describe('createTourWithSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns ok with tourId and sessionId', async () => {
    const p = createTourWithSession('guide-1', 'Test Tour', 'Paris');
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tourId).toMatch(/^tour-/);
      expect(result.sessionId).toMatch(/^studio-/);
    }
  });

  it('creates a session with tourId linked', async () => {
    const p = createTourWithSession('guide-1', 'Linked Tour', 'Nice');
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sessions = await listStudioSessions('guide-1');
      const created = sessions.find((s) => s.id === result.sessionId);
      expect(created).toBeDefined();
      expect(created!.tourId).toBe(result.tourId);
    }
  });

  it('generates distinct IDs on multiple calls', async () => {
    const p1 = createTourWithSession('guide-1', 'Tour A', 'Lyon');
    jest.advanceTimersByTime(600);
    const r1 = await p1;

    // Advance time to ensure different timestamp
    jest.advanceTimersByTime(10);

    const p2 = createTourWithSession('guide-1', 'Tour B', 'Marseille');
    jest.advanceTimersByTime(600);
    const r2 = await p2;

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.tourId).not.toBe(r2.tourId);
      expect(r1.sessionId).not.toBe(r2.sessionId);
    }
  });
});

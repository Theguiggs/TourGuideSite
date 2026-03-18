import { listStudioSessions, getSessionStatusConfig, createTourWithSession, __resetStubStore } from '../studio';

// Force stub mode
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

describe('listStudioSessions', () => {
  it('returns mock sessions in stub mode', async () => {
    const sessions = await listStudioSessions('guide-1');
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0]).toHaveProperty('id');
    expect(sessions[0]).toHaveProperty('title');
    expect(sessions[0]).toHaveProperty('status');
    expect(sessions[0]).toHaveProperty('createdAt');
  });

  it('all sessions have required fields', async () => {
    const sessions = await listStudioSessions('guide-1');
    for (const s of sessions) {
      expect(s.guideId).toBe('guide-1');
      expect(typeof s.language).toBe('string');
      expect(s.consentRGPD).toBe(true);
    }
  });

  it('sessions have valid status values', async () => {
    const validStatuses = ['draft', 'transcribing', 'editing', 'recording', 'ready', 'submitted', 'published', 'revision_requested', 'rejected'];
    const sessions = await listStudioSessions('guide-1');
    for (const s of sessions) {
      expect(validStatuses).toContain(s.status);
    }
  });
});

describe('getSessionStatusConfig', () => {
  it('returns label and color for each status', () => {
    const statuses = ['draft', 'transcribing', 'editing', 'recording', 'ready', 'submitted', 'published', 'revision_requested', 'rejected'] as const;
    for (const status of statuses) {
      const config = getSessionStatusConfig(status);
      expect(config.label).toBeTruthy();
      expect(config.color).toBeTruthy();
    }
  });

  it('returns correct label for draft', () => {
    expect(getSessionStatusConfig('draft').label).toBe('Brouillon');
  });

  it('returns correct label for published', () => {
    expect(getSessionStatusConfig('published').label).toBe('Publi\u00e9');
  });
});

describe('createTourWithSession', () => {
  beforeEach(() => {
    __resetStubStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns ok with non-null tourId and sessionId', async () => {
    const p = createTourWithSession('guide-1', 'Test Tour', 'Paris');
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tourId).toBeTruthy();
      expect(result.sessionId).toBeTruthy();
    }
  });

  it('created session has tourId matching returned tourId', async () => {
    const p = createTourWithSession('guide-1', 'Linked Tour', 'Lyon');
    jest.advanceTimersByTime(600);
    const result = await p;
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    jest.useRealTimers();
    const sessions = await listStudioSessions('guide-1');
    const created = sessions.find((s) => s.id === result.sessionId);
    expect(created).toBeDefined();
    expect(created!.tourId).toBe(result.tourId);
  });

  it('multiple calls generate distinct IDs', async () => {
    const p1 = createTourWithSession('guide-1', 'Tour A', 'Nice');
    jest.advanceTimersByTime(600);
    const r1 = await p1;

    // Advance time to ensure unique Date.now()
    jest.advanceTimersByTime(10);

    const p2 = createTourWithSession('guide-1', 'Tour B', 'Cannes');
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

describe('listStudioSessions filtering', () => {
  it('returns 0 sessions for unknown guideId', async () => {
    const sessions = await listStudioSessions('guide-unknown');
    expect(sessions).toHaveLength(0);
  });

  it('returns sessions only for matching guideId', async () => {
    const sessions = await listStudioSessions('guide-1');
    expect(sessions.length).toBeGreaterThan(0);
    for (const s of sessions) {
      expect(s.guideId).toBe('guide-1');
    }
  });
});

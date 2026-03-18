import { getStudioSession, listStudioScenes, getSceneStatusConfig } from '../studio';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

describe('getStudioSession', () => {
  it('returns session by id in stub mode', async () => {
    const session = await getStudioSession('session-grasse-parfums');
    expect(session).not.toBeNull();
    expect(session!.id).toBe('session-grasse-parfums');
    expect(session!.title).toBe('Grasse — Les Parfumeurs');
  });

  it('returns null for unknown session', async () => {
    const session = await getStudioSession('nonexistent');
    expect(session).toBeNull();
  });
});

describe('listStudioScenes', () => {
  it('returns scenes for known session', async () => {
    const scenes = await listStudioScenes('session-grasse-parfums');
    expect(scenes.length).toBe(6);
    expect(scenes[0].sceneIndex).toBe(0);
    expect(scenes[0].sessionId).toBe('session-grasse-parfums');
  });

  it('returns empty array for unknown session', async () => {
    const scenes = await listStudioScenes('nonexistent');
    expect(scenes).toHaveLength(0);
  });

  it('scenes have valid status values', async () => {
    const validStatuses = ['empty', 'has_original', 'transcribed', 'edited', 'recorded', 'finalized'];
    const scenes = await listStudioScenes('session-grasse-parfums');
    for (const s of scenes) {
      expect(validStatuses).toContain(s.status);
    }
  });

  it('scenes have originalAudioKey following S3 path pattern', async () => {
    const scenes = await listStudioScenes('session-grasse-parfums');
    for (const s of scenes) {
      if (s.originalAudioKey) {
        expect(s.originalAudioKey).toMatch(/^guide-studio\/.+\/original\/scene_\d+\.aac$/);
      }
    }
  });

  it('returns scenes with mixed statuses for vieille-ville session', async () => {
    const scenes = await listStudioScenes('session-grasse-vieille-ville');
    expect(scenes.length).toBe(4);
    const statuses = scenes.map((s) => s.status);
    expect(statuses).toContain('transcribed');
    expect(statuses).toContain('has_original');
    expect(statuses).toContain('empty');
  });
});

describe('getSceneStatusConfig', () => {
  it('returns config for all scene statuses', () => {
    const statuses = ['empty', 'has_original', 'transcribed', 'edited', 'recorded', 'finalized'] as const;
    for (const status of statuses) {
      const config = getSceneStatusConfig(status);
      expect(config.label).toBeTruthy();
      expect(config.color).toBeTruthy();
    }
  });

  it('returns correct label for has_original', () => {
    expect(getSceneStatusConfig('has_original').label).toBe('Audio terrain');
  });
});

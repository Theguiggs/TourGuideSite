import {
  submitLanguageForModeration,
  checkLanguageReadiness,
  confirmLanguagePurchase,
  __resetLanguagePurchaseStubs,
  __getStubPurchases,
} from '../language-purchase';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

afterEach(() => {
  __resetLanguagePurchaseStubs();
});

// --- Helpers ---

function makeScenes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `scene-${i + 1}`,
    title: `Scene ${i + 1}`,
  }));
}

function makeCompleteSegments(scenes: Array<{ id: string }>, lang: string) {
  return scenes.map((s) => ({
    sceneId: s.id,
    language: lang,
    transcriptText: `Translated text for ${s.id}`,
    audioKey: `audio/${s.id}.mp3`,
  }));
}

// --- checkLanguageReadiness ---

describe('checkLanguageReadiness', () => {
  it('returns ready=true when all scenes have text + audio', () => {
    const scenes = makeScenes(3);
    const segments = makeCompleteSegments(scenes, 'en');
    const result = checkLanguageReadiness(scenes, segments, 'en');

    expect(result.ready).toBe(true);
    expect(result.complete).toBe(3);
    expect(result.total).toBe(3);
    expect(result.scenes.every((s) => s.hasText && s.hasAudio)).toBe(true);
  });

  it('returns ready=false when scenes are missing audio', () => {
    const scenes = makeScenes(3);
    const segments = [
      { sceneId: 'scene-1', language: 'en', transcriptText: 'Text', audioKey: 'audio/1.mp3' },
      { sceneId: 'scene-2', language: 'en', transcriptText: 'Text', audioKey: null },
      { sceneId: 'scene-3', language: 'en', transcriptText: 'Text', audioKey: 'audio/3.mp3' },
    ];
    const result = checkLanguageReadiness(scenes, segments, 'en');

    expect(result.ready).toBe(false);
    expect(result.complete).toBe(2);
    expect(result.scenes[1].hasAudio).toBe(false);
    expect(result.scenes[1].hasText).toBe(true);
  });

  it('returns ready=false when scenes are missing text', () => {
    const scenes = makeScenes(2);
    const segments = [
      { sceneId: 'scene-1', language: 'en', transcriptText: null, audioKey: 'audio/1.mp3' },
      { sceneId: 'scene-2', language: 'en', transcriptText: 'Text', audioKey: 'audio/2.mp3' },
    ];
    const result = checkLanguageReadiness(scenes, segments, 'en');

    expect(result.ready).toBe(false);
    expect(result.complete).toBe(1);
    expect(result.scenes[0].hasText).toBe(false);
  });

  it('returns ready=false when no scenes exist', () => {
    const result = checkLanguageReadiness([], [], 'en');
    expect(result.ready).toBe(false);
    expect(result.total).toBe(0);
  });
});

// --- submitLanguageForModeration ---

describe('submitLanguageForModeration', () => {
  it('submits successfully when all scenes are complete (stub)', async () => {
    jest.useFakeTimers();

    // First create a purchase via confirmLanguagePurchase
    const confirmP = confirmLanguagePurchase('session-1', ['en'], 'standard', 'pi_test');
    jest.advanceTimersByTime(400);
    await confirmP;

    const scenes = makeScenes(2);
    const segments = makeCompleteSegments(scenes, 'en');

    const submitP = submitLanguageForModeration('session-1', 'en', scenes, segments);
    jest.advanceTimersByTime(400);
    const result = await submitP;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.moderationStatus).toBe('submitted');
    }

    // Verify stub state was updated
    const purchase = __getStubPurchases().get('session-1_en');
    expect(purchase?.moderationStatus).toBe('submitted');

    jest.useRealTimers();
  });

  it('returns error with missingScenes when scenes are incomplete', async () => {
    const scenes = makeScenes(3);
    const segments = [
      { sceneId: 'scene-1', language: 'en', transcriptText: 'Text', audioKey: 'audio/1.mp3' },
      // scene-2 missing audio, scene-3 missing entirely
    ];

    const result = await submitLanguageForModeration('session-1', 'en', scenes, segments);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(2614);
      expect(result.error.missingScenes).toBeDefined();
      expect(result.error.missingScenes!.length).toBe(2);
      expect(result.error.missingScenes).toContain('Scene 2');
      expect(result.error.missingScenes).toContain('Scene 3');
    }
  });

  it('returns error when no purchase exists in stubs', async () => {
    jest.useFakeTimers();

    const scenes = makeScenes(1);
    const segments = makeCompleteSegments(scenes, 'en');

    // No purchase created — stub store is empty
    const submitP = submitLanguageForModeration('session-1', 'en', scenes, segments);
    jest.advanceTimersByTime(400);
    const result = await submitP;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(2601);
    }

    jest.useRealTimers();
  });
});

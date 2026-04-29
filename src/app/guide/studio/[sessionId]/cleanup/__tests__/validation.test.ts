import { isReadyToValidate, type TourMetadataDraft } from '../lib/validation';
import type { StudioScene } from '@/types/studio';

function makeScene(overrides: Partial<StudioScene> = {}): StudioScene {
  return {
    id: 'scene-1',
    sessionId: 'session-1',
    sceneIndex: 0,
    title: 'POI',
    originalAudioKey: 'audio-1.aac',
    studioAudioKey: null,
    transcriptText: null,
    transcriptionJobId: null,
    transcriptionStatus: null,
    qualityScore: null,
    qualityDetailsJson: null,
    codecStatus: null,
    status: 'has_original',
    takesCount: null,
    selectedTakeIndex: null,
    moderationFeedback: null,
    photosRefs: [],
    latitude: null,
    longitude: null,
    poiDescription: null,
    archived: false,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
    ...overrides,
  };
}

const OK_METADATA: TourMetadataDraft = {
  title: 'Mon super parcours',
  description: 'Une balade fascinante de 2 heures à travers la vieille ville avec tous ses secrets historiques.',
  themes: ['histoire'],
  language: 'fr',
  durationMinutes: 90,
};

describe('isReadyToValidate', () => {
  it('returns ready=true when all rules pass', () => {
    const scenes = [makeScene({ id: 's1' }), makeScene({ id: 's2' })];
    const result = isReadyToValidate(scenes, OK_METADATA);
    expect(result.ready).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('flags missing title (min 5 chars)', () => {
    const scenes = [makeScene({ id: 's1' }), makeScene({ id: 's2' })];
    const result = isReadyToValidate(scenes, { ...OK_METADATA, title: 'hi' });
    expect(result.ready).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/Titre trop court/);
  });

  it('flags missing description (min 50 chars)', () => {
    const scenes = [makeScene({ id: 's1' }), makeScene({ id: 's2' })];
    const result = isReadyToValidate(scenes, { ...OK_METADATA, description: 'too short' });
    expect(result.ready).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/Description trop courte/);
  });

  it('flags missing themes', () => {
    const scenes = [makeScene({ id: 's1' }), makeScene({ id: 's2' })];
    const result = isReadyToValidate(scenes, { ...OK_METADATA, themes: [] });
    expect(result.ready).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/thème requis/);
  });

  it('flags fewer than 2 active POIs (archived excluded)', () => {
    const scenes = [
      makeScene({ id: 's1' }),
      makeScene({ id: 's2', archived: true }),
    ];
    const result = isReadyToValidate(scenes, OK_METADATA);
    expect(result.ready).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/2 POIs requis/);
  });

  it('flags POI without audio (no original nor studio)', () => {
    const scenes = [
      makeScene({ id: 's1' }),
      makeScene({ id: 's2', originalAudioKey: null, studioAudioKey: null }),
    ];
    const result = isReadyToValidate(scenes, OK_METADATA);
    expect(result.ready).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/sans audio/);
  });

  it('accepts studioAudioKey as valid audio even if originalAudioKey is null', () => {
    const scenes = [
      makeScene({ id: 's1' }),
      makeScene({ id: 's2', originalAudioKey: null, studioAudioKey: 'studio.aac' }),
    ];
    const result = isReadyToValidate(scenes, OK_METADATA);
    expect(result.ready).toBe(true);
  });

  it('flags duration out of range when provided', () => {
    const scenes = [makeScene({ id: 's1' }), makeScene({ id: 's2' })];
    const result = isReadyToValidate(scenes, { ...OK_METADATA, durationMinutes: 5 });
    expect(result.ready).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/Durée hors limites/);
  });

  it('accumulates multiple blocking reasons', () => {
    const scenes = [makeScene({ id: 's1', originalAudioKey: null, studioAudioKey: null })];
    const result = isReadyToValidate(scenes, {
      ...OK_METADATA,
      title: '',
      description: '',
      themes: [],
    });
    expect(result.ready).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(4);
  });
});

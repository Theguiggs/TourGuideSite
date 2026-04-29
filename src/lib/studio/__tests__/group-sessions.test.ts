import { groupSessionsByTour, groupNeedsAttention } from '../group-sessions';
import type { StudioSession } from '@/types/studio';

function mkSession(partial: Partial<StudioSession> & { id: string }): StudioSession {
  return {
    guideId: 'g1',
    sourceSessionId: 'src',
    tourId: null,
    title: 'T',
    status: 'draft',
    language: 'fr',
    transcriptionQuotaUsed: null,
    coverPhotoKey: null,
    availableLanguages: [],
    translatedTitles: null,
    translatedDescriptions: null,
    version: 1,
    consentRGPD: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...partial,
  };
}

describe('groupSessionsByTour', () => {
  it('groupe les sessions partageant un tourId', () => {
    const sessions = [
      mkSession({ id: 's1', tourId: 'tour-a', version: 1, title: 'Tour A v1' }),
      mkSession({ id: 's2', tourId: 'tour-a', version: 2, title: 'Tour A v2', status: 'published' }),
      mkSession({ id: 's3', tourId: 'tour-b', version: 1, title: 'Tour B' }),
    ];
    const groups = groupSessionsByTour(sessions);
    expect(groups).toHaveLength(2);
    const tourA = groups.find((g) => g.tourId === 'tour-a');
    expect(tourA?.sessions).toHaveLength(2);
    expect(tourA?.sessions[0].id).toBe('s2'); // version desc → v2 first
    expect(tourA?.publishedVersion).toBe(2);
  });

  it("traite les sessions sans tourId comme groupes orphelins", () => {
    const sessions = [
      mkSession({ id: 's1', tourId: null, title: 'Solo' }),
    ];
    const groups = groupSessionsByTour(sessions);
    expect(groups).toHaveLength(1);
    expect(groups[0].tourId).toBeNull();
    expect(groups[0].publishedVersion).toBeNull();
  });

  it("priorise les groupes 'needs attention' (revision_requested/rejected) en tête", () => {
    const sessions = [
      mkSession({ id: 's1', tourId: 'a', updatedAt: '2026-04-10T00:00:00Z', status: 'published' }),
      mkSession({ id: 's2', tourId: 'b', updatedAt: '2026-04-05T00:00:00Z', status: 'revision_requested' }),
    ];
    const groups = groupSessionsByTour(sessions);
    expect(groups[0].tourId).toBe('b'); // attention first malgré updatedAt plus ancien
  });

  it('trie les groupes équivalents par updatedAt desc', () => {
    const sessions = [
      mkSession({ id: 's1', tourId: 'a', updatedAt: '2026-04-01T00:00:00Z' }),
      mkSession({ id: 's2', tourId: 'b', updatedAt: '2026-04-15T00:00:00Z' }),
    ];
    const groups = groupSessionsByTour(sessions);
    expect(groups[0].tourId).toBe('b');
  });

  it('retourne un tableau vide pour aucune session', () => {
    expect(groupSessionsByTour([])).toEqual([]);
  });
});

describe('groupNeedsAttention', () => {
  it('détecte revision_requested', () => {
    const group = {
      tourId: 'a',
      title: 'T',
      sessions: [mkSession({ id: 's1', status: 'revision_requested' })],
      publishedVersion: null,
      latestVersion: 1,
    };
    expect(groupNeedsAttention(group)).toBe(true);
  });

  it('détecte rejected', () => {
    const group = {
      tourId: 'a',
      title: 'T',
      sessions: [mkSession({ id: 's1', status: 'rejected' })],
      publishedVersion: null,
      latestVersion: 1,
    };
    expect(groupNeedsAttention(group)).toBe(true);
  });

  it('false sur sessions normales', () => {
    const group = {
      tourId: 'a',
      title: 'T',
      sessions: [mkSession({ id: 's1', status: 'draft' })],
      publishedVersion: null,
      latestVersion: 1,
    };
    expect(groupNeedsAttention(group)).toBe(false);
  });
});

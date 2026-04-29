import {
  tourStatusLabel,
  filterTours,
  sortTours,
  bucketCounts,
} from '../tours-list-helpers';
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

describe('tourStatusLabel', () => {
  it('mappe published → En ligne (success)', () => {
    expect(tourStatusLabel('published')).toEqual({
      label: 'En ligne',
      color: 'success',
      bucket: 'live',
    });
  });

  it("mappe submitted/revision_requested → En relecture (mer)", () => {
    expect(tourStatusLabel('submitted').bucket).toBe('review');
    expect(tourStatusLabel('revision_requested').bucket).toBe('review');
  });

  it("mappe rejected → Refusé (danger), toujours dans le bucket review", () => {
    const r = tourStatusLabel('rejected');
    expect(r.label).toBe('Refusé');
    expect(r.color).toBe('danger');
    expect(r.bucket).toBe('review');
  });

  it('mappe les statuts d’édition vers Brouillon', () => {
    expect(tourStatusLabel('draft').bucket).toBe('draft');
    expect(tourStatusLabel('editing').bucket).toBe('draft');
    expect(tourStatusLabel('recording').bucket).toBe('draft');
    expect(tourStatusLabel('transcribing').bucket).toBe('draft');
  });
});

describe('filterTours', () => {
  const sessions = [
    mkSession({ id: 's1', title: 'Nice Insolite', status: 'published' }),
    mkSession({ id: 's2', title: 'Vence Matisse', status: 'draft' }),
    mkSession({ id: 's3', title: 'Cannes Suquet', status: 'submitted' }),
  ];

  it("retourne tout sur filter='all' et query vide", () => {
    expect(filterTours(sessions, '', 'all')).toHaveLength(3);
  });

  it('filtre par bucket status', () => {
    expect(filterTours(sessions, '', 'live')).toHaveLength(1);
    expect(filterTours(sessions, '', 'draft')).toHaveLength(1);
    expect(filterTours(sessions, '', 'review')).toHaveLength(1);
  });

  it("filtre par query (case-insensitive, substring)", () => {
    expect(filterTours(sessions, 'nice', 'all')).toHaveLength(1);
    expect(filterTours(sessions, 'CANNES', 'all')).toHaveLength(1);
    expect(filterTours(sessions, 'foo', 'all')).toHaveLength(0);
  });

  it('combine query + status', () => {
    expect(filterTours(sessions, 'vence', 'draft')).toHaveLength(1);
    expect(filterTours(sessions, 'vence', 'live')).toHaveLength(0);
  });
});

describe('sortTours', () => {
  const sessions = [
    mkSession({ id: 's1', title: 'Cannes', updatedAt: '2026-04-01T00:00:00Z' }),
    mkSession({ id: 's2', title: 'Antibes', updatedAt: '2026-04-15T00:00:00Z' }),
    mkSession({ id: 's3', title: 'Nice', updatedAt: '2026-04-10T00:00:00Z' }),
  ];

  it("'recently_modified' trie par updatedAt desc", () => {
    const sorted = sortTours(sessions, 'recently_modified').map((s) => s.id);
    expect(sorted).toEqual(['s2', 's3', 's1']);
  });

  it("'alphabetical' trie par titre (FR collation)", () => {
    const sorted = sortTours(sessions, 'alphabetical').map((s) => s.title);
    expect(sorted).toEqual(['Antibes', 'Cannes', 'Nice']);
  });

  it("'most_played' fallback sur recently_modified tant qu'il n'y a pas de plays", () => {
    const sorted = sortTours(sessions, 'most_played').map((s) => s.id);
    expect(sorted).toEqual(['s2', 's3', 's1']);
  });

  it("ne mute pas l'array d'entrée", () => {
    const original = [...sessions];
    sortTours(sessions, 'alphabetical');
    expect(sessions).toEqual(original);
  });
});

describe('bucketCounts', () => {
  it('compte les buckets correctement', () => {
    const sessions = [
      mkSession({ id: 's1', status: 'published' }),
      mkSession({ id: 's2', status: 'published' }),
      mkSession({ id: 's3', status: 'draft' }),
      mkSession({ id: 's4', status: 'submitted' }),
    ];
    expect(bucketCounts(sessions)).toEqual({
      all: 4,
      live: 2,
      draft: 1,
      review: 1,
    });
  });

  it('retourne 0 partout pour aucune session', () => {
    expect(bucketCounts([])).toEqual({ all: 0, live: 0, draft: 0, review: 0 });
  });
});

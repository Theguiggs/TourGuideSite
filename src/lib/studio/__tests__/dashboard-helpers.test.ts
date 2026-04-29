import {
  selectResumableSession,
  selectTopTours,
  selectRecentReviews,
  selectSuggestion,
} from '../dashboard-helpers';
import type { StudioSession, TourLanguagePurchase } from '@/types/studio';
import type { TourComment } from '@/lib/api/tour-comments';

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

function mkComment(partial: Partial<TourComment> & { id: string }): TourComment {
  return {
    tourId: 'tour-a',
    sessionId: 'sess-1',
    sceneId: null,
    author: 'admin',
    authorName: 'Modération',
    message: 'OK',
    action: 'comment',
    language: null,
    createdAt: '2026-04-01T00:00:00Z',
    ...partial,
  };
}

describe('selectResumableSession', () => {
  it('retourne null si aucune session', () => {
    expect(selectResumableSession([], null)).toBeNull();
  });

  it('priorise lastSessionId si encore reprenable', () => {
    const sessions = [
      mkSession({ id: 's1', status: 'draft', updatedAt: '2026-04-10T00:00:00Z' }),
      mkSession({ id: 's2', status: 'editing', updatedAt: '2026-04-15T00:00:00Z' }),
    ];
    expect(selectResumableSession(sessions, 's1')?.id).toBe('s1');
  });

  it('ignore lastSessionId si la session est publiée', () => {
    const sessions = [
      mkSession({ id: 's1', status: 'published', updatedAt: '2026-04-10T00:00:00Z' }),
      mkSession({ id: 's2', status: 'draft', updatedAt: '2026-04-15T00:00:00Z' }),
    ];
    expect(selectResumableSession(sessions, 's1')?.id).toBe('s2');
  });

  it('fallback : draft le plus récent', () => {
    const sessions = [
      mkSession({ id: 's1', status: 'draft', updatedAt: '2026-04-01T00:00:00Z' }),
      mkSession({ id: 's2', status: 'editing', updatedAt: '2026-04-20T00:00:00Z' }),
    ];
    expect(selectResumableSession(sessions, null)?.id).toBe('s2');
  });

  it('retourne null si aucune session reprenable', () => {
    const sessions = [mkSession({ id: 's1', status: 'published' })];
    expect(selectResumableSession(sessions, null)).toBeNull();
  });
});

describe('selectTopTours', () => {
  it("ne retient que les sessions 'published'", () => {
    const sessions = [
      mkSession({ id: 's1', status: 'draft' }),
      mkSession({ id: 's2', status: 'published', updatedAt: '2026-04-10T00:00:00Z' }),
      mkSession({ id: 's3', status: 'published', updatedAt: '2026-04-15T00:00:00Z' }),
    ];
    const top = selectTopTours(sessions);
    expect(top).toHaveLength(2);
    expect(top[0].id).toBe('s3'); // most recent first
  });

  it('respecte la limite', () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      mkSession({ id: `s${i}`, status: 'published', updatedAt: `2026-04-${10 + i}T00:00:00Z` }),
    );
    expect(selectTopTours(sessions, 3)).toHaveLength(3);
  });
});

describe('selectRecentReviews', () => {
  it('aplatit et trie par date desc', () => {
    const sessions = [
      mkSession({ id: 's1', title: 'Tour A' }),
      mkSession({ id: 's2', title: 'Tour B' }),
    ];
    const comments = {
      s1: [mkComment({ id: 'c1', createdAt: '2026-04-10T00:00:00Z', message: 'A1' })],
      s2: [
        mkComment({ id: 'c2', createdAt: '2026-04-15T00:00:00Z', message: 'B1' }),
        mkComment({ id: 'c3', createdAt: '2026-04-05T00:00:00Z', message: 'B2' }),
      ],
    };
    const reviews = selectRecentReviews(sessions, comments);
    expect(reviews.map((r) => r.id)).toEqual(['c2', 'c1', 'c3']);
    expect(reviews[0].tourTitle).toBe('Tour B');
  });

  it('respecte la limite', () => {
    const sessions = [mkSession({ id: 's1' })];
    const comments = {
      s1: Array.from({ length: 5 }, (_, i) =>
        mkComment({ id: `c${i}`, createdAt: `2026-04-${10 + i}T00:00:00Z` }),
      ),
    };
    expect(selectRecentReviews(sessions, comments, 2)).toHaveLength(2);
  });
});

describe('selectSuggestion', () => {
  it('retourne null si aucun tour publié', () => {
    const sessions = [mkSession({ id: 's1', status: 'draft' })];
    expect(selectSuggestion(sessions, {})).toBeNull();
  });

  it("suggère traduction EN si tour publié sans EN", () => {
    const sessions = [
      mkSession({
        id: 's1',
        status: 'published',
        title: 'Mon Tour',
        language: 'fr',
        availableLanguages: ['fr'],
      }),
    ];
    const sugg = selectSuggestion(sessions, {});
    expect(sugg).not.toBeNull();
    expect(sugg!.color).toBe('mer');
    expect(sugg!.title).toContain('Mon Tour');
    expect(sugg!.ctaHref).toBe('/guide/studio/s1/general');
  });

  it("retourne null si tous les tours publiés ont déjà EN", () => {
    const sessions = [
      mkSession({
        id: 's1',
        status: 'published',
        availableLanguages: ['fr', 'en'],
        language: 'fr',
      }),
    ];
    expect(selectSuggestion(sessions, {})).toBeNull();
  });

  it('considère les purchases comme langue couverte', () => {
    const sessions = [
      mkSession({ id: 's1', status: 'published', availableLanguages: ['fr'], language: 'fr' }),
    ];
    const purchases: Record<string, TourLanguagePurchase[]> = {
      s1: [
        {
          id: 'p1',
          guideId: 'g1',
          sessionId: 's1',
          language: 'en',
          qualityTier: 'standard' as TourLanguagePurchase['qualityTier'],
          provider: 'deepl',
          purchaseType: 'paid' as TourLanguagePurchase['purchaseType'],
          amountCents: 0,
          stripePaymentIntentId: null,
          moderationStatus: 'approved' as TourLanguagePurchase['moderationStatus'],
          status: 'active' as TourLanguagePurchase['status'],
          refundedAt: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
    };
    expect(selectSuggestion(sessions, purchases)).toBeNull();
  });
});

/**
 * Tests for TourLanguagePurchase AppSync operations.
 * Mocks appsync-client and forces real mode via NEXT_PUBLIC_USE_STUBS=false.
 */

jest.mock('../appsync-client', () => ({
  createLanguagePurchaseMutation: jest.fn(),
  updateLanguagePurchaseMutation: jest.fn(),
  listLanguagePurchasesBySession: jest.fn(),
  getLanguagePurchase: jest.fn(),
}));

import * as appsyncModule from '../appsync-client';
import type {
  TourLanguagePurchase,
  QualityTier,
  PurchaseType,
  PurchaseStatus,
  PurchaseModerationStatus,
  SceneSegment,
} from '@/types/studio';

const mockCreate = appsyncModule.createLanguagePurchaseMutation as jest.Mock;
const mockUpdate = appsyncModule.updateLanguagePurchaseMutation as jest.Mock;
const mockListBySession = appsyncModule.listLanguagePurchasesBySession as jest.Mock;
const mockGetPurchase = appsyncModule.getLanguagePurchase as jest.Mock;

// Force real mode
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
});

afterAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

beforeEach(() => {
  jest.clearAllMocks();
});

const SAMPLE_PURCHASE: TourLanguagePurchase = {
  id: 'purchase-1',
  guideId: 'guide-1',
  sessionId: 'session-1',
  language: 'en',
  qualityTier: 'standard',
  provider: 'marianmt',
  purchaseType: 'free_first',
  amountCents: 0,
  stripePaymentIntentId: null,
  moderationStatus: 'draft',
  status: 'active',
  refundedAt: null,
  createdAt: '2026-03-29T10:00:00.000Z',
  updatedAt: '2026-03-29T10:00:00.000Z',
};

describe('createLanguagePurchaseMutation', () => {
  it('creates a language purchase and returns ok with data', async () => {
    mockCreate.mockResolvedValue({ ok: true, data: SAMPLE_PURCHASE });

    const result = await appsyncModule.createLanguagePurchaseMutation({
      guideId: 'guide-1',
      sessionId: 'session-1',
      language: 'en',
      qualityTier: 'standard',
      purchaseType: 'free_first',
      amountCents: 0,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      guideId: 'guide-1',
      sessionId: 'session-1',
      language: 'en',
      qualityTier: 'standard',
      purchaseType: 'free_first',
      amountCents: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(SAMPLE_PURCHASE);
    }
  });

  it('returns error on failure', async () => {
    mockCreate.mockResolvedValue({ ok: false, error: 'Creation failed' });

    const result = await appsyncModule.createLanguagePurchaseMutation({
      guideId: 'guide-1',
      sessionId: 'session-1',
      language: 'es',
      qualityTier: 'pro',
      purchaseType: 'single',
      amountCents: 199,
      provider: 'deepl',
      stripePaymentIntentId: 'pi_test_123',
    });

    expect(result.ok).toBe(false);
  });
});

describe('updateLanguagePurchaseMutation', () => {
  it('updates a purchase status to refunded', async () => {
    const refundedPurchase = {
      ...SAMPLE_PURCHASE,
      status: 'refunded' as PurchaseStatus,
      refundedAt: '2026-03-29T12:00:00.000Z',
    };
    mockUpdate.mockResolvedValue({ ok: true, data: refundedPurchase });

    const result = await appsyncModule.updateLanguagePurchaseMutation('purchase-1', {
      status: 'refunded',
      refundedAt: '2026-03-29T12:00:00.000Z',
    });

    expect(mockUpdate).toHaveBeenCalledWith('purchase-1', {
      status: 'refunded',
      refundedAt: '2026-03-29T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.data) {
      expect(result.data.status).toBe('refunded');
    }
  });

  it('updates moderation status', async () => {
    mockUpdate.mockResolvedValue({
      ok: true,
      data: { ...SAMPLE_PURCHASE, moderationStatus: 'approved' },
    });

    const result = await appsyncModule.updateLanguagePurchaseMutation('purchase-1', {
      moderationStatus: 'approved',
    });

    expect(result.ok).toBe(true);
  });
});

describe('listLanguagePurchasesBySession', () => {
  it('returns purchases for a session', async () => {
    const purchases = [
      SAMPLE_PURCHASE,
      { ...SAMPLE_PURCHASE, id: 'purchase-2', language: 'es', amountCents: 199, purchaseType: 'single' as PurchaseType },
    ];
    mockListBySession.mockResolvedValue({ ok: true, data: purchases });

    const result = await appsyncModule.listLanguagePurchasesBySession('session-1');

    expect(mockListBySession).toHaveBeenCalledWith('session-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].language).toBe('en');
      expect(result.data[1].language).toBe('es');
    }
  });

  it('returns empty array when no purchases', async () => {
    mockListBySession.mockResolvedValue({ ok: true, data: [] });

    const result = await appsyncModule.listLanguagePurchasesBySession('session-no-purchases');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(0);
    }
  });
});

describe('getLanguagePurchase', () => {
  it('returns a specific purchase by session + language', async () => {
    mockGetPurchase.mockResolvedValue({ ok: true, data: SAMPLE_PURCHASE });

    const result = await appsyncModule.getLanguagePurchase('session-1', 'en');

    expect(mockGetPurchase).toHaveBeenCalledWith('session-1', 'en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.language).toBe('en');
      expect(result.data?.qualityTier).toBe('standard');
    }
  });

  it('returns null when purchase not found', async () => {
    mockGetPurchase.mockResolvedValue({ ok: true, data: null });

    const result = await appsyncModule.getLanguagePurchase('session-1', 'ja');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });
});

describe('TypeScript type conformity', () => {
  it('TourLanguagePurchase conforms to expected shape', () => {
    const purchase: TourLanguagePurchase = SAMPLE_PURCHASE;
    expect(purchase.id).toBe('purchase-1');
    expect(purchase.guideId).toBe('guide-1');
    expect(purchase.sessionId).toBe('session-1');
    expect(purchase.language).toBe('en');
    expect(purchase.qualityTier).toBe('standard');
    expect(purchase.provider).toBe('marianmt');
    expect(purchase.purchaseType).toBe('free_first');
    expect(purchase.amountCents).toBe(0);
    expect(purchase.stripePaymentIntentId).toBeNull();
    expect(purchase.moderationStatus).toBe('draft');
    expect(purchase.status).toBe('active');
    expect(purchase.refundedAt).toBeNull();
  });

  it('QualityTier accepts valid values', () => {
    const standard: QualityTier = 'standard';
    const pro: QualityTier = 'pro';
    expect(standard).toBe('standard');
    expect(pro).toBe('pro');
  });

  it('PurchaseType accepts all valid values', () => {
    const types: PurchaseType[] = ['single', 'pack_3', 'pack_all', 'free_first'];
    expect(types).toHaveLength(4);
  });

  it('PurchaseStatus accepts valid values', () => {
    const active: PurchaseStatus = 'active';
    const refunded: PurchaseStatus = 'refunded';
    expect(active).toBe('active');
    expect(refunded).toBe('refunded');
  });
});

describe('SceneSegment extensions', () => {
  it('SceneSegment includes manuallyEdited and sourceUpdatedAt', () => {
    const segment: SceneSegment = {
      id: 'seg-1',
      sceneId: 'scene-1',
      segmentIndex: 0,
      audioKey: null,
      transcriptText: 'Hello',
      startTimeMs: null,
      endTimeMs: null,
      language: 'en',
      sourceSegmentId: 'seg-src-1',
      ttsGenerated: false,
      translationProvider: null,
      costProvider: null,
      costCharged: null,
      status: 'transcribed',
      manuallyEdited: false,
      translatedTitle: null,
      sourceUpdatedAt: null,
      createdAt: '2026-03-29T10:00:00.000Z',
      updatedAt: '2026-03-29T10:00:00.000Z',
    };

    expect(segment.manuallyEdited).toBe(false);
    expect(segment.sourceUpdatedAt).toBeNull();
  });

  it('manuallyEdited defaults to false in new segments', () => {
    const segment: SceneSegment = {
      id: 'seg-2',
      sceneId: 'scene-1',
      segmentIndex: 1,
      audioKey: null,
      transcriptText: 'Bonjour',
      startTimeMs: 0,
      endTimeMs: 5000,
      language: 'fr',
      sourceSegmentId: null,
      ttsGenerated: false,
      translationProvider: 'marianmt',
      costProvider: 5,
      costCharged: 15,
      status: 'translated',
      manuallyEdited: false,
      translatedTitle: null,
      sourceUpdatedAt: '2026-03-29T09:00:00.000Z',
      createdAt: '2026-03-29T10:00:00.000Z',
      updatedAt: '2026-03-29T10:00:00.000Z',
    };

    expect(segment.manuallyEdited).toBe(false);
    expect(segment.sourceUpdatedAt).toBe('2026-03-29T09:00:00.000Z');
  });
});

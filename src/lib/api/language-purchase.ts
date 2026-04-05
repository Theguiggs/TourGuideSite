import type { TourLanguagePurchase, QualityTier } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { __createStubSegmentsForLanguage } from './studio';

const SERVICE_NAME = 'LanguagePurchaseAPI';

// --- Types ---

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ApiError {
  code: number;
  message: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: ApiError };

// --- Stub state ---

const stubPurchases = new Map<string, TourLanguagePurchase>();

function makeStubPurchase(
  sessionId: string,
  language: string,
  tier: QualityTier,
  overrides?: Partial<TourLanguagePurchase>,
): TourLanguagePurchase {
  const now = new Date().toISOString();
  return {
    id: `purchase-${sessionId}-${language}`,
    guideId: 'guide-stub-1',
    sessionId,
    language,
    qualityTier: tier,
    provider: tier === 'standard' ? 'marianmt' : 'deepl',
    purchaseType: 'single',
    amountCents: tier === 'standard' ? 199 : 299,
    stripePaymentIntentId: `pi_stub_${Date.now()}`,
    moderationStatus: 'draft',
    status: 'active',
    refundedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// --- Stub API ---

async function stubCreatePaymentIntent(
  _sessionId: string,
  _languages: string[],
  _qualityTier: QualityTier,
): Promise<Result<PaymentIntentResult>> {
  await new Promise((r) => setTimeout(r, 500));
  return {
    ok: true,
    value: {
      clientSecret: `pi_stub_secret_${Date.now()}`,
      paymentIntentId: `pi_stub_${Date.now()}`,
    },
  };
}

async function stubConfirmLanguagePurchase(
  sessionId: string,
  languages: string[],
  qualityTier: QualityTier,
  paymentIntentId: string,
): Promise<Result<TourLanguagePurchase[]>> {
  await new Promise((r) => setTimeout(r, 300));
  const purchases = languages.map((lang) => {
    const purchase = makeStubPurchase(sessionId, lang, qualityTier, {
      stripePaymentIntentId: paymentIntentId,
    });
    stubPurchases.set(`${sessionId}_${lang}`, purchase);
    // Create empty segments for this language in the stub store
    __createStubSegmentsForLanguage(sessionId, lang);
    return purchase;
  });
  return { ok: true, value: purchases };
}

async function stubListLanguagePurchases(
  sessionId: string,
): Promise<Result<TourLanguagePurchase[]>> {
  await new Promise((r) => setTimeout(r, 200));

  // Return purchases matching sessionId from stub state, or default 2 if empty
  const existing = Array.from(stubPurchases.values()).filter(
    (p) => p.sessionId === sessionId,
  );

  if (existing.length > 0) {
    return { ok: true, value: existing };
  }

  // Default stub data: 2 purchases (en + es)
  const defaults = [
    makeStubPurchase(sessionId, 'en', 'standard'),
    makeStubPurchase(sessionId, 'es', 'standard'),
  ];
  return { ok: true, value: defaults };
}

async function stubRefundLanguagePurchase(
  purchaseId: string,
): Promise<Result<TourLanguagePurchase>> {
  await new Promise((r) => setTimeout(r, 300));

  // Find purchase in stub state by id
  for (const [key, purchase] of stubPurchases.entries()) {
    if (purchase.id === purchaseId) {
      const refunded: TourLanguagePurchase = {
        ...purchase,
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      stubPurchases.set(key, refunded);
      return { ok: true, value: refunded };
    }
  }

  // If not found, return a generic refunded purchase
  const refunded = makeStubPurchase('unknown', 'en', 'standard', {
    id: purchaseId,
    status: 'refunded',
    refundedAt: new Date().toISOString(),
  });
  return { ok: true, value: refunded };
}

// --- Public API ---

export async function createPaymentIntent(
  sessionId: string,
  languages: string[],
  qualityTier: QualityTier,
): Promise<Result<PaymentIntentResult>> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'createPaymentIntent (stub)', { sessionId, languages, qualityTier });
    return stubCreatePaymentIntent(sessionId, languages, qualityTier);
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.createPaymentIntent(
      { sessionId, languages, qualityTier },
      { authMode: 'userPool' },
    );
    const data = result?.data;
    return {
      ok: true,
      value: {
        clientSecret: data?.clientSecret ?? '',
        paymentIntentId: data?.paymentIntentId ?? '',
      },
    };
  } catch (err) {
    logger.error(SERVICE_NAME, 'createPaymentIntent failed', { error: String(err) });
    return { ok: false, error: { code: 2602, message: `Payment intent creation failed: ${String(err)}` } };
  }
}

export async function confirmLanguagePurchase(
  sessionId: string,
  languages: string[],
  qualityTier: QualityTier,
  paymentIntentId: string,
): Promise<Result<TourLanguagePurchase[]>> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'confirmLanguagePurchase (stub)', { sessionId, languages, qualityTier });
    return stubConfirmLanguagePurchase(sessionId, languages, qualityTier, paymentIntentId);
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    const purchases: TourLanguagePurchase[] = [];
    for (const lang of languages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isManual = qualityTier === 'manual';
      const provider = isManual ? undefined : (qualityTier === 'standard' ? 'marianmt' : 'deepl');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).models.TourLanguagePurchase.create(
        {
          guideId: 'auto', // AppSync owner-auth overrides with Cognito sub
          sessionId,
          language: lang,
          qualityTier,
          purchaseType: isManual ? 'manual' : 'single',
          amountCents: isManual ? 0 : (qualityTier === 'standard' ? 199 : 299),
          provider,
          stripePaymentIntentId: paymentIntentId || undefined,
          moderationStatus: 'draft',
          status: 'active',
        },
        { authMode: 'userPool' },
      );
      if (result?.data) {
        purchases.push(result.data as TourLanguagePurchase);
      }
    }
    // Create empty SceneSegments for each scene in each purchased language
    try {
      const { listStudioScenes, batchCreateSegments } = await import('./studio');
      const scenes = await listStudioScenes(sessionId);
      if (scenes.length > 0) {
        for (const lang of languages) {
          const inputs = scenes.map((scene) => ({
            sceneId: scene.id,
            segmentIndex: 0,
            language: lang,
            status: 'empty' as const,
          }));
          const segResult = await batchCreateSegments(inputs);
          if (!segResult.ok) {
            logger.warn(SERVICE_NAME, 'Segment creation partially failed for language', {
              sessionId, language: lang, created: segResult.created.length, total: inputs.length,
            });
          }
        }
      }
    } catch (segErr) {
      // Log but don't fail the purchase — segments can be created later
      logger.warn(SERVICE_NAME, 'Segment creation after purchase failed (non-blocking)', {
        sessionId, error: String(segErr),
      });
    }

    return { ok: true, value: purchases };
  } catch (err) {
    logger.error(SERVICE_NAME, 'confirmLanguagePurchase failed', { error: String(err) });
    return { ok: false, error: { code: 2601, message: `Purchase confirmation failed: ${String(err)}` } };
  }
}

export async function listLanguagePurchases(
  sessionId: string,
): Promise<Result<TourLanguagePurchase[]>> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'listLanguagePurchases (stub)', { sessionId });
    return stubListLanguagePurchases(sessionId);
  }

  try {
    const { listLanguagePurchasesBySession } = await import('@/lib/api/appsync-client');
    const result = await listLanguagePurchasesBySession(sessionId);
    if (!result.ok) {
      return { ok: false, error: { code: 2601, message: result.error } };
    }
    const items = (result.data ?? []) as unknown as TourLanguagePurchase[];
    return { ok: true, value: items };
  } catch (err) {
    logger.error(SERVICE_NAME, 'listLanguagePurchases failed', { error: String(err) });
    return { ok: false, error: { code: 2601, message: `List purchases failed: ${String(err)}` } };
  }
}

export async function refundLanguagePurchase(
  purchaseId: string,
): Promise<Result<TourLanguagePurchase>> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'refundLanguagePurchase (stub)', { purchaseId });
    return stubRefundLanguagePurchase(purchaseId);
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.updateLanguagePurchase(
      { id: purchaseId, status: 'refunded', refundedAt: new Date().toISOString() },
      { authMode: 'userPool' },
    );
    return { ok: true, value: result?.data as TourLanguagePurchase };
  } catch (err) {
    logger.error(SERVICE_NAME, 'refundLanguagePurchase failed', { error: String(err) });
    return { ok: false, error: { code: 2607, message: `Refund failed: ${String(err)}` } };
  }
}

// --- updateModerationStatusByLang ---

export type ModerationStatusUpdate = 'approved' | 'rejected' | 'revision_requested';

async function stubUpdateModerationStatusByLang(
  sessionId: string,
  language: string,
  status: ModerationStatusUpdate,
  feedback?: Record<string, string>,
): Promise<Result<TourLanguagePurchase>> {
  await new Promise((r) => setTimeout(r, 300));

  const key = `${sessionId}_${language}`;
  const existing = stubPurchases.get(key);

  if (existing) {
    const updated: TourLanguagePurchase = {
      ...existing,
      moderationStatus: status,
      updatedAt: new Date().toISOString(),
    };
    stubPurchases.set(key, updated);
    if (feedback) {
      logger.info(SERVICE_NAME, 'Feedback saved for scenes (stub)', { sessionId, language, sceneCount: Object.keys(feedback).length });
    }
    return { ok: true, value: updated };
  }

  // Create a default purchase if not found in stubs
  const purchase = makeStubPurchase(sessionId, language, 'standard', {
    moderationStatus: status,
  });
  stubPurchases.set(key, purchase);
  return { ok: true, value: purchase };
}

export async function updateModerationStatusByLang(
  sessionId: string,
  language: string,
  status: ModerationStatusUpdate,
  feedback?: Record<string, string>,
): Promise<Result<TourLanguagePurchase>> {
  // Validate: feedback is required for rejection/revision
  if ((status === 'rejected' || status === 'revision_requested') && !feedback) {
    return {
      ok: false,
      error: { code: 2608, message: 'Feedback is required for rejection or revision request' },
    };
  }

  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'updateModerationStatusByLang (stub)', { sessionId, language, status });
    return stubUpdateModerationStatusByLang(sessionId, language, status, feedback);
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();

    // Find purchase by sessionId + language
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listResult = await (client as any).models.TourLanguagePurchase.listTourLanguagePurchaseBySessionId(
      { sessionId },
      { authMode: 'userPool' },
    );
    const items = (listResult?.data ?? []) as TourLanguagePurchase[];
    const match = items.find((p: TourLanguagePurchase) => p.language === language);

    if (!match) {
      return { ok: false, error: { code: 2604, message: `No purchase found for session=${sessionId} language=${language}` } };
    }

    // Update moderation status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateResult = await (client as any).models.TourLanguagePurchase.update(
      { id: match.id, moderationStatus: status },
      { authMode: 'userPool' },
    );

    // If feedback provided, save per-scene feedback via StudioScene.moderationFeedback
    if (feedback) {
      for (const [sceneId, feedbackText] of Object.entries(feedback)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene = await (client as any).models.StudioScene.get({ id: sceneId }, { authMode: 'userPool' });
        const existingFeedback = scene?.data?.moderationFeedback
          ? JSON.parse(scene.data.moderationFeedback as string) as Record<string, string>
          : {};
        existingFeedback[language] = feedbackText;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).models.StudioScene.update(
          { id: sceneId, moderationFeedback: JSON.stringify(existingFeedback) },
          { authMode: 'userPool' },
        );
      }
    }

    // When approving, update GuideTour.availableLanguages
    if (status === 'approved') {
      try {
        const { updateGuideTourMutation } = await import('@/lib/api/appsync-client');
        // Recalculate availableLanguages from all approved purchases + source language
        const approvedLangs = items
          .filter((p: TourLanguagePurchase) => p.language === language ? true : p.moderationStatus === 'approved')
          .map((p: TourLanguagePurchase) => p.language);
        // Find the GuideTour to get source language
        const { getGuideTourById } = await import('@/lib/api/appsync-client');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionData = await (client as any).models.StudioSession?.get({ id: sessionId }, { authMode: 'userPool' });
        const tourId = sessionData?.data?.tourId as string | undefined;
        if (tourId) {
          const tour = await getGuideTourById(tourId);
          const sourceLang = (tour as Record<string, unknown>)?.languePrincipale as string ?? 'fr';
          const allLangs = Array.from(new Set([sourceLang, ...approvedLangs]));
          await updateGuideTourMutation(tourId, { availableLanguages: allLangs });
          logger.info(SERVICE_NAME, 'Updated GuideTour.availableLanguages', { tourId, languages: allLangs });
        }
      } catch (langErr) {
        // Non-blocking: log but don't fail the approval
        logger.warn(SERVICE_NAME, 'Failed to update availableLanguages (non-blocking)', { error: String(langErr) });
      }
    }

    return { ok: true, value: updateResult?.data as TourLanguagePurchase };
  } catch (err) {
    logger.error(SERVICE_NAME, 'updateModerationStatusByLang failed', { error: String(err) });
    return { ok: false, error: { code: 2608, message: `Moderation status update failed: ${String(err)}` } };
  }
}

// --- Submission types ---

export interface SubmissionApiError extends ApiError {
  missingScenes?: string[];
}

type SubmissionResult<T> = { ok: true; value: T } | { ok: false; error: SubmissionApiError };

export interface SceneReadiness {
  sceneId: string;
  sceneTitle: string;
  hasText: boolean;
  hasAudio: boolean;
}

export interface LanguageReadiness {
  ready: boolean;
  total: number;
  complete: number;
  scenes: SceneReadiness[];
}

// --- Readiness check ---

/**
 * Check if all scenes have text + audio for a given language.
 * Pure function — no API calls.
 */
export function checkLanguageReadiness(
  scenes: Array<{ id: string; title?: string | null }>,
  segments: Array<{ sceneId: string; language: string; transcriptText: string | null; audioKey: string | null }>,
  language: string,
): LanguageReadiness {
  const sceneStatuses: SceneReadiness[] = scenes.map((scene) => {
    const segment = segments.find((s) => s.sceneId === scene.id && s.language === language);
    return {
      sceneId: scene.id,
      sceneTitle: scene.title ?? `Scene ${scene.id}`,
      hasText: !!(segment?.transcriptText),
      hasAudio: !!(segment?.audioKey && !segment.audioKey.startsWith('tts-')),
    };
  });

  const complete = sceneStatuses.filter((s) => s.hasText && s.hasAudio).length;

  return {
    ready: complete === scenes.length && scenes.length > 0,
    total: scenes.length,
    complete,
    scenes: sceneStatuses,
  };
}

// --- Submit language for moderation ---

async function stubSubmitLanguageForModeration(
  sessionId: string,
  language: string,
): Promise<SubmissionResult<TourLanguagePurchase>> {
  await new Promise((r) => setTimeout(r, 300));

  const key = `${sessionId}_${language}`;
  const purchase = stubPurchases.get(key);

  if (!purchase) {
    return {
      ok: false,
      error: { code: 2601, message: `No purchase found for session ${sessionId} language ${language}` },
    };
  }

  if (purchase.status !== 'active') {
    return {
      ok: false,
      error: { code: 2601, message: `Purchase is not active (status: ${purchase.status})` },
    };
  }

  const updated: TourLanguagePurchase = {
    ...purchase,
    moderationStatus: 'submitted',
    updatedAt: new Date().toISOString(),
  };
  stubPurchases.set(key, updated);
  return { ok: true, value: updated };
}

export async function submitLanguageForModeration(
  sessionId: string,
  language: string,
  scenes: Array<{ id: string; title?: string | null }>,
  segments: Array<{ sceneId: string; language: string; transcriptText: string | null; audioKey: string | null }>,
): Promise<SubmissionResult<TourLanguagePurchase>> {
  // Check readiness first
  const readiness = checkLanguageReadiness(scenes, segments, language);
  if (!readiness.ready) {
    const missingScenes = readiness.scenes
      .filter((s) => !s.hasText || !s.hasAudio)
      .map((s) => s.sceneTitle);
    logger.warn(SERVICE_NAME, 'Cannot submit — incomplete scenes', {
      sessionId,
      language,
      missingCount: missingScenes.length,
    });
    return {
      ok: false,
      error: {
        code: 2614,
        message: `${missingScenes.length} scene(s) incomplete pour la langue ${language}`,
        missingScenes,
      },
    };
  }

  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'submitLanguageForModeration (stub)', { sessionId, language });
    return stubSubmitLanguageForModeration(sessionId, language);
  }

  try {
    const { updateLanguagePurchaseMutation, getLanguagePurchase } = await import('@/lib/api/appsync-client');
    const purchaseResult = await getLanguagePurchase(sessionId, language);
    if (!purchaseResult.ok || !purchaseResult.data) {
      return {
        ok: false,
        error: { code: 2601, message: `No purchase found for session ${sessionId} language ${language}` },
      };
    }

    const purchase = purchaseResult.data;
    if (purchase.status !== 'active') {
      return {
        ok: false,
        error: { code: 2601, message: `Purchase is not active (status: ${purchase.status})` },
      };
    }

    const result = await updateLanguagePurchaseMutation(purchase.id, {
      moderationStatus: 'submitted',
    });

    if (!result.ok) {
      return { ok: false, error: { code: 2614, message: `Submission failed: ${result.error}` } };
    }

    return { ok: true, value: result.data as TourLanguagePurchase };
  } catch (err) {
    logger.error(SERVICE_NAME, 'submitLanguageForModeration failed', { error: String(err) });
    return { ok: false, error: { code: 2614, message: `Submission failed: ${String(err)}` } };
  }
}

/**
 * Retract a language submission (submitted → draft) or unpublish (approved → draft).
 * Used by the guide to manage per-language publication state.
 */
export async function retractLanguageSubmission(
  sessionId: string,
  language: string,
): Promise<Result<TourLanguagePurchase>> {
  if (shouldUseStubs()) {
    const key = `${sessionId}_${language}`;
    const existing = stubPurchases.get(key);
    if (existing) {
      const updated: TourLanguagePurchase = { ...existing, moderationStatus: 'draft', updatedAt: new Date().toISOString() };
      stubPurchases.set(key, updated);
      return { ok: true, value: updated };
    }
    return { ok: false, error: { code: 2604, message: 'Purchase not found' } };
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listResult = await (client as any).models.TourLanguagePurchase.listTourLanguagePurchaseBySessionId(
      { sessionId },
      { authMode: 'userPool' },
    );
    const items = (listResult?.data ?? []) as TourLanguagePurchase[];
    const match = items.find((p: TourLanguagePurchase) => p.language === language);
    if (!match) {
      return { ok: false, error: { code: 2604, message: `No purchase found for ${language}` } };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateResult = await (client as any).models.TourLanguagePurchase.update(
      { id: match.id, moderationStatus: 'draft' },
      { authMode: 'userPool' },
    );
    logger.info(SERVICE_NAME, 'Language submission retracted', { sessionId, language });
    return { ok: true, value: updateResult?.data as TourLanguagePurchase };
  } catch (err) {
    logger.error(SERVICE_NAME, 'retractLanguageSubmission failed', { error: String(err) });
    return { ok: false, error: { code: 2608, message: `Retract failed: ${String(err)}` } };
  }
}

/** Test-only: reset stub state */
export function __resetLanguagePurchaseStubs(): void {
  stubPurchases.clear();
}

/** Test-only: access stub purchases */
export function __getStubPurchases(): Map<string, TourLanguagePurchase> {
  return stubPurchases;
}

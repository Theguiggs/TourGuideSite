/**
 * Unit tests for the auto-batch trigger logic.
 *
 * The auto-batch logic lives in the Scenes page useEffect (scenes/page.tsx).
 * These tests validate the decision conditions as pure functions:
 *
 * 1. Standard/Pro purchase + first tab open -> batch triggers
 * 2. Manual purchase + tab open -> batch does NOT trigger
 * 3. Second tab open (same language) -> batch does NOT re-trigger
 * 4. All segments already translated -> batch does NOT trigger
 * 5. No purchase for language -> batch does NOT trigger
 */
import type { SceneSegment, QualityTier } from '@/types/studio';

// --- Extract the batch-trigger decision logic as a pure function ---

interface LanguagePurchase {
  language: string;
  status: string;
  purchaseType: string;
  qualityTier: QualityTier | 'manual';
}

interface AutoBatchDecision {
  shouldTrigger: boolean;
  reason: string;
}

/**
 * Pure function that mirrors the auto-batch trigger conditions from scenes/page.tsx.
 *
 * Conditions for triggering:
 * 1. activeLanguageTab is not the base language
 * 2. There is an active purchase for this language
 * 3. The purchase is NOT manual (purchaseType !== 'manual' && qualityTier !== 'manual')
 * 4. The language has not already been triggered (tracked via batchTriggeredSet)
 * 5. Not all scenes already have translated segments for this language
 */
function shouldAutoTriggerBatch(
  activeLanguageTab: string,
  baseLanguage: string,
  purchases: LanguagePurchase[],
  batchTriggeredSet: Set<string>,
  activeSceneCount: number,
  translatedSegmentCount: number,
): AutoBatchDecision {
  // Condition: not base language tab
  if (!activeLanguageTab || activeLanguageTab === baseLanguage) {
    return { shouldTrigger: false, reason: 'base_language_tab' };
  }

  // Condition: active purchase exists for this language
  const purchase = purchases.find(
    (p) => p.language === activeLanguageTab && p.status === 'active',
  );
  if (!purchase) {
    return { shouldTrigger: false, reason: 'no_purchase' };
  }

  // Condition: not manual mode
  if (purchase.purchaseType === 'manual' || purchase.qualityTier === 'manual') {
    return { shouldTrigger: false, reason: 'manual_mode' };
  }

  // Condition: not already triggered
  if (batchTriggeredSet.has(activeLanguageTab)) {
    return { shouldTrigger: false, reason: 'already_triggered' };
  }

  // Condition: not all scenes already translated
  if (translatedSegmentCount >= activeSceneCount) {
    return { shouldTrigger: false, reason: 'all_translated' };
  }

  return { shouldTrigger: true, reason: 'auto_trigger' };
}

// --- Tests ---

describe('Auto-batch trigger logic', () => {
  const BASE_LANG = 'fr';

  function makeStandardPurchase(lang: string): LanguagePurchase {
    return {
      language: lang,
      status: 'active',
      purchaseType: 'single',
      qualityTier: 'standard',
    };
  }

  function makeProPurchase(lang: string): LanguagePurchase {
    return {
      language: lang,
      status: 'active',
      purchaseType: 'single',
      qualityTier: 'pro',
    };
  }

  function makeManualPurchase(lang: string): LanguagePurchase {
    return {
      language: lang,
      status: 'active',
      purchaseType: 'manual',
      qualityTier: 'manual',
    };
  }

  // --- 1. Standard purchase + first tab open -> batch triggers ---

  it('triggers batch for Standard purchase on first tab open', () => {
    const result = shouldAutoTriggerBatch(
      'en',
      BASE_LANG,
      [makeStandardPurchase('en')],
      new Set(),
      3, // 3 active scenes
      0, // 0 translated segments
    );
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toBe('auto_trigger');
  });

  it('triggers batch for Pro purchase on first tab open', () => {
    const result = shouldAutoTriggerBatch(
      'es',
      BASE_LANG,
      [makeProPurchase('es')],
      new Set(),
      5,
      0,
    );
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toBe('auto_trigger');
  });

  // --- 2. Manual purchase + tab open -> batch does NOT trigger ---

  it('does NOT trigger batch for Manual purchase', () => {
    const result = shouldAutoTriggerBatch(
      'en',
      BASE_LANG,
      [makeManualPurchase('en')],
      new Set(),
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('manual_mode');
  });

  it('does NOT trigger batch when qualityTier is manual even if purchaseType is single', () => {
    const purchase: LanguagePurchase = {
      language: 'de',
      status: 'active',
      purchaseType: 'single',
      qualityTier: 'manual',
    };
    const result = shouldAutoTriggerBatch(
      'de',
      BASE_LANG,
      [purchase],
      new Set(),
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('manual_mode');
  });

  // --- 3. Second tab open (same language) -> batch does NOT re-trigger ---

  it('does NOT re-trigger batch for already-triggered language', () => {
    const alreadyTriggered = new Set(['en']);
    const result = shouldAutoTriggerBatch(
      'en',
      BASE_LANG,
      [makeStandardPurchase('en')],
      alreadyTriggered,
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('already_triggered');
  });

  it('triggers batch for new language even if another was already triggered', () => {
    const alreadyTriggered = new Set(['en']);
    const result = shouldAutoTriggerBatch(
      'es',
      BASE_LANG,
      [makeStandardPurchase('en'), makeStandardPurchase('es')],
      alreadyTriggered,
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toBe('auto_trigger');
  });

  // --- 4. All segments already translated -> batch does NOT trigger ---

  it('does NOT trigger batch when all scenes already have translated segments', () => {
    const result = shouldAutoTriggerBatch(
      'en',
      BASE_LANG,
      [makeStandardPurchase('en')],
      new Set(),
      3, // 3 active scenes
      3, // 3 translated segments (all done)
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('all_translated');
  });

  it('does NOT trigger batch when translated count exceeds scene count', () => {
    const result = shouldAutoTriggerBatch(
      'en',
      BASE_LANG,
      [makeStandardPurchase('en')],
      new Set(),
      3,
      5, // more segments than scenes (edge case)
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('all_translated');
  });

  it('triggers batch when only some scenes are translated', () => {
    const result = shouldAutoTriggerBatch(
      'en',
      BASE_LANG,
      [makeStandardPurchase('en')],
      new Set(),
      5,
      2, // only 2 of 5 translated
    );
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toBe('auto_trigger');
  });

  // --- 5. No purchase for language -> batch does NOT trigger ---

  it('does NOT trigger batch when no purchase exists for the language', () => {
    const result = shouldAutoTriggerBatch(
      'de',
      BASE_LANG,
      [makeStandardPurchase('en')], // only EN purchased, not DE
      new Set(),
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('no_purchase');
  });

  it('does NOT trigger batch when purchase exists but is not active', () => {
    const inactivePurchase: LanguagePurchase = {
      language: 'en',
      status: 'cancelled',
      purchaseType: 'single',
      qualityTier: 'standard',
    };
    const result = shouldAutoTriggerBatch(
      'en',
      BASE_LANG,
      [inactivePurchase],
      new Set(),
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('no_purchase');
  });

  // --- Edge cases ---

  it('does NOT trigger for base language tab', () => {
    const result = shouldAutoTriggerBatch(
      BASE_LANG,
      BASE_LANG,
      [makeStandardPurchase(BASE_LANG)],
      new Set(),
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('base_language_tab');
  });

  it('does NOT trigger when activeLanguageTab is empty', () => {
    const result = shouldAutoTriggerBatch(
      '',
      BASE_LANG,
      [makeStandardPurchase('en')],
      new Set(),
      3,
      0,
    );
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('base_language_tab');
  });
});

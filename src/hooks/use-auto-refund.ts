'use client';

import { useEffect, useRef } from 'react';
import { refundLanguagePurchase } from '@/lib/api/language-purchase';
import { useLanguageBatchStore } from '@/lib/stores/language-batch-store';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AutoRefund';
const AUTO_REFUND_DELAY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Hook that triggers an automatic refund if a batch translation
 * fails 100% (all scenes failed) after a 15-minute timeout.
 *
 * Per story ML-5.5 AC5: the timer starts when all scenes fail,
 * and fires the refund if no retry has succeeded in the meantime.
 */
export function useAutoRefund(
  lang: string | null,
  purchaseId: string | null,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchProgress = useLanguageBatchStore((s) => lang ? s.progress[lang] ?? null : null);

  useEffect(() => {
    // Clear any existing timer on dependency change
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!lang || !purchaseId || !batchProgress) return;

    // Check if 100% failed: status is 'failed' and all scenes are in failedScenes
    const is100PercentFailed =
      batchProgress.status === 'failed' &&
      batchProgress.total > 0 &&
      batchProgress.failedScenes.length === batchProgress.total;

    if (!is100PercentFailed) return;

    logger.info(SERVICE_NAME, 'Batch 100% failed, starting auto-refund timer', {
      lang,
      purchaseId,
      delayMs: AUTO_REFUND_DELAY_MS,
    });

    timerRef.current = setTimeout(async () => {
      // Re-check current state before refunding (a retry may have succeeded)
      const currentProgress = useLanguageBatchStore.getState().progress[lang];
      if (
        currentProgress &&
        currentProgress.status === 'failed' &&
        currentProgress.failedScenes.length === currentProgress.total
      ) {
        logger.info(SERVICE_NAME, 'Auto-refund triggered', {
          purchaseId,
          lang,
          reason: 'batch_100_fail_timeout',
        });
        await refundLanguagePurchase(purchaseId);
      } else {
        logger.info(SERVICE_NAME, 'Auto-refund cancelled — batch state changed', {
          purchaseId,
          lang,
        });
      }
    }, AUTO_REFUND_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lang, purchaseId, batchProgress]);
}

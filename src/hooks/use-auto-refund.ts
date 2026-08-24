'use client';

import { useEffect, useRef } from 'react';
import { revokeLanguageAccess } from '@/lib/api/language-purchase';
import { useLanguageBatchStore } from '@/lib/stores/language-batch-store';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AutoRefund';
const AUTO_REFUND_DELAY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Hook that revokes access to a purchased language if a batch translation
 * fails 100% (all scenes failed) after a 15-minute timeout.
 *
 * Per story ML-5.5 AC5: the timer starts when all scenes fail,
 * and fires if no retry has succeeded in the meantime.
 *
 * ⚠️ Ce n'est PAS un remboursement Stripe : `revokeLanguageAccess` ne fait que
 * passer l'achat en `status: 'refunded'` (accès coupé). Et depuis le resserrage
 * par champ, ce champ est admin-only : un guide connecté verra l'appel échouer
 * bruyamment. Ce hook n'est monté par aucun composant aujourd'hui ; le rebrancher
 * suppose de faire porter la révocation par un chemin serveur/admin.
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
        logger.info(SERVICE_NAME, 'Auto-revoke triggered', {
          purchaseId,
          lang,
          reason: 'batch_100_fail_timeout',
        });
        await revokeLanguageAccess(purchaseId);
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

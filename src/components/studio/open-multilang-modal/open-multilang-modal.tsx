'use client';

import { useState, useCallback, useMemo } from 'react';
import { useLanguagePurchaseStore } from '@/lib/stores/language-purchase-store';
import { logger } from '@/lib/logger';
import {
  confirmLanguagePurchaseMixed,
  createPaymentIntentMixed,
} from '@/lib/api/language-purchase';
import {
  LANGUAGE_CONFIG,
  formatPrice,
} from '@/components/studio/language-checkout/language-checkbox-card';
import { computeMixedOrder, type LangMode, type LangSelections } from '@/lib/multilang/language-pricing';
import { isLanguagePremium } from '@/lib/multilang/provider-router';
import type { QualityTier } from '@/types/studio';

const SERVICE_NAME = 'OpenMultilangModal';

export interface OpenMultilangModalProps {
  sessionId: string;
  baseLanguage: string;
  isOpen: boolean;
  onClose: () => void;
  onLanguagesChanged?: () => void;
  /** Called after auto purchases — passes the langs that need batch translation + their tiers. */
  onBatchTranslationNeeded?: (languages: string[], qualityTier: QualityTier) => void;
}

const MODE_LABELS: Record<LangMode | 'none', string> = {
  none: '— aucune',
  manual: 'Manuel (gratuit)',
  standard: 'Auto Standard',
  pro: 'Auto Pro',
};

export function OpenMultilangModal({
  sessionId,
  baseLanguage,
  isOpen,
  onClose,
  onLanguagesChanged,
  onBatchTranslationNeeded,
}: OpenMultilangModalProps) {
  const [selections, setSelections] = useState<LangSelections>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allPurchases = useLanguagePurchaseStore((s) => s.purchases);
  const setPurchases = useLanguagePurchaseStore((s) => s.setPurchases);
  const purchases = useMemo(() => {
    const prefix = `${sessionId}_`;
    return Object.entries(allPurchases)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value);
  }, [allPurchases, sessionId]);

  const freeLanguageUsed = useMemo(
    () => purchases.some((p) => p.purchaseType === 'free_first' && p.status === 'active'),
    [purchases],
  );

  const isLanguagePurchased = useCallback(
    (lang: string) => purchases.some((p) => p.language === lang && p.status === 'active'),
    [purchases],
  );

  const availableLanguages = useMemo(
    () => LANGUAGE_CONFIG.filter((lang) => lang.code !== baseLanguage),
    [baseLanguage],
  );

  const order = useMemo(() => computeMixedOrder(selections, freeLanguageUsed), [selections, freeLanguageUsed]);
  const lineByLang = useMemo(() => {
    const m = new Map<string, (typeof order.lines)[number]>();
    for (const l of order.lines) m.set(l.language, l);
    return m;
  }, [order]);

  const setMode = useCallback((lang: string, mode: LangMode | 'none') => {
    setSelections((prev) => {
      const next = { ...prev };
      if (mode === 'none') delete next[lang];
      else next[lang] = mode;
      return next;
    });
    setErrorMessage(null);
  }, []);

  const selectedCount = Object.keys(selections).length;
  const autoLangs = Object.keys(selections).filter((l) => selections[l] !== 'manual');

  const handleConfirm = useCallback(async () => {
    if (selectedCount === 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    logger.info(SERVICE_NAME, 'Confirming mixed multilang', { sessionId, selections });

    try {
      let paymentIntentId = '';
      if (order.totalCents > 0) {
        const piResult = await createPaymentIntentMixed(sessionId, selections);
        if (!piResult.ok) {
          setErrorMessage('Erreur de paiement. Réessayez.');
          logger.error(SERVICE_NAME, 'Payment intent failed', { code: piResult.error.code });
          setIsLoading(false);
          return;
        }
        paymentIntentId = piResult.value.paymentIntentId;
      }

      const result = await confirmLanguagePurchaseMixed(sessionId, selections, paymentIntentId);
      if (result.ok) {
        setPurchases(result.value);
        logger.info(SERVICE_NAME, 'Languages added', { count: result.value.length });
        onLanguagesChanged?.();
        // Trigger batch translation for the auto languages (group by representative tier).
        if (autoLangs.length > 0 && onBatchTranslationNeeded) {
          const hasPro = autoLangs.some((l) => selections[l] === 'pro' || isLanguagePremium(l));
          onBatchTranslationNeeded(autoLangs, hasPro ? 'pro' : 'standard');
        }
        onClose();
        setSelections({});
      } else {
        setErrorMessage('Erreur serveur. Réessayez.');
        logger.error(SERVICE_NAME, 'Confirm failed', { code: result.error.code });
      }
    } catch (err) {
      setErrorMessage('Erreur inattendue. Réessayez.');
      logger.error(SERVICE_NAME, 'Unexpected error', { error: String(err) });
    }
    setIsLoading(false);
  }, [sessionId, selections, order.totalCents, selectedCount, autoLangs, setPurchases, onLanguagesChanged, onClose, onBatchTranslationNeeded]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const payLabel =
    selectedCount === 0
      ? 'Sélectionnez une langue'
      : order.totalCents === 0
        ? 'Ajouter les langues (gratuit)'
        : `Payer et traduire — ${formatPrice(order.totalCents)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      data-testid="multilang-modal-backdrop"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        data-testid="multilang-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter des langues"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-40 hover:text-ink-80 text-xl leading-none z-10"
          aria-label="Fermer"
          data-testid="modal-close-btn"
        >
          &times;
        </button>

        <div className="p-6">
          <h2 className="text-lg font-bold text-ink mb-1">Ajouter des langues</h2>
          <p className="text-sm text-ink-60 mb-5">
            Choisissez, pour chaque langue, de traduire vous-même (gratuit) ou de laisser l&apos;IA traduire.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* ─── LEFT: language table ─── */}
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-ink-60">
                    <th className="text-left font-medium py-2">Langue</th>
                    <th className="text-left font-medium py-2 px-2">Traduction</th>
                    <th className="text-right font-medium py-2">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {availableLanguages.map((lang) => {
                    const purchased = isLanguagePurchased(lang.code);
                    const premium = isLanguagePremium(lang.code);
                    const mode = selections[lang.code] ?? 'none';
                    const line = lineByLang.get(lang.code);
                    return (
                      <tr key={lang.code} className="border-b border-line/50" data-testid={`lang-row-${lang.code}`}>
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <img
                              src={`https://flagcdn.com/w40/${lang.countryCode}.png`}
                              width="20" height="15" alt="" aria-hidden="true" className="shrink-0"
                            />
                            <span className="font-medium text-ink">{lang.label}</span>
                            {premium && <span className="text-[10px] text-ocre">premium</span>}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {purchased ? (
                            <span className="text-xs text-success">Déjà ajoutée</span>
                          ) : (
                            <select
                              value={mode}
                              onChange={(e) => setMode(lang.code, e.target.value as LangMode | 'none')}
                              disabled={isLoading}
                              data-testid={`mode-select-${lang.code}`}
                              className="border border-line rounded-md px-2 py-1 text-sm text-ink-80 bg-white w-full"
                            >
                              <option value="none">{MODE_LABELS.none}</option>
                              <option value="manual">{MODE_LABELS.manual}</option>
                              {!premium && <option value="standard">{MODE_LABELS.standard}</option>}
                              <option value="pro">{MODE_LABELS.pro}</option>
                            </select>
                          )}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          {purchased ? (
                            <span className="text-xs text-ink-40">—</span>
                          ) : !line ? (
                            <span className="text-ink-40">—</span>
                          ) : line.billing === 'manual' ? (
                            <span className="text-ink-60">gratuit</span>
                          ) : line.billing === 'free_first' ? (
                            <span className="text-grenadine">offerte</span>
                          ) : line.billing === 'pack_3' || line.billing === 'pack_all' ? (
                            <span className="text-grenadine">{line.billing === 'pack_all' ? 'Pack' : 'Pack 3'}</span>
                          ) : (
                            <span className="text-ink-80 font-medium">{formatPrice(line.priceCents)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── RIGHT: help + recap ─── */}
            <aside className="space-y-4">
              <div className="rounded-lg border border-line bg-paper-soft p-3 text-xs space-y-2.5">
                <p className="font-bold text-ink text-sm">💡 Les offres</p>
                <div>
                  <p className="font-semibold text-ink">Manuel — gratuit</p>
                  <p className="text-ink-60">Vous rédigez la traduction et enregistrez l&apos;audio vous-même.</p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Auto Standard — 1,99€</p>
                  <p className="text-ink-60">Traduction automatique (MarianMT). Langues européennes uniquement.</p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Auto Pro — 2,99€ <span className="text-ocre">(4,99€ premium)</span></p>
                  <p className="text-ink-60">Traduction automatique (Deepl), meilleure qualité + langues asiatiques.</p>
                </div>
                <div className="pt-1 border-t border-line">
                  <p className="font-semibold text-grenadine">🎁 Pack Toutes — 12,99€</p>
                  <p className="text-ink-60">Les 7 langues en auto (~50% d&apos;économie).</p>
                </div>
              </div>

              {/* Recap */}
              <div className="rounded-lg border border-line bg-white p-3" data-testid="recap-panel">
                {order.packAllApplied && (
                  <p className="text-xs text-grenadine font-semibold mb-2" data-testid="pack-all-applied">
                    🎁 Pack Toutes appliqué
                  </p>
                )}
                {!order.packAllApplied && order.packAllMissing !== null && (
                  <p className="text-xs text-mer mb-2" data-testid="pack-all-hint">
                    Encore {order.packAllMissing} langue{order.packAllMissing > 1 ? 's' : ''} en auto pour le Pack Toutes (12,99€).
                  </p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="text-lg font-bold text-ink" data-testid="recap-total">
                    {selectedCount === 0 ? '—' : order.totalCents === 0 ? 'Gratuit' : formatPrice(order.totalCents)}
                  </span>
                </div>

                {errorMessage && (
                  <div className="rounded-lg bg-grenadine-soft border border-grenadine-soft px-3 py-2 text-xs text-danger mb-3" role="alert" data-testid="modal-error-banner">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={selectedCount === 0 || isLoading}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    selectedCount === 0 || isLoading
                      ? 'bg-paper-deep text-ink-40 cursor-not-allowed'
                      : 'bg-grenadine text-white hover:opacity-90'
                  }`}
                  data-testid="confirm-btn"
                >
                  {isLoading ? 'Traitement...' : payLabel}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

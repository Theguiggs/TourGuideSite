'use client';

import { useState, useCallback, useMemo } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useLanguagePurchaseStore } from '@/lib/stores/language-purchase-store';
import { logger } from '@/lib/logger';
import {
  confirmLanguagePurchaseMixed,
  createPaymentIntentMixed,
  upgradeLanguagesToAuto,
  languagesWithManualContent,
} from '@/lib/api/language-purchase';
import {
  LANGUAGE_CONFIG,
  formatPrice,
} from '@/components/studio/language-checkout/language-checkbox-card';
import { computeMixedOrder, type LangMode, type LangSelections } from '@/lib/multilang/language-pricing';
import { isLanguagePremium } from '@/lib/multilang/provider-router';
import { getStripePromise } from '@/lib/stripe/client';
import type { QualityTier } from '@/types/studio';

// --- Stripe payment form (must live inside <Elements>) ---
function MultilangPaymentForm({
  paymentIntentId,
  onSuccess,
  onError,
}: {
  paymentIntentId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const handlePay = useCallback(async () => {
    if (!stripe || !elements) {
      onError('Stripe non initialisé. Vérifiez NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
      return;
    }
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        setBusy(false);
        onError(error.message ?? 'Paiement refusé.');
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id ?? paymentIntentId);
        return;
      }
      setBusy(false);
      onError(`Paiement non finalisé (${paymentIntent?.status ?? 'inconnu'}).`);
    } catch (e) {
      setBusy(false);
      onError(`Erreur paiement : ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [stripe, elements, paymentIntentId, onSuccess, onError]);

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          busy ? 'bg-paper-deep text-ink-40 cursor-not-allowed' : 'bg-grenadine text-white hover:opacity-90'
        }`}
      >
        {busy ? 'Traitement...' : 'Confirmer le paiement'}
      </button>
    </div>
  );
}

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
  const [pendingPayment, setPendingPayment] = useState<{ clientSecret: string; paymentIntentId: string } | null>(null);

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

  /** Active purchase for a language (or undefined). */
  const purchaseFor = useCallback(
    (lang: string) => purchases.find((p) => p.language === lang && p.status === 'active'),
    [purchases],
  );
  const purchasedManual = useCallback(
    (lang: string) => purchaseFor(lang)?.purchaseType === 'manual',
    [purchaseFor],
  );
  const purchasedAuto = useCallback(
    (lang: string) => {
      const p = purchaseFor(lang);
      return !!p && p.purchaseType !== 'manual';
    },
    [purchaseFor],
  );

  const availableLanguages = useMemo(
    () => LANGUAGE_CONFIG.filter((lang) => lang.code !== baseLanguage),
    [baseLanguage],
  );

  // Charges only apply to NEW languages and to UPGRADES (manual → auto).
  // An already-manual language left on 'manual' is a no-op and excluded.
  const chargeableSelections = useMemo<LangSelections>(() => {
    const out: LangSelections = {};
    for (const [lang, mode] of Object.entries(selections)) {
      if (purchasedAuto(lang)) continue; // locked, can't change
      if (purchasedManual(lang) && mode === 'manual') continue; // unchanged manual
      out[lang] = mode;
    }
    return out;
  }, [selections, purchasedManual, purchasedAuto]);

  const order = useMemo(() => computeMixedOrder(chargeableSelections, freeLanguageUsed), [chargeableSelections, freeLanguageUsed]);
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

  // New languages (not yet purchased) vs upgrades (manual → auto).
  const newSelections = useMemo<LangSelections>(() => {
    const out: LangSelections = {};
    for (const [lang, mode] of Object.entries(chargeableSelections)) {
      if (!purchaseFor(lang)) out[lang] = mode;
    }
    return out;
  }, [chargeableSelections, purchaseFor]);
  const upgradeSelections = useMemo<Record<string, 'standard' | 'pro'>>(() => {
    const out: Record<string, 'standard' | 'pro'> = {};
    for (const [lang, mode] of Object.entries(chargeableSelections)) {
      if (purchasedManual(lang) && mode !== 'manual') out[lang] = mode as 'standard' | 'pro';
    }
    return out;
  }, [chargeableSelections, purchasedManual]);

  const chargeableCount = Object.keys(chargeableSelections).length;
  const autoLangs = Object.keys(chargeableSelections).filter((l) => chargeableSelections[l] !== 'manual');

  // Overwrite/keep prompt state for upgrades that have existing manual content.
  const [pendingOverwrite, setPendingOverwrite] = useState<{ langs: string[]; paymentIntentId: string } | null>(null);

  /** Runs the actual purchase/upgrade once any overwrite decision is resolved. */
  const runConfirm = useCallback(async (paymentIntentId: string, overwriteContent: boolean) => {
    try {
      const collected: typeof purchases = [];
      if (Object.keys(newSelections).length > 0) {
        const result = await confirmLanguagePurchaseMixed(sessionId, newSelections, paymentIntentId, freeLanguageUsed);
        if (!result.ok) { setErrorMessage('Erreur serveur. Réessayez.'); setIsLoading(false); return; }
        collected.push(...result.value);
      }
      if (Object.keys(upgradeSelections).length > 0) {
        const up = await upgradeLanguagesToAuto(sessionId, upgradeSelections, paymentIntentId, overwriteContent);
        if (!up.ok) { setErrorMessage('Erreur lors de l\'upgrade. Réessayez.'); setIsLoading(false); return; }
        collected.push(...up.value);
      }
      if (collected.length > 0) setPurchases(collected);
      onLanguagesChanged?.();
      if (autoLangs.length > 0 && onBatchTranslationNeeded) {
        const hasPro = autoLangs.some((l) => chargeableSelections[l] === 'pro' || isLanguagePremium(l));
        onBatchTranslationNeeded(autoLangs, hasPro ? 'pro' : 'standard');
      }
      onClose();
      setSelections({});
      setPendingOverwrite(null);
      setPendingPayment(null);
    } catch (err) {
      setErrorMessage('Erreur inattendue. Réessayez.');
      logger.error(SERVICE_NAME, 'runConfirm failed', { error: String(err) });
    }
    setIsLoading(false);
  }, [sessionId, newSelections, upgradeSelections, autoLangs, chargeableSelections, freeLanguageUsed, setPurchases, onLanguagesChanged, onClose, onBatchTranslationNeeded, purchases]);

  const handleConfirm = useCallback(async () => {
    if (chargeableCount === 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    logger.info(SERVICE_NAME, 'Confirming mixed multilang', { sessionId, chargeableSelections });

    try {
      const paymentIntentId = '';
      if (order.totalCents > 0) {
        const piResult = await createPaymentIntentMixed(sessionId, chargeableSelections);
        if (!piResult.ok) {
          setErrorMessage(piResult.error.message || 'Erreur de paiement. Réessayez.');
          logger.error(SERVICE_NAME, 'Payment intent failed', { code: piResult.error.code, message: piResult.error.message });
          setIsLoading(false);
          return;
        }
        // Defensive: never mount Stripe <Elements> with an empty clientSecret
        // (it throws "clientSecret should be of the form ${id}_secret_${secret}").
        if (!piResult.value.clientSecret) {
          setErrorMessage('Paiement indisponible (clientSecret manquant). Réessayez.');
          logger.error(SERVICE_NAME, 'Payment intent returned empty clientSecret', {});
          setIsLoading(false);
          return;
        }
        // Show Stripe payment form — do NOT proceed until card is confirmed.
        setPendingPayment({ clientSecret: piResult.value.clientSecret, paymentIntentId: piResult.value.paymentIntentId });
        setIsLoading(false);
        return;
      }

      // If we're upgrading manual languages that already have content, ask first.
      const upgradeLangs = Object.keys(upgradeSelections);
      if (upgradeLangs.length > 0) {
        const withContent = await languagesWithManualContent(sessionId, upgradeLangs);
        if (withContent.length > 0) {
          setPendingOverwrite({ langs: withContent, paymentIntentId });
          setIsLoading(false);
          return; // wait for the user's overwrite/keep choice
        }
      }
      await runConfirm(paymentIntentId, true);
    } catch (err) {
      setErrorMessage('Erreur inattendue. Réessayez.');
      logger.error(SERVICE_NAME, 'Unexpected error', { error: String(err) });
      setIsLoading(false);
    }
  }, [sessionId, chargeableSelections, order.totalCents, chargeableCount, upgradeSelections, runConfirm]);

  const handlePaymentSuccess = useCallback(async (confirmedIntentId: string) => {
    if (!pendingPayment) return;
    setIsLoading(true);
    setErrorMessage(null);
    // Check for overwrite if there are upgrades
    const upgradeLangs = Object.keys(upgradeSelections);
    if (upgradeLangs.length > 0) {
      const withContent = await languagesWithManualContent(sessionId, upgradeLangs);
      if (withContent.length > 0) {
        setPendingOverwrite({ langs: withContent, paymentIntentId: confirmedIntentId });
        setIsLoading(false);
        return;
      }
    }
    await runConfirm(confirmedIntentId, true);
  }, [pendingPayment, upgradeSelections, sessionId, runConfirm]);

  const handlePaymentError = useCallback((msg: string) => {
    setErrorMessage(msg);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const payLabel =
    chargeableCount === 0
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
                    const premium = isLanguagePremium(lang.code);
                    const isAuto = purchasedAuto(lang.code);
                    const isManualOwned = purchasedManual(lang.code);
                    // Manual-owned languages default the dropdown to 'manual' (upgradable).
                    const mode = selections[lang.code] ?? (isManualOwned ? 'manual' : 'none');
                    const line = lineByLang.get(lang.code);
                    const isUpgrade = isManualOwned && mode !== 'manual';
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
                          {isAuto ? (
                            <span className="text-xs text-success" data-testid={`locked-auto-${lang.code}`}>Déjà ajoutée (Auto)</span>
                          ) : (
                            <select
                              value={mode}
                              onChange={(e) => setMode(lang.code, e.target.value as LangMode | 'none')}
                              disabled={isLoading}
                              data-testid={`mode-select-${lang.code}`}
                              className="border border-line rounded-md px-2 py-1 text-sm text-ink-80 bg-white w-full"
                            >
                              {/* Manual-owned languages can't be set back to 'none' (already owned). */}
                              {!isManualOwned && <option value="none">{MODE_LABELS.none}</option>}
                              <option value="manual">{isManualOwned ? 'Manuel (actuel)' : MODE_LABELS.manual}</option>
                              {!premium && <option value="standard">{MODE_LABELS.standard}</option>}
                              <option value="pro">{MODE_LABELS.pro}</option>
                            </select>
                          )}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          {isAuto ? (
                            <span className="text-xs text-ink-40">—</span>
                          ) : isManualOwned && mode === 'manual' ? (
                            <span className="text-xs text-ink-40">déjà en manuel</span>
                          ) : !line ? (
                            <span className="text-ink-40">—</span>
                          ) : line.billing === 'manual' ? (
                            <span className="text-ink-60">gratuit</span>
                          ) : line.billing === 'free_first' ? (
                            <span className="text-grenadine">offerte</span>
                          ) : line.billing === 'pack_3' || line.billing === 'pack_all' ? (
                            <span className="text-grenadine">{line.billing === 'pack_all' ? 'Pack' : 'Pack 3'}</span>
                          ) : (
                            <span className="text-ink-80 font-medium">
                              {formatPrice(line.priceCents)}{isUpgrade && <span className="text-[10px] text-mer ml-1">upgrade</span>}
                            </span>
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
                    {chargeableCount === 0 ? '—' : order.totalCents === 0 ? 'Gratuit' : formatPrice(order.totalCents)}
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
                  disabled={chargeableCount === 0 || isLoading}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    chargeableCount === 0 || isLoading
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

        {/* Overwrite / keep dialog for manual → auto upgrades with existing content */}
        {pendingOverwrite && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-xl p-4" data-testid="overwrite-dialog">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
              <h3 className="text-sm font-bold text-ink mb-2">Contenu manuel existant</h3>
              <p className="text-sm text-ink-80 mb-1">
                {pendingOverwrite.langs.map((l) => l.toUpperCase()).join(', ')} contien
                {pendingOverwrite.langs.length > 1 ? 'nent' : 't'} déjà du texte traduit manuellement.
              </p>
              <p className="text-sm text-ink-60 mb-4">
                Voulez-vous écraser ce contenu par la traduction automatique, ou le conserver
                (l&apos;auto ne remplira que les scènes vides) ?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { setIsLoading(true); runConfirm(pendingOverwrite.paymentIntentId, true); }}
                  className="w-full rounded-lg px-4 py-2 text-sm font-semibold bg-grenadine text-white hover:opacity-90"
                  data-testid="overwrite-confirm"
                >
                  Écraser par la traduction auto
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLoading(true); runConfirm(pendingOverwrite.paymentIntentId, false); }}
                  className="w-full rounded-lg px-4 py-2 text-sm font-semibold border border-line text-ink-80 hover:bg-paper-soft"
                  data-testid="overwrite-keep"
                >
                  Conserver mon contenu manuel
                </button>
                <button
                  type="button"
                  onClick={() => setPendingOverwrite(null)}
                  className="w-full rounded-lg px-4 py-2 text-xs text-ink-40 hover:text-ink-60"
                  data-testid="overwrite-cancel"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stripe payment step — shown after PaymentIntent is created for paid orders */}
        {pendingPayment && pendingPayment.clientSecret && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-6" data-testid="payment-step">
            <div className="mt-4 mb-6 max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-5 shadow-xl sm:mt-8">
              <h3 className="text-sm font-bold text-ink mb-2">Paiement — {formatPrice(order.totalCents)}</h3>
              <p className="text-sm text-ink-60 mb-4">Entrez vos informations de paiement pour finaliser l&apos;achat.</p>
              {errorMessage && (
                <p className="text-xs text-danger mb-3" role="alert">{errorMessage}</p>
              )}
              <Elements stripe={getStripePromise()} options={{ clientSecret: pendingPayment.clientSecret }}>
                <MultilangPaymentForm
                  paymentIntentId={pendingPayment.paymentIntentId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
              <button
                type="button"
                onClick={() => { setPendingPayment(null); setErrorMessage(null); }}
                className="w-full mt-3 rounded-lg px-4 py-2 text-xs text-ink-40 hover:text-ink-60"
                data-testid="payment-cancel"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

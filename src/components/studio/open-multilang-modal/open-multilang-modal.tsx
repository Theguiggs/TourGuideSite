'use client';

import { useState, useCallback, useMemo } from 'react';
import { useLanguagePurchaseStore } from '@/lib/stores/language-purchase-store';
import { logger } from '@/lib/logger';
import {
  confirmLanguagePurchase,
  createPaymentIntent,
} from '@/lib/api/language-purchase';
import {
  LanguageCheckboxCard,
  LANGUAGE_CONFIG,
  formatPrice,
} from '@/components/studio/language-checkout/language-checkbox-card';
import { computeOrderTotal } from '@/components/studio/language-checkout/payment-summary';
import { isLanguagePremium } from '@/lib/multilang/provider-router';
import type { QualityTier } from '@/types/studio';

const SERVICE_NAME = 'OpenMultilangModal';

type ModalStep = 1 | 2 | 3;

type TranslationMode = 'manual' | 'standard' | 'pro';

export interface OpenMultilangModalProps {
  sessionId: string;
  baseLanguage: string;
  isOpen: boolean;
  onClose: () => void;
  onLanguagesChanged?: () => void;
  /** Called after purchase of Standard/Pro — passes languages + tier for batch translation */
  onBatchTranslationNeeded?: (languages: string[], qualityTier: QualityTier) => void;
}

const MODE_OPTIONS: {
  value: TranslationMode;
  label: string;
  description: string;
  priceLabel: string;
}[] = [
  {
    value: 'manual',
    label: 'Je traduis moi-m\u00eame',
    description: 'Vous r\u00e9digez les textes et enregistrez l\u2019audio.',
    priceLabel: 'gratuit',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Traduction automatique. Vous pourrez corriger.',
    priceLabel: '1,99\u00a0\u20ac/langue EU, 4,99\u00a0\u20ac premium',
  },
  {
    value: 'pro',
    label: 'Pro',
    description: 'Traduction qualit\u00e9 sup\u00e9rieure. Vous pourrez corriger.',
    priceLabel: '2,99\u00a0\u20ac/langue EU, 4,99\u00a0\u20ac premium',
  },
];

export function OpenMultilangModal({
  sessionId,
  baseLanguage,
  isOpen,
  onClose,
  onLanguagesChanged,
  onBatchTranslationNeeded,
}: OpenMultilangModalProps) {
  const [currentStep, setCurrentStep] = useState<ModalStep>(1);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [mode, setMode] = useState<TranslationMode>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Store access
  const allPurchases = useLanguagePurchaseStore((s) => s.purchases);
  const purchases = useMemo(() => {
    const prefix = `${sessionId}_`;
    return Object.entries(allPurchases)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value);
  }, [allPurchases, sessionId]);
  const setPurchases = useLanguagePurchaseStore((s) => s.setPurchases);

  const isLanguagePurchased = useCallback(
    (lang: string) => purchases.some((p) => p.language === lang && p.status === 'active'),
    [purchases],
  );

  // Check if guide already used free first language
  const freeLanguageUsed = useMemo(
    () => purchases.some((p) => p.purchaseType === 'free_first'),
    [purchases],
  );

  // Available languages = all except base language
  const availableLanguages = useMemo(
    () => LANGUAGE_CONFIG.filter((lang) => lang.code !== baseLanguage),
    [baseLanguage],
  );

  // Check if any selected language is premium
  const hasPremiumSelected = useMemo(
    () => selectedLanguages.some((l) => isLanguagePremium(l)),
    [selectedLanguages],
  );

  // For premium languages, Standard is disabled -- only Pro or Manual
  const isStandardDisabledForPremium = hasPremiumSelected && mode === 'standard';

  const handleToggle = useCallback((langCode: string, checked: boolean) => {
    if (isLanguagePurchased(langCode)) return;
    setSelectedLanguages((prev) =>
      checked ? [...prev, langCode] : prev.filter((l) => l !== langCode),
    );
    setErrorMessage(null);
  }, [isLanguagePurchased]);

  // Order computation for step 3
  const qualityTier: QualityTier = mode === 'manual' ? 'manual' : mode;
  const order = useMemo(
    () => computeOrderTotal(selectedLanguages, qualityTier, freeLanguageUsed),
    [selectedLanguages, qualityTier, freeLanguageUsed],
  );

  // --- Step navigation ---
  const canGoToStep2 = selectedLanguages.length > 0;

  const handleNext = useCallback(() => {
    if (currentStep === 1 && canGoToStep2) {
      // If premium languages selected and mode is standard, reset to manual
      if (selectedLanguages.some((l) => isLanguagePremium(l)) && mode === 'standard') {
        setMode('manual');
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  }, [currentStep, canGoToStep2, selectedLanguages, mode]);

  const handleBack = useCallback(() => {
    setErrorMessage(null);
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  }, [currentStep]);

  // --- Confirm / Payment ---
  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    logger.info(SERVICE_NAME, 'Confirming multilang', { sessionId, languages: selectedLanguages, mode });

    try {
      let paymentIntentId = '';

      // If paid, create payment intent first (stub or real)
      if (order.totalCents > 0) {
        const piResult = await createPaymentIntent(sessionId, selectedLanguages, qualityTier);
        if (!piResult.ok) {
          setErrorMessage('Erreur de paiement. R\u00e9essayez.');
          logger.error(SERVICE_NAME, 'Payment intent failed', { code: piResult.error.code });
          setIsLoading(false);
          return;
        }
        paymentIntentId = piResult.value.paymentIntentId;
      }

      // Confirm purchase
      const result = await confirmLanguagePurchase(
        sessionId,
        selectedLanguages,
        qualityTier,
        paymentIntentId,
      );

      if (result.ok) {
        // Override purchaseType for manual
        const finalPurchases = mode === 'manual'
          ? result.value.map((p) => ({
              ...p,
              purchaseType: 'manual' as const,
              amountCents: 0,
              provider: null,
              stripePaymentIntentId: null,
            }))
          : result.value;

        setPurchases(finalPurchases);
        logger.info(SERVICE_NAME, 'Languages added', { count: finalPurchases.length, mode });
        onLanguagesChanged?.();
        // Trigger batch translation for Standard/Pro (not manual)
        if (mode !== 'manual' && onBatchTranslationNeeded) {
          onBatchTranslationNeeded(selectedLanguages, qualityTier);
        }
        onClose();
        // Reset modal state
        setSelectedLanguages([]);
        setMode('manual');
        setCurrentStep(1);
      } else {
        setErrorMessage('Erreur serveur. R\u00e9essayez.');
        logger.error(SERVICE_NAME, 'Confirm failed', { code: result.error.code });
      }
    } catch (err) {
      setErrorMessage('Erreur inattendue. R\u00e9essayez.');
      logger.error(SERVICE_NAME, 'Unexpected error', { error: String(err) });
    }

    setIsLoading(false);
  }, [sessionId, selectedLanguages, mode, qualityTier, order.totalCents, setPurchases, onLanguagesChanged, onClose, onBatchTranslationNeeded]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      data-testid="multilang-modal-backdrop"
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        data-testid="multilang-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ouvrir le multilangue"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none z-10"
          aria-label="Fermer"
          data-testid="modal-close-btn"
        >
          &times;
        </button>

        {/* Step indicator */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-teal-500' : 'bg-gray-200'
                }`}
                data-testid={`step-indicator-${step}`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* === STEP 1: Languages === */}
          {currentStep === 1 && (
            <div data-testid="step-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Quelles langues souhaitez-vous ajouter ?
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                S\u00e9lectionnez les langues dans lesquelles proposer votre visite.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {availableLanguages.map((lang) => {
                  const purchased = isLanguagePurchased(lang.code);
                  return (
                    <LanguageCheckboxCard
                      key={lang.code}
                      langCode={lang.code}
                      langLabel={lang.label}
                      countryCode={lang.countryCode}
                      priceCents={null}
                      checked={selectedLanguages.includes(lang.code) || purchased}
                      onToggle={handleToggle}
                      isPurchased={purchased}
                      currentTier="standard"
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoToStep2}
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  canGoToStep2
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                data-testid="step1-next-btn"
              >
                Suivant
              </button>
            </div>
          )}

          {/* === STEP 2: Mode === */}
          {currentStep === 2 && (
            <div data-testid="step-2">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Comment souhaitez-vous traduire ?
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Choisissez votre mode de traduction.
              </p>

              <div className="space-y-3 mb-6">
                {MODE_OPTIONS.map((opt) => {
                  const isDisabledPremium =
                    opt.value === 'standard' && hasPremiumSelected;

                  return (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                        isDisabledPremium
                          ? 'border-gray-200 opacity-50 cursor-not-allowed'
                          : mode === opt.value
                            ? 'border-teal-400 ring-1 ring-teal-400 bg-teal-50'
                            : 'border-gray-200 hover:border-teal-300'
                      }`}
                      data-testid={`mode-option-${opt.value}`}
                    >
                      <input
                        type="radio"
                        name="translation-mode"
                        value={opt.value}
                        checked={mode === opt.value}
                        onChange={() => {
                          if (!isDisabledPremium) setMode(opt.value);
                        }}
                        disabled={isDisabledPremium}
                        className="mt-1 accent-teal-600"
                        data-testid={`mode-radio-${opt.value}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {opt.label}
                          </span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {opt.priceLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {opt.description}
                        </p>
                        {isDisabledPremium && (
                          <p className="text-xs text-amber-600 mt-1">
                            Non disponible avec des langues premium. Choisissez Pro ou Manuel.
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Free first language note */}
              {!freeLanguageUsed && mode === 'standard' && !hasPremiumSelected && (
                <p
                  className="text-xs text-teal-600 mb-4"
                  data-testid="free-first-note"
                >
                  Votre premi\u00e8re langue Standard EU est offerte !
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  data-testid="step2-back-btn"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isStandardDisabledForPremium}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    isStandardDisabledForPremium
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                  data-testid="step2-next-btn"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {/* === STEP 3: Confirmation / Payment === */}
          {currentStep === 3 && (
            <div data-testid="step-3">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                R\u00e9capitulatif
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {mode === 'manual'
                  ? 'Vous traduirez vous-m\u00eame.'
                  : `Mode ${mode === 'standard' ? 'Standard' : 'Pro'} — traduction automatique.`}
              </p>

              {/* Line items */}
              <ul className="space-y-2 mb-4" data-testid="recap-lines">
                {order.lines.map((line) => (
                  <li
                    key={line.language}
                    className="flex items-center justify-between text-sm"
                    data-testid={`recap-line-${line.language}`}
                  >
                    <span className="text-gray-700">{line.label}</span>
                    <span className="font-medium text-gray-900">
                      {line.purchaseType === 'free_first' ? (
                        <span className="text-teal-600">
                          gratuit (1re langue offerte)
                        </span>
                      ) : line.priceCents === 0 ? (
                        <span className="text-teal-600">gratuit</span>
                      ) : (
                        formatPrice(line.priceCents)
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div
                className="flex items-center justify-between border-t border-gray-100 pt-3 mb-6"
                data-testid="recap-total"
              >
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {order.totalCents === 0 ? 'Gratuit' : formatPrice(order.totalCents)}
                </span>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div
                  className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4"
                  role="alert"
                  data-testid="modal-error-banner"
                >
                  {errorMessage}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  data-testid="step3-back-btn"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    isLoading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                  data-testid="confirm-btn"
                >
                  {isLoading
                    ? 'Traitement...'
                    : order.totalCents > 0
                      ? 'Confirmer et traduire'
                      : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

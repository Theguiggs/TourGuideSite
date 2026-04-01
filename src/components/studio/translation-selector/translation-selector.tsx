'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { estimateCost, checkMicroserviceHealth, requestTranslation } from '@/lib/api/translation';
import { useTranslationStore } from '@/lib/stores/translation-store';
import type { TranslationProvider, SceneSegment, QualityTier } from '@/types/studio';
import type { CostEstimate, MicroserviceHealth } from '@/lib/api/translation';

const SERVICE_NAME = 'TranslationSelector';

type TranslationMode = 'auto' | 'manual';

interface TranslationSelectorProps {
  segment: SceneSegment;
  /** Languages already translated for this segment (e.g. ['en', 'it']) */
  translatedLanguages?: string[];
  onTranslationStarted?: () => void;
  onManualTranslation?: (targetLang: string) => void;
}

const TARGET_LANGUAGES = [
  { code: 'en', label: 'Anglais', flag: '🇬🇧' },
  { code: 'it', label: 'Italien', flag: '🇮🇹' },
  { code: 'de', label: 'Allemand', flag: '🇩🇪' },
  { code: 'es', label: 'Espagnol', flag: '🇪🇸' },
] as const;

const PROVIDERS: { value: TranslationProvider; label: string; badge: string; tier: string; qualityTier: QualityTier }[] = [
  { value: 'marianmt', label: 'Standard', badge: 'Gratuit', tier: 'free', qualityTier: 'standard' },
  { value: 'deepl', label: 'DeepL', badge: 'Premium', tier: 'premium', qualityTier: 'pro' },
  { value: 'openai', label: 'GPT', badge: 'Premium+', tier: 'premium', qualityTier: 'pro' },
];

/** Map a TranslationProvider to its QualityTier */
function getQualityTierForProvider(provider: TranslationProvider): QualityTier {
  return provider === 'marianmt' ? 'standard' : 'pro';
}

export function TranslationSelector({ segment, translatedLanguages = [], onTranslationStarted, onManualTranslation }: TranslationSelectorProps) {
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [mode, setMode] = useState<TranslationMode>('auto');
  const [provider, setProvider] = useState<TranslationProvider>('marianmt');
  const [cost, setCost] = useState<CostEstimate | null>(null);
  const [health, setHealth] = useState<MicroserviceHealth | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setSegmentStatus = useTranslationStore((s) => s.setSegmentStatus);
  const startPolling = useTranslationStore((s) => s.startPolling);
  const setCostEstimate = useTranslationStore((s) => s.setCostEstimate);

  // Check GPU health on mount
  useEffect(() => {
    checkMicroserviceHealth().then(setHealth).catch(() => {});
  }, []);

  // Update cost estimate on provider/text change (only in auto mode with lang selected)
  useEffect(() => {
    if (!segment.transcriptText || mode !== 'auto' || !targetLang) return;
    estimateCost(segment.transcriptText, provider).then((est) => {
      setCost(est);
      setCostEstimate(segment.id, est);
    });
  }, [provider, segment.transcriptText, segment.id, setCostEstimate, mode, targetLang]);

  const isGpuDown = health !== null && !health.translation;
  const isMarianmtDisabled = isGpuDown && provider === 'marianmt';
  const hasText = !!segment.transcriptText && segment.transcriptText.length > 0;
  const langSelected = targetLang !== null;

  const handleTranslate = useCallback(async () => {
    if (!segment.transcriptText || isSubmitting || !targetLang) return;

    setIsSubmitting(true);
    try {
      setSegmentStatus(segment.id, { status: 'processing', provider, targetLang });

      const result = await requestTranslation(
        segment.id,
        segment.transcriptText,
        segment.language,
        targetLang,
        getQualityTierForProvider(provider),
      );

      if (result.status === 'completed') {
        setSegmentStatus(segment.id, {
          status: 'completed',
          translatedText: result.translatedText,
          costProvider: result.costProvider,
          costCharged: result.costCharged,
        });
      } else if (result.status === 'processing' && result.jobId) {
        startPolling(segment.id, result.jobId);
      } else {
        setSegmentStatus(segment.id, {
          status: 'failed',
          error: 'Échec du déclenchement de la traduction.',
        });
      }
      onTranslationStarted?.();
    } catch (err) {
      logger.error(SERVICE_NAME, 'Translation request failed', { error: String(err) });
      setSegmentStatus(segment.id, { status: 'failed', error: 'Erreur inattendue.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [segment, targetLang, provider, isSubmitting, setSegmentStatus, startPolling, onTranslationStarted]);

  const handleManualStart = useCallback(() => {
    if (!targetLang) return;
    setSegmentStatus(segment.id, {
      status: 'completed',
      translatedText: '',
      targetLang,
      provider: null,
      costProvider: 0,
      costCharged: 0,
    });
    onManualTranslation?.(targetLang);
  }, [targetLang, segment.id, setSegmentStatus, onManualTranslation]);

  if (!hasText) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center" data-testid="translation-no-text">
        Pas de texte disponible — transcrivez ou saisissez le texte d&apos;abord.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="translation-selector">
      {/* Translated languages summary */}
      {translatedLanguages.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg" data-testid="translated-langs-summary">
          <p className="text-sm font-medium text-green-800 mb-1">Traductions disponibles</p>
          <div className="flex gap-2 flex-wrap">
            {translatedLanguages.map((code) => {
              const lang = TARGET_LANGUAGES.find((l) => l.code === code);
              return lang ? (
                <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  {lang.flag} {lang.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Target language — mandatory */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Langue cible <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {TARGET_LANGUAGES.map((lang) => {
            const alreadyTranslated = translatedLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => setTargetLang(lang.code)}
                className={`relative px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  targetLang === lang.code
                    ? 'bg-teal-600 text-white'
                    : alreadyTranslated
                      ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid={`lang-${lang.code}`}
              >
                {lang.flag} {lang.label}
                {alreadyTranslated && targetLang !== lang.code && (
                  <span className="ml-1 text-[10px]" title="Traduction existante">&#10003;</span>
                )}
              </button>
            );
          })}
        </div>
        {!langSelected && (
          <p className="text-xs text-amber-500 mt-1" data-testid="lang-required">
            Veuillez sélectionner une langue cible
          </p>
        )}
      </div>

      {/* Translation mode — auto or manual */}
      {langSelected && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Mode de traduction</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('auto')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'auto'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="mode-auto"
            >
              Traduction automatique
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'manual'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="mode-manual"
            >
              Je traduis moi-même
            </button>
          </div>
        </div>
      )}

      {/* Auto mode — provider selection + cost */}
      {langSelected && mode === 'auto' && (
        <>
          {/* Quality/Provider */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Qualité de traduction</label>
            <div className="space-y-2">
              {PROVIDERS.map((p) => {
                const disabled = p.value === 'marianmt' && isGpuDown;
                return (
                  <label
                    key={p.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      provider === p.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    data-testid={`provider-${p.value}`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={p.value}
                      checked={provider === p.value}
                      onChange={() => !disabled && setProvider(p.value)}
                      disabled={disabled}
                      className="text-teal-600"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800">{p.label}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        p.tier === 'free' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{p.badge}</span>
                      {disabled && (
                        <span className="ml-2 text-xs text-red-500">Temporairement indisponible</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Cost estimate */}
          {cost && (
            <div className="p-3 bg-gray-50 rounded-lg" data-testid="cost-estimate">
              <p className="text-sm text-gray-700">
                {cost.isFree ? (
                  <span className="text-green-600 font-medium">Gratuit</span>
                ) : (
                  <>Estimation : <span className="font-medium">{(cost.costCharged / 100).toFixed(2)} EUR</span> ({cost.provider.toUpperCase()})</>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{cost.charCount} caractères</p>
            </div>
          )}

          {/* Translate button */}
          <button
            onClick={handleTranslate}
            disabled={isSubmitting || isMarianmtDisabled || !langSelected}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            data-testid="translate-btn"
          >
            {isSubmitting ? 'Traduction en cours...' : cost?.isFree ? 'Traduire (gratuit)' : `Confirmer et traduire (${cost ? (cost.costCharged / 100).toFixed(2) : '...'} EUR)`}
          </button>
        </>
      )}

      {/* Manual mode — start editing */}
      {langSelected && mode === 'manual' && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Vous allez saisir votre propre traduction en <strong>{TARGET_LANGUAGES.find((l) => l.code === targetLang)?.label}</strong>.
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Le texte source sera affiché à côté pour vous aider.
            </p>
          </div>
          <button
            onClick={handleManualStart}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            data-testid="manual-translate-btn"
          >
            Commencer la traduction manuelle
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { estimateCost, checkMicroserviceHealth, requestTranslation } from '@/lib/api/translation';
import { useTranslationStore } from '@/lib/stores/translation-store';
import type { TranslationProvider, SceneSegment } from '@/types/studio';
import type { CostEstimate, MicroserviceHealth } from '@/lib/api/translation';

const SERVICE_NAME = 'TranslationSelector';

interface TranslationSelectorProps {
  segment: SceneSegment;
  onTranslationStarted?: () => void;
}

const TARGET_LANGUAGES = [
  { code: 'en', label: 'Anglais' },
  { code: 'it', label: 'Italien' },
  { code: 'de', label: 'Allemand' },
  { code: 'es', label: 'Espagnol' },
] as const;

const PROVIDERS: { value: TranslationProvider; label: string; badge: string; tier: string }[] = [
  { value: 'marianmt', label: 'Standard', badge: 'Gratuit', tier: 'free' },
  { value: 'deepl', label: 'DeepL', badge: 'Premium', tier: 'premium' },
  { value: 'openai', label: 'GPT', badge: 'Premium+', tier: 'premium' },
];

export function TranslationSelector({ segment, onTranslationStarted }: TranslationSelectorProps) {
  const [targetLang, setTargetLang] = useState('en');
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

  // Update cost estimate on provider/text change
  useEffect(() => {
    if (!segment.transcriptText) return;
    estimateCost(segment.transcriptText, provider).then((est) => {
      setCost(est);
      setCostEstimate(segment.id, est);
    });
  }, [provider, segment.transcriptText, segment.id, setCostEstimate]);

  const isGpuDown = health !== null && !health.translation;
  const isMarianmtDisabled = isGpuDown && provider === 'marianmt';
  const hasText = !!segment.transcriptText && segment.transcriptText.length > 0;

  const handleTranslate = useCallback(async () => {
    if (!segment.transcriptText || isSubmitting) return;

    setIsSubmitting(true);
    try {
      setSegmentStatus(segment.id, { status: 'processing', provider, targetLang });

      const result = await requestTranslation(
        segment.id,
        segment.transcriptText,
        segment.language,
        targetLang,
        provider,
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

  if (!hasText) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center" data-testid="translation-no-text">
        Pas de texte disponible — transcrivez ou saisissez le texte d&apos;abord.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="translation-selector">
      {/* Target language */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Langue cible</label>
        <div className="flex gap-2">
          {TARGET_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setTargetLang(lang.code)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                targetLang === lang.code
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid={`lang-${lang.code}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

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
        disabled={isSubmitting || isMarianmtDisabled}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        data-testid="translate-btn"
      >
        {isSubmitting ? 'Traduction en cours...' : cost?.isFree ? 'Traduire (gratuit)' : `Confirmer et traduire (${cost ? (cost.costCharged / 100).toFixed(2) : '...'} EUR)`}
      </button>
    </div>
  );
}

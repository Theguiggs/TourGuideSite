'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useAutoSave } from '@/hooks/use-auto-save';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import { useTranslationStore, selectSegmentTranslation } from '@/lib/stores/translation-store';
import type { SceneSegment } from '@/types/studio';

const SERVICE_NAME = 'TranslationEditor';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', it: '🇮🇹', de: '🇩🇪', es: '🇪🇸',
};

interface TranslationEditorProps {
  segment: SceneSegment;
  sessionId: string;
  onGenerateTTS?: () => void;
}

export function TranslationEditor({ segment, sessionId, onGenerateTTS }: TranslationEditorProps) {
  const translationState = useTranslationStore(selectSegmentTranslation(segment.id));
  const setSegmentStatus = useTranslationStore((s) => s.setSegmentStatus);

  const [editedText, setEditedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync edited text when translation completes
  useEffect(() => {
    if (translationState?.translatedText) {
      setEditedText(translationState.translatedText); // eslint-disable-line react-hooks/set-state-in-effect -- sync from external translation state
    }
  }, [translationState?.translatedText]);

  const handleSave = useCallback(async (text: string) => {
    logger.info(SERVICE_NAME, 'Saving translated text', { segmentId: segment.id });
    // Update store with edited text
    setSegmentStatus(segment.id, { translatedText: text });
    // Persist locally
    studioPersistenceService.saveDraft(sessionId, `${segment.sceneId}_translation_${segment.id}`, text);
  }, [segment.id, segment.sceneId, sessionId, setSegmentStatus]);

  const { isSaving, isDirty } = useAutoSave({
    data: editedText,
    onSave: handleSave,
    debounceMs: 30_000,
    inputRef: textareaRef,
    saveOnBlur: true,
    enabled: !!editedText,
  });

  const isProcessing = translationState?.status === 'processing';
  const isFailed = translationState?.status === 'failed';
  const isCompleted = translationState?.status === 'completed';
  const hasTranslation = !!editedText;

  if (isProcessing) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg animate-pulse" data-testid="translation-processing">
        <p className="text-sm text-blue-700">Traduction en cours...</p>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="translation-failed">
        <p className="text-sm text-red-700">{translationState?.error ?? 'Échec de la traduction.'}</p>
      </div>
    );
  }

  if (!hasTranslation && !isCompleted) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center" data-testid="translation-empty">
        Aucune traduction disponible — utilisez le sélecteur ci-dessus pour traduire.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="translation-editor">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source text (read-only) */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {LANG_FLAGS[segment.language] ?? ''} Texte source ({segment.language.toUpperCase()})
          </label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[200px] max-h-[400px] overflow-y-auto">
            {segment.transcriptText || 'Aucun texte source'}
          </div>
        </div>

        {/* Translated text (editable) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="translated-text" className="text-sm font-medium text-gray-700">
              {translationState?.targetLang ? `${LANG_FLAGS[translationState.targetLang] ?? ''} ` : ''}Traduction
              {translationState?.provider && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                  translationState.provider === 'marianmt'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {translationState.provider.toUpperCase()}
                </span>
              )}
            </label>
            <div className="text-xs text-gray-400">
              {isSaving && <span className="text-blue-500">Sauvegarde...</span>}
              {!isSaving && isDirty && <span>Non sauvegardé</span>}
              {!isSaving && !isDirty && editedText && <span className="text-green-500">Sauvegardé</span>}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            id="translated-text"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Le texte traduit apparaîtra ici..."
            rows={10}
            className="w-full p-3 border border-gray-200 rounded-lg text-gray-800 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400 min-h-[200px]"
            data-testid="translated-text-editor"
          />
        </div>
      </div>

      {/* Cost display */}
      {translationState?.costCharged !== null && translationState?.costCharged !== undefined && translationState.costCharged > 0 && (
        <div className="text-xs text-gray-500" data-testid="translation-cost">
          Coût : {(translationState.costCharged / 100).toFixed(2)} EUR
          {translationState.costProvider !== null && (
            <span className="text-gray-400"> (coût fournisseur : {(translationState.costProvider / 100).toFixed(2)} EUR)</span>
          )}
        </div>
      )}

      {/* Generate TTS button */}
      {hasTranslation && onGenerateTTS && (
        <button
          onClick={onGenerateTTS}
          className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors"
          data-testid="generate-tts-btn"
        >
          Générer l&apos;audio
        </button>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useAutoSave } from '@/hooks/use-auto-save';
import { updateSceneSegment, createSceneSegment } from '@/lib/api/studio';
import { useTranslationStore } from '@/lib/stores/translation-store';
import type { SceneSegment } from '@/types/studio';

const SERVICE_NAME = 'SplitEditor';

// --- Flag helpers ---

const LANG_TO_COUNTRY: Record<string, string> = {
  fr: 'fr', en: 'gb', es: 'es', de: 'de', it: 'it',
  ja: 'jp', zh: 'cn', pt: 'pt', nl: 'nl', ko: 'kr',
};

function getFlagUrl(lang: string, size: number = 24): string {
  const country = LANG_TO_COUNTRY[lang] ?? lang;
  return `https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${country}.png`;
}

// --- Props ---

export interface SplitEditorProps {
  segment: SceneSegment;
  sourceText: string;
  sourceTitle: string;
  sourceLang: string;
  targetLang: string;
  sessionId: string;
  onSaved?: (updatedSegment?: SceneSegment) => void;
  /** Called when a pending segment is created in the backend — provides the real segment with its ID */
  onSegmentCreated?: (realSegment: SceneSegment) => void;
  /** When true (default), target text is shown as plain text with an "Editer" button */
  readOnly?: boolean;
}

// --- Component ---

export function SplitEditor({
  segment,
  sourceText,
  sourceTitle,
  sourceLang,
  targetLang,
  sessionId,
  onSaved,
  onSegmentCreated,
  readOnly = true,
}: SplitEditorProps) {
  const [editedText, setEditedText] = useState(segment.transcriptText ?? '');
  const [editedTitle, setEditedTitle] = useState(segment.translatedTitle ?? '');
  const [isEditing, setIsEditing] = useState(!readOnly);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialTextRef = useRef(segment.transcriptText ?? '');
  const initialTitleRef = useRef(segment.translatedTitle ?? '');
  const hasUserEditedRef = useRef(false);

  const setSegmentStatus = useTranslationStore((s) => s.setSegmentStatus);

  // Track previous sceneId to detect pending->real transitions vs actual scene changes
  const prevSceneIdRef = useRef(segment.sceneId);

  // Sync when segment changes externally (e.g. new segment selected)
  useEffect(() => {
    const isSameScene = segment.sceneId === prevSceneIdRef.current;
    prevSceneIdRef.current = segment.sceneId;

    // If this is a pending->real transition for the same scene and user has edits, preserve them
    if (isSameScene && hasUserEditedRef.current) {
      // Update baselines to the newly created segment values without resetting user edits
      initialTextRef.current = segment.transcriptText ?? '';
      initialTitleRef.current = segment.translatedTitle ?? '';
      return;
    }

    const text = segment.transcriptText ?? '';
    const title = segment.translatedTitle ?? '';
    setEditedText(text);
    setEditedTitle(title);
    initialTextRef.current = text;
    initialTitleRef.current = title;
    hasUserEditedRef.current = false;
    setIsEditing(!readOnly ? true : false);
  }, [segment.id, segment.sceneId, segment.transcriptText, segment.translatedTitle, readOnly]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditedText(newText);

    // Mark as manually edited if the guide changed the text from the initial value
    if (newText !== initialTextRef.current) {
      hasUserEditedRef.current = true;
    }
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setEditedTitle(newTitle);

    if (newTitle !== initialTitleRef.current) {
      hasUserEditedRef.current = true;
    }
  }, []);

  // Track the real segment ID (may change if we create from a pending placeholder)
  const realSegmentIdRef = useRef<string>(segment.id);
  useEffect(() => {
    // Only update if the new ID is a real one, or if we don't have a real one yet
    if (!segment.id.startsWith('pending-') || realSegmentIdRef.current.startsWith('pending-')) {
      realSegmentIdRef.current = segment.id;
    }
  }, [segment.id]);

  const handleSave = useCallback(async (text: string) => {
    const manuallyEdited = hasUserEditedRef.current || segment.manuallyEdited;
    let segmentId = realSegmentIdRef.current;

    logger.info(SERVICE_NAME, 'Saving translated text', {
      segmentId,
      sessionId,
      manuallyEdited,
      isPending: segmentId.startsWith('pending-'),
    });

    // If segment doesn't exist in backend yet (pending placeholder), find or create it
    if (segmentId.startsWith('pending-')) {
      // First check if a segment already exists for this scene+language (avoid duplicates)
      const { listSegmentsByScene } = await import('@/lib/api/studio');
      const existing = await listSegmentsByScene(segment.sceneId);
      const existingSeg = existing.find((s) => s.language === segment.language);
      if (existingSeg) {
        // Segment already exists — use it instead of creating a duplicate
        segmentId = existingSeg.id;
        realSegmentIdRef.current = segmentId;
        logger.info(SERVICE_NAME, 'Found existing segment, updating instead of creating', { segmentId });
        const updateResult = await updateSceneSegment(segmentId, {
          transcriptText: text,
          translatedTitle: editedTitle || null,
          manuallyEdited,
        });
        if (updateResult.ok) {
          setSegmentStatus(segmentId, { translatedText: text });
          onSegmentCreated?.({ ...existingSeg, transcriptText: text, translatedTitle: editedTitle || null });
          onSaved?.();
        }
        return;
      }

      logger.info(SERVICE_NAME, 'Creating segment for pending placeholder', {
        sceneId: segment.sceneId,
        language: segment.language,
      });
      const createResult = await createSceneSegment({
        sceneId: segment.sceneId,
        segmentIndex: 0,
        language: segment.language,
        transcriptText: text,
        translatedTitle: editedTitle || undefined,
        status: 'translated',
      });
      if (createResult.ok) {
        segmentId = createResult.segment.id;
        realSegmentIdRef.current = segmentId;
        logger.info(SERVICE_NAME, 'Segment created', { newId: segmentId });
        setSegmentStatus(segmentId, { translatedText: text });
        onSegmentCreated?.(createResult.segment);
        onSaved?.();
        return;
      } else {
        logger.error(SERVICE_NAME, 'Failed to create segment', { error: createResult.error });
        return;
      }
    }

    const result = await updateSceneSegment(segmentId, {
      transcriptText: text,
      translatedTitle: editedTitle || null,
      manuallyEdited,
    });

    if (result.ok) {
      setSegmentStatus(segmentId, { translatedText: text });
      onSaved?.();
    } else {
      logger.error(SERVICE_NAME, 'Save failed', { segmentId, error: result.error });
    }
  }, [segment.id, segment.sceneId, segment.language, segment.manuallyEdited, sessionId, editedTitle, setSegmentStatus, onSaved, onSegmentCreated]);

  // Combine text + title so title-only edits also trigger auto-save
  const autoSaveData = `${editedText}\n---TITLE---\n${editedTitle}`;

  const { isSaving, isDirty } = useAutoSave({
    data: autoSaveData,
    onSave: () => handleSave(editedText),
    debounceMs: 30_000,
    inputRef: textareaRef,
    saveOnBlur: true,
    enabled: isEditing && (hasUserEditedRef.current || editedText !== initialTextRef.current || editedTitle !== initialTitleRef.current),
  });

  return (
    <div className="space-y-2" data-testid="split-editor">
      {/* Title translation row */}
      {sourceTitle && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2" data-testid="title-translation-row">
          <div>
            <label className="text-sm font-medium text-ink-80 mb-1 block">
              Titre source
            </label>
            <div
              className="px-3 py-2 bg-paper-soft border border-line rounded-lg text-sm text-ink-80"
              data-testid="source-title"
            >
              {sourceTitle}
            </div>
          </div>
          <div>
            <label
              htmlFor={`split-editor-title-${segment.id}`}
              className="text-sm font-medium text-ink-80 mb-1 block"
            >
              Titre traduit
            </label>
            {isEditing ? (
              <input
                id={`split-editor-title-${segment.id}`}
                type="text"
                value={editedTitle}
                onChange={handleTitleChange}
                placeholder="Titre traduit..."
                maxLength={200}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grenadine"
                data-testid="translated-title-input"
                onBlur={() => {
                  // Trigger save when title input loses focus (auto-save only watches textarea)
                  if (editedTitle !== initialTitleRef.current) {
                    handleSave(editedText);
                  }
                }}
              />
            ) : (
              <div
                className="px-3 py-2 bg-paper-soft border border-line rounded-lg text-sm text-ink-80"
                data-testid="translated-title-readonly"
              >
                {editedTitle || <span className="italic text-ink-40">Titre traduit...</span>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source text (read-only) */}
        <div>
          <label className="text-sm font-medium text-ink-80 flex items-center gap-2 mb-1">
            <img
              src={getFlagUrl(sourceLang)}
              alt={sourceLang.toUpperCase()}
              className="w-6 h-4 inline-block"
            />
            Texte source ({sourceLang.toUpperCase()})
          </label>
          <div
            className="p-3 bg-paper-soft border border-line rounded-lg text-sm text-ink-80 min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap"
            data-testid="source-text"
          >
            {sourceText || 'Aucun texte source'}
          </div>
        </div>

        {/* Translated text */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={`split-editor-textarea-${segment.id}`}
              className="text-sm font-medium text-ink-80 flex items-center gap-2"
            >
              <img
                src={getFlagUrl(targetLang)}
                alt={targetLang.toUpperCase()}
                className="w-6 h-4 inline-block"
              />
              Traduction ({targetLang.toUpperCase()})
            </label>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-medium text-grenadine hover:opacity-80"
                  data-testid="edit-button"
                >
                  Editer
                </button>
              )}
              {isEditing && (
                <div className="text-xs text-ink-40" data-testid="save-indicator">
                  {isSaving && <span className="text-mer">Sauvegarde...</span>}
                  {!isSaving && isDirty && <span>Non sauvegarde</span>}
                  {!isSaving && !isDirty && editedText && <span className="text-success">Sauvegarde</span>}
                </div>
              )}
            </div>
          </div>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              id={`split-editor-textarea-${segment.id}`}
              value={editedText}
              onChange={handleChange}
              placeholder="Le texte traduit apparaitra ici..."
              rows={10}
              className="w-full p-3 border border-line rounded-lg text-ink text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-grenadine min-h-[200px]"
              data-testid="translated-textarea"
            />
          ) : (
            <div
              className="p-3 bg-paper-soft border border-line rounded-lg text-sm text-ink-80 min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap"
              data-testid="translated-text-readonly"
            >
              {editedText || <span className="italic text-ink-40">Le texte traduit apparaitra ici...</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

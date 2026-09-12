'use client';

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'TourInfoTranslation';

export interface TourInfoTranslationProps {
  sessionId: string;
  language: string;
  sourceTitle: string;
  sourceDescription: string;
  translatedTitle: string;
  translatedDescription: string;
  onTitleChange?: (lang: string, title: string) => void;
  onDescriptionChange?: (lang: string, description: string) => void;
  /** Callback to request auto-translation of title + description (combined). */
  onRequestTranslation?: () => Promise<void>;
  /** Targeted auto-translation of the title only. */
  onTranslateTitle?: () => Promise<void>;
  /** Targeted auto-translation of the description only. */
  onTranslateDescription?: () => Promise<void>;
  /** When true (default), fields shown as plain text with "Editer" buttons */
  readOnly?: boolean;
}

export function TourInfoTranslation({
  sessionId,
  language,
  sourceTitle,
  sourceDescription,
  translatedTitle,
  translatedDescription,
  onTitleChange,
  onDescriptionChange,
  onRequestTranslation,
  onTranslateTitle,
  onTranslateDescription,
  readOnly = true,
}: TourInfoTranslationProps) {
  const { t } = useStudioLocale();
  const [title, setTitle] = useState(translatedTitle);
  const [description, setDescription] = useState(translatedDescription);
  const [titleSaved, setTitleSaved] = useState(false);
  const [descSaved, setDescSaved] = useState(false);
  const [titleEditing, setTitleEditing] = useState(!readOnly);
  const [descEditing, setDescEditing] = useState(!readOnly);
  const [translating, setTranslating] = useState(false);
  const [translatingTitle, setTranslatingTitle] = useState(false);
  const [translatingDesc, setTranslatingDesc] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const titleRef = useRef(translatedTitle);
  const descRef = useRef(translatedDescription);
  // Reset local state when language or translated values change from parent
  const prevLangRef = useRef(language);
  const prevTitleRef = useRef(translatedTitle);
  const prevDescRef = useRef(translatedDescription);
  if (language !== prevLangRef.current || translatedTitle !== prevTitleRef.current || translatedDescription !== prevDescRef.current) {
    prevLangRef.current = language;
    prevTitleRef.current = translatedTitle;
    prevDescRef.current = translatedDescription;
    if (translatedTitle !== titleRef.current) {
      setTitle(translatedTitle);
      titleRef.current = translatedTitle;
    }
    if (translatedDescription !== descRef.current) {
      setDescription(translatedDescription);
      descRef.current = translatedDescription;
    }
  }

  const handleManualTranslate = useCallback(async () => {
    if (!onRequestTranslation) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      await onRequestTranslation();
    } catch {
      setTranslateError(t('Échec de la traduction', 'Translation failed'));
    } finally {
      setTranslating(false);
    }
  }, [onRequestTranslation, t]);

  const handleTranslateTitle = useCallback(async () => {
    if (!onTranslateTitle) return;
    setTranslatingTitle(true);
    setTranslateError(null);
    try {
      await onTranslateTitle();
    } catch {
      setTranslateError(t('Échec de la traduction du titre', 'Title translation failed'));
    } finally {
      setTranslatingTitle(false);
    }
  }, [onTranslateTitle, t]);

  const handleTranslateDescription = useCallback(async () => {
    if (!onTranslateDescription) return;
    setTranslatingDesc(true);
    setTranslateError(null);
    try {
      await onTranslateDescription();
    } catch {
      setTranslateError(t('Échec de la traduction de la description', 'Description translation failed'));
    } finally {
      setTranslatingDesc(false);
    }
  }, [onTranslateDescription, t]);

  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed !== titleRef.current) {
      titleRef.current = trimmed;
      onTitleChange?.(language, trimmed);
      setTitleSaved(true);
      setTimeout(() => setTitleSaved(false), 2000);
      logger.info(SERVICE_NAME, 'Title saved', { sessionId, language });
    }
  }, [title, language, sessionId, onTitleChange]);

  const handleDescBlur = useCallback(() => {
    const trimmed = description.trim();
    if (trimmed !== descRef.current) {
      descRef.current = trimmed;
      onDescriptionChange?.(language, trimmed);
      setDescSaved(true);
      setTimeout(() => setDescSaved(false), 2000);
      logger.info(SERVICE_NAME, 'Description saved', { sessionId, language });
    }
  }, [description, language, sessionId, onDescriptionChange]);

  const langLabel = language.toUpperCase();

  return (
    <div
      data-testid="tour-info-translation"
      className="rounded-lg border border-line bg-card p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-ink">
          {t('Titre et description de la visite', 'Tour title and description')}
        </h3>
        {onRequestTranslation && (!translatedTitle || !translatedDescription) && (
          <button
            type="button"
            onClick={handleManualTranslate}
            disabled={translating}
            className="text-meta font-medium text-grenadine hover:opacity-80 disabled:text-ink-40 px-2 py-1 border border-grenadine-soft rounded-md hover:bg-grenadine-soft disabled:border-line"
            data-testid="translate-info-button"
          >
            {translating ? t('Traduction...', 'Translating...') : t('Traduire', 'Translate')}
          </button>
        )}
      </div>

      {translateError && (
        <p className="text-meta text-danger mb-2">{translateError}</p>
      )}

      {translating && (
        <p className="text-meta text-grenadine mb-2 animate-pulse">{t('Traduction en cours...', 'Translation in progress...')}</p>
      )}

      {/* Title: source (left) / translation (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Source title */}
        <div>
          <label className="block text-meta text-ink-40 mb-1">{t('Titre', 'Title')} (FR)</label>
          <div className="px-3 py-2 bg-paper-soft border border-line rounded-lg text-body text-ink-60" data-testid="source-title">
            {sourceTitle || <span className="italic">{t('Aucun titre', 'No title')}</span>}
          </div>
        </div>
        {/* Translated title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor={`tour-title-${language}`} className="block text-meta text-ink-60">
              {t('Titre', 'Title')} ({langLabel})
            </label>
            <div className="flex items-center gap-2">
              {onTranslateTitle && (
                <button
                  type="button"
                  onClick={handleTranslateTitle}
                  disabled={translatingTitle}
                  className="text-meta font-medium text-mer hover:opacity-80 disabled:text-ink-40"
                  data-testid="translate-title-button"
                >
                  {translatingTitle ? t('Traduction...', 'Translating...') : t('⇄ Traduire', '⇄ Translate')}
                </button>
              )}
              {!titleEditing && onTitleChange && (
                <button
                  type="button"
                  onClick={() => setTitleEditing(true)}
                  className="text-meta font-medium text-grenadine hover:opacity-80"
                  data-testid="edit-title-button"
                >
                  {t('Éditer', 'Edit')}
                </button>
              )}
            </div>
          </div>
          {titleEditing ? (
            <div className="relative">
              <input
                id={`tour-title-${language}`}
                data-testid="translated-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder={`${t('Titre traduit en', 'Title translated into')} ${langLabel}...`}
                className="w-full border border-line rounded-lg px-3 py-2 text-body text-ink focus:outline-none focus:ring-2 focus:ring-grenadine"
              />
              {titleSaved && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-meta text-success" data-testid="title-saved-indicator">
                  {t('Sauvegarde', 'Saved')}
                </span>
              )}
            </div>
          ) : (
            <div
              className="px-3 py-2 bg-paper-soft border border-line rounded-lg text-body text-ink-80"
              data-testid="translated-title-readonly"
            >
              {title || <span className="italic text-ink-40">{t('Titre traduit en', 'Title translated into')} {langLabel}...</span>}
            </div>
          )}
        </div>
      </div>

      {/* Description: source (left) / translation (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source description */}
        <div>
          <label className="block text-meta text-ink-40 mb-1">Description (FR)</label>
          <div className="px-3 py-2 bg-paper-soft border border-line rounded-lg text-body text-ink-60 min-h-[80px] whitespace-pre-wrap" data-testid="source-description">
            {sourceDescription || <span className="italic">{t('Aucune description', 'No description')}</span>}
          </div>
        </div>
        {/* Translated description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor={`tour-desc-${language}`} className="block text-meta text-ink-60">
              Description ({langLabel})
            </label>
            <div className="flex items-center gap-2">
              {onTranslateDescription && (
                <button
                  type="button"
                  onClick={handleTranslateDescription}
                  disabled={translatingDesc}
                  className="text-meta font-medium text-mer hover:opacity-80 disabled:text-ink-40"
                  data-testid="translate-description-button"
                >
                  {translatingDesc ? t('Traduction...', 'Translating...') : t('⇄ Traduire', '⇄ Translate')}
                </button>
              )}
              {!descEditing && onDescriptionChange && (
                <button
                  type="button"
                  onClick={() => setDescEditing(true)}
                  className="text-meta font-medium text-grenadine hover:opacity-80"
                  data-testid="edit-description-button"
                >
                  {t('Éditer', 'Edit')}
                </button>
              )}
            </div>
          </div>
          {descEditing ? (
            <div className="relative">
              <textarea
                id={`tour-desc-${language}`}
                data-testid="translated-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                placeholder={`${t('Description traduite en', 'Description translated into')} ${langLabel}...`}
                rows={3}
                className="w-full border border-line rounded-lg px-3 py-2 text-body text-ink focus:outline-none focus:ring-2 focus:ring-grenadine resize-y min-h-[80px]"
              />
              {descSaved && (
                <span className="absolute right-2 bottom-2 text-meta text-success" data-testid="desc-saved-indicator">
                  {t('Sauvegarde', 'Saved')}
                </span>
              )}
            </div>
          ) : (
            <div
              className="px-3 py-2 bg-paper-soft border border-line rounded-lg text-body text-ink-80 min-h-[80px] whitespace-pre-wrap"
              data-testid="translated-description-readonly"
            >
              {description || <span className="italic text-ink-40">{t('Description traduite en', 'Description translated into')} {langLabel}...</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

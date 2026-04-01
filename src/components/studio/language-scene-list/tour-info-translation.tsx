'use client';

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TourInfoTranslation';

export interface TourInfoTranslationProps {
  sessionId: string;
  language: string;
  sourceTitle: string;
  sourceDescription: string;
  translatedTitle: string;
  translatedDescription: string;
  onTitleChange: (lang: string, title: string) => void;
  onDescriptionChange: (lang: string, description: string) => void;
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
  readOnly = true,
}: TourInfoTranslationProps) {
  const [title, setTitle] = useState(translatedTitle);
  const [description, setDescription] = useState(translatedDescription);
  const [titleSaved, setTitleSaved] = useState(false);
  const [descSaved, setDescSaved] = useState(false);
  const [titleEditing, setTitleEditing] = useState(!readOnly);
  const [descEditing, setDescEditing] = useState(!readOnly);
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

  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed !== titleRef.current) {
      titleRef.current = trimmed;
      onTitleChange(language, trimmed);
      setTitleSaved(true);
      setTimeout(() => setTitleSaved(false), 2000);
      logger.info(SERVICE_NAME, 'Title saved', { sessionId, language });
    }
  }, [title, language, sessionId, onTitleChange]);

  const handleDescBlur = useCallback(() => {
    const trimmed = description.trim();
    if (trimmed !== descRef.current) {
      descRef.current = trimmed;
      onDescriptionChange(language, trimmed);
      setDescSaved(true);
      setTimeout(() => setDescSaved(false), 2000);
      logger.info(SERVICE_NAME, 'Description saved', { sessionId, language });
    }
  }, [description, language, sessionId, onDescriptionChange]);

  return (
    <div
      data-testid="tour-info-translation"
      className="rounded-lg border border-gray-200 bg-white p-4 mb-4"
    >
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Titre et description de la visite
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor={`tour-title-${language}`} className="block text-xs text-gray-500">
              Titre de la visite
            </label>
            {!titleEditing && (
              <button
                type="button"
                onClick={() => setTitleEditing(true)}
                className="text-xs font-medium text-teal-600 hover:text-teal-700"
                data-testid="edit-title-button"
              >
                Editer
              </button>
            )}
          </div>
          {sourceTitle && (
            <p className="text-xs text-gray-400 italic mb-1 truncate" data-testid="source-title">
              {sourceTitle}
            </p>
          )}
          {titleEditing ? (
            <div className="relative">
              <input
                id={`tour-title-${language}`}
                data-testid="translated-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder={sourceTitle || 'Titre traduit...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {titleSaved && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600" data-testid="title-saved-indicator">
                  Sauvegarde
                </span>
              )}
            </div>
          ) : (
            <div
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
              data-testid="translated-title-readonly"
            >
              {title || <span className="italic text-gray-400">{sourceTitle || 'Titre traduit...'}</span>}
            </div>
          )}
        </div>

        {/* Description field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor={`tour-desc-${language}`} className="block text-xs text-gray-500">
              Description
            </label>
            {!descEditing && (
              <button
                type="button"
                onClick={() => setDescEditing(true)}
                className="text-xs font-medium text-teal-600 hover:text-teal-700"
                data-testid="edit-description-button"
              >
                Editer
              </button>
            )}
          </div>
          {sourceDescription && (
            <p className="text-xs text-gray-400 italic mb-1 line-clamp-2" data-testid="source-description">
              {sourceDescription}
            </p>
          )}
          {descEditing ? (
            <div className="relative">
              <textarea
                id={`tour-desc-${language}`}
                data-testid="translated-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                placeholder={sourceDescription || 'Description traduite...'}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
              />
              {descSaved && (
                <span className="absolute right-2 bottom-2 text-xs text-green-600" data-testid="desc-saved-indicator">
                  Sauvegarde
                </span>
              )}
            </div>
          ) : (
            <div
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[60px] whitespace-pre-wrap"
              data-testid="translated-description-readonly"
            >
              {description || <span className="italic text-gray-400">{sourceDescription || 'Description traduite...'}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

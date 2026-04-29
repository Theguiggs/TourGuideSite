'use client';

import { useCallback } from 'react';
import { TOUR_LANGUAGES, TOUR_THEMES } from '@/types/studio';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  DURATION_MAX,
  DURATION_MIN,
  TITLE_MAX,
  TITLE_MIN,
  type TourMetadataDraft,
} from '../lib/validation';

interface GlobalMetadataPanelProps {
  value: TourMetadataDraft;
  onChange: (patch: Partial<TourMetadataDraft>) => void;
}

/**
 * Global tour metadata editor (GCI-4.2) — a simple controlled form.
 * Parent owns state and debounced persistence; this panel only emits patches.
 */
export function GlobalMetadataPanel({ value, onChange }: GlobalMetadataPanelProps) {
  const handleTitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange({ title: e.target.value }),
    [onChange],
  );
  const handleDescription = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      onChange({ description: e.target.value }),
    [onChange],
  );
  const handleLanguage = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onChange({ language: e.target.value }),
    [onChange],
  );
  const handleDuration = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '') {
        onChange({ durationMinutes: null });
        return;
      }
      const n = Number(raw);
      // Reject NaN/non-finite (e.g. after removing native type=number attr) and
      // floor non-integers so we never persist fractional minutes.
      if (!Number.isFinite(n)) {
        onChange({ durationMinutes: null });
        return;
      }
      onChange({ durationMinutes: Math.floor(n) });
    },
    [onChange],
  );

  const toggleTheme = useCallback(
    (theme: string) => {
      const next = value.themes.includes(theme)
        ? value.themes.filter((t) => t !== theme)
        : [...value.themes, theme];
      onChange({ themes: next });
    },
    [value.themes, onChange],
  );

  const titleLen = value.title.trim().length;
  const descLen = value.description.trim().length;

  return (
    <div className="space-y-4" data-testid="global-metadata-panel">
      <div>
        <h3 className="text-sm font-semibold text-ink">Métadonnées globales</h3>
        <p className="text-xs text-ink-60">
          Ces informations décrivent le parcours complet avant passage en édition.
        </p>
      </div>

      <div>
        <label
          className="block text-xs font-medium text-ink-60 mb-1"
          htmlFor="metadata-title"
        >
          Titre <span className="text-danger">*</span>
        </label>
        <input
          id="metadata-title"
          type="text"
          value={value.title}
          onChange={handleTitle}
          data-testid="metadata-title-input"
          maxLength={TITLE_MAX + 20}
          placeholder="Titre du parcours"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-grenadine focus:ring-1 focus:ring-grenadine"
        />
        <p className="text-[11px] text-ink-40 mt-1">
          {titleLen}/{TITLE_MAX} — min {TITLE_MIN}
        </p>
      </div>

      <div>
        <label
          className="block text-xs font-medium text-ink-60 mb-1"
          htmlFor="metadata-description"
        >
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          id="metadata-description"
          value={value.description}
          onChange={handleDescription}
          data-testid="metadata-description-input"
          rows={5}
          maxLength={DESCRIPTION_MAX + 50}
          placeholder="Décrivez le parcours, son ambiance, ses points forts..."
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-grenadine focus:ring-1 focus:ring-grenadine"
        />
        <p className="text-[11px] text-ink-40 mt-1">
          {descLen}/{DESCRIPTION_MAX} — min {DESCRIPTION_MIN}
        </p>
      </div>

      <div>
        <span className="block text-xs font-medium text-ink-60 mb-2">
          Thèmes <span className="text-danger">*</span>
        </span>
        <div className="flex flex-wrap gap-2" data-testid="metadata-themes">
          {TOUR_THEMES.map((theme) => {
            const active = value.themes.includes(theme);
            return (
              <button
                key={theme}
                type="button"
                onClick={() => toggleTheme(theme)}
                data-testid={`metadata-theme-${theme}`}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-full border text-xs transition ${
                  active
                    ? 'bg-grenadine border-grenadine text-white'
                    : 'bg-white border-line text-ink-80 hover:border-grenadine'
                }`}
              >
                {theme}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-medium text-ink-60 mb-1"
            htmlFor="metadata-language"
          >
            Langue
          </label>
          <select
            id="metadata-language"
            value={value.language}
            onChange={handleLanguage}
            data-testid="metadata-language-select"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-grenadine focus:ring-1 focus:ring-grenadine"
          >
            {TOUR_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block text-xs font-medium text-ink-60 mb-1"
            htmlFor="metadata-duration"
          >
            Durée (min)
          </label>
          <input
            id="metadata-duration"
            type="number"
            min={DURATION_MIN}
            max={DURATION_MAX}
            value={value.durationMinutes ?? ''}
            onChange={handleDuration}
            data-testid="metadata-duration-input"
            placeholder={`${DURATION_MIN}-${DURATION_MAX}`}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-grenadine focus:ring-1 focus:ring-grenadine"
          />
        </div>
      </div>
    </div>
  );
}

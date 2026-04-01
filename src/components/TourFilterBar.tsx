'use client';

import { useCallback } from 'react';
import type { TourFilters } from '@/lib/filter-utils';
import {
  AVAILABLE_LANGUES,
  AVAILABLE_THEMES,
  getActiveFilterCount,
} from '@/lib/filter-utils';
import { trackEvent, FilterAnalyticsEvents } from '@/lib/analytics';

interface TourFilterBarProps {
  filters: TourFilters;
  onChange: (filters: TourFilters) => void;
  showStatusFilter?: boolean;
  cities?: string[];
}

const STATUS_OPTIONS = [
  { value: 'review', label: 'En revue' },
  { value: 'revision_requested', label: 'R\u00e9vision demand\u00e9e' },
  { value: 'published', label: 'Publi\u00e9' },
  { value: 'rejected', label: 'Rejet\u00e9' },
];

export default function TourFilterBar({ filters, onChange, showStatusFilter, cities = [] }: TourFilterBarProps) {
  const activeCount = getActiveFilterCount(filters);

  const fireAnalytics = useCallback((filterType: string, value: string) => {
    trackEvent(FilterAnalyticsEvents.CATALOGUE_FILTER_APPLIED, { filter_type: filterType, value });
  }, []);

  const toggleLangue = (code: string) => {
    const next = filters.langues.includes(code)
      ? filters.langues.filter((l) => l !== code)
      : [...filters.langues, code];
    onChange({ ...filters, langues: next });
    fireAnalytics('langue', code);
  };

  const toggleTheme = (theme: string) => {
    const next = filters.themes.includes(theme)
      ? filters.themes.filter((t) => t !== theme)
      : [...filters.themes, theme];
    onChange({ ...filters, themes: next });
    fireAnalytics('theme', theme);
  };

  const handleReset = () => {
    onChange({ langues: [], dureeMin: 0, dureeMax: 180, ville: '', themes: [], status: undefined });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Filtres</span>
          {activeCount > 0 && (
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={handleReset} className="text-xs text-red-600 hover:underline">
            Réinitialiser
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Langue chips */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Langue</p>
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_LANGUES.map((l) => (
              <button
                key={l.code}
                onClick={() => toggleLangue(l.code)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.langues.includes(l.code)
                    ? 'bg-teal-100 text-teal-700 border border-teal-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {l.flag}
              </button>
            ))}
          </div>
        </div>

        {/* Duration range */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Durée</p>
          <div className="flex items-center gap-1">
            <select
              value={filters.dureeMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ ...filters, dureeMin: v });
                fireAnalytics('duree_min', String(v));
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
            >
              <option value={0}>Min</option>
              {[15, 30, 45, 60, 90, 120].map((v) => (
                <option key={v} value={v}>{v} min</option>
              ))}
            </select>
            <span className="text-gray-400 text-xs">—</span>
            <select
              value={filters.dureeMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ ...filters, dureeMax: v });
                fireAnalytics('duree_max', String(v));
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
            >
              {[30, 45, 60, 90, 120, 150, 180].map((v) => (
                <option key={v} value={v}>{v} min</option>
              ))}
              <option value={180}>Max</option>
            </select>
          </div>
        </div>

        {/* City */}
        {cities.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Ville</p>
            <select
              value={filters.ville}
              onChange={(e) => {
                onChange({ ...filters, ville: e.target.value });
                fireAnalytics('ville', e.target.value);
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
            >
              <option value="">Toutes</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Themes */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Thèmes</p>
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_THEMES.map((theme) => (
              <button
                key={theme}
                onClick={() => toggleTheme(theme)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.themes.includes(theme)
                    ? 'bg-teal-100 text-teal-700 border border-teal-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Status (admin only) */}
        {showStatusFilter && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Statut</p>
            <select
              value={filters.status ?? ''}
              onChange={(e) => {
                onChange({ ...filters, status: e.target.value || undefined });
                fireAnalytics('status', e.target.value);
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
            >
              <option value="">Tous</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

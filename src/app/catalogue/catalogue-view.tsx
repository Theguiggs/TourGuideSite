'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Tour } from '@/types/tour';
import { TourCardCompact } from '@/components/catalogue/tour-card-compact';

const CatalogueMap = dynamic(
  () => import('@/components/catalogue/catalogue-map').then((m) => ({ default: m.CatalogueMap })),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" /> },
);

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪',
};
const LANG_NAMES: Record<string, string> = {
  fr: 'Français', en: 'English', es: 'Español', it: 'Italiano', de: 'Deutsch',
};

interface CatalogueViewProps {
  tours: Tour[];
}

export function CatalogueView({ tours }: CatalogueViewProps) {
  const [filterLang, setFilterLang] = useState<string>('');
  const [visibleTourIds, setVisibleTourIds] = useState<string[]>(tours.map((t) => t.id));
  const [hoveredTourId, setHoveredTourId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true); // mobile toggle

  // All available languages
  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const tour of tours) {
      for (const lang of tour.availableLanguages ?? []) {
        langs.add(lang);
      }
    }
    return Array.from(langs).sort();
  }, [tours]);

  // Filter by language
  const langFilteredTours = useMemo(() => {
    if (!filterLang) return tours;
    return tours.filter((t) => t.availableLanguages?.includes(filterLang));
  }, [tours, filterLang]);

  // Filter by map bounds
  const displayedTours = useMemo(() => {
    return langFilteredTours.filter((t) => visibleTourIds.includes(t.id));
  }, [langFilteredTours, visibleTourIds]);

  const handleBoundsChange = useCallback((ids: string[]) => {
    setVisibleTourIds(ids);
  }, []);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar: title + language filter + mobile toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-gray-900 mr-2">Catalogue</h1>

        {/* Language filter */}
        {allLanguages.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterLang('')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                !filterLang ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Toutes ({langFilteredTours.length})
            </button>
            {allLanguages.map((lang) => {
              const count = tours.filter((t) => t.availableLanguages?.includes(lang)).length;
              return (
                <button
                  key={lang}
                  onClick={() => setFilterLang(filterLang === lang ? '' : lang)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterLang === lang ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {LANG_FLAGS[lang] ?? ''} {LANG_NAMES[lang] ?? lang.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile toggle */}
        <div className="ml-auto flex gap-1 lg:hidden">
          <button
            onClick={() => setShowMap(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${showMap ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            🗺️ Carte
          </button>
          <button
            onClick={() => setShowMap(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!showMap ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            📋 Liste
          </button>
        </div>

        <span className="text-xs text-gray-400 ml-auto hidden lg:inline">
          {displayedTours.length} visite{displayedTours.length !== 1 ? 's' : ''} visible{displayedTours.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map — 70% on desktop, full on mobile when toggled */}
        <div className={`${showMap ? 'block' : 'hidden'} lg:block lg:w-[65%] xl:w-[70%] h-full`}>
          <CatalogueMap
            tours={langFilteredTours}
            highlightedTourId={hoveredTourId}
            onBoundsChange={handleBoundsChange}
            onTourHover={setHoveredTourId}
          />
        </div>

        {/* Tour list — 30% on desktop, full on mobile when toggled */}
        <div className={`${!showMap ? 'block' : 'hidden'} lg:block lg:w-[35%] xl:w-[30%] h-full overflow-y-auto border-l border-gray-200 bg-gray-50`}>
          <div className="p-3 space-y-2">
            {displayedTours.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">Aucune visite dans cette zone.</p>
                <p className="text-xs mt-1">Dézoomez ou changez de filtre.</p>
              </div>
            ) : (
              displayedTours.map((tour) => (
                <TourCardCompact
                  key={tour.id}
                  tour={tour}
                  isHighlighted={tour.id === hoveredTourId}
                  onHover={setHoveredTourId}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

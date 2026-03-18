'use client';

import { useMemo, useEffect, useCallback } from 'react';
import type { MapPOI } from './TourMap';
import { totalRouteDistance, estimatedWalkingTime } from '@/lib/geo';
import dynamic from 'next/dynamic';

const TourMap = dynamic(() => import('./TourMap'), { ssr: false });

interface TourPreviewModalProps {
  pois: MapPOI[];
  tourTitle: string;
  onClose: () => void;
}

export default function TourPreviewModal({ pois, tourTitle, onClose }: TourPreviewModalProps) {
  const sortedPois = useMemo(() => [...pois].sort((a, b) => a.order - b.order), [pois]);
  const distance = useMemo(() => totalRouteDistance(sortedPois), [sortedPois]);
  const walkTime = useMemo(() => estimatedWalkingTime(distance), [distance]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Previsualisation du parcours</h2>
            <p className="text-sm text-gray-500">{tourTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-sm text-gray-600">
              <span className="bg-gray-100 px-3 py-1 rounded-full">{distance} km</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full">~{walkTime} min</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full">{sortedPois.length} POIs</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Fermer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0">
          <TourMap
            pois={sortedPois}
            selectedPoiId={null}
            onPoiSelect={() => {}}
            className="h-full rounded-none"
          />
        </div>

        {/* POI list */}
        <div className="border-t border-gray-200 p-4 max-h-[200px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Points d&apos;interet</h3>
          <ol className="space-y-1">
            {sortedPois.map((poi) => (
              <li key={poi.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {poi.order}
                </span>
                <span className="text-gray-900">{poi.title}</span>
                <span className="text-gray-400 text-xs ml-auto">
                  {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

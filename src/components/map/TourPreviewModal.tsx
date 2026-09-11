'use client';

import { useMemo } from 'react';
import type { MapPOI } from './TourMap';
import { Dialog } from '@/components/ui/Dialog';
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

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="tour-preview-title"
      className="max-w-4xl max-h-[90vh] rounded-2xl bg-card backdrop:bg-black/60"
    >
      <div className="flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div>
            <h2 id="tour-preview-title" className="text-h6 font-bold text-ink">Prévisualisation de l’itinéraire</h2>
            <p className="text-body text-ink-60">{tourTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-body text-ink-60">
              <span className="bg-paper-soft px-3 py-1 rounded-pill">{distance} km</span>
              <span className="bg-paper-soft px-3 py-1 rounded-pill">~{walkTime} min</span>
              <span className="bg-paper-soft px-3 py-1 rounded-pill">{sortedPois.length} POIs</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center text-ink-60 hover:text-ink text-h5 leading-none"
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
        <div className="border-t border-line p-4 max-h-[200px] overflow-y-auto">
          <h3 className="text-body font-semibold text-ink-60 uppercase mb-2">Points d&apos;intérêt</h3>
          <ol className="space-y-1">
            {sortedPois.map((poi) => (
              <li key={poi.id} className="flex items-center gap-2 text-body">
                <span className="w-5 h-5 bg-mer-soft text-mer rounded-pill flex items-center justify-center text-meta font-bold flex-shrink-0">
                  {poi.order}
                </span>
                <span className="text-ink">{poi.title}</span>
                <span className="text-ink-60 text-meta ml-auto">
                  {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Dialog>
  );
}

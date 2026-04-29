'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { WalkSegment } from '@/types/studio';

const WalkMap = dynamic(() => import('./WalkMap').then((m) => m.WalkMap), {
  ssr: false,
  loading: () => (
    <div
      className="bg-paper-soft rounded-lg h-48 flex items-center justify-center text-sm text-ink-40"
      data-testid="walk-map-loading"
    >
      Chargement de la carte...
    </div>
  ),
});

interface WalkCleanupPanelProps {
  walk: WalkSegment;
  onKeep: (walkId: string) => void;
  onDelete: (walkId: string) => void;
}

interface ParsedPoint { lat: number; lng: number }

function parseTrack(json: string | null): ParsedPoint[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as Array<Record<string, unknown>>;
    const points: ParsedPoint[] = [];
    for (const raw of parsed) {
      const lat = typeof raw.lat === 'number' ? raw.lat : Number(raw.lat);
      const lng = typeof raw.lng === 'number' ? raw.lng : Number(raw.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        points.push({ lat, lng });
      }
    }
    return points;
  } catch {
    return [];
  }
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return '0s';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatDistance(m: number | null): string {
  if (!m || m <= 0) return '0 m';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

export function WalkCleanupPanel({ walk, onKeep, onDelete }: WalkCleanupPanelProps) {
  const points = useMemo(() => parseTrack(walk.gpsTrackJson), [walk.gpsTrackJson]);

  return (
    <div className="space-y-4" data-testid="walk-cleanup-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Segment de marche #{walk.order}</h3>
        {walk.deleted && (
          <span
            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-grenadine-soft text-danger"
            data-testid="walk-deleted-badge"
          >
            Supprimé
          </span>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border border-line" data-testid="walk-map-wrapper">
        <WalkMap points={points} />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm" data-testid="walk-stats">
        <div className="bg-paper-soft rounded-lg p-2">
          <dt className="text-xs text-ink-60">Durée</dt>
          <dd className="font-medium text-ink" data-testid="walk-stat-duration">{formatDuration(walk.durationMs)}</dd>
        </div>
        <div className="bg-paper-soft rounded-lg p-2">
          <dt className="text-xs text-ink-60">Distance</dt>
          <dd className="font-medium text-ink" data-testid="walk-stat-distance">{formatDistance(walk.distanceM)}</dd>
        </div>
        <div className="bg-paper-soft rounded-lg p-2">
          <dt className="text-xs text-ink-60">Photos</dt>
          <dd className="font-medium text-ink" data-testid="walk-stat-photos">{walk.photoRefs.length}</dd>
        </div>
        <div className="bg-paper-soft rounded-lg p-2">
          <dt className="text-xs text-ink-60">Audios</dt>
          <dd className="font-medium text-ink" data-testid="walk-stat-audios">{walk.audioRefs.length}</dd>
        </div>
      </dl>

      {(walk.photoRefs.length > 0 || walk.audioRefs.length > 0) && (
        <div>
          <p className="text-xs font-medium text-ink-60 mb-1">Médias</p>
          <ul className="text-xs text-ink-80 space-y-0.5" data-testid="walk-media-list">
            {walk.photoRefs.map((ref) => (
              <li key={`p-${ref}`}>Photo: {ref.split('/').pop()}</li>
            ))}
            {walk.audioRefs.map((ref) => (
              <li key={`a-${ref}`}>Audio: {ref.split('/').pop()}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-line">
        <button
          type="button"
          onClick={() => onKeep(walk.id)}
          data-testid="walk-keep-btn"
          className="flex-1 bg-grenadine hover:opacity-90 text-white text-sm font-medium py-2 rounded-lg"
        >
          Garder
        </button>
        <button
          type="button"
          onClick={() => onDelete(walk.id)}
          data-testid="walk-delete-btn"
          className="flex-1 bg-grenadine-soft hover:opacity-90 text-danger text-sm font-medium py-2 rounded-lg"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

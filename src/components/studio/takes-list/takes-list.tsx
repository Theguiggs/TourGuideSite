'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useRecordingStore } from '@/lib/stores/recording-store';
import type { Take } from '@/lib/stores/recording-store';
import { audioPlayerService } from '@/lib/studio/audio-player-service';

interface TakesListProps {
  sceneId: string;
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

const EMPTY_TAKES: Take[] = [];

export function TakesList({ sceneId }: TakesListProps) {
  const takes = useRecordingStore((s) => s.takes[sceneId] ?? EMPTY_TAKES);
  const selectedTakeId = useRecordingStore((s) => s.selectedTakeId[sceneId]);
  const selectTake = useRecordingStore((s) => s.selectTake);
  const deleteTake = useRecordingStore((s) => s.deleteTake);

  const currentUrlRef = useRef<string | null>(null);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  const handlePlay = useCallback((take: Take) => {
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    const url = URL.createObjectURL(take.blob);
    currentUrlRef.current = url;
    audioPlayerService.play(url);
  }, []);

  if (takes.length === 0) return null;

  return (
    <div className="mt-3" data-testid="takes-list">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Prises ({takes.length})
      </h4>
      <div className="space-y-1">
        {takes.map((take, index) => {
          const isSelected = take.id === selectedTakeId;
          return (
            <div
              key={take.id}
              className={`flex items-center gap-2 p-2 rounded text-sm ${
                isSelected ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-gray-100'
              }`}
              data-testid={`take-${take.id}`}
            >
              <span className="text-gray-500 w-6 text-center">{index + 1}</span>
              <span className="flex-1 text-gray-700">{formatDuration(take.durationMs)}</span>

              <button
                onClick={() => handlePlay(take)}
                className="text-teal-600 hover:text-teal-700 text-xs font-medium"
                data-testid={`play-take-${take.id}`}
              >
                ▶ Écouter
              </button>

              {!isSelected && (
                <button
                  onClick={() => selectTake(sceneId, take.id)}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  data-testid={`select-take-${take.id}`}
                >
                  Sélectionner
                </button>
              )}

              {isSelected && (
                <span className="text-xs text-teal-600 font-medium">✓ Sélectionnée</span>
              )}

              {takes.length > 1 && (
                <button
                  onClick={() => deleteTake(sceneId, take.id)}
                  className="text-gray-400 hover:text-red-500 text-xs"
                  aria-label={`Supprimer prise ${index + 1}`}
                  data-testid={`delete-take-${take.id}`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

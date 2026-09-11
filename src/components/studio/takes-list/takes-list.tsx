'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useRecordingStore } from '@/lib/stores/recording-store';
import type { Take, TakeSyncState } from '@/lib/stores/recording-store';
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

/**
 * Mention d'état par prise. `synced` est le seul état où le son existe ailleurs
 * que dans cet onglet ; les trois autres doivent se voir.
 */
const SYNC_LABEL: Record<TakeSyncState, { text: string; className: string }> = {
  pending: { text: 'Non sauvegardée', className: 'text-ocre' },
  uploading: { text: 'Sauvegarde…', className: 'text-mer' },
  synced: { text: 'Sauvegardée', className: 'text-success' },
  error: { text: 'Échec de sauvegarde', className: 'text-danger' },
};

const EMPTY_TAKES: Take[] = [];

export function TakesList({ sceneId }: TakesListProps) {
  const takes = useRecordingStore((s) => s.takes[sceneId] ?? EMPTY_TAKES);
  const selectedTakeId = useRecordingStore((s) => s.selectedTakeId[sceneId]);
  const selectTake = useRecordingStore((s) => s.selectTake);
  const deleteTake = useRecordingStore((s) => s.deleteTake);

  // Suppression en deux temps : une prise de plusieurs minutes disparaissait
  // d'un seul clic sur une croix, sans confirmation ni retour possible.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
      <h4 className="text-xs font-semibold text-ink-40 uppercase tracking-wider mb-2">
        Prises ({takes.length})
      </h4>
      <div className="space-y-1">
        {takes.map((take, index) => {
          const isSelected = take.id === selectedTakeId;
          return (
            <div
              key={take.id}
              className={`flex items-center gap-2 p-2 rounded text-sm ${
                isSelected ? 'bg-grenadine-soft border border-grenadine-soft' : 'bg-paper-soft border border-line'
              }`}
              data-testid={`take-${take.id}`}
            >
              <span className="text-ink-60 w-6 text-center">{index + 1}</span>
              <span className="text-ink-80">{formatDuration(take.durationMs)}</span>

              <span
                className={`flex-1 text-xs ${SYNC_LABEL[take.syncState].className}`}
                data-testid={`take-sync-${take.id}`}
              >
                {SYNC_LABEL[take.syncState].text}
              </span>

              <button
                onClick={() => handlePlay(take)}
                className="text-grenadine hover:opacity-80 text-xs font-medium"
                data-testid={`play-take-${take.id}`}
              >
                ▶ Écouter
              </button>

              {!isSelected && (
                <button
                  onClick={() => selectTake(sceneId, take.id)}
                  className="text-mer hover:opacity-80 text-xs font-medium"
                  data-testid={`select-take-${take.id}`}
                >
                  Sélectionner
                </button>
              )}

              {isSelected && (
                <span className="text-xs text-grenadine font-medium">✓ Sélectionnée</span>
              )}

              {takes.length > 1 && confirmingId !== take.id && (
                <button
                  onClick={() => setConfirmingId(take.id)}
                  className="text-ink-40 hover:text-danger text-xs"
                  aria-label={`Supprimer prise ${index + 1}`}
                  data-testid={`delete-take-${take.id}`}
                >
                  ✕
                </button>
              )}

              {confirmingId === take.id && (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-ink-80">Supprimer&nbsp;?</span>
                  <button
                    onClick={() => {
                      deleteTake(sceneId, take.id);
                      setConfirmingId(null);
                    }}
                    className="text-danger font-medium hover:opacity-80"
                    data-testid={`confirm-delete-take-${take.id}`}
                  >
                    Oui
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="text-ink-60 hover:opacity-80"
                    data-testid={`cancel-delete-take-${take.id}`}
                  >
                    Annuler
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

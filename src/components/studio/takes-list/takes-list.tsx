'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRecordingStore } from '@/lib/stores/recording-store';
import type { Take } from '@/lib/stores/recording-store';
import { audioPlayerService, type AudioPlayerState } from '@/lib/studio/audio-player-service';

interface TakesListProps {
  sceneId: string;
  savedTakeId?: string | null;
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

function TakePreview({ take, index }: { take: Take; index: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<AudioPlayerState>(() => audioPlayerService.getState());
  const isPlaying = playerState.currentUrl === url && playerState.isPlaying;

  useEffect(() => {
    const unsubscribe = audioPlayerService.subscribe(setPlayerState);
    return () => {
      unsubscribe();
      if (url) {
        if (audioPlayerService.getState().currentUrl === url) audioPlayerService.stop();
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      audioPlayerService.pause();
      return;
    }
    const playableUrl = url ?? URL.createObjectURL(take.blob);
    if (!url) setUrl(playableUrl);
    void audioPlayerService.play(playableUrl);
  }, [isPlaying, take.blob, url]);

  return (
    <button
      type="button"
      onClick={togglePlayback}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-pill border border-grenadine px-4 py-2 text-body font-semibold text-grenadine transition hover:bg-grenadine-soft"
      aria-label={`${isPlaying ? 'Mettre en pause' : 'Écouter'} la prise ${index + 1}`}
      data-testid={`play-take-${take.id}`}
    >
      <span aria-hidden="true">{isPlaying ? '⏸' : '▶'}</span>
      {isPlaying ? 'Pause' : 'Écouter'}
    </button>
  );
}

const EMPTY_TAKES: Take[] = [];

export function TakesList({ sceneId, savedTakeId = null }: TakesListProps) {
  const takes = useRecordingStore((s) => s.takes[sceneId] ?? EMPTY_TAKES);
  const selectedTakeId = useRecordingStore((s) => s.selectedTakeId[sceneId]);
  const selectTake = useRecordingStore((s) => s.selectTake);
  const deleteTake = useRecordingStore((s) => s.deleteTake);

  if (takes.length === 0) return null;

  return (
    <section className="rounded-xl border border-line bg-paper p-4" data-testid="takes-list" aria-labelledby="takes-title">
      <div className="mb-4">
        <h3 id="takes-title" className="text-body-lg font-semibold text-ink">
          Vos prises audio ({takes.length})
        </h3>
        <p className="mt-1 text-body text-ink-60">
          Écoutez vos essais, puis choisissez la prise à enregistrer pour cette scène.
        </p>
      </div>

      <div className="space-y-3">
        {takes.map((take, index) => {
          const isSelected = take.id === selectedTakeId;
          const isSaved = take.id === savedTakeId;
          return (
            <div
              key={take.id}
              className={`rounded-lg border p-3 transition ${
                isSelected ? 'border-grenadine bg-grenadine-soft' : 'border-line bg-paper-soft'
              }`}
              data-testid={`take-${take.id}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name={`selected-take-${sceneId}`}
                    checked={isSelected}
                    onChange={() => selectTake(sceneId, take.id)}
                    className="h-5 w-5 shrink-0 accent-grenadine"
                    data-testid={`select-take-${take.id}`}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">Prise {index + 1}</span>
                    <span className="block text-body text-ink-60">Durée : {formatDuration(take.durationMs)}</span>
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <TakePreview take={take} index={index} />
                  {isSaved && (
                    <span className="rounded-pill bg-mer-soft px-3 py-1.5 text-meta font-semibold text-mer" data-testid={`saved-take-${take.id}`}>
                      ✓ Audio de la scène
                    </span>
                  )}
                  {takes.length > 1 && !isSaved && (
                    <button
                      type="button"
                      onClick={() => deleteTake(sceneId, take.id)}
                      className="min-h-10 rounded-pill px-3 py-2 text-body font-medium text-ink-60 underline hover:text-danger"
                      aria-label={`Supprimer la prise ${index + 1}`}
                      data-testid={`delete-take-${take.id}`}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

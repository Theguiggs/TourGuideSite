'use client';

/**
 * Porte automatiquement vers le backend la prise RETENUE de la scène courante.
 *
 * Le déclencheur est le choix du guide, pas l'acte d'enregistrer : c'est la
 * prise sélectionnée qui devient l'audio de la Scène. Enregistrer trois prises
 * et n'en garder qu'une ne téléverse donc qu'un objet, et changer d'avis
 * (« Sélectionner » sur une autre prise) porte la nouvelle sans qu'aucun bouton
 * « Enregistrer » supplémentaire n'existe.
 *
 * Deux protections contre les doubles envois :
 *  - `inFlightRef` : un même identifiant de prise n'est jamais téléversé deux
 *    fois en parallèle, y compris sous le double montage du StrictMode React ;
 *  - l'état `syncState` de la prise : seule une prise `pending` est prise en
 *    charge automatiquement. Une prise en `error` attend une reprise explicite.
 */

import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { persistTake } from '@/lib/studio/take-persistence';
import { useRecordingStore } from '@/lib/stores/recording-store';

const SERVICE_NAME = 'useTakePersistence';

interface UseTakePersistenceOptions {
  sessionId: string;
  /** Scène affichée, ou `null` tant qu'aucune n'est choisie. */
  sceneId: string | null;
  sceneIndex: number;
  /** Langue de la narration de base (celle de la session). */
  language: string;
  /** Appelé après une persistance réussie, pour rafraîchir la Scène affichée. */
  onPersisted?: (sceneId: string, s3Key: string) => void;
}

export function useTakePersistence({
  sessionId,
  sceneId,
  sceneIndex,
  language,
  onPersisted,
}: UseTakePersistenceOptions) {
  const takes = useRecordingStore((s) => (sceneId ? s.takes[sceneId] : undefined));
  const selectedTakeId = useRecordingStore((s) => (sceneId ? s.selectedTakeId[sceneId] : null));
  const markTakeSync = useRecordingStore((s) => s.markTakeSync);

  const inFlightRef = useRef<Set<string>>(new Set());
  // La callback est tenue dans une ref : un parent qui la recrée à chaque rendu
  // ne doit pas relancer l'effet de persistance.
  const onPersistedRef = useRef(onPersisted);
  useEffect(() => {
    onPersistedRef.current = onPersisted;
  }, [onPersisted]);

  const run = useCallback(
    async (takeId: string) => {
      if (!sceneId || inFlightRef.current.has(takeId)) return;
      const take = useRecordingStore.getState().takes[sceneId]?.find((t) => t.id === takeId);
      if (!take) return;

      inFlightRef.current.add(takeId);
      markTakeSync(sceneId, takeId, { syncState: 'uploading' });

      const sceneTakes = useRecordingStore.getState().takes[sceneId] ?? [];
      const result = await persistTake({
        blob: take.blob,
        sessionId,
        sceneId,
        sceneIndex,
        language,
        takesCount: sceneTakes.length,
        selectedTakeIndex: sceneTakes.findIndex((t) => t.id === takeId),
      });

      inFlightRef.current.delete(takeId);

      // La prise a pu être supprimée pendant l'envoi : ne rien réécrire alors.
      const stillThere = useRecordingStore.getState().takes[sceneId]?.some((t) => t.id === takeId);
      if (!stillThere) {
        logger.info(SERVICE_NAME, 'Take vanished during upload — result discarded', { sceneId, takeId });
        return;
      }

      if (result.ok) {
        markTakeSync(sceneId, takeId, { syncState: 'synced', s3Key: result.s3Key });
        onPersistedRef.current?.(sceneId, result.s3Key);
      } else {
        markTakeSync(sceneId, takeId, { syncState: 'error', error: result.error });
      }
    },
    [sessionId, sceneId, sceneIndex, language, markTakeSync],
  );

  useEffect(() => {
    if (!sceneId || !selectedTakeId) return;
    const take = takes?.find((t) => t.id === selectedTakeId);
    if (take?.syncState === 'pending') void run(selectedTakeId);
  }, [sceneId, selectedTakeId, takes, run]);

  const selectedTake = takes?.find((t) => t.id === selectedTakeId) ?? null;

  return {
    /** État de la prise retenue, ou `null` s'il n'y en a pas. */
    syncState: selectedTake?.syncState ?? null,
    error: selectedTake?.error ?? null,
    /** Relance manuelle après un échec. */
    retry: useCallback(() => {
      if (selectedTakeId) void run(selectedTakeId);
    }, [selectedTakeId, run]),
  };
}

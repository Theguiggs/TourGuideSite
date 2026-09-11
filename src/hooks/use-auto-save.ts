import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'useAutoSave';

interface UseAutoSaveOptions {
  data: string;
  onSave: (data: string) => Promise<void>;
  debounceMs?: number;
  saveOnBlur?: boolean;
  enabled?: boolean;
  /** Ref to the input element — blur on this element also triggers save */
  inputRef?: React.RefObject<HTMLElement | null>;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSavedAt: number | null;
  isDirty: boolean;
  saveNow: () => Promise<void>;
  /** Mark current data as the saved baseline (e.g. after loading from backend) */
  resetBaseline: () => void;
}

export function useAutoSave({
  data,
  onSave,
  debounceMs = 30_000,
  saveOnBlur = true,
  enabled = true,
  inputRef,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const dataRef = useRef(data);
  const savedDataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  /** Une sauvegarde a été demandée pendant qu'une autre était en vol. */
  const pendingRef = useRef(false);

  // Keep refs current
  dataRef.current = data;
  onSaveRef.current = onSave;

  // Track dirty state
  useEffect(() => {
    setIsDirty(data !== savedDataRef.current);
  }, [data]);

  const performSave = useCallback(async () => {
    const current = dataRef.current;
    if (current === savedDataRef.current) return; // No changes
    if (inFlightRef.current) {
      // Une sauvegarde est déjà en vol. On NOTE la demande au lieu de l'ignorer :
      // la frappe faite pendant une requête lente était simplement perdue de vue,
      // et `isDirty` repassait ensuite à faux — l'interface affichait « Sauvegardé »
      // alors que le texte courant n'était pas parti. La relance a lieu en fin de
      // requête, ci-dessous.
      pendingRef.current = true;
      return;
    }

    inFlightRef.current = true;
    setIsSaving(true);
    try {
      await onSaveRef.current(current);
      savedDataRef.current = current;
      setLastSavedAt(Date.now());
      logger.info(SERVICE_NAME, 'Auto-saved', { length: current.length });
    } catch (e) {
      logger.error(SERVICE_NAME, 'Auto-save failed', { error: String(e) });
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
      // `isDirty` se juge sur la donnée COURANTE, pas sur celle qui vient de
      // partir : entre les deux, le guide a pu continuer à taper.
      const stillDirty = dataRef.current !== savedDataRef.current;
      setIsDirty(stillDirty);
      const hadPending = pendingRef.current;
      pendingRef.current = false;
      // Une demande arrivée pendant la requête, ou une frappe non couverte par
      // ce qui vient d'être écrit, repart immédiatement.
      if (hadPending || stillDirty) {
        void performSaveRef.current();
      }
    }
  }, []);

  // `performSave` se rappelle elle-même : la ref casse la dépendance circulaire
  // sans reconstruire la callback (ce qui relancerait tous les effets).
  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  // Debounced auto-save on data change
  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, debounceMs, enabled, performSave]);

  // Save on blur (window loses focus OR input element loses focus)
  useEffect(() => {
    if (!enabled || !saveOnBlur) return;

    const handleBlur = () => {
      if (dataRef.current !== savedDataRef.current) {
        performSave();
      }
    };

    window.addEventListener('blur', handleBlur);
    const el = inputRef?.current;
    if (el) {
      el.addEventListener('blur', handleBlur);
    }

    return () => {
      window.removeEventListener('blur', handleBlur);
      if (el) {
        el.removeEventListener('blur', handleBlur);
      }
    };
  }, [enabled, saveOnBlur, performSave, inputRef]);

  const resetBaseline = useCallback(() => {
    savedDataRef.current = dataRef.current;
    setIsDirty(false);
  }, []);

  return { isSaving, lastSavedAt, isDirty, saveNow: performSave, resetBaseline };
}

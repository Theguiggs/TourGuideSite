'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';

import { useCallback, useEffect, useRef, useState } from 'react';
import { availableAudioLanguages, chooseAudioLanguage, fallbackSceneCount, type LanguageInventory } from './language-policy';
import { readLanguageChoice, writeLanguageChoice, RESUME_CLEAR_EVENT, RESUME_CLEAR_KEY } from './resume-store';

/** Le choix se résout aussi à la frontière async, à partir du manifeste tout juste reçu. */
export function useListeningLanguage(tourId: string, base: string, locale: InterfaceLocale, sceneIds: readonly string[], inventory: LanguageInventory | null, readInventory: () => LanguageInventory | null) {
  const [preference, setPreference] = useState<string | null>(null);
  const preferenceRef = useRef<string | null>(null);
  const selectionRef = useRef<string | null>(null);
  const [sessionSelection, setSessionSelection] = useState<string | null>(null);
  const idsRef = useRef(sceneIds);
  useEffect(() => { idsRef.current = sceneIds; }, [sceneIds]);
  useEffect(() => {
    preferenceRef.current = readLanguageChoice(tourId);
    setPreference(preferenceRef.current);
    const clear = () => { preferenceRef.current = null; selectionRef.current = null; setSessionSelection(null); setPreference(null); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === RESUME_CLEAR_KEY) clear();
    };
    window.addEventListener(RESUME_CLEAR_EVENT, clear);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RESUME_CLEAR_EVENT, clear);
      window.removeEventListener('storage', onStorage);
    };
  }, [tourId]);

  const available = availableAudioLanguages(inventory, base, sceneIds);
  // Une langue déjà retenue reste l’intention d’écoute si sa dernière traduction
  // disparaît au renouvellement : le repli source doit rester explicite.
  const selected = inventory && sessionSelection ? sessionSelection : chooseAudioLanguage(available, base, locale, preference);
  if (inventory && !available.includes(selected)) available.push(selected);
  const readSelection = useCallback(() => {
    const current = readInventory();
    if (!current) return base;
    selectionRef.current ??= chooseAudioLanguage(availableAudioLanguages(current, base, idsRef.current), base, locale, preferenceRef.current);
    return selectionRef.current;
  }, [readInventory, base, locale]);
  useEffect(() => {
    if (!inventory) { selectionRef.current = null; setSessionSelection(null); }
    else setSessionSelection(readSelection());
  }, [inventory, readSelection]);
  const select = useCallback((language: string) => {
    if (!availableAudioLanguages(readInventory(), base, idsRef.current).includes(language) || readSelection() === language) return false;
    preferenceRef.current = language;
    selectionRef.current = language;
    setSessionSelection(language);
    setPreference(language);
    writeLanguageChoice(tourId, language);
    return true;
  }, [base, tourId, readInventory, readSelection]);

  return { available, selected, readSelection, select, fallbackCount: fallbackSceneCount(inventory, sceneIds, selected, base) };
}

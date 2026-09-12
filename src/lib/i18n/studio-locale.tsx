'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

export type StudioLocale = 'fr' | 'en';

const STORAGE_KEY = 'murmure-studio-locale';
const LOCALE_CHANGE_EVENT = 'murmure-studio-locale-change';

interface StudioLocaleContextValue {
  locale: StudioLocale;
  setLocale: (locale: StudioLocale) => void;
  t: (fr: string, en: string) => string;
}

const StudioLocaleContext = createContext<StudioLocaleContextValue>({
  locale: 'fr',
  setLocale: () => undefined,
  t: (fr) => fr,
});

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
  };
}

/**
 * Langue mémorisée, sinon celle du navigateur. Un guide anglophone qui ouvre
 * la connexion pour la première fois la voit en anglais ; il pourra basculer.
 */
function readStoredLocale(): StudioLocale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
  } catch { /* stockage indisponible : on retombe sur le navigateur */ }
  return typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language ?? '') ? 'en' : 'fr';
}

/** Écrit la langue et prévient tous les abonnés (onglet courant compris). */
export function setStoredStudioLocale(nextLocale: StudioLocale): void {
  try { window.localStorage.setItem(STORAGE_KEY, nextLocale); } catch { /* ignore */ }
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

/**
 * La langue du Studio SANS le contexte : pour l'en-tête public des pages
 * `/guide/login|signup|reset-password`, qui vivent hors du fournisseur mais
 * doivent basculer avec le même réglage.
 */
export function useStoredStudioLocale(): StudioLocale {
  return useSyncExternalStore<StudioLocale>(subscribe, readStoredLocale, () => 'fr');
}

export function StudioLocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useStoredStudioLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: StudioLocale) => {
    setStoredStudioLocale(nextLocale);
  }, []);

  const t = useCallback((fr: string, en: string) => (locale === 'en' ? en : fr), [locale]);

  const value = useMemo<StudioLocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <StudioLocaleContext.Provider value={value}>
      {children}
    </StudioLocaleContext.Provider>
  );
}

export function useStudioLocale(): StudioLocaleContextValue {
  return useContext(StudioLocaleContext);
}

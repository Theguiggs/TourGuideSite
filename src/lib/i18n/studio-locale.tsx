'use client';
import { isInterfaceLocale, requireInterfaceLocale, type InterfaceLocale } from '@/lib/i18n/locales';
import { useRequestLocale } from './request-locale';
import { translate } from '@/lib/i18n/translate';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

export type StudioLocale = InterfaceLocale;

const STORAGE_KEY = 'murmure-studio-locale';
const LOCALE_CHANGE_EVENT = 'murmure-studio-locale-change';
let memoryLocale: StudioLocale | undefined;

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
function readStoredLocale(initialLocale: InterfaceLocale = 'fr'): StudioLocale {
  if (memoryLocale) return memoryLocale;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isInterfaceLocale(saved)) return saved;
  } catch { /* stockage indisponible : on retombe sur le navigateur */ }
  if (initialLocale !== 'fr') return initialLocale;
  const browserLocale = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0].toLowerCase() : null;
  return isInterfaceLocale(browserLocale) ? browserLocale : 'fr';
}

/** Écrit la langue et prévient tous les abonnés (onglet courant compris). */
export function setStoredStudioLocale(nextLocale: StudioLocale): void {
  requireInterfaceLocale(nextLocale);
  try { window.localStorage.setItem(STORAGE_KEY, nextLocale); memoryLocale = undefined; } catch { memoryLocale = nextLocale; }
  try { document.cookie = `murmure-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch { /* Le choix en mémoire reste utilisable. */ }
  notifyServiceWorkerLocale(nextLocale);
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

/** Seule une préférence linguistique, jamais une page privée, est transmise au worker. */
export function notifyServiceWorkerLocale(locale: StudioLocale): void {
  try { navigator.serviceWorker?.controller?.postMessage({type: 'SET_INTERFACE_LOCALE', locale}); } catch { /* Worker indisponible : site en ligne inchangé. */ }
}

/**
 * La langue du Studio SANS le contexte : pour l'en-tête public des pages
 * `/guide/login|signup|reset-password`, qui vivent hors du fournisseur mais
 * doivent basculer avec le même réglage.
 */
export function useStoredStudioLocale(): StudioLocale {
  const initialLocale = useRequestLocale();
  return useSyncExternalStore<StudioLocale>(subscribe, () => readStoredLocale(initialLocale), () => initialLocale);
}

export function StudioLocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useStoredStudioLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: StudioLocale) => {
    setStoredStudioLocale(nextLocale);
  }, []);

  const t = useCallback((fr: string, en: string) => (translate(locale, fr, en)), [locale]);

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

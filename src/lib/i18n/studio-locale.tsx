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

export function StudioLocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore<StudioLocale>(
    (onChange) => {
      window.addEventListener('storage', onChange);
      window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
      return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
      };
    },
    () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved === 'en' ? 'en' : 'fr';
    },
    () => 'fr',
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: StudioLocale) => {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
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

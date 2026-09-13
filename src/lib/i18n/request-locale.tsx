'use client';
import { createContext, useContext } from 'react';
import type { InterfaceLocale } from './locales';

const RequestLocaleContext = createContext<InterfaceLocale>('fr');
export function RequestLocaleProvider({ locale, children }: { locale: InterfaceLocale; children: React.ReactNode }) {
  return <RequestLocaleContext.Provider value={locale}>{children}</RequestLocaleContext.Provider>;
}
export function useRequestLocale(): InterfaceLocale { return useContext(RequestLocaleContext); }

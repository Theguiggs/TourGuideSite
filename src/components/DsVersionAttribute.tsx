'use client';

/**
 * DsVersionAttribute — Story 1.7
 *
 * Composant client minimal qui :
 * 1. Wrappe ses enfants dans `<FeatureFlagContext.Provider>` avec le provider Web.
 * 2. Lit `useDsVersion()` et applique `<html data-ds={dsVersion}>` côté client.
 *
 * Le `<html>` SSR a déjà `data-ds="v2"` (default safe) via `layout.tsx` —
 * cet effet ne s'exécute qu'à l'hydration et après chaque update du flag.
 *
 * Voir : `docs/feature-flag-architecture.md` pour le rationale provider.
 */

import { useEffect } from 'react';
import {
  FeatureFlagReactProvider,
  useDsVersion,
} from '@tourguide/design-system';
import { webFeatureFlagProvider } from '@/lib/feature-flag-provider';

function DsVersionEffect(): null {
  const dsVersion = useDsVersion();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ds', dsVersion);
    }
  }, [dsVersion]);

  // Polling 60s — refresh remote config (no-op tant que Firebase pas wiré).
  useEffect(() => {
    const id = setInterval(() => {
      void webFeatureFlagProvider.refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}

export function DsVersionAttribute({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // Cast: le package DS embarque @types/react 18, le projet Web utilise React 19.
  // Les ReactNode des deux versions sont compatibles à l'usage mais TS les voit
  // comme distincts. Le cast `as never` est volontaire et localisé.
  return (
    <FeatureFlagReactProvider value={webFeatureFlagProvider}>
      <DsVersionEffect />
      {children as never}
    </FeatureFlagReactProvider>
  );
}

'use client';

/**
 * TourGuide Design System — `useDsVersion()` hook (Story 1.7)
 *
 * Hook React qui retourne 'v1' | 'v2' selon le flag remote `ds_v2_enabled`.
 * Lit depuis un FeatureFlagProvider injecté via `FeatureFlagContext`.
 *
 * Comportement :
 * - Si pas de provider injecté → retourne `defaultProvider.getDsVersion()` (= 'v2').
 * - Si provider injecté → retourne sa valeur courante + s'abonne à `onUpdate`.
 * - Defaut safe : 'v2' à chaque chemin d'erreur (catch, fallback).
 *
 * **Next.js App Router** : la directive `'use client'` (en tête) est requise
 * car ce module utilise `createContext` + hooks (useState, useEffect,
 * useContext) — exclusivement client-side. Sans elle, Next plante au build.
 * Ignorée par RN/Jest (juste un string en mode non-Next).
 *
 * Voir : `feature-flag.ts` pour l'interface, `docs/feature-flag-architecture.md`
 * pour le rationale.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { defaultProvider, type DsVersion, type FeatureFlagProvider } from './feature-flag';

/**
 * Context React qui transporte le provider injecté.
 * Default = `defaultProvider` (toujours 'v2') pour fallback gracieux si aucun
 * <FeatureFlagContext.Provider> n'est wrappé en haut de l'arbre.
 */
export const FeatureFlagContext = createContext<FeatureFlagProvider>(defaultProvider);

/**
 * Alias React Provider pour confort consumer-side :
 *   <FeatureFlagReactProvider value={myProvider}>...</FeatureFlagReactProvider>
 *
 * Note : on n'exporte PAS un wrapper component custom (`<FeatureFlagProvider>`)
 * pour éviter la collision de nom avec l'interface `FeatureFlagProvider`. Le
 * consumer wrappe directement avec `FeatureFlagContext.Provider`.
 */
export const FeatureFlagReactProvider = FeatureFlagContext.Provider;

/**
 * Hook public : retourne la version DS courante.
 *
 * - Lit la valeur initiale depuis le provider du context.
 * - S'abonne aux changements via `onUpdate` ; cleanup automatique au unmount.
 * - Catche toute erreur du provider et fallback sur 'v2'.
 */
export function useDsVersion(): DsVersion {
  const provider = useContext(FeatureFlagContext);

  // Init synchrone : pas de flicker au premier render.
  const [version, setVersion] = useState<DsVersion>(() => {
    try {
      return provider.getDsVersion();
    } catch {
      return 'v2';
    }
  });

  useEffect(() => {
    // Sync immédiat au cas où le provider aurait changé de valeur entre
    // l'initial state et le mount (rare mais possible avec hot-reload).
    try {
      const current = provider.getDsVersion();
      setVersion((prev) => (prev === current ? prev : current));
    } catch {
      setVersion('v2');
    }

    // Abonnement aux changements remote.
    let unsubscribe: () => void;
    try {
      unsubscribe = provider.onUpdate((next) => {
        setVersion(next);
      });
    } catch {
      // Provider broken — on reste sur la valeur courante, pas de crash.
      unsubscribe = () => {
        /* no-op */
      };
    }

    return () => {
      try {
        unsubscribe();
      } catch {
        /* no-op — cleanup ne doit jamais throw */
      }
    };
  }, [provider]);

  return version;
}

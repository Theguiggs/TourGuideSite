/**
 * TourGuide Web — FeatureFlagProvider implementation (Story 1.7)
 *
 * Implémente l'interface `FeatureFlagProvider` du package DS pour la cible Web.
 *
 * État actuel : STUB. Retourne 'v2' par défaut. Pas d'appel réseau, pas de SDK
 * provider câblé. Les TODO ci-dessous indiquent où brancher Firebase Remote
 * Config (ou autre) une fois le projet backend configuré.
 *
 * Justification choix provider : voir `docs/feature-flag-architecture.md`
 *  - Décision Phase 0 (R) : Amplify Remote Config visé.
 *  - Réalité 2026 : Amplify Gen 2 ne fournit pas de RemoteConfig first-class.
 *  - Fallback retenu : Firebase Remote Config (SDK `firebase` côté web,
 *    `@react-native-firebase/remote-config` côté mobile — déjà partiellement
 *    présent dans la stack mobile).
 *
 * Cache localStorage : clé `tg_feature_flag_ds_v2_enabled` (last value JSON).
 * Polling 60s déclenché côté consumer via `setInterval(provider.refresh, 60000)`
 * (à wirer dans `app/layout.tsx` ou un Provider client).
 */

import {
  defaultProvider,
  isValidDsVersion,
  type DsVersion,
  type FeatureFlagProvider,
} from '@tourguide/design-system';

const CACHE_KEY = 'tg_feature_flag_ds_v2_enabled';
const FLAG_NAME = 'ds_v2_enabled';

type Listener = (version: DsVersion) => void;

/**
 * Lit la dernière version connue depuis localStorage (SSR-safe).
 * Fallback 'v2' si absent, parse error, ou environnement serveur (no-window).
 */
function readCache(): DsVersion {
  if (typeof window === 'undefined') return 'v2';
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return 'v2';
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (parsed && isValidDsVersion(parsed.version)) {
      return parsed.version;
    }
    return 'v2';
  } catch {
    return 'v2';
  }
}

/**
 * Persiste la version courante dans localStorage. SSR-safe (no-op côté serveur).
 */
function writeCache(version: DsVersion): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version, ts: Date.now() }),
    );
  } catch {
    /* localStorage indisponible (mode privé Safari, quota) — silent fail */
  }
}

/**
 * Crée un provider Web. Retourne le defaultProvider en environnement serveur
 * pour éviter toute mutation pendant le SSR (les listeners ne survivent pas
 * à l'hydration de toute façon).
 */
export function createWebFeatureFlagProvider(): FeatureFlagProvider {
  if (typeof window === 'undefined') {
    return defaultProvider;
  }

  let current: DsVersion = readCache();
  const listeners = new Set<Listener>();

  const setVersion = (next: DsVersion): void => {
    if (next === current) return;
    current = next;
    writeCache(next);
    listeners.forEach((cb) => {
      try {
        cb(next);
      } catch {
        /* listener broken — n'affecte pas les autres */
      }
    });
  };

  return {
    getDsVersion(): DsVersion {
      return current;
    },

    async refresh(): Promise<void> {
      // TODO Story 1.7 wiring backend : remplacer le no-op ci-dessous par un
      // fetch Firebase Remote Config :
      //
      //   import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
      //   const rc = getRemoteConfig();
      //   rc.settings.minimumFetchIntervalMillis = 60_000;
      //   await fetchAndActivate(rc);
      //   const value = getValue(rc, FLAG_NAME).asBoolean();
      //   const next: DsVersion = value ? 'v2' : 'v1';
      //   setVersion(next);
      //
      // Pré-requis : projet Firebase configuré, `firebase` package ajouté aux
      // deps, init Firebase app dans un module dédié (ex: `src/lib/firebase.ts`).
      //
      // Pour l'instant : on lit le cache (no network) et on garde 'v2' par défaut.
      void FLAG_NAME; // silence unused-var lint
      const cached = readCache();
      setVersion(cached);
    },

    onUpdate(callback: Listener): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}

/**
 * Singleton exporté — un seul provider par session navigateur.
 * Côté SSR retourne `defaultProvider` (pas de window).
 */
export const webFeatureFlagProvider: FeatureFlagProvider =
  createWebFeatureFlagProvider();

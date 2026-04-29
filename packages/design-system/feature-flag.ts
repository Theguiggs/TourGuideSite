/**
 * TourGuide Design System — Feature Flag Provider Interface (Story 1.7)
 *
 * Interface partagée pour le rollback DS v2 → v1 via flag remote `ds_v2_enabled`.
 * Le package DS définit UNIQUEMENT l'interface — le SDK provider (Firebase
 * Remote Config / AWS AppConfig / autre) est injecté par le consumer (Web ou RN)
 * via React Context.
 *
 * Voir : `docs/feature-flag-architecture.md` pour le rationale provider et la
 * documentation de wiring.
 *
 * Default safe : si aucun provider injecté ou en cas d'erreur, on retourne 'v2'
 * (l'app reste sur le DS courant — évite tout flicker accidentel).
 */

export type DsVersion = 'v1' | 'v2';

/**
 * Interface qu'un provider doit implémenter (Web ou RN).
 * - `getDsVersion()` : lecture synchrone de la version courante (lit cache).
 * - `refresh()` : déclenche un fetch remote (no-op si offline, safe).
 * - `onUpdate(cb)` : abonne un callback aux changements ; retourne une fonction
 *                   de désabonnement.
 */
export interface FeatureFlagProvider {
  getDsVersion(): DsVersion;
  refresh(): Promise<void>;
  onUpdate(callback: (version: DsVersion) => void): () => void;
}

/**
 * Provider par défaut : retourne toujours 'v2'.
 * Utilisé quand aucun provider n'est injecté via context (test environment,
 * cold start avant le wiring, dev sans backend).
 */
export const defaultProvider: FeatureFlagProvider = {
  getDsVersion(): DsVersion {
    return 'v2';
  },
  async refresh(): Promise<void> {
    // no-op — pas de remote configuré
    return Promise.resolve();
  },
  onUpdate(_callback: (version: DsVersion) => void): () => void {
    // no-op subscriber — la version ne change jamais
    return () => {
      /* no-op unsubscribe */
    };
  },
};

/**
 * Type guard : valide qu'une string est une DsVersion valide.
 * Utilisé par les implémentations provider pour parser des valeurs remote
 * potentiellement malformées.
 */
export function isValidDsVersion(value: unknown): value is DsVersion {
  return value === 'v1' || value === 'v2';
}

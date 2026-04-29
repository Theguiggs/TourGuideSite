// Story 1.7 — Feature flag rollback : tests provider interface + defaults safe.
// Source AC : _bmad-output/stories/1-7-feature-flag-rollback.md (AC 3, 4).
//
// Note : ce test couvre la logique pure (provider interface, defaultProvider,
// type guard, contrat onUpdate). Les tests rendering du hook React
// (`useDsVersion()` mounted dans un context) sont couverts côté Web (Playwright)
// et côté RN (Detox) en Story 7.7 — le package DS n'embarque pas
// `@testing-library/react` ou `react-dom` pour rester platform-agnostic.

import {
  defaultProvider,
  isValidDsVersion,
  type DsVersion,
  type FeatureFlagProvider,
} from '../feature-flag';

describe('defaultProvider — safe fallback (AC 3)', () => {
  it('retourne "v2" via getDsVersion()', () => {
    expect(defaultProvider.getDsVersion()).toBe('v2');
  });

  it('refresh() ne throw jamais', async () => {
    await expect(defaultProvider.refresh()).resolves.toBeUndefined();
  });

  it('onUpdate retourne une fonction d\'unsubscribe (no-op)', () => {
    const cb = jest.fn();
    const unsubscribe = defaultProvider.onUpdate(cb);
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('onUpdate ne notifie jamais (provider statique = pas de changement)', () => {
    const cb = jest.fn();
    defaultProvider.onUpdate(cb);
    // Aucune façon de déclencher un changement → callback jamais appelé.
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('isValidDsVersion — type guard (AC 3)', () => {
  it('accepte "v1"', () => {
    expect(isValidDsVersion('v1')).toBe(true);
  });

  it('accepte "v2"', () => {
    expect(isValidDsVersion('v2')).toBe(true);
  });

  it('rejette les valeurs invalides', () => {
    expect(isValidDsVersion('v3')).toBe(false);
    expect(isValidDsVersion('V1')).toBe(false);
    expect(isValidDsVersion('')).toBe(false);
    expect(isValidDsVersion(null)).toBe(false);
    expect(isValidDsVersion(undefined)).toBe(false);
    expect(isValidDsVersion(1)).toBe(false);
    expect(isValidDsVersion(true)).toBe(false);
    expect(isValidDsVersion({})).toBe(false);
  });
});

describe('FeatureFlagProvider contract — implémentation custom (AC 3, 4)', () => {
  /**
   * Provider in-memory minimal qui implémente l'interface — utilisé pour
   * valider que la signature couvre le besoin de subscription Web/RN.
   */
  function createMockProvider(initial: DsVersion = 'v2'): FeatureFlagProvider & {
    setVersion: (v: DsVersion) => void;
  } {
    let current: DsVersion = initial;
    const listeners = new Set<(v: DsVersion) => void>();
    return {
      getDsVersion: () => current,
      refresh: async () => {
        // no-op (provider mock — pas de fetch réseau)
      },
      onUpdate: (cb) => {
        listeners.add(cb);
        return () => {
          listeners.delete(cb);
        };
      },
      setVersion: (v) => {
        current = v;
        listeners.forEach((l) => l(v));
      },
    };
  }

  it('lit la valeur initiale via getDsVersion()', () => {
    const p = createMockProvider('v2');
    expect(p.getDsVersion()).toBe('v2');
  });

  it('notifie les listeners abonnés via onUpdate quand la valeur change', () => {
    const p = createMockProvider('v2');
    const cb = jest.fn();
    p.onUpdate(cb);
    p.setVersion('v1');
    expect(cb).toHaveBeenCalledWith('v1');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('notifie plusieurs listeners simultanément', () => {
    const p = createMockProvider('v2');
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    p.onUpdate(cb1);
    p.onUpdate(cb2);
    p.setVersion('v1');
    expect(cb1).toHaveBeenCalledWith('v1');
    expect(cb2).toHaveBeenCalledWith('v1');
  });

  it('cesse de notifier après unsubscribe()', () => {
    const p = createMockProvider('v2');
    const cb = jest.fn();
    const unsubscribe = p.onUpdate(cb);
    unsubscribe();
    p.setVersion('v1');
    expect(cb).not.toHaveBeenCalled();
  });

  it('getDsVersion() reflète la dernière valeur après update', () => {
    const p = createMockProvider('v2');
    p.setVersion('v1');
    expect(p.getDsVersion()).toBe('v1');
    p.setVersion('v2');
    expect(p.getDsVersion()).toBe('v2');
  });
});

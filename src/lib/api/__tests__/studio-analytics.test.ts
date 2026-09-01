/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getStudioAnalytics } from '../studio-analytics';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

describe('getStudioAnalytics', () => {
  it('returns funnel data', async () => {
    const data = await getStudioAnalytics();
    expect(data.funnel.fieldSessions).toBeGreaterThan(0);
    expect(data.funnel.published).toBeLessThanOrEqual(data.funnel.fieldSessions);
  });

  it('returns status distribution', async () => {
    const data = await getStudioAnalytics();
    expect(data.statusDistribution.length).toBeGreaterThan(0);
    const total = data.statusDistribution.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('compte les Scènes avec audio — un fait, pas une estimation', async () => {
    const data = await getStudioAnalytics();
    expect(data.tourProduction.length).toBeGreaterThan(0);
    for (const tour of data.tourProduction) {
      expect(Number.isInteger(tour.scenesWithAudio)).toBe(true);
      expect(tour.scenesWithAudio).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// AD-16 §6 — « LE COÛT EST MESURÉ, JAMAIS SUPPOSÉ »
//
// Ce module affichait un « Coût unitaire par tour » calculé sur quatre
// constantes en dur, jamais mesurées sur ce système. Les deux épreuves qui
// suivent tiennent les deux moitiés du refus : rien de coûteux ne SORT du
// module, et les quatre constantes ne sont plus DANS le module.
// =============================================================================

describe('studio-analytics n’invente plus de coût', () => {
  it('ne rend aucune grandeur monétaire, à aucune profondeur', async () => {
    const data = await getStudioAnalytics();
    const cles: string[] = [];
    const parcourir = (valeur: unknown) => {
      if (Array.isArray(valeur)) {
        valeur.forEach(parcourir);
        return;
      }
      if (valeur !== null && typeof valeur === 'object') {
        for (const [cle, sous] of Object.entries(valeur)) {
          cles.push(cle);
          parcourir(sous);
        }
      }
    };
    parcourir(data);
    expect(cles).not.toHaveLength(0);
    // Découpé en MOTS : `statusDistribution` porte « usD » par accident, et une
    // épreuve qui tombe sur un faux positif ne prouve plus rien.
    const monetaire = new Set(['cost', 'costs', 'usd', 'price', 'montant', 'cout', 'dollars']);
    const suspects = cles.filter((cle) =>
      cle
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z]+/)
        .some((mot) => monetaire.has(mot)),
    );
    expect(suspects).toEqual([]);
  });

  it('ne porte plus les quatre constantes en dur, ni leurs valeurs', () => {
    const source = readFileSync(join(__dirname, '..', 'studio-analytics.ts'), 'utf8');
    // Les identifiants ne subsistent que dans le commentaire qui explique leur
    // retrait ; c'est leur USAGE qui est proscrit. On épingle donc les VALEURS,
    // qu'aucun commentaire ne reprend, et l'arithmétique qui les liait.
    expect(source).not.toMatch(/0\.006/);
    expect(source).not.toMatch(/0\.023/);
    expect(source).not.toMatch(/1\.5/);
    expect(source).not.toMatch(/estimatedCostUSD/);
    expect(source).not.toMatch(/1024/);
  });
});

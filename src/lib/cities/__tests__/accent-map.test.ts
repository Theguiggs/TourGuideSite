/**
 * Story 4.3 — accent-map utility tests.
 */

import {
  ACCENT_LABELS,
  CITY_ACCENT_MAP,
  type CityAccent,
  getCityAccent,
  getCityAverageDuration,
} from '@/lib/cities/accent-map';

describe('getCityAccent', () => {
  it('returns "grenadine" for aix-en-provence', () => {
    expect(getCityAccent('aix-en-provence')).toBe('grenadine');
  });

  it('returns "mer" for nice', () => {
    expect(getCityAccent('nice')).toBe('mer');
  });

  it('returns "ocre" for roussillon', () => {
    expect(getCityAccent('roussillon')).toBe('ocre');
  });

  it('returns "olive" for lyon', () => {
    expect(getCityAccent('lyon')).toBe('olive');
  });

  it('returns one of the 4 accents for an unknown slug (deterministic)', () => {
    const accents: ReadonlyArray<CityAccent> = ['grenadine', 'ocre', 'mer', 'olive'];
    const result = getCityAccent('inconnue-xyz');
    expect(accents).toContain(result);
    // Determinism: repeated call returns same value.
    expect(getCityAccent('inconnue-xyz')).toBe(result);
  });
});

describe('ACCENT_LABELS', () => {
  it('contains exactly the 4 accent keys', () => {
    expect(Object.keys(ACCENT_LABELS).sort()).toEqual([
      'grenadine',
      'mer',
      'ocre',
      'olive',
    ]);
  });
});

describe('CITY_ACCENT_MAP', () => {
  it('has all values restricted to 4 valid accents', () => {
    const valid: ReadonlyArray<CityAccent> = ['grenadine', 'ocre', 'mer', 'olive'];
    for (const accent of Object.values(CITY_ACCENT_MAP)) {
      expect(valid).toContain(accent);
    }
  });
});

describe('getCityAverageDuration', () => {
  it('returns 0 when no tours match the city slug', () => {
    expect(getCityAverageDuration('grasse', [])).toBe(0);
    expect(
      getCityAverageDuration('grasse', [
        { citySlug: 'paris', duration: 60 },
      ]),
    ).toBe(0);
  });

  it('rounds the average duration of matching tours', () => {
    expect(
      getCityAverageDuration('grasse', [
        { citySlug: 'grasse', duration: 30 },
        { citySlug: 'grasse', duration: 45 },
        { citySlug: 'paris', duration: 90 },
      ]),
    ).toBe(38); // (30 + 45) / 2 = 37.5 → 38
  });
});

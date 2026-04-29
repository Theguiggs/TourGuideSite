import { cityFamily, FAMILY_META, type CityFamily } from '../city-family';

describe('cityFamily', () => {
  it('résout les villes Mer (côte)', () => {
    expect(cityFamily('Nice')).toBe('mer');
    expect(cityFamily('Cannes')).toBe('mer');
    expect(cityFamily('Marseille')).toBe('mer');
    expect(cityFamily('Antibes')).toBe('mer');
  });

  it('résout les villes Ocre (terres chaudes)', () => {
    expect(cityFamily('Grasse')).toBe('ocre');
    expect(cityFamily('Avignon')).toBe('ocre');
    expect(cityFamily('Arles')).toBe('ocre');
  });

  it('résout les villes Olive (nature, montagne)', () => {
    expect(cityFamily('Vence')).toBe('olive');
    expect(cityFamily('Annecy')).toBe('olive');
    expect(cityFamily('Saint-Paul-de-Vence')).toBe('olive');
  });

  it('résout les villes Ardoise (urbain)', () => {
    expect(cityFamily('Paris')).toBe('ardoise');
    expect(cityFamily('Lyon')).toBe('ardoise');
  });

  it('tombe sur ardoise par défaut pour une ville inconnue', () => {
    expect(cityFamily('Tombouctou')).toBe('ardoise');
    expect(cityFamily('Reykjavik')).toBe('ardoise');
  });

  it('gère null, undefined et chaîne vide', () => {
    expect(cityFamily(null)).toBe('ardoise');
    expect(cityFamily(undefined)).toBe('ardoise');
    expect(cityFamily('')).toBe('ardoise');
  });

  it('est insensible à la casse et aux espaces autour', () => {
    expect(cityFamily('  NICE  ')).toBe('mer');
    expect(cityFamily('vEnCe')).toBe('olive');
    expect(cityFamily('PARIS')).toBe('ardoise');
  });

  it('expose des metadata cohérentes pour chaque famille', () => {
    const families: CityFamily[] = ['mer', 'ocre', 'olive', 'ardoise'];
    for (const fam of families) {
      const meta = FAMILY_META[fam];
      expect(meta.label).toBeTruthy();
      expect(meta.bg).toMatch(/^bg-/);
      expect(meta.bgSoft).toMatch(/^bg-/);
      expect(meta.text).toMatch(/^text-/);
    }
  });
});

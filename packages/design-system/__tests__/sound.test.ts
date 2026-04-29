// Story 1.6 — Sound tokens tests.
// Source AC : _bmad-output/stories/1-6-motion-sound-tokens.md (AC 2, 4).
//
// NOTE : on ne teste PAS l'existence des fichiers sur disque (placeholders).

import { tg, tgSound, type TgSoundKey } from '../tokens';

describe('tgSound — structure (AC 2)', () => {
  it('expose un objet `transition` avec exactement 3 entrées', () => {
    expect(tgSound.transition).toBeDefined();
    expect(Object.keys(tgSound.transition)).toHaveLength(3);
  });

  it('contient les 3 clés attendues : scene, start, end', () => {
    const expected: TgSoundKey[] = ['scene', 'start', 'end'];
    for (const key of expected) {
      expect(tgSound.transition).toHaveProperty(key);
    }
  });
});

describe('tgSound — entrées (AC 2)', () => {
  const allEntries: Array<[TgSoundKey, { path: string; duration: number; volume: number }]> = [
    ['scene', tgSound.transition.scene],
    ['start', tgSound.transition.start],
    ['end', tgSound.transition.end],
  ];

  it.each(allEntries)('entry `%s` a path/duration/volume', (_key, entry) => {
    expect(entry).toHaveProperty('path');
    expect(entry).toHaveProperty('duration');
    expect(entry).toHaveProperty('volume');
  });

  it.each(allEntries)('entry `%s` path est une string non vide', (_key, entry) => {
    expect(typeof entry.path).toBe('string');
    expect(entry.path.length).toBeGreaterThan(0);
  });

  it.each(allEntries)('entry `%s` duration en ms (50-500)', (_key, entry) => {
    expect(typeof entry.duration).toBe('number');
    expect(entry.duration).toBeGreaterThanOrEqual(50);
    expect(entry.duration).toBeLessThanOrEqual(500);
  });

  it.each(allEntries)('entry `%s` volume dans [0, 1]', (_key, entry) => {
    expect(typeof entry.volume).toBe('number');
    expect(entry.volume).toBeGreaterThanOrEqual(0);
    expect(entry.volume).toBeLessThanOrEqual(1);
  });

  it.each(allEntries)('entry `%s` volume modeste (≤ 0.6, charter)', (_key, entry) => {
    expect(entry.volume).toBeLessThanOrEqual(0.6);
  });
});

describe('tg.sound — intégration aggregate (AC 4)', () => {
  it('tg.sound === tgSound (référence partagée)', () => {
    expect(tg.sound).toBe(tgSound);
  });

  it('tg.sound.transition.scene accessible', () => {
    expect(tg.sound.transition.scene.duration).toBe(220);
    expect(tg.sound.transition.scene.volume).toBe(0.4);
  });
});

describe('tgSound — placeholder paths (AC 2 — assets non livrés)', () => {
  it('paths pointent vers `sounds/*.aac` (placeholders Story 6.3)', () => {
    expect(tgSound.transition.scene.path).toBe('sounds/scene.aac');
    expect(tgSound.transition.start.path).toBe('sounds/start.aac');
    expect(tgSound.transition.end.path).toBe('sounds/end.aac');
  });
});

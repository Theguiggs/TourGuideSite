/**
 * LW-2 — la reprise mémorisée : lecture, écriture, purge, valeurs illisibles,
 * stockage absent ou qui lève. Jamais d'exception qui remonte au lecteur.
 */

import {
  clearResume,
  readResume,
  RESUME_MAX_AGE_MS,
  resumeKey,
  writeResume,
} from '../resume-store';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const KEY = resumeKey('tour-1');

/** Remplace `window.localStorage` (accesseur) et rend la fonction de restauration. */
function replaceLocalStorage(getter: () => Storage): () => void {
  const own = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const proto = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, get: getter });
  return () => {
    if (own) Object.defineProperty(window, 'localStorage', own);
    else if (proto) {
      delete (window as unknown as Record<string, unknown>).localStorage;
    }
  };
}

describe('resume-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('la clé est propre à la visite', () => {
    expect(resumeKey('abc')).toBe('murmure.player.resume.abc');
  });

  it('écriture puis lecture : scène, position, horodatage', () => {
    // L'horloge reste tenue pendant la lecture : relire à la date du jour
    // ferait de cette entrée une entrée périmée (90 jours).
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    writeResume('tour-1', { sceneId: 's2', position: 37.4 });

    expect(JSON.parse(window.localStorage.getItem(KEY) ?? '{}')).toEqual({
      sceneId: 's2',
      position: 37.4,
      updatedAt: 1_700_000_000_000,
    });
    expect(readResume('tour-1')).toEqual({ sceneId: 's2', position: 37.4, updatedAt: 1_700_000_000_000 });
    // Une autre visite n'a rien.
    expect(readResume('tour-2')).toBeNull();
    nowSpy.mockRestore();
  });

  it('aucune URL signée : seuls sceneId, position et updatedAt sont écrits', () => {
    writeResume('tour-1', { sceneId: 's1', position: 5 });
    expect(Object.keys(JSON.parse(window.localStorage.getItem(KEY) ?? '{}')).sort()).toEqual([
      'position',
      'sceneId',
      'updatedAt',
    ]);
  });

  it('position négative ou non finie : ramenée à zéro', () => {
    writeResume('tour-1', { sceneId: 's1', position: -3 });
    expect(readResume('tour-1')?.position).toBe(0);
    writeResume('tour-1', { sceneId: 's1', position: Number.NaN });
    expect(readResume('tour-1')?.position).toBe(0);
  });

  it('purge', () => {
    writeResume('tour-1', { sceneId: 's1', position: 5 });
    clearResume('tour-1');
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(readResume('tour-1')).toBeNull();
    // Purger l'absent ne lève pas.
    expect(() => clearResume('tour-1')).not.toThrow();
  });

  it.each([
    ['pas du JSON', 'not json'],
    ['un tableau', '[1,2]'],
    ['sans sceneId', JSON.stringify({ position: 3, updatedAt: 1 })],
    ['sceneId vide', JSON.stringify({ sceneId: '', position: 3, updatedAt: 1 })],
    ['position textuelle', JSON.stringify({ sceneId: 's1', position: '3', updatedAt: 1 })],
    ['position négative', JSON.stringify({ sceneId: 's1', position: -1, updatedAt: 1 })],
    ['sans updatedAt', JSON.stringify({ sceneId: 's1', position: 3 })],
    ['null', 'null'],
  ])('valeur illisible (%s) : ignorée et purgée', (_label, raw) => {
    window.localStorage.setItem(KEY, raw);
    expect(readResume('tour-1')).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('trop ancienne : ignorée et purgée — une position de l’an dernier ne dit plus rien', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    writeResume('tour-1', { sceneId: 's2', position: 37 });

    // La veille de la limite : encore proposée.
    nowSpy.mockReturnValue(1_700_000_000_000 + RESUME_MAX_AGE_MS - 1);
    expect(readResume('tour-1')?.sceneId).toBe('s2');

    // Passé la limite : oubliée, et la clé avec.
    nowSpy.mockReturnValue(1_700_000_000_000 + RESUME_MAX_AGE_MS + 1);
    expect(readResume('tour-1')).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    nowSpy.mockRestore();
  });

  it('une horloge en arrière (âge négatif) n’est pas une entrée périmée', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    writeResume('tour-1', { sceneId: 's2', position: 12 });
    nowSpy.mockReturnValue(1_700_000_000_000 - 48 * 60 * 60_000);

    expect(readResume('tour-1')?.sceneId).toBe('s2');
    nowSpy.mockRestore();
  });

  it('la limite vaut 90 jours', () => {
    expect(RESUME_MAX_AGE_MS).toBe(90 * 24 * 60 * 60_000);
  });

  it("l'accesseur localStorage lève : lecture nulle, écriture et purge silencieuses", () => {
    const restore = replaceLocalStorage(() => {
      throw new Error('SecurityError');
    });
    try {
      expect(readResume('tour-1')).toBeNull();
      expect(() => writeResume('tour-1', { sceneId: 's1', position: 1 })).not.toThrow();
      expect(() => clearResume('tour-1')).not.toThrow();
    } finally {
      restore();
    }
  });

  it('getItem / setItem / removeItem qui lèvent (quota) : rien ne remonte', () => {
    const throwing = {
      getItem: () => {
        throw new Error('QuotaExceededError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    const restore = replaceLocalStorage(() => throwing);
    try {
      expect(readResume('tour-1')).toBeNull();
      expect(() => writeResume('tour-1', { sceneId: 's1', position: 1 })).not.toThrow();
      expect(() => clearResume('tour-1')).not.toThrow();
    } finally {
      restore();
    }
  });
});

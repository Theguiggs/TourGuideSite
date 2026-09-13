/**
 * LW-2 — la reprise mémorisée : lecture, écriture, purge, valeurs illisibles,
 * stockage absent ou qui lève. Jamais d'exception qui remonte au lecteur.
 */

import {
  clearResume,
  clearAllResumes,
  pruneResumes,
  RESUME_CLEAR_EVENT,
  readResume,
  RESUME_MAX_AGE_MS,
  resumeKey,
  writeResume,
  readLanguageChoice,
  writeLanguageChoice,
  LANGUAGE_KEY_PREFIX,
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

describe('LW-3 — préférences et langue de reprise', () => {
  beforeEach(() => window.localStorage.clear());

  it('conserve un code canonique par visite sans URL', () => {
    writeLanguageChoice('a', 'EN_us');
    writeLanguageChoice('b', 'de');
    expect(readLanguageChoice('a')).toBe('en-us');
    expect(readLanguageChoice('b')).toBe('de');
    expect(Object.keys(JSON.parse(localStorage.getItem(`${LANGUAGE_KEY_PREFIX}a`)!)).sort()).toEqual(['language', 'updatedAt']);
    writeResume('a', { sceneId: 's1', position: 12, language: 'EN_us' });
    expect(readResume('a')?.language).toBe('en-us');
  });

  it.each(['null', 'cassé', '{}', JSON.stringify({ language: 'https://signed.test/audio', updatedAt: Date.now() }), JSON.stringify({ language: 'en', updatedAt: 'hier' })])('purge une préférence illisible : %s', (raw) => {
    localStorage.setItem(`${LANGUAGE_KEY_PREFIX}a`, raw);
    expect(readLanguageChoice('a')).toBeNull();
    expect(localStorage.getItem(`${LANGUAGE_KEY_PREFIX}a`)).toBeNull();
  });

  it('purge les préférences périmées, puis toutes celles de la session à la déconnexion', () => {
    writeLanguageChoice('recent', 'en');
    localStorage.setItem(`${LANGUAGE_KEY_PREFIX}ancien`, JSON.stringify({ language: 'de', updatedAt: Date.now() - RESUME_MAX_AGE_MS - 1 }));
    localStorage.setItem('autre', 'conserver');
    pruneResumes();
    expect(readLanguageChoice('recent')).toBe('en');
    expect(localStorage.getItem(`${LANGUAGE_KEY_PREFIX}ancien`)).toBeNull();
    clearAllResumes();
    expect(readLanguageChoice('recent')).toBeNull();
    expect(localStorage.getItem('autre')).toBe('conserver');
  });

  it('tolère un stockage inaccessible et un quota dépassé', () => {
    for (const getter of [() => { throw new Error('bloqué'); }, () => ({ getItem() { throw new Error('quota'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('quota'); } }) as unknown as Storage]) {
      const restore = replaceLocalStorage(getter);
      try {
        expect(readLanguageChoice('a')).toBeNull();
        expect(() => writeLanguageChoice('a', 'en')).not.toThrow();
      } finally { restore(); }
    }
  });

  it('relit les anciennes reprises sans langue et ignore un code invalide', () => {
    writeResume('a', { sceneId: 's1', position: 12 });
    expect(readResume('a')?.language).toBeUndefined();
    localStorage.setItem(resumeKey('a'), JSON.stringify({ sceneId: 's1', position: 12, updatedAt: Date.now(), language: 'https://signed.test' }));
    expect(readResume('a')).toMatchObject({ sceneId: 's1', position: 12 });
    expect(readResume('a')?.language).toBeUndefined();
  });
});

describe('LW-6 — ménage des reprises', () => {
  beforeEach(() => window.localStorage.clear());

  it('purge les anciennes et les illisibles, conserve les récentes et les autres données', () => {
    writeResume('recent', { sceneId: 's1', position: 12 });
    window.localStorage.setItem(resumeKey('ancien'), JSON.stringify({ sceneId: 's2', position: 42, updatedAt: Date.now() - RESUME_MAX_AGE_MS - 1 }));
    window.localStorage.setItem(resumeKey('illisible'), 'cassé');
    window.localStorage.setItem('autre', 'conserver');
    pruneResumes();
    expect(readResume('recent')?.position).toBe(12);
    expect(window.localStorage.getItem(resumeKey('ancien'))).toBeNull();
    expect(window.localStorage.getItem(resumeKey('illisible'))).toBeNull();
    expect(window.localStorage.getItem('autre')).toBe('conserver');
  });

  it('avertit les lecteurs avant purge et conserve les clés étrangères', () => {
    writeResume('a', { sceneId: 's1', position: 5 });
    window.localStorage.setItem('autre', 'conserver');
    const callback = jest.fn(() => expect(readResume('a')).not.toBeNull());
    window.addEventListener(RESUME_CLEAR_EVENT, callback);
    try { clearAllResumes(); } finally { window.removeEventListener(RESUME_CLEAR_EVENT, callback); }
    expect(callback).toHaveBeenCalledTimes(1);
    expect(readResume('a')).toBeNull();
    expect(window.localStorage.getItem('autre')).toBe('conserver');
  });

  it('fonctionne lorsque l’accès au stockage lève', () => {
    const restore = replaceLocalStorage(() => { throw new Error('bloqué'); });
    try {
      expect(() => pruneResumes()).not.toThrow();
      expect(() => clearAllResumes()).not.toThrow();
    } finally { restore(); }
  });
});

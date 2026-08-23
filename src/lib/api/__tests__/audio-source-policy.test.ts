/**
 * Story 1 — règle de dérivation de la mention de source audio.
 *
 * Couvre les sept lignes de la matrice d'I/O du SPEC : scènes toutes `tts`,
 * scènes mixtes, absence de preuve, scènes inatteignables (`sessionId` absent,
 * modélisé ici par une liste vide), mention existante fusionnée, écriture
 * refusée (garde de publication) et publication nue.
 */

import {
  AUDIO_DISCLOSURE_ERR,
  coversLanguage,
  deriveSourceAudioType,
  isAudioSourceType,
  sceneAudioSource,
  mergeLanguageAudioType,
  parseLanguageAudioTypes,
  disclosureWriteViolation,
  normalizeLanguageTag,
  type AudioSourceScene,
} from '../audio-source-policy';

const scene = (over: Partial<AudioSourceScene> = {}): AudioSourceScene => ({
  archived: false,
  baseAudioSource: null,
  studioAudioKey: null,
  originalAudioKey: null,
  ...over,
});

describe('deriveSourceAudioType', () => {
  it('renvoie "tts" quand toutes les scènes portent le marqueur tts', () => {
    expect(
      deriveSourceAudioType([
        scene({ baseAudioSource: 'tts' }),
        scene({ baseAudioSource: 'tts' }),
      ]),
    ).toBe('tts');
  });

  it('renvoie "recording" quand toutes les scènes portent le marqueur recording', () => {
    expect(
      deriveSourceAudioType([
        scene({ baseAudioSource: 'recording' }),
        scene({ baseAudioSource: 'recording' }),
      ]),
    ).toBe('recording');
  });

  it('renvoie "mixed" quand tts et recording se mêlent', () => {
    expect(
      deriveSourceAudioType([
        scene({ baseAudioSource: 'tts' }),
        scene({ baseAudioSource: 'recording' }),
      ]),
    ).toBe('mixed');
  });

  it('ignore les scènes archivées', () => {
    expect(
      deriveSourceAudioType([
        scene({ baseAudioSource: 'recording' }),
        scene({ baseAudioSource: 'tts', archived: true }),
      ]),
    ).toBe('recording');
  });

  it('renvoie "tts" sans aucune preuve : ni marqueur, ni clé audio', () => {
    expect(deriveSourceAudioType([scene(), scene()])).toBe('tts');
  });

  it('renvoie "tts" quand les scènes sont inatteignables (liste vide, sessionId absent)', () => {
    expect(deriveSourceAudioType([])).toBe('tts');
    expect(deriveSourceAudioType(null)).toBe('tts');
    expect(deriveSourceAudioType(undefined)).toBe('tts');
  });

  describe('heuristique de repli sur la clé (scènes antérieures au marqueur)', () => {
    it('branche tts : la clé porte "tts"', () => {
      expect(deriveSourceAudioType([scene({ studioAudioKey: 'audio/tts-scene-1.wav' })])).toBe('tts');
      expect(deriveSourceAudioType([scene({ studioAudioKey: 'tts-placeholder-scene-1' })])).toBe('tts');
    });

    it('branche recording : la clé porte la convention "original" des prises de terrain', () => {
      expect(
        deriveSourceAudioType([
          scene({ originalAudioKey: 'guide-studio/g1/s1/original/scene_0.aac' }),
        ]),
      ).toBe('recording');
      expect(
        deriveSourceAudioType([scene({ studioAudioKey: 'guide-audio/t1/scene_0_original.aac' })]),
      ).toBe('recording');
    });

    it('ne suppose PAS "recording" pour une clé Studio ordinaire — sur-déclarer, jamais sous-déclarer', () => {
      // Clé réelle produite par studio-upload-service : {sceneId}_{timestamp}.{ext},
      // aucune sous-chaîne « tts ». L'ancienne heuristique l'étiquetait « voix humaine ».
      expect(deriveSourceAudioType([scene({ studioAudioKey: 'scene-abc_1750000000000.wav' })])).toBe('tts');
    });

    it('écarte de l ensemble la scène sans preuve au lieu de la verser au défaut', () => {
      // Cinq prises humaines plus une scène encore vide : la scène vide ne doit
      // pas rendre l ensemble « mixed », sans quoi l app annoncerait « voix de
      // synthèse » sur une narration entièrement humaine.
      const humanScenes = Array.from({ length: 5 }, () => scene({ baseAudioSource: 'recording' }));
      expect(deriveSourceAudioType([...humanScenes, scene()])).toBe('recording');
      expect(
        deriveSourceAudioType([...humanScenes, scene({ studioAudioKey: 'scene-x_1750000000000.wav' })]),
      ).toBe('recording');
    });

    it('reste "mixed" quand deux preuves opposées coexistent, scène vide ou non', () => {
      expect(
        deriveSourceAudioType([
          scene({ baseAudioSource: 'recording' }),
          scene({ baseAudioSource: 'tts' }),
          scene(),
        ]),
      ).toBe('mixed');
    });

    it('sceneAudioSource rend null — et non "tts" — en l absence de preuve', () => {
      expect(sceneAudioSource(scene())).toBeNull();
      expect(sceneAudioSource(scene({ studioAudioKey: 'scene-abc_1750000000000.wav' }))).toBeNull();
      expect(sceneAudioSource(scene({ baseAudioSource: 'tts' }))).toBe('tts');
      expect(sceneAudioSource(scene({ originalAudioKey: 'a/original/s.aac' }))).toBe('recording');
    });

    it('le marqueur explicite prime sur la clé', () => {
      expect(
        deriveSourceAudioType([
          scene({ baseAudioSource: 'recording', studioAudioKey: 'audio/tts-scene-1.wav' }),
        ]),
      ).toBe('recording');
    });
  });
});

describe('parseLanguageAudioTypes', () => {
  it('lit un objet AppSync', () => {
    expect(parseLanguageAudioTypes({ fr: 'tts', en: 'recording' })).toEqual({ fr: 'tts', en: 'recording' });
  });

  it('lit une chaîne AWSJSON', () => {
    expect(parseLanguageAudioTypes(JSON.stringify({ fr: 'mixed' }))).toEqual({ fr: 'mixed' });
  });

  it("n'invente aucun défaut sur une entrée illisible", () => {
    expect(parseLanguageAudioTypes('{pas du json')).toEqual({});
    expect(parseLanguageAudioTypes(null)).toEqual({});
    expect(parseLanguageAudioTypes(['fr'])).toEqual({});
  });

  it('écarte les valeurs hors domaine', () => {
    expect(parseLanguageAudioTypes({ fr: 'tts', en: 'paused', de: null })).toEqual({ fr: 'tts' });
  });
});

describe('mergeLanguageAudioType', () => {
  it('fusionne, jamais ne remplace', () => {
    expect(mergeLanguageAudioType({ en: 'recording', es: 'tts' }, 'fr', 'mixed')).toEqual({
      en: 'recording',
      es: 'tts',
      fr: 'mixed',
    });
  });

  it('fusionne aussi depuis une carte stockée en chaîne', () => {
    expect(mergeLanguageAudioType(JSON.stringify({ en: 'recording' }), 'fr', 'tts')).toEqual({
      en: 'recording',
      fr: 'tts',
    });
  });

  it('remplace la seule entrée de la langue dérivée', () => {
    expect(mergeLanguageAudioType({ fr: 'recording' }, 'fr', 'tts')).toEqual({ fr: 'tts' });
  });
});

describe('coversLanguage', () => {
  it('reconnaît une mention présente', () => {
    expect(coversLanguage({ fr: 'tts' }, 'fr')).toBe(true);
    expect(coversLanguage(JSON.stringify({ nl: 'mixed' }), 'nl')).toBe(true);
  });

  it('refuse une mention absente ou invalide', () => {
    expect(coversLanguage({ en: 'tts' }, 'fr')).toBe(false);
    expect(coversLanguage({ fr: 'paused' }, 'fr')).toBe(false);
    expect(coversLanguage(null, 'fr')).toBe(false);
  });
});

describe('disclosureWriteViolation — garde d ecriture', () => {
  it('laisse passer une écriture qui ne publie pas', () => {
    expect(disclosureWriteViolation({ status: 'archived' }, 'fr')).toBeNull();
    expect(disclosureWriteViolation({ title: 'Nouveau titre' }, 'fr')).toBeNull();
  });

  it('refuse une publication nue et cite un code 29xx', () => {
    const violation = disclosureWriteViolation({ status: 'published' }, 'fr');
    expect(violation).toContain(String(AUDIO_DISCLOSURE_ERR.PUBLISH_WITHOUT_DISCLOSURE));
  });

  it('refuse une publication dont la mention ne couvre pas la langue source', () => {
    expect(
      disclosureWriteViolation({ status: 'published', languageAudioTypes: { en: 'tts' } }, 'fr'),
    ).toContain(String(AUDIO_DISCLOSURE_ERR.PUBLISH_WITHOUT_DISCLOSURE));
  });

  it('accorde la publication quand la mention couvre la langue source', () => {
    expect(disclosureWriteViolation({ status: 'published', languageAudioTypes: { fr: 'tts' } }, 'fr')).toBeNull();
  });

  it('accepte la mention déjà sérialisée en chaîne AWSJSON', () => {
    expect(
      disclosureWriteViolation(
        { status: 'published', languageAudioTypes: JSON.stringify({ fr: 'tts' }) },
        'fr',
      ),
    ).toBeNull();
  });

  it('sans langue source connue, exige seulement une mention non vide', () => {
    expect(disclosureWriteViolation({ status: 'published', languageAudioTypes: {} })).toContain(
      String(AUDIO_DISCLOSURE_ERR.PUBLISH_WITHOUT_DISCLOSURE),
    );
    expect(disclosureWriteViolation({ status: 'published', languageAudioTypes: { en: 'tts' } })).toBeNull();
  });
});

describe('isAudioSourceType', () => {
  it('ne reconnaît que les trois valeurs du domaine', () => {
    expect(isAudioSourceType('tts')).toBe(true);
    expect(isAudioSourceType('recording')).toBe(true);
    expect(isAudioSourceType('mixed')).toBe(true);
    expect(isAudioSourceType('paused')).toBe(false);
    expect(isAudioSourceType(undefined)).toBe(false);
  });
});

describe('codes d erreur', () => {
  it('vivent tous dans la centaine 29xx (27xx = registre mobile + Lambda)', () => {
    for (const code of Object.values(AUDIO_DISCLOSURE_ERR)) {
      expect(code).toBeGreaterThanOrEqual(2900);
      expect(code).toBeLessThan(3000);
    }
  });
});

describe('normalizeLanguageTag', () => {
  it('replie casse, espaces et forme locale sur la sous-étiquette primaire', () => {
    expect(normalizeLanguageTag('fr')).toBe('fr');
    expect(normalizeLanguageTag(' FR ')).toBe('fr');
    expect(normalizeLanguageTag('fr-FR')).toBe('fr');
    expect(normalizeLanguageTag('nl_BE')).toBe('nl');
    expect(normalizeLanguageTag('EN-gb')).toBe('en');
  });

  it('traite le vide comme absent — jamais une clé de mention', () => {
    expect(normalizeLanguageTag('')).toBeNull();
    expect(normalizeLanguageTag('   ')).toBeNull();
    expect(normalizeLanguageTag('-')).toBeNull();
    expect(normalizeLanguageTag(null)).toBeNull();
    expect(normalizeLanguageTag(undefined)).toBeNull();
    expect(normalizeLanguageTag(42)).toBeNull();
  });
});

describe('coversLanguage — normalisation des deux côtés', () => {
  it('reconnaît une clé héritée en majuscules ou en forme locale', () => {
    expect(coversLanguage({ FR: 'tts' }, 'fr')).toBe(true);
    expect(coversLanguage({ 'fr-FR': 'tts' }, 'fr')).toBe(true);
    expect(coversLanguage({ fr: 'tts' }, 'FR')).toBe(true);
  });

  it('refuse une langue demandée vide, même face à une clé vide stockée', () => {
    expect(coversLanguage({ '': 'tts' }, '')).toBe(false);
    expect(coversLanguage({ '': 'tts' }, 'fr')).toBe(false);
  });
});

describe('disclosureWriteViolation — l invariant est maintenu, pas seulement posé', () => {
  it('refuse une écriture qui viderait la mention, sans status', () => {
    const violation = disclosureWriteViolation({ languageAudioTypes: {} });
    expect(violation).toContain(String(AUDIO_DISCLOSURE_ERR.DISCLOSURE_STRIPPED));
  });

  it('refuse aussi une mention rendue vide par une valeur illisible ou nulle', () => {
    expect(disclosureWriteViolation({ languageAudioTypes: null })).toContain(
      String(AUDIO_DISCLOSURE_ERR.DISCLOSURE_STRIPPED),
    );
    expect(disclosureWriteViolation({ languageAudioTypes: '{pas du json' })).toContain(
      String(AUDIO_DISCLOSURE_ERR.DISCLOSURE_STRIPPED),
    );
    expect(disclosureWriteViolation({ languageAudioTypes: { fr: 'human' } })).toContain(
      String(AUDIO_DISCLOSURE_ERR.DISCLOSURE_STRIPPED),
    );
  });

  it('laisse passer une écriture qui ne touche ni au statut ni à la mention', () => {
    expect(disclosureWriteViolation({ title: 'Titre', version: 2 })).toBeNull();
  });

  it('laisse passer une mention non vide écrite hors publication', () => {
    expect(disclosureWriteViolation({ languageAudioTypes: { fr: 'tts' } })).toBeNull();
  });
});

/**
 * Politique de mention de source audio — règle unique et réutilisable.
 *
 * `GuideTour.languageAudioTypes` porte, par langue, la façon dont la narration a
 * été produite : `'tts'` (voix de synthèse), `'recording'` (voix humaine) ou
 * `'mixed'`. Le visiteur s'y fie : une Visite publiée sans mention s'affiche sur
 * l'app exactement comme une narration humaine, car les trois consommateurs du
 * catalogue traitent une carte vide comme « rien à déclarer ».
 *
 * Deux principes gouvernent ce module :
 *  1. **Sur-déclarer, jamais sous-déclarer.** Sans preuve de source, la valeur
 *     est `'tts'`. Annoncer une synthèse qui n'en est pas une déçoit ; annoncer
 *     une voix humaine qui n'en est pas une trompe.
 *  2. **Une seule implémentation.** `approveTour` et le chemin admin consomment
 *     ces fonctions pures ; aucune ne redérive la règle pour son compte.
 */

export type AudioSourceType = 'tts' | 'recording' | 'mixed';
export type LanguageAudioTypes = Record<string, AudioSourceType>;

/**
 * Codes d'erreur — centaine 29xx.
 * 27xx est déjà pris deux fois (registre d'erreurs mobile et Lambda
 * `set-tour-workflow-status`) : ne pas y ajouter.
 */
export const AUDIO_DISCLOSURE_ERR = {
  /** Écriture portant `status: 'published'` sans mention couvrant la langue source. */
  PUBLISH_WITHOUT_DISCLOSURE: 2900,
  /** Écriture de `GuideTour` refusée par le serveur : la Visite reste non publiée. */
  PUBLISH_WRITE_REFUSED: 2901,
  /** Lecture en échec : la mention est invérifiable. Réessayer a du sens. */
  DISCLOSURE_UNVERIFIABLE: 2902,
  /** La Visite n'existe pas. Réessayer n'a aucun sens. */
  TOUR_NOT_FOUND: 2903,
  /** Écriture qui viderait une mention déjà portée. */
  DISCLOSURE_STRIPPED: 2904,
} as const;

/** Forme minimale d'une scène Studio nécessaire à la dérivation. */
export interface AudioSourceScene {
  archived?: boolean | null;
  baseAudioSource?: string | null;
  studioAudioKey?: string | null;
  originalAudioKey?: string | null;
}

export function isAudioSourceType(value: unknown): value is AudioSourceType {
  return value === 'tts' || value === 'recording' || value === 'mixed';
}

/**
 * Ramène une étiquette de langue à sa sous-étiquette primaire en minuscules :
 * `' FR '` devient `'fr'`, `'fr-FR'` devient `'fr'`, `'nl_BE'` devient `'nl'`.
 * Renvoie `null` pour tout ce qui ne porte pas de langue — chaîne vide comprise.
 * Sans cela, une langue source vide se rangerait sous la clé `''` : une mention
 * que personne ne relit jamais, et qui satisferait pourtant la garde puisque la
 * clé existe.
 */
export function normalizeLanguageTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const primary = raw.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(primary) ? primary : null;
}

/**
 * Source d'une scène, ou `null` quand rien ne la prouve.
 *
 * `null` n'est PAS un synonyme de `'tts'` : une scène sans preuve — typiquement
 * une scène encore vide — doit être **écartée** de l'agrégat, pas versée au
 * défaut. La verser rendrait « mixed » cinq scènes humaines accompagnées d'une
 * sixième non encore enregistrée, et l'app annoncerait « voix de synthèse » sur
 * une narration entièrement humaine. Le défaut `'tts'` n'intervient qu'une fois
 * l'agrégat vide (voir `deriveSourceAudioType`).
 *
 * L'heuristique de repli ne sert que les scènes antérieures au marqueur
 * `baseAudioSource`. Sa version d'origine (`k.includes('tts') ? 'tts' : 'recording'`)
 * se trompait dans le mauvais sens : les clés réelles du Studio sont
 * `{sceneId}_{timestamp}.{ext}` et ne contiennent aucune sous-chaîne `tts`, si
 * bien qu'une scène de synthèse était étiquetée « voix humaine ». Ici, seule une
 * preuve positive fait sortir de `null` :
 *  - `tts` dans la clé (dont le repli `tts-placeholder-…` de `updateSceneAudio`) ;
 *  - `original` dans la clé — convention des prises de terrain héritées
 *    (`…/original/scene_0.aac`, `scene_0_original.aac`), jamais produite par la
 *    synthèse.
 */
const LEGACY_TTS_KEY = /tts/i;
const LEGACY_RECORDING_KEY = /original/i;

export function sceneAudioSource(scene: AudioSourceScene): 'tts' | 'recording' | null {
  if (scene.baseAudioSource === 'tts' || scene.baseAudioSource === 'recording') {
    return scene.baseAudioSource;
  }
  const key = scene.studioAudioKey ?? scene.originalAudioKey ?? '';
  if (LEGACY_TTS_KEY.test(key)) return 'tts';
  if (LEGACY_RECORDING_KEY.test(key)) return 'recording';
  return null;
}

/**
 * Mention de la langue source, dérivée des scènes vivantes.
 * Aucune scène ne portant de preuve — liste vide comprise — vaut `'tts'`.
 */
export function deriveSourceAudioType(
  scenes: readonly AudioSourceScene[] | null | undefined,
): AudioSourceType {
  const kinds = new Set<'tts' | 'recording'>();
  for (const scene of scenes ?? []) {
    if (scene.archived) continue;
    const source = sceneAudioSource(scene);
    if (source) kinds.add(source);
  }
  if (kinds.size === 0) return 'tts';
  return kinds.size === 1 ? Array.from(kinds)[0] : 'mixed';
}

/**
 * Lit la carte quelle que soit sa représentation en stockage (objet AppSync,
 * chaîne AWSJSON, Map DynamoDB écrite hors GraphQL) et n'en garde que les
 * entrées valides. N'invente aucun défaut : illisible donne `{}`.
 *
 * Élague : c'est une lecture de contrôle, jamais ce qu'on réécrit tel quel.
 */
export function parseLanguageAudioTypes(raw: unknown): LanguageAudioTypes {
  if (typeof raw === 'string') {
    try {
      return parseLanguageAudioTypes(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, AudioSourceType] => isAudioSourceType(entry[1]),
    ),
  );
}

/** Fusionne une langue dans la carte existante — jamais de remplacement. */
export function mergeLanguageAudioType(
  existing: unknown,
  lang: string,
  type: AudioSourceType,
): LanguageAudioTypes {
  return { ...parseLanguageAudioTypes(existing), [lang]: type };
}

/**
 * La mention couvre-t-elle cette langue ? Les deux côtés sont normalisés : une
 * ligne héritée portant la clé `'FR'` couvre bien la langue source `'fr'`.
 */
export function coversLanguage(raw: unknown, lang: string): boolean {
  const wanted = normalizeLanguageTag(lang);
  if (!wanted) return false;
  return Object.keys(parseLanguageAudioTypes(raw)).some(
    (key) => normalizeLanguageTag(key) === wanted,
  );
}

/**
 * Garde d'écriture. L'invariant n'est pas seulement posé à la transition vers
 * `published` : il est **maintenu**. Deux écritures sont refusées :
 *  - publier sans mention, ou sans mention couvrant la langue source ;
 *  - vider une mention, avec ou sans `status` — sans quoi un simple
 *    `updateGuideTourMutation(id, { languageAudioTypes: {} })` dépouillerait une
 *    Visite déjà publiée.
 * Retourne le message d'erreur 29xx, ou `null` si l'écriture est acceptable.
 *
 * `sourceLang` est optionnel : le point de passage bas niveau
 * (`updateGuideTourMutation`) ne connaît pas la langue source d'une Visite et
 * n'exige alors qu'une mention non vide ; les appelants métier, eux, la passent.
 */
export function disclosureWriteViolation(
  updates: Record<string, unknown>,
  sourceLang?: string,
): string | null {
  const publishing = updates.status === 'published';
  const touchesDisclosure = 'languageAudioTypes' in updates;
  if (!publishing && !touchesDisclosure) return null;

  const disclosure = parseLanguageAudioTypes(updates.languageAudioTypes);
  const isEmpty = Object.keys(disclosure).length === 0;

  // L'ordre compte : quand l'ecriture publie, le code de publication est le plus
  // parlant ; le refus de depouillement couvre tout le reste du cycle de vie.
  if (publishing) {
    const code = AUDIO_DISCLOSURE_ERR.PUBLISH_WITHOUT_DISCLOSURE;
    if (isEmpty) {
      return `[${code}] Publication refusée : la mention de source audio (languageAudioTypes) est absente.`;
    }
    if (sourceLang && !coversLanguage(disclosure, sourceLang)) {
      return `[${code}] Publication refusée : la mention de source audio ne couvre pas la langue source « ${sourceLang} ».`;
    }
  }
  if (touchesDisclosure && isEmpty) {
    return `[${AUDIO_DISCLOSURE_ERR.DISCLOSURE_STRIPPED}] Écriture refusée : elle viderait la mention de source audio (languageAudioTypes).`;
  }
  return null;
}

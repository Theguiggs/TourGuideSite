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
 * Transport uniquement : objet AppSync, chaîne AWSJSON, Map DynamoDB écrite hors
 * GraphQL, absence. `null` signale « rien de lisible ». N'élague rien — le volet
 * lecture a besoin de voir une valeur hors domaine pour la déclarer, là où le
 * volet écriture ne veut que les entrées valides. Les deux s'y adossent : une
 * seule fonction du module connaît les formes de stockage.
 */
function readAudioTypeMap(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === 'string') {
    try {
      return readAudioTypeMap(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/**
 * Lit la carte et n'en garde que les entrées valides. N'invente aucun défaut :
 * illisible donne `{}`.
 *
 * Élague : c'est une lecture de contrôle, jamais ce qu'on réécrit tel quel.
 */
export function parseLanguageAudioTypes(raw: unknown): LanguageAudioTypes {
  const map = readAudioTypeMap(raw);
  if (!map) return {};
  return Object.fromEntries(
    Object.entries(map).filter(
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

/* ------------------------------------------------------------------------- *
 * Volet lecture — la mention telle qu'elle s'affiche.
 *
 * Porté depuis `TourGuideApp/src/services/catalog/audio-source-display.ts`
 * (dépôts séparés : c'est la sémantique qui est portée, pas le fichier). Le
 * verrou d'écriture ci-dessus garantit la mention sur les publications à venir ;
 * il ne rattrape aucune Visite déjà publiée. Sans ce volet, une Visite dont la
 * mention est absente ou illisible s'affiche exactement comme une narration
 * humaine.
 *
 * Deux sentinelles de vide coexistent pour la même absence : `{}` (assainisseur
 * web, `tours-server.ts`) et `undefined` (mappeur mobile). Les fonctions ci-
 * dessous traitent les deux, faute de quoi un futur alignement des mappeurs
 * casserait la règle en silence.
 * ------------------------------------------------------------------------- */

/** Les deux locales que le portail sert : `/catalogue` et `/en/catalogue`. */
export type DisclosureLocale = 'fr' | 'en';

/**
 * Libellés visiteur. Deux mentions par locale, et pas une de plus — dont aucune
 * n'est écrite ailleurs : une mention légale rendue dans une langue que le
 * visiteur ne lit pas ne divulgue rien, et une traduction recopiée dans un
 * composant est une mention que ce module ne gouverne plus.
 */
const MENTION_LABELS: Record<DisclosureLocale, Record<'tts' | 'mixed', string>> = {
  fr: { tts: 'Voix de synthèse', mixed: 'Voix de synthèse (en partie)' },
  en: { tts: 'Synthetic voice', mixed: 'Synthetic voice (partly)' },
};

/**
 * Libellé d'une voix humaine déclarée. Ce n'est pas une mention — il n'y a rien
 * à divulguer — mais il se localise avec elle, et les deux surfaces l'affichent
 * dans le même emplacement.
 */
const HUMAN_LABELS: Record<DisclosureLocale, string> = {
  fr: 'Voix du guide',
  en: 'Guide recording',
};

/**
 * Source à afficher pour une langue donnée. C'est **la** règle de lecture :
 * carte absente, illisible, vide, sans entrée pour la langue, ou portant une
 * valeur hors des trois valeurs connues — tout cela vaut `'tts'`. Une voix
 * humaine déclarée (`'recording'`) reste, elle, intacte.
 *
 * Les deux côtés sont normalisés : une carte héritée portant la clé `'FR'`
 * couvre bien la langue `'fr'`. Deux clés qui se ramènent à la même langue en se
 * contredisant sont arbitrées par `resolveDisplayConflict` — jamais par la
 * valeur qui déclare le moins.
 */
export function displayedAudioSource(
  raw: unknown,
  lang: string | null | undefined,
): AudioSourceType {
  const wanted = normalizeLanguageTag(lang);
  const map = readAudioTypeMap(raw);
  if (!wanted || !map) return 'tts';

  const found = new Set<AudioSourceType>();
  for (const [key, value] of Object.entries(map)) {
    if (normalizeLanguageTag(key) !== wanted) continue;
    // Une entrée existe pour la langue mais ne dit rien de connu : pas de preuve.
    if (!isAudioSourceType(value)) return 'tts';
    found.add(value);
  }

  if (found.size === 0) return 'tts';
  return resolveDisplayConflict(found);
}

/**
 * Arbitre plusieurs valeurs déclarées pour la même langue — deux clés qui se
 * ramènent au même code (`{fr:…,'fr-FR':…}`). On retient celle qui déclare le
 * plus (`'tts'` > `'mixed'` > `'recording'`), jamais la moins déclarante :
 * rabaisser une synthèse pleine en « en partie » irait à rebours du principe 1.
 *
 * Une seule exception, qui n'en est pas une : `'tts'` **et** `'recording'`
 * déclarés ensemble pour la même langue décrivent exactement ce que `'mixed'`
 * veut dire — une part de synthèse, une part de voix humaine. On l'affiche donc
 * comme tel, et non comme l'une des deux moitiés.
 */
function resolveDisplayConflict(found: ReadonlySet<AudioSourceType>): AudioSourceType {
  if (found.has('tts')) return found.has('recording') ? 'mixed' : 'tts';
  if (found.has('mixed')) return 'mixed';
  return 'recording';
}

/**
 * La source affichée porte-t-elle une mention de synthèse ? Vrai pour `'tts'` et
 * `'mixed'` — donc pour tout ce qui n'est pas une voix humaine déclarée. C'est
 * ce booléen, et non une comparaison en direct, qui pilote le 🤖 de la puce de
 * langue comme celui du bloc de détail.
 */
export function isSyntheticAudioSource(type: AudioSourceType): type is 'tts' | 'mixed' {
  return type !== 'recording';
}

/**
 * Libellé visiteur de la mention, ou `null` quand il n'y a rien à déclarer.
 *
 * Les surcharges portent ce que le commentaire seul ne garantissait pas : une
 * source déjà reconnue synthétique rend une chaîne, jamais `null`. Aucun appelant
 * n'a donc besoin d'une assertion non-nulle, et si le contrat s'élargissait un
 * jour, TypeScript le dirait au lieu d'afficher « undefined » à côté d'un 🤖.
 */
export function audioSourceLabel(type: 'tts' | 'mixed', locale?: DisclosureLocale): string;
export function audioSourceLabel(
  type: AudioSourceType,
  locale?: DisclosureLocale,
): string | null;
export function audioSourceLabel(
  type: AudioSourceType,
  locale: DisclosureLocale = 'fr',
): string | null {
  if (type === 'recording') return null;
  return MENTION_LABELS[locale][type];
}

/** Libellé d'une voix humaine déclarée — le pendant, localisé, de l'absence de mention. */
export function humanVoiceLabel(locale: DisclosureLocale = 'fr'): string {
  return HUMAN_LABELS[locale];
}

/**
 * Langues à afficher pour une Visite, dans l'ordre de vente, normalisées et
 * dédoublonnées.
 *
 * `availableLanguages` fait foi — c'est ce qui est vendu. Piloter l'affichage
 * par la carte de mentions est précisément le bogue : une carte vide ne produit
 * alors aucune ligne, quel que soit le défaut appliqué à la lecture, et une
 * langue vendue mais absente de la carte reste invisible.
 *
 * Repli sur les clés de la carte quand aucune langue n'est vendue (donnée
 * héritée) : mieux vaut une langue affichée sans être vendue qu'une mention de
 * synthèse escamotée.
 */
export function displayedLanguages(
  availableLanguages: readonly string[] | null | undefined,
  raw?: unknown,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: unknown) => {
    const lang = normalizeLanguageTag(value);
    if (!lang || seen.has(lang)) return;
    seen.add(lang);
    out.push(lang);
  };

  for (const lang of availableLanguages ?? []) push(lang);
  if (out.length > 0) return out;
  for (const key of Object.keys(readAudioTypeMap(raw) ?? {})) push(key);
  return out;
}

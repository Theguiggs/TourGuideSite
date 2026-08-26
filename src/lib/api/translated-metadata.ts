/**
 * Métadonnées traduites d'une Visite — titres et descriptions par langue.
 *
 * La règle vit ici, en un seul endroit, comme celle de la source audio vit dans
 * `audio-source-policy.ts` : le chemin de publication la consomme, il ne la
 * réécrit pas.
 *
 * Deux formes de stockage coexistent en base et doivent être lues
 * indifféremment. Une écriture par AppSync passe par `serializeJsonFields` et
 * dépose une CHAÎNE JSON ; un semis qui écrit DynamoDB en direct dépose un
 * OBJET (Map). Une lecture qui n'accepterait que l'une des deux rendrait vide à
 * tort sur la moitié du catalogue.
 */

import { normalizeLanguageTag } from './audio-source-policy';

/** Carte langue → texte. Les clés sont normalisées, les valeurs non vides. */
export type TranslatedMetadata = Record<string, string>;

/**
 * Chaîne JSON, objet, ou rien. Une valeur illisible vaut carte vide — jamais
 * une exception : une métadonnée mal formée ne doit pas faire échouer une
 * publication, elle doit seulement n'apporter aucune traduction.
 */
function readMap(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === 'string') {
    try {
      return readMap(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/**
 * Lit la carte et n'en garde que les entrées exploitables : une langue
 * reconnaissable, un texte qui n'est pas vide une fois élagué.
 *
 * Un titre blanc est ÉCARTÉ plutôt que persisté : en base, `''` est
 * indiscernable d'une traduction manquante pour tout lecteur, mais il occupe la
 * clé et fait passer la langue pour traduite.
 */
export function parseTranslatedMetadata(raw: unknown): TranslatedMetadata {
  const map = readMap(raw);
  if (!map) return {};
  const out: TranslatedMetadata = {};
  for (const [key, value] of Object.entries(map)) {
    const lang = normalizeLanguageTag(key);
    if (!lang || typeof value !== 'string') continue;
    const text = value.trim();
    if (text) out[lang] = text;
  }
  return out;
}

/**
 * Fusionne la charge entrante dans la carte persistée — jamais de remplacement.
 *
 * L'asymétrie est voulue : une langue présente à gauche et absente à droite
 * survit. Remplacer la carte en bloc est le défaut qui a fait désactiver la
 * sérialisation de `translatedAudioKeys` dans `appsync-client.ts` ; on ne le
 * reproduit pas ici.
 */
export function mergeTranslatedMetadata(
  existing: unknown,
  incoming: unknown,
): TranslatedMetadata {
  return { ...parseTranslatedMetadata(existing), ...parseTranslatedMetadata(incoming) };
}

/**
 * La carte fusionnée, ou `undefined` quand elle n'apporte rien.
 *
 * `undefined` fait omettre la clé de la charge de mise à jour : écrire une
 * carte vide sur une Visite qui n'en a pas est du bruit, et écrire une carte
 * identique à celle déjà persistée l'est tout autant.
 *
 * La comparaison porte sur la carte BRUTE, pas sur sa lecture assainie. Comparer
 * l'assaini à l'assaini rendrait « inchangé » une carte persistée contenant un
 * titre blanc ou une clé dénormalisée (`'EN-GB'`) : la saleté ne serait jamais
 * réparée en base, seulement masquée par les lecteurs qui passent par ici.
 */
export function translatedMetadataUpdate(
  existing: unknown,
  incoming: unknown,
): TranslatedMetadata | undefined {
  const merged = mergeTranslatedMetadata(existing, incoming);
  const keys = Object.keys(merged);
  if (keys.length === 0) return undefined;
  const raw = readMap(existing) ?? {};
  const unchanged =
    Object.keys(raw).length === keys.length && keys.every((k) => raw[k] === merged[k]);
  return unchanged ? undefined : merged;
}

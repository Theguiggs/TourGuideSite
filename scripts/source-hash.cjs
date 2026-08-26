/**
 * source-hash.cjs — l'empreinte de fraîcheur du texte source, en UN seul endroit.
 *
 * Cette valeur décide de ce que le guide voit dans le Studio : `isSegmentStale`
 * (`src/lib/multilang/staleness-detector.ts`) compare l'empreinte stockée sur le
 * segment à celle recalculée depuis la scène, et affiche « à retraduire » dès
 * qu'elles diffèrent.
 *
 * CommonJS à dessein : les scripts ESM l'importent, et Jest la charge sans
 * transformateur — c'est ce qui permet d'ÉPINGLER cette implémentation à celle
 * de l'application par une épreuve, au lieu de la recopier à la main.
 *
 * Ce qui a rendu ce module nécessaire : `retrad-lib.mjs` en portait une copie
 * annoncée « EXACTE » qui ne l'était pas. Les 3 810 segments semés le
 * 2026-08-23 ont donc reçu une empreinte qu'aucune lecture applicative ne peut
 * retrouver, et le Studio affiche les 101 Visites comme périmées, dans les cinq
 * langues. Une copie manuelle ne survit pas à sa propre promesse d'exactitude.
 */

/**
 * Séparateur entre le texte et le titre : un caractère NUL (U+0000).
 *
 * Il est écrit ici en échappement VISIBLE parce que dans `src/types/studio.ts`
 * il est présent en LITTÉRAL — un octet nul au milieu d'un gabarit de chaîne,
 * que `grep` trahit en classant le fichier « binaire » et qu'aucune relecture
 * humaine ne peut voir. C'est exactement ce qui a permis à deux copies
 * « exactes » de diverger sans que personne ne le remarque : l'une joignait par
 * une espace, l'autre par ce NUL invisible.
 *
 * On ne le corrige PAS ici. L'application fait foi : c'est elle qui décide de ce
 * que le guide voit, et changer le séparateur invaliderait toute empreinte déjà
 * juste. Le rendre visible est la moitié du remède ; l'épreuve d'épinglage est
 * l'autre.
 */
const SEPARATEUR = '\u0000';

/**
 * FNV-1a 32 bits sur `transcriptText + NUL + title`.
 * Miroir exact de `hashSourceText` (src/types/studio.ts) — épinglé par
 * `src/lib/multilang/__tests__/certification-retraduction.test.ts`.
 */
function hashSourceText(transcriptText, title) {
  const s = `${transcriptText ?? ''}${SEPARATEUR}${title ?? ''}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

module.exports = { hashSourceText, SEPARATEUR };

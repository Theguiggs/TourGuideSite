/**
 * Projection scènes publiées → étapes d'itinéraire, et lecture de ce que le
 * serveur a accordé.
 *
 * Le rendu serveur et la redemande de contenu côté navigateur affichent la MÊME
 * liste : si les deux la fabriquaient chacun de leur côté, le contenu obtenu
 * après hydratation dériverait silencieusement de l'aperçu qu'il remplace
 * (numérotation, troncature de description, identifiants de clé React).
 *
 * `scene.photos` n'est PAS projeté : rien n'a jamais rempli `POI.photoKey`, et la
 * colonne photo de l'itinéraire est donc morte des deux côtés. Consigné en
 * travail reporté — la livrer change l'aspect de toutes les fiches.
 */

import type { PublicTourScene } from '@/lib/api/published-tour-content';
import type { POI } from '@/types/tour';

/** Longueur d'accroche affichée dans l'itinéraire. */
const POI_DESCRIPTION_MAX = 200;

/**
 * Profondeur de l'aperçu gratuit — miroir de `FREE_PREVIEW_SCENE_COUNT` dans
 * `amplify/functions/get-published-tour-content`. Elle ne décide d'aucun accès :
 * elle dit seulement OÙ commence le flou. Ce qui est réellement lisible, c'est
 * ce que le serveur a mis dans la réponse.
 */
export const FREE_PREVIEW_SCENES = 2;

export function mapScenesToPois(scenes: readonly PublicTourScene[]): POI[] {
  return scenes.map((scene, index) => ({
    id: scene.id,
    title: scene.title || `Point ${index + 1}`,
    description: (scene.description ?? '').substring(0, POI_DESCRIPTION_MAX),
    latitude: scene.latitude ?? 0,
    longitude: scene.longitude ?? 0,
    // Rang d'affichage, PAS `scene.order` : celui-ci porte le `sceneIndex` du
    // Studio, compté à partir de zéro et troué par les scènes archivées. Le
    // visiteur lit « Étape 1, 2, 3 », dans l'ordre déjà trié par le serveur.
    order: index + 1,
  }));
}

/**
 * Le serveur a-t-il accordé le contenu complet, ou servi l'aperçu tronqué ?
 *
 * C'est la réponse elle-même qui le dit, et rien d'autre : au-delà de l'aperçu,
 * la troncature retire l'audio, la description et les photos (le titre, l'ordre
 * et les coordonnées restent, la carte devant montrer l'itinéraire entier). Si
 * l'une des trois est encore là, c'est que le serveur a reconnu un droit.
 *
 * On ne demande donc jamais au navigateur ce qu'il croit posséder pour décider
 * d'afficher : on lit ce qui est arrivé.
 */
export function isFullContent(scenes: readonly PublicTourScene[]): boolean {
  return scenes
    .slice(FREE_PREVIEW_SCENES)
    .some(
      (scene) =>
        Boolean(scene.audioKey) ||
        (scene.description ?? '').length > 0 ||
        (scene.photos?.length ?? 0) > 0,
    );
}

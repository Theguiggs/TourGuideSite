import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
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
import { normalizeLanguageTag } from '@/lib/api/audio-source-policy';

/** The published scene contract serves source text only; audio translations do not translate it. */
export function itineraryUsesSourceText(pois: readonly POI[], locale: InterfaceLocale, sourceLanguage?: string): boolean {
  return pois.some(poi => Boolean(poi.title || poi.description)) && locale !== (normalizeLanguageTag(sourceLanguage) || 'fr');
}

export const ITINERARY_SOURCE_COPY: Record<InterfaceLocale, string> = {
  fr: 'Les titres et descriptions des étapes sont affichés dans leur langue d’origine : leur traduction n’est pas disponible. Les langues audio sont indépendantes.',
  en: 'Stop titles and descriptions are shown in their original language because their translation is unavailable. Audio languages are separate.',
  es: 'Los títulos y las descripciones de las paradas se muestran en su idioma original porque no hay traducción disponible. Los idiomas del audio son independientes.',
  de: 'Titel und Beschreibungen der Stationen werden in der Originalsprache angezeigt, da ihre Übersetzung nicht verfügbar ist. Die Audiosprachen sind davon unabhängig.',
  it: 'I titoli e le descrizioni delle tappe sono mostrati nella lingua originale perché la traduzione non è disponibile. Le lingue audio sono indipendenti.',
  nl: 'Titels en beschrijvingen van de stops worden in de oorspronkelijke taal getoond omdat hun vertaling niet beschikbaar is. Audiotalen staan hier los van.',
};

/** Longueur d'accroche affichée dans l'itinéraire. */
const POI_DESCRIPTION_MAX = 200;

/**
 * Profondeur de l'aperçu gratuit — miroir de `FREE_PREVIEW_SCENE_COUNT` dans
 * `amplify/functions/get-published-tour-content`. Elle ne décide d'aucun accès :
 * elle dit seulement OÙ commence le flou. Ce qui est réellement lisible, c'est
 * ce que le serveur a mis dans la réponse.
 */
export const FREE_PREVIEW_SCENES = 1;

export function mapScenesToPois(scenes: readonly PublicTourScene[]): POI[] {
  return scenes.map((scene, index) => ({
    id: scene.id,
    title: scene.title || `Point ${index + 1}`,
    description: (scene.description ?? '').substring(0, POI_DESCRIPTION_MAX),
    latitude: scene.latitude ?? 0,
    longitude: scene.longitude ?? 0,
    hasCoordinates: typeof scene.latitude === 'number' && typeof scene.longitude === 'number',
    // Rang d'affichage, PAS `scene.order` : celui-ci porte le `sceneIndex` du
    // Studio, compté à partir de zéro et troué par les scènes archivées. Le
    // visiteur lit « Étape 1, 2, 3 », dans l'ordre déjà trié par le serveur.
    order: index + 1,
    photoKey: scene.photoUrls?.[0],
    // LW-1 : présence d'une narration, rien de plus. `audioUrl` (signée 15 min)
    // ne passe PAS ici — cette projection tourne aussi au rendu serveur, et le
    // HTML ne doit porter aucune URL audio signée. Le lecteur obtient son manifeste côté navigateur.
    hasAudio: Boolean(scene.audioKey || scene.audioUrl || Object.values(scene.translatedAudioUrls ?? {}).some(Boolean)),
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
  // Le backend encore déployé sert deux étapes gratuites. La deuxième ne
  // prouve donc pas un achat, même si l’affichage Web limite l’aperçu à une.
  // Ne pas coupler ce seuil de compatibilité au nombre d’étapes affichées.
  const legacyPreviewBoundary = 2;
  return scenes
    .slice(Math.max(FREE_PREVIEW_SCENES, legacyPreviewBoundary))
    .some(
      (scene) =>
        Boolean(scene.audioKey) ||
        Boolean(scene.audioUrl) ||
        Object.values(scene.translatedAudioUrls ?? {}).some(Boolean) ||
        (scene.description ?? '').length > 0 ||
        (scene.photos?.length ?? 0) > 0,
    );
}

/**
 * Aperçu servi dans le HTML d'une visite payante : au-delà de l'aperçu
 * gratuit, le titre, l'accroche et la photo sont remplacés par « Étape N ».
 *
 * Le rendu serveur est anonyme : il floutait les vrais titres en CSS, qui
 * restaient lisibles dans la source de la page. Un acheteur retrouve le
 * contenu complet par la redemande après hydratation (voir `useServedContent`).
 * Coordonnées et ordre restent : la carte montre l'itinéraire entier.
 */
export function maskLockedPois(pois: readonly POI[], locale: InterfaceLocale = 'fr'): POI[] {
  return pois.map((poi, index) =>
    index < FREE_PREVIEW_SCENES
      ? poi
      : {
          ...poi,
          title: translate(locale, `Étape ${index + 1}`, `Stop ${index + 1}`),
          description: '',
          photoKey: undefined,
          // Une étape masquée n'a pas de bouton « Écouter » à annoncer.
          hasAudio: false,
        },
  );
}

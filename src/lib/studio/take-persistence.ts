/**
 * Persistance d'une prise audio du Studio web.
 *
 * ─── Pourquoi ce module existe ───────────────────────────────────────────────
 * Le Studio web savait enregistrer une prise et la jouer, mais rien ne la
 * portait jamais vers le backend : `useRecordingStore` gardait le Blob en
 * mémoire, `resetStore()` le jetait au démontage de la page, et la Scène gardait
 * `studioAudioKey` vide. Tout enregistrement fait sur le web était donc perdu en
 * silence — et comme `baseAudioSource: 'recording'` n'était jamais écrit non
 * plus, la Lambda d'approbation refusait ensuite toute soumission en mode
 * « voix humaine » avec « N scène(s) sans audio humain attesté ».
 *
 * Ce module est le chaînon manquant, isolé de React pour être éprouvable seul.
 *
 * ─── Ordre des écritures ─────────────────────────────────────────────────────
 * S3 D'ABORD, la Scène ENSUITE, et la Scène seulement si S3 a réussi. Un objet
 * S3 orphelin ne coûte que du stockage ; une Scène qui pointe vers un objet
 * absent casse la lecture chez le touriste et ment à la modération.
 */

import { updateSceneData } from '@/lib/api/studio';
import { logger } from '@/lib/logger';
import { uploadAudio } from '@/lib/studio/studio-upload-service';

const SERVICE_NAME = 'TakePersistence';

export interface PersistTakeInput {
  /** Le son à porter. */
  blob: Blob;
  sessionId: string;
  sceneId: string;
  /** Rang de la Scène — sert au seul identifiant de progression d'upload. */
  sceneIndex: number;
  /** Langue de la narration de base. Obligatoire : elle nomme l'objet S3. */
  language: string;
  /** Nombre total de prises de la Scène, reporté sur la Scène pour la modération. */
  takesCount?: number;
  /** Rang (0-based) de la prise retenue parmi les prises de la Scène. */
  selectedTakeIndex?: number;
}

export type PersistTakeResult =
  | { ok: true; s3Key: string }
  | { ok: false; error: string };

/**
 * Téléverse la prise puis l'attache à sa Scène.
 *
 * Écrit quatre champs, et ces quatre-là seulement :
 *  - `studioAudioKey` : la clé S3, seule adresse durable du son ;
 *  - `status: 'recorded'` : ce que lit la liste des scènes ;
 *  - `baseAudioSource: 'recording'` : l'attestation de voix humaine, exigée par
 *    `validateSource()` de la Lambda `set-tour-workflow-status` ET par
 *    `evaluateVisitCompleteness()` côté portail. Sans elle, la visite ne peut
 *    pas être soumise ;
 *  - `takesCount` / `selectedTakeIndex` : la trace du choix du guide, jusqu'ici
 *    jamais écrite bien que le schéma la porte.
 */
export async function persistTake(input: PersistTakeInput): Promise<PersistTakeResult> {
  const { blob, sessionId, sceneId, sceneIndex, language, takesCount, selectedTakeIndex } = input;

  const upload = await uploadAudio(blob, sessionId, sceneIndex, sceneId, language);
  if (!upload.ok) {
    logger.error(SERVICE_NAME, 'Take upload failed', { sessionId, sceneId, error: upload.error });
    return { ok: false, error: upload.error };
  }

  const persisted = await updateSceneData(sceneId, {
    studioAudioKey: upload.s3Key,
    status: 'recorded',
    baseAudioSource: 'recording',
    ...(typeof takesCount === 'number' ? { takesCount } : {}),
    ...(typeof selectedTakeIndex === 'number' ? { selectedTakeIndex } : {}),
  });

  if (!persisted.ok) {
    // L'objet S3 existe mais la Scène l'ignore. On le DIT, au lieu de laisser
    // croire que la prise est sauvée : le guide doit pouvoir réessayer, et la
    // reprise réutilisera le même Blob (toujours en mémoire) pour un nouvel
    // objet. L'orphelin est le prix, assumé, de ne jamais mentir sur l'état.
    logger.error(SERVICE_NAME, 'Take uploaded but scene update failed', {
      sessionId,
      sceneId,
      s3Key: upload.s3Key,
      error: persisted.error,
    });
    return { ok: false, error: persisted.error };
  }

  logger.info(SERVICE_NAME, 'Take persisted', { sessionId, sceneId, s3Key: upload.s3Key, language });
  return { ok: true, s3Key: upload.s3Key };
}

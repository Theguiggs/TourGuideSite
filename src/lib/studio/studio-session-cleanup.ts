/**
 * Purge de tout ce qu'un guide laisse derrière lui dans le navigateur.
 *
 * ─── Pourquoi ───────────────────────────────────────────────────────────────
 * La déconnexion ne vidait que la session Amplify. Restaient en place, sur un
 * poste partagé, et visibles par le compte suivant :
 *  - `studio_draft_*` : le texte des scènes en cours d'écriture ;
 *  - `studio_last_session` : la session que le tableau de bord propose de
 *    reprendre — donc l'identifiant d'une visite qui n'est pas la sienne ;
 *  - `studio_onboarding` : anodin, mais du même bail ;
 *  - les stores en mémoire : prises audio (Blob), audio de synthèse en
 *    data-URL, traductions, achats de langue en cours.
 *
 * Pire qu'une fuite : un brouillon étranger restauré dans l'éditeur pouvait
 * être RÉÉCRIT sur les scènes du compte suivant.
 *
 * Ce module est appelé par `signOut`. Il vit à part pour rester éprouvable, et
 * pour que l'authentification n'importe pas la moitié du Studio.
 */

import { logger } from '@/lib/logger';

const SERVICE_NAME = 'StudioSessionCleanup';

/** Clés `localStorage` du Studio, par préfixe exact. */
const STUDIO_KEY_PREFIXES = ['studio_draft_', 'waypoints-'];
/** Clés `localStorage` du Studio, exactes. */
const STUDIO_KEYS = ['studio_last_session', 'studio_onboarding'];

/**
 * Efface les traces locales du guide et réinitialise les stores du Studio.
 *
 * Tolère tout : un `localStorage` indisponible (navigation privée, cookies
 * bloqués) ou un store qui refuse de se charger ne doit pas empêcher la
 * déconnexion elle-même.
 */
export async function clearStudioLocalState(): Promise<void> {
  // --- localStorage ---
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (STUDIO_KEYS.includes(key) || STUDIO_KEY_PREFIXES.some((p) => key.startsWith(p))) {
        doomed.push(key);
      }
    }
    // Suppression APRÈS le parcours : retirer pendant décale les index et
    // laisserait une clé sur deux en place.
    for (const key of doomed) localStorage.removeItem(key);
    logger.info(SERVICE_NAME, 'Local studio state cleared', { keys: doomed.length });
  } catch (e) {
    logger.warn(SERVICE_NAME, 'Could not clear localStorage', { error: String(e) });
  }

  // --- Stores en mémoire ---
  // Importés dynamiquement : le contexte d'authentification est monté sur
  // TOUTES les pages, y compris le catalogue public, qui n'a rien à charger du
  // Studio tant que personne ne se déconnecte.
  // Chaque store expose SON verbe de remise à zéro : `resetStore` pour la
  // plupart, `clearSession` pour la session active. Les deux sont tentés.
  type Resettable = { resetStore?: () => void; clearSession?: () => void };
  const stores: Array<Promise<Resettable | null>> = [
    import('@/lib/stores/recording-store').then((m) => m.useRecordingStore.getState()),
    import('@/lib/stores/tts-store').then((m) => m.useTTSStore.getState()),
    import('@/lib/stores/translation-store').then((m) => m.useTranslationStore.getState()),
    import('@/lib/stores/studio-session-store').then((m) => m.useStudioSessionStore.getState()),
    import('@/lib/stores/transcription-store').then((m) => m.useTranscriptionStore.getState()),
  ];

  const settled = await Promise.allSettled(stores);
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled' || !outcome.value) continue;
    try {
      outcome.value.resetStore?.();
      outcome.value.clearSession?.();
    } catch (e) {
      logger.warn(SERVICE_NAME, 'Store reset failed', { error: String(e) });
    }
  }

  // Le sondage TTS survivait lui aussi à la déconnexion : ses `setInterval`
  // continuaient d'interroger le backend avec un jeton révoqué.
  try {
    const { useTTSStore } = await import('@/lib/stores/tts-store');
    useTTSStore.getState().stopAllPolling();
  } catch (e) {
    logger.warn(SERVICE_NAME, 'Could not stop TTS polling', { error: String(e) });
  }
}

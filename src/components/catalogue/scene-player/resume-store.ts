/**
 * LW-2 — reprise : l'étape et la position en cours, mémorisées par visite dans
 * `localStorage` sous `murmure.player.resume.<tourId>`.
 *
 * Scène, position, date et langue réellement jouée — jamais une URL signée. Toute lecture
 * et toute écriture sont sous try/catch : un stockage absent (navigation
 * privée, quota, accès qui lève) laisse le lecteur fonctionner sans reprise,
 * sans erreur visible. Une valeur illisible est ignorée et purgée.
 *
 * `updatedAt` n'est pas décoratif : une position abandonnée il y a six mois ne
 * dit plus rien de ce que le visiteur voulait écouter. Passé
 * `RESUME_MAX_AGE_MS`, l'entrée est tenue pour périmée et purgée à la lecture.
 *
 * Le rythme d'écriture (au plus toutes les 5 s pendant la lecture, et à la
 * pause) est du ressort de l'appelant.
 */

import { logger } from '@/lib/logger';
import { audioLanguageCode } from './language-policy';

const SERVICE_NAME = 'ResumeStore';

export const RESUME_KEY_PREFIX = 'murmure.player.resume.';
export const LANGUAGE_KEY_PREFIX = 'murmure.player.language.';
/** Les lecteurs actifs se ferment avant que les clés soient supprimées. */
export const RESUME_CLEAR_EVENT = 'murmure:player-resume-clear';
export const RESUME_CLEAR_KEY = 'murmure.player.session-cleared';

function resumeTourIds(prefix = RESUME_KEY_PREFIX): string[] {
  const store = storage();
  if (!store) return [];
  try {
    const ids: string[] = [];
    for (let index = 0; index < store.length; index++) {
      const key = store.key(index);
      if (key?.startsWith(prefix)) ids.push(key.slice(prefix.length));
    }
    return ids;
  } catch {
    return [];
  }
}

export function pruneResumes(): void {
  for (const tourId of resumeTourIds()) readResume(tourId);
  for (const tourId of resumeTourIds(LANGUAGE_KEY_PREFIX)) readLanguageChoice(tourId);
}

export function clearAllResumes(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RESUME_CLEAR_EVENT));
  try { storage()?.setItem(RESUME_CLEAR_KEY, `${Date.now()}-${Math.random()}`); }
  catch { /* Le signal local fonctionne même sans stockage. */ }
  for (const tourId of resumeTourIds()) clearResume(tourId);
  for (const tourId of resumeTourIds(LANGUAGE_KEY_PREFIX)) {
    try { storage()?.removeItem(`${LANGUAGE_KEY_PREFIX}${tourId}`); } catch { /* Stockage facultatif. */ }
  }
}

/** Au-delà, la reprise n'est plus proposée : 90 jours. */
export const RESUME_MAX_AGE_MS = 90 * 24 * 60 * 60_000;

export interface ResumeEntry {
  sceneId: string;
  /** Langue de l’URL réellement jouée ; absent dans les anciennes reprises. */
  language?: string;
  /** Secondes depuis le début de la scène. */
  position: number;
  /** Horodatage (ms) de la dernière écriture. */
  updatedAt: number;
}

export function resumeKey(tourId: string): string {
  return `${RESUME_KEY_PREFIX}${tourId}`;
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    // L'accesseur lui-même peut lever (stockage désactivé).
    return null;
  }
}

function parseEntry(raw: string): ResumeEntry | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.sceneId !== 'string' || candidate.sceneId.length === 0) return null;
  if (typeof candidate.position !== 'number' || !Number.isFinite(candidate.position) || candidate.position < 0) {
    return null;
  }
  if (typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt)) return null;
  const language = audioLanguageCode(candidate.language);
  return { sceneId: candidate.sceneId, position: candidate.position, updatedAt: candidate.updatedAt, ...(language ? { language } : {}) };
}

/**
 * La reprise mémorisée, ou `null` : absente, illisible, trop ancienne (les deux
 * derniers cas purgent la clé), ou stockage indisponible.
 */
export function readResume(tourId: string): ResumeEntry | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(resumeKey(tourId));
  } catch (error) {
    logger.info(SERVICE_NAME, 'resume unreadable', { tourId, error: String(error) });
    return null;
  }
  if (raw === null) return null;
  const entry = parseEntry(raw);
  if (!entry) {
    logger.info(SERVICE_NAME, 'resume entry discarded', { tourId });
    clearResume(tourId);
    return null;
  }
  // Une horloge en arrière donne un âge négatif : ce n'est pas « périmé ».
  if (Date.now() - entry.updatedAt > RESUME_MAX_AGE_MS) {
    logger.info(SERVICE_NAME, 'resume entry expired', { tourId });
    clearResume(tourId);
    return null;
  }
  return entry;
}

export function writeResume(tourId: string, entry: { sceneId: string; position: number; language?: string }): void {
  const store = storage();
  if (!store) return;
  const position = Number.isFinite(entry.position) && entry.position > 0 ? entry.position : 0;
  try {
    store.setItem(
      resumeKey(tourId),
      JSON.stringify({ sceneId: entry.sceneId, position, updatedAt: Date.now(), ...(audioLanguageCode(entry.language) ? { language: audioLanguageCode(entry.language) } : {}) }),
    );
  } catch (error) {
    logger.info(SERVICE_NAME, 'resume not written', { tourId, error: String(error) });
  }
}

export function clearResume(tourId: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(resumeKey(tourId));
  } catch (error) {
    logger.info(SERVICE_NAME, 'resume not cleared', { tourId, error: String(error) });
  }
}

export function readLanguageChoice(tourId: string): string | null {
  const store = storage();
  if (!store) return null;
  const key = `${LANGUAGE_KEY_PREFIX}${tourId}`;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { language?: unknown; updatedAt?: unknown } | null;
    const language = audioLanguageCode(entry?.language);
    if (language && typeof entry?.updatedAt === 'number' && Number.isFinite(entry.updatedAt) && Date.now() - entry.updatedAt <= RESUME_MAX_AGE_MS) return language;
  } catch { /* Une valeur illisible ne bloque jamais l’écoute. */ }
  try { store.removeItem(key); } catch { /* Stockage facultatif. */ }
  return null;
}

export function writeLanguageChoice(tourId: string, language: string): void {
  const code = audioLanguageCode(language);
  if (!code) return;
  try { storage()?.setItem(`${LANGUAGE_KEY_PREFIX}${tourId}`, JSON.stringify({ language: code, updatedAt: Date.now() })); }
  catch { /* Le choix reste utilisable en mémoire. */ }
}

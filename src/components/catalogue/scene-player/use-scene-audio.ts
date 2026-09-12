'use client';

/**
 * LW-1 — source des URLs audio d'une visite, demandées par le navigateur.
 *
 * Le HTML rendu serveur ne porte aucune URL signée : l'itinéraire ne sait que
 * `hasAudio`. C'est ce hook qui, au premier clic, demande
 * `getPublishedTourContent` (qui choisit seul `userPool`/`identityPool`) et
 * garde les URLs reçues — en mémoire de composant seulement, jamais dans
 * `localStorage` ni dans un état partagé entre visites.
 *
 * Le serveur reste seul juge : on ne joue que les URLs que la réponse porte.
 * Une scène absente de la réponse n'a pas d'URL, point ; le hook n'invente
 * rien et ne redemande pas pour elle.
 *
 * Fraîcheur : `mediaExpiresAt` moins 30 s de marge ; absent, on considère la
 * réponse fraîche 10 min ; déjà passé (horloge du poste en avance, réponse
 * tardive), fraîche 60 s — sinon chaque clic redemanderait et consommerait la
 * seule relance de sa tentative. Le cache est oublié quand l'identité ou les
 * achats changent (mêmes signaux que `useServedContent`) : ce que le serveur
 * a accordé à un anonyme n'engage pas ce qu'il accordera à l'acheteur qui
 * vient de payer. Une réponse encore en vol à ce moment-là est relancée UNE
 * fois sur la génération courante.
 *
 * En mode bouchons il n'y a pas de serveur : on ne charge pas AppSync, on
 * répond « rien ».
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { usePurchasesRefreshTick } from '@/hooks/use-owned-tour-ids';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'SceneAudio';

/** Marge avant `mediaExpiresAt` : une URL à 20 s de sa fin ne lance pas une piste de 90 s. */
export const EXPIRY_MARGIN_MS = 30_000;
/** Sans `mediaExpiresAt`, la réponse est tenue pour fraîche ce temps-là. */
export const DEFAULT_TTL_MS = 10 * 60_000;
/** `mediaExpiresAt` déjà passé à réception : repli court, jamais « déjà périmé ». */
export const STALE_FALLBACK_TTL_MS = Math.min(DEFAULT_TTL_MS, 60_000);

export type SceneUrls = Readonly<Record<string, string>>;

interface SceneAudioCache {
  urlsBySceneId: SceneUrls;
  /** Horodatage (ms) au-delà duquel les URLs sont tenues pour périmées. */
  expiresAt: number;
}

/** Ce qu'`ensureFresh` a fait pour servir la demande. */
export type EnsureFreshOutcome =
  | 'cached'
  /** Première demande : rien n'était en mémoire. */
  | 'requested'
  /** Redemande : ce qui était en mémoire était périmé. */
  | 'refreshed';

export interface EnsureFreshResult {
  /** `null` si la demande a échoué ; le cache antérieur, s'il existe, est conservé. */
  urls: SceneUrls | null;
  outcome: EnsureFreshOutcome;
}

export interface SceneAudioSource {
  /** Demande le contenu si rien n'est en mémoire ou si c'est périmé. */
  ensureFresh(): Promise<EnsureFreshResult>;
  /** Redemande sans condition (erreur média en cours de piste). */
  refetch(): Promise<SceneUrls | null>;
}

/** Exporté pour les épreuves ; le lecteur n'en a pas besoin. */
export function computeExpiresAt(mediaExpiresAt: string | undefined, now: number): number {
  if (mediaExpiresAt) {
    const parsed = Date.parse(mediaExpiresAt);
    if (Number.isFinite(parsed)) {
      const expiresAt = parsed - EXPIRY_MARGIN_MS;
      return expiresAt > now ? expiresAt : now + STALE_FALLBACK_TTL_MS;
    }
  }
  return now + DEFAULT_TTL_MS;
}

export function useSceneAudio(tourId: string): SceneAudioSource {
  const { isAuthenticated } = useAuth();
  const refreshTick = usePurchasesRefreshTick();
  const cacheRef = useRef<SceneAudioCache | null>(null);
  const inflightRef = useRef<Promise<SceneUrls | null> | null>(null);
  // Une réponse en vol au moment d'un changement d'identité, de visite ou
  // d'achat ne doit pas repeupler le cache qu'on vient d'oublier.
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current += 1;
    cacheRef.current = null;
    inflightRef.current = null;
  }, [tourId, isAuthenticated, refreshTick]);

  const request = useCallback((): Promise<SceneUrls | null> => {
    if (inflightRef.current) return inflightRef.current;
    if (shouldUseStubs()) {
      logger.warn(SERVICE_NAME, 'scene audio unavailable in stub mode', { tourId });
      return Promise.resolve(null);
    }

    const launch = (relaunched: boolean): Promise<SceneUrls | null> => {
      const generation = generationRef.current;
      let promise: Promise<SceneUrls | null> | null = null;
      promise = (async (): Promise<SceneUrls | null> => {
        try {
          const { getPublishedTourContent } = await import('@/lib/api/appsync-client');
          const result = await getPublishedTourContent(tourId);
          if (generation !== generationRef.current) {
            // L'identité ou les achats ont changé pendant le vol : cette
            // réponse ne vaut plus. Une relance sur la génération courante,
            // une seule — pas de course infinie si les signaux s'enchaînent.
            if (inflightRef.current === promise) inflightRef.current = null;
            return relaunched ? null : launch(true);
          }
          if (!result.ok) {
            logger.warn(SERVICE_NAME, 'scene audio request refused', { tourId, error: result.error });
            return null;
          }
          const urlsBySceneId: Record<string, string> = {};
          for (const scene of result.data.scenes) {
            if (scene.audioUrl) urlsBySceneId[scene.id] = scene.audioUrl;
          }
          cacheRef.current = {
            urlsBySceneId,
            expiresAt: computeExpiresAt(result.data.mediaExpiresAt, Date.now()),
          };
          return urlsBySceneId;
        } catch (error) {
          if (generation === generationRef.current) {
            logger.warn(SERVICE_NAME, 'scene audio request failed', { tourId, error: String(error) });
          }
          return null;
        } finally {
          if (inflightRef.current === promise) inflightRef.current = null;
        }
      })();
      inflightRef.current = promise;
      return promise;
    };

    return launch(false);
  }, [tourId]);

  const ensureFresh = useCallback(async (): Promise<EnsureFreshResult> => {
    const cache = cacheRef.current;
    if (cache && Date.now() < cache.expiresAt) {
      return { urls: cache.urlsBySceneId, outcome: 'cached' };
    }
    const outcome: EnsureFreshOutcome = cache ? 'refreshed' : 'requested';
    const urls = await request();
    return { urls, outcome };
  }, [request]);

  const refetch = useCallback((): Promise<SceneUrls | null> => request(), [request]);

  return useMemo(() => ({ ensureFresh, refetch }), [ensureFresh, refetch]);
}

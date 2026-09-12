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
import { RESUME_CLEAR_EVENT, RESUME_CLEAR_KEY } from './resume-store';

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
  /**
   * L'échéance vient de `mediaExpiresAt` (et non d'un repli local). Un repli
   * n'est qu'une hypothèse de durée : lui opposer une validité minimale ferait
   * redemander le contenu à chaque frontière de piste (LW-2).
   */
  fromResponse: boolean;
  /** Couverture de la visite (LW-2, Media Session) — une URL de la réponse. */
  coverUrl?: string;
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

export interface EnsureFreshOptions {
  /**
   * LW-2 — validité restante exigée (ms). À une frontière de piste, une URL
   * qui expire dans 2 min ne couvre pas une narration : on redemande d'abord.
   * Défaut 0 : périmé seulement si l'échéance est passée.
   */
  minValidityMs?: number;
}

export interface SceneAudioSource {
  /** Demande le contenu si rien n'est en mémoire ou si c'est périmé. */
  ensureFresh(options?: EnsureFreshOptions): Promise<EnsureFreshResult>;
  /** Redemande sans condition (erreur média en cours de piste). */
  refetch(): Promise<SceneUrls | null>;
  /** `coverUrl` de la dernière réponse, s'il existe (Media Session). */
  readCoverUrl(): string | undefined;
}

/**
 * Périmé si l'échéance est passée, ou si la validité restante d'une échéance
 * RÉELLE est sous le minimum demandé.
 *
 * `fromResponse` est la nuance qui compte : quand le serveur n'a pas donné de
 * `mediaExpiresAt` (ou en a donné un déjà passé), l'échéance en mémoire n'est
 * qu'un repli local — 10 min, ou 60 s. Comparer ce repli aux 5 min exigées à
 * une frontière de piste ferait redemander le contenu à CHAQUE piste, et
 * chacune démarrerait avec sa relance déjà consommée, alors que rien ne dit que
 * les URLs vont expirer. Un repli ne périme donc que par son échéance.
 */
export function isStale(
  expiresAt: number,
  now: number,
  minValidityMs: number = 0,
  fromResponse: boolean = true,
): boolean {
  const remaining = expiresAt - now;
  if (remaining <= 0) return true;
  if (!fromResponse) return false;
  return remaining < minValidityMs;
}

export interface ExpiryDecision {
  expiresAt: number;
  /** Vrai seulement si l'échéance sort de `mediaExpiresAt` ; faux pour un repli local. */
  fromResponse: boolean;
}

/** L'échéance des URLs, et d'où elle vient. */
export function computeExpiry(mediaExpiresAt: string | undefined, now: number): ExpiryDecision {
  if (mediaExpiresAt) {
    const parsed = Date.parse(mediaExpiresAt);
    if (Number.isFinite(parsed)) {
      const expiresAt = parsed - EXPIRY_MARGIN_MS;
      if (expiresAt > now) return { expiresAt, fromResponse: true };
      // Déjà passé ou sous la marge (horloge du poste en avance, réponse
      // tardive) : repli court, jamais « déjà périmé ».
      return { expiresAt: now + STALE_FALLBACK_TTL_MS, fromResponse: false };
    }
  }
  return { expiresAt: now + DEFAULT_TTL_MS, fromResponse: false };
}

/** Exporté pour les épreuves ; le lecteur n'en a pas besoin. */
export function computeExpiresAt(mediaExpiresAt: string | undefined, now: number): number {
  return computeExpiry(mediaExpiresAt, now).expiresAt;
}

export function useSceneAudio(tourId: string): SceneAudioSource {
  const { isAuthenticated } = useAuth();
  const refreshTick = usePurchasesRefreshTick();
  const cacheRef = useRef<SceneAudioCache | null>(null);
  const inflightRef = useRef<Promise<SceneUrls | null> | null>(null);
  // Une réponse en vol au moment d'un changement d'identité, de visite ou
  // d'achat ne doit pas repeupler le cache qu'on vient d'oublier.
  const generationRef = useRef(0);
  const logoutGenerationRef = useRef(0);

  useEffect(() => {
    const clear = () => {
      logoutGenerationRef.current += 1;
      generationRef.current += 1;
      cacheRef.current = null;
      inflightRef.current = null;
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === RESUME_CLEAR_KEY) clear();
    };
    window.addEventListener(RESUME_CLEAR_EVENT, clear);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RESUME_CLEAR_EVENT, clear);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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
      const logoutGeneration = logoutGenerationRef.current;
      let promise: Promise<SceneUrls | null> | null = null;
      promise = (async (): Promise<SceneUrls | null> => {
        try {
          const { getPublishedTourContent } = await import('@/lib/api/appsync-client');
          const result = await getPublishedTourContent(tourId);
          if (logoutGeneration !== logoutGenerationRef.current) return null;
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
          const expiry = computeExpiry(result.data.mediaExpiresAt, Date.now());
          // La couverture ne change pas d'une réponse à l'autre : une réponse
          // qui ne la porte pas ne l'a pas retirée, et la Media Session ne doit
          // pas perdre son image au premier renouvellement d'URLs.
          const coverUrl = result.data.coverUrl ?? cacheRef.current?.coverUrl;
          cacheRef.current = {
            urlsBySceneId,
            expiresAt: expiry.expiresAt,
            fromResponse: expiry.fromResponse,
            ...(coverUrl ? { coverUrl } : {}),
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

  const ensureFresh = useCallback(
    async (options: EnsureFreshOptions = {}): Promise<EnsureFreshResult> => {
      const cache = cacheRef.current;
      if (cache && !isStale(cache.expiresAt, Date.now(), options.minValidityMs, cache.fromResponse)) {
        return { urls: cache.urlsBySceneId, outcome: 'cached' };
      }
      const outcome: EnsureFreshOutcome = cache ? 'refreshed' : 'requested';
      const urls = await request();
      if (urls === null) {
        // La redemande a échoué. Si ce qui est en mémoire n'est pas périmé au
        // sens strict — c'est le cas d'une frontière de piste qui exigeait une
        // validité plus longue —, on joue avec : mourir sur « indisponible »
        // avec des URLs utilisables serait un faux négatif. Le cache est relu
        // ici : un changement d'identité pendant le vol l'a peut-être oublié.
        const cached = cacheRef.current;
        if (cached && !isStale(cached.expiresAt, Date.now())) {
          logger.warn(SERVICE_NAME, 'refresh failed, serving cached urls', { tourId });
          return { urls: cached.urlsBySceneId, outcome };
        }
      }
      return { urls, outcome };
    },
    [request, tourId],
  );

  const refetch = useCallback((): Promise<SceneUrls | null> => request(), [request]);

  const readCoverUrl = useCallback((): string | undefined => cacheRef.current?.coverUrl, []);

  return useMemo(
    () => ({ ensureFresh, refetch, readCoverUrl }),
    [ensureFresh, refetch, readCoverUrl],
  );
}

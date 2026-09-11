/**
 * Limitation de débit PAR COMPTE pour le proxy du microservice.
 *
 * ─── Pourquoi ───────────────────────────────────────────────────────────────
 * Le microservice tourne sur une seule instance CPU. Sa seule contre-pression
 * est une file GLOBALE (`MAX_INFLIGHT_JOBS`) qui rend 429 à TOUT LE MONDE une
 * fois pleine : un seul compte qui boucle sur `v1/translate/batch` — chemin non
 * facturé, donc sans plafond de dépense — mettait la traduction et la synthèse
 * hors service pour tous les guides. La victime était tout le monde sauf
 * l'auteur.
 *
 * Ce seau à jetons pose une borne par `sub` vérifié, AVANT le relais. Il est en
 * mémoire : le portail est une instance unique sur le VPS, et une borne perdue
 * au redémarrage n'est qu'une borne réarmée.
 *
 * Le chemin facturant (`v1/tts/generate`) a déjà sa borne — l'enveloppe de
 * dépense — et n'est pas concerné.
 */

export interface RateLimitVerdict {
  allowed: boolean;
  /** Jetons restants après cette demande (0 si refusée). */
  remaining: number;
  /** Secondes avant qu'un jeton se libère, pour `Retry-After`. */
  retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimiterOptions {
  /** Capacité du seau — le nombre de demandes acceptées en rafale. */
  capacity: number;
  /** Fenêtre de remplissage complet, en millisecondes. */
  refillWindowMs: number;
  /** Au-delà, un seau inactif est oublié (sinon la Map grossit avec chaque sub). */
  idleEvictionMs?: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private readonly idleEvictionMs: number;
  private lastSweep = 0;

  constructor({ capacity, refillWindowMs, idleEvictionMs = refillWindowMs * 3 }: RateLimiterOptions) {
    this.capacity = capacity;
    this.refillPerMs = capacity / refillWindowMs;
    this.idleEvictionMs = idleEvictionMs;
  }

  /** Tente de consommer un jeton pour `key`. */
  consume(key: string, now = Date.now()): RateLimitVerdict {
    this.sweep(now);
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    const refilled = Math.min(this.capacity, bucket.tokens + (now - bucket.updatedAt) * this.refillPerMs);

    if (refilled >= 1) {
      this.buckets.set(key, { tokens: refilled - 1, updatedAt: now });
      return { allowed: true, remaining: Math.floor(refilled - 1), retryAfterSeconds: 0 };
    }

    this.buckets.set(key, { tokens: refilled, updatedAt: now });
    const missing = 1 - refilled;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(missing / this.refillPerMs / 1000)),
    };
  }

  /** Oublie les seaux inactifs — au plus une fois par fenêtre d'éviction. */
  private sweep(now: number): void {
    if (now - this.lastSweep < this.idleEvictionMs) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.updatedAt > this.idleEvictionMs) this.buckets.delete(key);
    }
  }

  /** Exposé pour les épreuves. */
  size(): number {
    return this.buckets.size;
  }
}

/**
 * Borne des chemins NON facturés du proxy : 30 soumissions par 10 minutes et
 * par compte. Un guide qui traduit une visite de 10 scènes en 5 langues n'en
 * consomme que 5 (une par langue, par lot) ; 30 laisse une marge large à
 * l'usage réel et ferme la porte à la boucle.
 */
export const microserviceRateLimiter = new RateLimiter({
  capacity: 30,
  refillWindowMs: 10 * 60_000,
});

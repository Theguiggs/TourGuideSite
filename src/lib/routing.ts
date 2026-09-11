/**
 * Walking route service using OpenRouteService (foot-hiking profile).
 * Returns actual street-level walking paths between waypoints.
 * Falls back to straight lines if the service is unavailable.
 *
 * Profile rationale: foot-hiking includes sentiers, escaliers, paths and
 * footways that the standard `foot-walking` profile sometimes skips —
 * better for historic centres and trail-style audio tours.
 */

import { logger } from './logger';
import { getMicroserviceHeaders } from '@/lib/api/microservice-config';

const SERVICE_NAME = 'RoutingService';
/**
 * Le tracé passe par le relais serveur `/api/routing` : la clé OpenRouteService
 * vivait dans `NEXT_PUBLIC_ORS_API_KEY`, donc dans le JavaScript servi à tout
 * visiteur, et son quota pouvait être vidé par un tiers — les itinéraires du
 * Studio retombaient alors en ligne droite. Elle est désormais côté serveur
 * (`ORS_API_KEY`), derrière l'authentification guide et la borne par compte.
 */
const ROUTING_ENDPOINT = '/api/routing';

export interface RouteSegment {
  /** Polyline coordinates for this segment */
  path: { lat: number; lng: number }[];
  /** Actual walking distance in meters */
  distanceMeters: number;
  /** Estimated walking duration in seconds */
  durationSeconds: number;
}

// Cache keyed by "lat1,lng1|lat2,lng2" — avoids re-fetching for the same segment
const routeCache = new Map<string, RouteSegment>();

function cacheKey(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const r = (n: number) => n.toFixed(5);
  return `${r(from.lat)},${r(from.lng)}|${r(to.lat)},${r(to.lng)}`;
}

/**
 * Fetch a walking route between two points from OpenRouteService.
 */
export async function getWalkingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteSegment> {
  const key = cacheKey(from, to);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const fallback: RouteSegment = {
    path: [from, to],
    distanceMeters: haversineM(from.lat, from.lng, to.lat, to.lng),
    durationSeconds: 0,
  };

  let headers: Record<string, string>;
  try {
    headers = await getMicroserviceHeaders();
  } catch {
    logger.warn(SERVICE_NAME, 'No authenticated session — using straight-line fallback');
    routeCache.set(key, fallback);
    return fallback;
  }

  try {
    const res = await fetch(ROUTING_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ from, to }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn(SERVICE_NAME, 'ORS returned non-ok', { status: res.status, body: body.slice(0, 200) });
      routeCache.set(key, fallback);
      return fallback;
    }

    const data = (await res.json()) as {
      features?: Array<{
        geometry: { type: 'LineString'; coordinates: [number, number][] };
        properties?: { summary?: { distance: number; duration: number } };
      }>;
    };

    const feature = data.features?.[0];
    if (!feature) {
      logger.warn(SERVICE_NAME, 'ORS no route found');
      routeCache.set(key, fallback);
      return fallback;
    }

    const segment: RouteSegment = {
      path: feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: feature.properties?.summary?.distance ?? 0,
      durationSeconds: feature.properties?.summary?.duration ?? 0,
    };
    routeCache.set(key, segment);
    return segment;
  } catch (e) {
    logger.warn(SERVICE_NAME, 'ORS fetch failed, using straight line', { error: String(e) });
    routeCache.set(key, fallback);
    return fallback;
  }
}

/**
 * Fetch walking routes for a full ordered list of waypoints.
 * Returns one RouteSegment per consecutive pair.
 */
export async function getFullWalkingRoute(
  points: { lat: number; lng: number }[],
): Promise<{ segments: RouteSegment[]; totalDistanceMeters: number; totalDurationSeconds: number }> {
  if (points.length < 2) {
    return { segments: [], totalDistanceMeters: 0, totalDurationSeconds: 0 };
  }

  const promises = [];
  for (let i = 0; i < points.length - 1; i++) {
    promises.push(getWalkingRoute(points[i], points[i + 1]));
  }
  const segments = await Promise.all(promises);

  const totalDistanceMeters = segments.reduce((s, seg) => s + seg.distanceMeters, 0);
  const totalDurationSeconds = segments.reduce((s, seg) => s + seg.durationSeconds, 0);

  return { segments, totalDistanceMeters, totalDurationSeconds };
}

export function clearRouteCache(): void {
  routeCache.clear();
}

export function invalidatePoint(lat: number, lng: number): void {
  const r = (n: number) => n.toFixed(5);
  const prefix = `${r(lat)},${r(lng)}`;
  for (const key of routeCache.keys()) {
    if (key.includes(prefix)) {
      routeCache.delete(key);
    }
  }
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

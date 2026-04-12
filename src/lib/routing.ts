/**
 * Walking route service using OSRM (Open Source Routing Machine).
 * Returns actual street-level walking paths between waypoints.
 * Falls back to straight lines if the service is unavailable.
 */

import { logger } from './logger';

const SERVICE_NAME = 'RoutingService';
const OSRM_BASE = 'https://router.project-osrm.org';

export interface RouteSegment {
  /** Decoded polyline coordinates for this segment */
  path: { lat: number; lng: number }[];
  /** Actual walking distance in meters */
  distanceMeters: number;
  /** Estimated walking duration in seconds */
  durationSeconds: number;
}

// Cache keyed by "lat1,lng1|lat2,lng2" — avoids re-fetching for the same segment
const routeCache = new Map<string, RouteSegment>();

function cacheKey(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  // Round to 5 decimals (~1m precision) for stable cache keys
  const r = (n: number) => n.toFixed(5);
  return `${r(from.lat)},${r(from.lng)}|${r(to.lat)},${r(to.lng)}`;
}

/**
 * Decode an OSRM/Google-style encoded polyline string into coordinates.
 * See: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Fetch a walking route between two points from OSRM.
 * Returns decoded path + distance + duration.
 */
export async function getWalkingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteSegment> {
  const key = cacheKey(from, to);
  const cached = routeCache.get(key);
  if (cached) return cached;

  // Straight-line fallback
  const fallback: RouteSegment = {
    path: [from, to],
    distanceMeters: haversineM(from.lat, from.lng, to.lat, to.lng),
    durationSeconds: 0,
  };

  try {
    // OSRM expects lng,lat order
    const url = `${OSRM_BASE}/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`;
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(SERVICE_NAME, 'OSRM returned non-ok', { status: res.status });
      routeCache.set(key, fallback);
      return fallback;
    }

    const data = await res.json() as {
      code: string;
      routes?: { geometry: string; distance: number; duration: number }[];
    };

    if (data.code !== 'Ok' || !data.routes?.length) {
      logger.warn(SERVICE_NAME, 'OSRM no route found', { code: data.code });
      routeCache.set(key, fallback);
      return fallback;
    }

    const route = data.routes[0];
    const segment: RouteSegment = {
      path: decodePolyline(route.geometry),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };

    routeCache.set(key, segment);
    return segment;
  } catch (e) {
    logger.warn(SERVICE_NAME, 'OSRM fetch failed, using straight line', { error: String(e) });
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

  // Fetch all segments in parallel
  const promises = [];
  for (let i = 0; i < points.length - 1; i++) {
    promises.push(getWalkingRoute(points[i], points[i + 1]));
  }
  const segments = await Promise.all(promises);

  const totalDistanceMeters = segments.reduce((s, seg) => s + seg.distanceMeters, 0);
  const totalDurationSeconds = segments.reduce((s, seg) => s + seg.durationSeconds, 0);

  return { segments, totalDistanceMeters, totalDurationSeconds };
}

/** Clear the route cache (e.g. when POIs change significantly) */
export function clearRouteCache(): void {
  routeCache.clear();
}

/** Invalidate cache entries involving a specific point (after drag) */
export function invalidatePoint(lat: number, lng: number): void {
  const r = (n: number) => n.toFixed(5);
  const prefix = `${r(lat)},${r(lng)}`;
  for (const key of routeCache.keys()) {
    if (key.includes(prefix)) {
      routeCache.delete(key);
    }
  }
}

// Internal haversine for fallback distance
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

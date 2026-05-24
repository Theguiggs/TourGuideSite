/**
 * Path utilities for the manual itinerary tracer.
 * - simplifyPath: Douglas-Peucker decimation, keeps shape while killing redundant points.
 * - parseGpx: extracts an ordered list of coords from a .gpx file (first track or route).
 * - pathDistanceMeters: cumulative haversine distance along a polyline.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pathDistanceMeters(path: LatLng[]): number {
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) d += haversineMeters(path[i], path[i + 1]);
  return d;
}

/**
 * Perpendicular distance from point p to segment ab, in degrees-as-meters approximation.
 * Good enough for small-scale simplification — we're talking <2 km tours.
 */
function perpendicularDistance(p: LatLng, a: LatLng, b: LatLng): number {
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;
  const px = p.lng;
  const py = p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const cx = ax + Math.max(0, Math.min(1, t)) * dx;
  const cy = ay + Math.max(0, Math.min(1, t)) * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Douglas-Peucker simplification. epsilon is in lat/lng degrees:
 *   ~0.00001 ≈ 1.1 m at the equator — fine for walking paths.
 */
export function simplifyPath(points: LatLng[], epsilon = 0.00001): LatLng[] {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx >= 0 && maxDist > epsilon) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }
  const out: LatLng[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/**
 * Parse a GPX XML string and return the first track/segment as an ordered list.
 * Falls back to <rte><rtept> if no track is found.
 * Returns [] when nothing usable is present (caller decides what to do).
 */
export function parseGpx(xml: string): LatLng[] {
  if (typeof DOMParser === 'undefined') return [];
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return [];
  }
  // Reject anything that didn't actually parse to an XML doc.
  if (doc.getElementsByTagName('parsererror').length > 0) return [];

  const collect = (tag: string): LatLng[] => {
    const nodes = doc.getElementsByTagName(tag);
    const out: LatLng[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const lat = parseFloat(nodes[i].getAttribute('lat') ?? '');
      const lng = parseFloat(nodes[i].getAttribute('lon') ?? '');
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) out.push({ lat, lng });
    }
    return out;
  };

  const trkpts = collect('trkpt');
  if (trkpts.length >= 2) return trkpts;
  const rtepts = collect('rtept');
  if (rtepts.length >= 2) return rtepts;
  return [];
}

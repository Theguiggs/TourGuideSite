export interface Coordinate { latitude: number; longitude: number }
export interface MapStop extends Coordinate { id: string; order: number; title: string; locked: boolean; listenable: boolean }
export function validCoordinate(point: Coordinate): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function nearestStop(stops: readonly MapStop[], position: Coordinate) {
  if (!validCoordinate(position)) return null;
  let best: { stop: MapStop; distance: number } | null = null;
  for (const stop of stops) {
    if (!validCoordinate(stop)) continue;
    const distance = distanceMeters(position, stop);
    if (!best || distance < best.distance) best = { stop, distance };
  }
  return best;
}

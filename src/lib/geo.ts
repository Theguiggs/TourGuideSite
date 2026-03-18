/** Haversine distance between two GPS coordinates in kilometers */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Total route distance from ordered POIs */
export function totalRouteDistance(
  pois: { latitude: number; longitude: number }[],
): number {
  let total = 0;
  for (let i = 1; i < pois.length; i++) {
    total += haversineDistance(
      pois[i - 1].latitude,
      pois[i - 1].longitude,
      pois[i].latitude,
      pois[i].longitude,
    );
  }
  return Math.round(total * 100) / 100;
}

/** Estimated walking time in minutes (average 5 km/h) */
export function estimatedWalkingTime(distanceKm: number): number {
  return Math.round((distanceKm / 5) * 60);
}

/** A point on the map (WGS84 degrees). */
export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ranking bucket: 0 = 0–5 km, 1 = 5–10 km, 2 = 10–20 km, 3 = 20+ km. */
export function distanceBucket(km: number): number {
  if (km <= 5) return 0;
  if (km <= 10) return 1;
  if (km <= 20) return 2;
  return 3;
}

/** Rounds a distance to one decimal for display. */
export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

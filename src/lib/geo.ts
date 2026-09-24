const EARTH_RADIUS_KM = 6371;

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Polygone approchant un cercle, pour dessiner le périmètre sur la carte. */
export function circlePolygon(lat: number, lon: number, radiusKm: number, steps = 96) {
  const coords: [number, number][] = [];
  const latR = radiusKm / 110.574;
  const lonR = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    coords.push([lon + lonR * Math.cos(t), lat + latR * Math.sin(t)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}

export function circleBounds(lat: number, lon: number, radiusKm: number): [[number, number], [number, number]] {
  const latR = radiusKm / 110.574;
  const lonR = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [
    [lon - lonR, lat - latR],
    [lon + lonR, lat + latR],
  ];
}

/** Rayon maximal de recherche, et rayon chargé d’un coup pour un curseur instantané. */
export const MAX_RADIUS_KM = 50;
export const DEFAULT_RADIUS_KM = 10;

/** Détour maximal autour d'un itinéraire. */
export const DEFAULT_CORRIDOR_KM = 3;
export const MAX_CORRIDOR_KM = 10;
/** Points maximum acceptés par l'API (l'itinéraire est simplifié côté client). */
export const MAX_ROUTE_POINTS = 6000;

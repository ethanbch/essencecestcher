import type { Place } from "./geocode";

/** Calcul d'itinéraire via la Géoplateforme de l'IGN (gratuit, sans clé). */
const ROUTE_URL = "https://data.geopf.fr/navigation/itineraire";

export type Route = {
  coords: [number, number][];
  distanceKm: number;
  durationMin: number;
  bbox: [number, number, number, number];
};

export async function fetchRoute(from: Place, to: Place, signal?: AbortSignal): Promise<Route> {
  const params = new URLSearchParams({
    resource: "bdtopo-osrm",
    profile: "car",
    optimization: "fastest",
    start: `${from.lon},${from.lat}`,
    end: `${to.lon},${to.lat}`,
    geometryFormat: "geojson",
    getSteps: "false",
    distanceUnit: "kilometer",
    timeUnit: "minute",
  });
  const res = await fetch(`${ROUTE_URL}?${params}`, { signal });
  if (!res.ok) throw new Error("Aucun itinéraire trouvé entre ces deux adresses.");
  const json = (await res.json()) as {
    distance: number;
    duration: number;
    bbox: [number, number, number, number];
    geometry: { coordinates: [number, number][] };
  };
  if (!json.geometry?.coordinates?.length) throw new Error("Aucun itinéraire trouvé entre ces deux adresses.");
  return {
    coords: json.geometry.coordinates,
    distanceKm: json.distance,
    durationMin: json.duration,
    bbox: json.bbox,
  };
}

/** Simplification Douglas-Peucker (tolérance en degrés, ~0,0005° ≈ 50 m). */
export function simplify(coords: [number, number][], tolerance = 0.0005): [number, number][] {
  if (coords.length <= 2) return coords;
  const keep = new Uint8Array(coords.length);
  keep[0] = keep[coords.length - 1] = 1;
  const stack: [number, number][] = [[0, coords.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = coords[a];
    const [bx, by] = coords[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = coords[i];
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const ex = px - (ax + t * dx);
      const ey = py - (ay + t * dy);
      const d = ex * ex + ey * ey;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > tol2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

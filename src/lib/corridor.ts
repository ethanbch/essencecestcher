import type { Station, TripStation } from "./types";

type LonLat = [number, number];

const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LON_EQ = 111.32;
/** Taille des cellules de l'index spatial, en degrés. */
const CELL = 0.1;

const cellKey = (x: number, y: number) => `${x}:${y}`;

/**
 * Stations situées à moins de `corridorKm` de l'itinéraire.
 * Pour chacune : distance à la route (`distanceKm`) et position le long du trajet (`alongKm`).
 */
export function stationsAlongRoute(
  stations: Station[],
  coords: LonLat[],
  corridorKm: number,
  routeLengthKm?: number,
): TripStation[] {
  if (coords.length < 2) return [];

  // Longueur cumulée de chaque segment (approximation équirectangulaire locale, précise à ces échelles).
  const segs: { ax: number; ay: number; bx: number; by: number; kx: number; len: number; start: number }[] = [];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = coords[i];
    const [bx, by] = coords[i + 1];
    const kx = KM_PER_DEG_LON_EQ * Math.cos((((ay + by) / 2) * Math.PI) / 180);
    const len = Math.hypot((bx - ax) * kx, (by - ay) * KM_PER_DEG_LAT);
    segs.push({ ax, ay, bx, by, kx, len, start: total });
    total += len;
  }
  // On recale sur la distance officielle de l'itinéraire si on la connaît.
  const scale = routeLengthKm && total > 0 ? routeLengthKm / total : 1;

  // Index spatial : chaque cellule connaît les segments qui passent à moins de corridorKm.
  const grid = new Map<string, number[]>();
  const padLat = corridorKm / KM_PER_DEG_LAT;
  segs.forEach((s, idx) => {
    const padLon = corridorKm / s.kx;
    const x0 = Math.floor((Math.min(s.ax, s.bx) - padLon) / CELL);
    const x1 = Math.floor((Math.max(s.ax, s.bx) + padLon) / CELL);
    const y0 = Math.floor((Math.min(s.ay, s.by) - padLat) / CELL);
    const y1 = Math.floor((Math.max(s.ay, s.by) + padLat) / CELL);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const key = cellKey(x, y);
        const list = grid.get(key);
        if (list) list.push(idx);
        else grid.set(key, [idx]);
      }
    }
  });

  const out: TripStation[] = [];
  for (const st of stations) {
    const candidates = grid.get(cellKey(Math.floor(st.lon / CELL), Math.floor(st.lat / CELL)));
    if (!candidates) continue;
    let best = Infinity;
    let along = 0;
    for (const idx of candidates) {
      const s = segs[idx];
      // Projection du point sur le segment, dans un repère en km centré sur A.
      const dx = (s.bx - s.ax) * s.kx;
      const dy = (s.by - s.ay) * KM_PER_DEG_LAT;
      const px = (st.lon - s.ax) * s.kx;
      const py = (st.lat - s.ay) * KM_PER_DEG_LAT;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
      const d = Math.hypot(px - t * dx, py - t * dy);
      if (d < best) {
        best = d;
        along = s.start + t * s.len;
      }
    }
    if (best <= corridorKm) {
      out.push({
        ...st,
        distanceKm: Math.round(best * 100) / 100,
        alongKm: Math.round(along * scale * 10) / 10,
      });
    }
  }
  return out.sort((a, b) => a.alongKm - b.alongKm);
}

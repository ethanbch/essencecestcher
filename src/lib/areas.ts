import { FUELS, type FuelId } from "./fuels";
import { cleanCityName, departmentOf, REGIONS, regionOfDepartment, slugify, type Region } from "./geo-fr";
import { distanceKm } from "./geo";
import { usablePrice } from "./ranking";
import type { Dataset, Station } from "./types";

/**
 * Agrégats par ville et par région, pour les pages SEO.
 * Une ville a sa page à partir de MIN_STATIONS stations (en dessous : contenu trop mince).
 */
export const MIN_STATIONS = 2;

export type FuelStats = { avg: number; min: number; max: number; count: number; minStationId: string };
export type Stats = Partial<Record<FuelId, FuelStats>>;

export type City = {
  /** Identifiant d'URL unique : « lyon-69 ». */
  slug: string;
  name: string;
  department: string;
  region: Region;
  lat: number;
  lon: number;
  stations: Station[];
  stats: Stats;
};

export type RegionArea = {
  region: Region;
  cities: City[];
  stations: Station[];
  stationCount: number;
  stats: Stats;
};

export type AreaIndex = {
  fetchedAt: string;
  national: Stats;
  stationCount: number;
  regions: RegionArea[];
  cities: Map<string, City>;
};

export function computeStats(stations: Station[], now: number): Stats {
  const stats: Stats = {};
  for (const { id: fuel } of FUELS) {
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    let minStationId = "";
    for (const s of stations) {
      const p = usablePrice(s, fuel, now);
      if (!p) continue;
      sum += p.value;
      count++;
      if (p.value < min) {
        min = p.value;
        minStationId = s.id;
      }
      if (p.value > max) max = p.value;
    }
    if (count > 0) stats[fuel] = { avg: sum / count, min, max, count, minStationId };
  }
  return stats;
}

let memo: { key: string; index: AreaIndex } | null = null;

export function buildAreaIndex(dataset: Dataset): AreaIndex {
  if (memo?.key === dataset.fetchedAt) return memo.index;
  // Fraîcheur des prix jugée à la date du relevé : la page reste cohérente jusqu'au suivant.
  const now = new Date(dataset.fetchedAt).getTime();

  const groups = new Map<string, { names: Map<string, number>; department: string; region: Region; stations: Station[] }>();
  for (const s of dataset.stations) {
    const department = departmentOf(s.postcode);
    const region = department ? regionOfDepartment(department) : null;
    if (!department || !region) continue;
    const name = cleanCityName(s.city);
    const base = slugify(name);
    if (!base) continue;
    const slug = `${base}-${department.toLowerCase()}`;
    let g = groups.get(slug);
    if (!g) groups.set(slug, (g = { names: new Map(), department, region, stations: [] }));
    g.names.set(name, (g.names.get(name) ?? 0) + 1);
    g.stations.push(s);
  }

  const cities = new Map<string, City>();
  for (const [slug, g] of groups) {
    if (g.stations.length < MIN_STATIONS) continue;
    // Graphie la plus fréquente (« Saint-Étienne » plutôt que « ST ETIENNE »).
    const name = [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0];
    cities.set(slug, {
      slug,
      name,
      department: g.department,
      region: g.region,
      lat: g.stations.reduce((a, s) => a + s.lat, 0) / g.stations.length,
      lon: g.stations.reduce((a, s) => a + s.lon, 0) / g.stations.length,
      stations: g.stations,
      stats: computeStats(g.stations, now),
    });
  }

  const regions: RegionArea[] = REGIONS.map((region) => {
    const stations = dataset.stations.filter((s) => {
      const d = departmentOf(s.postcode);
      return d !== null && region.departments.includes(d);
    });
    return {
      region,
      cities: [...cities.values()].filter((c) => c.region.slug === region.slug).sort((a, b) => b.stations.length - a.stations.length),
      stations,
      stationCount: stations.length,
      stats: computeStats(stations, now),
    };
  }).filter((r) => r.stationCount > 0);

  const index: AreaIndex = {
    fetchedAt: dataset.fetchedAt,
    national: computeStats(dataset.stations, now),
    stationCount: dataset.stations.length,
    regions,
    cities,
  };
  memo = { key: dataset.fetchedAt, index };
  return index;
}

/** Villes indexées les plus proches (hors elle-même). */
export function nearbyCities(index: AreaIndex, city: City, limit = 8): (City & { distanceKm: number })[] {
  return [...index.cities.values()]
    .filter((c) => c.slug !== city.slug)
    .map((c) => ({ ...c, distanceKm: distanceKm(city.lat, city.lon, c.lat, c.lon) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** Grandes villes (par nombre de stations), pour le maillage depuis l'accueil. */
export function topCities(index: AreaIndex, limit = 12): City[] {
  return [...index.cities.values()].sort((a, b) => b.stations.length - a.stations.length).slice(0, limit);
}

export const cityPath = (c: City) => `/prix-carburant/${c.region.slug}/${c.slug}`;
export const regionPath = (r: Region) => `/prix-carburant/${r.slug}`;

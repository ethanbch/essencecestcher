import { DEFAULT_RANKING_FUEL, MAX_PRICE_AGE_DAYS, type FuelId } from "./fuels";
import type { NearbyStation, PriceEntry, Station } from "./types";

export type SortMode = "price" | "distance" | "cost";

export type Vehicle = {
  /** Consommation moyenne, L/100 km. */
  consumption: number;
  /** Litres mis dans le réservoir à chaque plein. */
  liters: number;
  /** Compter le retour à la maison dans le coût du trajet. */
  roundTrip: boolean;
};

export const DEFAULT_VEHICLE: Vehicle = { consumption: 6.5, liters: 40, roundTrip: true };

/** Coefficient moyen distance à vol d'oiseau → distance par la route. */
export const ROAD_FACTOR = 1.3;

/** Volume d'un plein type, pour exprimer l'écart de prix en euros. */
export const TYPICAL_TANK_LITERS = 50;

const MAX_AGE_MS = MAX_PRICE_AGE_DAYS * 86_400_000;

export function usablePrice(station: Station, fuel: FuelId, now = Date.now()): PriceEntry | null {
  const p = station.prices[fuel];
  if (!p) return null;
  if (station.outages[fuel]) return null;
  if (now - new Date(p.updatedAt).getTime() > MAX_AGE_MS) return null;
  return p;
}

export type CostBreakdown = { fuel: number; trip: number; total: number; tripKm: number };

export function fillCost(price: number, distanceKm: number, v: Vehicle): CostBreakdown {
  const tripKm = distanceKm * ROAD_FACTOR * (v.roundTrip ? 2 : 1);
  const fuel = price * v.liters;
  const trip = (tripKm * v.consumption * price) / 100;
  return { fuel, trip, total: fuel + trip, tripKm };
}

export type RankedStation = {
  station: NearbyStation;
  price: PriceEntry;
  /** Écart avec la moins chère, en €/L. */
  diff: number;
  /** 0 = moins chère, 1 = plus chère du périmètre. */
  tier: number;
  cost: CostBreakdown | null;
  rank: number;
};

export type Ranking = {
  rankingFuel: FuelId;
  fuelChosen: boolean;
  ranked: RankedStation[];
  /** Stations du périmètre sans prix exploitable pour le carburant de classement. */
  unranked: NearbyStation[];
  staleCount: number;
  outageCount: number;
  notSoldCount: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  total: number;
};

export function rankStations(
  stations: NearbyStation[],
  opts: {
    radiusKm: number;
    fuel: FuelId | null;
    sort: SortMode;
    vehicle: Vehicle | null;
    now?: number;
  },
): Ranking {
  const now = opts.now ?? Date.now();
  const rankingFuel = opts.fuel ?? DEFAULT_RANKING_FUEL;
  const inRadius = stations.filter((s) => s.distanceKm <= opts.radiusKm);

  const withPrice: { station: NearbyStation; price: PriceEntry }[] = [];
  const unranked: NearbyStation[] = [];
  let staleCount = 0;
  let outageCount = 0;
  let notSoldCount = 0;

  for (const s of inRadius) {
    const price = usablePrice(s, rankingFuel, now);
    if (price) {
      withPrice.push({ station: s, price });
      continue;
    }
    unranked.push(s);
    if (s.outages[rankingFuel]) outageCount++;
    else if (s.prices[rankingFuel]) staleCount++;
    else notSoldCount++;
  }

  const values = withPrice.map((x) => x.price.value);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const span = min !== null && max !== null ? max - min : 0;

  const ranked: RankedStation[] = withPrice.map(({ station, price }) => ({
    station,
    price,
    diff: min !== null ? price.value - min : 0,
    tier: span > 0 && min !== null ? (price.value - min) / span : 0,
    cost: opts.vehicle ? fillCost(price.value, station.distanceKm, opts.vehicle) : null,
    rank: 0,
  }));

  const byDistance = (a: RankedStation, b: RankedStation) => a.station.distanceKm - b.station.distanceKm;
  const byPrice = (a: RankedStation, b: RankedStation) => a.price.value - b.price.value || byDistance(a, b);
  const byCost = (a: RankedStation, b: RankedStation) =>
    (a.cost?.total ?? 0) - (b.cost?.total ?? 0) || byPrice(a, b);

  ranked.sort(opts.sort === "distance" ? byDistance : opts.sort === "cost" && opts.vehicle ? byCost : byPrice);
  ranked.forEach((r, i) => (r.rank = i + 1));

  return {
    rankingFuel,
    fuelChosen: opts.fuel !== null,
    ranked,
    unranked,
    staleCount,
    outageCount,
    notSoldCount,
    min,
    max,
    avg,
    total: inRadius.length,
  };
}

/** Couleur d'un prix selon sa position entre le moins cher et le plus cher (hex : utilisable par MapLibre). */
export function tierHex(tier: number): string {
  if (tier <= 0.2) return "#16a34a";
  if (tier <= 0.5) return "#65a30d";
  if (tier <= 0.8) return "#d97706";
  return "#dc2626";
}

export const tierColor = tierHex;

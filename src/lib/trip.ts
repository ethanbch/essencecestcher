import { DEFAULT_RANKING_FUEL, type FuelId } from "./fuels";
import { ROAD_FACTOR, usablePrice, type RankedStation } from "./ranking";
import type { TripStation } from "./types";

export type TripSort = "best" | "price" | "along";

export type TripOptions = {
  fuel: FuelId | null;
  sort: TripSort;
  /** L/100 km */
  consumption: number;
  roundTrip: boolean;
  routeKm: number;
  now: number;
};

export type TripRanked = RankedStation & { station: TripStation; detourKm: number };

export type TripRanking = {
  rankingFuel: FuelId;
  fuelChosen: boolean;
  /** Distance totale parcourue (aller-retour compris). */
  totalKm: number;
  /** Litres consommés sur le trajet. */
  liters: number;
  ranked: TripRanked[];
  recommended: TripRanked | null;
  unranked: TripStation[];
  min: number | null;
  max: number | null;
  avg: number | null;
  /** Économie de la station recommandée par rapport au prix moyen du trajet, détour déduit. */
  savingVsAvg: number | null;
};

/**
 * Classe les stations d'un trajet. La recommandation minimise :
 * prix × litres du trajet + carburant brûlé pour le détour (aller-retour depuis la route).
 */
export function rankTrip(stations: TripStation[], o: TripOptions): TripRanking {
  const rankingFuel = o.fuel ?? DEFAULT_RANKING_FUEL;
  const totalKm = o.routeKm * (o.roundTrip ? 2 : 1);
  const liters = (totalKm * o.consumption) / 100;

  const ranked: TripRanked[] = [];
  const unranked: TripStation[] = [];
  for (const station of stations) {
    const price = usablePrice(station, rankingFuel, o.now);
    if (!price) {
      unranked.push(station);
      continue;
    }
    const detourKm = 2 * station.distanceKm * ROAD_FACTOR;
    const fuelCost = price.value * liters;
    const detourCost = (detourKm * o.consumption * price.value) / 100;
    ranked.push({
      station,
      price,
      detourKm,
      diff: 0,
      tier: 0,
      cost: { fuel: fuelCost, trip: detourCost, total: fuelCost + detourCost, tripKm: detourKm },
      rank: 0,
    });
  }

  const values = ranked.map((r) => r.price.value);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const span = min !== null && max !== null ? max - min : 0;
  for (const r of ranked) {
    r.diff = min !== null ? r.price.value - min : 0;
    r.tier = span > 0 && min !== null ? (r.price.value - min) / span : 0;
  }

  const byTotal = (a: TripRanked, b: TripRanked) => a.cost!.total - b.cost!.total || a.station.alongKm - b.station.alongKm;
  const recommended = ranked.length ? [...ranked].sort(byTotal)[0] : null;

  if (o.sort === "along") ranked.sort((a, b) => a.station.alongKm - b.station.alongKm);
  else if (o.sort === "price") ranked.sort((a, b) => a.price.value - b.price.value || a.detourKm - b.detourKm);
  else ranked.sort(byTotal);
  ranked.forEach((r, i) => (r.rank = i + 1));

  const savingVsAvg = recommended && avg !== null ? (avg - recommended.price.value) * liters - recommended.cost!.trip : null;

  return {
    rankingFuel,
    fuelChosen: o.fuel !== null,
    totalKm,
    liters,
    ranked,
    recommended,
    unranked,
    min,
    max,
    avg,
    savingVsAvg,
  };
}

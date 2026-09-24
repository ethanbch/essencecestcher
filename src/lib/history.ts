import { FUELS, type FuelId } from "./fuels";
import type { AreaIndex, Stats } from "./areas";

/**
 * Historique quotidien des prix moyens (national, régions, villes indexées), en millièmes d'euro.
 * Une valeur par jour et par carburant ; null si pas de prix ce jour-là.
 */
export const HISTORY_DAYS = 35;

type Series = Partial<Record<FuelId, (number | null)[]>>;

export type History = {
  days: string[];
  national: Series;
  regions: Record<string, Series>;
  cities: Record<string, Series>;
};

export const emptyHistory = (): History => ({ days: [], national: {}, regions: {}, cities: {} });

const parisDay = (iso: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/** Ajoute (ou remplace) le point du jour, puis tronque à HISTORY_DAYS. */
export function appendToHistory(history: History, index: AreaIndex): History {
  const day = parisDay(index.fetchedAt);
  const replace = history.days.at(-1) === day;
  const days = replace ? history.days : [...history.days, day];
  const n = days.length;

  const push = (series: Series | undefined, stats: Stats): Series => {
    const out: Series = {};
    for (const { id } of FUELS) {
      // Si le jour est déjà présent (relance du job), son ancienne valeur est remplacée.
      const prev = (series?.[id] ?? []).slice(0, n - 1);
      while (prev.length < n - 1) prev.unshift(null);
      const v = stats[id];
      prev.push(v ? Math.round(v.avg * 1000) : null);
      out[id] = prev;
    }
    return out;
  };

  const next: History = {
    days,
    national: push(history.national, index.national),
    regions: Object.fromEntries(index.regions.map((r) => [r.region.slug, push(history.regions[r.region.slug], r.stats)])),
    cities: Object.fromEntries([...index.cities.values()].map((c) => [c.slug, push(history.cities[c.slug], c.stats)])),
  };

  const extra = next.days.length - HISTORY_DAYS;
  if (extra > 0) {
    const cut = (s: Series) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v!.slice(extra)])) as Series;
    next.days = next.days.slice(extra);
    next.national = cut(next.national);
    next.regions = Object.fromEntries(Object.entries(next.regions).map(([k, v]) => [k, cut(v)]));
    next.cities = Object.fromEntries(Object.entries(next.cities).map(([k, v]) => [k, cut(v)]));
  }
  return next;
}

export type Trend = { deltaEuros: number; days: number; since: string };

/** Écart entre le dernier point et celui d'il y a ~`days` jours (le plus ancien disponible sinon). */
export function trend(history: History, series: Series | undefined, fuel: FuelId, days: number): Trend | null {
  const values = series?.[fuel];
  if (!values || values.length < 2) return null;
  const last = values.length - 1;
  const current = values[last];
  if (current == null) return null;
  const target = Math.max(0, last - days);
  // Premier point renseigné à partir de la cible.
  for (let i = target; i < last; i++) {
    const v = values[i];
    if (v != null) return { deltaEuros: (current - v) / 1000, days: last - i, since: history.days[i] };
  }
  return null;
}

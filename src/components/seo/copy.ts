import type { City, Stats } from "@/lib/areas";
import type { FuelId } from "@/lib/fuels";
import type { History, Trend } from "@/lib/history";
import { trend } from "@/lib/history";
import { formatEuros } from "@/lib/format";
import { usablePrice } from "@/lib/ranking";
import type { Station } from "@/lib/types";
import { stationTitle } from "../BrandMark";
import { cents, euro } from "./Blocks";

/**
 * Textes générés à partir des chiffres de chaque zone : contenu propre à chaque page
 * (moyennes, écarts, station la moins chère, évolution, voisines), pas un gabarit répété.
 */

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

function compareToNational(avg: number, national: number | undefined): string {
  if (national === undefined) return "";
  const d = avg - national;
  if (Math.abs(d) < 0.001) return ", pile dans la moyenne nationale";
  return `, soit ${cents(Math.abs(d)).slice(1)} de ${d < 0 ? "moins" : "plus"} que la moyenne nationale (${euro(national)})`;
}

function trendSentence(label: string, place: string, t7: Trend | null, t30: Trend | null): string | null {
  if (!t7) return null;
  const move = (t: Trend) =>
    Math.abs(t.deltaEuros) < 0.001 ? "est resté stable" : `a ${t.deltaEuros < 0 ? "baissé" : "augmenté"} de ${cents(Math.abs(t.deltaEuros)).slice(1)}`;
  let s = `Sur les ${t7.days} derniers jours, le prix moyen du ${label} ${place} ${move(t7)}`;
  if (t30 && t30.days > t7.days) s += ` ; sur ${t30.days} jours, il ${move(t30)}`;
  return `${s}.`;
}

export function trendsFor(history: History, series: History["cities"][string] | undefined, fuel: FuelId) {
  return { t7: trend(history, series, fuel, 7), t30: trend(history, series, fuel, 30) };
}

export function cityCopy({
  city,
  national,
  history,
  cheaperNeighbour,
  now,
}: {
  now: number;
  city: City;
  national: Stats;
  history: History;
  cheaperNeighbour: (City & { distanceKm: number }) | null;
}): string[] {
  const { stats } = city;
  const out: string[] = [];
  const n = city.stations.length;

  let intro = `À ${city.name}, ${n} stations-service publient leurs prix sur le site officiel de l'État.`;
  if (stats.gazole) intro += ` Le gazole y coûte en moyenne ${euro(stats.gazole.avg)} le litre${compareToNational(stats.gazole.avg, national.gazole?.avg)}.`;
  out.push(intro);

  const g = stats.gazole;
  if (g && g.count >= 2 && g.max > g.min) {
    const cheapest = city.stations.filter((s) => usablePrice(s, "gazole", now)?.value === g.min);
    const st = city.stations.find((s) => s.id === g.minStationId);
    if (st) {
      const t = stationTitle(st);
      const where = `${t.title}${t.name ? ` (${t.name})` : ""}, ${st.address}`;
      const gap = `${formatEuros((g.max - g.min) * 50)} d'écart sur un plein de 50 litres avec la plus chère de la ville`;
      out.push(
        cheapest.length > 1
          ? `${cheapest.length} stations affichent le gazole le moins cher, à ${euro(g.min)}, dont ${where} : ${gap}.`
          : `La station la moins chère pour le gazole est ${where}, à ${euro(g.min)} : ${gap}.`,
      );
    }
  }

  const petrol = [
    stats.e10 && `le SP95-E10 s'affiche en moyenne à ${euro(stats.e10.avg)}`,
    stats.sp98 && `le SP98 à ${euro(stats.sp98.avg)}`,
  ].filter(Boolean);
  if (petrol.length) {
    let s = `Côté essence, ${petrol.join(" et ")}.`;
    if (stats.e85) {
      s += ` ${stats.e85.count} station${stats.e85.count > 1 ? "s proposent" : " propose"} aussi du superéthanol E85, en moyenne à ${euro(stats.e85.avg)}.`;
    }
    out.push(s);
  }

  const series = history.cities[city.slug];
  const { t7, t30 } = trendsFor(history, series, "gazole");
  out.push(
    trendSentence("gazole", `à ${city.name}`, t7, t30) ??
      `Nous suivons les prix de ${city.name} depuis le ${history.days[0] ? dateFmt.format(new Date(history.days[0])) : "début de ce relevé"}. ` +
        `L'évolution sur 7 et 30 jours apparaîtra ici au fil des relevés quotidiens.`,
  );

  if (cheaperNeighbour?.stats.gazole) {
    out.push(
      `Si vous pouvez rouler un peu, le gazole est en moyenne moins cher à ${cheaperNeighbour.name} ` +
        `(${Math.round(cheaperNeighbour.distanceKm)} km), à ${euro(cheaperNeighbour.stats.gazole.avg)}.`,
    );
  }
  return out;
}

export function areaCopy({
  inName,
  stats,
  national,
  stationCount,
  history,
  series,
  cheapestStation,
}: {
  /** « en Bretagne », « en France » */
  inName: string;
  stats: Stats;
  national?: Stats;
  stationCount: number;
  history: History;
  series: History["cities"][string] | undefined;
  cheapestStation?: Station;
}): string[] {
  const out: string[] = [];
  let intro = `${stationCount.toLocaleString("fr-FR")} stations-service publient leurs prix ${inName}.`;
  if (stats.gazole) {
    intro += ` Le gazole y coûte en moyenne ${euro(stats.gazole.avg)} le litre${national ? compareToNational(stats.gazole.avg, national.gazole?.avg) : ""}.`;
  }
  if (stats.e10) intro += ` Le SP95-E10, carburant essence le plus distribué, est en moyenne à ${euro(stats.e10.avg)}.`;
  out.push(intro);

  if (cheapestStation && stats.gazole) {
    const t = stationTitle(cheapestStation);
    out.push(
      `Le gazole le moins cher ${inName} est affiché à ${euro(stats.gazole.min)} par ${t.title}, ${cheapestStation.address} à ${cheapestStation.city}.`,
    );
  }
  const { t7, t30 } = trendsFor(history, series, "gazole");
  const tr = trendSentence("gazole", inName, t7, t30);
  if (tr) out.push(tr);
  else if (history.days[0]) {
    out.push(`L'évolution des prix ${inName} sur 7 et 30 jours s'affichera ici au fil des relevés (suivi depuis le ${dateFmt.format(new Date(history.days[0]))}).`);
  }
  return out;
}

"use client";

import { FUELS, MAX_PRICE_AGE_DAYS, type FuelId } from "@/lib/fuels";
import {
  FRESHNESS_COLOR,
  formatDiff,
  formatDistance,
  formatEuros,
  freshness,
  relativeTime,
  splitPrice,
} from "@/lib/format";
import { tierColor, usablePrice, type RankedStation } from "@/lib/ranking";
import type { Station } from "@/lib/types";
import { BrandMark, stationTitle } from "./BrandMark";
import { HighwayIcon, SortIcon } from "./Icons";

export function Price({ value, size = "lg", className = "" }: { value: number; size?: "xl" | "lg" | "sm"; className?: string }) {
  const { main, tail } = splitPrice(value);
  const cls = size === "xl" ? "text-4xl" : size === "lg" ? "text-[26px]" : "text-[15px]";
  return (
    <span className={`font-mono font-semibold tabular leading-none tracking-tight ${cls} ${className}`}>
      {main}
      <span className="text-[0.62em] align-[0.42em] opacity-70">{tail}</span>
      <span className="ml-0.5 text-[0.55em] font-medium opacity-60">€</span>
    </span>
  );
}

export function FreshnessDot({ iso, now }: { iso: string; now: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: FRESHNESS_COLOR[freshness(iso, now)] }}
      aria-hidden
    />
  );
}

type CardProps = {
  item: RankedStation;
  fuelChosen: boolean;
  rankingFuel: FuelId;
  isBest: boolean;
  active: boolean;
  now: number;
  onSelect: () => void;
  onHover: (on: boolean) => void;
  /** Mode trajet : position sur le parcours et détour au lieu de la distance. */
  trip?: { alongKm: number; detourKm: number };
  bestLabel?: string;
};

export function StationCard({ item, fuelChosen, rankingFuel, isBest, active, now, onSelect, onHover, trip, bestLabel }: CardProps) {
  const { station, price, diff, cost, rank } = item;
  const title = stationTitle(station);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        className={`group relative w-full rounded-2xl border p-3.5 text-left transition ${
          active
            ? "border-ink bg-surface shadow-float"
            : isBest
              ? "border-accent bg-[#f9ffe6] hover:border-ink/40"
              : "border-line bg-surface hover:border-line-strong hover:shadow-[0_4px_16px_-6px_rgb(14_16_19_/_0.15)]"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="relative mt-0.5 shrink-0">
            <BrandMark brand={station.brand} size={40} />
            <span
              className={`absolute -left-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[11px] font-semibold tabular ring-2 ring-surface ${
                isBest ? "bg-accent text-accent-ink" : "bg-ink text-white"
              }`}
            >
              {rank}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            {isBest && (
              <span className="mb-1 inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                {bestLabel ?? (fuelChosen ? "La moins chère" : "Gazole le moins cher")}
              </span>
            )}
            <p className="truncate leading-snug">
              <span className="font-semibold">{title.title}</span>
              {title.name && <span className="text-[13px] text-muted"> · {title.name}</span>}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
              <span className="truncate">
                {title.title !== station.address && station.address ? `${station.address}, ` : ""}
                {station.city}
              </span>
              <span aria-hidden>·</span>
              {trip ? (
                <>
                  <span className="shrink-0 font-medium text-ink-2">km {Math.round(trip.alongKm)}</span>
                  <span aria-hidden>·</span>
                  <span className="shrink-0">{trip.detourKm < 0.5 ? "sur la route" : `détour ~${formatDistance(trip.detourKm)}`}</span>
                </>
              ) : (
                <span className="shrink-0 font-medium text-ink-2">{formatDistance(station.distanceKm)}</span>
              )}
              {station.highway && (
                <span title="Station d'autoroute" className="shrink-0">
                  <HighwayIcon width={13} height={13} />
                </span>
              )}
            </p>
          </div>

          {fuelChosen && (
            <div className="shrink-0 text-right">
              <Price value={price.value} />
              <p className="mt-1 text-[12px] font-medium tabular" style={{ color: diff === 0 ? "var(--good)" : tierColor(item.tier) }}>
                {diff === 0 ? "Meilleur prix" : formatDiff(diff)}
              </p>
            </div>
          )}
        </div>

        {cost && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-[13px]">
            <span className="text-muted">
              {trip ? "Carburant du trajet" : "Plein estimé"}{" "}
              <span className="text-ink-2">
                ({trip && cost.trip < 0.01 ? "sur la route" : `${trip ? "détour" : "trajet"} ${formatEuros(cost.trip)}`})
              </span>
            </span>
            <span className="font-mono font-semibold tabular">{formatEuros(cost.total)}</span>
          </div>
        )}

        <FuelStrip station={station} highlight={fuelChosen ? rankingFuel : null} sortFuel={fuelChosen ? null : rankingFuel} now={now} />

        <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-muted">
          <FreshnessDot iso={price.updatedAt} now={now} />
          Prix {fuelChosen ? "" : "Gazole "}mis à jour {relativeTime(price.updatedAt, now)}
        </p>
      </button>
    </li>
  );
}

/** Tous les carburants de la station ; celui choisi est mis en avant (et retiré de la bande s'il est affiché en grand). */
export function FuelStrip({
  station,
  highlight,
  sortFuel,
  now,
}: {
  station: Station;
  highlight: FuelId | null;
  sortFuel: FuelId | null;
  now: number;
}) {
  const fuels = FUELS.filter((f) => f.id !== highlight && station.prices[f.id]);
  if (fuels.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {fuels.map((f) => {
        const usable = usablePrice(station, f.id, now);
        const isSort = sortFuel === f.id;
        return (
          <span
            key={f.id}
            title={usable ? undefined : `Prix de plus de ${MAX_PRICE_AGE_DAYS} jours ou en rupture`}
            className={`inline-flex items-baseline gap-1.5 rounded-lg border px-2 py-1 text-[12px] ${
              isSort ? "border-ink/25 bg-surface" : "border-transparent bg-paper"
            } ${usable ? "" : "opacity-45"}`}
          >
            <span className={`flex items-center gap-0.5 ${isSort ? "font-semibold text-ink" : "text-muted"}`}>
              {isSort && <SortIcon width={11} height={11} />}
              {f.short}
            </span>
            {usable ? (
              <span className="font-mono font-semibold tabular text-ink">{usable.value.toFixed(3).replace(".", ",")}</span>
            ) : (
              <span className="text-muted line-through decoration-1">{station.outages[f.id] ? "rupture" : "ancien"}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function StationCardSkeleton() {
  return (
    <li className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <div className="skeleton h-7 w-7 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
        <div className="skeleton h-7 w-16 rounded" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="skeleton h-6 w-20 rounded-lg" />
        <div className="skeleton h-6 w-20 rounded-lg" />
        <div className="skeleton h-6 w-20 rounded-lg" />
      </div>
    </li>
  );
}

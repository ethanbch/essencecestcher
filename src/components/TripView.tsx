"use client";

import { fuelLabel } from "@/lib/fuels";
import { MAX_CORRIDOR_KM } from "@/lib/geo";
import type { Place } from "@/lib/geocode";
import { formatEuros, formatLiterPrice } from "@/lib/format";
import { formatDuration, type Route } from "@/lib/route";
import type { TripRanking, TripSort } from "@/lib/trip";
import type { TripLoad } from "@/lib/useTrip";
import { AddressSearch } from "./AddressSearch";
import { InfoIcon, PinIcon } from "./Icons";
import { StationCard, StationCardSkeleton } from "./StationCard";

export type Mode = "nearby" | "trip";

export function ModeSwitch({ value, onChange, className = "" }: { value: Mode; onChange: (m: Mode) => void; className?: string }) {
  const tabs: { id: Mode; label: string }[] = [
    { id: "nearby", label: "Autour de moi" },
    { id: "trip", label: "Sur un trajet" },
  ];
  return (
    <div role="tablist" aria-label="Type de recherche" className={`flex rounded-2xl bg-paper p-1 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`h-9 flex-1 rounded-xl px-4 text-[14px] font-semibold transition ${
            value === t.id ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Champs Départ / Arrivée reliés par une ligne, avec inversion. */
export function TripFields({
  from,
  to,
  recent,
  locating,
  size = "md",
  autoFocusTo,
  onFrom,
  onTo,
  onSwap,
  onLocate,
}: {
  from: Place | null;
  to: Place | null;
  recent: Place[];
  locating: boolean;
  size?: "md" | "lg";
  autoFocusTo?: boolean;
  onFrom: (p: Place) => void;
  onTo: (p: Place) => void;
  onSwap: () => void;
  onLocate: () => void;
}) {
  return (
    <div className="relative space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted">Départ</span>
        <div className="min-w-0 flex-1">
          <AddressSearch
            size={size}
            value={from?.label ?? ""}
            recent={recent}
            locating={locating}
            placeholder="D'où partez-vous ?"
            onSelect={onFrom}
            onLocate={onLocate}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted">Arrivée</span>
        <div className="min-w-0 flex-1">
          <AddressSearch
            size={size}
            value={to?.label ?? ""}
            recent={recent}
            autoFocus={autoFocusTo}
            placeholder="Où allez-vous ?"
            icon={<PinIcon className="shrink-0 text-muted" />}
            onSelect={onTo}
          />
        </div>
      </div>
      {from && to && (
        <button
          type="button"
          onClick={onSwap}
          title="Inverser départ et arrivée"
          aria-label="Inverser départ et arrivée"
          className="absolute -left-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-[13px] shadow-sm hover:border-ink/40"
        >
          ⇅
        </button>
      )}
    </div>
  );
}

const CORRIDOR_STEPS = [1, 2, 3, 5, 10];

export function CorridorControl({ value, onChange }: { value: number; onChange: (km: number) => void }) {
  const idx = Math.max(0, CORRIDOR_STEPS.indexOf(value));
  const fill = (idx / (CORRIDOR_STEPS.length - 1)) * 100;
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3" title="Distance maximale entre la station et votre itinéraire">
      <span className="shrink-0 text-[13px] text-muted">Détour max</span>
      <input
        type="range"
        className="range min-w-0 flex-1"
        min={0}
        max={CORRIDOR_STEPS.length - 1}
        step={1}
        value={idx}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        onChange={(e) => onChange(CORRIDOR_STEPS[Number(e.target.value)])}
        aria-valuetext={`${value} kilomètres de la route`}
      />
      <span className="w-12 shrink-0 text-right font-mono text-[13px] font-semibold tabular">{value} km</span>
    </label>
  );
}

export function nearestCorridorStep(km: number) {
  return CORRIDOR_STEPS.find((s) => s >= km) ?? MAX_CORRIDOR_KM;
}

export function TripVehicleRow({
  consumption,
  roundTrip,
  onConsumption,
  onRoundTrip,
}: {
  consumption: number;
  roundTrip: boolean;
  onConsumption: (v: number) => void;
  onRoundTrip: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line px-3 focus-within:border-ink">
        <span className="shrink-0 text-[13px] text-muted">Consommation</span>
        <input
          type="number"
          inputMode="decimal"
          min={2}
          max={25}
          step={0.5}
          value={consumption}
          onChange={(e) => {
            const v = Number(e.target.value.replace(",", "."));
            if (Number.isFinite(v) && v > 0) onConsumption(Math.min(v, 25));
          }}
          className="w-full min-w-0 bg-transparent text-right font-mono text-[14px] font-semibold tabular outline-none"
          aria-label="Consommation en litres aux 100 km"
        />
        <span className="shrink-0 text-[12px] text-muted">L/100</span>
      </label>
      <button
        type="button"
        aria-pressed={roundTrip}
        onClick={() => onRoundTrip(!roundTrip)}
        className={`h-9 shrink-0 rounded-xl border px-3 text-[13px] font-semibold transition ${
          roundTrip ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"
        }`}
      >
        Aller-retour
      </button>
    </div>
  );
}

export function TripSortTabs({ value, onChange }: { value: TripSort; onChange: (s: TripSort) => void }) {
  const tabs: { id: TripSort; label: string }[] = [
    { id: "best", label: "Recommandé" },
    { id: "price", label: "Prix" },
    { id: "along", label: "Ordre du trajet" },
  ];
  return (
    <div role="tablist" aria-label="Trier par" className="flex rounded-xl bg-paper p-0.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`h-8 flex-1 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-semibold transition ${
            value === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const liters = (v: number) => `${v.toFixed(1).replace(".", ",")} L`;

/** Synthèse du trajet : distance, essence nécessaire, coût à la station recommandée. */
export function TripSummary({
  from,
  to,
  route,
  ranking,
  roundTrip,
}: {
  from: Place;
  to: Place;
  route: Route;
  ranking: TripRanking;
  roundTrip: boolean;
}) {
  const reco = ranking.recommended;
  const fuel = fuelLabel(ranking.rankingFuel);
  return (
    <div className="rounded-2xl bg-ink p-4 text-white">
      <p className="truncate text-[13px] text-white/60">
        {from.label} → {to.label}
      </p>
      <p className="mt-0.5 text-[13px] text-white/60">
        <span className="font-semibold text-white">{Math.round(ranking.totalKm)} km</span>
        {roundTrip ? " aller-retour" : ""} · {formatDuration(route.durationMin * (roundTrip ? 2 : 1))}
      </p>
      <p className="mt-2 font-display text-[22px] font-bold leading-tight">
        ≈ <span className="text-accent">{liters(ranking.liters)}</span> de {fuel}
      </p>
      {reco?.cost && (
        <p className="mt-1 text-[14px] leading-snug text-white/85">
          Soit <strong className="text-white">{formatEuros(reco.cost.total)}</strong> en faisant le plein à la station recommandée
          {ranking.savingVsAvg !== null && ranking.savingVsAvg >= 0.5 && (
            <>
              , <span className="text-accent">{formatEuros(ranking.savingVsAvg)} de moins</span> qu&apos;au prix moyen sur la route
            </>
          )}
          .
        </p>
      )}
      {ranking.min !== null && ranking.max !== null && ranking.ranked.length > 1 && (
        <p className="mt-2 font-mono text-[12px] tabular text-white/60">
          {formatLiterPrice(ranking.min)} → {formatLiterPrice(ranking.max)} sur {ranking.ranked.length} stations
        </p>
      )}
    </div>
  );
}

/** Liste des résultats en mode trajet (hors fiche station). */
export function TripResults({
  load,
  ranking,
  from,
  to,
  roundTrip,
  corridor,
  sort,
  activeId,
  onWiden,
  onRetry,
  onSelect,
  onHover,
}: {
  load: TripLoad;
  ranking: TripRanking | null;
  from: Place | null;
  to: Place | null;
  roundTrip: boolean;
  corridor: number;
  sort: TripSort;
  activeId: string | null;
  onWiden: (km: number) => void;
  onRetry: () => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  if (!to) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-5 text-center">
        <p className="font-display text-lg font-bold">Où allez-vous ?</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Indiquez votre destination : on calcule l&apos;essence nécessaire et la station la plus avantageuse sur la route.
        </p>
      </div>
    );
  }

  if (load.status === "routing" || load.status === "searching") {
    return (
      <div className="space-y-2.5" aria-busy>
        <p className="flex items-center gap-2 px-1 text-[13px] text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
          {load.status === "routing" ? "Calcul de l'itinéraire…" : "Recherche des stations sur la route…"}
        </p>
        <div className="skeleton h-36 rounded-2xl" />
        <ul className="space-y-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <StationCardSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <div className="rounded-2xl border border-line p-5 text-center">
        <p className="font-semibold">{load.route ? "Impossible de charger les stations" : "Itinéraire introuvable"}</p>
        <p className="mt-1 text-sm text-muted">{load.message}</p>
        <button type="button" onClick={onRetry} className="mt-3 h-10 rounded-xl bg-ink px-4 text-sm font-semibold text-white">
          Réessayer
        </button>
      </div>
    );
  }

  if (load.status !== "ready" || !ranking || !from) return null;
  const fuelName = fuelLabel(ranking.rankingFuel);
  const recoId = ranking.recommended?.station.id;

  return (
    <div className="space-y-3">
      <TripSummary from={from} to={to} route={load.route} ranking={ranking} roundTrip={roundTrip} />

      {!ranking.fuelChosen && ranking.ranked.length > 0 && (
        <div className="flex gap-2.5 rounded-2xl border border-dashed border-line-strong bg-paper/60 px-3.5 py-3 text-[13px] leading-snug text-ink-2">
          <InfoIcon className="mt-0.5 shrink-0 text-muted" width={16} height={16} />
          <p>
            Calcul basé sur le <strong className="text-ink">Gazole</strong>.{" "}
            <span className="text-muted">Choisissez votre carburant ci-dessus pour un résultat exact.</span>
          </p>
        </div>
      )}

      {ranking.ranked.length === 0 ? (
        <div className="rounded-2xl border border-line p-6 text-center">
          <p className="font-display text-lg font-bold">Aucune station sur ce trajet</p>
          <p className="mt-1 text-sm text-muted">
            Pas de prix {fuelName} récent à moins de {corridor} km de la route.
          </p>
          {corridor < MAX_CORRIDOR_KM && (
            <button
              type="button"
              onClick={() => onWiden(nearestCorridorStep(corridor + 1))}
              className="mt-4 h-11 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-2"
            >
              Accepter {nearestCorridorStep(corridor + 1)} km de détour
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 px-1 pt-1 text-[13px] text-muted">
            <span>
              <strong className="font-semibold text-ink">{ranking.ranked.length}</strong> station{ranking.ranked.length > 1 ? "s" : ""} à moins
              de {corridor} km de la route
            </span>
            <span>
              {sort === "best" ? "coût total, détour compris" : sort === "price" ? "du moins cher au plus cher" : "du départ à l'arrivée"}
            </span>
          </p>
          <ul className="space-y-2.5">
            {ranking.ranked.map((item) => (
              <StationCard
                key={item.station.id}
                item={item}
                fuelChosen={ranking.fuelChosen}
                rankingFuel={ranking.rankingFuel}
                isBest={item.station.id === recoId}
                bestLabel="Recommandée"
                active={item.station.id === activeId}
                now={load.now}
                trip={{ alongKm: item.station.alongKm, detourKm: item.detourKm }}
                onSelect={() => onSelect(item.station.id)}
                onHover={(on) => onHover(on ? item.station.id : null)}
              />
            ))}
          </ul>
          <p className="px-1 text-[12px] leading-relaxed text-muted">
            Recommandation : prix × {liters(ranking.liters).replace(" L", " litres")} du trajet + carburant brûlé pour le détour (aller-retour
            depuis la route, estimé à 1,3 × la distance à vol d&apos;oiseau).
          </p>
        </>
      )}
    </div>
  );
}

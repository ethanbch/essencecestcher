"use client";

import { FUELS, type FuelId } from "@/lib/fuels";
import { MAX_RADIUS_KM } from "@/lib/geo";
import { formatEuros, formatLiterPrice } from "@/lib/format";
import { ROAD_FACTOR, TYPICAL_TANK_LITERS, type Ranking, type SortMode, type Vehicle } from "@/lib/ranking";
import { CarIcon, CloseIcon } from "./Icons";

export function FuelChips({
  value,
  onChange,
  nudge,
  className = "",
}: {
  value: FuelId | null;
  onChange: (f: FuelId | null) => void;
  nudge?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Carburant" className={`no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 ${className}`}>
      {FUELS.map((f) => {
        const on = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : f.id)}
            title={on ? "Cliquer pour ne plus mettre en avant ce carburant" : undefined}
            className={`h-9 shrink-0 rounded-full border px-3.5 text-[13.5px] font-semibold transition ${
              on
                ? "border-ink bg-ink text-white"
                : `border-line bg-surface text-ink-2 hover:border-ink/40 ${nudge ? "animate-nudge" : ""}`
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

const RADIUS_STEPS = [1, 2, 3, 5, 7, 10, 15, 20, 30, 40, 50];

export function RadiusControl({ value, onChange }: { value: number; onChange: (km: number) => void }) {
  const idx = Math.max(0, RADIUS_STEPS.indexOf(value));
  const fill = (idx / (RADIUS_STEPS.length - 1)) * 100;
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3">
      <span className="shrink-0 text-[13px] text-muted">Rayon</span>
      <input
        type="range"
        className="range min-w-0 flex-1"
        min={0}
        max={RADIUS_STEPS.length - 1}
        step={1}
        value={idx}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        onChange={(e) => onChange(RADIUS_STEPS[Number(e.target.value)])}
        aria-valuetext={`${value} kilomètres`}
      />
      <span className="w-12 shrink-0 text-right font-mono text-[13px] font-semibold tabular">{value} km</span>
    </label>
  );
}

export function nearestRadiusStep(km: number) {
  return RADIUS_STEPS.find((s) => s >= km) ?? MAX_RADIUS_KM;
}

export function SortTabs({
  value,
  onChange,
  costEnabled,
}: {
  value: SortMode;
  onChange: (s: SortMode) => void;
  costEnabled: boolean;
}) {
  const tabs: { id: SortMode; label: string }[] = [
    { id: "price", label: "Prix" },
    { id: "distance", label: "Distance" },
    ...(costEnabled ? [{ id: "cost" as const, label: "Coût du plein" }] : []),
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

export function VehiclePanel({
  vehicle,
  onChange,
  onClose,
}: {
  vehicle: Vehicle;
  onChange: (v: Vehicle) => void;
  onClose: () => void;
}) {
  return (
    <div className="animate-rise rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <CarIcon /> Coût réel du plein
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">
            On ajoute le carburant brûlé pour aller à la station. Une station un peu plus chère mais tout près peut revenir moins cher.
          </p>
        </div>
        <button type="button" onClick={onClose} className="-mr-1 -mt-1 rounded-lg p-1.5 hover:bg-surface" aria-label="Désactiver le coût réel">
          <CloseIcon />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField
          label="Consommation"
          unit="L/100"
          value={vehicle.consumption}
          step={0.5}
          min={2}
          max={25}
          onChange={(consumption) => onChange({ ...vehicle, consumption })}
        />
        <NumberField
          label="Litres à mettre"
          unit="L"
          value={vehicle.liters}
          step={5}
          min={5}
          max={150}
          onChange={(liters) => onChange({ ...vehicle, liters })}
        />
      </div>
      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-[13.5px]">
        <span>Compter le trajet retour</span>
        <input
          type="checkbox"
          checked={vehicle.roundTrip}
          onChange={(e) => onChange({ ...vehicle, roundTrip: e.target.checked })}
          className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-line-strong transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-ink checked:before:translate-x-[18px]"
        />
      </label>
      <p className="mt-2 text-[11.5px] text-muted">
        Distance par la route estimée à {String(ROAD_FACTOR).replace(".", ",")} × la distance à vol d&apos;oiseau.
      </p>
    </div>
  );
}

function NumberField({
  label,
  unit,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="rounded-xl border border-line bg-surface px-3 py-2 focus-within:border-ink">
      <span className="block text-[11.5px] text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = Number(e.target.value.replace(",", "."));
            if (Number.isFinite(v) && v > 0) onChange(Math.min(v, max));
          }}
          className="w-full min-w-0 bg-transparent font-mono text-[17px] font-semibold tabular outline-none"
        />
        <span className="text-[12px] text-muted">{unit}</span>
      </span>
    </label>
  );
}

/** Bandeau de synthèse : fourchette de prix et économie possible. */
export function PriceSummary({
  ranking,
  fuelLabel,
  liters = TYPICAL_TANK_LITERS,
}: {
  ranking: Ranking;
  fuelLabel: string;
  liters?: number;
}) {
  const { min, max, avg, ranked } = ranking;
  if (min === null || max === null || avg === null || ranked.length < 2) return null;
  const saving = (max - min) * liters;
  const avgPos = max > min ? ((avg - min) / (max - min)) * 100 : 50;
  return (
    <div className="rounded-2xl bg-ink p-4 text-white">
      <p className="text-[13px] text-white/60">
        {fuelLabel} · {ranked.length} stations
      </p>
      <p className="mt-1 font-display text-[19px] font-bold leading-snug">
        {saving >= 0.5 ? (
          <>
            Jusqu&apos;à <span className="text-accent">{formatEuros(saving)}</span> d&apos;écart sur un plein de {liters} L
          </>
        ) : (
          <>Les prix sont très proches dans ce périmètre</>
        )}
      </p>
      <div className="mt-3">
        <div className="relative h-1.5 rounded-full bg-gradient-to-r from-[#22c55e] via-[#f59e0b] to-[#ef4444]">
          <span
            className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-white"
            style={{ left: `${avgPos}%` }}
            title="Prix moyen"
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[12px] tabular text-white/70">
          <span>{formatLiterPrice(min)}</span>
          <span>moy. {formatLiterPrice(avg)}</span>
          <span>{formatLiterPrice(max)}</span>
        </div>
      </div>
    </div>
  );
}

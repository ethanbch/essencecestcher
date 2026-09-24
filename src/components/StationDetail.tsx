"use client";

import { useState } from "react";
import { FUELS, MAX_PRICE_AGE_DAYS, type FuelId } from "@/lib/fuels";
import {
  DAY_NAMES,
  FRESHNESS_COLOR,
  formatDateTime,
  formatDiff,
  formatDistance,
  formatEuros,
  formatFetchDate,
  formatSlots,
  freshness,
  openState,
  parisNow,
  relativeTime,
} from "@/lib/format";
import type { RankedStation } from "@/lib/ranking";
import type { NearbyStation } from "@/lib/types";
import { ArrowLeftIcon, CheckIcon, ClockIcon, HighwayIcon, InfoIcon, NavIcon, ShareIcon } from "./Icons";
import { BrandMark, stationTitle } from "./BrandMark";
import { Price } from "./StationCard";

type Props = {
  station: NearbyStation;
  ranked: RankedStation | null;
  rankedCount: number;
  rankingFuel: FuelId;
  fuelChosen: boolean;
  fetchedAt: string;
  now: number;
  onBack: () => void;
  /** Mode trajet : position sur le parcours, détour et litres du trajet. */
  trip?: {
    alongKm: number;
    detourKm: number;
    liters: number;
    from: { lat: number; lon: number };
    to: { lat: number; lon: number };
  };
};

const FRESHNESS_LABEL = {
  fresh: "Moins de 24 h",
  recent: "Moins de 3 jours",
  aging: "Moins de 7 jours",
  stale: `Plus de ${MAX_PRICE_AGE_DAYS} jours`,
} as const;

export function StationDetail({ station, ranked, rankedCount, rankingFuel, fuelChosen, fetchedAt, now, onBack, trip }: Props) {
  const open = openState(station.hours, station.open24, new Date(now));
  const title = stationTitle(station);
  const today = parisNow(new Date(now)).day;
  const [shared, setShared] = useState(false);
  const dest = `${station.lat},${station.lon}`;
  // En trajet : itinéraire complet départ → station → arrivée.
  const primaryHref = trip
    ? `https://www.google.com/maps/dir/?api=1&origin=${trip.from.lat},${trip.from.lon}&destination=${trip.to.lat},${trip.to.lon}&waypoints=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

  async function share() {
    const url = window.location.href;
    const title = `${stationTitle(station).title}, ${station.address}, ${station.city}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // partage annulé
    }
  }

  const fuels = FUELS.filter((f) => station.prices[f.id] || station.outages[f.id]);

  return (
    <div className="animate-rise">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-surface/90 px-4 py-2 backdrop-blur md:-mx-5 md:px-5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-medium hover:bg-paper"
        >
          <ArrowLeftIcon /> Classement
        </button>
        <button
          type="button"
          onClick={share}
          className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium hover:bg-paper"
        >
          {shared ? <CheckIcon className="text-good" /> : <ShareIcon />}
          {shared ? "Lien copié" : "Partager"}
        </button>
      </div>

      <header className="pt-2">
        {ranked && (
          <p className="mb-2 flex items-center gap-2 text-[13px] font-medium">
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono tabular ${
                ranked.diff === 0 ? "bg-accent text-accent-ink" : "bg-paper text-ink-2"
              }`}
            >
              #{ranked.rank}
            </span>
            <span className="text-muted">
              sur {rankedCount} · {ranked.diff === 0 ? "prix le plus bas" : `${formatDiff(ranked.diff)} vs la moins chère`}
              {!fuelChosen && " (Gazole)"}
            </span>
          </p>
        )}
        <div className="flex items-center gap-3">
          <BrandMark brand={station.brand} size={52} />
          <div className="min-w-0">
            <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight">{title.title}</h2>
            {title.name && <p className="truncate text-[14px] font-medium text-ink-2">{title.name}</p>}
          </div>
        </div>
        <p className="mt-2 text-muted">
          {title.title !== station.address && station.address && <>{station.address}, </>}
          {station.postcode} {station.city} ·{" "}
          {trip ? (
            <>
              <span className="font-medium text-ink-2">km {Math.round(trip.alongKm)}</span> du trajet, à{" "}
              {formatDistance(station.distanceKm)} de la route
            </>
          ) : (
            <>
              <span className="font-medium text-ink-2">{formatDistance(station.distanceKm)}</span> à vol d&apos;oiseau
            </>
          )}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-medium">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              open.state === "open" ? "bg-[#e8f7ee] text-[#11743a]" : open.state === "closed" ? "bg-[#fdecec] text-bad" : "bg-paper text-muted"
            }`}
          >
            <ClockIcon width={13} height={13} /> {open.label}
          </span>
          {station.open24 && open.label !== "Automate 24/24" && (
            <span className="rounded-full bg-paper px-2.5 py-1 text-ink-2">Automate CB 24/24</span>
          )}
          {station.highway && (
            <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-ink-2">
              <HighwayIcon width={13} height={13} /> Autoroute
            </span>
          )}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <a
          href={primaryHref}
          target="_blank"
          rel="noreferrer"
          className="col-span-3 flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink font-semibold text-white transition hover:bg-ink-2"
        >
          <NavIcon /> {trip ? "Mon trajet via cette station" : "Y aller"}
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium hover:bg-paper"
        >
          Google Maps
        </a>
        <a
          href={`https://waze.com/ul?ll=${dest}&navigate=yes`}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium hover:bg-paper"
        >
          Waze
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${dest}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium hover:bg-paper"
        >
          Plans
        </a>
      </div>

      {ranked?.cost && (
        <div className="mt-4 rounded-2xl bg-paper p-4">
          <p className="text-[13px] text-muted">
            {trip ? `Carburant du trajet (${trip.liters.toFixed(1).replace(".", ",")} L) en faisant le plein ici` : "Coût estimé de votre plein ici"}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular">{formatEuros(ranked.cost.total)}</p>
          <p className="mt-1 text-[13px] text-ink-2">
            {formatEuros(ranked.cost.fuel)} de carburant + {formatEuros(ranked.cost.trip)} {trip ? "de détour" : "de trajet"} (~
            {Math.max(1, Math.round(ranked.cost.tripKm))} km)
          </p>
        </div>
      )}

      <section className="mt-6">
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">Prix à la pompe</h3>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {fuels.map((f) => {
            const p = station.prices[f.id];
            const outage = station.outages[f.id];
            const fr = p ? freshness(p.updatedAt, now) : null;
            const stale = fr === "stale";
            const highlighted = fuelChosen && f.id === rankingFuel;
            return (
              <li key={f.id} className={`flex items-center gap-3 px-4 py-3 ${highlighted ? "bg-[#f9ffe6]" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {f.label}
                    {highlighted && (
                      <span className="rounded-full bg-accent px-1.5 py-px text-[10.5px] font-bold uppercase text-accent-ink">
                        Votre carburant
                      </span>
                    )}
                  </p>
                  {outage ? (
                    <p className="text-[12.5px] text-bad">
                      {outage.type === "definitive" ? "N'est plus distribué" : "En rupture"}
                      {outage.since && ` depuis ${relativeTime(outage.since, now).replace("il y a ", "")}`}
                    </p>
                  ) : p ? (
                    <p className="flex items-center gap-1.5 text-[12.5px] text-muted" title={FRESHNESS_LABEL[fr!]}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: FRESHNESS_COLOR[fr!] }} />
                      Mis à jour {relativeTime(p.updatedAt, now)} · {formatDateTime(p.updatedAt)}
                    </p>
                  ) : null}
                  {stale && !outage && (
                    <p className="mt-0.5 text-[12px] text-warn">Trop ancien : exclu du classement</p>
                  )}
                </div>
                {p && !outage && <Price value={p.value} size={highlighted ? "lg" : "sm"} className={stale ? "opacity-40" : ""} />}
              </li>
            );
          })}
        </ul>

        <p className="mt-3 flex gap-2 rounded-xl bg-paper px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
          <InfoIcon className="mt-0.5 shrink-0 text-muted" width={15} height={15} />
          <span>
            Prix déclarés par la station sur prix-carburants.gouv.fr. Relevé récupéré {formatFetchDate(fetchedAt, new Date(now))}. Les prix ont
            pu changer depuis leur dernière mise à jour.
          </span>
        </p>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">Horaires</h3>
        <Hours station={station} today={today} />
      </section>

      {station.services.length > 0 && (
        <section className="mt-6 pb-4">
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">Services</h3>
          <ul className="flex flex-wrap gap-1.5">
            {station.services.map((s) => (
              <li key={s} className="rounded-lg bg-paper px-2.5 py-1 text-[13px] text-ink-2">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Horaires : une ligne si rien n'est renseigné ou si tous les jours sont identiques, sinon le détail par jour. */
function Hours({ station, today }: { station: NearbyStation; today: number }) {
  const days = DAY_NAMES.map((name, i) => ({ name, day: i + 1, label: formatSlots(station.hours.find((h) => h.day === i + 1)) }));
  const known = station.hours.some((h) => h.closed || h.slots.length > 0);
  const automate = station.open24 ? "Automate carte bancaire 24 h/24." : null;

  if (!known) {
    return (
      <p className="text-sm text-muted">
        La station ne communique pas ses horaires.{automate && <> {automate}</>}
      </p>
    );
  }

  if (days.every((d) => d.label === days[0].label)) {
    return (
      <p className="flex items-baseline justify-between text-[14px]">
        <span className="font-semibold">Tous les jours</span>
        <span className="tabular text-ink-2">{days[0].label}</span>
        {automate && <span className="sr-only">{automate}</span>}
      </p>
    );
  }

  return (
    <>
      <table className="w-full text-[14px]">
        <tbody>
          {days.map((d) => {
            const isToday = today === d.day;
            return (
              <tr key={d.name} className={isToday ? "font-semibold" : "text-ink-2"}>
                <td className="py-1 pr-4">
                  {d.name}
                  {isToday && (
                    <>
                      {" "}
                      <span className="ml-1 rounded bg-paper px-1.5 py-px text-[11px] font-medium text-muted">aujourd&apos;hui</span>
                    </>
                  )}
                </td>
                <td className="py-1 text-right tabular">{d.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {automate && <p className="mt-2 text-[13px] text-muted">{automate}</p>}
    </>
  );
}

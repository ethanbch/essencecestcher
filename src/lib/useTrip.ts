"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place } from "./geocode";
import { fetchRoute, simplify, type Route } from "./route";
import type { TripStationsResponse } from "./types";

export type TripLoad =
  | { status: "idle" }
  | { status: "routing" }
  | { status: "searching"; route: Route }
  | { status: "error"; message: string; route: Route | null }
  | { status: "ready"; route: Route; data: TripStationsResponse; now: number };

type RouteState = { from: Place; to: Place; route: Route | null; error: string | null };
type StationsState = { route: Route; corridor: number; data: TripStationsResponse | null; error: string | null; now: number };

/** Itinéraire (IGN) puis stations à moins de `corridorKm` de la route. Changer le détour ne recalcule pas l'itinéraire. */
export function useTrip(from: Place | null, to: Place | null, corridorKm: number, enabled: boolean): TripLoad {
  const [routeState, setRouteState] = useState<RouteState | null>(null);
  const [stationsState, setStationsState] = useState<StationsState | null>(null);

  useEffect(() => {
    if (!enabled || !from || !to) return;
    const ctrl = new AbortController();
    fetchRoute(from, to, ctrl.signal)
      .then((route) => setRouteState({ from, to, route, error: null }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setRouteState({ from, to, route: null, error: e.message || "Itinéraire indisponible" });
      });
    return () => ctrl.abort();
  }, [from, to, enabled]);

  const route = routeState && routeState.from === from && routeState.to === to ? routeState.route : null;

  useEffect(() => {
    if (!enabled || !route) return;
    const ctrl = new AbortController();
    fetch("/api/route-stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coords: simplify(route.coords), corridorKm, distanceKm: route.distanceKm }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Erreur ${res.status}`);
        return (await res.json()) as TripStationsResponse;
      })
      .then((data) => setStationsState({ route, corridor: corridorKm, data, error: null, now: Date.now() }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setStationsState({ route, corridor: corridorKm, data: null, error: e.message, now: Date.now() });
      });
    return () => ctrl.abort();
  }, [route, corridorKm, enabled]);

  return useMemo<TripLoad>(() => {
    if (!enabled || !from || !to) return { status: "idle" };
    if (!routeState || routeState.from !== from || routeState.to !== to) return { status: "routing" };
    if (!routeState.route) return { status: "error", message: routeState.error ?? "Itinéraire indisponible", route: null };
    const r = routeState.route;
    if (!stationsState || stationsState.route !== r || stationsState.corridor !== corridorKm) return { status: "searching", route: r };
    if (!stationsState.data) return { status: "error", message: stationsState.error ?? "Erreur", route: r };
    return { status: "ready", route: r, data: stationsState.data, now: stationsState.now };
  }, [enabled, from, to, routeState, stationsState, corridorKm]);
}

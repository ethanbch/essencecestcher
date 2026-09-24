"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fuelLabel, isFuelId, MAX_PRICE_AGE_DAYS, type FuelId } from "@/lib/fuels";
import { DEFAULT_CORRIDOR_KM, DEFAULT_RADIUS_KM, MAX_CORRIDOR_KM, MAX_RADIUS_KM } from "@/lib/geo";
import { reversePlace, type Place } from "@/lib/geocode";
import { formatDistance, formatFetchDate } from "@/lib/format";
import { usePersistentState } from "@/lib/persist";
import { DEFAULT_VEHICLE, rankStations, ROAD_FACTOR, type SortMode, type Vehicle } from "@/lib/ranking";
import { rankTrip, type TripSort } from "@/lib/trip";
import type { NearbyResponse } from "@/lib/types";
import { useTrip } from "@/lib/useTrip";
import { AddressSearch } from "./AddressSearch";
import { FuelChips, nearestRadiusStep, PriceSummary, RadiusControl, SortTabs, VehiclePanel } from "./Controls";
import { CarIcon, CheckIcon, InfoIcon, Logo } from "./Icons";
import { LegalFooter } from "./LegalPage";
import { MapView, type MapPadding } from "./MapView";
import { StationCard, StationCardSkeleton } from "./StationCard";
import { StationDetail } from "./StationDetail";
import {
  CorridorControl,
  ModeSwitch,
  nearestCorridorStep,
  TripFields,
  TripResults,
  TripSortTabs,
  TripVehicleRow,
  type Mode,
} from "./TripView";

type Meta = { fetchedAt: string | null; stationCount: number };
type Load =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NearbyResponse; now: number };
type Sheet = "min" | "peek" | "full";

const PANEL_W = 440;

export default function App({ meta }: { meta: Meta }) {
  const [mode, setMode] = useState<Mode>("nearby");
  /** Lieu de recherche, ou point de départ en mode trajet. */
  const [place, setPlace] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [corridor, setCorridor] = usePersistentState<number>("ecc.corridor", DEFAULT_CORRIDOR_KM);
  const [roundTrip, setRoundTrip] = usePersistentState<boolean>("ecc.tripRoundTrip", false);
  const [tripSort, setTripSort] = useState<TripSort>("best");
  const [radius, setRadius] = usePersistentState<number>("ecc.radius", DEFAULT_RADIUS_KM);
  const [fuel, setFuel] = usePersistentState<FuelId | null>("ecc.fuel", null);
  const [vehicle, setVehicle] = usePersistentState<Vehicle>("ecc.vehicle", DEFAULT_VEHICLE);
  const [costMode, setCostMode] = usePersistentState<boolean>("ecc.costMode", false);
  const [recent, setRecent] = usePersistentState<Place[]>("ecc.recent", []);
  const [sort, setSort] = useState<SortMode>("price");
  const [loaded, setLoaded] = useState<{ place: Place; load: Load } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showUnranked, setShowUnranked] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("peek");
  const [isMobile, setIsMobile] = useState(false);
  const [viewport, setViewport] = useState({ h: 800 });
  const listRef = useRef<HTMLDivElement>(null);
  // Passe à true dans le même rendu que l'état lu depuis l'URL : l'écriture ne l'écrase donc jamais.
  const [urlReady, setUrlReady] = useState(false);

  // ---- Responsive ----
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsMobile(mq.matches);
      setViewport({ h: window.innerHeight });
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // ---- URL partageable : ?lat&lon&q&r&f&s ----
  const readUrl = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    const lat = Number(p.get("lat"));
    const lon = Number(p.get("lon"));
    if (p.has("lat") && Number.isFinite(lat) && Number.isFinite(lon)) {
      setPlace({ label: p.get("q") || "Position partagée", lat, lon });
    } else {
      setPlace(null);
    }
    const r = Number(p.get("r"));
    if (r >= 1 && r <= MAX_RADIUS_KM) setRadius(nearestRadiusStep(r));
    setMode(p.get("m") === "trajet" ? "trip" : "nearby");
    const tlat = Number(p.get("tlat"));
    const tlon = Number(p.get("tlon"));
    setDest(
      p.has("tlat") && Number.isFinite(tlat) && Number.isFinite(tlon) ? { label: p.get("tq") || "Destination", lat: tlat, lon: tlon } : null,
    );
    const c = Number(p.get("c"));
    if (c > 0 && c <= MAX_CORRIDOR_KM) setCorridor(nearestCorridorStep(c));
    const f = p.get("f");
    if (f !== null) setFuel(isFuelId(f) ? f : null);
    setActiveId(p.get("s"));
  }, [setRadius, setFuel, setCorridor]);

  useEffect(() => {
    // Synchronisation initiale depuis l'URL (système externe), après hydratation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    readUrl();
    setUrlReady(true);
    const onPop = () => readUrl();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [readUrl]);

  useEffect(() => {
    if (!urlReady) return;
    const p = new URLSearchParams();
    if (place) {
      p.set("q", place.label);
      p.set("lat", place.lat.toFixed(5));
      p.set("lon", place.lon.toFixed(5));
      if (mode === "trip") {
        p.set("m", "trajet");
        if (dest) {
          p.set("tq", dest.label);
          p.set("tlat", dest.lat.toFixed(5));
          p.set("tlon", dest.lon.toFixed(5));
        }
        p.set("c", String(corridor));
      } else {
        p.set("r", String(radius));
      }
      if (fuel) p.set("f", fuel);
      if (activeId) p.set("s", activeId);
    }
    const next = p.toString() ? `?${p}` : window.location.pathname;
    const current = window.location.search || window.location.pathname;
    if (next === current) return;
    const hadPlace = new URLSearchParams(window.location.search).has("lat");
    // Nouvelle recherche depuis l'accueil → entrée d'historique (le bouton retour y ramène)
    if (place && !hadPlace) window.history.pushState(null, "", next);
    else window.history.replaceState(null, "", next);
  }, [urlReady, mode, place, dest, corridor, radius, fuel, activeId]);

  // ---- Chargement des stations (rayon max d'un coup : le curseur est instantané) ----
  useEffect(() => {
    if (!place || mode !== "nearby") return;
    const ctrl = new AbortController();
    fetch(`/api/stations?lat=${place.lat.toFixed(4)}&lon=${place.lon.toFixed(4)}&radius=${MAX_RADIUS_KM}`, {
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Erreur ${res.status}`);
        return (await res.json()) as NearbyResponse;
      })
      .then((data) => setLoaded({ place, load: { status: "ready", data, now: Date.now() } }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setLoaded({ place, load: { status: "error", message: e.message } });
      });
    return () => ctrl.abort();
  }, [place, mode]);

  // Le résultat n'est valable que pour le lieu qui l'a demandé.
  const load = useMemo<Load>(
    () =>
      !place || mode !== "nearby" ? { status: "idle" } : loaded?.place === place ? loaded.load : { status: "loading" },
    [place, loaded, mode],
  );

  const selectPlace = useCallback(
    (p: Place) => {
      setPlace(p);
      setActiveId(null);
      setNotice(null);
      setSheet("peek");
      setRecent((prev) => [p, ...prev.filter((x) => x.label !== p.label)].slice(0, 4));
    },
    [setRecent],
  );

  const selectDest = useCallback(
    (p: Place) => {
      setDest(p);
      setActiveId(null);
      setSheet("peek");
      setRecent((prev) => [p, ...prev.filter((x) => x.label !== p.label)].slice(0, 4));
    },
    [setRecent],
  );

  const changeMode = useCallback((m: Mode) => {
    setMode(m);
    setActiveId(null);
    setHoverId(null);
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setNotice("Votre navigateur ne permet pas la géolocalisation. Saisissez votre adresse.");
      return;
    }
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = await reversePlace(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        selectPlace(p);
      },
      (err) => {
        setLocating(false);
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? "Accès à la position refusé. Saisissez votre adresse, ou autorisez la localisation dans votre navigateur."
            : "Impossible de vous localiser pour le moment. Saisissez votre adresse.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [selectPlace]);

  // ---- Classement ----
  const effectiveSort: SortMode = sort === "cost" && !costMode ? "price" : sort;
  const now = load.status === "ready" ? load.now : 0;
  const ranking = useMemo(
    () =>
      rankStations(load.status === "ready" ? load.data.stations : [], {
        radiusKm: radius,
        fuel,
        sort: effectiveSort,
        vehicle: costMode ? vehicle : null,
        now,
      }),
    [load, radius, fuel, effectiveSort, costMode, vehicle, now],
  );
  const pinOrder = useMemo(
    () => (effectiveSort === "distance" ? [...ranking.ranked].sort((a, b) => a.price.value - b.price.value) : ranking.ranked),
    [ranking, effectiveSort],
  );
  const bestPrice = ranking.min;

  // ---- Trajet ----
  const trip = useTrip(place, dest, corridor, mode === "trip");
  const tripRanking = useMemo(
    () =>
      trip.status === "ready"
        ? rankTrip(trip.data.stations, {
            fuel,
            sort: tripSort,
            consumption: vehicle.consumption,
            roundTrip,
            routeKm: trip.route.distanceKm,
            now: trip.now,
          })
        : null,
    [trip, fuel, tripSort, vehicle.consumption, roundTrip],
  );
  const tripPins = useMemo(
    () => (tripRanking ? [...tripRanking.ranked].sort((a, b) => a.cost!.total - b.cost!.total) : []),
    [tripRanking],
  );
  const tripRoute = useMemo(
    () =>
      mode === "trip" && dest && (trip.status === "ready" || trip.status === "searching" || (trip.status === "error" && trip.route))
        ? { coords: trip.route!.coords, bbox: trip.route!.bbox, to: dest }
        : null,
    [mode, dest, trip],
  );

  /** Rayon suggéré quand le périmètre est vide : le plus petit qui contient au moins 3 stations. */
  const suggestedRadius = useMemo(() => {
    if (load.status !== "ready" || ranking.ranked.length > 0) return null;
    const all = rankStations(load.data.stations, { radiusKm: MAX_RADIUS_KM, fuel, sort: "distance", vehicle: null, now });
    const third = all.ranked[Math.min(2, all.ranked.length - 1)];
    return third ? nearestRadiusStep(third.station.distanceKm) : null;
  }, [load, ranking.ranked.length, fuel, now]);

  const active = useMemo(() => {
    if (!activeId) return null;
    if (mode === "trip") return trip.status === "ready" ? (trip.data.stations.find((s) => s.id === activeId) ?? null) : null;
    if (load.status !== "ready") return null;
    return load.data.stations.find((s) => s.id === activeId) ?? null;
  }, [activeId, load, mode, trip]);
  const activeRanked = active
    ? ((mode === "trip" ? tripRanking?.ranked : ranking.ranked)?.find((r) => r.station.id === active.id) ?? null)
    : null;
  const activeTrip =
    mode === "trip" && active && tripRanking && place && dest && "alongKm" in active
      ? {
          alongKm: (active as { alongKm: number }).alongKm,
          detourKm: 2 * active.distanceKm * ROAD_FACTOR,
          liters: tripRanking.liters,
          from: { lat: place.lat, lon: place.lon },
          to: { lat: dest.lat, lon: dest.lon },
        }
      : undefined;

  const selectStation = useCallback((id: string) => {
    setActiveId(id);
    setHoverId(null);
    setSheet((s) => (s === "min" ? "peek" : s));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeId) setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [activeId, fuel, effectiveSort, tripSort, mode]);

  // ---- Mise en page ----
  const sheetHeights: Record<Sheet, number> = {
    min: 176,
    peek: Math.round(viewport.h * 0.52),
    full: Math.round(viewport.h * 0.9),
  };
  const padding: MapPadding = isMobile
    ? { top: 16, right: 16, bottom: sheetHeights[sheet === "full" ? "peek" : sheet], left: 16 }
    : { top: 16, right: 16, bottom: 16, left: PANEL_W + 32 };

  const fuelName = fuelLabel(ranking.rankingFuel);
  const hidden = ranking.staleCount + ranking.outageCount + (ranking.fuelChosen ? ranking.notSoldCount : 0);

  const controls = place && !active && (
    <div className={`shrink-0 space-y-3 border-b border-line pb-3 ${isMobile ? "-mx-4 px-4" : "px-5 pt-5"}`}>
      <div className="hidden items-center justify-between md:flex">
        <button type="button" onClick={() => setPlace(null)} aria-label="Retour à l'accueil">
          <Logo />
        </button>
        {meta.fetchedAt && <DataStamp iso={meta.fetchedAt} compact />}
      </div>
      <ModeSwitch value={mode} onChange={changeMode} />
      {mode === "trip" ? (
        <>
          <TripFields
            from={place}
            to={dest}
            recent={recent}
            locating={locating}
            autoFocusTo={!dest}
            onFrom={selectPlace}
            onTo={selectDest}
            onSwap={() => {
              if (!dest) return;
              setPlace(dest);
              setDest(place);
            }}
            onLocate={locate}
          />
          {notice && <p className="text-[13px] text-bad">{notice}</p>}
          <FuelChips value={fuel} onChange={setFuel} nudge={!fuel && trip.status === "ready"} />
          <CorridorControl value={corridor} onChange={setCorridor} />
          <TripVehicleRow
            consumption={vehicle.consumption}
            roundTrip={roundTrip}
            onConsumption={(consumption) => setVehicle((v) => ({ ...v, consumption }))}
            onRoundTrip={setRoundTrip}
          />
          {dest && <TripSortTabs value={tripSort} onChange={setTripSort} />}
        </>
      ) : (
        <>
          <AddressSearch value={place.label} recent={recent} locating={locating} onSelect={selectPlace} onLocate={locate} />
          {notice && <p className="text-[13px] text-bad">{notice}</p>}
          <FuelChips value={fuel} onChange={setFuel} nudge={!fuel && load.status === "ready"} />
          <RadiusControl value={radius} onChange={setRadius} />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SortTabs value={effectiveSort} onChange={setSort} costEnabled={costMode} />
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !costMode;
                setCostMode(next);
                setSort(next ? "cost" : "price");
              }}
              aria-pressed={costMode}
              title="Estimer le coût réel du plein selon votre véhicule"
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition ${
                costMode ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"
              }`}
            >
              <CarIcon width={16} height={16} /> Mon véhicule
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView
        place={place}
        radiusKm={radius}
        ranked={mode === "trip" ? (tripRanking?.ranked ?? []) : ranking.ranked}
        unranked={
          mode === "trip"
            ? tripRanking && !tripRanking.fuelChosen
              ? tripRanking.unranked
              : []
            : ranking.fuelChosen
              ? []
              : ranking.unranked
        }
        pinOrder={mode === "trip" ? tripPins : pinOrder}
        route={tripRoute}
        bestId={mode === "trip" ? (tripRanking?.recommended?.station.id ?? null) : null}
        maxPins={mode === "trip" ? (isMobile ? 6 : 12) : undefined}
        activeId={activeId}
        hoverId={hoverId}
        padding={padding}
        onSelect={selectStation}
      />

      {!place && (
        <Landing
          meta={meta}
          mode={mode}
          onMode={changeMode}
          recent={recent}
          locating={locating}
          notice={notice}
          fuel={fuel}
          onFuel={setFuel}
          onSelect={selectPlace}
          onTrip={(from, to) => {
            setDest(to);
            selectPlace(from);
            setRecent((prev) => [to, ...prev.filter((x) => x.label !== to.label)].slice(0, 4));
          }}
          onLocate={locate}
        />
      )}

      {place && (
        <aside
          aria-label="Résultats"
          className={
            isMobile
              ? "absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[28px] bg-surface shadow-[0_-8px_40px_-12px_rgb(14_16_19_/_0.35)] transition-[height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              : "absolute bottom-4 left-4 top-4 z-20 flex flex-col overflow-hidden rounded-[28px] bg-surface shadow-float"
          }
          style={isMobile ? { height: sheetHeights[sheet] } : { width: PANEL_W }}
        >
          {isMobile && <SheetHandle sheet={sheet} onChange={setSheet} />}

          {!isMobile && controls}

          <div ref={listRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-5">
            {/* Sur mobile, les réglages défilent avec la liste pour lui laisser la place */}
            {isMobile && controls}
            {active && (load.status === "ready" || trip.status === "ready") ? (
              <StationDetail
                station={active}
                ranked={activeRanked}
                rankedCount={mode === "trip" ? (tripRanking?.ranked.length ?? 0) : ranking.ranked.length}
                rankingFuel={mode === "trip" && tripRanking ? tripRanking.rankingFuel : ranking.rankingFuel}
                fuelChosen={fuel !== null}
                fetchedAt={load.status === "ready" ? load.data.fetchedAt : trip.status === "ready" ? trip.data.fetchedAt : ""}
                now={load.status === "ready" ? now : trip.status === "ready" ? trip.now : 0}
                trip={activeTrip}
                onBack={() => setActiveId(null)}
              />
            ) : mode === "trip" ? (
              <div className="pt-3">
                <TripResults
                  load={trip}
                  ranking={tripRanking}
                  from={place}
                  to={dest}
                  roundTrip={roundTrip}
                  corridor={corridor}
                  sort={tripSort}
                  activeId={activeId}
                  onWiden={setCorridor}
                  onRetry={() => dest && setDest({ ...dest })}
                  onSelect={selectStation}
                  onHover={setHoverId}
                />
                <LegalFooter className="justify-center pt-6" />
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {costMode && (
                  <VehiclePanel
                    vehicle={vehicle}
                    onChange={setVehicle}
                    onClose={() => {
                      setCostMode(false);
                      setSort("price");
                    }}
                  />
                )}

                {load.status === "loading" && (
                  <ul className="space-y-2.5" aria-busy>
                    {Array.from({ length: 5 }, (_, i) => (
                      <StationCardSkeleton key={i} />
                    ))}
                  </ul>
                )}

                {load.status === "error" && (
                  <div className="rounded-2xl border border-line p-5 text-center">
                    <p className="font-semibold">Impossible de charger les stations</p>
                    <p className="mt-1 text-sm text-muted">{load.message}</p>
                    <button
                      type="button"
                      onClick={() => setPlace({ ...place })}
                      className="mt-3 h-10 rounded-xl bg-ink px-4 text-sm font-semibold text-white"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                {load.status === "ready" && (
                  <>
                    {!ranking.fuelChosen && ranking.ranked.length > 0 && (
                      <div className="flex gap-2.5 rounded-2xl border border-dashed border-line-strong bg-paper/60 px-3.5 py-3 text-[13px] leading-snug text-ink-2">
                        <InfoIcon className="mt-0.5 shrink-0 text-muted" width={16} height={16} />
                        <p>
                          Classement selon le <strong className="text-ink">prix du Gazole</strong>, le carburant le plus répandu.{" "}
                          <span className="text-muted">Choisissez le vôtre ci-dessus pour un classement sur mesure.</span>
                        </p>
                      </div>
                    )}

                    {ranking.fuelChosen && (
                      <PriceSummary ranking={ranking} fuelLabel={fuelName} liters={costMode ? vehicle.liters : undefined} />
                    )}

                    {ranking.ranked.length === 0 ? (
                      <EmptyState
                        radius={radius}
                        fuelName={fuelName}
                        suggested={suggestedRadius}
                        onWiden={(r) => setRadius(r)}
                      />
                    ) : (
                      <>
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3 px-1 pt-1 text-[13px] text-muted">
                          <span>
                            <strong className="font-semibold text-ink">{ranking.ranked.length}</strong> station
                            {ranking.ranked.length > 1 ? "s" : ""} à moins de {radius} km
                          </span>
                          <span>
                            {effectiveSort === "price" ? "du moins cher au plus cher" : effectiveSort === "distance" ? "de la plus proche à la plus loin" : "du plein le moins cher au plus cher"}
                          </span>
                        </p>
                        <ul className="space-y-2.5">
                          {ranking.ranked.map((item) => (
                            <StationCard
                              key={item.station.id}
                              item={item}
                              fuelChosen={ranking.fuelChosen}
                              rankingFuel={ranking.rankingFuel}
                              isBest={effectiveSort !== "distance" ? item.rank === 1 : item.price.value === bestPrice}
                              active={item.station.id === activeId}
                              now={now}
                              onSelect={() => selectStation(item.station.id)}
                              onHover={(on) => setHoverId(on ? item.station.id : null)}
                            />
                          ))}
                        </ul>
                      </>
                    )}

                    {!ranking.fuelChosen && ranking.unranked.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowUnranked((v) => !v)}
                          className="w-full rounded-xl px-3 py-2 text-left text-[13px] font-medium text-muted hover:bg-paper"
                        >
                          {showUnranked ? "Masquer" : "Voir"} les {ranking.unranked.length} stations sans prix Gazole récent
                        </button>
                        {showUnranked && (
                          <ul className="mt-1 divide-y divide-line rounded-2xl border border-line">
                            {ranking.unranked.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => selectStation(s.id)}
                                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13.5px] hover:bg-paper"
                                >
                                  <span className="min-w-0 truncate">
                                    {s.address} <span className="text-muted">· {s.city}</span>
                                  </span>
                                  <span className="shrink-0 text-muted">{formatDistance(s.distanceKm)}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {hidden > 0 && ranking.ranked.length > 0 && (
                      <p className="px-1 pt-1 text-[12px] leading-relaxed text-muted">
                        Non classées :{" "}
                        {[
                          ranking.fuelChosen && ranking.notSoldCount > 0 && `${ranking.notSoldCount} ne vendent pas de ${fuelName}`,
                          ranking.staleCount > 0 && `${ranking.staleCount} avec un prix de plus de ${MAX_PRICE_AGE_DAYS} jours`,
                          ranking.outageCount > 0 && `${ranking.outageCount} en rupture`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        .
                      </p>
                    )}

                    {isMobile && meta.fetchedAt && (
                      <div className="flex justify-center pt-2">
                        <DataStamp iso={meta.fetchedAt} />
                      </div>
                    )}
                    <LegalFooter className="justify-center pt-4" />
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}

function DataStamp({ iso, compact }: { iso: string; compact?: boolean }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    // Formaté côté client : dépend de la date du jour.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(formatFetchDate(iso));
  }, [iso]);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-paper px-2.5 py-1 text-[12px] font-medium text-ink-2"
      title="Relevé officiel récupéré chaque matin sur prix-carburants.gouv.fr"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-good" />
      {compact ? "Relevé " : "Prix relevés "}
      {label ?? "…"}
    </span>
  );
}

function SheetHandle({ sheet, onChange }: { sheet: Sheet; onChange: (s: Sheet) => void }) {
  const start = useRef<number | null>(null);
  const order: Sheet[] = ["min", "peek", "full"];
  const move = (dir: 1 | -1) => {
    const i = order.indexOf(sheet) + dir;
    if (i >= 0 && i < order.length) onChange(order[i]);
  };
  return (
    <div
      className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3"
      onPointerDown={(e) => {
        start.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const dy = e.clientY - start.current;
        start.current = null;
        if (dy < -25) move(1);
        else if (dy > 25) move(-1);
        else onChange(sheet === "full" ? "peek" : "full");
      }}
      role="button"
      aria-label={sheet === "full" ? "Réduire la liste" : "Agrandir la liste"}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onChange(sheet === "full" ? "peek" : "full");
      }}
    >
      <span className="h-1.5 w-10 rounded-full bg-line-strong" />
    </div>
  );
}

function EmptyState({
  radius,
  fuelName,
  suggested,
  onWiden,
}: {
  radius: number;
  fuelName: string;
  suggested: number | null;
  onWiden: (r: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-line p-6 text-center">
      <p className="font-display text-lg font-bold">Aucune station dans ce périmètre</p>
      <p className="mt-1 text-sm text-muted">
        Pas de prix {fuelName} récent à moins de {radius} km.
      </p>
      {suggested && suggested > radius ? (
        <button
          type="button"
          onClick={() => onWiden(suggested)}
          className="mt-4 h-11 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-2"
        >
          Élargir à {suggested} km
        </button>
      ) : (
        <p className="mt-3 text-sm text-muted">Aucune station trouvée à moins de {MAX_RADIUS_KM} km.</p>
      )}
    </div>
  );
}

function Landing({
  meta,
  mode,
  onMode,
  recent,
  locating,
  notice,
  fuel,
  onFuel,
  onSelect,
  onTrip,
  onLocate,
}: {
  meta: Meta;
  mode: Mode;
  onMode: (m: Mode) => void;
  recent: Place[];
  locating: boolean;
  notice: string | null;
  fuel: FuelId | null;
  onFuel: (f: FuelId | null) => void;
  onSelect: (p: Place) => void;
  onTrip: (from: Place, to: Place) => void;
  onLocate: () => void;
}) {
  const count = meta.stationCount ? new Intl.NumberFormat("fr-FR").format(meta.stationCount) : null;
  // En mode trajet, on reste sur l'accueil tant que départ et arrivée ne sont pas tous deux choisis.
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const pick = (f: Place | null, t: Place | null) => {
    setFrom(f);
    setTo(t);
    if (f && t) onTrip(f, t);
  };
  const locateFrom = () => {
    if (!navigator.geolocation) return onLocate();
    navigator.geolocation.getCurrentPosition(
      async (pos) => pick(await reversePlace(pos.coords.latitude, pos.coords.longitude), to),
      () => onLocate(),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };
  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-[linear-gradient(180deg,rgb(244_242_236_/_0.97)_0%,rgb(244_242_236_/_0.9)_55%,rgb(244_242_236_/_0.55)_100%)]">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-5 pb-10 pt-6 md:px-8 md:pt-8">
        <header className="flex items-center justify-between">
          <Logo />
          {meta.fetchedAt && (
            <span className="hidden sm:block">
              <DataStamp iso={meta.fetchedAt} />
            </span>
          )}
        </header>

        <div className="flex flex-1 flex-col justify-center py-10 md:py-16">
          <p className="animate-rise mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-ink" />
            Prix officiels publiés par l&apos;État
          </p>
          <h1 className="animate-rise font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] [animation-delay:60ms] sm:text-[64px] md:text-[76px]">
            Le plein,
            <br />
            au <span className="relative inline-block">
              <span className="relative z-10">meilleur prix</span>
              <span className="absolute inset-x-[-4px] bottom-[0.08em] z-0 h-[0.34em] -skew-x-6 rounded-sm bg-accent" />
            </span>
            <br />
            {mode === "trip" ? "sur votre route." : "près de chez vous."}
          </h1>
          <p className="animate-rise mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2 [animation-delay:120ms]">
            {mode === "trip"
              ? "Indiquez votre trajet : on calcule l'essence nécessaire et on vous recommande la station la plus avantageuse sur la route."
              : "Entrez votre adresse : on classe les stations autour de vous, de la moins chère à la plus chère."}
          </p>

          <div className="animate-rise relative z-20 mt-8 max-w-2xl [animation-delay:180ms]">
            <ModeSwitch value={mode} onChange={onMode} className="mb-3 w-full max-w-sm bg-surface shadow-sm" />
            {mode === "trip" ? (
              <TripFields
                size="lg"
                from={from}
                to={to}
                recent={recent}
                locating={locating}
                autoFocusTo={Boolean(from && !to)}
                onFrom={(p) => pick(p, to)}
                onTo={(p) => pick(from, p)}
                onSwap={() => pick(to, from)}
                onLocate={locateFrom}
              />
            ) : (
              <AddressSearch size="lg" autoFocus recent={recent} locating={locating} onSelect={onSelect} onLocate={onLocate} />
            )}
            {notice && <p className="mt-2 text-[14px] text-bad">{notice}</p>}
            <div className="mt-5">
              <p className="mb-1.5 text-[13px] font-medium text-muted">
                Votre carburant <span className="font-normal">(facultatif)</span>
              </p>
              <FuelChips value={fuel} onChange={onFuel} />
            </div>
          </div>
        </div>

        <ul className="animate-rise grid gap-3 text-[14px] text-ink-2 [animation-delay:240ms] sm:grid-cols-3">
          {[
            count ? `${count} stations en France` : "Toutes les stations de France",
            "Relevé mis à jour chaque matin",
            "Gratuit, sans compte, sans pub",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-accent">
                <CheckIcon width={12} height={12} strokeWidth={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <LegalFooter className="mt-8" />
      </div>
    </div>
  );
}

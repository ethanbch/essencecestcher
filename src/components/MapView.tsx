"use client";

import {
  Map as MLMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { circleBounds, circlePolygon } from "@/lib/geo";
import type { Place } from "@/lib/geocode";
import { splitPrice } from "@/lib/format";
import { tierHex, type RankedStation } from "@/lib/ranking";
import type { NearbyStation } from "@/lib/types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const FRANCE: [number, number] = [2.45, 46.6];
/** Nombre de pastilles de prix affichées ; les autres stations sont de simples points. */
const defaultMaxPins = () => (window.innerWidth < 768 ? 15 : 40);

// Servi depuis /public (voir scripts/copy-maplibre-worker.mjs).
if (typeof window !== "undefined") setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type MapPadding = { top: number; right: number; bottom: number; left: number };

type Props = {
  place: Place | null;
  radiusKm: number;
  ranked: RankedStation[];
  unranked: NearbyStation[];
  /** Ordre de priorité des pastilles (les moins chères d'abord). */
  pinOrder: RankedStation[];
  activeId: string | null;
  hoverId: string | null;
  padding: MapPadding;
  /** Itinéraire affiché en mode trajet (remplace le cercle du périmètre). */
  route?: { coords: [number, number][]; bbox: [number, number, number, number]; to: Place } | null;
  /** Station mise en avant (sinon : toutes celles au prix le plus bas). */
  bestId?: string | null;
  /** Nombre maximal de pastilles de prix (par défaut selon la taille d'écran). */
  maxPins?: number;
  onSelect: (id: string) => void;
};

export function MapView({
  place,
  radiusKm,
  ranked,
  unranked,
  pinOrder,
  activeId,
  hoverId,
  padding,
  route = null,
  bestId = null,
  maxPins,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; el: HTMLDivElement }>());
  const userMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Création de la carte
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: FRANCE,
      zoom: window.innerWidth < 768 ? 4.3 : 5.2,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("radius", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": "#0e1013", "fill-opacity": 0.035 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": "#0e1013", "line-width": 1.5, "line-dasharray": [2, 2], "line-opacity": 0.45 },
      });

      map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 6, 14, 12] },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#0e1013", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 3, 14, 7] },
      });

      map.addSource("stations", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "stations-dot",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 14, 6.5],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": ["case", ["get", "priced"], 1, 0.55],
        },
      });
      map.on("click", "stations-dot", (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelectRef.current(String(id));
      });
      map.on("mouseenter", "stations-dot", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "stations-dot", () => (map.getCanvas().style.cursor = ""));
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Position de l'utilisateur, périmètre ou itinéraire, et cadrage
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("radius") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: place && !route ? [circlePolygon(place.lat, place.lon, radiusKm)] : [],
    });
    (map.getSource("route") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: route
        ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.coords } }]
        : [],
    });

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    destMarkerRef.current?.remove();
    destMarkerRef.current = null;
    if (!place) {
      map.easeTo({ center: FRANCE, zoom: window.innerWidth < 768 ? 4.3 : 5.2, padding: { top: 0, right: 0, bottom: 0, left: 0 } });
      return;
    }
    const el = document.createElement("div");
    el.className = "user-dot";
    el.title = place.label;
    userMarkerRef.current = new Marker({ element: el }).setLngLat([place.lon, place.lat]).addTo(map);

    // padding volontairement absent des dépendances : on ne recadre pas à chaque redimensionnement du panneau
    if (route) {
      const dest = document.createElement("div");
      dest.className = "dest-flag";
      dest.title = route.to.label;
      destMarkerRef.current = new Marker({ element: dest, anchor: "bottom-left", offset: [-2, 0] })
        .setLngLat([route.to.lon, route.to.lat])
        .addTo(map);
      const [w, s2, e, n] = route.bbox;
      map.fitBounds(
        [
          [w, s2],
          [e, n],
        ],
        { padding: fitPadding(padding), duration: 900, maxZoom: 14 },
      );
    } else {
      map.fitBounds(circleBounds(place.lat, place.lon, radiusKm), { padding: fitPadding(padding), duration: 900, maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, radiusKm, route, ready]);

  // Points de toutes les stations du périmètre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const features = [
      ...ranked.map((r) => feature(r.station, tierHex(r.tier), true)),
      ...unranked.map((s) => feature(s, "#9ca3af", false)),
    ];
    (map.getSource("stations") as GeoJSONSource).setData({ type: "FeatureCollection", features });
  }, [ranked, unranked, ready]);

  // Pastilles de prix
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const wanted = new Map<string, RankedStation>();
    for (const r of pinOrder.slice(0, maxPins ?? defaultMaxPins())) wanted.set(r.station.id, r);
    for (const id of [activeId, hoverId]) {
      const r = id ? ranked.find((x) => x.station.id === id) : undefined;
      if (r) wanted.set(r.station.id, r);
    }
    const best = pinOrder[0]?.price.value;
    const isBest = (r: RankedStation) => (bestId ? r.station.id === bestId : best !== undefined && r.price.value === best);

    const markers = markersRef.current;
    for (const [id, m] of markers) {
      if (!wanted.has(id)) {
        m.marker.remove();
        markers.delete(id);
      }
    }
    for (const [id, r] of wanted) {
      let m = markers.get(id);
      if (!m) {
        // MapLibre pilote position/transform de l'élément du marqueur : le style va sur un enfant.
        const wrapper = document.createElement("div");
        const el = document.createElement("div");
        el.className = "price-pin";
        wrapper.appendChild(el);
        wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current(id);
        });
        const marker = new Marker({ element: wrapper, anchor: "bottom", offset: [0, -4] })
          .setLngLat([r.station.lon, r.station.lat])
          .addTo(map);
        m = { marker, el };
        markers.set(id, m);
      }
      const { main, tail } = splitPrice(r.price.value);
      m.el.innerHTML = `<span class="dot"></span><span>${main}<span style="font-size:.78em;opacity:.75">${tail}</span></span>`;
      m.el.style.setProperty("--tier", tierHex(r.tier));
      m.el.dataset.best = String(isBest(r));
      m.el.dataset.active = String(id === activeId || id === hoverId);
      m.marker.getElement().style.zIndex = id === activeId ? "30" : id === hoverId ? "20" : isBest(r) ? "10" : "1";
      m.el.setAttribute("aria-label", `${r.station.brand ?? "Station"}, ${r.station.address}, ${r.price.value.toFixed(3)} €`);
    }
  }, [pinOrder, ranked, activeId, hoverId, bestId, maxPins, ready]);

  // Centrage sur la station sélectionnée
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !activeId) return;
    const s = ranked.find((r) => r.station.id === activeId)?.station ?? unranked.find((x) => x.id === activeId);
    if (!s) return;
    map.easeTo({
      center: [s.lon, s.lat],
      zoom: Math.max(map.getZoom(), 13),
      padding,
      duration: 700,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, ready]);

  return (
    // Conteneur séparé : la feuille de style MapLibre impose position: relative à l'élément de la carte.
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" aria-label="Carte des stations" />
    </div>
  );
}

function fitPadding(p: MapPadding) {
  return { top: p.top + 40, right: p.right + 40, bottom: p.bottom + 40, left: p.left + 40 };
}

function feature(s: NearbyStation, color: string, priced: boolean) {
  return {
    type: "Feature" as const,
    properties: { id: s.id, color, priced },
    geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
  };
}

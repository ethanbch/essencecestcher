import type { NextRequest } from "next/server";
import { stationsAlongRoute } from "@/lib/corridor";
import { MAX_CORRIDOR_KM, MAX_ROUTE_POINTS } from "@/lib/geo";
import { getDataset } from "@/lib/store";
import type { TripStationsResponse } from "@/lib/types";

type Body = { coords?: unknown; corridorKm?: unknown; distanceKm?: unknown };

/** Stations à moins de `corridorKm` d'un itinéraire (coordonnées [lon, lat], simplifiées côté client). */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const coords = Array.isArray(body.coords) ? body.coords : [];
  const valid =
    coords.length >= 2 &&
    coords.length <= MAX_ROUTE_POINTS &&
    coords.every(
      (c) =>
        Array.isArray(c) &&
        c.length === 2 &&
        Number.isFinite(c[0]) &&
        Number.isFinite(c[1]) &&
        Math.abs(c[0]) <= 180 &&
        Math.abs(c[1]) <= 90,
    );
  if (!valid) return Response.json({ error: "Itinéraire invalide" }, { status: 400 });

  const corridorKm = Math.min(Math.max(Number(body.corridorKm) || 3, 0.5), MAX_CORRIDOR_KM);
  const distanceKm = Number(body.distanceKm) > 0 ? Number(body.distanceKm) : undefined;

  let dataset;
  try {
    dataset = await getDataset();
  } catch (err) {
    console.error("[route-stations] dataset indisponible", err);
    return Response.json({ error: "Données momentanément indisponibles" }, { status: 503 });
  }

  const result: TripStationsResponse = {
    fetchedAt: dataset.fetchedAt,
    corridorKm,
    stations: stationsAlongRoute(dataset.stations, coords as [number, number][], corridorKm, distanceKm),
  };
  return Response.json(result);
}

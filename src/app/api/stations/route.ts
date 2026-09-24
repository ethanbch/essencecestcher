import type { NextRequest } from "next/server";
import { distanceKm, MAX_RADIUS_KM } from "@/lib/geo";
import { getDataset } from "@/lib/store";
import type { NearbyResponse, NearbyStation } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const radiusKm = Math.min(Math.max(Number(params.get("radius")) || 10, 1), MAX_RADIUS_KM);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "Coordonnées invalides" }, { status: 400 });
  }

  let dataset;
  try {
    dataset = await getDataset();
  } catch (err) {
    console.error("[stations] dataset indisponible", err);
    return Response.json({ error: "Données momentanément indisponibles" }, { status: 503 });
  }

  const stations: NearbyStation[] = [];
  for (const s of dataset.stations) {
    // Préfiltre grossier (~1° ≈ 111 km) avant le calcul exact.
    if (Math.abs(s.lat - lat) > radiusKm / 100 || Math.abs(s.lon - lon) > radiusKm / 60) continue;
    const d = distanceKm(lat, lon, s.lat, s.lon);
    if (d <= radiusKm) stations.push({ ...s, distanceKm: Math.round(d * 100) / 100 });
  }
  stations.sort((a, b) => a.distanceKm - b.distanceKm);

  const body: NearbyResponse = { fetchedAt: dataset.fetchedAt, radiusKm, stations };
  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600" },
  });
}

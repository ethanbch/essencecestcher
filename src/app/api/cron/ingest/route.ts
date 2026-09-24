import type { NextRequest } from "next/server";
import { refreshDataset } from "@/lib/store";

export const maxDuration = 60;

/**
 * Job du matin : déclenché chaque jour par Vercel Cron (voir vercel.json).
 * Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!secret && process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "CRON_SECRET manquant" }, { status: 500 });
  }

  const started = Date.now();
  try {
    // ~40 s pour les enseignes : environ 2 000 fiches par jour, le reste au passage suivant.
    const { dataset, enrichment, withBrand } = await refreshDataset({ brandsBudgetMs: 40_000 });
    const result = {
      ok: true,
      stations: dataset.stations.length,
      withBrand,
      brandsFetched: enrichment.fetched,
      brandsRemaining: enrichment.remaining,
      fetchedAt: dataset.fetchedAt,
      durationMs: Date.now() - started,
    };
    console.log("[cron] ingestion OK", result);
    return Response.json(result);
  } catch (err) {
    console.error("[cron] ingestion KO", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

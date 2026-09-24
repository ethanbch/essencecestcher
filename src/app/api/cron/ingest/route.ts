import type { NextRequest } from "next/server";
import { refreshDataset } from "@/lib/store";

// Fluid compute : jusqu'à 300 s, même sur l'offre Hobby.
export const maxDuration = 300;

/**
 * Job du matin : déclenché chaque jour par Vercel Cron (voir vercel.json).
 * Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    console.warn("[cron] appel refusé : en-tête Authorization absent ou incorrect.");
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!secret && process.env.VERCEL_ENV === "production") {
    console.error("[cron] CRON_SECRET absent de ce déploiement : ajoutez-le (Production) puis redéployez.");
    return Response.json({ error: "CRON_SECRET manquant" }, { status: 500 });
  }

  const started = Date.now();
  try {
    // Jusqu'à ~200 s pour les enseignes : un premier remplissage complet (~90 s) tient en un passage,
    // en gardant de la marge sous la limite de 300 s.
    const { dataset, enrichment, withBrand, historyDays } = await refreshDataset({ brandsBudgetMs: 200_000 });
    const result = {
      ok: true,
      stations: dataset.stations.length,
      withBrand,
      brandsFetched: enrichment.fetched,
      brandsRemaining: enrichment.remaining,
      historyDays,
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

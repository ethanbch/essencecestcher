import { prettify } from "./ingest";
import type { Dataset } from "./types";

/**
 * Le flux open data ne contient ni nom ni enseigne. On les lit sur la fiche publique de chaque
 * station (prix-carburants.gouv.fr), progressivement : les enseignes changent rarement.
 */
const INFO_URL = (id: string) => `https://www.prix-carburants.gouv.fr/map/recuperer_infos_pdv/${id}`;
/** Au-delà, une fiche est relue pour suivre les changements d'enseigne. */
const REFRESH_DAYS = 30;

export type StationInfo = { name: string | null; brand: string | null; checkedAt: string };
export type BrandsMap = Record<string, StationInfo>;

export async function fetchStationInfo(id: string, signal?: AbortSignal): Promise<StationInfo | null> {
  const res = await fetch(INFO_URL(id), {
    headers: { "User-Agent": "essencecestcher/1.0", "X-Requested-With": "XMLHttpRequest" },
    cache: "no-store",
    signal,
  });
  if (!res.ok) return null;
  const html = await res.text();
  const name = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1];
  const brand = html.match(/<strong>([\s\S]*?)<\/strong>/)?.[1];
  return {
    name: clean(name),
    brand: clean(brand),
    checkedAt: new Date().toISOString(),
  };
}

function clean(v: string | undefined): string | null {
  if (!v) return null;
  const text = decodeEntities(v.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  return text || null;
}

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Complète `map` dans la limite de `budgetMs` : d'abord les stations jamais vues,
 * puis celles dont la fiche date de plus de REFRESH_DAYS jours. Modifie `map` en place.
 */
export async function enrichBrands(
  ids: string[],
  map: BrandsMap,
  { budgetMs, concurrency = 6 }: { budgetMs: number; concurrency?: number },
): Promise<{ fetched: number; remaining: number }> {
  const staleBefore = Date.now() - REFRESH_DAYS * 86_400_000;
  const missing = ids.filter((id) => !map[id]);
  const stale = ids
    .filter((id) => map[id] && new Date(map[id].checkedAt).getTime() < staleBefore)
    .sort((a, b) => map[a].checkedAt.localeCompare(map[b].checkedAt));
  const queue = [...missing, ...stale];
  const total = queue.length;
  const deadline = Date.now() + budgetMs;
  let fetched = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length && Date.now() < deadline) {
        const id = queue.shift()!;
        try {
          const info = await fetchStationInfo(id, AbortSignal.timeout(8000));
          if (info) {
            map[id] = info;
            fetched++;
          }
        } catch {
          // fiche indisponible : on réessaiera au prochain passage
        }
      }
    }),
  );
  return { fetched, remaining: total - fetched };
}

/** Recopie noms et enseignes connus dans le jeu de données. */
export function applyBrands(dataset: Dataset, map: BrandsMap): Dataset {
  for (const s of dataset.stations) {
    const info = map[s.id];
    if (!info) continue;
    if (info.brand) s.brand = info.brand;
    if (info.name) s.name = prettify(info.name);
  }
  return dataset;
}

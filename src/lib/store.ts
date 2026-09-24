import { promises as fs } from "node:fs";
import path from "node:path";
import { buildAreaIndex, type AreaIndex } from "./areas";
import { applyBrands, enrichBrands, type BrandsMap } from "./enrich";
import { appendToHistory, emptyHistory, type History } from "./history";
import { fetchDataset } from "./ingest";
import type { Dataset } from "./types";

/**
 * Stockage :
 * - En production (Vercel) : Vercel Blob, dès qu'un store est connecté au projet.
 * - En local : des fichiers JSON dans ./data.
 */
const FILES = {
  dataset: "latest.json",
  brands: "brands.json",
  history: "history.json",
} as const;
/** Durée pendant laquelle une instance garde le jeu en mémoire avant de revérifier. */
const MEMORY_TTL_MS = 10 * 60_000;

// Store connecté par jeton (BLOB_READ_WRITE_TOKEN) ou par OIDC (BLOB_STORE_ID), selon la façon dont Vercel l'a relié.
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const blobPath = (file: string) => `carburants/${file}`;
const localPath = (file: string) => path.join(process.cwd(), "data", file);

let memory: { dataset: Dataset; loadedAt: number } | null = null;
let inflight: Promise<Dataset> | null = null;

async function writeJson(file: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value);
  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    await put(blobPath(file), body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
  } else {
    await fs.mkdir(path.dirname(localPath(file)), { recursive: true });
    await fs.writeFile(localPath(file), body);
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  if (blobEnabled()) {
    const { get } = await import("@vercel/blob");
    const res = await get(blobPath(file), { access: "private", useCache: false }).catch(() => null);
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return (await new Response(res.stream).json()) as T;
  }
  try {
    return JSON.parse(await fs.readFile(localPath(file), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  await writeJson(FILES.dataset, dataset);
  memory = { dataset, loadedAt: Date.now() };
}

export const readBrands = async () => (await readJson<BrandsMap>(FILES.brands)) ?? {};
export const saveBrands = (map: BrandsMap) => writeJson(FILES.brands, map);

let historyMemory: { history: History; loadedAt: number } | null = null;

/** Historique des prix moyens (pages SEO). Vide tant que le job n'a pas tourné. */
export async function getHistory(): Promise<History> {
  if (historyMemory && Date.now() - historyMemory.loadedAt < MEMORY_TTL_MS) return historyMemory.history;
  const history = (await readJson<History>(FILES.history).catch(() => null)) ?? emptyHistory();
  historyMemory = { history, loadedAt: Date.now() };
  return history;
}

export async function getAreaIndex(): Promise<AreaIndex> {
  return buildAreaIndex(await getDataset());
}

/**
 * Job du matin : récupère le flux officiel, complète les enseignes dans la limite de
 * `brandsBudgetMs` (les fiches restantes sont traitées aux passages suivants), puis enregistre.
 */
export async function refreshDataset({ brandsBudgetMs = 0 }: { brandsBudgetMs?: number } = {}) {
  const dataset = await fetchDataset();
  const brands = await readBrands();
  let enrichment = { fetched: 0, remaining: 0 };
  if (brandsBudgetMs > 0) {
    enrichment = await enrichBrands(
      dataset.stations.map((s) => s.id),
      brands,
      { budgetMs: brandsBudgetMs },
    );
    if (enrichment.fetched > 0) {
      // Un autre passage a pu écrire entre-temps (lancements manuels simultanés) : on fusionne
      // en gardant, pour chaque station, la fiche la plus récente.
      const latest = await readBrands();
      for (const [id, info] of Object.entries(latest)) {
        if (!brands[id] || brands[id].checkedAt < info.checkedAt) brands[id] = info;
      }
      await saveBrands(brands);
    }
  }
  applyBrands(dataset, brands);
  await saveDataset(dataset);

  const history = appendToHistory((await readJson<History>(FILES.history)) ?? emptyHistory(), buildAreaIndex(dataset));
  await writeJson(FILES.history, history);
  historyMemory = { history, loadedAt: Date.now() };

  const withBrand = dataset.stations.filter((s) => s.brand).length;
  return { dataset, enrichment, withBrand, historyDays: history.days.length };
}

/**
 * Renvoie le jeu de données courant. Si aucun n'a encore été enregistré
 * (premier déploiement, poste de dev tout neuf), on l'initialise à la volée.
 */
export async function getDataset(): Promise<Dataset> {
  if (memory && Date.now() - memory.loadedAt < MEMORY_TTL_MS) return memory.dataset;
  inflight ??= (async () => {
    try {
      const stored = await readJson<Dataset>(FILES.dataset);
      if (stored) {
        memory = { dataset: stored, loadedAt: Date.now() };
        return stored;
      }
      if (memory) return memory.dataset;
      // Aucun jeu enregistré (premier déploiement) : on récupère le flux sans bloquer sur l'écriture.
      const dataset = await fetchDataset();
      await saveDataset(dataset).catch((err) => console.error("[store] enregistrement impossible", err));
      memory = { dataset, loadedAt: Date.now() };
      return dataset;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

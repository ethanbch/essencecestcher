/**
 * Lance l'ingestion à la main.
 * - `npm run ingest` : flux du jour (+ 40 s d'enrichissement des enseignes, comme le cron).
 * - `npm run brands` : rattrapage complet des noms et enseignes (quelques minutes).
 * Sans BLOB_READ_WRITE_TOKEN, écrit dans ./data ; avec, dans Vercel Blob.
 */
import { refreshDataset } from "../src/lib/store";

const full = process.argv.includes("--all-brands");
const started = Date.now();

refreshDataset({ brandsBudgetMs: full ? 30 * 60_000 : 40_000 })
  .then(({ dataset, enrichment, withBrand }) => {
    console.log(`✓ ${dataset.stations.length} stations enregistrées en ${Math.round((Date.now() - started) / 1000)} s`);
    console.log(`  enseignes : ${withBrand} connues, ${enrichment.fetched} fiches lues, ${enrichment.remaining} restantes`);
  })
  .catch((err) => {
    console.error("✗ Ingestion échouée :", err);
    process.exit(1);
  });

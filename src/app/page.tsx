import { connection } from "next/server";
import App from "@/components/App";
import { websiteSchema } from "@/components/seo/schema";
import { JsonLd } from "@/components/seo/SeoShell";
import { buildAreaIndex, cityPath, regionPath, topCities } from "@/lib/areas";
import { getDataset } from "@/lib/store";

export type AreaLink = { name: string; href: string };
export type HomeMeta = {
  fetchedAt: string | null;
  stationCount: number;
  cities: AreaLink[];
  regions: AreaLink[];
};

export default async function Home() {
  await connection();
  let meta: HomeMeta = { fetchedAt: null, stationCount: 0, cities: [], regions: [] };
  try {
    const dataset = await getDataset();
    const index = buildAreaIndex(dataset);
    meta = {
      fetchedAt: dataset.fetchedAt,
      stationCount: dataset.stations.length,
      // Maillage interne : liens crawlables vers les pages villes et régions.
      cities: topCities(index, 16).map((c) => ({ name: c.name, href: cityPath(c) })),
      regions: index.regions.map((r) => ({ name: r.region.name, href: regionPath(r.region) })),
    };
  } catch (err) {
    // La page reste utilisable : l'API renverra une erreur explicite si les données manquent.
    console.error("[home] dataset indisponible", err);
  }
  return (
    <>
      <JsonLd data={websiteSchema()} />
      <App meta={meta} />
    </>
  );
}

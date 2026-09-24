import { connection } from "next/server";
import App from "@/components/App";
import { getDataset } from "@/lib/store";

export default async function Home() {
  await connection();
  let meta: { fetchedAt: string | null; stationCount: number } = { fetchedAt: null, stationCount: 0 };
  try {
    const dataset = await getDataset();
    meta = { fetchedAt: dataset.fetchedAt, stationCount: dataset.stations.length };
  } catch (err) {
    // La page reste utilisable : l'API renverra une erreur explicite si les données manquent.
    console.error("[home] dataset indisponible", err);
  }
  return <App meta={meta} />;
}

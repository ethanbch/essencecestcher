import type { MetadataRoute } from "next";
import { cityPath, regionPath } from "@/lib/areas";
import { SITE } from "@/lib/site";
import { getAreaIndex } from "@/lib/store";

// Régénéré au plus toutes les heures ; lastmod = date du dernier relevé des prix.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => new URL(path, SITE.url).toString();
  const index = await getAreaIndex();
  const lastModified = new Date(index.fetchedAt);
  return [
    { url: SITE.url, lastModified, changeFrequency: "daily", priority: 1 },
    { url: url("/prix-carburant"), lastModified, changeFrequency: "daily", priority: 0.9 },
    ...index.regions.map((r) => ({ url: url(regionPath(r.region)), lastModified, changeFrequency: "daily" as const, priority: 0.8 })),
    ...[...index.cities.values()].map((c) => ({
      url: url(cityPath(c)),
      lastModified,
      changeFrequency: "daily" as const,
      priority: c.stations.length >= 10 ? 0.7 : 0.5,
    })),
    { url: url("/mentions-legales"), changeFrequency: "yearly", priority: 0.1 },
    { url: url("/confidentialite"), changeFrequency: "yearly", priority: 0.1 },
  ];
}

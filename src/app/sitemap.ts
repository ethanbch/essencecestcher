import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
}

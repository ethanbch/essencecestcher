import { FUELS } from "@/lib/fuels";
import type { Stats } from "@/lib/areas";
import { SITE } from "@/lib/site";
import type { Station } from "@/lib/types";
import { stationTitle } from "../BrandMark";
import type { Crumb } from "./SeoShell";

/**
 * Données structurées schema.org. Choix volontairement honnêtes :
 * - BreadcrumbList : fil d'Ariane dans les résultats Google ;
 * - ItemList de GasStation : les stations sont des commerces locaux (nom, adresse, coordonnées) ;
 * - Dataset : les prix sont un jeu de données public (Google Dataset Search).
 * Pas de Product/AggregateOffer : un carburant vendu par des stations tierces n'est pas « notre » produit,
 * et Google sanctionne les balisages trompeurs.
 */

const abs = (path: string) => new URL(path, SITE.url).toString();

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

export function stationsSchema(stations: Station[], name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: stations.length,
    itemListElement: stations.map((s, i) => {
      const t = stationTitle(s);
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "GasStation",
          name: t.name ? `${t.title} ${t.name}` : t.title,
          ...(s.brand ? { brand: { "@type": "Brand", name: s.brand } } : {}),
          address: {
            "@type": "PostalAddress",
            streetAddress: s.address,
            postalCode: s.postcode,
            addressLocality: s.city,
            addressCountry: "FR",
          },
          geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lon },
        },
      };
    }),
  };
}

export function datasetSchema({
  name,
  description,
  path,
  place,
  stats,
  fetchedAt,
  firstDay,
}: {
  name: string;
  description: string;
  path: string;
  place: { name: string; lat?: number; lon?: number };
  stats: Stats;
  fetchedAt: string;
  firstDay?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url: abs(path),
    isAccessibleForFree: true,
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
    creator: { "@type": "Organization", name: "Ministère de l'Économie – prix-carburants.gouv.fr", url: "https://www.prix-carburants.gouv.fr/" },
    dateModified: fetchedAt,
    ...(firstDay ? { temporalCoverage: `${firstDay}/..` } : {}),
    spatialCoverage: {
      "@type": "Place",
      name: place.name,
      ...(place.lat !== undefined ? { geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lon } } : {}),
    },
    variableMeasured: FUELS.filter((f) => stats[f.id]).map((f) => ({
      "@type": "PropertyValue",
      name: `Prix moyen ${f.label}`,
      unitText: "EUR/L",
      value: Number(stats[f.id]!.avg.toFixed(3)),
    })),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "fr-FR",
    description: SITE.description,
  };
}

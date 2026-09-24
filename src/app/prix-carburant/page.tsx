import type { Metadata } from "next";
import { AreaLinks, euro, FuelStatsGrid, longDate } from "@/components/seo/Blocks";
import { areaCopy } from "@/components/seo/copy";
import { breadcrumbSchema, datasetSchema } from "@/components/seo/schema";
import { JsonLd, SeoShell, Section, type Crumb } from "@/components/seo/SeoShell";
import { cityPath, regionPath, topCities } from "@/lib/areas";
import { getAreaIndex, getDataset, getHistory } from "@/lib/store";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const index = await getAreaIndex();
  const g = index.national.gazole;
  const e = index.national.e10;
  const title = `Prix des carburants en France aujourd'hui${g ? ` : gazole ${euro(g.avg)}` : ""}${e ? `, SP95-E10 ${euro(e.avg)}` : ""}`;
  const description = `Prix moyens de l'essence et du gazole en France, par région et par ville, calculés sur ${index.stationCount.toLocaleString("fr-FR")} stations. Données officielles mises à jour chaque jour.`;
  return {
    title,
    description,
    alternates: { canonical: "/prix-carburant" },
    openGraph: { title, description, url: "/prix-carburant" },
  };
}

export default async function FrancePage() {
  const [index, history, dataset] = await Promise.all([getAreaIndex(), getHistory(), getDataset()]);
  const crumbs: Crumb[] = [{ name: "France", href: "/prix-carburant" }];
  const regions = [...index.regions].sort((a, b) => (a.stats.gazole?.avg ?? 9) - (b.stats.gazole?.avg ?? 9));
  const paragraphs = areaCopy({
    inName: "en France",
    stats: index.national,
    stationCount: index.stationCount,
    history,
    series: history.national,
    cheapestStation: dataset.stations.find((s) => s.id === index.national.gazole?.minStationId),
  });

  return (
    <SeoShell crumbs={crumbs}>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <JsonLd
        data={datasetSchema({
          name: "Prix des carburants en France",
          description: "Prix moyens de l'essence et du gazole en France, par région, par ville et par station.",
          path: "/prix-carburant",
          place: { name: "France" },
          stats: index.national,
          fetchedAt: index.fetchedAt,
          firstDay: history.days[0],
        })}
      />

      <h1 className="mt-4 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
        Prix des carburants en France aujourd&apos;hui
      </h1>
      <p className="mt-3 text-ink-2">
        {index.stationCount.toLocaleString("fr-FR")} stations · relevé officiel du {longDate(index.fetchedAt)}
      </p>

      <div className="mt-8">
        <FuelStatsGrid stats={index.national} />
      </div>

      <Section title="En bref">
        <div className="max-w-3xl space-y-3 text-[15.5px] leading-relaxed text-ink-2">
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>

      <Section title="Prix moyen du gazole par région">
        <AreaLinks
          items={regions.map((r) => ({
            href: regionPath(r.region),
            name: r.region.name,
            hint: `${r.stationCount} stations`,
            price: r.stats.gazole?.avg,
          }))}
        />
      </Section>

      <Section title="Prix des carburants dans les grandes villes">
        <AreaLinks
          items={topCities(index, 24).map((c) => ({
            href: cityPath(c),
            name: `${c.name} (${c.department})`,
            hint: `${c.stations.length} stations · gazole moyen`,
            price: c.stats.gazole?.avg,
          }))}
        />
      </Section>
    </SeoShell>
  );
}

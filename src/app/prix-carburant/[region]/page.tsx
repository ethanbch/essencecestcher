import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaLinks, euro, FuelStatsGrid, longDate, StationTable } from "@/components/seo/Blocks";
import { areaCopy } from "@/components/seo/copy";
import { breadcrumbSchema, datasetSchema } from "@/components/seo/schema";
import { JsonLd, SeoShell, Section, type Crumb } from "@/components/seo/SeoShell";
import { cityPath, regionPath } from "@/lib/areas";
import { DEPARTMENT_NAMES } from "@/lib/geo-fr";
import { usablePrice } from "@/lib/ranking";
import { getAreaIndex, getHistory } from "@/lib/store";
import type { Station } from "@/lib/types";

export const dynamic = "force-static";
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ region: string }> };

async function load(params: Props["params"]) {
  const { region } = await params;
  const index = await getAreaIndex();
  const area = index.regions.find((r) => r.region.slug === region);
  if (!area) notFound();
  return { index, area };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await load(params);
  const { region, stats } = area;
  const g = stats.gazole;
  const title = `Prix carburant ${region.inName}${g ? ` : gazole ${euro(g.avg)} en moyenne` : ""}`;
  const description =
    `Prix de l'essence et du gazole ${region.inName} : moyennes, stations les moins chères et prix dans ${area.cities.length} villes` +
    ` (${area.stationCount} stations). Données officielles mises à jour chaque jour.`;
  return {
    title,
    description,
    alternates: { canonical: regionPath(region) },
    openGraph: { title, description, url: regionPath(region) },
    twitter: { card: "summary_large_image", title, description },
  };
}

const mapHref = (s: Station) =>
  `/?${new URLSearchParams({ q: `${s.address}, ${s.city}`, lat: s.lat.toFixed(5), lon: s.lon.toFixed(5), r: "5", s: s.id })}`;

export default async function RegionPage({ params }: Props) {
  const { index, area } = await load(params);
  const history = await getHistory();
  const { region } = area;
  const now = new Date(index.fetchedAt).getTime();

  const crumbs: Crumb[] = [
    { name: "France", href: "/prix-carburant" },
    { name: region.name, href: regionPath(region) },
  ];
  const cheapest = area.stations
    .filter((s) => usablePrice(s, "gazole", now))
    .sort((a, b) => usablePrice(a, "gazole", now)!.value - usablePrice(b, "gazole", now)!.value)
    .slice(0, 10);
  const byDepartment = region.departments
    .map((d) => ({ code: d, cities: area.cities.filter((c) => c.department === d).sort((a, b) => a.name.localeCompare(b.name, "fr")) }))
    .filter((d) => d.cities.length > 0);
  const paragraphs = areaCopy({
    inName: region.inName,
    stats: area.stats,
    national: index.national,
    stationCount: area.stationCount,
    history,
    series: history.regions[region.slug],
    cheapestStation: area.stations.find((s) => s.id === area.stats.gazole?.minStationId),
  });

  return (
    <SeoShell
      crumbs={crumbs}
      footerLinks={
        <div>
          <p className="mb-2 text-[13.5px] font-semibold">Autres régions</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13.5px] text-ink-2">
            {index.regions
              .filter((r) => r.region.slug !== region.slug)
              .map((r) => (
                <Link key={r.region.slug} href={regionPath(r.region)} className="hover:text-ink hover:underline">
                  {r.region.name}
                </Link>
              ))}
          </p>
        </div>
      }
    >
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <JsonLd
        data={datasetSchema({
          name: `Prix des carburants ${region.inName}`,
          description: `Prix moyens de l'essence et du gazole ${region.inName}, par ville et par station.`,
          path: regionPath(region),
          place: { name: region.name },
          stats: area.stats,
          fetchedAt: index.fetchedAt,
          firstDay: history.days[0],
        })}
      />

      <h1 className="mt-4 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
        Prix des carburants {region.inName}
      </h1>
      <p className="mt-3 text-ink-2">
        {area.stationCount} stations · {area.cities.length} villes · relevé officiel du {longDate(index.fetchedAt)}
      </p>

      <div className="mt-8">
        <FuelStatsGrid stats={area.stats} reference={index.national} />
      </div>

      <Section title="En bref">
        <div className="max-w-3xl space-y-3 text-[15.5px] leading-relaxed text-ink-2">
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>

      <Section title={`Les 10 stations où le gazole est le moins cher ${region.inName}`}>
        <StationTable stations={cheapest} now={now} mapHref={mapHref} />
      </Section>

      <Section title={`Prix des carburants par ville ${region.inName}`}>
        <div className="space-y-8">
          {byDepartment.map((d) => (
            <div key={d.code}>
              <h3 className="mb-3 text-[15px] font-semibold">
                {DEPARTMENT_NAMES[d.code] ?? d.code} ({d.code})
              </h3>
              <AreaLinks
                items={d.cities.map((c) => ({
                  href: cityPath(c),
                  name: c.name,
                  hint: `${c.stations.length} stations · gazole moyen`,
                  price: c.stats.gazole?.avg,
                }))}
              />
            </div>
          ))}
        </div>
      </Section>
    </SeoShell>
  );
}

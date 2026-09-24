import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AreaLinks, euro, FuelStatsGrid, longDate, StationTable } from "@/components/seo/Blocks";
import { cityCopy } from "@/components/seo/copy";
import { breadcrumbSchema, datasetSchema, stationsSchema } from "@/components/seo/schema";
import { JsonLd, SeoShell, Section, type Crumb } from "@/components/seo/SeoShell";
import { cityPath, nearbyCities, regionPath, type City } from "@/lib/areas";
import { DEPARTMENT_NAMES } from "@/lib/geo-fr";
import { getAreaIndex, getHistory } from "@/lib/store";
import type { Station } from "@/lib/types";

// ISR : pages générées à la première visite puis régénérées au plus toutes les heures.
export const dynamic = "force-static";
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ region: string; ville: string }> };

async function load(params: Props["params"]) {
  const { region, ville } = await params;
  const index = await getAreaIndex();
  const city = index.cities.get(ville);
  if (!city) notFound();
  // Mauvaise région dans l'URL : redirection vers l'adresse canonique.
  if (city.region.slug !== region) permanentRedirect(cityPath(city));
  return { index, city };
}

const title = (c: City) => `${c.name} (${c.department})`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await load(params);
  const g = city.stats.gazole;
  const e = city.stats.e10;
  const prices = [g && `gazole ${euro(g.avg)}`, e && `SP95-E10 ${euro(e.avg)}`].filter(Boolean).join(", ");
  const pageTitle = `Prix carburant à ${title(city)}${prices ? ` : ${prices}` : ""}`;
  const description =
    `Comparez les prix de l'essence et du gazole dans les ${city.stations.length} stations de ${city.name}` +
    `${g ? ` : gazole dès ${euro(g.min)}` : ""}${e ? `, SP95-E10 dès ${euro(e.min)}` : ""}. Prix officiels mis à jour chaque jour.`;
  return {
    title: pageTitle,
    description,
    alternates: { canonical: cityPath(city) },
    openGraph: { title: pageTitle, description, url: cityPath(city), type: "website" },
    twitter: { card: "summary_large_image", title: pageTitle, description },
  };
}

const mapHref = (s: Station) =>
  `/?${new URLSearchParams({ q: `${s.address}, ${s.city}`, lat: s.lat.toFixed(5), lon: s.lon.toFixed(5), r: "5", s: s.id })}`;

export default async function CityPage({ params }: Props) {
  const { index, city } = await load(params);
  const history = await getHistory();
  const now = new Date(index.fetchedAt).getTime();
  const neighbours = nearbyCities(index, city, 9);
  const cheaper =
    neighbours.find((n) => n.distanceKm <= 25 && n.stats.gazole && city.stats.gazole && n.stats.gazole.avg < city.stats.gazole.avg - 0.01) ?? null;

  const crumbs: Crumb[] = [
    { name: "France", href: "/prix-carburant" },
    { name: city.region.name, href: regionPath(city.region) },
    { name: city.name, href: cityPath(city) },
  ];
  const paragraphs = cityCopy({ city, national: index.national, history, cheaperNeighbour: cheaper, now });
  const mapLink = `/?${new URLSearchParams({ q: city.name, lat: city.lat.toFixed(5), lon: city.lon.toFixed(5), r: "5" })}`;

  return (
    <SeoShell
      crumbs={crumbs}
      footerLinks={
        <p className="text-[13.5px] text-ink-2">
          Voir aussi :{" "}
          <Link href={regionPath(city.region)} className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">
            prix des carburants en {city.region.name}
          </Link>{" "}
          ·{" "}
          <Link href="/prix-carburant" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">
            prix moyens en France
          </Link>
        </p>
      }
    >
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <JsonLd data={stationsSchema(city.stations, `Stations-service à ${city.name}`)} />
      <JsonLd
        data={datasetSchema({
          name: `Prix des carburants à ${city.name}`,
          description: `Prix moyens et par station de l'essence et du gazole à ${city.name} (${DEPARTMENT_NAMES[city.department] ?? city.department}).`,
          path: cityPath(city),
          place: { name: city.name, lat: city.lat, lon: city.lon },
          stats: city.stats,
          fetchedAt: index.fetchedAt,
          firstDay: history.days[0],
        })}
      />

      <h1 className="mt-4 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
        Prix de l&apos;essence et du gazole à {city.name}
      </h1>
      <p className="mt-3 text-ink-2">
        {DEPARTMENT_NAMES[city.department]} ({city.department}) · {city.stations.length} stations · relevé officiel du {longDate(index.fetchedAt)}
      </p>

      <div className="mt-8">
        <FuelStatsGrid stats={city.stats} reference={index.national} />
      </div>

      <Link
        href={mapLink}
        className="mt-6 inline-flex h-12 items-center rounded-2xl bg-accent px-5 font-semibold text-accent-ink transition hover:brightness-95"
      >
        Voir les stations de {city.name} sur la carte →
      </Link>

      <Section title={`Les stations-service à ${city.name}`}>
        <StationTable stations={city.stations} now={now} mapHref={mapHref} />
        <p className="mt-2 text-[12.5px] text-muted">
          Prix au litre, du gazole le moins cher au plus cher. En vert : le prix le plus bas de chaque carburant. Les prix de plus de 7
          jours ne sont pas affichés.
        </p>
      </Section>

      <Section title={`Le prix des carburants à ${city.name} en bref`}>
        <div className="max-w-3xl space-y-3 text-[15.5px] leading-relaxed text-ink-2">
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>

      {neighbours.length > 0 && (
        <Section title={`Prix des carburants près de ${city.name}`}>
          <AreaLinks
            items={neighbours.map((n) => ({
              href: cityPath(n),
              name: n.name,
              hint: `${Math.round(n.distanceKm)} km · gazole moyen`,
              price: n.stats.gazole?.avg,
            }))}
          />
        </Section>
      )}
    </SeoShell>
  );
}

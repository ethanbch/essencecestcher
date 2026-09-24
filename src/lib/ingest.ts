import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { FUEL_BY_FEED_NAME, type FuelId } from "./fuels";
import type { Dataset, DayHours, Outage, PriceEntry, Station } from "./types";

/** Flux officiel « instantané » du ministère de l'Économie (prix-carburants.gouv.fr). */
export const FEED_URL = "https://donnees.roulez-eco.fr/opendata/instantane";

type Attr = Record<string, string | undefined>;
type RawPdv = Attr & {
  adresse?: string;
  ville?: string;
  horaires?: Attr & { jour?: (Attr & { horaire?: Attr[] })[] };
  services?: { service?: string[] };
  prix?: Attr[];
  rupture?: Attr[];
};

export async function fetchDataset(): Promise<Dataset> {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": "essencecestcher/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Flux carburants indisponible (HTTP ${res.status})`);

  const zip = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const xmlFile = Object.keys(zip).find((name) => name.endsWith(".xml"));
  if (!xmlFile) throw new Error("Archive du flux sans fichier XML");

  // Le flux est encodé en ISO-8859-1.
  const xml = new TextDecoder("latin1").decode(zip[xmlFile]);
  const stations = parseFeed(xml);
  if (stations.length < 1000) {
    throw new Error(`Flux suspect : seulement ${stations.length} stations`);
  }

  return { fetchedAt: new Date().toISOString(), source: FEED_URL, stations };
}

export function parseFeed(xml: string): Station[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: false,
    parseTagValue: false,
    // Le flux contient des entités HTML numériques (« Salleb&#339;uf »).
    htmlEntities: true,
    isArray: (name) => ["pdv", "jour", "horaire", "service", "prix", "rupture"].includes(name),
  });
  const doc = parser.parse(xml) as { pdv_liste?: { pdv?: RawPdv[] } };
  const stations: Station[] = [];
  for (const pdv of doc.pdv_liste?.pdv ?? []) {
    const station = toStation(pdv);
    if (station) stations.push(station);
  }
  return stations;
}

function toStation(pdv: RawPdv): Station | null {
  const lat = Number(pdv.latitude) / 100000;
  const lon = Number(pdv.longitude) / 100000;
  if (!pdv.id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat === 0 || lon === 0 || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  const prices: Station["prices"] = {};
  for (const p of pdv.prix ?? []) {
    const fuel = p.nom ? FUEL_BY_FEED_NAME[p.nom] : undefined;
    const value = Number(p.valeur);
    if (!fuel || !p.maj || !Number.isFinite(value) || value <= 0) continue;
    // Certaines anciennes déclarations sont en millièmes d'euro.
    const normalized = value > 20 ? value / 1000 : value;
    prices[fuel] = { value: normalized, updatedAt: parisToIso(p.maj) } satisfies PriceEntry;
  }

  const outages: Station["outages"] = {};
  for (const r of pdv.rupture ?? []) {
    const fuel = r.nom ? FUEL_BY_FEED_NAME[r.nom] : undefined;
    if (!fuel) continue;
    // Une rupture avec une date de fin est terminée.
    if (r.fin) continue;
    outages[fuel as FuelId] = {
      type: r.type === "definitive" ? "definitive" : "temporaire",
      since: r.debut ? parisToIso(r.debut) : null,
    } satisfies Outage;
  }

  const hours: DayHours[] = (pdv.horaires?.jour ?? [])
    .map((j) => ({
      day: Number(j.id),
      closed: j.ferme === "1",
      slots: (j.horaire ?? [])
        .filter((h) => h.ouverture && h.fermeture && h.ouverture !== h.fermeture)
        .map((h) => [toHHMM(h.ouverture!), toHHMM(h.fermeture!)] as [string, string]),
    }))
    .filter((d) => d.day >= 1 && d.day <= 7);

  return {
    id: pdv.id,
    lat: round(lat, 5),
    lon: round(lon, 5),
    address: prettify(String(pdv.adresse ?? "").trim()),
    city: prettify(String(pdv.ville ?? "").trim()),
    postcode: pdv.cp ?? "",
    highway: pdv.pop === "A",
    open24: pdv.horaires?.["automate-24-24"] === "1",
    hours,
    services: pdv.services?.service?.map((s) => String(s).trim()).filter(Boolean) ?? [],
    prices,
    outages,
  };
}

function round(n: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function toHHMM(v: string) {
  const [h = "0", m = "0"] = v.split(/[.:h]/);
  return `${h.padStart(2, "0")}:${m.padEnd(2, "0").slice(0, 2)}`;
}

/** "2026-09-18 09:07:28" (heure de Paris) → ISO 8601 avec le bon décalage. */
export function parisToIso(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
  if (!m) return new Date(local).toISOString();
  const [, y, mo, d, h, mi, s = "00"] = m;
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  const offsetMin = parisOffsetMinutes(new Date(asUtc));
  return new Date(asUtc - offsetMin * 60_000).toISOString();
}

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  timeZoneName: "longOffset",
});

function parisOffsetMinutes(date: Date): number {
  const name = offsetFormatter.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

const LOWER_WORDS = new Set(["de", "du", "des", "la", "le", "les", "et", "sur", "en", "aux", "au", "sous", "lès", "les"]);

/** "84 ROUTE DE MAILLOT" → "84 Route de Maillot". Laisse intactes les chaînes déjà en casse mixte. */
export function prettify(value: string): string {
  // Considéré « en capitales » s'il n'a aucune minuscule non accentuée (le flux écrit parfois « VéNISSIEUX »).
  if (!value || /[a-z]/.test(value)) return value.replace(/\s+/g, " ");
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word, i) => {
      if (i > 0 && LOWER_WORDS.has(word)) return word;
      return word
        .split(/([-'’])/)
        .map((part) => {
          if (part === "d" || part === "l") return i > 0 ? part : part.toUpperCase();
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join("");
    })
    .join(" ");
}

/** Géocodage via la Géoplateforme de l'IGN (Base Adresse Nationale), gratuite et sans clé. */
const BASE = "https://data.geopf.fr/geocodage";

export type Place = {
  label: string;
  /** Complément affiché en gris : "Paris 5e · Île-de-France". */
  context?: string;
  lat: number;
  lon: number;
};

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    name?: string;
    city?: string;
    postcode?: string;
    context?: string;
    type?: string;
    district?: string;
  };
};

function toPlace(f: Feature): Place {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const region = p.context?.split(",").slice(1).join(",").trim();
  if (p.type === "municipality") {
    return { label: p.city ?? p.label, context: [p.postcode, region].filter(Boolean).join(" · "), lat, lon };
  }
  return {
    label: p.name ?? p.label,
    context: [p.postcode && p.city ? `${p.postcode} ${p.city}` : p.city, region].filter(Boolean).join(" · "),
    lat,
    lon,
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&limit=6&autocomplete=1&index=address`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Géocodage indisponible (${res.status})`);
  const json = (await res.json()) as { features: Feature[] };
  return json.features.map(toPlace);
}

export async function reversePlace(lat: number, lon: number): Promise<Place> {
  try {
    const res = await fetch(`${BASE}/reverse?lat=${lat}&lon=${lon}&limit=1&index=address`);
    const json = (await res.json()) as { features: Feature[] };
    const f = json.features[0];
    if (f) return { ...toPlace(f), lat, lon };
  } catch {
    // On garde les coordonnées brutes si le géocodage inverse échoue.
  }
  return { label: "Ma position", lat, lon };
}

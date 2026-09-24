import type { FuelId } from "./fuels";

export type PriceEntry = {
  /** Prix au litre, en euros. */
  value: number;
  /** Date de déclaration du prix par la station (ISO 8601). */
  updatedAt: string;
};

export type Outage = {
  type: "temporaire" | "definitive";
  since: string | null;
};

export type DayHours = {
  /** 1 = lundi … 7 = dimanche */
  day: number;
  closed: boolean;
  /** Créneaux "HH:MM"–"HH:MM". Vide si non renseigné. */
  slots: [string, string][];
};

export type Station = {
  id: string;
  /** Nom commercial (fiche publique), ex. « Relais Raclet ». */
  name?: string;
  /** Enseigne telle que publiée, ex. « TotalEnergies Access ». */
  brand?: string;
  lat: number;
  lon: number;
  address: string;
  city: string;
  postcode: string;
  /** Station sur autoroute. */
  highway: boolean;
  /** Automate carte bancaire 24 h/24. */
  open24: boolean;
  hours: DayHours[];
  services: string[];
  prices: Partial<Record<FuelId, PriceEntry>>;
  outages: Partial<Record<FuelId, Outage>>;
};

export type Dataset = {
  /** Moment où notre job a récupéré le flux (ISO 8601). */
  fetchedAt: string;
  source: string;
  stations: Station[];
};

export type NearbyStation = Station & { distanceKm: number };

export type NearbyResponse = {
  fetchedAt: string;
  radiusKm: number;
  stations: NearbyStation[];
};

/** Station proche d'un itinéraire : `distanceKm` = distance à la route. */
export type TripStation = NearbyStation & {
  /** Position le long du trajet, en km depuis le départ. */
  alongKm: number;
};

export type TripStationsResponse = {
  fetchedAt: string;
  corridorKm: number;
  stations: TripStation[];
};

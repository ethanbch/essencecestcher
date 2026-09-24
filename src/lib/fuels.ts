export const FUELS = [
  { id: "gazole", label: "Gazole", short: "Gazole", feed: "Gazole" },
  { id: "e10", label: "SP95-E10", short: "E10", feed: "E10" },
  { id: "sp98", label: "SP98", short: "SP98", feed: "SP98" },
  { id: "sp95", label: "SP95", short: "SP95", feed: "SP95" },
  { id: "e85", label: "E85", short: "E85", feed: "E85" },
  { id: "gplc", label: "GPLc", short: "GPLc", feed: "GPLc" },
] as const;

export type FuelId = (typeof FUELS)[number]["id"];

/** Carburant utilisé pour classer quand l'utilisateur n'a rien choisi. */
export const DEFAULT_RANKING_FUEL: FuelId = "gazole";

/** Au-delà de cet âge, un prix est jugé trop ancien pour être fiable. */
export const MAX_PRICE_AGE_DAYS = 7;

export const FUEL_BY_FEED_NAME: Record<string, FuelId> = Object.fromEntries(
  FUELS.map((f) => [f.feed, f.id]),
);

export function fuelLabel(id: FuelId): string {
  return FUELS.find((f) => f.id === id)?.label ?? id;
}

export function isFuelId(value: unknown): value is FuelId {
  return FUELS.some((f) => f.id === value);
}

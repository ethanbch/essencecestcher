import type { DayHours } from "./types";

const eur2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const num1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export const formatEuros = (v: number) => eur2.format(v);

/** Prix au litre découpé à la manière des totems : "1,79" + "9". */
export function splitPrice(v: number): { main: string; tail: string } {
  const s = v.toFixed(3).replace(".", ",");
  return { main: s.slice(0, -1), tail: s.slice(-1) };
}

export const formatLiterPrice = (v: number) => `${v.toFixed(3).replace(".", ",")} €`;

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${num1.format(km)} km`;
}

export function formatDiff(v: number): string {
  const cents = v * 100;
  const s = Math.abs(cents) < 10 ? cents.toFixed(1) : Math.round(cents).toString();
  return `+${s.replace(".", ",")} ct`;
}

export function ageMs(iso: string, now = Date.now()) {
  return now - new Date(iso).getTime();
}

export type Freshness = "fresh" | "recent" | "aging" | "stale";

export function freshness(iso: string, now = Date.now()): Freshness {
  const h = ageMs(iso, now) / 3_600_000;
  if (h < 24) return "fresh";
  if (h < 72) return "recent";
  if (h < 24 * 7) return "aging";
  return "stale";
}

export const FRESHNESS_COLOR: Record<Freshness, string> = {
  fresh: "var(--good)",
  recent: "#65a30d",
  aging: "var(--warn)",
  stale: "var(--bad)",
};

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso)).replace(":", " h ");

/** "ce matin à 6 h 04", "hier à 6 h 04", "lundi 22 septembre à 6 h 04" */
export function formatFetchDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => dateFmt.format(x);
  const time = formatTime(iso);
  if (day(d) === day(now)) {
    const hour = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric" }).format(d));
    return `${hour < 12 ? "ce matin" : "aujourd'hui"} à ${time}`;
  }
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day(d) === day(yesterday)) return `hier à ${time}`;
  return `${day(d)} à ${time}`;
}

export const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** Jour (1 = lundi) et minutes écoulées, à l'heure de Paris. */
export function parisNow(now = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export type OpenState = { state: "open" | "closed" | "unknown"; label: string };

export function openState(hours: DayHours[], open24: boolean, now = new Date()): OpenState {
  const { day, minutes } = parisNow(now);
  const today = hours.find((h) => h.day === day);
  if (today?.closed) {
    return open24 ? { state: "open", label: "Automate 24/24" } : { state: "closed", label: "Fermé aujourd'hui" };
  }
  if (!today || today.slots.length === 0) {
    return open24 ? { state: "open", label: "Automate 24/24" } : { state: "unknown", label: "Horaires non communiqués" };
  }
  for (const [o, c] of today.slots) {
    const open = toMin(o);
    let close = toMin(c);
    if (close <= open) close += 24 * 60;
    if (minutes >= open && minutes < close) {
      return { state: "open", label: `Ouvert · ferme à ${c.replace(":", " h ")}` };
    }
  }
  if (open24) return { state: "open", label: "Automate 24/24" };
  const next = today.slots.find(([o]) => toMin(o) > minutes);
  return { state: "closed", label: next ? `Fermé · ouvre à ${next[0].replace(":", " h ")}` : "Fermé" };
}

export function formatSlots(d: DayHours | undefined): string {
  if (!d) return "—";
  if (d.closed) return "Fermé";
  if (d.slots.length === 0) return "Non communiqué";
  return d.slots.map(([o, c]) => `${o.replace(":", "h")} – ${c.replace(":", "h")}`).join(", ");
}

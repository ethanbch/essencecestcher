import Link from "next/link";
import { FUELS, type FuelId } from "@/lib/fuels";
import type { Stats } from "@/lib/areas";
import { formatDateTime } from "@/lib/format";
import { usablePrice } from "@/lib/ranking";
import type { Station } from "@/lib/types";
import { BrandMark, stationTitle } from "../BrandMark";

const longDateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
/** « jeudi 24 septembre 2026 » */
export const longDate = (iso: string) => longDateFmt.format(new Date(iso));

export const euro = (v: number) => `${v.toFixed(3).replace(".", ",")} €`;

/** Écart signé en centimes : « +0,4 ct », « −2 ct ». */
export function cents(deltaEuros: number): string {
  const c = deltaEuros * 100;
  const abs = Math.abs(c);
  const s = abs < 10 ? abs.toFixed(1).replace(".", ",").replace(",0", "") : String(Math.round(abs));
  return `${c >= 0 ? "+" : "−"}${s} ct`;
}

/** Carburants présents dans ces statistiques, dans l'ordre d'affichage. */
export const fuelsIn = (stats: Stats) => FUELS.filter((f) => stats[f.id]);

/** Cartes « prix moyen » par carburant, comparées à une référence (moyenne nationale). */
export function FuelStatsGrid({ stats, reference, referenceLabel }: { stats: Stats; reference?: Stats; referenceLabel?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {fuelsIn(stats).map((f) => {
        const s = stats[f.id]!;
        const ref = reference?.[f.id];
        const delta = ref ? s.avg - ref.avg : null;
        return (
          <li key={f.id} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[13px] font-semibold text-muted">{f.label}</p>
            <p className="mt-1 font-mono text-[26px] font-semibold tabular leading-none">{euro(s.avg)}</p>
            <p className="mt-1 text-[12.5px] text-muted">prix moyen · {s.count} station{s.count > 1 ? "s" : ""}</p>
            <p className="mt-2 text-[13px]">
              Min. <strong className="font-mono tabular">{euro(s.min)}</strong>
            </p>
            {delta !== null && Math.abs(delta) >= 0.0005 && (
              <p className="mt-1 text-[12.5px] font-medium" style={{ color: delta < 0 ? "var(--good)" : "var(--bad)" }}>
                {cents(delta)} vs {referenceLabel ?? "moyenne nationale"}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Tableau des stations : tous les carburants en colonnes, le moins cher de chaque colonne mis en avant.
 * Rendu côté serveur (contenu crawlable).
 */
export function StationTable({
  stations,
  now,
  sortFuel = "gazole",
  mapHref,
}: {
  stations: Station[];
  now: number;
  sortFuel?: FuelId;
  mapHref: (s: Station) => string;
}) {
  const fuels = FUELS.filter((f) => stations.some((s) => usablePrice(s, f.id, now)));
  const min = Object.fromEntries(
    fuels.map((f) => [f.id, Math.min(...stations.map((s) => usablePrice(s, f.id, now)?.value ?? Infinity))]),
  ) as Record<FuelId, number>;
  const sorted = [...stations].sort(
    (a, b) => (usablePrice(a, sortFuel, now)?.value ?? Infinity) - (usablePrice(b, sortFuel, now)?.value ?? Infinity),
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-[14px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] uppercase tracking-wider text-muted">
            <th scope="col" className="px-4 py-3 font-semibold">
              Station
            </th>
            {fuels.map((f) => (
              <th key={f.id} scope="col" className="px-3 py-3 text-right font-semibold">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((s) => {
            const t = stationTitle(s);
            const latest = Object.values(s.prices).reduce<string | null>(
              (acc, p) => (p && (!acc || p.updatedAt > acc) ? p.updatedAt : acc),
              null,
            );
            return (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <Link href={mapHref(s)} className="flex items-center gap-3 hover:underline">
                    <BrandMark brand={s.brand} size={32} />
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {t.title}
                        {t.name && <span className="font-normal text-muted"> · {t.name}</span>}
                      </span>
                      <span className="block text-[12.5px] text-muted">
                        {s.address}
                        {latest && <> · maj {formatDateTime(latest)}</>}
                      </span>
                    </span>
                  </Link>
                </td>
                {fuels.map((f) => {
                  const p = usablePrice(s, f.id, now);
                  const best = p && p.value === min[f.id];
                  return (
                    <td key={f.id} className="px-3 py-3 text-right font-mono tabular">
                      {p ? (
                        <span className={best ? "rounded-md bg-accent px-1.5 py-0.5 font-semibold text-accent-ink" : ""}>
                          {p.value.toFixed(3).replace(".", ",")}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Liste de liens vers des zones (villes, régions) avec leur prix moyen de gazole. */
export function AreaLinks({ items }: { items: { href: string; name: string; hint?: string; price?: number }[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 transition hover:border-ink/40"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{i.name}</span>
              {i.hint && <span className="block text-[12px] text-muted">{i.hint}</span>}
            </span>
            {i.price !== undefined && <span className="shrink-0 font-mono text-[13px] tabular text-ink-2">{euro(i.price)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

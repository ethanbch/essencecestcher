import { brandInfo } from "@/lib/brands";

/** Logo de l'enseigne, ou pastille à ses couleurs, ou pictogramme pompe pour les indépendants. */
export function BrandMark({ brand, size = 36 }: { brand?: string | null; size?: number }) {
  const info = brandInfo(brand);
  const radius = Math.round(size * 0.28);
  const box = { width: size, height: size, borderRadius: radius };

  if (info?.logo) {
    return (
      <span className="grid shrink-0 place-items-center overflow-hidden border border-line bg-white" style={box} title={info.label}>
        {/* eslint-disable-next-line @next/next/no-img-element -- petites icônes statiques */}
        <img src={info.logo} alt={info.label} width={size - 10} height={size - 10} className="object-contain" loading="lazy" />
      </span>
    );
  }
  if (info && !info.independent) {
    return (
      <span
        className="grid shrink-0 place-items-center font-display font-extrabold tracking-tight text-white"
        style={{ ...box, background: info.color, fontSize: size * 0.36 }}
        title={info.label}
        aria-hidden
      >
        {info.initials}
      </span>
    );
  }
  return (
    <span className="grid shrink-0 place-items-center bg-paper text-muted" style={box} title={info?.label ?? "Enseigne inconnue"} aria-hidden>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10" />
        <path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3" />
      </svg>
    </span>
  );
}

/** Titre d'une station : l'enseigne, puis le nom s'il apporte une information. */
export function stationTitle(s: { brand?: string; name?: string; address: string }) {
  const info = brandInfo(s.brand);
  const title = info && !info.independent ? info.label : s.name || s.address || "Station";
  const norm = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  // Le nom est souvent une redite de l'enseigne (« INTERMARCHE », « STATION U »).
  const name = s.name && info && !info.independent && !norm(s.name).includes(norm(info.label).slice(0, 5)) ? s.name : null;
  return { title, name: title === s.name ? null : name };
}

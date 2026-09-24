/**
 * Référentiel des enseignes. `match` reconnaît le libellé publié sur prix-carburants.gouv.fr
 * (« TotalEnergies Access », « Intermarché Contact »…) ; `logo` pointe vers /public/brands
 * (téléchargé par `npm run logos`), sinon une pastille aux couleurs de l'enseigne est affichée.
 */
export type Brand = {
  key: string;
  label: string;
  match: RegExp;
  color: string;
  /** Domaine utilisé pour récupérer l'icône officielle. */
  domain?: string;
};

export const BRANDS: Brand[] = [
  { key: "totalenergies", label: "TotalEnergies", match: /total/i, color: "#e4032e", domain: "totalenergies.fr" },
  { key: "elf", label: "Elf", match: /\belf\b/i, color: "#1b3f8f", domain: "elf.com" },
  { key: "leclerc", label: "E.Leclerc", match: /leclerc/i, color: "#0066b3", domain: "e.leclerc" },
  { key: "intermarche", label: "Intermarché", match: /intermarch/i, color: "#e2001a" },
  { key: "systemeu", label: "Système U", match: /syst[eè]me\s*u|\b(super|hyper)\s*u\b|\bu\s*express\b/i, color: "#005ca9", domain: "magasins-u.com" },
  { key: "carrefour", label: "Carrefour", match: /carrefour/i, color: "#004e9e", domain: "carrefour.fr" },
  { key: "auchan", label: "Auchan", match: /auchan/i, color: "#e2001a", domain: "auchan.fr" },
  { key: "esso", label: "Esso", match: /esso/i, color: "#0b3b8c", domain: "esso.com" },
  { key: "bp", label: "BP", match: /\bbp\b/i, color: "#009b3a", domain: "bp.com" },
  { key: "shell", label: "Shell", match: /shell/i, color: "#f2b705", domain: "shell.fr" },
  { key: "avia", label: "Avia", match: /\bavia\b/i, color: "#e30613", domain: "avia-france.fr" },
  { key: "dyneff", label: "Dyneff", match: /dyneff/i, color: "#e30613", domain: "dyneff.fr" },
  { key: "netto", label: "Netto", match: /netto/i, color: "#e30613", domain: "netto.fr" },
  { key: "casino", label: "Casino", match: /casino|g[ée]ant/i, color: "#1b5e20", domain: "groupe-casino.fr" },
  { key: "eni", label: "Eni", match: /\beni\b|agip/i, color: "#f6c500", domain: "eni.com" },
  { key: "cora", label: "Cora", match: /\bcora\b/i, color: "#d6001c" },
  { key: "vito", label: "Vito", match: /\bvito\b/i, color: "#0a7a3d" },
  { key: "gulf", label: "Gulf", match: /\bgulf\b/i, color: "#f47b20" },
  { key: "match", label: "Match", match: /\bmatch\b/i, color: "#e30613" },
  { key: "elan", label: "Elan", match: /\belan\b/i, color: "#e4032e" },
  { key: "spar", label: "Spar", match: /\bspar\b/i, color: "#00843d" },
];

/** Marques pour lesquelles un logo a été téléchargé dans /public/brands. */
export const BRANDS_WITH_LOGO = new Set(BRANDS.filter((b) => b.domain).map((b) => b.key));

const INDEPENDENT = /ind[ée]pendant|sans enseigne/i;

export type BrandInfo = {
  /** Clé du référentiel, ou null pour une enseigne inconnue / indépendante. */
  key: string | null;
  label: string;
  color: string;
  logo: string | null;
  initials: string;
  independent: boolean;
};

export function brandInfo(raw: string | undefined | null): BrandInfo | null {
  if (!raw) return null;
  const known = BRANDS.find((b) => b.match.test(raw));
  if (known) {
    return {
      key: known.key,
      // On garde la déclinaison exacte (« Carrefour Market ») plutôt que la famille, sauf si elle est en capitales.
      label: raw === raw.toUpperCase() ? known.label : raw,
      color: known.color,
      logo: BRANDS_WITH_LOGO.has(known.key) ? `/brands/${known.key}.png` : null,
      initials: initialsOf(known.label),
      independent: false,
    };
  }
  const independent = INDEPENDENT.test(raw);
  return {
    key: null,
    label: independent ? "Station indépendante" : raw,
    color: "#3a3e45",
    logo: null,
    initials: independent ? "" : initialsOf(raw),
    independent,
  };
}

function initialsOf(s: string) {
  const words = s.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

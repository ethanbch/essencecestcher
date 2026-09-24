/** Informations publiques du site (mentions légales, SEO). Surchargeables par variables d'environnement. */

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE = {
  name: "essence, c'est cher",
  title: "Essence c'est cher — le plein au meilleur prix près de chez vous",
  description:
    "Trouvez la station-service la moins chère autour de chez vous ou sur votre trajet. Prix officiels des carburants publiés par l'État, mis à jour chaque matin.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000"),
  repo: "https://github.com/ethanbch/essencecestcher",
  /**
   * Éditeur. Site édité à titre non professionnel : la LCEN (art. 6, III-2) permet de ne publier
   * que les coordonnées de l'hébergeur. Renseigner NEXT_PUBLIC_EDITOR_NAME pour afficher un nom.
   */
  editorName: process.env.NEXT_PUBLIC_EDITOR_NAME || null,
  /** Contact public ; à défaut, le suivi des tickets du dépôt GitHub. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    website: "https://vercel.com",
  },
  lastLegalUpdate: "2026-09-24",
} as const;

export const contactHref = SITE.contactEmail ? `mailto:${SITE.contactEmail}` : `${SITE.repo}/issues`;
export const contactLabel = SITE.contactEmail ?? "github.com/ethanbch/essencecestcher/issues";

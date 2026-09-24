/** Découpage administratif : régions et départements (métropole + outre-mer). */

export type Region = { slug: string; name: string; departments: string[]; /** « en Bretagne », « dans le Grand Est » */ inName: string };

export const REGIONS: Region[] = [
  { slug: "auvergne-rhone-alpes", name: "Auvergne-Rhône-Alpes", inName: "en Auvergne-Rhône-Alpes", departments: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"] },
  { slug: "bourgogne-franche-comte", name: "Bourgogne-Franche-Comté", inName: "en Bourgogne-Franche-Comté", departments: ["21", "25", "39", "58", "70", "71", "89", "90"] },
  { slug: "bretagne", name: "Bretagne", inName: "en Bretagne", departments: ["22", "29", "35", "56"] },
  { slug: "centre-val-de-loire", name: "Centre-Val de Loire", inName: "en Centre-Val de Loire", departments: ["18", "28", "36", "37", "41", "45"] },
  { slug: "corse", name: "Corse", inName: "en Corse", departments: ["2A", "2B"] },
  { slug: "grand-est", name: "Grand Est", inName: "dans le Grand Est", departments: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"] },
  { slug: "hauts-de-france", name: "Hauts-de-France", inName: "dans les Hauts-de-France", departments: ["02", "59", "60", "62", "80"] },
  { slug: "ile-de-france", name: "Île-de-France", inName: "en Île-de-France", departments: ["75", "77", "78", "91", "92", "93", "94", "95"] },
  { slug: "normandie", name: "Normandie", inName: "en Normandie", departments: ["14", "27", "50", "61", "76"] },
  { slug: "nouvelle-aquitaine", name: "Nouvelle-Aquitaine", inName: "en Nouvelle-Aquitaine", departments: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"] },
  { slug: "occitanie", name: "Occitanie", inName: "en Occitanie", departments: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"] },
  { slug: "pays-de-la-loire", name: "Pays de la Loire", inName: "dans les Pays de la Loire", departments: ["44", "49", "53", "72", "85"] },
  { slug: "provence-alpes-cote-d-azur", name: "Provence-Alpes-Côte d'Azur", inName: "en Provence-Alpes-Côte d'Azur", departments: ["04", "05", "06", "13", "83", "84"] },
  { slug: "guadeloupe", name: "Guadeloupe", inName: "en Guadeloupe", departments: ["971"] },
  { slug: "martinique", name: "Martinique", inName: "en Martinique", departments: ["972"] },
  { slug: "guyane", name: "Guyane", inName: "en Guyane", departments: ["973"] },
  { slug: "la-reunion", name: "La Réunion", inName: "à La Réunion", departments: ["974"] },
  { slug: "mayotte", name: "Mayotte", inName: "à Mayotte", departments: ["976"] },
];

export const DEPARTMENT_NAMES: Record<string, string> = {
  "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes",
  "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube",
  "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal",
  "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud",
  "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne",
  "25": "Doubs", "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère",
  "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde", "34": "Hérault",
  "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura",
  "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique",
  "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire",
  "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle",
  "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord",
  "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques",
  "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône",
  "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie",
  "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres",
  "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse",
  "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne",
  "90": "Territoire de Belfort", "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis",
  "94": "Val-de-Marne", "95": "Val-d'Oise", "971": "Guadeloupe", "972": "Martinique", "973": "Guyane",
  "974": "La Réunion", "976": "Mayotte",
};

const REGION_BY_DEPARTMENT = new Map(REGIONS.flatMap((r) => r.departments.map((d) => [d, r] as const)));

/** Département à partir du code postal (Corse : 200xx-201xx → 2A, 202xx-206xx → 2B). */
export function departmentOf(postcode: string): string | null {
  const cp = postcode.trim();
  if (!/^\d{5}$/.test(cp)) return null;
  if (cp.startsWith("97")) return cp.slice(0, 3);
  if (cp.startsWith("20")) return Number(cp) < 20200 ? "2A" : "2B";
  return cp.slice(0, 2);
}

export function regionOfDepartment(dept: string): Region | null {
  return REGION_BY_DEPARTMENT.get(dept) ?? null;
}

export function regionBySlug(slug: string): Region | null {
  return REGIONS.find((r) => r.slug === slug) ?? null;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Nom de commune nettoyé : sans arrondissement (« Lyon 7 », « Marseille 11e Arrondissement »),
 * sans Cedex ni code postal entre parenthèses.
 */
export function cleanCityName(raw: string): string {
  return raw
    .replace(/\(.*?\)/g, " ")
    .replace(/\bcedex\b.*$/i, " ")
    .replace(/\s+\d{1,2}\s*(e|er|eme|ème)?(\s+arrondissement)?\s*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

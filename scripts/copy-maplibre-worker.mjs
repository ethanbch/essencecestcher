// Copie le web worker de MapLibre (et son module partagé) dans /public :
// MapLibre v6 le cherche à côté de son propre fichier, introuvable une fois bundlé par Next.
import { copyFileSync, mkdirSync } from "node:fs";

const out = "public/maplibre";
mkdirSync(out, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(`node_modules/maplibre-gl/dist/${f}`, `${out}/${f}`);
}

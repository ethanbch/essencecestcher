/**
 * Télécharge une fois pour toutes l'icône officielle de chaque enseigne dans public/brands/.
 * `npm run logos` — à relancer seulement si le référentiel (src/lib/brands.ts) change.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { BRANDS } from "../src/lib/brands";

const OUT = "public/brands";

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const b of BRANDS) {
    if (!b.domain) continue;
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${b.domain}&sz=128`);
    if (!res.ok) {
      console.warn(`✗ ${b.key} (${res.status})`);
      continue;
    }
    writeFileSync(`${OUT}/${b.key}.png`, Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${b.key}`);
  }
}

main();

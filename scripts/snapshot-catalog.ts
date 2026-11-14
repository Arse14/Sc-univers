/**
 * Fabrique la copie embarquée du catalogue des vaisseaux
 * (src/modules/hangar/snapshot.json) à partir des mêmes sources et du même
 * code que l'application. Lancé par la compilation de version ; en cas
 * d'échec la copie existante est conservée et la compilation continue.
 *
 *   node scripts/snapshot-catalog.ts
 */
import { writeFileSync } from "node:fs";
import { fetchCatalog } from "../src/modules/hangar/catalog-core.ts";

const OUT = new URL("../src/modules/hangar/snapshot.json", import.meta.url);

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "SC-Univers build (github.com/Arse14/Sc-univers)" }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

try {
  const r = await fetchCatalog(getJson);
  if (r.ships.length < 150) throw new Error(`seulement ${r.ships.length} fiches`);
  writeFileSync(OUT, JSON.stringify({ at: Date.now(), ships: r.ships }));
  console.log(`Copie embarquée : ${r.ships.length} vaisseaux (wiki ${r.wiki ? "ok" : "absent"}, FleetYards ${r.fy ? "ok" : "absent"})${r.errors.length ? " — " + r.errors.join(" · ") : ""}`);
} catch (e) {
  console.warn(`Copie embarquée non mise à jour : ${e instanceof Error ? e.message : e}`);
}

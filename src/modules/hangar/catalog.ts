/**
 * Catalogue des vaisseaux : API FleetYards (données publiques, images
 * officielles CIG hébergées par FleetYards), condensé et mis en cache 7 jours.
 */
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri, loadStore, saveStore } from "../../lib/tauri";

export interface Ship {
  id: string;
  sc: string | null;          // scIdentifier (orig_100i)
  name: string;               // 100i
  rsiName: string;            // nom RSI complet
  slug: string;
  mfr: string;                // Origin Jumpworks
  mfrCode: string;            // ORIG
  mfrLogo: string | null;
  cls: string;                // classification label (Multi, Combat…)
  foci: string[];
  size: string;               // small/medium/large/capital…
  sizeLabel: string;
  status: string;             // flight-ready / in-production / concept
  inGame: boolean;
  crewMin: number | null; crewMax: number | null;
  cargo: number | null;
  length: number | null; beam: number | null; height: number | null;
  mass: number | null;
  hull: number | null;
  scm: number | null; max: number | null;
  dps: number | null;         // burst DPS
  pledge: number | null;      // $
  priceAuec: number | null;
  soldAt: { name: string; where: string; price: number }[];
  rentAt: { name: string; where: string; price: number }[];
  onSale: boolean;
  img: string | null;         // storeImage medium
  imgLarge: string | null;
  angled: string | null;
  top: string | null;
  desc: string;
  storeUrl: string | null;
  loaners: string[];
}

const API = "https://api.fleetyards.net/v1";
const TTL = 7 * 24 * 3600 * 1000;

async function getJson<T>(url: string): Promise<T> {
  const f = isTauri ? tauriFetch : fetch;
  const res = await f(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function compact(m: Any): Ship {
  const met = m.metrics ?? {};
  const med = m.media ?? {};
  const av = m.availability ?? {};
  const loc = (x: Any) => [x?.shop?.station?.name ?? x?.station?.name ?? x?.shop?.name, x?.shop?.station?.celestialObject?.name ?? x?.celestialObject?.name].filter(Boolean).join(", ");
  return {
    id: m.id, sc: m.scIdentifier ?? null, name: m.name, rsiName: m.rsiName ?? m.name, slug: m.slug,
    mfr: m.manufacturer?.name ?? "", mfrCode: m.manufacturer?.code ?? "", mfrLogo: m.manufacturer?.logo?.url ?? null,
    cls: m.classificationLabel ?? m.classification ?? "", foci: m.fociLabels ?? [], size: m.size ?? "", sizeLabel: m.sizeLabel ?? m.size ?? "",
    status: m.productionStatus ?? "", inGame: !!m.inGame,
    crewMin: m.crew?.min ?? m.crew?.value ?? null, crewMax: m.crew?.max ?? m.crew?.value ?? null,
    cargo: met.cargo ?? null, length: met.length ?? null, beam: met.beam ?? null, height: met.height ?? null, mass: met.mass ?? null, hull: met.hullHealth ?? null,
    scm: met.speeds?.scmSpeed ?? null, max: met.speeds?.maxSpeed ?? null, dps: met.burstDps ?? null,
    pledge: m.pledgePrice ?? null, priceAuec: m.price ?? null,
    soldAt: (av.soldAt ?? []).map((x: Any) => ({ name: x.shop?.name ?? "?", where: loc(x), price: x.sellPrice ?? x.price ?? 0 })),
    rentAt: (av.rentalAt ?? []).map((x: Any) => ({ name: x.shop?.name ?? "?", where: loc(x), price: x.rentalPrice1Day ?? x.price ?? 0 })),
    onSale: !!m.onSale,
    img: med.storeImage?.mediumUrl ?? null, imgLarge: med.storeImage?.largeUrl ?? med.storeImage?.url ?? null,
    angled: med.angledView?.mediumUrl ?? null, top: med.topView?.mediumUrl ?? null,
    desc: m.description ?? "", storeUrl: m.links?.storeUrl ?? null,
    loaners: (m.loaners ?? []).map((l: Any) => l.name ?? l).filter(Boolean),
  };
}

interface Cache { at: number; ships: Ship[] }

export async function loadCatalog(force = false): Promise<{ ships: Ship[]; source: "api" | "cache" | "none" }> {
  const c = await loadStore<Cache>("hangar-catalog").catch(() => null);
  if (!force && c && Date.now() - c.at < TTL && c.ships.length > 50) return { ships: c.ships, source: "cache" };
  try {
    const ships: Ship[] = [];
    for (let page = 1; page <= 10; page++) {
      const data = await getJson<Any[]>(`${API}/models?perPage=240&page=${page}`);
      if (!Array.isArray(data) || data.length === 0) break;
      for (const m of data) ships.push(compact(m));
      if (data.length < 240) break;
    }
    if (ships.length < 50) throw new Error("catalogue incomplet");
    ships.sort((a, b) => a.mfr.localeCompare(b.mfr) || a.name.localeCompare(b.name));
    await saveStore<Cache>("hangar-catalog", { at: Date.now(), ships }).catch(() => undefined);
    return { ships, source: "api" };
  } catch {
    if (c) return { ships: c.ships, source: "cache" };
    return { ships: [], source: "none" };
  }
}

/** Description FR et statut depuis le wiki (à la demande, par vaisseau). */
export async function loadFrenchDescription(rsiName: string): Promise<string | null> {
  try {
    const res = await getJson<{ data: { description?: { fr_FR?: string }; game_description?: { fr_FR?: string } } }>(`https://api.star-citizen.wiki/api/v2/vehicles/${encodeURIComponent(rsiName)}`);
    return res.data.description?.fr_FR || res.data.game_description?.fr_FR || null;
  } catch { return null; }
}

/* ---------- correspondance HangarXPLOR → catalogue ---------- */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function matchShip(ships: Ship[], rec: { ship_code?: string; name?: string; ship_name?: string; manufacturer_code?: string }): Ship | null {
  const code = rec.ship_code?.toLowerCase();
  if (code) {
    const hit = ships.find((s) => s.sc === code);
    if (hit) return hit;
  }
  const names = [rec.name, rec.ship_name].filter(Boolean).map((n) => norm(n!));
  for (const n of names) {
    const exact = ships.find((s) => norm(s.rsiName) === n || norm(s.name) === n || norm(`${s.mfrCode} ${s.name}`) === n);
    if (exact) return exact;
  }
  for (const n of names) {
    const loose = ships.filter((s) => norm(s.rsiName).includes(n) || n.includes(norm(s.name)));
    if (loose.length === 1) return loose[0];
    if (loose.length > 1 && rec.manufacturer_code) { const m = loose.find((s) => s.mfrCode.toLowerCase() === rec.manufacturer_code!.toLowerCase()); if (m) return m; }
  }
  return null;
}

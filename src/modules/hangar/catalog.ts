/**
 * Catalogue des vaisseaux : API FleetYards (données publiques, images et
 * modèles 3D officiels CIG hébergés par FleetYards).
 *
 * Trois niveaux, pour ne garder en mémoire que le nécessaire :
 *  1. le catalogue condensé (≈ 300 modèles, quelques centaines d'octets
 *     chacun), mis en cache 7 jours ;
 *  2. la fiche technique complète d'un vaisseau, chargée à l'ouverture ;
 *  3. son armement et ses composants (réponse brute ≈ 700 Ko, condensée à
 *     quelques Ko), chargés à la demande.
 * Les réponses brutes ne sont jamais conservées.
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
  cls: string;                // classification (Multi, Combat…)
  foci: string[];
  size: string;               // small/medium/large/capital…
  sizeLabel: string;
  status: string;             // flight-ready / in-production / in-concept
  inGame: boolean;
  crewMin: number | null; crewMax: number | null;
  cargo: number | null;
  length: number | null; beam: number | null; height: number | null;
  mass: number | null;
  hull: number | null;
  scm: number | null; max: number | null;
  dps: number | null;         // DPS en rafale
  pledge: number | null;      // $
  priceAuec: number | null;
  soldAt: { name: string; where: string; price: number }[];
  rentAt: { name: string; where: string; price: number }[];
  onSale: boolean;
  img: string | null;         // image boutique, moyenne
  imgLarge: string | null;
  desc: string;
  storeUrl: string | null;
  loaners: string[];
  has3d: boolean;
}

const API = "https://api.fleetyards.net/v1";
const TTL = 7 * 24 * 3600 * 1000;
const CATALOG_KEY = "hangar-catalog-v3";
const PAGE = 40;

async function getJson<T>(url: string): Promise<T> {
  const f = isTauri ? tauriFetch : fetch;
  const res = await f(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** « Teasa Spaceport, Lorville » à partir de la boutique FleetYards. */
function place(x: Any): string {
  const loc = x?.shop?.location;
  const parts = [loc?.name, loc?.parentName].filter((v: unknown) => typeof v === "string" && v);
  if (parts.length) return parts.join(", ");
  return typeof x?.location === "string" ? x.location.replace(`${x?.shop?.name ?? ""} - `, "") : "";
}

/** Boutiques triées par prix ; pour la location on ne garde que le tarif à la journée. */
function shops(list: Any[], rental: boolean): { name: string; where: string; price: number }[] {
  const out: { name: string; where: string; price: number }[] = [];
  const seen = new Set<string>();
  for (const x of list ?? []) {
    if (rental && x?.timeRange && x.timeRange !== "1-day") continue;
    const price = typeof x?.price === "number" ? x.price : 0;
    const row = { name: x?.shop?.name ?? "?", where: place(x), price };
    const k = `${row.name}|${row.where}|${row.price}`;
    if (seen.has(k)) continue;
    seen.add(k); out.push(row);
  }
  out.sort((a, b) => a.price - b.price);
  return out.slice(0, 14);
}

function compact(m: Any): Ship {
  const met = m.metrics ?? {};
  const med = m.media ?? {};
  const av = m.availability ?? {};
  const sp = m.speeds ?? met.speeds ?? {};
  return {
    id: m.id, sc: m.scIdentifier ?? null, name: m.name, rsiName: m.rsiName ?? m.name, slug: m.slug,
    mfr: m.manufacturer?.name ?? "", mfrCode: m.manufacturer?.code ?? "",
    cls: m.classificationLabel ?? m.classification ?? "", foci: m.fociLabels ?? [], size: met.size ?? m.size ?? "", sizeLabel: met.sizeLabel ?? m.sizeLabel ?? "",
    status: m.productionStatus ?? "", inGame: !!m.inGame,
    crewMin: num(m.crew?.min) ?? num(m.crew?.value), crewMax: num(m.crew?.max) ?? num(m.crew?.value),
    cargo: num(met.cargo), length: num(met.length), beam: num(met.beam), height: num(met.height), mass: num(met.mass), hull: num(met.hullHealth),
    scm: num(sp.scmSpeed), max: num(sp.maxSpeed), dps: num(m.burstDps) ?? num(met.burstDps),
    pledge: num(m.pledgePrice), priceAuec: num(m.price),
    soldAt: shops(av.soldAt, false),
    rentAt: shops(av.rentalAt, true),
    onSale: !!m.onSale,
    img: med.storeImage?.mediumUrl ?? med.angledView?.mediumUrl ?? null,
    imgLarge: med.storeImage?.largeUrl ?? med.storeImage?.url ?? null,
    desc: typeof m.description === "string" ? m.description.slice(0, 900) : "", storeUrl: m.links?.storeUrl ?? null,
    loaners: (m.loaners ?? []).map((l: Any) => l?.name ?? l).filter((x: unknown) => typeof x === "string"),
    has3d: !!(m.holo || med.holo || med.holoLite || med.holoTextured || med.holoTexturedLite),
  };
}

interface Cache { at: number; ships: Ship[] }

/** Catalogue condensé. `onProgress` reçoit le nombre de modèles déjà reçus. */
export async function loadCatalog(force = false, onProgress?: (n: number) => void): Promise<{ ships: Ship[]; source: "api" | "cache" | "none"; at: number | null }> {
  const c = await loadStore<Cache>(CATALOG_KEY).catch(() => null);
  if (!force && c && Date.now() - c.at < TTL && c.ships.length > 50) return { ships: c.ships, source: "cache", at: c.at };
  try {
    const ships: Ship[] = [];
    // Petites pages : chaque modèle pèse ≈ 100 Ko en JSON brut, on ne veut pas 20 Mo en mémoire d'un coup.
    for (let page = 1; page <= 30; page++) {
      const data = await getJson<Any[]>(`${API}/models?perPage=${PAGE}&page=${page}`);
      if (!Array.isArray(data) || data.length === 0) break;
      for (const m of data) ships.push(compact(m));
      onProgress?.(ships.length);
      if (data.length < PAGE) break;
    }
    if (ships.length < 50) throw new Error("catalogue incomplet");
    ships.sort((a, b) => a.mfr.localeCompare(b.mfr) || a.name.localeCompare(b.name));
    const at = Date.now();
    await saveStore<Cache>(CATALOG_KEY, { at, ships }).catch(() => undefined);
    return { ships, source: "api", at };
  } catch {
    if (c) return { ships: c.ships, source: "cache", at: c.at };
    return { ships: [], source: "none", at: null };
  }
}

/* ---------- fiche technique complète ---------- */

export interface ModelFile { url: string; size: number | null }
export interface ShipDetail {
  slug: string;
  at: number;
  note: string | null;
  landed: { length: number | null; beam: number | null; height: number | null };
  maxCargo: number | null;
  personalInventory: number | null;
  beds: number | null;
  hydrogen: number | null;
  quantum: number | null;
  crossSection: { x: number; y: number; z: number } | null;
  dockSize: string | null;
  canLand: boolean | null;
  speeds: {
    scm: number | null; scmBoost: number | null; max: number | null;
    pitch: number | null; yaw: number | null; roll: number | null;
    pitchBoost: number | null; yawBoost: number | null; rollBoost: number | null;
    accelMain: number | null; accelRetro: number | null; toScm: number | null; toStop: number | null;
  };
  weapons: { maxSize: number | null; sizes: { size: number; count: number }[]; pool: number | null; alpha: number | null; burst: number | null; sustainMin: number | null; sustainMax: number | null };
  hullParts: { name: string; health: number }[];
  cargoHolds: { name: string; capacity: number; dims: string; maxBox: number | null }[];
  weaponRacks: { count: number; slots: number }[];
  docks: { size: string; count: number; type: string }[];
  views: { angled: string | null; front: string | null; side: string | null; top: string | null; rear: string | null; fleetchart: string | null };
  models: { textured: ModelFile | null; holo: ModelFile | null; landedTextured: ModelFile | null };
}

const file = (m: Any): ModelFile | null => (m && typeof m.url === "string" ? { url: m.url, size: num(m.size) } : null);
const view = (m: Any): string | null => m?.largeUrl ?? m?.mediumUrl ?? m?.url ?? null;
const dims = (d: Any) => (d ? `${d.x} × ${d.y} × ${d.z} m` : "");
const pretty = (s: string) => s.replace(/^hardpoint_/, "").replace(/_/g, " ");

function compactDetail(m: Any): ShipDetail {
  const met = m.metrics ?? {}; const med = m.media ?? {}; const sp = m.speeds ?? {};
  const parts = ((met.hullParts ?? []) as Any[]).filter((p) => p?.health > 0).map((p) => ({ name: pretty(String(p.name)), health: p.health as number }));
  parts.sort((a, b) => b.health - a.health);
  return {
    slug: m.slug, at: Date.now(), note: m.productionNote || null,
    landed: { length: num(met.landedLength), beam: num(met.landedBeam), height: num(met.landedHeight) },
    maxCargo: num(met.maxCargo), personalInventory: num(met.personalInventory), beds: num(met.beds),
    hydrogen: num(met.hydrogenFuelTankSize), quantum: num(met.quantumFuelTankSize),
    crossSection: met.signatureCrossSection && typeof met.signatureCrossSection.x === "number" ? { x: met.signatureCrossSection.x, y: met.signatureCrossSection.y, z: met.signatureCrossSection.z } : null,
    dockSize: met.dockSize ?? null, canLand: typeof m.canLandOnPlanets === "boolean" ? m.canLandOnPlanets : null,
    speeds: {
      scm: num(sp.scmSpeed), scmBoost: num(sp.scmSpeedBoosted), max: num(sp.maxSpeed),
      pitch: num(sp.pitch), yaw: num(sp.yaw), roll: num(sp.roll), pitchBoost: num(sp.pitchBoosted), yawBoost: num(sp.yawBoosted), rollBoost: num(sp.rollBoosted),
      accelMain: num(sp.mainAcceleration), accelRetro: num(sp.retroAcceleration), toScm: num(sp.secondsToScmSpeed), toStop: num(sp.secondsToStopFromScmSpeed),
    },
    weapons: {
      maxSize: num(m.maxWeaponSize), sizes: ((m.weaponSizes ?? []) as Any[]).filter((w) => typeof w?.size === "number").map((w) => ({ size: w.size, count: w.count ?? 1 })),
      pool: num(met.weaponPoolSize), alpha: num(m.alpha), burst: num(m.burstDps), sustainMin: num(m.sustainedDpsMin), sustainMax: num(m.sustainedDpsMax),
    },
    hullParts: parts.slice(0, 10),
    cargoHolds: ((m.cargoHolds ?? []) as Any[]).map((h) => ({ name: pretty(String(h.name ?? "soute")).replace(/^cargogrid /, ""), capacity: h.capacity ?? 0, dims: dims(h.dimensions), maxBox: num(h.maxContainerSize?.size) })),
    weaponRacks: ((m.weaponRacks ?? []) as Any[]).map((r) => ({ count: r.count ?? 1, slots: Array.isArray(r.slots) ? r.slots.length : 0 })),
    docks: ((m.dockCounts ?? []) as Any[]).map((d) => ({ size: d.size ?? "", count: d.count ?? 1, type: d.typeLabel ?? d.type ?? "" })),
    views: { angled: view(med.angledView), front: view(med.frontView), side: view(med.starboardView ?? med.portView), top: view(med.topView), rear: view(med.rearView), fleetchart: typeof med.fleetchartImage === "string" ? med.fleetchartImage : null },
    models: {
      textured: file(med.holoTexturedLite) ?? file(med.holoTextured),
      holo: file(med.holoLite) ?? file(med.holo) ?? (typeof m.holo === "string" ? { url: m.holo, size: null } : null),
      landedTextured: file(med.landedHoloTexturedLite) ?? file(med.landedHoloTextured),
    },
  };
}

/** Petit cache mémoire (5 fiches) + cache disque 7 jours par vaisseau. */
const detailMem = new Map<string, ShipDetail>();
function remember<T>(map: Map<string, T>, key: string, value: T, max = 5) {
  map.delete(key); map.set(key, value);
  while (map.size > max) map.delete(map.keys().next().value as string);
}

export async function loadShipDetail(slug: string): Promise<ShipDetail | null> {
  const hit = detailMem.get(slug);
  if (hit) return hit;
  const key = `hangar-ship-${slug}`;
  const c = await loadStore<ShipDetail>(key).catch(() => null);
  if (c && Date.now() - c.at < TTL) { remember(detailMem, slug, c); return c; }
  try {
    const d = compactDetail(await getJson<Any>(`${API}/models/${encodeURIComponent(slug)}`));
    await saveStore(key, d).catch(() => undefined);
    remember(detailMem, slug, d);
    return d;
  } catch {
    if (c) { remember(detailMem, slug, c); return c; }
    return null;
  }
}

/* ---------- armement et composants ---------- */

export interface Fitting {
  group: string;       // weapon, system, propulsion, thruster, avionic, auxiliary…
  slot: string;        // catégorie de l'emplacement (lisible)
  size: number | null;
  item: string | null; // composant monté
  mfr: string | null;
  grade: string | null;
  cls: string | null;  // Civilian, Military…
  count: number;
  children: Fitting[]; // ex. arme montée sur un support
}
export interface ShipFittings { slug: string; at: number; items: Fitting[] }

const SLOT_FR: Record<string, string> = {
  weapons: "Arme", weapon_mounts: "Support d'arme", turrets: "Tourelle", missile_racks: "Râtelier de missiles", missiles: "Missile", bomb_racks: "Soute à bombes", bombs: "Bombe",
  mining_lasers: "Tête de minage", mining_modules: "Module de minage", salvage_heads: "Tête de recyclage", salvage_modules: "Module de recyclage", tractor_beams: "Rayon tracteur", utility: "Utilitaire", utility_items: "Utilitaire",
  power_plants: "Générateur", coolers: "Refroidisseur", shield_generators: "Bouclier", lifesupport: "Support de vie", life_support: "Support de vie",
  quantum_drives: "Moteur quantique", jump_modules: "Module de saut", fuel_intakes: "Prise de carburant", fuel_tanks: "Réservoir d'hydrogène", quantum_fuel_tanks: "Réservoir quantique",
  main_thrusters: "Propulseur principal", maneuvering_thrusters: "Propulseur de manœuvre", retro_thrusters: "Rétropropulseur", vtol_thrusters: "Propulseur VTOL",
  radar: "Radar", computers: "Ordinateur", scanners: "Scanner", ping: "Ping", emp: "IEM", qed: "Brouilleur quantique", qig: "Brouilleur quantique", countermeasures: "Contre-mesures", flight_controllers: "Contrôleur de vol", self_destruct: "Autodestruction", armor: "Blindage",
};
export const GROUP_FR: Record<string, string> = { weapon: "Armement", system: "Systèmes", propulsion: "Propulsion", thruster: "Propulseurs", avionic: "Avionique", auxiliary: "Auxiliaires" };
const GROUP_ORDER = ["weapon", "system", "propulsion", "avionic", "auxiliary", "thruster"];

function fitting(h: Any): Fitting {
  const c = h.component ?? null;
  const kids = [...((h.hardpoints ?? []) as Any[]), ...((c?.hardpoints ?? []) as Any[])].filter((k) => k && (k.component || (k.hardpoints ?? []).length));
  const cat = String(h.category ?? c?.category ?? "");
  return {
    group: String(h.group ?? "unknown"), slot: SLOT_FR[cat] ?? (cat ? pretty(cat) : pretty(String(h.name ?? ""))),
    size: num(c?.size) ?? num(h.maxSize) ?? num(h.minSize),
    item: c?.name ?? null, mfr: c?.manufacturer?.name ?? null, grade: c?.gradeLabel ?? (c?.grade != null ? String(c.grade) : null), cls: c?.itemClassLabel ?? null,
    count: 1, children: merge(kids.map(fitting)),
  };
}
const sig = (f: Fitting): string => `${f.group}|${f.slot}|${f.size}|${f.item}|${f.children.map(sig).join(",")}`;
/** Fusionne les lignes identiques (12 propulseurs de manœuvre → une ligne ×12). */
function merge(list: Fitting[]): Fitting[] {
  const by = new Map<string, Fitting>();
  for (const f of list) { const k = sig(f); const e = by.get(k); if (e) e.count += f.count; else by.set(k, f); }
  return [...by.values()];
}

const fitMem = new Map<string, ShipFittings>();

export async function loadShipFittings(slug: string): Promise<ShipFittings | null> {
  const hit = fitMem.get(slug);
  if (hit) return hit;
  const key = `hangar-fit-${slug}`;
  const c = await loadStore<ShipFittings>(key).catch(() => null);
  if (c && Date.now() - c.at < TTL) { remember(fitMem, slug, c, 3); return c; }
  try {
    const raw = await getJson<Any[]>(`${API}/models/${encodeURIComponent(slug)}/hardpoints`);
    const items = merge((Array.isArray(raw) ? raw : []).filter((h) => GROUP_ORDER.includes(String(h?.group))).map(fitting))
      .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || (b.size ?? 0) - (a.size ?? 0) || a.slot.localeCompare(b.slot));
    const f: ShipFittings = { slug, at: Date.now(), items };
    await saveStore(key, f).catch(() => undefined);
    remember(fitMem, slug, f, 3);
    return f;
  } catch {
    if (c) { remember(fitMem, slug, c, 3); return c; }
    return null;
  }
}

/* ---------- données du jeu (wiki Star Citizen) : équipage, boucliers, quantique, assurance… ---------- */

export interface GameSheet {
  slug: string;
  at: number;
  version: string | null;        // version du jeu dont viennent les chiffres
  descFr: string | null;
  career: string | null; role: string | null;
  crew: { min: number | null; max: number | null; weapon: number | null; operation: number | null };
  seating: { stations: number | null; ejection: number | null; pods: number | null; jump: number | null; beds: number | null; medBeds: number | null };
  shield: { hp: number | null; regen: number | null; regenTime: number | null; type: string | null };
  armor: { health: number | null; deflectPhysical: number | null; deflectEnergy: number | null };
  quantum: { speed: number | null; spool: number | null; fuel: number | null; range: number | null };
  emission: { ir: number | null; emIdle: number | null; emMax: number | null };
  insurance: { claim: number | null; expedite: number | null; cost: number | null };
  weaponry: { pilotDps: number | null; pilotAlpha: number | null; pilotSustained: number | null; turretDps: number | null; missiles: number | null; missileDamage: number | null; pilotGuns: number | null; mannedTurrets: number | null; remoteTurrets: number | null; countermeasures: number | null };
  fuelIntake: number | null;
  msrp: number | null;
}

function compactSheet(slug: string, d: Any): GameSheet {
  const snap = d.weapon_snapshot ?? d.shield?.weapon_snapshot ?? {};
  const w = d.weaponry ?? {};
  return {
    slug, at: Date.now(), version: typeof d.version === "string" ? d.version.split("-")[0] : null,
    descFr: d.description?.fr_FR || d.game_description?.fr_FR || null,
    career: d.career ?? null, role: d.role ?? null,
    crew: { min: num(d.crew?.min), max: num(d.crew?.max), weapon: num(d.crew?.weapon), operation: num(d.crew?.operation) },
    seating: { stations: num(d.seating?.crew_stations), ejection: num(d.seating?.ejection_seats), pods: num(d.seating?.escape_pods), jump: num(d.seating?.jump_seats), beds: num(d.seating?.beds), medBeds: num(d.seating?.medical_beds) },
    shield: { hp: num(d.shield?.hp) ?? num(d.shield_hp), regen: num(d.shield?.regeneration), regenTime: num(d.shield?.regeneration_time), type: d.shield?.face_type ?? d.shield_face_type ?? null },
    armor: { health: num(d.armor?.health), deflectPhysical: num(d.armor?.deflection?.physical), deflectEnergy: num(d.armor?.deflection?.energy) },
    quantum: { speed: num(d.quantum?.quantum_speed), spool: num(d.quantum?.quantum_spool_time), fuel: num(d.quantum?.quantum_fuel_capacity), range: num(d.quantum?.quantum_range) },
    emission: { ir: num(d.emission?.ir), emIdle: num(d.emission?.em_idle), emMax: num(d.emission?.em_max) },
    insurance: { claim: num(d.insurance?.claim_time), expedite: num(d.insurance?.expedite_time), cost: num(d.insurance?.expedite_cost) },
    weaponry: {
      pilotDps: num(w.pilot_dps), pilotAlpha: num(w.pilot_alpha), pilotSustained: num(w.pilot_sustained_dps), turretDps: num(w.turret_dps),
      missiles: num(w.missiles?.count) ?? num(snap.missile_count), missileDamage: num(w.total_missile_damage),
      pilotGuns: num(snap.pilot_guns_count), mannedTurrets: num(snap.turrets_manned_count), remoteTurrets: num(snap.turrets_remote_count), countermeasures: num(snap.countermeasures_count),
    },
    fuelIntake: num(d.fuel?.intake_rate), msrp: num(d.msrp),
  };
}

const sheetMem = new Map<string, GameSheet>();

/**
 * Fiche « données du jeu » : équipage mini / maxi, sièges, boucliers, blindage,
 * saut quantique, signatures, assurance. La réponse brute pèse ≈ 400 Ko, on
 * n'en garde que ces champs. Recherche par identifiant puis par nom.
 */
export async function loadGameSheet(slug: string, rsiName: string): Promise<GameSheet | null> {
  const hit = sheetMem.get(slug);
  if (hit) return hit;
  const key = `hangar-game-${slug}`;
  const c = await loadStore<GameSheet>(key).catch(() => null);
  if (c && Date.now() - c.at < TTL) { remember(sheetMem, slug, c); return c; }
  for (const id of [slug, rsiName]) {
    try {
      const res = await getJson<{ data: Any }>(`https://api.star-citizen.wiki/api/v2/vehicles/${encodeURIComponent(id)}`);
      if (!res?.data?.name) continue;
      const g = compactSheet(slug, res.data);
      await saveStore(key, g).catch(() => undefined);
      remember(sheetMem, slug, g);
      return g;
    } catch { /* essai suivant */ }
  }
  if (c) { remember(sheetMem, slug, c); return c; }
  return null;
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

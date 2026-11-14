/**
 * Cœur du catalogue des vaisseaux, sans dépendance à l'application : il sert
 * à la fois dans l'app et dans le script qui fabrique la copie embarquée
 * (scripts/snapshot-catalog.ts, lancé à chaque compilation de version).
 *
 * Deux sources fusionnées pour ne dépendre d'aucune :
 *  - le wiki Star Citizen (api.star-citizen.wiki) : liste et fiche technique
 *    tirées des fichiers du jeu, prix UEX inclus — source principale ;
 *  - FleetYards : images boutique et modèles 3D, vaisseaux encore en concept.
 * La correspondance se fait par l'identifiant du jeu (ORIG_100i ↔ orig_100i),
 * à défaut par le nom.
 */
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
  /** Autres identifiants connus (ancien id FleetYards) : les flottes enregistrées avant la fusion des sources les utilisent. */
  alt?: string[];
  /** Identifiant du wiki pour la fiche de jeu. */
  wikiSlug?: string;
  /** D'où vient la fiche : wiki, FleetYards, ou les deux fusionnés. */
  src?: "wiki" | "fy" | "both";
}


export const FY_API = "https://api.fleetyards.net/v1";
export const WIKI_API = "https://api.star-citizen.wiki/api/v2";
const FY_PAGE = 40;
const WIKI_PAGE = 50;
export type GetJson = (url: string) => Promise<unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
/**
 * FleetYards a changé l'enveloppe de ses listes : autrefois un tableau nu,
 * désormais { items: [...], meta: { pagination } }. On accepte les deux.
 */
export function listOf(data: Any): { items: Any[]; pages: number | null } {
  if (Array.isArray(data)) return { items: data, pages: null };
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
  const pages = typeof data?.meta?.pagination?.totalPages === "number" ? data.meta.pagination.totalPages : null;
  return { items, pages };
}
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

/** Fiche condensée depuis un modèle FleetYards. */
export function compactFy(m: Any): Ship {
  const met = m.metrics ?? {};
  const med = m.media ?? {};
  const av = m.availability ?? {};
  const sp = m.speeds ?? met.speeds ?? {};
  return {
    id: typeof m.scIdentifier === "string" && m.scIdentifier ? m.scIdentifier.toLowerCase() : m.id, sc: typeof m.scIdentifier === "string" ? m.scIdentifier.toLowerCase() : null, name: m.name, rsiName: m.rsiName ?? m.name, slug: m.slug,
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
    alt: [m.id], src: "fy",
  };
}


const str = (v: unknown): string => (typeof v === "string" ? v : "");
const SIZE_KEY: Record<string, string> = { vehicle: "vehicle", snub: "snub", small: "small", medium: "medium", large: "large", capital: "capital", "extra large": "extra_large" };

/** Boutiques depuis les prix UEX joints par le wiki. */
function wikiShops(list: Any[], field: "price_buy" | "price_rent"): { name: string; where: string; price: number }[] {
  const out: { name: string; where: string; price: number }[] = [];
  const seen = new Set<string>();
  for (const x of Array.isArray(list) ? list : []) {
    const price = num(x?.[field]); if (!price) continue;
    const full = str(x?.terminal_name);
    const loc = x?.starmap_location;
    const where = [str(loc?.name), str(loc?.parent_name)].filter(Boolean).join(", ") || full.split(" - ").slice(1).join(" - ");
    const row = { name: full.split(" - ")[0] || "?", where, price };
    const k = `${row.name}|${row.where}|${row.price}`;
    if (seen.has(k)) continue;
    seen.add(k); out.push(row);
  }
  out.sort((a, b) => a.price - b.price);
  return out.slice(0, 14);
}

/** Fiche condensée depuis un véhicule du wiki. Renvoie null si l'entrée n'a pas de nom. */
export function compactWiki(w: Any): Ship | null {
  const name = str(w?.shipmatrix_name) || str(w?.name);
  if (!name) return null;
  const cls = str(w?.class_name).toLowerCase();
  const sold = wikiShops(w?.uex_prices?.purchase, "price_buy");
  const sizeRaw = str(w?.size).toLowerCase();
  const img = Array.isArray(w?.images) ? w.images.find((i: Any) => str(i?.thumbnail_url) || str(i?.original_url)) : null;
  const foci = Array.isArray(w?.foci) ? w.foci.filter((f: unknown) => typeof f === "string") : [];
  return {
    id: cls || `w:${str(w?.slug) || name.toLowerCase()}`, sc: cls || null, name, rsiName: name,
    slug: cls ? cls.replace(/_/g, "-") : str(w?.slug),
    mfr: str(w?.manufacturer?.name), mfrCode: str(w?.manufacturer?.code),
    cls: str(w?.type) || str(w?.career), foci: foci.length ? foci : [str(w?.role)].filter(Boolean),
    size: w?.is_vehicle || w?.is_gravlev ? "vehicle" : SIZE_KEY[sizeRaw] ?? sizeRaw, sizeLabel: str(w?.size),
    status: str(w?.production_status) || (cls ? "flight-ready" : ""), inGame: !!cls && (num(w?.health) ?? 0) > 0,
    crewMin: num(w?.crew?.min), crewMax: num(w?.crew?.max) ?? num(w?.crew?.min),
    cargo: num(w?.cargo_capacity), length: num(w?.sizes?.length), beam: num(w?.sizes?.beam), height: num(w?.sizes?.height),
    mass: num(w?.mass_total) ?? num(w?.mass), hull: num(w?.health),
    scm: num(w?.speed?.scm), max: num(w?.speed?.max), dps: num(w?.weaponry?.pilot_dps),
    pledge: num(w?.msrp), priceAuec: sold[0]?.price ?? null,
    soldAt: sold, rentAt: wikiShops(w?.uex_prices?.rental, "price_rent"),
    onSale: Array.isArray(w?.skus) && w.skus.some((k: Any) => k?.available && !k?.is_package),
    img: str(img?.thumbnail_url) || str(img?.original_url) || null, imgLarge: str(img?.original_url) || null,
    desc: (str(w?.description) || str(w?.game_description)).slice(0, 900), storeUrl: str(w?.pledge_url) || null,
    loaners: (Array.isArray(w?.loaner) ? w.loaner : []).map((l: Any) => (typeof l === "string" ? l : str(l?.name))).filter(Boolean),
    has3d: false, wikiSlug: str(w?.slug) || undefined, src: "wiki",
  };
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Fusionne les deux listes. Le wiki fait foi pour les chiffres (fichiers du
 * jeu) ; FleetYards apporte l'identifiant de ses pages (3D, composants), ses
 * images boutique, et les vaisseaux que le wiki n'a pas.
 */
export function mergeCatalog(wiki: Ship[], fy: Ship[]): Ship[] {
  const out: Ship[] = [];
  const byKey = new Map<string, Ship>(), byName = new Map<string, Ship>();
  for (const w of wiki) {
    if (byKey.has(w.id)) continue;
    const s = { ...w }; out.push(s); byKey.set(s.id, s);
    const n = normName(s.name); if (!byName.has(n)) byName.set(n, s);
  }
  for (const f of fy) {
    const w = (f.sc ? byKey.get(f.sc) : undefined) ?? byName.get(normName(f.rsiName)) ?? byName.get(normName(f.name));
    if (!w) { if (!byKey.has(f.id)) { out.push(f); byKey.set(f.id, f); } continue; }
    if (w.src === "both") continue;          // déjà apparié (variantes de même nom)
    w.slug = f.slug; w.alt = [...(w.alt ?? []), ...(f.alt ?? []), f.id].filter((v, i, a) => v !== w.id && a.indexOf(v) === i);
    w.has3d = f.has3d; w.src = "both";
    if (f.img) { w.img = f.img; w.imgLarge = f.imgLarge ?? w.imgLarge; }
    w.rsiName = f.rsiName || w.rsiName;
    if (!w.desc) w.desc = f.desc;
    if (!w.storeUrl) w.storeUrl = f.storeUrl;
    if (w.pledge == null) w.pledge = f.pledge;
    if (!w.loaners.length) w.loaners = f.loaners;
    if (!w.soldAt.length) { w.soldAt = f.soldAt; w.priceAuec = w.priceAuec ?? f.priceAuec; }
    if (!w.rentAt.length) w.rentAt = f.rentAt;
    if (!w.status) w.status = f.status;
    if (!w.foci.length) w.foci = f.foci;
    for (const k of ["crewMin", "crewMax", "cargo", "length", "beam", "height", "mass", "hull", "scm", "max", "dps"] as const) if (w[k] == null) w[k] = f[k];
    w.onSale = w.onSale || f.onSale;
  }
  out.sort((a, b) => a.mfr.localeCompare(b.mfr) || a.name.localeCompare(b.name));
  return out;
}

async function fetchWiki(getJson: GetJson, tick: (n: number) => void): Promise<Ship[]> {
  const ships: Ship[] = [];
  for (let page = 1; page <= 20; page++) {
    const data = (await getJson(`${WIKI_API}/vehicles?page%5Bsize%5D=${WIKI_PAGE}&page%5Bnumber%5D=${page}`)) as Any;
    const items: Any[] = Array.isArray(data?.data) ? data.data : [];
    for (const w of items) { const s = compactWiki(w); if (s) ships.push(s); }
    tick(items.length);
    const last = num(data?.meta?.last_page);
    if (items.length === 0 || (last != null ? page >= last : items.length < WIKI_PAGE)) break;
  }
  if (ships.length < 50) throw new Error("wiki : liste incomplète");
  return ships;
}

async function fetchFy(getJson: GetJson, tick: (n: number) => void): Promise<Ship[]> {
  const ships: Ship[] = [];
  for (let page = 1; page <= 30; page++) {
    const { items, pages } = listOf(await getJson(`${FY_API}/models?perPage=${FY_PAGE}&page=${page}`));
    for (const m of items) ships.push(compactFy(m));
    tick(items.length);
    if (items.length === 0 || (pages != null ? page >= pages : items.length < FY_PAGE)) break;
  }
  if (ships.length < 50) throw new Error("FleetYards : liste incomplète");
  return ships;
}

export interface FetchResult { ships: Ship[]; wiki: boolean; fy: boolean; errors: string[] }

/** Interroge les deux sources en parallèle et fusionne ce qui a répondu. Lève une erreur si aucune n'a répondu. */
export async function fetchCatalog(getJson: GetJson, onProgress?: (n: number) => void): Promise<FetchResult> {
  let got = 0;
  const tick = (n: number) => { got += n; onProgress?.(got); };
  const [w, f] = await Promise.allSettled([fetchWiki(getJson, tick), fetchFy(getJson, tick)]);
  const errors = [w, f].filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
  const wiki = w.status === "fulfilled" ? w.value : [], fy = f.status === "fulfilled" ? f.value : [];
  if (!wiki.length && !fy.length) throw new Error(errors.join(" · ") || "aucune source");
  return { ships: mergeCatalog(wiki, fy), wiki: wiki.length > 0, fy: fy.length > 0, errors };
}

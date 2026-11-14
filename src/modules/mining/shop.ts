/**
 * Matériel de minage en vente : têtes, modules, gadgets, outillage à pied et
 * véhicules de minage au sol, avec prix et lieux d'achat (API UEX 2.0, données
 * relevées par les joueurs). Tous systèmes confondus : Stanton, Pyro, Nyx.
 */
import { cached, uexGet, whereOf, TTL_PRICES, type Any, type Loaded } from "../market/uex";

export type ShopKind = "head" | "module" | "gadget" | "hand";
export const SHOP_KINDS: { id: ShopKind; label: string; hint: string }[] = [
  { id: "head", label: "Têtes de minage", hint: "Le laser lui-même, monté sur le vaisseau (taille 1 : Prospector, Golem ; taille 2 : MOLE)." },
  { id: "module", label: "Modules", hint: "Se glissent dans les emplacements de la tête. Passifs : effet permanent. Actifs : à déclencher, en nombre d'utilisations limité." },
  { id: "gadget", label: "Gadgets", hint: "Objets à poser à la main sur la roche avant de miner : ils modifient résistance, instabilité ou fenêtre de charge." },
  { id: "hand", label: "Minage à pied", hint: "Multi-outil et son embout de minage, pour les petits gisements de gemmes en grotte ou en surface." },
];
const CAT: Record<Exclude<ShopKind, "hand">, number> = { head: 29, module: 30, gadget: 28 };

export interface Offer { terminal: string; sys: string; body: string; place: string; price: number; at: number }
export interface ShopItem { id: number; uuid: string; shot: string; name: string; company: string; kind: ShopKind; offers: Offer[] }
export interface GroundVehicle { name: string; buy: Offer[]; rent: Offer[] }
export interface MiningShop { items: ShopItem[]; vehicles: GroundVehicle[]; vehiclesOk: boolean }

const num = (x: unknown): number => (typeof x === "number" && isFinite(x) ? x : Number(x) || 0);
const str = (x: unknown): string => (typeof x === "string" ? x : x == null ? "" : String(x));

const offerOf = (r: Any): Offer => ({ terminal: str(r.terminal_name), ...whereOf(r), price: num(r.price_buy), at: num(r.date_modified) * 1000 });
const itemOf = (i: Any, kind: ShopKind): ShopItem => ({ id: num(i.id), uuid: str(i.uuid), shot: /^https:\/\//.test(str(i.screenshot)) ? str(i.screenshot) : "", name: str(i.name), company: str(i.company_name), kind, offers: [] });

/** Outillage de minage à pied, reconnu par son nom dans les armes et accessoires personnels. */
const HAND = /multi-?tool|orebit|mining attachment/i;

/**
 * Les prix des véhicules UEX ne portent que le nom du terminal : on en déduit
 * le système d'après les lieux connus.
 */
function vehiclePlace(terminal: string): { sys: string; place: string } {
  const t = terminal.toLowerCase();
  if (/levski/.test(t)) return { sys: "Nyx", place: "Levski" };
  if (/ruin station/.test(t)) return { sys: "Pyro", place: "Ruin Station" };
  if (/checkmate/.test(t)) return { sys: "Pyro", place: "Checkmate" };
  if (/orbituary/.test(t)) return { sys: "Pyro", place: "Orbituary" };
  if (/lorville/.test(t)) return { sys: "Stanton", place: "Lorville" };
  if (/astro armada|area ?18/.test(t)) return { sys: "Stanton", place: "Area18" };
  if (/crusader|orison/.test(t)) return { sys: "Stanton", place: "Orison" };
  if (/new babbage|regal/.test(t)) return { sys: "Stanton", place: "New Babbage" };
  if (/grim ?hex/.test(t)) return { sys: "Stanton", place: "GrimHEX" };
  return { sys: "", place: "" };
}
/** Véhicules de minage qui ne volent pas : ROC (solo), ROC-DS (duo), exosquelette ATLS GEO. */
const GROUND = ["ROC", "ROC-DS", "ATLS GEO"];

function vehicleOffers(rows: Any[], field: "price_buy" | "price_rent"): Map<string, Offer[]> {
  const m = new Map<string, Offer[]>();
  for (const r of rows) {
    const name = str(r.vehicle_name);
    if (!GROUND.includes(name)) continue;
    const price = num(r[field]); if (price <= 0) continue;
    const terminal = str(r.terminal_name);
    const list = m.get(name) ?? [];
    list.push({ terminal, ...vehiclePlace(terminal), body: "", price, at: num(r.date_modified) * 1000 });
    m.set(name, list);
  }
  for (const l of m.values()) l.sort((a, b) => a.price - b.price);
  return m;
}

export function loadMiningShop(minAt = 0): Promise<Loaded<MiningShop>> {
  return cached<MiningShop>("mining-shop", TTL_PRICES, async () => {
    const kinds = Object.keys(CAT) as Exclude<ShopKind, "hand">[];
    // listes et prix par catégorie (indispensables) ; outillage à pied et véhicules sont un plus
    const [lists, prices, hand, veh] = await Promise.all([
      Promise.all(kinds.map((k) => uexGet(`/items?id_category=${CAT[k]}`))),
      Promise.all(kinds.map((k) => uexGet(`/items_prices?id_category=${CAT[k]}`))),
      Promise.all([17, 18, 28].map((c) => uexGet(`/items?id_category=${c}`).catch(() => [] as Any[]))).then((r) => r.flat().filter((i: Any) => HAND.test(str(i.name)))).catch(() => [] as Any[]),
      Promise.all([uexGet("/vehicles_purchases_prices_all"), uexGet("/vehicles_rentals_prices_all").catch(() => [] as Any[])]).catch(() => null),
    ]);
    const items: ShopItem[] = [];
    const byId = new Map<number, ShopItem>();
    kinds.forEach((k, n) => { for (const i of lists[n]) { const it = itemOf(i, k); if (it.name && !HAND.test(it.name) && !byId.has(it.id)) { items.push(it); byId.set(it.id, it); } } });
    for (const rows of prices) for (const r of rows) { const it = byId.get(num(r.id_item)); const o = offerOf(r); if (it && o.price > 0) it.offers.push(o); }
    // outillage à pied : peu d'objets, on demande leurs prix un par un
    const handItems = hand.map((i: Any) => itemOf(i, "hand")).filter((it, n, a) => it.name && a.findIndex((x) => x.id === it.id) === n).slice(0, 12);
    await Promise.all(handItems.map(async (it) => { const rows = await uexGet(`/items_prices?id_item=${it.id}`).catch(() => [] as Any[]); it.offers = rows.map(offerOf).filter((o) => o.price > 0); }));
    for (const it of [...items, ...handItems]) it.offers.sort((a, b) => a.price - b.price);
    items.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
    const buy = veh ? vehicleOffers(veh[0], "price_buy") : new Map<string, Offer[]>();
    const rent = veh ? vehicleOffers(veh[1], "price_rent") : new Map<string, Offer[]>();
    return { items: [...items, ...handItems], vehicles: GROUND.map((name) => ({ name, buy: buy.get(name) ?? [], rent: rent.get(name) ?? [] })), vehiclesOk: veh !== null };
  }, minAt);
}

export const SYSTEMS = ["Stanton", "Pyro", "Nyx"];
export const minPrice = (offers: Offer[], sys: string): number | null => { const l = sys ? offers.filter((o) => o.sys === sys) : offers; return l.length ? Math.min(...l.map((o) => o.price)) : null; };
export const systemsOf = (offers: Offer[]): string[] => [...new Set(offers.map((o) => o.sys).filter(Boolean))].sort((a, b) => SYSTEMS.indexOf(a) - SYSTEMS.indexOf(b));

export const GROUND_INFO: Record<string, { title: string; text: string }> = {
  "ROC": { title: "Greycat ROC", text: "Petit véhicule de minage solo : mine les gisements de gemmes en surface (hadanite, dolivine, aphorite, janalite), trop gros pour le multi-outil. Tient dans une soute de Cutlass, Freelancer ou Nomad." },
  "ROC-DS": { title: "Greycat ROC-DS", text: "Version deux places : un pilote, un opérateur du laser. Soute de minerai plus grande que le ROC, mais demande une soute plus spacieuse pour le transporter." },
  "ATLS GEO": { title: "Argo ATLS GEO", text: "Exosquelette de minage : laser intégré et réacteurs dorsaux pour atteindre les gisements en pente ou en grotte. Entre dans la plupart des soutes." },
};

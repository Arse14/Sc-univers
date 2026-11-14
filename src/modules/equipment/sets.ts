/**
 * Ensembles d'armure : UEX range chaque pièce dans sa catégorie (casques,
 * torses, bras, jambes, sacs, sous-combinaisons). On les réunit ici par gamme
 * (« ADP »), puis par coloris, avec pour chaque pièce ses points de vente.
 * Le rapprochement se fait sur les noms : « ADP Arms Black » → gamme ADP,
 * pièce Bras, coloris Black.
 */
import { cached, uexGet, whereOf, TTL_PRICES, type Any, type Loaded } from "../market/uex";
import { loadCategories, loadItems, type Item } from "./items";

export type Slot = "helmet" | "core" | "arms" | "legs" | "backpack" | "undersuit";
export const SLOTS: { id: Slot; label: string; cat: [string, string]; word: RegExp }[] = [
  { id: "helmet", label: "Casque", cat: ["Armor", "Helmets"], word: /\bHelmet\b/i },
  { id: "core", label: "Torse", cat: ["Armor", "Torso"], word: /\b(?:Core|Torso)\b/i },
  { id: "arms", label: "Bras", cat: ["Armor", "Arms"], word: /\bArms\b/i },
  { id: "legs", label: "Jambes", cat: ["Armor", "Legs"], word: /\bLegs\b/i },
  { id: "backpack", label: "Sac à dos", cat: ["Armor", "Backpacks"], word: /\bBackpack\b/i },
  { id: "undersuit", label: "Sous-combinaison", cat: ["Undersuits", "Undersuits"], word: /\bUndersuit\b/i },
];
export const SLOT_FR = Object.fromEntries(SLOTS.map((s) => [s.id, s.label])) as Record<Slot, string>;

export interface Offer { t: number; terminal: string; sys: string; body: string; place: string; price: number; at: number }
export interface SetPiece { slot: Slot; item: Item; offers: Offer[] }
export interface SetVariant { name: string; pieces: SetPiece[] }
export interface ArmorSet { key: string; name: string; company: string; slots: Slot[]; variants: SetVariant[] }

const num = (x: unknown): number => (typeof x === "number" && isFinite(x) ? x : Number(x) || 0);
const str = (x: unknown): string => (typeof x === "string" ? x : x == null ? "" : String(x));

/** « Morozov-SH Arms "Lifeforce" Red » → gamme « Morozov-SH », coloris « Lifeforce · Red ». */
export function splitPiece(name: string, word: RegExp): { set: string; variant: string } {
  let quoted = "";
  const q = /["“”]([^"“”]+)["“”]/.exec(name);
  let rest = name;
  if (q) { quoted = q[1].trim(); rest = (name.slice(0, q.index) + name.slice(q.index + q[0].length)).replace(/\s+/g, " ").trim(); }
  const m = word.exec(rest);
  if (!m) return { set: rest, variant: quoted };
  const set = rest.slice(0, m.index).trim() || rest;
  const after = rest.slice(m.index + m[0].length).trim();
  return { set, variant: [quoted, after].filter(Boolean).join(" · ") };
}

interface PriceTable { rows: Record<number, Offer[]> }

/** Prix de toutes les pièces d'une catégorie en un appel, rangés par objet. */
function loadCategoryPrices(idCategory: number, minAt = 0): Promise<Loaded<PriceTable>> {
  return cached<PriceTable>(`equip-setprices-${idCategory}`, TTL_PRICES, async () => {
    const data = await uexGet(`/items_prices?id_category=${idCategory}`);
    const rows: Record<number, Offer[]> = {};
    for (const r of data as Any[]) {
      const price = num(r.price_buy); if (price <= 0) continue;
      const id = num(r.id_item);
      (rows[id] ??= []).push({ t: num(r.id_terminal), terminal: str(r.terminal_name), ...whereOf(r), price, at: num(r.date_modified) * 1000 });
    }
    for (const l of Object.values(rows)) l.sort((a, b) => a.price - b.price);
    return { rows };
  }, minAt);
}

export interface SetsResult { sets: ArmorSet[]; at: number; stale: boolean; missing: string[] }

export async function loadArmorSets(minAt = 0): Promise<SetsResult> {
  const cats = (await loadCategories()).data;
  const missing: string[] = [];
  let at = Date.now(), stale = false;
  const perSlot = await Promise.all(SLOTS.map(async (s) => {
    const cat = cats.find((c) => c.section === s.cat[0] && c.name === s.cat[1]);
    if (!cat) { missing.push(s.label); return { slot: s, items: [] as Item[], prices: {} as Record<number, Offer[]> }; }
    try {
      const [items, prices] = await Promise.all([loadItems(cat.id, minAt), loadCategoryPrices(cat.id, minAt)]);
      at = Math.min(at, prices.at); stale = stale || prices.stale || items.stale;
      return { slot: s, items: items.data, prices: prices.data.rows };
    } catch { missing.push(s.label); return { slot: s, items: [] as Item[], prices: {} as Record<number, Offer[]> }; }
  }));
  if (perSlot.every((p) => p.items.length === 0)) throw new Error("UEX n'a renvoyé aucune pièce d'armure");

  const sets = new Map<string, ArmorSet>();
  for (const { slot, items, prices } of perSlot) for (const item of items) {
    const { set, variant } = splitPiece(item.name, slot.word);
    const key = set.toLowerCase();
    let g = sets.get(key);
    if (!g) { g = { key, name: set, company: item.company, slots: [], variants: [] }; sets.set(key, g); }
    if (!g.company) g.company = item.company;
    const vName = variant || "Standard";
    let v = g.variants.find((x) => x.name.toLowerCase() === vName.toLowerCase());
    if (!v) { v = { name: vName, pieces: [] }; g.variants.push(v); }
    if (!v.pieces.some((p) => p.slot === slot.id)) v.pieces.push({ slot: slot.id, item, offers: prices[item.id] ?? [] });
    if (!g.slots.includes(slot.id)) g.slots.push(slot.id);
  }
  const order = SLOTS.map((s) => s.id);
  const out = [...sets.values()];
  for (const g of out) {
    g.slots.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const v of g.variants) v.pieces.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
    g.variants.sort((a, b) => b.pieces.length - a.pieces.length || (a.name === "Standard" ? -1 : b.name === "Standard" ? 1 : a.name.localeCompare(b.name, "fr")));
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
  return { sets: out, at, stale, missing };
}

/** Prix du coloris en prenant chaque pièce au moins cher, et nombre de pièces introuvables en boutique. */
export function variantTotal(v: SetVariant, sys = ""): { total: number; unsold: number } {
  let total = 0, unsold = 0;
  for (const p of v.pieces) { const l = sys ? p.offers.filter((o) => o.sys === sys) : p.offers; if (l.length) total += l[0].price; else unsold++; }
  return { total, unsold };
}

/** Boutiques qui vendent toutes les pièces en vente du coloris : un seul trajet. */
export function oneStopShops(v: SetVariant): { terminal: string; sys: string; where: string; total: number }[] {
  const sold = v.pieces.filter((p) => p.offers.length > 0);
  if (sold.length < 2) return [];
  const out: { terminal: string; sys: string; where: string; total: number }[] = [];
  for (const o of sold[0].offers) {
    let total = 0, all = true;
    for (const p of sold) { const hit = p.offers.find((x) => x.t === o.t); if (!hit) { all = false; break; } total += hit.price; }
    if (all && !out.some((x) => x.terminal === o.terminal)) out.push({ terminal: o.terminal, sys: o.sys, where: [o.place, o.body].filter(Boolean).join(" · "), total });
  }
  return out.sort((a, b) => a.total - b.total);
}

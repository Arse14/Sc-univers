/**
 * Client UEX (https://uexcorp.space) : prix communautaires des matières et
 * des objets. Tout ce qui vient de l'API est condensé à la réception (on ne
 * garde ni en mémoire ni en cache les réponses brutes) et mis en cache avec
 * une durée de vie : 30 min pour les prix, 7 jours pour les listes fixes.
 */
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri, loadStore, saveStore } from "../../lib/tauri";

const API = "https://api.uexcorp.space/2.0";
export const TTL_PRICES = 30 * 60 * 1000;
export const TTL_STATIC = 7 * 24 * 3600 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

export class UexError extends Error {
  kind: "auth" | "http" | "network" | "data";
  constructor(kind: UexError["kind"], message: string) { super(message); this.kind = kind; }
}

/** Message d'erreur lisible, en français, quel que soit ce qui a été levé. */
export function errText(e: unknown): string {
  if (e instanceof UexError) return e.message;
  return "Erreur inattendue pendant la lecture des données UEX.";
}

async function token(): Promise<string> {
  try { return (await loadStore<{ uexToken?: string }>("settings"))?.uexToken?.trim() ?? ""; } catch { return ""; }
}

/** GET sur l'API UEX ; renvoie le tableau `data` (à condenser tout de suite par l'appelant). */
export async function uexGet(path: string): Promise<Any[]> {
  const tk = await token();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (tk) headers.Authorization = `Bearer ${tk}`;
  const f = isTauri ? tauriFetch : fetch;
  let res: Response;
  try { res = await f(API + path, { headers }); }
  catch { throw new UexError("network", "UEX est injoignable (hors ligne ou service indisponible)."); }
  if (res.status === 401 || res.status === 403) {
    throw new UexError("auth", tk
      ? "UEX a refusé le jeton enregistré : vérifie-le dans Paramètres."
      : "UEX demande un jeton pour cet accès : ajoute le tien dans Paramètres.");
  }
  if (res.status === 429) throw new UexError("http", "Trop de requêtes envoyées à UEX : réessaie dans une minute.");
  if (!res.ok) throw new UexError("http", `UEX a répondu avec une erreur (HTTP ${res.status}).`);
  let j: Any;
  try { j = await res.json(); } catch { throw new UexError("data", "Réponse UEX illisible."); }
  if (!j || j.status !== "ok" || !Array.isArray(j.data)) throw new UexError("data", "Réponse UEX inattendue.");
  return j.data as Any[];
}

/* ---------- cache disque avec durée de vie ---------- */
/** La valeur est rangée sous forme de chaîne JSON compacte (le magasin indente tout le reste). */
interface Box { at: number; v: string }
export interface Loaded<T> { data: T; at: number; stale: boolean }

function unbox<T>(box: Box | null): T | null {
  if (!box || typeof box.v !== "string") return null;
  try { return JSON.parse(box.v) as T; } catch { return null; }
}

/**
 * Cache frais → cache ; sinon réseau ; si le réseau échoue, cache périmé signalé par `stale`.
 * `minAt` : tout ce qui a été récupéré avant cet instant est considéré périmé (bouton Actualiser).
 */
export async function cached<T>(key: string, ttl: number, load: () => Promise<T>, minAt = 0): Promise<Loaded<T>> {
  const box = await loadStore<Box>(key).catch(() => null);
  const old = unbox<T>(box);
  if (old !== null && box && box.at >= minAt && Date.now() - box.at < ttl) return { data: old, at: box.at, stale: false };
  try {
    const data = await load();
    const at = Date.now();
    saveStore<Box>(key, { at, v: JSON.stringify(data) }).catch(() => undefined);
    return { data, at, stale: false };
  } catch (e) {
    if (old !== null && box) return { data: old, at: box.at, stale: true };
    throw e;
  }
}

/**
 * Petit cache borné (les N dernières fiches consultées) : sert à la fois de
 * LRU en mémoire et de repli hors ligne, dans une seule clé du magasin.
 */
export class Bucket<T> {
  private items: { id: number; at: number; v: T }[] | null = null;
  constructor(private key: string, private ttl: number, private max = 10) {}

  private async all() {
    if (!this.items) {
      const box = await loadStore<Box>(this.key).catch(() => null);
      const arr = unbox<{ id: number; at: number; v: T }[]>(box);
      this.items = Array.isArray(arr) ? arr.slice(0, this.max) : [];
    }
    return this.items;
  }

  async get(id: number, load: () => Promise<T>, minAt = 0): Promise<Loaded<T>> {
    const items = await this.all();
    const i = items.findIndex((x) => x.id === id);
    const hit = i >= 0 ? items[i] : null;
    if (hit && hit.at >= minAt && Date.now() - hit.at < this.ttl) {
      items.splice(i, 1); items.unshift(hit);            // remonte en tête (LRU)
      return { data: hit.v, at: hit.at, stale: false };
    }
    try {
      const v = await load();
      const at = Date.now();
      const rest = (this.items ?? []).filter((x) => x.id !== id);
      this.items = [{ id, at, v }, ...rest].slice(0, this.max);
      saveStore<Box>(this.key, { at, v: JSON.stringify(this.items) }).catch(() => undefined);
      return { data: v, at, stale: false };
    } catch (e) {
      if (hit) return { data: hit.v, at: hit.at, stale: true };
      throw e;
    }
  }
}

/* ---------- mise en forme ---------- */
export const nf = (n: number | null | undefined, d = 0) => n == null || !isFinite(n) ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: d });
export const auec = (n: number | null | undefined) => n == null || n <= 0 ? "—" : `${nf(n)} aUEC`;

/** Âge lisible d'un horodatage en millisecondes. */
export function age(ms: number | null | undefined): string {
  if (!ms) return "date inconnue";
  const s = Math.max(0, Date.now() - ms) / 1000;
  if (s < 90) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400 * 2) return `il y a ${Math.round(s / 3600)} h`;
  if (s < 86400 * 60) return `il y a ${Math.round(s / 86400)} j`;
  return `il y a ${Math.round(s / (86400 * 30))} mois`;
}
/** Un relevé de plus de 7 jours est signalé comme ancien. */
export const isOld = (ms: number | null | undefined) => !ms || Date.now() - ms > 7 * 86400 * 1000;

const num = (x: unknown): number => { const n = Number(x); return isFinite(n) ? n : 0; };
const str = (x: unknown): string => typeof x === "string" ? x : x == null ? "" : String(x);
/** Les dates UEX sont des secondes Unix. */
const ts = (x: unknown): number => num(x) * 1000;

/** Lieu d'un terminal : lune ou planète, puis station / ville / avant-poste. */
export function whereOf(r: Any): { sys: string; body: string; place: string } {
  return {
    sys: str(r.star_system_name),
    body: str(r.moon_name) || str(r.planet_name) || str(r.orbit_name),
    place: str(r.space_station_name) || str(r.city_name) || str(r.outpost_name) || str(r.poi_name),
  };
}

/* ---------- matières ---------- */
export interface Commodity {
  id: number; name: string; code: string; kind: string;
  buy: number; sell: number;                 // prix moyens UEX par SCU (0 = non proposé)
  illegal: boolean; raw: boolean; refined: boolean; mineral: boolean;
  buyable: boolean; sellable: boolean;
}

export function loadCommodities(minAt = 0): Promise<Loaded<Commodity[]>> {
  return cached<Commodity[]>("market-commodities", TTL_PRICES, async () => {
    const data = await uexGet("/commodities");
    const out: Commodity[] = [];
    for (const c of data) {
      if (num(c.is_available_live) !== 1 || num(c.is_visible) !== 1) continue;
      out.push({
        id: num(c.id), name: str(c.name), code: str(c.code), kind: str(c.kind) || "Autre",
        buy: num(c.price_buy), sell: num(c.price_sell),
        illegal: num(c.is_illegal) === 1, raw: num(c.is_raw) === 1, refined: num(c.is_refined) === 1, mineral: num(c.is_mineral) === 1,
        buyable: num(c.is_buyable) === 1, sellable: num(c.is_sellable) === 1,
      });
    }
    if (out.length === 0) throw new UexError("data", "UEX n'a renvoyé aucune matière.");
    out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return out;
  }, minAt);
}

/** Prix d'une matière à un terminal. */
export interface PriceRow {
  t: number; name: string; sys: string; body: string; place: string;
  buy: number; sell: number;
  scuBuy: number;      // SCU en vente au terminal (stock)
  scuSell: number;     // SCU que le terminal accepte encore (demande)
  at: number; ver: string;
}

const priceBucket = new Bucket<PriceRow[]>("market-details", TTL_PRICES, 10);

export function loadCommodityPrices(id: number, minAt = 0): Promise<Loaded<PriceRow[]>> {
  return priceBucket.get(id, async () => {
    const data = await uexGet(`/commodities_prices?id_commodity=${id}`);
    return data.map((r): PriceRow => ({
      t: num(r.id_terminal), name: str(r.terminal_name), ...whereOf(r),
      buy: num(r.price_buy), sell: num(r.price_sell),
      scuBuy: num(r.scu_buy), scuSell: num(r.scu_sell),
      at: ts(r.date_modified), ver: str(r.game_version),
    })).filter((r) => r.buy > 0 || r.sell > 0);
  }, minAt);
}

/* ---------- routes (calculées ici, à partir des prix de tous les terminaux) ---------- */
interface Terminal { id: number; name: string; sys: string; body: string; place: string; owned: boolean }
/** [matière, terminal, prix d'achat, prix de vente, SCU en stock, SCU demandés, date] */
type PriceTuple = [number, number, number, number, number, number, number];

function loadTerminals(): Promise<Loaded<Terminal[]>> {
  return cached<Terminal[]>("market-terminals", TTL_STATIC, async () => {
    const data = await uexGet("/terminals?type=commodity");
    const out = data.map((t): Terminal => ({
      id: num(t.id), name: str(t.displayname) || str(t.nickname) || str(t.name),
      ...whereOf(t), owned: num(t.is_player_owned) === 1,
    }));
    if (out.length === 0) throw new UexError("data", "UEX n'a renvoyé aucun terminal.");
    return out;
  });
}

function loadAllPrices(minAt: number): Promise<Loaded<PriceTuple[]>> {
  return cached<PriceTuple[]>("market-prices-all", TTL_PRICES, async () => {
    const data = await uexGet("/commodities_prices_all");
    const out: PriceTuple[] = [];
    for (const r of data) {
      const pb = num(r.price_buy), ps = num(r.price_sell);
      if (pb <= 0 && ps <= 0) continue;
      out.push([num(r.id_commodity), num(r.id_terminal), pb, ps, num(r.scu_buy), num(r.scu_sell), num(r.date_modified)]);
    }
    if (out.length === 0) throw new UexError("data", "UEX n'a renvoyé aucun prix.");
    return out;
  }, minAt);
}

export interface RouteEnd { name: string; sys: string; body: string; place: string }
export interface Route {
  key: string; cid: number; commodity: string; illegal: boolean;
  from: RouteEnd; to: RouteEnd;
  buy: number; sell: number; qty: number;
  invest: number; profit: number;
  limit: "soute" | "budget" | "stock" | "demande";
  stockKnown: boolean;
  at: number;                                // relevé le plus ancien des deux
}
export interface RouteQuery { cargo: number; budget: number; system: string; illegal: boolean; needStock: boolean }
export interface RouteResult { routes: Route[]; at: number; stale: boolean; scanned: number }

/**
 * Meilleurs couples achat → vente pour une soute et un budget donnés.
 * Rien n'est gardé en mémoire après le calcul, hormis les routes retenues.
 */
export async function findRoutes(q: RouteQuery, commodities: Commodity[], minAt = 0): Promise<RouteResult> {
  const [terms, prices] = await Promise.all([loadTerminals(), loadAllPrices(minAt)]);
  const tById = new Map(terms.data.map((t) => [t.id, t]));
  const cById = new Map(commodities.map((c) => [c.id, c]));
  const sys = q.system.toLowerCase();
  const okTerm = (id: number): Terminal | null => {
    const t = tById.get(id);
    if (!t || t.owned) return null;
    if (sys && t.sys.toLowerCase() !== sys) return null;
    return t;
  };

  const groups = new Map<number, { buys: PriceTuple[]; sells: PriceTuple[] }>();
  for (const p of prices.data) {
    const c = cById.get(p[0]);
    if (!c || (c.illegal && !q.illegal)) continue;
    let g = groups.get(p[0]);
    if (!g) { g = { buys: [], sells: [] }; groups.set(p[0], g); }
    if (p[2] > 0) g.buys.push(p);
    if (p[3] > 0) g.sells.push(p);
  }

  const end = (t: Terminal): RouteEnd => ({ name: t.name, sys: t.sys, body: t.body, place: t.place });
  const all: Route[] = [];
  let scanned = 0;
  for (const [cid, g] of groups) {
    const c = cById.get(cid)!;
    const best: Route[] = [];
    for (const b of g.buys) {
      const from = okTerm(b[1]);
      if (!from) continue;
      if (q.needStock && b[4] <= 0) continue;
      for (const s of g.sells) {
        if (s[1] === b[1] || s[3] <= b[2]) continue;
        const to = okTerm(s[1]);
        if (!to) continue;
        scanned++;
        let qty = q.cargo;
        let limit: Route["limit"] = "soute";
        if (q.budget > 0) { const m = Math.floor(q.budget / b[2]); if (m < qty) { qty = m; limit = "budget"; } }
        if (b[4] > 0 && b[4] < qty) { qty = b[4]; limit = "stock"; }
        if (s[5] > 0 && s[5] < qty) { qty = s[5]; limit = "demande"; }
        if (qty <= 0) continue;
        best.push({
          key: `${cid}-${b[1]}-${s[1]}`, cid, commodity: c.name, illegal: c.illegal,
          from: end(from), to: end(to), buy: b[2], sell: s[3], qty,
          invest: qty * b[2], profit: qty * (s[3] - b[2]), limit,
          stockKnown: b[4] > 0, at: Math.min(b[6], s[6]) * 1000,
        });
      }
    }
    best.sort((x, y) => y.profit - x.profit);
    all.push(...best.slice(0, 3));           // au plus 3 routes par matière, pour varier
  }
  all.sort((x, y) => y.profit - x.profit);
  return { routes: all.slice(0, 30), at: prices.at, stale: prices.stale || terms.stale, scanned };
}

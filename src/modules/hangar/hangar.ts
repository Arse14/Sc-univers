/**
 * Mes flottes : vaisseaux possédés, gérés entièrement dans l'application
 * (ajout depuis le catalogue, édition, plusieurs flottes), avec en option
 * l'import d'un export HangarXPLOR. Stocké localement dans « hangar ».
 */
import { loadStore, saveStore } from "../../lib/tauri";
import { matchShip, type Ship } from "./catalog";

export type Acquired = "pledge" | "ingame" | "rental" | "loaner" | "gift";
export const ACQUIRED_FR: Record<Acquired, string> = { pledge: "Pledge (boutique RSI)", ingame: "Acheté en jeu (aUEC)", rental: "Location", loaner: "Prêt (loaner)", gift: "Cadeau / récompense" };
export type Insurance = "" | "lti" | "120" | "72" | "24" | "12" | "6" | "3" | "std";
export const INSURANCE_FR: Record<Insurance, string> = { "": "Non précisée", lti: "LTI (à vie)", "120": "10 ans", "72": "6 ans", "24": "2 ans", "12": "12 mois", "6": "6 mois", "3": "3 mois", std: "Standard en jeu" };

export interface OwnedShip {
  id: string;                 // identifiant local
  shipId: string | null;      // id FleetYards (null si non reconnu)
  label: string;              // nom du modèle
  nickname: string | null;    // nom donné par le joueur
  lti: boolean;
  insurance?: Insurance;
  acquired?: Acquired;
  warbond: boolean;
  location?: string | null;   // où il est stationné
  notes?: string | null;
  paidAuec?: number | null;
  pledgeName: string | null;
  pledgeCost: string | null;
  pledgeDate: string | null;
  pledgeId: string | null;
  source: "hangarxplor" | "manual";
}

export interface Fleet { id: string; name: string; ships: OwnedShip[] }
export interface Hangar { fleets: Fleet[]; active: string; importedAt: string | null }

const uid = () => Math.random().toString(36).slice(2, 10);
export const newFleet = (name: string): Fleet => ({ id: uid(), name, ships: [] });

export function emptyHangar(): Hangar { const f = newFleet("Ma flotte"); return { fleets: [f], active: f.id, importedAt: null }; }

/** Charge le hangar, en migrant l'ancien format (une seule liste `ships`). */
export async function loadHangar(): Promise<Hangar> {
  const raw = await loadStore<Partial<Hangar> & { ships?: OwnedShip[] }>("hangar").catch(() => null);
  if (!raw) return emptyHangar();
  if (Array.isArray(raw.fleets) && raw.fleets.length > 0) {
    const fleets = raw.fleets.map((f) => ({ ...f, ships: (f.ships ?? []).map(clean) }));
    return { fleets, active: fleets.some((f) => f.id === raw.active) ? raw.active! : fleets[0].id, importedAt: raw.importedAt ?? null };
  }
  const h = emptyHangar();
  h.fleets[0].ships = (raw.ships ?? []).map(clean);
  h.importedAt = raw.importedAt ?? null;
  return h;
}
export const saveHangar = (h: Hangar) => saveStore<Hangar>("hangar", h);

/** Retire les champs lourds d'anciennes versions (copie brute de l'import). */
function clean(o: OwnedShip & { raw?: unknown }): OwnedShip {
  const { raw: _raw, ...rest } = o;
  void _raw;
  return { ...rest, insurance: rest.insurance ?? (rest.lti ? "lti" : ""), acquired: rest.acquired ?? (rest.source === "hangarxplor" ? "pledge" : "ingame") };
}

export const activeFleet = (h: Hangar): Fleet => h.fleets.find((f) => f.id === h.active) ?? h.fleets[0];
export const updateFleet = (h: Hangar, id: string, fn: (f: Fleet) => Fleet): Hangar => ({ ...h, fleets: h.fleets.map((f) => (f.id === id ? fn(f) : f)) });

export function addShip(ship: Ship, acquired: Acquired = "ingame"): OwnedShip {
  return { id: uid(), shipId: ship.id, label: ship.rsiName, nickname: null, lti: false, insurance: acquired === "ingame" ? "std" : "", acquired, warbond: false, location: null, notes: null, paidAuec: null, pledgeName: null, pledgeCost: null, pledgeDate: null, pledgeId: null, source: "manual" };
}

/* ---------- import HangarXPLOR (facultatif) ---------- */
interface XplorRecord {
  ship_code?: string; name?: string; ship_name?: string; manufacturer_code?: string; manufacturer_name?: string;
  lti?: boolean | string; warbond?: boolean | string; pledge_id?: string | number; pledge_name?: string; pledge_cost?: string; pledge_date?: string;
  entity_type?: string;
}

function parseCsv(text: string): XplorRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (l: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (const ch of l) {
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur.trim()); return out;
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const col = (row: string[], key: string) => { const i = head.indexOf(key); return i >= 0 ? row[i] : undefined; };
  return lines.slice(1).map(split).map((r) => ({
    manufacturer_name: col(r, "manufacturer"), ship_name: col(r, "ship"), name: col(r, "ship"),
    lti: col(r, "lti"), warbond: col(r, "warbond"), pledge_id: col(r, "id"), pledge_name: col(r, "pledge"), pledge_cost: col(r, "cost"), pledge_date: col(r, "date"),
  }));
}

const truthy = (v: unknown) => v === true || String(v).toLowerCase() === "true" || String(v) === "1";

export function importHangarXplor(text: string, catalog: Ship[]): { ships: OwnedShip[]; unknown: string[]; skipped: number } {
  let records: XplorRecord[];
  const t = text.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    const j = JSON.parse(t);
    records = Array.isArray(j) ? j : Array.isArray(j.ships) ? j.ships : [];
  } else records = parseCsv(t);
  const ships: OwnedShip[] = []; const unknown: string[] = []; let skipped = 0;
  for (const r of records) {
    if (r.entity_type && r.entity_type !== "ship") { skipped++; continue; }
    const hit = matchShip(catalog, r);
    const base = r.ship_name || r.name || r.ship_code || "Vaisseau inconnu";
    const nick = r.ship_name && r.name && r.ship_name !== r.name && !(hit && (r.ship_name === hit.rsiName || r.ship_name === hit.name)) ? r.ship_name : null;
    if (!hit) unknown.push(base);
    const lti = truthy(r.lti);
    ships.push({
      id: uid(), shipId: hit?.id ?? null, label: hit ? hit.rsiName : base, nickname: nick, lti, insurance: lti ? "lti" : "", acquired: "pledge", warbond: truthy(r.warbond), location: null, notes: null, paidAuec: null,
      pledgeName: r.pledge_name ?? null, pledgeCost: r.pledge_cost ?? null, pledgeDate: r.pledge_date ?? null, pledgeId: r.pledge_id != null ? String(r.pledge_id) : null,
      source: "hangarxplor",
    });
  }
  return { ships, unknown, skipped };
}

/** Coût en dollars d'un pledge « $45.00 USD » → 45. */
export const costUsd = (s: string | null): number => { if (!s) return 0; const m = s.replace(/,/g, "").match(/([\d.]+)/); return m ? parseFloat(m[1]) : 0; };

/* ---------- sauvegarde / restauration d'une flotte (fichier JSON de l'app) ---------- */
export const exportFleet = (f: Fleet): string => JSON.stringify({ app: "SC-Univers", kind: "fleet", name: f.name, ships: f.ships }, null, 1);
export function parseFleetFile(text: string): Fleet | null {
  try {
    const j = JSON.parse(text);
    if (j?.app !== "SC-Univers" || j?.kind !== "fleet" || !Array.isArray(j.ships)) return null;
    return { id: uid(), name: String(j.name ?? "Flotte importée"), ships: (j.ships as OwnedShip[]).map((s) => clean({ ...s, id: uid() })) };
  } catch { return null; }
}

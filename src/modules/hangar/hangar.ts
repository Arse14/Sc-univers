/**
 * Ma flotte : vaisseaux possédés, importés depuis HangarXPLOR (JSON ou CSV)
 * ou ajoutés à la main. Stockés localement dans « hangar ».
 */
import { loadStore, saveStore } from "../../lib/tauri";
import { matchShip, type Ship } from "./catalog";

export interface OwnedShip {
  id: string;                 // identifiant local
  shipId: string | null;      // id FleetYards (null si non reconnu)
  label: string;              // nom d'affichage (nom RSI ou brut de l'import)
  nickname: string | null;    // nom custom du joueur
  lti: boolean;
  warbond: boolean;
  pledgeName: string | null;
  pledgeCost: string | null;
  pledgeDate: string | null;
  pledgeId: string | null;
  source: "hangarxplor" | "manual";
  raw?: Record<string, unknown>;
}

export interface Hangar { ships: OwnedShip[]; importedAt: string | null }

export const EMPTY: Hangar = { ships: [], importedAt: null };

export const loadHangar = async (): Promise<Hangar> => (await loadStore<Hangar>("hangar").catch(() => null)) ?? EMPTY;
export const saveHangar = (h: Hangar) => saveStore<Hangar>("hangar", h);

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- parsing HangarXPLOR ---------- */
interface XplorRecord {
  ship_code?: string; name?: string; ship_name?: string; manufacturer_code?: string; manufacturer_name?: string;
  lti?: boolean | string; warbond?: boolean | string; pledge_id?: string | number; pledge_name?: string; pledge_cost?: string; pledge_date?: string;
  entity_type?: string; unidentified?: boolean;
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

/** Convertit un export HangarXPLOR (JSON ou CSV) en vaisseaux possédés, en les reconnaissant dans le catalogue. */
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
    const label = hit ? hit.rsiName : base;
    const nick = r.ship_name && r.name && r.ship_name !== r.name && !(hit && (r.ship_name === hit.rsiName || r.ship_name === hit.name)) ? r.ship_name : null;
    if (!hit) unknown.push(base);
    ships.push({
      id: uid(), shipId: hit?.id ?? null, label, nickname: nick, lti: truthy(r.lti), warbond: truthy(r.warbond),
      pledgeName: r.pledge_name ?? null, pledgeCost: r.pledge_cost ?? null, pledgeDate: r.pledge_date ?? null, pledgeId: r.pledge_id != null ? String(r.pledge_id) : null,
      source: "hangarxplor", raw: r as Record<string, unknown>,
    });
  }
  return { ships, unknown, skipped };
}

export function addManual(ship: Ship): OwnedShip {
  return { id: uid(), shipId: ship.id, label: ship.rsiName, nickname: null, lti: false, warbond: false, pledgeName: null, pledgeCost: null, pledgeDate: null, pledgeId: null, source: "manual" };
}

/** Coût en dollars d'un pledge « $45.00 USD » → 45. */
export const costUsd = (s: string | null): number => { if (!s) return 0; const m = s.replace(/,/g, "").match(/([\d.]+)/); return m ? parseFloat(m[1]) : 0; };

/**
 * Accès aux données de la carte : API du wiki Star Citizen (miroir JSON de la
 * Starmap RSI), avec cache local 7 jours et repli sur les données embarquées.
 */
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri, loadStore, saveStore } from "../../lib/tauri";
import { SYSTEMS, JUMPS, OBJECTS, DESCRIPTIONS } from "./bundled";
import type { StarSystem, JumpPoint, CelestialObject, SystemDetail } from "./types";

const API = "https://api.star-citizen.wiki/api/v2";
const TTL = 7 * 24 * 3600 * 1000;

async function getJson<T>(url: string): Promise<T> {
  const f = isTauri ? tauriFetch : fetch;
  const res = await f(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

interface Cached<T> { at: number; data: T }
async function cached<T>(key: string, load: () => Promise<T>, fallback: T): Promise<{ data: T; source: "api" | "cache" | "bundled" }> {
  const c = await loadStore<Cached<T>>(key).catch(() => null);
  if (c && Date.now() - c.at < TTL) return { data: c.data, source: "cache" };
  try {
    const data = await load();
    await saveStore<Cached<T>>(key, { at: Date.now(), data }).catch(() => undefined);
    return { data, source: "api" };
  } catch {
    if (c) return { data: c.data, source: "cache" };
    return { data: fallback, source: "bundled" };
  }
}

/* ----- systèmes + sauts ----- */
interface ApiSystem {
  id: number; code: string; name: string; status: string; type: string;
  position: { x: number; y: number; z: number };
  aggregated: { size: number; population: number; economy: number; danger: number; stars: number; planets: number; moons: number; stations: number };
  affiliation: { code: string; color: string }[];
  jumppoints?: { id: number; size: string; entry: { system_id: number }; exit: { system_id: number } }[];
}

function toSystem(s: ApiSystem): StarSystem {
  const a = s.affiliation?.[0];
  return {
    id: s.id, code: s.code, name: s.name, x: s.position.x, y: s.position.y, z: s.position.z, status: s.status, type: s.type,
    aff: a?.code ?? "UNC", color: a?.color ?? "#f6851f",
    size: s.aggregated?.size ?? 0, pop: s.aggregated?.population ?? 0, eco: s.aggregated?.economy ?? 0, danger: s.aggregated?.danger ?? 0,
    stars: s.aggregated?.stars ?? 1, planets: s.aggregated?.planets ?? 0, moons: s.aggregated?.moons ?? 0, stations: s.aggregated?.stations ?? 0,
  };
}

export async function loadGalaxy(): Promise<{ systems: StarSystem[]; jumps: JumpPoint[]; source: string }> {
  const r = await cached<{ systems: StarSystem[]; jumps: JumpPoint[] }>("map-galaxy", async () => {
    const systems: StarSystem[] = [];
    const jumps = new Map<string, JumpPoint>();
    for (let page = 1; page <= 5; page++) {
      const res = await getJson<{ data: ApiSystem[]; meta: { last_page: number } }>(`${API}/starsystems?include=jumppoints&page[number]=${page}`);
      for (const s of res.data) {
        systems.push(toSystem(s));
        for (const j of s.jumppoints ?? []) {
          const a = j.entry.system_id, b = j.exit.system_id;
          const k = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (!jumps.has(k)) jumps.set(k, { id: j.id, size: (j.size as JumpPoint["size"]) ?? "M", from: a, to: b });
        }
      }
      if (page >= res.meta.last_page) break;
    }
    if (systems.length < 50) throw new Error("réponse incomplète");
    return { systems, jumps: [...jumps.values()] };
  }, { systems: SYSTEMS, jumps: JUMPS });
  return { ...r.data, source: r.source };
}

/* ----- détail d'un système ----- */
interface ApiObject {
  id: number; name: string | null; type: string; designation: string; parent_id: number | null; size: number | null;
  distance: number | null; longitude: number | null; latitude: number | null; appearance: string | null; habitable: boolean | null;
  orbit_period: number | null; sub_type: { name: string } | null; description?: { fr_FR?: string; en_EN?: string } | null;
}

export async function loadSystem(code: string): Promise<SystemDetail & { source: string }> {
  const bundled: SystemDetail = { code, description: DESCRIPTIONS[code] ?? "", objects: OBJECTS[code] ?? [] };
  const r = await cached<SystemDetail>(`map-sys-${code}`, async () => {
    const res = await getJson<{ data: { description?: { fr_FR?: string; en_EN?: string }; celestial_objects?: ApiObject[] } }>(`${API}/starsystems/${code}?include=celestialObjects`);
    const d = res.data;
    const objects: CelestialObject[] = (d.celestial_objects ?? []).map((o) => ({
      id: o.id, name: o.name, type: o.type, sub: o.sub_type?.name ?? null, des: o.designation, parent: o.parent_id, size: o.size,
      dist: o.distance, lon: o.longitude, lat: o.latitude, app: o.appearance, hab: o.habitable, period: o.orbit_period,
      description: o.description?.fr_FR || o.description?.en_EN || undefined,
    }));
    return { code, description: d.description?.fr_FR || d.description?.en_EN || bundled.description, objects };
  }, bundled);
  return { ...r.data, source: r.source };
}

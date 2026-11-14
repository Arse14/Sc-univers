/**
 * Images des objets : UEX fournit parfois une capture ; sinon on demande au
 * wiki Star Citizen (api.star-citizen.wiki), qui range les objets sous le même
 * identifiant que le jeu. Chaque réponse est gardée sur disque (« equip-images »)
 * pour ne la demander qu'une fois ; les requêtes sont limitées à 4 à la fois et
 * ne partent que lorsque la vignette entre à l'écran.
 */
import { useEffect, useRef, useState } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri, loadStore, saveStore } from "../../lib/tauri";
import { Pic } from "../../components/Pic";

export interface ItemPic { thumb: string; full: string }
interface Saved { at: number; map: Record<string, [string, string] | 0> }

const STORE = "equip-images";
const RETRY_EMPTY = 14 * 24 * 3600 * 1000;   // un objet sans image est redemandé au bout de 14 jours
const MAX = 6000;

let mem: Saved | null = null;
let loading: Promise<Saved> | null = null;
function store(): Promise<Saved> {
  if (mem) return Promise.resolve(mem);
  loading ??= loadStore<Saved>(STORE).catch(() => null).then((s) => {
    const v: Saved = s && typeof s.map === "object" && s.map ? s : { at: Date.now(), map: {} };
    if (Date.now() - v.at > RETRY_EMPTY) {
      for (const k of Object.keys(v.map)) if (v.map[k] === 0) delete v.map[k];
      v.at = Date.now();
    }
    mem = v;
    return v;
  });
  return loading;
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!mem) return;
    const keys = Object.keys(mem.map);
    if (keys.length > MAX) for (const k of keys.slice(0, keys.length - MAX)) delete mem.map[k];
    void saveStore(STORE, mem).catch(() => undefined);
  }, 1500);
}

/* file d'attente : 4 requêtes wiki au plus en même temps */
let running = 0;
const waiting: (() => void)[] = [];
function slot<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => { running++; job().then(resolve, reject).finally(() => { running--; waiting.shift()?.(); }); };
    if (running < 4) run(); else waiting.push(run);
  });
}

const inflight = new Map<string, Promise<ItemPic | null>>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function askWiki(uuid: string): Promise<ItemPic | null | "retry"> {
  const f = isTauri ? tauriFetch : fetch;
  let res: Response;
  try { res = await f(`https://api.star-citizen.wiki/api/v2/items/${uuid}`, { headers: { Accept: "application/json" } }); }
  catch { return "retry"; }
  if (res.status === 404) return null;
  if (!res.ok) return "retry";
  try {
    const j = await res.json();
    const imgs = Array.isArray(j?.data?.images) ? j.data.images : [];
    for (const im of imgs) {
      const full = typeof im?.original_url === "string" ? im.original_url : "";
      const thumb = typeof im?.thumbnail_url === "string" && im.thumbnail_url ? im.thumbnail_url : full;
      if (/^https:\/\//.test(thumb)) return { thumb, full: /^https:\/\//.test(full) ? full : thumb };
    }
    return null;
  } catch { return "retry"; }
}

/** Image d'un objet (null s'il n'en a pas). La capture UEX, quand elle existe, évite toute requête. */
export async function itemPic(item: { uuid: string; shot: string }): Promise<ItemPic | null> {
  if (item.shot) return { thumb: item.shot, full: item.shot };
  if (!UUID.test(item.uuid)) return null;
  const s = await store();
  const hit = s.map[item.uuid];
  if (hit === 0) return null;
  if (hit) return { thumb: hit[0], full: hit[1] };
  let p = inflight.get(item.uuid);
  if (!p) {
    p = slot(() => askWiki(item.uuid)).then((r) => {
      inflight.delete(item.uuid);
      if (r === "retry") return null;           // hors ligne : on redemandera
      s.map[item.uuid] = r ? [r.thumb, r.full] : 0;
      saveSoon();
      return r;
    });
    inflight.set(item.uuid, p);
  }
  return p;
}

/** Image d'un objet, chargée quand le bloc devient visible. */
export function useItemPic(item: { uuid: string; shot: string } | null, visible = true): ItemPic | null | undefined {
  const [pic, setPic] = useState<ItemPic | null | undefined>(undefined);
  const key = item ? item.uuid + "|" + item.shot : "";
  useEffect(() => {
    setPic(undefined);
    if (!item || !visible) return;
    let alive = true;
    itemPic(item).then((r) => { if (alive) setPic(r); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, visible]);
  return pic;
}

/** Vignette carrée d'une ligne de liste : ne demande l'image qu'une fois à l'écran. */
export function ItemThumb({ item, size = 44 }: { item: { uuid: string; shot: string; name: string }; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  const pic = useItemPic(item, seen);
  return (
    <span ref={ref} className="eq-thumb" style={{ width: size, height: size }}>
      <Pic src={pic?.thumb ?? null} alt="" ratio="1 / 1" fit="contain" className={pic === undefined ? "eq-wait" : undefined} style={{ width: size, height: size, minHeight: 0 }} />
    </span>
  );
}

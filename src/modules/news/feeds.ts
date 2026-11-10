/**
 * Sources d'actualité officielles Star Citizen.
 *
 * Tout est lu via des flux publics (RSS / Atom / JSON), sans clé :
 *  - Comm-Link RSI (site officiel), via l'API du wiki Star Citizen qui les
 *    agrège en JSON, avec repli sur le flux RSS du site.
 *  - Chaîne YouTube Star Citizen (flux Atom public de YouTube).
 *  - État des serveurs RSI (flux RSS de la page de statut).
 *
 * Les URLs marquées « à confirmer » doivent être validées au premier
 * lancement réel ; une source en erreur n'empêche pas les autres.
 */
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "../../lib/tauri";

export type SourceId = "commlink" | "youtube" | "status";

export interface NewsItem {
  id: string;
  source: SourceId;
  title: string;
  url: string;
  date: string | null;   // ISO
  summary?: string;
  image?: string;
  kind?: string;         // catégorie Comm-Link, type de vidéo…
}

export interface SourceDef {
  id: SourceId;
  label: string;
  short: string;
  urls: string[];        // essayées dans l'ordre
  parse: (text: string, url: string) => NewsItem[];
}

/** Identifiant de la chaîne YouTube « Star Citizen » — à confirmer au premier lancement. */
export const YOUTUBE_CHANNEL_ID = "UCTeLqJq1mXUX5WWoNXLmOIA";

async function getText(url: string): Promise<string> {
  const f = isTauri ? tauriFetch : fetch;
  const res = await f(url, { method: "GET", headers: { Accept: "application/json, application/rss+xml, application/atom+xml, text/xml, */*" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("flux XML illisible");
  return doc;
}

function txt(el: Element | null | undefined, sel: string): string {
  return el?.querySelector(sel)?.textContent?.trim() ?? "";
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** RSS 2.0 générique → items. */
function parseRss(text: string, source: SourceId): NewsItem[] {
  const doc = parseXml(text);
  return Array.from(doc.querySelectorAll("item")).map((it, i) => {
    const link = txt(it, "link") || it.querySelector("guid")?.textContent?.trim() || "";
    const date = txt(it, "pubDate") || txt(it, "dc\\:date");
    const desc = txt(it, "description");
    const enclosure = it.querySelector("enclosure")?.getAttribute("url") ?? undefined;
    return {
      id: `${source}:${link || i}`,
      source,
      title: txt(it, "title"),
      url: link,
      date: date ? new Date(date).toISOString() : null,
      summary: strip(desc).slice(0, 240),
      image: enclosure,
      kind: txt(it, "category") || undefined,
    };
  });
}

/** Atom (YouTube) → items. */
function parseAtom(text: string, source: SourceId): NewsItem[] {
  const doc = parseXml(text);
  return Array.from(doc.getElementsByTagName("entry")).map((en, i) => {
    const link = en.getElementsByTagName("link")[0]?.getAttribute("href") ?? "";
    const published = en.getElementsByTagName("published")[0]?.textContent?.trim();
    const thumb = en.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ?? undefined;
    const desc = en.getElementsByTagName("media:description")[0]?.textContent?.trim() ?? "";
    return {
      id: `${source}:${link || i}`,
      source,
      title: en.getElementsByTagName("title")[0]?.textContent?.trim() ?? "",
      url: link,
      date: published ? new Date(published).toISOString() : null,
      summary: desc.slice(0, 240),
      image: thumb,
      kind: "Vidéo",
    };
  });
}

/** API wiki Star Citizen (JSON) → Comm-Links. Forme attendue : { data: [{ id, title, url, created_at, channel, category, images… }] } */
function parseWikiCommLinks(text: string): NewsItem[] {
  const json = JSON.parse(text) as { data?: Record<string, unknown>[] };
  const data = Array.isArray(json.data) ? json.data : [];
  return data.map((d, i) => {
    const id = String(d.id ?? i);
    const url = typeof d.url === "string" && d.url ? (d.url.startsWith("http") ? d.url : `https://robertsspaceindustries.com${d.url}`) : `https://robertsspaceindustries.com/comm-link/${id}`;
    const date = (d.created_at ?? d.published_at ?? d.date) as string | undefined;
    const images = d.images as { rsi_url?: string; url?: string }[] | undefined;
    const img = images?.[0]?.rsi_url ?? images?.[0]?.url;
    return {
      id: `commlink:${id}`,
      source: "commlink",
      title: String(d.title ?? ""),
      url,
      date: date ? new Date(date).toISOString() : null,
      summary: typeof d.summary === "string" ? d.summary.slice(0, 240) : undefined,
      image: img,
      // l'API renvoie parfois des objets ({ name }) ou des chaînes ; on ne garde que du texte propre
      kind: [d.channel, d.category].map((v) => (typeof v === "string" ? v : (v as { name?: string } | null)?.name ?? "")).filter((v) => v && v !== "undefined").join(" · ") || undefined,
    };
  });
}

export const SOURCES: SourceDef[] = [
  {
    id: "commlink",
    label: "Comm-Link RSI",
    short: "COMM-LINK",
    urls: [
      "https://api.star-citizen.wiki/api/v2/comm-links?limit=25",
      "https://robertsspaceindustries.com/comm-link/rss", // à confirmer
    ],
    parse: (t, url) => (url.includes("star-citizen.wiki") ? parseWikiCommLinks(t) : parseRss(t, "commlink")),
  },
  {
    id: "youtube",
    label: "YouTube Star Citizen",
    short: "YOUTUBE",
    urls: [`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`],
    parse: (t) => parseAtom(t, "youtube"),
  },
  {
    id: "status",
    label: "État des serveurs",
    short: "STATUT",
    urls: ["https://status.robertsspaceindustries.com/index.xml"], // à confirmer
    parse: (t) => parseRss(t, "status"),
  },
];

export interface SourceResult {
  source: SourceId;
  items: NewsItem[];
  error: string | null;
  fetchedAt: string;
}

/** Charge une source en essayant ses URLs dans l'ordre. */
export async function loadSource(def: SourceDef): Promise<SourceResult> {
  let lastErr = "";
  for (const url of def.urls) {
    try {
      const text = await getText(url);
      const items = def.parse(text, url).filter((it) => it.title && it.url);
      items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      return { source: def.id, items, error: null, fetchedAt: new Date().toISOString() };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { source: def.id, items: [], error: lastErr || "aucune URL", fetchedAt: new Date().toISOString() };
}

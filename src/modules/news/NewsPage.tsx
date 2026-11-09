import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PageHeader, SectionHead, Note } from "../../components/Hud";
import { isTauri, loadStore, saveStore } from "../../lib/tauri";
import { SOURCES, loadSource, type NewsItem, type SourceId, type SourceResult } from "./feeds";

const CACHE_KEY = "news-cache";
const CACHE_TTL_MS = 15 * 60 * 1000;

interface Cache { at: string; results: SourceResult[] }

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 36e5;
  if (diff < 1) return "il y a moins d'une heure";
  if (diff < 24) return `il y a ${Math.round(diff)} h`;
  if (diff < 24 * 7) return `il y a ${Math.round(diff / 24)} j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

async function open(url: string) {
  if (isTauri) await openUrl(url);
  else window.open(url, "_blank", "noopener");
}

export function NewsPage() {
  const [results, setResults] = useState<SourceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | SourceId>("all");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const cache = await loadStore<Cache>(CACHE_KEY);
        if (cache && Date.now() - new Date(cache.at).getTime() < CACHE_TTL_MS) {
          setResults(cache.results); setUpdatedAt(cache.at); setLoading(false); return;
        }
      }
      const res = await Promise.all(SOURCES.map(loadSource));
      const at = new Date().toISOString();
      setResults(res); setUpdatedAt(at);
      await saveStore<Cache>(CACHE_KEY, { at, results: res });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh().catch(() => setLoading(false)); }, []);

  const items: NewsItem[] = results
    .flatMap((r) => r.items)
    .filter((it) => filter === "all" || it.source === filter)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 60);
  const errors = results.filter((r) => r.error);

  return (
    <>
      <PageHeader
        crumb="ACTUALITÉ"
        title="Actualité"
        sub={<>SOURCES OFFICIELLES ▸ Comm-Link RSI · YouTube Star Citizen · Statut des serveurs{updatedAt && <> &nbsp;·&nbsp; MIS À JOUR {when(updatedAt).toUpperCase()}</>}</>}
        actions={<button type="button" className="btn" onClick={() => refresh(true)} disabled={loading}>{loading ? "Chargement…" : "Actualiser"}</button>}
      />

      {!isTauri && <Note tag="⚠ NAVIGATEUR">Hors de l'application, les flux sont bloqués par le navigateur (CORS). Lance <span className="mono">npm run tauri:dev</span>.</Note>}
      {errors.map((r) => (
        <Note key={r.source} tag={`⚠ ${SOURCES.find((s) => s.id === r.source)?.short}`}>Source indisponible : {r.error}</Note>
      ))}

      <SectionHead n="01" title="FLUX" />
      <div role="group" aria-label="Filtrer par source" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className={"tab" + (filter === "all" ? " active" : "")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Tout</button>
        {SOURCES.map((s) => {
          const n = results.find((r) => r.source === s.id)?.items.length ?? 0;
          return <button key={s.id} type="button" className={"tab" + (filter === s.id ? " active" : "")} aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>{s.label} {n ? `(${n})` : ""}</button>;
        })}
      </div>

      {items.length === 0 ? (
        <div className="panel empty">{loading ? "Chargement des flux…" : "Aucune actualité à afficher."}</div>
      ) : (
        <>
          {/* À la une : la plus récente avec image, puis une bande de vignettes */}
          {(() => {
            const hero = items.find((i) => i.image) ?? items[0];
            const rest = items.filter((i) => i.id !== hero.id);
            return (
              <>
                <button type="button" className="hero" onClick={() => open(hero.url)}>
                  {hero.image && <img src={hero.image} alt="" />}
                  <div className="hero-body">
                    <div className="hero-kicker">{SOURCES.find((s) => s.id === hero.source)?.short}{hero.kind ? ` · ${hero.kind.toUpperCase()}` : ""} · {when(hero.date).toUpperCase()}</div>
                    <div className="hero-title">{hero.title}</div>
                    {hero.summary && <div className="hero-sub">{hero.summary}</div>}
                    <span className="btn primary hero-cta">▸ Lire sur le site officiel</span>
                  </div>
                </button>
                <div className="strip" aria-label="Autres actualités">
                  {rest.slice(0, 6).map((it) => (
                    <button key={it.id} type="button" className="strip-item" onClick={() => open(it.url)}>
                      {it.image ? <img src={it.image} alt="" loading="lazy" /> : <span style={{ width: 64, height: 48, background: "rgba(79,179,255,.12)" }} />}
                      <span><span className="s">{SOURCES.find((s) => s.id === it.source)?.short}</span><br /><span className="t">{it.title}</span></span>
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
          <SectionHead n="02" title="TOUTES LES ACTUALITÉS" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {items.map((it) => {
            const src = SOURCES.find((s) => s.id === it.source)!;
            return (
              <button key={it.id} type="button" className="panel small" style={{ padding: 0, textAlign: "left", color: "inherit", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={() => open(it.url)}>
                {it.image && <img src={it.image} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block", filter: "saturate(.85)" }} loading="lazy" />}
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: it.source === "status" ? "var(--green)" : it.source === "youtube" ? "var(--amber)" : "var(--cyan)" }}>{src.short}{it.kind ? ` · ${it.kind.toUpperCase()}` : ""}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>{when(it.date)}</span>
                  </div>
                  <div className="display" style={{ fontSize: 17, lineHeight: 1.25, color: "var(--text-bright)" }}>{it.title}</div>
                  {it.summary && <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{it.summary}</div>}
                </div>
              </button>
            );
          })}
        </div>
        </>
      )}
      <div className="hint">Les liens s'ouvrent dans ton navigateur. Contenu © Cloud Imperium Games, affiché depuis les flux publics officiels.</div>
    </>
  );
}

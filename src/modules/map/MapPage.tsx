import { useEffect, useMemo, useState } from "react";
import { PageHeader, Note } from "../../components/Hud";
import { loadStore } from "../../lib/tauri";
import type { AppSettings } from "../settings/SettingsPage";
import { loadGalaxy, loadSystem } from "./data";
import { AFFILIATIONS, PLAYABLE, TYPE_LABEL, type StarSystem, type JumpPoint, type CelestialObject } from "./types";
import { GalaxyView } from "./three/GalaxyView";
import { SystemView } from "./three/SystemView";

const nf = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const gauge = (v: number) => `${"■".repeat(Math.round(v))}${"□".repeat(10 - Math.round(v))}`;

export function MapPage() {
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [jumps, setJumps] = useState<JumpPoint[]>([]);
  const [source, setSource] = useState<string>("");
  const [sel, setSel] = useState<StarSystem | null>(null);
  const [hover, setHover] = useState<StarSystem | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showJumps, setShowJumps] = useState(true);
  const [fly, setFly] = useState(0);
  const [q, setQ] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);
  // vue système
  const [inSystem, setInSystem] = useState<StarSystem | null>(null);
  const [objects, setObjects] = useState<CelestialObject[]>([]);
  const [desc, setDesc] = useState("");
  const [objSel, setObjSel] = useState<CelestialObject | null>(null);
  const [objHover, setObjHover] = useState<CelestialObject | null>(null);
  const [objFly, setObjFly] = useState(0);
  const [loadingSys, setLoadingSys] = useState(false);

  useEffect(() => {
    loadGalaxy().then((g) => { setSystems(g.systems); setJumps(g.jumps); setSource(g.source); const st = g.systems.find((s) => s.code === "STANTON"); if (st) setSel(st); }).catch(() => undefined);
    loadStore<AppSettings>("settings").then((v) => { if (v && typeof v.autoRotate === "boolean") setAutoRotate(v.autoRotate); }).catch(() => undefined);
  }, []);

  const byId = useMemo(() => new Map(systems.map((s) => [s.id, s])), [systems]);
  const neighbours = useMemo(() => {
    if (!sel) return [];
    return jumps.filter((j) => j.from === sel.id || j.to === sel.id).map((j) => ({ j, s: byId.get(j.from === sel.id ? j.to : j.from)! })).filter((x) => x.s).sort((a, b) => a.s.name.localeCompare(b.s.name));
  }, [sel, jumps, byId]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t) return [];
    return systems.filter((s) => s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t)).slice(0, 8);
  }, [q, systems]);

  const enter = async (s: StarSystem) => {
    setLoadingSys(true); setInSystem(s); setObjSel(null); setObjects([]);
    try { const d = await loadSystem(s.code); setObjects(d.objects); setDesc(d.description); }
    finally { setLoadingSys(false); }
  };
  const leave = () => { setInSystem(null); setObjSel(null); setFly((n) => n + 1); };
  const pickSystem = (s: StarSystem) => { setSel(s); setFly((n) => n + 1); setQ(""); };
  const toggleAff = (code: string) => setHidden((h) => { const n = new Set(h); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  const affList = Object.keys(AFFILIATIONS);
  const shown = hover ?? sel;
  const star = objects.find((o) => o.type === "STAR");
  const counts = useMemo(() => ({
    planets: objects.filter((o) => o.type === "PLANET").length,
    moons: objects.filter((o) => o.type === "SATELLITE").length,
    stations: objects.filter((o) => o.type === "MANMADE").length,
    jumps: objects.filter((o) => o.type === "JUMPPOINT").length,
  }), [objects]);
  const children = (o: CelestialObject) => objects.filter((k) => k.parent === o.id);
  const parentOf = (o: CelestialObject) => (o.parent !== null ? objects.find((k) => k.id === o.parent) : undefined);
  const objShown = objHover ?? objSel;

  return (
    <>
      <PageHeader crumb={inSystem ? `UNIVERS ▸ CARTE ▸ ${inSystem.name.toUpperCase()}` : "UNIVERS ▸ CARTE"} title={inSystem ? `Système ${inSystem.name}` : "Carte stellaire"}
        sub={inSystem ? <>{star?.sub ?? inSystem.type} · {counts.planets} PLANÈTES · {counts.moons} LUNES · {counts.stations} STATIONS · {counts.jumps} POINTS DE SAUT</> : <>{systems.length} SYSTÈMES · {jumps.length} ROUTES DE SAUT{source && <> · SOURCE {source === "api" ? "STARMAP (EN LIGNE)" : source === "cache" ? "CACHE LOCAL" : "DONNÉES EMBARQUÉES"}</>}</>}
        actions={inSystem
          ? <button type="button" className="btn" onClick={leave}>◂ Retour à la galaxie</button>
          : <>
            <button type="button" className={"tab" + (showJumps ? " active" : "")} style={{ minHeight: 40 }} aria-pressed={showJumps} onClick={() => setShowJumps((v) => !v)}>Routes de saut</button>
            {sel && <button type="button" className="btn primary" onClick={() => enter(sel)}>Entrer dans {sel.name} ▸</button>}
          </>}
      />

      <section className="map-layout">
        <div className="panel map-stage">
          {inSystem
            ? (objects.length > 0
              ? <SystemView system={inSystem} objects={objects} selected={objSel?.id ?? null} onHover={setObjHover} onSelect={(o) => { setObjSel(o); setObjFly((n) => n + 1); }} flyRequest={objFly} autoRotate={autoRotate} />
              : <div className="map-canvas map-loading">{loadingSys ? "Chargement du système…" : "Aucune donnée pour ce système."}</div>)
            : systems.length > 0
              ? <GalaxyView systems={systems} jumps={jumps} selected={sel?.code ?? null} hidden={hidden} showJumps={showJumps} onHover={setHover} onSelect={setSel} onEnter={enter} flyRequest={fly} />
              : <div className="map-canvas map-loading">Chargement de la carte…</div>}

          {/* surcouche HUD */}
          {!inSystem && (
            <div className="map-hud">
              <div className="map-search">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un système…" aria-label="Rechercher un système" />
                {results.length > 0 && (
                  <div className="map-results">
                    {results.map((s) => <button key={s.id} type="button" onClick={() => pickSystem(s)}><span style={{ color: s.color }}>●</span> {s.name} <span className="mono" style={{ color: "var(--dim)", fontSize: 10 }}>{AFFILIATIONS[s.aff]?.short ?? s.aff}</span></button>)}
                  </div>
                )}
              </div>
              <div className="map-legend" role="group" aria-label="Affiliations">
                {affList.map((a) => {
                  const col = systems.find((s) => s.aff === a)?.color ?? "#888";
                  const off = hidden.has(a);
                  return <button key={a} type="button" className={"map-chip" + (off ? " off" : "")} aria-pressed={!off} onClick={() => toggleAff(a)} title={AFFILIATIONS[a].label}><i style={{ background: col }} />{AFFILIATIONS[a].short}</button>;
                })}
              </div>
              <div className="map-help mono">GLISSER ▸ ORBITER · MOLETTE ▸ ZOOM · CLIC ▸ SÉLECTION · DOUBLE-CLIC ▸ ENTRER</div>
            </div>
          )}
          {inSystem && <div className="map-hud"><div className="map-help mono">GLISSER ▸ ORBITER · MOLETTE ▸ ZOOM · CLIC SUR UN ASTRE ▸ ZOOM ET FICHE</div></div>}
        </div>

        {/* panneau latéral */}
        <aside className="panel map-side">
          {!inSystem && shown && (
            <>
              <div className="label">// {hover && hover.code !== sel?.code ? "SURVOL" : "SYSTÈME SÉLECTIONNÉ"}</div>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: shown.color }}>{AFFILIATIONS[shown.aff]?.label.toUpperCase() ?? shown.aff}{PLAYABLE.has(shown.code) && <span style={{ color: "var(--green)" }}> · JOUABLE</span>}</div>
                <div className="display" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--text-bright)", marginTop: 6 }}>{shown.name}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{shown.type.replace("_", " ")} · {shown.stars} ÉTOILE{shown.stars > 1 ? "S" : ""} · POSITION {nf(shown.x, 1)} / {nf(shown.y, 1)} / {nf(shown.z, 1)}</div>
              </div>
              <div className="map-stats">
                <div><span className="label">PLANÈTES</span><b>{shown.planets}</b></div>
                <div><span className="label">LUNES</span><b>{shown.moons}</b></div>
                <div><span className="label">STATIONS</span><b>{shown.stations}</b></div>
                <div><span className="label">TAILLE</span><b>{nf(shown.size, 1)} <small>UA</small></b></div>
              </div>
              <div className="map-gauges mono">
                <div><span>POPULATION</span><span className="g">{gauge(shown.pop)}</span><span>{nf(shown.pop, 1)}</span></div>
                <div><span>ÉCONOMIE</span><span className="g">{gauge(shown.eco)}</span><span>{nf(shown.eco, 1)}</span></div>
                <div><span>DANGER</span><span className="g" style={{ color: shown.danger > 5 ? "var(--amber)" : undefined }}>{gauge(shown.danger)}</span><span>{nf(shown.danger, 1)}</span></div>
              </div>
              {shown.code === sel?.code && neighbours.length > 0 && (
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>ROUTES DE SAUT ({neighbours.length})</div>
                  <div className="sublist">
                    {neighbours.map(({ j, s }) => (
                      <button key={j.id} type="button" className="it map-route" onClick={() => pickSystem(s)} style={{ gridTemplateColumns: "28px minmax(0,1fr) auto" }}>
                        <span className="mono" style={{ color: j.size === "L" ? "var(--cyan)" : j.size === "M" ? "var(--text)" : "var(--dim)" }}>{j.size}</span>
                        <span><span style={{ color: s.color }}>● </span>{s.name}</span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>{AFFILIATIONS[s.aff]?.short ?? s.aff}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {shown.code === sel?.code && (
                <button type="button" className="btn primary" style={{ alignSelf: "flex-start" }} onClick={() => enter(shown)}>Entrer dans le système ▸</button>
              )}
              {!PLAYABLE.has(shown.code) && <div className="hint" style={{ margin: 0 }}>Système du lore, pas encore accessible en jeu. Les données viennent de la Starmap officielle.</div>}
            </>
          )}

          {inSystem && (
            <>
              {objShown ? (
                <>
                  <div className="label">// {objHover && objHover.id !== objSel?.id ? "SURVOL" : "ASTRE SÉLECTIONNÉ"}</div>
                  <div>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: objShown.type === "JUMPPOINT" ? "var(--amber)" : objShown.type === "MANMADE" ? "var(--cyan)" : "var(--rsi)" }}>{(TYPE_LABEL[objShown.type] ?? objShown.type).toUpperCase()}{objShown.sub ? ` · ${objShown.sub.toUpperCase()}` : ""}</div>
                    <div className="display" style={{ fontSize: 26, lineHeight: 1.1, color: "var(--text-bright)", marginTop: 6 }}>{objShown.name ?? objShown.des}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{objShown.des}{parentOf(objShown) ? ` · ORBITE ${(parentOf(objShown)!.name ?? parentOf(objShown)!.des).toUpperCase()}` : ""}</div>
                  </div>
                  <div className="map-stats">
                    {objShown.type === "PLANET" && objShown.size ? <div><span className="label">DIAMÈTRE</span><b>{nf(objShown.size)} <small>km</small></b></div> : null}
                    {objShown.dist ? <div><span className="label">DISTANCE</span><b>{nf(objShown.dist, 2)} <small>UA</small></b></div> : null}
                    {objShown.period ? <div><span className="label">PÉRIODE</span><b>{nf(objShown.period)} <small>j</small></b></div> : null}
                    {objShown.hab !== null && objShown.hab !== undefined ? <div><span className="label">HABITABLE</span><b style={{ color: objShown.hab ? "var(--green)" : "var(--dim)" }}>{objShown.hab ? "Oui" : "Non"}</b></div> : null}
                  </div>
                  {objShown.description && <div style={{ lineHeight: 1.55, color: "var(--text)" }}>{objShown.description}</div>}
                  {children(objShown).length > 0 && (
                    <div>
                      <div className="label" style={{ marginBottom: 8 }}>EN ORBITE ({children(objShown).length})</div>
                      <div className="sublist">
                        {children(objShown).map((k) => (
                          <button key={k.id} type="button" className="it map-route" onClick={() => { setObjSel(k); setObjFly((n) => n + 1); }} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                            <span>{k.name ?? k.des}</span><span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>{(TYPE_LABEL[k.type] ?? k.type).toUpperCase()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {objShown.type === "JUMPPOINT" && (() => { const dest = systems.find((s) => s.name === (objShown.des.split(" - ")[1] ?? "")); return dest ? <button type="button" className="btn" onClick={() => { setSel(dest); enter(dest); }}>Sauter vers {dest.name} ▸</button> : null; })()}
                </>
              ) : (
                <>
                  <div className="label">// SYSTÈME</div>
                  <div>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: inSystem.color }}>{AFFILIATIONS[inSystem.aff]?.label.toUpperCase() ?? inSystem.aff}</div>
                    <div className="display" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--text-bright)", marginTop: 6 }}>{inSystem.name}</div>
                  </div>
                  {desc && <div style={{ lineHeight: 1.55 }}>{desc}</div>}
                  <div>
                    <div className="label" style={{ marginBottom: 8 }}>ASTRES</div>
                    <div className="sublist">
                      {objects.filter((o) => o.type === "PLANET" || o.type === "MANMADE" && (o.parent === star?.id || o.parent === null)).map((o) => (
                        <button key={o.id} type="button" className="it map-route" onClick={() => { setObjSel(o); setObjFly((n) => n + 1); }} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                          <span>{o.name ?? o.des}</span><span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>{o.sub?.toUpperCase() ?? (TYPE_LABEL[o.type] ?? o.type).toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hint" style={{ margin: 0 }}>Clique sur un astre pour zoomer. Les points de saut (losanges ambre) mènent aux systèmes voisins.</div>
                </>
              )}
            </>
          )}
          {!inSystem && !shown && <div className="hint">Survole ou clique un système.</div>}
        </aside>
      </section>

      <Note tag="ⓘ" info>Positions, affiliations et objets célestes : Starmap officielle RSI via l'API du wiki Star Citizen. Le rendu des astres est stylisé, pas celui du jeu. Systèmes jouables : Stanton, Pyro, Nyx.</Note>
    </>
  );
}

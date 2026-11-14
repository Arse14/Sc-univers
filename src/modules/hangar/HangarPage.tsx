import { useEffect, useMemo, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { Pic } from "../../components/Pic";
import { SHIPS as ART } from "../../lib/images";
import { isTauri, loadStore, pickFile, readTextFile } from "../../lib/tauri";
import type { AppSettings } from "../settings/defaults";
import { GROUP_FR, loadCatalog, loadFrenchDescription, loadShipDetail, loadShipFittings, type Fitting, type Ship, type ShipDetail, type ShipFittings } from "./catalog";
import { ACQUIRED_FR, INSURANCE_FR, activeFleet, addShip, costUsd, emptyHangar, exportFleet, importHangarXplor, loadHangar, newFleet, parseFleetFile, saveHangar, updateFleet, type Acquired, type Hangar, type Insurance, type OwnedShip } from "./hangar";
import { ShipViewer } from "./ShipViewer";

const nf = (n: number | null | undefined, d = 0) => (n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: d }));
const unit = (n: number | null | undefined, u: string, d = 0) => (n == null ? "—" : `${nf(n, d)} ${u}`);
const STATUS: Record<string, { label: string; color: string }> = {
  "flight-ready": { label: "EN JEU", color: "var(--green)" },
  "in-production": { label: "EN PRODUCTION", color: "var(--amber)" },
  "in-concept": { label: "CONCEPT", color: "var(--dim)" },
};
const SIZES = ["vehicle", "snub", "small", "medium", "large", "capital"];
const SIZE_FR: Record<string, string> = { vehicle: "Véhicule", snub: "Snub", small: "Petit", medium: "Moyen", large: "Grand", extra_large: "Très grand", capital: "Capital" };
const PAGE_SIZE = 60;

async function open(url: string) { if (isTauri) await openUrl(url); else window.open(url, "_blank", "noopener"); }
function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

type Tab = "specs" | "fit" | "buy";

export function HangarPage() {
  const [catalog, setCatalog] = useState<Ship[]>([]);
  const [catSource, setCatSource] = useState("");
  const [loadingCat, setLoadingCat] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hangar, setHangar] = useState<Hangar>(emptyHangar);
  const [sel, setSel] = useState<Ship | null>(null);
  const [detail, setDetail] = useState<ShipDetail | null | "loading">(null);
  const [fit, setFit] = useState<ShipFittings | null | "loading" | "none">(null);
  const [descFr, setDescFr] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("specs");
  const [editing, setEditing] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState("");
  const [size, setSize] = useState("");
  const [onlyGame, setOnlyGame] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [autoRotate, setAutoRotate] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const refreshCatalog = (force: boolean) => {
    setLoadingCat(true); setProgress(0);
    loadCatalog(force, setProgress).then((r) => { setCatalog(r.ships); setCatSource(r.source); }).finally(() => setLoadingCat(false));
  };
  useEffect(() => {
    loadHangar().then(setHangar).catch(() => undefined);
    loadStore<AppSettings>("settings").then((v) => { if (v && typeof v.autoRotate === "boolean") setAutoRotate(v.autoRotate); }).catch(() => undefined);
    refreshCatalog(false);
  }, []);

  const byId = useMemo(() => new Map(catalog.map((s) => [s.id, s])), [catalog]);
  const persist = async (h: Hangar) => { setHangar(h); await saveHangar(h).catch(() => undefined); };
  const fleet = activeFleet(hangar);
  const owned = fleet.ships;
  const ownedIds = useMemo(() => new Set(hangar.fleets.flatMap((f) => f.ships.map((s) => s.shipId))), [hangar]);

  // ----- fiche -----
  const select = (s: Ship | null) => {
    setSel(s); setTab("specs"); setDetail(s ? "loading" : null); setFit(null); setDescFr(undefined);
    if (!s) return;
    loadShipDetail(s.slug).then((d) => setDetail((cur) => (cur === "loading" ? d : cur)));
    loadFrenchDescription(s.rsiName).then(setDescFr);
    requestAnimationFrame(() => sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  useEffect(() => {
    if (!sel || tab !== "fit" || fit !== null) return;
    setFit("loading");
    const slug = sel.slug;
    loadShipFittings(slug).then((f) => setFit(f && f.slug === slug ? f : "none"));
  }, [sel, tab, fit]);

  // ----- flottes -----
  const addToFleet = (s: Ship, how: Acquired = "ingame") => {
    persist(updateFleet(hangar, fleet.id, (f) => ({ ...f, ships: [...f.ships, addShip(s, how)] })));
    setMsg({ kind: "ok", text: `${s.rsiName} ajouté à « ${fleet.name} ».` });
  };
  const patchShip = (id: string, patch: Partial<OwnedShip>) => persist(updateFleet(hangar, fleet.id, (f) => ({ ...f, ships: f.ships.map((o) => (o.id === id ? { ...o, ...patch } : o)) })));
  const removeShip = (id: string) => persist(updateFleet(hangar, fleet.id, (f) => ({ ...f, ships: f.ships.filter((o) => o.id !== id) })));
  const moveShip = (id: string, to: string) => {
    const ship = owned.find((o) => o.id === id); if (!ship || to === fleet.id) return;
    persist({ ...hangar, fleets: hangar.fleets.map((f) => f.id === fleet.id ? { ...f, ships: f.ships.filter((o) => o.id !== id) } : f.id === to ? { ...f, ships: [...f.ships, ship] } : f) });
    setEditing(null);
  };
  const createFleet = () => { const f = newFleet(`Flotte ${hangar.fleets.length + 1}`); persist({ ...hangar, fleets: [...hangar.fleets, f], active: f.id }); setRenaming(true); };
  const deleteFleet = () => {
    if (hangar.fleets.length <= 1) return;
    const fleets = hangar.fleets.filter((f) => f.id !== fleet.id);
    persist({ ...hangar, fleets, active: fleets[0].id }); setConfirmDelete(false);
  };

  // ----- import / export -----
  const readPicked = async (name: string, ext: string[]): Promise<string | null> => {
    if (isTauri) { const p = await pickFile([{ name, extensions: ext }]); return p ? readTextFile(p) : null; }
    return window.prompt("Colle ici le contenu du fichier (hors application, pas de sélecteur de fichier).") ?? null;
  };
  const importXplor = async () => {
    setMsg(null);
    try {
      const text = await readPicked("Export HangarXPLOR", ["json", "csv"]); if (!text) return;
      const r = importHangarXplor(text, catalog);
      if (r.ships.length === 0) { setMsg({ kind: "warn", text: "Aucun vaisseau trouvé dans ce fichier (attendu : shiplist.json ou shiplist.csv de HangarXPLOR)." }); return; }
      await persist({ ...updateFleet(hangar, fleet.id, (f) => ({ ...f, ships: [...r.ships, ...f.ships.filter((s) => s.source === "manual")] })), importedAt: new Date().toISOString() });
      setMsg({ kind: r.unknown.length ? "warn" : "ok", text: `${r.ships.length} vaisseau(x) importé(s) dans « ${fleet.name} »${r.skipped ? `, ${r.skipped} élément(s) ignoré(s)` : ""}${r.unknown.length ? `. Non reconnus : ${r.unknown.join(", ")}` : "."}` });
    } catch (e) { setMsg({ kind: "warn", text: `Fichier illisible : ${e}` }); }
  };
  const importFleetFile = async () => {
    setMsg(null);
    try {
      const text = await readPicked("Flotte SC-Univers", ["json"]); if (!text) return;
      const f = parseFleetFile(text);
      if (!f) { setMsg({ kind: "warn", text: "Ce fichier n'est pas une flotte enregistrée par SC-Univers." }); return; }
      await persist({ ...hangar, fleets: [...hangar.fleets, f], active: f.id });
      setMsg({ kind: "ok", text: `Flotte « ${f.name} » restaurée (${f.ships.length} vaisseaux).` });
    } catch (e) { setMsg({ kind: "warn", text: `Fichier illisible : ${e}` }); }
  };

  // ----- dérivés -----
  const totals = useMemo(() => {
    const ships = owned.map((o) => (o.shipId ? byId.get(o.shipId) : undefined));
    return {
      n: owned.length,
      usd: owned.reduce((a, o) => a + costUsd(o.pledgeCost), 0),
      auec: owned.reduce((a, o) => a + (o.paidAuec ?? 0), 0),
      cargo: ships.reduce((a, s) => a + (s?.cargo ?? 0), 0),
      crew: ships.reduce((a, s) => a + (s?.crewMax ?? 0), 0),
      inGame: ships.filter((s) => s?.inGame).length,
    };
  }, [owned, byId]);
  const mfrs = useMemo(() => [...new Set(catalog.map((s) => s.mfr))].filter(Boolean).sort(), [catalog]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return catalog.filter((s) => (!onlyGame || s.inGame) && (!mfr || s.mfr === mfr) && (!size || s.size === size) && (!t || s.rsiName.toLowerCase().includes(t) || s.mfr.toLowerCase().includes(t) || s.foci.some((f) => f.toLowerCase().includes(t))));
  }, [catalog, q, mfr, size, onlyGame]);
  useEffect(() => { setLimit(PAGE_SIZE); }, [q, mfr, size, onlyGame]);

  const stat = STATUS[sel?.status ?? ""] ?? { label: (sel?.status ?? "").toUpperCase(), color: "var(--dim)" };
  const d = detail && detail !== "loading" ? detail : null;
  const crew = (s: Ship) => `${s.crewMin ?? "?"}${s.crewMax && s.crewMax !== s.crewMin ? `–${s.crewMax}` : ""}`;

  return (
    <>
      <PageHeader crumb="UNIVERS ▸ HANGAR" title="Hangar"
        sub={<>{hangar.fleets.length} FLOTTE{hangar.fleets.length > 1 ? "S" : ""} · {hangar.fleets.reduce((a, f) => a + f.ships.length, 0)} VAISSEAUX &nbsp;·&nbsp; CATALOGUE {loadingCat ? `CHARGEMENT ${progress || ""}…` : `${catalog.length} MODÈLES`}{!loadingCat && catSource && ` (${catSource === "api" ? "À JOUR" : catSource === "cache" ? "CACHE LOCAL" : "INDISPONIBLE"})`}</>}
        actions={<>
          <button type="button" className="btn" onClick={() => refreshCatalog(true)} disabled={loadingCat}>{loadingCat ? "Chargement…" : "Actualiser le catalogue"}</button>
          <button type="button" className="btn primary" onClick={() => { searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); searchRef.current?.focus(); }} disabled={catalog.length === 0}>+ Ajouter un vaisseau</button>
        </>}
        banner={{ src: ART.andromeda, kicker: "HANGAR ▸ FLOTTES, FICHES TECHNIQUES ET MODÈLES 3D", text: "Compose tes flottes depuis le catalogue, ouvre la fiche complète de chaque vaisseau et tourne autour de son modèle 3D. Tout se gère ici, sans extension ni site externe." }} />

      {catSource === "none" && !loadingCat && <Note tag="⚠ CATALOGUE">Impossible de joindre le catalogue (FleetYards). Vérifie la connexion puis « Actualiser le catalogue ». Tes flottes restent disponibles.</Note>}
      {msg && <Note tag={msg.kind === "ok" ? "✓" : "⚠"} info={msg.kind === "ok"}>{msg.text}</Note>}

      {/* ===== 01 flottes ===== */}
      <SectionHead n="01" title="MES FLOTTES" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {hangar.fleets.map((f) => (
          <button key={f.id} type="button" className={"device-tab" + (f.id === fleet.id ? " active" : "")} aria-pressed={f.id === fleet.id} onClick={() => { persist({ ...hangar, active: f.id }); setEditing(null); setRenaming(false); setConfirmDelete(false); }}>
            <span className="slot">{String(f.ships.length).padStart(2, "0")}</span>
            <span className="name">{f.name}</span>
            <span className="sub">{f.ships.length} vaisseau{f.ships.length > 1 ? "x" : ""}</span>
          </button>
        ))}
        <button type="button" className="btn" onClick={createFleet}>+ Nouvelle flotte</button>
        <span style={{ flex: 1 }} />
        {renaming
          ? <input autoFocus className="fleet-input" defaultValue={fleet.name} aria-label="Nom de la flotte" onBlur={(e) => { const v = e.target.value.trim(); if (v) persist(updateFleet(hangar, fleet.id, (f) => ({ ...f, name: v }))); setRenaming(false); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenaming(false); }} />
          : <button type="button" className="btn sm" onClick={() => setRenaming(true)}>Renommer</button>}
        <button type="button" className="btn sm" onClick={() => download(`flotte-${fleet.name.replace(/[^\w-]+/g, "_")}.json`, exportFleet(fleet))} disabled={owned.length === 0}>Sauvegarder</button>
        <button type="button" className="btn sm" onClick={importFleetFile}>Restaurer</button>
        <button type="button" className="btn sm" onClick={importXplor} disabled={catalog.length === 0} title="Facultatif : export de l'extension HangarXPLOR (page My Hangar du site RSI)">Import HangarXPLOR</button>
        {hangar.fleets.length > 1 && (confirmDelete
          ? <button type="button" className="btn sm" style={{ borderColor: "#ff6b5e", color: "#ff6b5e" }} onClick={deleteFleet} onBlur={() => setConfirmDelete(false)}>Confirmer la suppression</button>
          : <button type="button" className="btn sm" onClick={() => setConfirmDelete(true)}>Supprimer</button>)}
      </div>

      {owned.length === 0 ? (
        <div className="panel" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 28, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="display" style={{ fontSize: 22, color: "var(--text-bright)", letterSpacing: ".06em" }}>« {fleet.name.toUpperCase()} » EST VIDE</div>
            <div style={{ color: "var(--text)", lineHeight: 1.6 }}>
              Cherche un vaisseau dans le <b>catalogue</b> plus bas et clique <b>+ Flotte</b> : il arrive ici avec sa fiche. Tu peux ensuite lui donner un nom, préciser l'assurance, où il est garé et comment tu l'as obtenu.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn primary" onClick={() => { searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); searchRef.current?.focus(); }} disabled={catalog.length === 0}>▸ Choisir dans le catalogue</button>
            </div>
            <div className="hint" style={{ margin: 0 }}>Plusieurs flottes possibles : par exemple « Possédés », « Achetés en jeu », « Envies ». « Sauvegarder » écrit un fichier que « Restaurer » sait relire.</div>
          </div>
          <Pic src={ART.cutlassBlack} alt="" ratio="16 / 10" dim style={{ border: "1px solid var(--line)" }} />
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <Stat label="VAISSEAUX" value={totals.n} />
            <Stat label="JOUABLES" value={`${totals.inGame} / ${totals.n}`} />
            <Stat label="CARGO CUMULÉ" value={unit(totals.cargo, "SCU")} />
            <Stat label="ÉQUIPAGE MAX" value={totals.crew} />
            <Stat label="VALEUR" value={[totals.usd ? `${nf(totals.usd)} $` : "", totals.auec ? `${nf(totals.auec)} aUEC` : ""].filter(Boolean).join(" · ") || "—"} amber />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}>
            {owned.map((o) => {
              const s = o.shipId ? byId.get(o.shipId) : undefined;
              const isEditing = editing === o.id;
              return (
                <div key={o.id} className="panel small img-card" style={{ display: "flex", flexDirection: "column", outline: sel && s && sel.id === s.id ? "1px solid var(--rsi)" : undefined }}>
                  <button type="button" className="card-hit" onClick={() => s && select(s)} disabled={!s} aria-label={`Ouvrir la fiche de ${o.label}`}>
                    <Pic src={s?.img ?? null} alt="" ratio="21 / 9" dim>
                      <span className="pic-cap"><span className="k">{s ? `${s.mfr} · ${s.cls}` : "MODÈLE NON RECONNU"}</span><span className="t">{o.nickname ?? o.label}</span></span>
                    </Pic>
                  </button>
                  <div className="img-body">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {o.nickname && <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{o.label}</span>}
                      {(o.insurance || o.lti) && <span className="hud-chip" style={{ color: o.insurance === "lti" || o.lti ? "var(--green)" : "var(--text)" }}>{o.insurance === "lti" || (!o.insurance && o.lti) ? "LTI" : INSURANCE_FR[o.insurance ?? ""].toUpperCase()}</span>}
                      {o.acquired && o.acquired !== "pledge" && <span className="hud-chip" style={{ color: "var(--cyan)" }}>{o.acquired === "ingame" ? "aUEC" : o.acquired === "rental" ? "LOCATION" : o.acquired === "loaner" ? "PRÊT" : "CADEAU"}</span>}
                      {o.warbond && <span className="hud-chip" style={{ color: "var(--amber)" }}>WARBOND</span>}
                      {s && !s.inGame && <span className="hud-chip" style={{ color: "var(--dim)" }}>{STATUS[s.status]?.label ?? s.status.toUpperCase()}</span>}
                    </div>
                    {s && <div className="mono" style={{ fontSize: 11, color: "var(--dim)", letterSpacing: ".08em" }}>{(SIZE_FR[s.size] ?? s.sizeLabel).toUpperCase()} · ÉQUIPAGE {crew(s)} · CARGO {nf(s.cargo)} SCU{s.scm ? ` · SCM ${nf(s.scm)} M/S` : ""}</div>}
                    {(o.location || o.notes) && <div style={{ fontSize: 13, color: "var(--muted)" }}>{o.location ? `Garé : ${o.location}` : ""}{o.location && o.notes ? " · " : ""}{o.notes ?? ""}</div>}
                    {o.pledgeName && <div style={{ fontSize: 12, color: "var(--dim)" }}>{o.pledgeName}{o.pledgeCost ? ` · ${o.pledgeCost}` : ""}{o.pledgeDate ? ` · ${o.pledgeDate}` : ""}</div>}
                    {isEditing && (
                      <div className="ship-edit">
                        <label><span className="label">NOM DONNÉ</span><input defaultValue={o.nickname ?? ""} placeholder={o.label} onBlur={(e) => patchShip(o.id, { nickname: e.target.value.trim() || null })} /></label>
                        <label><span className="label">OBTENU PAR</span><select value={o.acquired ?? "ingame"} onChange={(e) => patchShip(o.id, { acquired: e.target.value as Acquired })}>{(Object.keys(ACQUIRED_FR) as Acquired[]).map((k) => <option key={k} value={k}>{ACQUIRED_FR[k]}</option>)}</select></label>
                        <label><span className="label">ASSURANCE</span><select value={o.insurance ?? ""} onChange={(e) => patchShip(o.id, { insurance: e.target.value as Insurance, lti: e.target.value === "lti" })}>{(Object.keys(INSURANCE_FR) as Insurance[]).map((k) => <option key={k || "none"} value={k}>{INSURANCE_FR[k]}</option>)}</select></label>
                        <label><span className="label">GARÉ À</span><input defaultValue={o.location ?? ""} placeholder="ex. Area18, Everus Harbor" onBlur={(e) => patchShip(o.id, { location: e.target.value.trim() || null })} /></label>
                        <label><span className="label">PAYÉ (aUEC)</span><input type="number" min={0} defaultValue={o.paidAuec ?? ""} placeholder={s?.priceAuec ? String(s.priceAuec) : ""} onBlur={(e) => patchShip(o.id, { paidAuec: e.target.value ? Number(e.target.value) : null })} /></label>
                        <label style={{ gridColumn: "1 / -1" }}><span className="label">NOTES</span><input defaultValue={o.notes ?? ""} placeholder="loadout, usage, à vendre…" onBlur={(e) => patchShip(o.id, { notes: e.target.value.trim() || null })} /></label>
                        {hangar.fleets.length > 1 && <label style={{ gridColumn: "1 / -1" }}><span className="label">DÉPLACER VERS</span><select value={fleet.id} onChange={(e) => moveShip(o.id, e.target.value)}>{hangar.fleets.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                      <button type="button" className="btn sm" onClick={() => s && select(s)} disabled={!s}>Fiche et 3D</button>
                      <button type="button" className={"btn sm" + (isEditing ? " primary" : "")} onClick={() => setEditing(isEditing ? null : o.id)}>{isEditing ? "Terminé" : "Modifier"}</button>
                      <button type="button" className="btn sm" style={{ marginLeft: "auto" }} onClick={() => removeShip(o.id)}>Retirer</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== 02 fiche ===== */}
      <div ref={sheetRef} style={{ scrollMarginTop: 12 }} />
      {sel && (
        <>
          <SectionHead n="02" title={`FICHE TECHNIQUE ▸ ${sel.rsiName.toUpperCase()}`} />
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: stat.color }}>{stat.label}{sel.onSale ? " · EN VENTE (PLEDGE)" : ""}{d?.note ? ` · ${d.note.toUpperCase()}` : ""}</div>
                <div className="display" style={{ fontSize: 30, color: "var(--text-bright)", lineHeight: 1.1, marginTop: 4 }}>{sel.rsiName}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sel.mfr.toUpperCase()} · {sel.cls.toUpperCase()}{sel.foci.length ? ` · ${sel.foci.join(" / ").toUpperCase()}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn primary" onClick={() => addToFleet(sel)}>+ Ajouter à « {fleet.name} »</button>
                {sel.storeUrl && <button type="button" className="btn" onClick={() => open(sel.storeUrl!)}>Page RSI</button>}
                <button type="button" className="btn" onClick={() => select(null)}>Fermer</button>
              </div>
            </div>

            <div className="sheet-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                {detail === "loading"
                  ? <div className="ship-viewer ship-viewer-empty"><span className="mono">CHARGEMENT DE LA FICHE…</span></div>
                  : <ShipViewer key={sel.slug} slug={sel.slug} textured={d?.models.textured ?? null} holo={d?.models.holo ?? null} autoRotate={autoRotate} lengthM={sel.length} fallbackImage={d?.views.angled ?? sel.imgLarge ?? sel.img} />}
                {d && (d.views.front || d.views.side || d.views.top) && (
                  <div className="view-strip">
                    {([["FACE", d.views.front], ["PROFIL", d.views.side], ["DESSUS", d.views.top], ["ARRIÈRE", d.views.rear]] as const).filter(([, u]) => u).map(([k, u]) => (
                      <Pic key={k} src={u} alt={`Vue ${k.toLowerCase()}`} ratio="16 / 9" fit="contain"><span className="pic-cap" style={{ left: 8, bottom: 6 }}><span className="k">{k}</span></span></Pic>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                <div role="tablist" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([["specs", "Caractéristiques"], ["fit", "Armement et composants"], ["buy", "Achat et location"]] as const).map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={"tab" + (tab === id ? " active" : "")} onClick={() => setTab(id)}>{label}</button>
                  ))}
                </div>

                {tab === "specs" && (
                  <div className="spec-cols">
                    <Spec title="GÉNÉRAL" rows={[["Taille", SIZE_FR[sel.size] ?? sel.sizeLabel], ["Équipage", crew(sel)], ["Couchettes", nf(d?.beds)], ["Masse", sel.mass ? `${nf(sel.mass / 1000, 1)} t` : "—"], ["Atterrissage planétaire", d?.canLand == null ? "—" : d.canLand ? "Oui" : "Non"], ["Taille de pad", d?.dockSize ? d.dockSize : "—"]]} />
                    <Spec title="DIMENSIONS" rows={[["Longueur", unit(sel.length, "m", 1)], ["Envergure", unit(sel.beam, "m", 1)], ["Hauteur en vol", unit(sel.height, "m", 1)], ["Hauteur posé", unit(d?.landed.height, "m", 1)], ["Signature (x / y / z)", d?.crossSection ? `${nf(d.crossSection.x)} / ${nf(d.crossSection.y)} / ${nf(d.crossSection.z)}` : "—"]]} />
                    <Spec title="VOL" rows={[["Vitesse SCM", unit(d?.speeds.scm ?? sel.scm, "m/s")], ["SCM avec boost", unit(d?.speeds.scmBoost, "m/s")], ["Vitesse max (NAV)", unit(d?.speeds.max ?? sel.max, "m/s")], ["Tangage / lacet / roulis", d?.speeds.pitch != null ? `${nf(d.speeds.pitch)} / ${nf(d.speeds.yaw)} / ${nf(d.speeds.roll)} °/s` : "—"], ["Idem avec boost", d?.speeds.pitchBoost != null ? `${nf(d.speeds.pitchBoost, 1)} / ${nf(d.speeds.yawBoost, 1)} / ${nf(d.speeds.rollBoost, 1)} °/s` : "—"], ["Accélération avant / rétro", d?.speeds.accelMain != null ? `${nf(d.speeds.accelMain, 1)} / ${nf(d.speeds.accelRetro, 1)} m/s²` : "—"], ["0 ▸ SCM / arrêt depuis SCM", d?.speeds.toScm != null ? `${nf(d.speeds.toScm, 1)} s / ${nf(d.speeds.toStop, 1)} s` : "—"]]} />
                    <Spec title="CARGO ET STOCKAGE" rows={[["Cargo", unit(d?.maxCargo ?? sel.cargo, "SCU")], ...((d?.cargoHolds ?? []).map((h): [string, string] => [`Soute ${h.name}`, `${nf(h.capacity)} SCU${h.dims ? ` · ${h.dims}` : ""}${h.maxBox ? ` · caisse max ${h.maxBox} SCU` : ""}`])), ["Inventaire personnel", unit(d?.personalInventory, "SCU", 2)], ["Râteliers d'armes", d?.weaponRacks.length ? d.weaponRacks.map((r) => `${r.count} × ${r.slots} emplacements`).join(", ") : "—"], ["Hangars embarqués", d?.docks.length ? d.docks.map((k) => `${k.count} × ${k.type} ${k.size}`).join(", ") : "—"]]} />
                    <Spec title="CARBURANT" rows={[["Hydrogène", unit(d?.hydrogen, "SCU", 1)], ["Quantique", unit(d?.quantum, "SCU", 1)]]} />
                    <Spec title="COQUE" rows={[["Points de structure", unit(sel.hull, "HP")], ...((d?.hullParts ?? []).slice(0, 6).map((p): [string, string] => [p.name, `${nf(p.health)} HP`]))]} />
                    <Spec title="ARMEMENT (RÉSUMÉ)" rows={[["Emplacements d'armes", d?.weapons.sizes.length ? d.weapons.sizes.map((w) => `${w.count} × S${w.size}`).join(" · ") : "—"], ["Dégâts alpha", nf(d?.weapons.alpha, 1)], ["DPS en rafale", nf(d?.weapons.burst ?? sel.dps)], ["DPS soutenu", d?.weapons.sustainMin != null ? `${nf(d.weapons.sustainMin)} – ${nf(d.weapons.sustainMax)}` : "—"]]} />
                    <div className="spec-block" style={{ gridColumn: "1 / -1" }}>
                      <div className="label">DESCRIPTION</div>
                      <div style={{ lineHeight: 1.6, color: "var(--text)", marginTop: 8 }}>{descFr === undefined ? <span className="mono" style={{ color: "var(--dim)", fontSize: 11 }}>CHARGEMENT…</span> : (descFr ?? sel.desc ?? "—")}</div>
                    </div>
                  </div>
                )}

                {tab === "fit" && (
                  fit === "loading" || fit === null ? <div className="hint">Chargement de l'équipement d'usine…</div>
                    : fit === "none" || fit.items.length === 0 ? <div className="hint">Pas de détail d'équipement publié pour ce vaisseau.</div>
                      : <div className="spec-cols">{Object.keys(GROUP_FR).filter((g) => fit.items.some((i) => i.group === g)).map((g) => (
                        <div key={g} className="spec-block">
                          <div className="label">{GROUP_FR[g].toUpperCase()}</div>
                          <div className="fit-list">{fit.items.filter((i) => i.group === g).map((i, n) => <FitRow key={n} f={i} depth={0} />)}</div>
                        </div>
                      ))}</div>
                )}

                {tab === "buy" && (
                  <div className="spec-cols">
                    <Spec title="PRIX" rows={[["Pledge (boutique RSI)", sel.pledge != null ? `${nf(sel.pledge)} $` : "—"], ["En jeu", sel.priceAuec ? `${nf(sel.priceAuec)} aUEC` : "Non vendu en jeu"]]} />
                    <Spec title={`OÙ L'ACHETER EN JEU (${sel.soldAt.length})`} rows={sel.soldAt.length ? sel.soldAt.map((x): [string, string] => [`${x.name}${x.where ? ` · ${x.where}` : ""}`, `${nf(x.price)} aUEC`]) : [["Aucun vendeur connu", "—"]]} />
                    <Spec title={`LOCATION À LA JOURNÉE (${sel.rentAt.length})`} rows={sel.rentAt.length ? sel.rentAt.map((x): [string, string] => [`${x.name}${x.where ? ` · ${x.where}` : ""}`, `${nf(x.price)} aUEC`]) : [["Pas de location connue", "—"]]} />
                    {sel.loaners.length > 0 && <Spec title="PRÊTÉS EN ATTENDANT (LOANERS)" rows={sel.loaners.map((l): [string, string] => [l, ""])} />}
                  </div>
                )}
                <div className="hint" style={{ margin: 0 }}>Données FleetYards extraites des fichiers du jeu (Alpha en cours) ; prix en jeu relevés par la communauté. Modèles 3D et images © Cloud Imperium Games.</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== 03 catalogue ===== */}
      <SectionHead n={sel ? "03" : "02"} title="CATALOGUE" />
      <div className="panel small" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input ref={searchRef} className="fleet-input" style={{ flex: "1 1 260px" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un vaisseau, un constructeur, un rôle…" aria-label="Rechercher dans le catalogue" />
        <select className="fleet-input" value={mfr} onChange={(e) => setMfr(e.target.value)} aria-label="Constructeur">
          <option value="">Tous constructeurs</option>{mfrs.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div role="group" aria-label="Taille" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className={"tab" + (size === "" ? " active" : "")} aria-pressed={size === ""} onClick={() => setSize("")}>Toutes</button>
          {SIZES.map((s) => <button key={s} type="button" className={"tab" + (size === s ? " active" : "")} aria-pressed={size === s} onClick={() => setSize(s)}>{SIZE_FR[s]}</button>)}
        </div>
        <button type="button" className={"tab" + (onlyGame ? " active" : "")} aria-pressed={onlyGame} onClick={() => setOnlyGame((v) => !v)}>Uniquement en jeu</button>
      </div>
      {catalog.length === 0 ? (
        <div className="panel empty">{loadingCat ? `Chargement du catalogue… ${progress ? `${progress} modèles reçus` : ""}` : "Catalogue indisponible."}</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
            {results.slice(0, limit).map((s) => (
              <div key={s.id} className="panel small img-card" style={{ display: "flex", flexDirection: "column", outline: sel?.id === s.id ? "1px solid var(--rsi)" : undefined }}>
                <button type="button" className="card-hit" onClick={() => select(s)} aria-label={`Fiche de ${s.rsiName}`}><Pic src={s.img} alt="" ratio="16 / 9" /></button>
                <div className="img-body" style={{ padding: "10px 12px 12px", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <span className="display" style={{ fontSize: 15, color: "var(--text-bright)" }}>{s.name}</span>
                    {ownedIds.has(s.id) && <span className="mono" style={{ fontSize: 10, color: "var(--green)" }}>● POSSÉDÉ</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--dim)" }}>{s.mfrCode} · {(SIZE_FR[s.size] ?? s.sizeLabel).toUpperCase()} · {s.cls.toUpperCase()}</div>
                  <div className="mono" style={{ fontSize: 11, color: s.inGame ? "var(--muted)" : "var(--dim)" }}>{s.priceAuec ? `${nf(s.priceAuec)} aUEC` : s.pledge != null ? `${nf(s.pledge)} $` : "—"}{!s.inGame ? ` · ${STATUS[s.status]?.label ?? s.status.toUpperCase()}` : ""}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button type="button" className="btn sm" style={{ flex: 1 }} onClick={() => select(s)}>Fiche{s.has3d ? " · 3D" : ""}</button>
                    <button type="button" className="btn sm primary" onClick={() => addToFleet(s)} title={`Ajouter à « ${fleet.name} »`}>+ Flotte</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {results.length === 0 && <div className="panel empty">Aucun vaisseau pour ces filtres.</div>}
          {results.length > limit && <button type="button" className="btn" style={{ alignSelf: "center" }} onClick={() => setLimit((n) => n + PAGE_SIZE)}>Afficher {Math.min(PAGE_SIZE, results.length - limit)} de plus ({results.length - limit} restants)</button>}
        </>
      )}
      <div className="hint">Catalogue et modèles : FleetYards (fleetyards.net). Descriptions françaises : wiki Star Citizen. SC-Univers n'est pas affilié à Cloud Imperium Games.</div>
    </>
  );
}

function Spec({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="spec-block">
      <div className="label">{title}</div>
      <div className="spec-rows">{rows.map(([k, v], i) => <div key={i} className="spec-row"><span>{k}</span><b>{v}</b></div>)}</div>
    </div>
  );
}

function FitRow({ f, depth }: { f: Fitting; depth: number }) {
  return (
    <>
      <div className="fit-row" style={{ paddingLeft: 10 + depth * 16 }}>
        <span className="fit-size mono">{f.size != null ? `S${f.size}` : "—"}</span>
        <span style={{ minWidth: 0 }}>
          <span className="fit-name">{f.count > 1 ? `${f.count} × ` : ""}{f.item ?? "Emplacement vide"}</span>
          <span className="fit-meta mono">{f.slot}{f.mfr ? ` · ${f.mfr}` : ""}{f.cls ? ` · ${f.cls}` : ""}</span>
        </span>
        {f.grade && <span className="hud-chip">GRADE {f.grade}</span>}
      </div>
      {f.children.map((c, i) => <FitRow key={i} f={c} depth={depth + 1} />)}
    </>
  );
}

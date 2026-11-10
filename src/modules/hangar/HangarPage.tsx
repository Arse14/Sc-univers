import { useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { Pic } from "../../components/Pic";
import { SHIPS as ART } from "../../lib/images";
import { isTauri, pickFile, readTextFile } from "../../lib/tauri";
import { loadCatalog, loadFrenchDescription, type Ship } from "./catalog";
import { addManual, costUsd, importHangarXplor, loadHangar, saveHangar, EMPTY, type Hangar, type OwnedShip } from "./hangar";

const nf = (n: number | null | undefined, d = 0) => n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const STATUS: Record<string, { label: string; color: string }> = {
  "flight-ready": { label: "EN JEU", color: "var(--green)" },
  "in-production": { label: "EN PRODUCTION", color: "var(--amber)" },
  "in-concept": { label: "CONCEPT", color: "var(--dim)" },
  concept: { label: "CONCEPT", color: "var(--dim)" },
};
const SIZES = ["vehicle", "snub", "small", "medium", "large", "capital"];
const SIZE_FR: Record<string, string> = { vehicle: "Véhicule", snub: "Snub", small: "Petit", medium: "Moyen", large: "Grand", capital: "Capital" };

async function open(url: string) { if (isTauri) await openUrl(url); else window.open(url, "_blank", "noopener"); }

export function HangarPage() {
  const [catalog, setCatalog] = useState<Ship[]>([]);
  const [catSource, setCatSource] = useState<string>("");
  const [loadingCat, setLoadingCat] = useState(true);
  const [hangar, setHangar] = useState<Hangar>(EMPTY);
  const [sel, setSel] = useState<Ship | null>(null);
  const [selOwned, setSelOwned] = useState<OwnedShip | null>(null);
  const [descFr, setDescFr] = useState<Record<string, string | null>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState("");
  const [size, setSize] = useState("");
  const [onlyGame, setOnlyGame] = useState(true);

  useEffect(() => {
    loadHangar().then(setHangar).catch(() => undefined);
    loadCatalog().then((r) => { setCatalog(r.ships); setCatSource(r.source); }).finally(() => setLoadingCat(false));
  }, []);

  const byId = useMemo(() => new Map(catalog.map((s) => [s.id, s])), [catalog]);
  const persist = async (h: Hangar) => { setHangar(h); await saveHangar(h).catch(() => undefined); };

  const doImport = async () => {
    setMsg(null);
    let text: string | null = null;
    if (isTauri) {
      const p = await pickFile([{ name: "Export HangarXPLOR", extensions: ["json", "csv"] }]);
      if (!p) return; text = await readTextFile(p);
    } else {
      text = window.prompt("Colle ici le contenu du fichier shiplist.json (hors application, pas de sélecteur de fichier).") ?? null;
    }
    if (!text) return;
    try {
      const r = importHangarXplor(text, catalog);
      if (r.ships.length === 0) { setMsg({ kind: "warn", text: "Aucun vaisseau trouvé dans ce fichier. Il faut l'export « shiplist.json » ou « shiplist.csv » de HangarXPLOR." }); return; }
      const manual = hangar.ships.filter((s) => s.source === "manual");
      await persist({ ships: [...r.ships, ...manual], importedAt: new Date().toISOString() });
      setMsg({ kind: r.unknown.length ? "warn" : "ok", text: `${r.ships.length} vaisseau(x) importé(s)${r.skipped ? `, ${r.skipped} élément(s) ignoré(s) (non-vaisseaux)` : ""}${r.unknown.length ? `. Non reconnus : ${r.unknown.join(", ")}` : "."}` });
    } catch (e) { setMsg({ kind: "warn", text: `Fichier illisible : ${e}` }); }
  };

  const select = (s: Ship | null, owned: OwnedShip | null = null) => {
    setSel(s); setSelOwned(owned);
    if (s && !(s.rsiName in descFr)) loadFrenchDescription(s.rsiName).then((d) => setDescFr((m) => ({ ...m, [s.rsiName]: d })));
  };

  const owned = hangar.ships;
  const totals = useMemo(() => {
    const ships = owned.map((o) => (o.shipId ? byId.get(o.shipId) : undefined));
    return {
      n: owned.length,
      usd: owned.reduce((a, o) => a + costUsd(o.pledgeCost), 0),
      cargo: ships.reduce((a, s) => a + (s?.cargo ?? 0), 0),
      lti: owned.filter((o) => o.lti).length,
      inGame: ships.filter((s) => s?.inGame).length,
    };
  }, [owned, byId]);

  const mfrs = useMemo(() => [...new Set(catalog.map((s) => s.mfr))].sort(), [catalog]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return catalog.filter((s) => (!onlyGame || s.inGame) && (!mfr || s.mfr === mfr) && (!size || s.size === size) && (!t || s.rsiName.toLowerCase().includes(t) || s.mfr.toLowerCase().includes(t) || s.foci.some((f) => f.toLowerCase().includes(t)))).slice(0, 120);
  }, [catalog, q, mfr, size, onlyGame]);

  const stat = STATUS[sel?.status ?? ""] ?? { label: (sel?.status ?? "").toUpperCase(), color: "var(--dim)" };
  const isOwned = (s: Ship) => owned.some((o) => o.shipId === s.id);

  return (
    <>
      <PageHeader crumb="UNIVERS ▸ HANGAR" title="Hangar" sub={<>MA FLOTTE · {totals.n} VAISSEAU{totals.n > 1 ? "X" : ""}{hangar.importedAt && <> · IMPORT {new Date(hangar.importedAt).toLocaleDateString("fr-FR")}</>} &nbsp;·&nbsp; CATALOGUE {catalog.length} MODÈLES{catSource && ` (${catSource === "api" ? "FLEETYARDS" : catSource === "cache" ? "CACHE" : "INDISPONIBLE"})`}</>}
        actions={<>
          <button type="button" className="btn" onClick={() => { setLoadingCat(true); loadCatalog(true).then((r) => { setCatalog(r.ships); setCatSource(r.source); }).finally(() => setLoadingCat(false)); }} disabled={loadingCat}>{loadingCat ? "Chargement…" : "Actualiser le catalogue"}</button>
          <button type="button" className="btn primary" onClick={doImport} disabled={catalog.length === 0}>▸ Importer mon hangar (HangarXPLOR)</button>
        </>}
        banner={{ src: ART.andromeda, kicker: "HANGAR ▸ FLOTTE ET CATALOGUE", text: "Importe l'export HangarXPLOR de ta page « My Hangar » RSI pour retrouver tes vaisseaux avec leurs fiches. Le catalogue complet permet d'ajouter à la main ceux achetés en jeu." }} />

      {!isTauri && <Note tag="⚠ NAVIGATEUR">Hors de l'application, pas de sélecteur de fichier ni d'accès réseau garanti : l'import se fait en collant le JSON.</Note>}
      {catSource === "none" && !loadingCat && <Note tag="⚠ CATALOGUE">Impossible de joindre FleetYards. Vérifie la connexion puis « Actualiser le catalogue ».</Note>}
      {msg && <Note tag={msg.kind === "ok" ? "✓ IMPORT" : "⚠ IMPORT"} info={msg.kind === "ok"}>{msg.text}</Note>}

      <SectionHead n="01" title="MA FLOTTE" />
      {owned.length === 0 ? (
        <div className="panel" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 28, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="display" style={{ fontSize: 22, color: "var(--text-bright)", letterSpacing: ".06em" }}>HANGAR VIDE</div>
            <div style={{ color: "var(--muted)", lineHeight: 1.55 }}>Le site RSI n'a pas d'API : on passe par l'extension communautaire <b>HangarXPLOR</b>, qui ajoute un export à ta page « My Hangar ».</div>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, color: "var(--text)", lineHeight: 1.5 }}>
              <li>Installe HangarXPLOR dans ton navigateur (Chrome, Edge, Firefox ou Opera).</li>
              <li>Connecte-toi sur robertsspaceindustries.com et ouvre <span className="mono">My Hangar</span>.</li>
              <li>Dans la barre HangarXPLOR, clique sur <span className="mono">Export ▸ JSON</span> : un fichier <span className="mono">shiplist.json</span> est téléchargé.</li>
              <li>Ici, « Importer mon hangar » et sélectionne ce fichier. Refais l'export après chaque achat ou upgrade.</li>
            </ol>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn primary" onClick={doImport} disabled={catalog.length === 0}>▸ Importer shiplist.json</button>
              <button type="button" className="btn" onClick={() => open("https://github.com/dolkensp/HangarXPLOR")}>HangarXPLOR (GitHub)</button>
              <button type="button" className="btn" onClick={() => open("https://robertsspaceindustries.com/account/pledges")}>Ma page My Hangar</button>
            </div>
            <div className="hint" style={{ margin: 0 }}>Les vaisseaux loués ou achetés en aUEC en jeu n'apparaissent pas sur le site RSI : ajoute-les depuis le catalogue ci-dessous.</div>
          </div>
          <Pic src={ART.cutlassBlack} alt="" ratio="16 / 10" dim style={{ border: "1px solid var(--line)" }} />
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Stat label="VAISSEAUX" value={totals.n} />
            <Stat label="EN JEU" value={`${totals.inGame} / ${totals.n}`} />
            <Stat label="AVEC LTI" value={totals.lti} />
            <Stat label="CARGO TOTAL" value={<>{nf(totals.cargo)} <small style={{ fontSize: 12, color: "var(--dim)" }}>SCU</small></>} />
            <Stat label="VALEUR PLEDGE" value={totals.usd ? `${nf(totals.usd)} $` : "—"} amber />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {owned.map((o) => {
              const s = o.shipId ? byId.get(o.shipId) : undefined;
              const active = selOwned?.id === o.id;
              return (
                <div key={o.id} className={"panel small img-card" + (active ? " active" : "")} style={{ display: "flex", flexDirection: "column", outline: active ? "1px solid var(--rsi)" : undefined }}>
                  <button type="button" style={{ all: "unset", cursor: "pointer", display: "block" }} onClick={() => select(s ?? null, o)}>
                    <Pic src={s?.img ?? null} alt="" ratio="21 / 9" dim>
                      <span className="pic-cap"><span className="k">{s?.mfr ?? "NON RECONNU"}{s ? ` · ${s.cls}` : ""}</span><span className="t">{o.nickname ?? o.label}</span></span>
                    </Pic>
                  </button>
                  <div className="img-body">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {o.nickname && <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{o.label}</span>}
                        {o.lti && <span className="hud-chip" style={{ color: "var(--green)" }}>LTI</span>}
                        {o.warbond && <span className="hud-chip" style={{ color: "var(--amber)" }}>WARBOND</span>}
                        {s && !s.inGame && <span className="hud-chip" style={{ color: "var(--dim)" }}>{STATUS[s.status]?.label ?? s.status.toUpperCase()}</span>}
                        {o.source === "manual" && <span className="hud-chip" style={{ color: "var(--dim)" }}>MANUEL</span>}
                      </span>
                      <button type="button" className="btn" style={{ minHeight: 28, padding: "2px 10px", fontSize: 11 }} onClick={() => persist({ ...hangar, ships: owned.filter((x) => x.id !== o.id) })}>Retirer</button>
                    </div>
                    {s && <div className="mono" style={{ fontSize: 11, color: "var(--dim)", letterSpacing: ".08em" }}>{SIZE_FR[s.size] ?? s.sizeLabel} · ÉQUIPAGE {s.crewMin ?? "?"}{s.crewMax && s.crewMax !== s.crewMin ? `–${s.crewMax}` : ""} · CARGO {nf(s.cargo)} SCU</div>}
                    {o.pledgeName && <div style={{ fontSize: 13, color: "var(--muted)" }}>{o.pledgeName}{o.pledgeCost ? ` · ${o.pledgeCost}` : ""}{o.pledgeDate ? ` · ${o.pledgeDate}` : ""}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {sel && (
        <>
          <SectionHead n="02" title={`FICHE ▸ ${sel.rsiName.toUpperCase()}`} />
          <div className="panel" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(300px, 1fr)", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Pic key={sel.id} src={sel.imgLarge ?? sel.img} alt={sel.rsiName} ratio="21 / 9" dim style={{ border: "1px solid var(--line)" }}>
                <span className="pic-cap"><span className="k">{sel.mfr} · {sel.cls}{sel.foci.length ? ` · ${sel.foci.join(" / ")}` : ""}</span><span className="t" style={{ fontSize: 26 }}>{sel.rsiName}</span></span>
              </Pic>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {[["TAILLE", SIZE_FR[sel.size] ?? sel.sizeLabel], ["ÉQUIPAGE", `${sel.crewMin ?? "?"}${sel.crewMax && sel.crewMax !== sel.crewMin ? ` – ${sel.crewMax}` : ""}`], ["CARGO", `${nf(sel.cargo)} SCU`], ["DIMENSIONS", `${nf(sel.length, 1)} × ${nf(sel.beam, 1)} × ${nf(sel.height, 1)} m`], ["MASSE", `${nf(sel.mass ? sel.mass / 1000 : null, 1)} t`], ["COQUE", `${nf(sel.hull)} HP`], ["VITESSE SCM / MAX", `${nf(sel.scm)} / ${nf(sel.max)} m/s`], ["DPS (RAFALE)", nf(sel.dps)]].map(([k, v]) => (
                  <div key={k} style={{ padding: "10px 12px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 4 }}><span className="label">{k}</span><b style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 18, color: "var(--text-bright)" }}>{v}</b></div>
                ))}
              </div>
              <div style={{ lineHeight: 1.6, color: "var(--text)" }}>
                {descFr[sel.rsiName] === undefined ? <span className="mono" style={{ color: "var(--dim)", fontSize: 11 }}>CHARGEMENT DE LA DESCRIPTION…</span> : (descFr[sel.rsiName] ?? sel.desc)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: stat.color }}>{stat.label}{sel.onSale ? " · EN VENTE (PLEDGE)" : ""}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Stat label="PLEDGE" value={sel.pledge != null ? `${nf(sel.pledge)} $` : "—"} />
                <Stat label="EN JEU" value={sel.priceAuec ? `${nf(sel.priceAuec)} aUEC` : "—"} amber />
              </div>
              {sel.soldAt.length > 0 && (
                <div><div className="label" style={{ marginBottom: 8 }}>OÙ L'ACHETER ({sel.soldAt.length})</div>
                  <div className="sublist">{sel.soldAt.map((x, i) => <div key={i} className="it" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><span>{x.name}{x.where ? <span style={{ color: "var(--dim)" }}> · {x.where}</span> : null}</span><span className="mono">{nf(x.price)} aUEC</span></div>)}</div></div>
              )}
              {sel.rentAt.length > 0 && (
                <div><div className="label" style={{ marginBottom: 8 }}>LOCATION / JOUR ({sel.rentAt.length})</div>
                  <div className="sublist">{sel.rentAt.map((x, i) => <div key={i} className="it" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><span>{x.name}{x.where ? <span style={{ color: "var(--dim)" }}> · {x.where}</span> : null}</span><span className="mono">{nf(x.price)} aUEC</span></div>)}</div></div>
              )}
              {sel.loaners.length > 0 && <div><div className="label" style={{ marginBottom: 6 }}>PRÊTÉS EN ATTENDANT (LOANERS)</div><div style={{ color: "var(--muted)" }}>{sel.loaners.join(", ")}</div></div>}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
                {isOwned(sel)
                  ? <span className="hud-chip" style={{ color: "var(--green)" }}>DANS MA FLOTTE</span>
                  : <button type="button" className="btn primary" onClick={() => persist({ ...hangar, ships: [...owned, addManual(sel)] })}>+ Ajouter à ma flotte</button>}
                {sel.storeUrl && <button type="button" className="btn" onClick={() => open(sel.storeUrl!)}>Page RSI</button>}
                <button type="button" className="btn" onClick={() => select(null)}>Fermer</button>
              </div>
              <div className="hint" style={{ margin: 0 }}>Stats FleetYards (Alpha en cours), prix en jeu relevés par la communauté. Images © CIG.</div>
            </div>
          </div>
        </>
      )}

      <SectionHead n="03" title="CATALOGUE" />
      <div className="panel small" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input className="map-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un vaisseau, un constructeur, un rôle…" aria-label="Rechercher" style={{ flex: "1 1 260px", padding: "9px 12px", background: "rgba(6,20,32,.6)", border: "1px solid var(--line)", color: "var(--text-bright)", font: "inherit", fontSize: 14 }} />
        <select value={mfr} onChange={(e) => setMfr(e.target.value)} aria-label="Constructeur" style={{ padding: "9px 12px", background: "rgba(6,20,32,.6)", border: "1px solid var(--line)", color: "var(--text)", font: "inherit", fontSize: 13 }}>
          <option value="">Tous constructeurs</option>{mfrs.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div role="group" aria-label="Taille" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className={"tab" + (size === "" ? " active" : "")} aria-pressed={size === ""} onClick={() => setSize("")}>Toutes</button>
          {SIZES.map((s) => <button key={s} type="button" className={"tab" + (size === s ? " active" : "")} aria-pressed={size === s} onClick={() => setSize(s)}>{SIZE_FR[s]}</button>)}
        </div>
        <button type="button" className={"tab" + (onlyGame ? " active" : "")} aria-pressed={onlyGame} onClick={() => setOnlyGame((v) => !v)}>Uniquement en jeu</button>
      </div>
      {catalog.length === 0 ? (
        <div className="panel empty">{loadingCat ? "Chargement du catalogue FleetYards…" : "Catalogue indisponible."}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
          {results.map((s) => (
            <button key={s.id} type="button" className={"panel small img-card" + (sel?.id === s.id ? " active" : "")} style={{ textAlign: "left", color: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", outline: sel?.id === s.id ? "1px solid var(--rsi)" : undefined }} onClick={() => select(s)}>
              <Pic src={s.img} alt="" ratio="16 / 9" />
              <div className="img-body" style={{ padding: "10px 12px 12px", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="display" style={{ fontSize: 15, color: "var(--text-bright)" }}>{s.name}</span>
                  {isOwned(s) && <span className="mono" style={{ fontSize: 10, color: "var(--green)" }}>● FLOTTE</span>}
                </div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--dim)" }}>{s.mfrCode} · {SIZE_FR[s.size]?.toUpperCase() ?? s.sizeLabel.toUpperCase()} · {s.cls.toUpperCase()}</div>
                <div className="mono" style={{ fontSize: 11, color: s.inGame ? "var(--muted)" : "var(--dim)" }}>{s.priceAuec ? `${nf(s.priceAuec)} aUEC` : s.pledge != null ? `${nf(s.pledge)} $` : "—"}{!s.inGame ? ` · ${STATUS[s.status]?.label ?? s.status.toUpperCase()}` : ""}</div>
              </div>
            </button>
          ))}
          {results.length === 0 && <div className="panel empty">Aucun vaisseau pour ces filtres.</div>}
        </div>
      )}
      <div className="hint">Catalogue FleetYards (fleetyards.net), descriptions FR du wiki Star Citizen. SC-Univers n'est pas affilié à CIG.</div>
    </>
  );
}

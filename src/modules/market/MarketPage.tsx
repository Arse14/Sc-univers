import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { PLACES } from "../../lib/images";
import {
  age, auec, errText, findRoutes, isOld, loadCommodities, loadCommodityPrices, nf,
  type Commodity, type PriceRow, type Route, type RouteResult,
} from "./uex";
import "./market.css";

const PAGE = 150;
const SYSTEMS = ["Stanton", "Pyro", "Nyx"];
type SortKey = "name" | "kind" | "buy" | "sell" | "margin" | "pct";
type Legal = "all" | "legal" | "illegal";
type Form = "all" | "raw" | "refined";

const margin = (c: Commodity) => (c.buy > 0 && c.sell > 0 ? c.sell - c.buy : null);
const pct = (c: Commodity) => (c.buy > 0 && c.sell > 0 ? ((c.sell - c.buy) / c.buy) * 100 : null);
const LIMIT_FR: Record<Route["limit"], string> = { soute: "soute pleine", budget: "limité par le budget", stock: "limité par le stock", demande: "limité par la demande" };

type Detail =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; text: string }
  | { state: "ok"; rows: PriceRow[]; at: number; stale: boolean };

type RouteState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; text: string }
  | ({ state: "ok" } & RouteResult);

function Where({ r }: { r: { name: string; sys: string; body: string; place: string } }) {
  const loc = [r.sys, r.body, r.place].filter(Boolean).join(" ▸ ");
  return (
    <span className="mk-where">
      <b title={r.name}>{r.name || "Terminal inconnu"}</b>
      <small title={loc}>{loc || "lieu non renseigné"}</small>
    </span>
  );
}

function PriceList({ title, color, rows, side }: { title: string; color: string; rows: PriceRow[]; side: "buy" | "sell" }) {
  return (
    <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="label" style={{ color }}>{title} · {rows.length}</div>
      {rows.length === 0 ? (
        <div className="hint">{side === "buy" ? "Aucun terminal ne vend cette matière d'après les relevés UEX." : "Aucun terminal n'achète cette matière d'après les relevés UEX."}</div>
      ) : (
        <div className="sublist mk-list">
          {rows.slice(0, PAGE).map((r) => {
            const scu = side === "buy" ? r.scuBuy : r.scuSell;
            return (
              <div className="it" key={r.t} style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                <Where r={r} />
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  <span className="mk-num" style={{ color: "var(--text-bright)", fontSize: 15 }}>{auec(side === "buy" ? r.buy : r.sell)}</span>
                  <span className="mk-num" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {scu > 0 ? `${side === "buy" ? "stock" : "demande"} ${nf(scu)} SCU` : `${side === "buy" ? "stock" : "demande"} n. c.`}
                    {" · "}<span className={isOld(r.at) ? "mk-old" : undefined}>{age(r.at)}</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MarketPage() {
  const [list, setList] = useState<Commodity[]>([]);
  const [listAt, setListAt] = useState(0);
  const [listStale, setListStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [minAt, setMinAt] = useState(0);            // « Actualiser » : ignore ce qui est plus ancien

  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [legal, setLegal] = useState<Legal>("all");
  const [form, setForm] = useState<Form>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "margin", dir: -1 });
  const [shown, setShown] = useState(PAGE);

  const [selId, setSelId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail>({ state: "idle" });

  const [cargo, setCargo] = useState("64");
  const [budget, setBudget] = useState("");
  const [system, setSystem] = useState("");
  const [illegal, setIllegal] = useState(false);
  const [needStock, setNeedStock] = useState(true);
  const [routes, setRoutes] = useState<RouteState>({ state: "idle" });

  /* liste des matières */
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    loadCommodities(minAt)
      .then((r) => { if (!alive) return; setList(r.data); setListAt(r.at); setListStale(r.stale); })
      .catch((e) => { if (alive) setError(errText(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tick, minAt]);

  /* détail d'une matière : à la demande, la réponse d'une sélection dépassée est ignorée */
  useEffect(() => {
    if (selId == null) { setDetail({ state: "idle" }); return; }
    let alive = true;
    setDetail({ state: "loading" });
    loadCommodityPrices(selId, minAt)
      .then((r) => { if (alive) setDetail({ state: "ok", rows: r.data, at: r.at, stale: r.stale }); })
      .catch((e) => { if (alive) setDetail({ state: "error", text: errText(e) }); });
    return () => { alive = false; };
  }, [selId, tick, minAt]);

  const kinds = useMemo(() => [...new Set(list.map((c) => c.kind))].sort((a, b) => a.localeCompare(b, "fr")), [list]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = list.filter((c) =>
      (!needle || c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle)) &&
      (!kind || c.kind === kind) &&
      (legal === "all" || (legal === "illegal") === c.illegal) &&
      (form === "all" || (form === "raw" ? c.raw : c.refined)));
    const val = (c: Commodity): number | string | null =>
      sort.key === "name" ? c.name : sort.key === "kind" ? c.kind :
      sort.key === "buy" ? (c.buy || null) : sort.key === "sell" ? (c.sell || null) :
      sort.key === "margin" ? margin(c) : pct(c);
    out.sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null && y == null) return a.name.localeCompare(b.name, "fr");
      if (x == null) return 1;               // sans valeur : toujours en bas
      if (y == null) return -1;
      const d = typeof x === "string" ? x.localeCompare(y as string, "fr") : x - (y as number);
      return d * sort.dir || a.name.localeCompare(b.name, "fr");
    });
    return out;
  }, [list, q, kind, legal, form, sort]);

  useEffect(() => { setShown(PAGE); }, [q, kind, legal, form, sort]);

  const sel = selId == null ? null : list.find((c) => c.id === selId) ?? null;
  const topMargin = useMemo(() => {
    let best: Commodity | null = null;
    for (const c of list) { const m = margin(c); if (m != null && !c.illegal && (best == null || m > (margin(best) ?? 0))) best = c; }
    return best;
  }, [list]);

  const buys = useMemo(() => detail.state === "ok" ? detail.rows.filter((r) => r.buy > 0).sort((a, b) => a.buy - b.buy) : [], [detail]);
  const sells = useMemo(() => detail.state === "ok" ? detail.rows.filter((r) => r.sell > 0).sort((a, b) => b.sell - a.sell) : [], [detail]);

  const refresh = () => setMinAt(Date.now());
  const head = (key: SortKey, label: string, right = false) => (
    <button type="button" className={"mk-sort" + (right ? " r" : "") + (sort.key === key ? " on" : "")}
      aria-label={`Trier par ${label.toLowerCase()}`}
      onClick={() => setSort((s) => s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "kind" ? 1 : -1 })}>
      {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </button>
  );

  const cargoN = Math.floor(Number(cargo.replace(",", ".")));
  const budgetN = Math.floor(Number(budget.replace(/\s/g, "").replace(",", ".")));
  const cargoOk = isFinite(cargoN) && cargoN > 0;
  const budgetOk = budget.trim() === "" || (isFinite(budgetN) && budgetN > 0);
  const compute = (fresh = false) => {
    if (!cargoOk || !budgetOk || list.length === 0) return;
    setRoutes({ state: "loading" });
    findRoutes({ cargo: cargoN, budget: budget.trim() === "" ? 0 : budgetN, system, illegal, needStock }, list, fresh ? Date.now() : minAt)
      .then((r) => setRoutes({ state: "ok", ...r }))
      .catch((e) => setRoutes({ state: "error", text: errText(e) }));
  };

  const cols = "minmax(0, 2.2fr) minmax(0, 1.1fr) 110px 110px 110px 70px";

  return (
    <>
      <PageHeader crumb="COMMERCE ▸ MARCHÉ" title="Marché"
        sub="Prix des matières, où acheter et où vendre, et les routes les plus rentables pour ta soute."
        actions={<button type="button" className="btn" onClick={refresh} disabled={loading}>{loading ? "Chargement…" : "Actualiser les prix"}</button>}
        banner={{ src: PLACES.area18, kicker: "COMMERCE ▸ TERMINAUX DE STANTON, PYRO ET NYX", text: "Achète bas, vends haut : chaque prix affiché est un relevé envoyé par des joueurs à UEX, avec son âge. Vérifie toujours au terminal avant d'engager ta soute." }} />

      <Note tag="⚠ PRIX COMMUNAUTAIRES">
        Données UEX (uexcorp.space), relevées en jeu par les joueurs : elles peuvent être anciennes ou fausses.
        {listAt > 0 && <> Liste récupérée {age(listAt)}.</>}
        {listStale && <> <b>Hors ligne : affichage du dernier cache.</b></>}
      </Note>

      {error && list.length === 0 && (
        <div className="empty">
          <div style={{ marginBottom: 12 }}>{error}</div>
          <button type="button" className="btn sm" onClick={() => setTick((t) => t + 1)}>Réessayer</button>
        </div>
      )}
      {loading && list.length === 0 && !error && <div className="empty">Lecture des prix UEX…</div>}

      {list.length > 0 && (
        <>
          <section className="stat-grid" aria-label="Résumé">
            <Stat label="MATIÈRES SUIVIES" value={nf(list.length)} />
            <Stat label="DONT ILLÉGALES" value={nf(list.filter((c) => c.illegal).length)} />
            <Stat label="MEILLEURE MARGE MOYENNE / SCU" value={topMargin ? <span title={topMargin.name}>{nf(margin(topMargin))}</span> : "—"} amber />
          </section>

          <SectionHead n="01" title="MATIÈRES" />
          <div className="mk-filters">
            <label className="field">
              <span className="label">RECHERCHE</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou code (ex. Agricium, AGRI)" />
            </label>
            <label className="field narrow">
              <span className="label">FAMILLE</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">Toutes</option>
                {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="field narrow">
              <span className="label">LÉGALITÉ</span>
              <select value={legal} onChange={(e) => setLegal(e.target.value as Legal)}>
                <option value="all">Tout</option><option value="legal">Légal</option><option value="illegal">Illégal</option>
              </select>
            </label>
            <label className="field narrow">
              <span className="label">ÉTAT</span>
              <select value={form} onChange={(e) => setForm(e.target.value as Form)}>
                <option value="all">Tout</option><option value="raw">Brut</option><option value="refined">Raffiné</option>
              </select>
            </label>
          </div>
          <div className="hint">
            {nf(filtered.length)} matière(s). Achat et vente sont les prix moyens UEX par SCU ; la marge est leur différence, indicative (les meilleurs terminaux font mieux). Clique une ligne pour voir les terminaux.
          </div>

          <section className="mk-split">
            <div className="panel mk-scroll" style={{ flex: "3 1 560px", minWidth: 0, padding: 0 }}>
              <div className="table">
                <div className="head" style={{ gridTemplateColumns: cols }}>
                  {head("name", "Matière")}{head("kind", "Famille")}{head("buy", "Achat", true)}{head("sell", "Vente", true)}{head("margin", "Marge", true)}{head("pct", "%", true)}
                </div>
                {filtered.length === 0 && <div className="empty" style={{ border: 0 }}>Aucune matière ne correspond à ces filtres.</div>}
                {filtered.slice(0, shown).map((c) => {
                  const m = margin(c), p = pct(c);
                  return (
                    <button type="button" key={c.id} className={"row" + (c.id === selId ? " active" : "")} style={{ gridTemplateColumns: cols }}
                      aria-pressed={c.id === selId} onClick={() => setSelId(c.id)}>
                      <span style={{ minWidth: 0 }}>
                        <span className="cell-main" style={{ fontSize: 16 }}>{c.name}</span>
                        {c.illegal && <span className="mk-tag warn">ILLÉGAL</span>}
                        {c.raw && <span className="mk-tag">BRUT</span>}
                        {c.refined && <span className="mk-tag cyan">RAFFINÉ</span>}
                      </span>
                      <span className="cell-muted">{c.kind}</span>
                      <span className="mk-num">{c.buy > 0 ? nf(c.buy) : "—"}</span>
                      <span className="mk-num">{c.sell > 0 ? nf(c.sell) : "—"}</span>
                      <span className={"mk-num " + (m == null ? "" : m > 0 ? "good" : "bad")}>{m == null ? "—" : nf(m)}</span>
                      <span className="mk-num" style={{ color: "var(--muted)" }}>{p == null ? "—" : `${nf(p, 1)} %`}</span>
                    </button>
                  );
                })}
              </div>
              {filtered.length > shown && (
                <div style={{ padding: 12, textAlign: "center" }}>
                  <button type="button" className="btn sm" onClick={() => setShown((n) => n + PAGE)}>Afficher {Math.min(PAGE, filtered.length - shown)} de plus</button>
                </div>
              )}
            </div>

            <div className="panel" style={{ flex: "2 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="label">// MATIÈRE SÉLECTIONNÉE</div>
              {!sel && <div className="hint">Choisis une matière dans la liste pour voir où l'acheter au moins cher et où la vendre au plus cher.</div>}
              {sel && (
                <>
                  <div>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: sel.illegal ? "var(--amber)" : "var(--cyan)" }}>
                      {sel.code} · {sel.kind.toUpperCase()}{sel.illegal ? " · ILLÉGAL" : ""}{sel.raw ? " · BRUT" : ""}{sel.refined ? " · RAFFINÉ" : ""}
                    </div>
                    <div className="display" style={{ fontSize: 26, lineHeight: 1.1, color: "var(--text-bright)", marginTop: 6 }}>{sel.name}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="kv"><span className="k">ACHAT MOYEN / SCU</span><span className="v">{auec(sel.buy)}</span></div>
                    <div className="kv"><span className="k">VENTE MOYENNE / SCU</span><span className="v">{auec(sel.sell)}</span></div>
                    {detail.state === "ok" && buys.length > 0 && sells.length > 0 && (
                      <div className="kv"><span className="k">MEILLEUR ÉCART RELEVÉ / SCU</span><span className="v good">{nf(sells[0].sell - buys[0].buy)} aUEC</span></div>
                    )}
                  </div>
                  {detail.state === "loading" && <div className="hint">Lecture des terminaux…</div>}
                  {detail.state === "error" && (
                    <div className="note"><span className="tag">ERREUR</span><span>{detail.text}</span>
                      <button type="button" className="btn sm" onClick={() => setTick((t) => t + 1)}>Réessayer</button></div>
                  )}
                  {detail.state === "ok" && (
                    <>
                      <div className="hint">
                        Relevés UEX récupérés {age(detail.at)}{detail.stale ? " — hors ligne, dernier cache affiché" : ""}. L'âge indiqué sur chaque ligne est celui du relevé du joueur.
                        {detail.rows.length === 0 && " Aucun terminal renseigné pour cette matière."}
                      </div>
                      <div className="mk-split" style={{ gap: 16 }}>
                        <PriceList title="OÙ ACHETER (MOINS CHER D'ABORD)" color="var(--green)" rows={buys} side="buy" />
                        <PriceList title="OÙ VENDRE (PLUS CHER D'ABORD)" color="var(--amber)" rows={sells} side="sell" />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>

          <SectionHead n="02" title="MEILLEURES ROUTES" />
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="mk-filters">
              <label className="field narrow">
                <span className="label">SOUTE (SCU)</span>
                <input type="number" min={1} step={1} value={cargo} onChange={(e) => setCargo(e.target.value)} />
              </label>
              <label className="field narrow">
                <span className="label">BUDGET (aUEC)</span>
                <input type="number" min={0} step={1000} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Sans limite" />
              </label>
              <label className="field narrow">
                <span className="label">SYSTÈME</span>
                <select value={system} onChange={(e) => setSystem(e.target.value)}>
                  <option value="">Tous (trajets entre systèmes inclus)</option>
                  {SYSTEMS.map((s) => <option key={s} value={s}>{s} uniquement</option>)}
                </select>
              </label>
              <label className="mk-check"><input type="checkbox" checked={needStock} onChange={(e) => setNeedStock(e.target.checked)} />Stock connu à l'achat</label>
              <label className="mk-check"><input type="checkbox" checked={illegal} onChange={(e) => setIllegal(e.target.checked)} />Inclure l'illégal</label>
              <button type="button" className="btn primary" onClick={() => compute(false)} disabled={!cargoOk || !budgetOk || routes.state === "loading"}>
                {routes.state === "loading" ? "Calcul…" : "Calculer"}
              </button>
            </div>
            {(!cargoOk || !budgetOk) && <div className="hint mk-old">Indique une capacité de soute supérieure à 0{!budgetOk ? " et un budget valide (ou laisse-le vide)" : ""}.</div>}
            <div className="hint">
              Routes <b>calculées dans l'application</b> à partir des prix par terminal publiés par UEX (et non reprises de son calculateur) : quantité = le plus petit entre ta soute, ce que ton budget permet, le stock relevé à l'achat et la demande relevée à la vente. Distance et temps de trajet ne sont pas pris en compte ; les terminaux tenus par des joueurs sont écartés.
            </div>

            {routes.state === "error" && <div className="note"><span className="tag">ERREUR</span><span>{routes.text}</span></div>}
            {routes.state === "ok" && (
              <>
                <div className="mk-status">
                  <span className="hint">
                    {nf(routes.scanned)} couple(s) achat → vente rentables examinés · prix récupérés {age(routes.at)}
                    {routes.stale ? " — hors ligne, dernier cache utilisé" : ""}.
                  </span>
                  <button type="button" className="btn sm" onClick={() => compute(true)}>Recalculer avec des prix frais</button>
                </div>
                {routes.routes.length === 0 ? (
                  <div className="empty">Aucune route rentable avec ces critères. Essaie d'augmenter le budget, d'élargir le système ou de décocher « Stock connu à l'achat ».</div>
                ) : (
                  <div className="mk-scroll">
                    <div className="table" style={{ minWidth: 860 }}>
                      <div className="head" style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.6fr) minmax(0, 1.6fr) 90px 130px 130px" }}>
                        <span>MATIÈRE</span><span>ACHETER À</span><span>VENDRE À</span><span className="mk-r">SCU</span><span className="mk-r">MISE</span><span className="mk-r">PROFIT / TRAJET</span>
                      </div>
                      {routes.routes.map((r) => (
                        <div className="row" key={r.key} style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.6fr) minmax(0, 1.6fr) 90px 130px 130px" }}>
                          <span className="mk-where">
                            <b>{r.commodity}{r.illegal && <span className="mk-tag warn">ILLÉGAL</span>}</b>
                            <small className={isOld(r.at) ? "mk-old" : undefined}>relevé le plus ancien : {age(r.at)}</small>
                          </span>
                          <span className="mk-where"><Where r={r.from} /><small>{nf(r.buy)} aUEC / SCU{r.stockKnown ? "" : " · stock n. c."}</small></span>
                          <span className="mk-where"><Where r={r.to} /><small>{nf(r.sell)} aUEC / SCU</small></span>
                          <span className="mk-where" style={{ alignItems: "flex-end" }}><span className="mk-num">{nf(r.qty)}</span><small>{LIMIT_FR[r.limit]}</small></span>
                          <span className="mk-num">{nf(r.invest)}</span>
                          <span className="mk-num good" style={{ fontSize: 16 }}>+{nf(r.profit)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {routes.state === "idle" && <div className="hint">Renseigne ta soute, puis lance le calcul : les prix de tous les terminaux sont téléchargés une fois, puis gardés 30 minutes.</div>}
          </div>
        </>
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { SectionHead, Note } from "../../components/Hud";
import { Pic } from "../../components/Pic";
import { nf } from "../market/uex";
import {
  CONTRACTS, FAVOR_WAYS, REP_FR, WIKELO_CATS, WIKELO_DATE, favorCost, givesBlueprint, loadWikelo, mainReward, saveWikelo, shoppingList,
  type Contract, type Line, type WikeloCat, type WikeloState,
} from "./wikelo";

type Filter = "all" | "wanted" | WikeloCat;
type Sort = "name" | "favor" | "size";

const qty = (l: Line) => l.unit === "SCU" ? `${nf(l.qty)} SCU` : `${nf(l.qty)}×`;
const CAT_FR: Record<WikeloCat, string> = { ship: "VAISSEAU / VÉHICULE", weapon: "ARME", armor: "ARMURE", currency: "MONNAIE", other: "AUTRE" };

function Lines({ lines, max }: { lines: Line[]; max?: number }) {
  const shown = max ? lines.slice(0, max) : lines;
  return (
    <ul className="wk-lines">
      {shown.map((l, i) => (
        <li key={i}><span className="q">{l.blueprint ? "PLAN" : qty(l)}</span><span>{l.name}</span></li>
      ))}
    </ul>
  );
}

function Card({ c, state, toggle }: { c: Contract; state: WikeloState; toggle: (k: keyof WikeloState, id: string) => void }) {
  const [open, setOpen] = useState(false);
  const wanted = state.wanted.includes(c.id);
  const done = state.done.includes(c.id);
  const main = mainReward(c);
  const fav = favorCost(c);
  const extraRewards = c.rewards.length - 1;
  const LIMIT = 6;
  return (
    <article className={"panel small wk-card" + (done ? " done" : "") + (wanted ? " wanted" : "")}>
      <Pic src={c.large} fallbackSrc={c.thumb} alt={main.name} ratio="16 / 10" fit="contain" />
      <div className="wk-body">
        <div className="mono wk-kicker">
          {CAT_FR[c.cat]}
          {fav > 0 && <span className="mk-tag cyan">{fav} FAVEUR{fav > 1 ? "S" : ""}</span>}
          {givesBlueprint(c) && <span className="mk-tag">PLAN INCLUS</span>}
          {c.rep && <span className="mk-tag warn">RÉP. {(REP_FR[c.rep] ?? c.rep).toUpperCase()}</span>}
        </div>
        <div className="display wk-title">{main.name}</div>
        <div className="hint">Contrat « {c.name} »{extraRewards > 0 ? ` · ${c.rewards.length} récompenses` : ""}</div>

        <div className="label wk-sub">À LUI APPORTER · {c.orders.length}</div>
        <Lines lines={c.orders} max={open ? undefined : LIMIT} />
        {open && c.rewards.length > 1 && (
          <>
            <div className="label wk-sub" style={{ color: "var(--green)" }}>IL DONNE · {c.rewards.length}</div>
            <Lines lines={c.rewards} />
          </>
        )}
        {(c.orders.length > LIMIT || c.rewards.length > 1) && (
          <button type="button" className="wk-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Réduire" : c.orders.length > LIMIT ? `Tout voir (+${c.orders.length - LIMIT} demandes)` : "Voir toutes les récompenses"}
          </button>
        )}
        <div className="wk-actions">
          <button type="button" className="btn sm" aria-pressed={wanted} onClick={() => toggle("wanted", c.id)}
            style={wanted ? { background: "rgba(79,179,255,.28)", color: "#fff", borderColor: "var(--rsi)" } : undefined}>{wanted ? "★ Dans ma liste" : "☆ Ça m'intéresse"}</button>
          <button type="button" className="btn sm" aria-pressed={done} onClick={() => toggle("done", c.id)}
            style={done ? { background: "rgba(80,220,140,.2)", color: "#fff", borderColor: "var(--green)" } : undefined}>{done ? "✓ Fait" : "Marquer fait"}</button>
        </div>
      </div>
    </article>
  );
}

export function WikeloView() {
  const [state, setState] = useState<WikeloState>({ wanted: [], done: [] });
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [need, setNeed] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [hideDone, setHideDone] = useState(false);

  useEffect(() => { let alive = true; loadWikelo().then((s) => { if (alive) { setState(s); setReady(true); } }); return () => { alive = false; }; }, []);
  const toggle = (k: keyof WikeloState, id: string) => setState((s) => {
    const next = { ...s, [k]: s[k].includes(id) ? s[k].filter((x) => x !== id) : [...s[k], id] };
    if (ready) void saveWikelo(next);
    return next;
  });

  const ingredients = useMemo(() => [...new Set(CONTRACTS.flatMap((c) => c.orders.map((o) => o.name)))].sort((a, b) => a.localeCompare(b, "fr")), []);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = CONTRACTS.filter((c) =>
      (filter === "all" || (filter === "wanted" ? state.wanted.includes(c.id) : c.cat === filter)) &&
      (!need || c.orders.some((o) => o.name === need)) &&
      (!hideDone || !state.done.includes(c.id)) &&
      (!needle || c.name.toLowerCase().includes(needle) || c.rewards.some((r) => r.name.toLowerCase().includes(needle)) || c.orders.some((o) => o.name.toLowerCase().includes(needle))));
    const by: Record<Sort, (a: Contract, b: Contract) => number> = {
      name: (a, b) => mainReward(a).name.localeCompare(mainReward(b).name, "fr"),
      favor: (a, b) => favorCost(a) - favorCost(b) || a.orders.length - b.orders.length,
      size: (a, b) => a.orders.reduce((n, o) => n + o.qty, 0) - b.orders.reduce((n, o) => n + o.qty, 0),
    };
    return out.sort(by[sort]);
  }, [filter, q, need, sort, hideDone, state]);

  const wantedList = useMemo(() => CONTRACTS.filter((c) => state.wanted.includes(c.id) && !state.done.includes(c.id)), [state]);
  const shopping = useMemo(() => shoppingList(wantedList), [wantedList]);
  const count = (f: Filter) => f === "all" ? CONTRACTS.length : f === "wanted" ? state.wanted.length : CONTRACTS.filter((c) => c.cat === f).length;

  return (
    <>
      <Note tag="WIKELO">
        Collectionneur banu : il échange des objets rares (butin, minerais, médailles) contre des vaisseaux, armes et armures en version spéciale. On le trouve dans ses stations Wikelo Emporium (Dasi, Selo et Kinga).
        Liste relevée sur le wiki communautaire le {WIKELO_DATE} : ses offres changent d'un patch à l'autre, vérifie en jeu avant de farmer.
      </Note>

      <div className="panel small">
        <div className="label" style={{ marginBottom: 8 }}>OBTENIR 1 FAVEUR DE WIKELO (WIKELO FAVOR)</div>
        <div className="wk-favor">
          {FAVOR_WAYS.map((o) => <span key={o.name}><b>{qty(o)}</b> {o.name}</span>)}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>Les Faveurs sont la monnaie de presque tous ses contrats de vaisseaux. Le « Polaris Bit » s'obtient contre 24 SCU de Quantainium.</div>
      </div>

      {wantedList.length > 0 && (
        <>
          <SectionHead n="★" title={`MA LISTE DE COURSES ▸ ${wantedList.length} CONTRAT${wantedList.length > 1 ? "S" : ""}`} />
          <div className="panel">
            <div className="hint" style={{ marginBottom: 10 }}>Total de ce qu'il faut réunir pour : {wantedList.map((c) => mainReward(c).name).join(" · ")}.</div>
            <div className="wk-shop">
              {shopping.map((l) => (
                <div className="kv" key={l.unit + l.name}><span style={{ minWidth: 0 }}>{l.name}{l.from > 1 && <small className="cell-muted"> · {l.from} contrats</small>}</span><span className="v mk-num">{qty(l)}</span></div>
              ))}
            </div>
          </div>
        </>
      )}

      <SectionHead n="01" title="CONTRATS" />
      <div role="group" aria-label="Type de récompense" className="mk-cats">
        {([{ id: "all", label: "Tous" }, ...WIKELO_CATS, { id: "wanted", label: "★ Ma liste" }] as { id: Filter; label: string }[]).map((f) => (
          <button key={f.id} type="button" className={"tab" + (filter === f.id ? " active" : "")} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label} · {count(f.id)}</button>
        ))}
      </div>
      <div className="mk-filters">
        <label className="field">
          <span className="label">RECHERCHE</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vaisseau, arme, armure ou objet demandé" />
        </label>
        <label className="field narrow" style={{ flexBasis: 260 }}>
          <span className="label">J'AI CET OBJET</span>
          <select value={need} onChange={(e) => setNeed(e.target.value)}>
            <option value="">N'importe lequel</option>
            {ingredients.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="field narrow" style={{ flexBasis: 220 }}>
          <span className="label">TRI</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="name">Nom de la récompense</option>
            <option value="favor">Moins de Faveurs d'abord</option>
            <option value="size">Moins d'objets à réunir d'abord</option>
          </select>
        </label>
        <label className="mk-check"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Masquer les contrats faits</label>
      </div>
      <div className="hint">{list.length} contrat(s) affiché(s). Les noms d'objets sont ceux du jeu en anglais, pour les retrouver tels quels dans l'inventaire.</div>

      {list.length === 0
        ? <div className="empty">{filter === "wanted" && state.wanted.length === 0 ? "Ta liste est vide : clique sur « ☆ Ça m'intéresse » sur les contrats que tu veux faire." : "Aucun contrat ne correspond à ces filtres."}</div>
        : <section className="wk-grid">{list.map((c) => <Card key={c.id} c={c} state={state} toggle={toggle} />)}</section>}
    </>
  );
}

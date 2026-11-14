import { useEffect, useMemo, useState } from "react";
import { Note } from "../../components/Hud";
import { Pic } from "../../components/Pic";
import { age, auec, errText, isOld, nf } from "../market/uex";
import { ItemThumb, useItemPic } from "./pics";
import { SLOT_FR, loadArmorSets, oneStopShops, variantTotal, type ArmorSet, type Offer, type SetPiece, type SetsResult, type SetVariant } from "./sets";

const SYSTEMS = ["Stanton", "Pyro", "Nyx"];
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const SYS_COLOR: Record<string, string> = { Stanton: "#4fb3ff", Pyro: "#ff8a4c", Nyx: "#b58cff" };
/** Pastille du système stellaire, de sa couleur. */
function SysBadge({ sys }: { sys: string }) {
  return <span className="sys-badge" style={{ ["--sc" as string]: SYS_COLOR[sys] ?? "#8fa3b3" }}>{sys || "?"}</span>;
}

/** Une ligne de point de vente : système, boutique, lieu, écart avec le moins cher, prix. */
function OfferRow({ sys, name, where, price, base, old, tag }: { sys: string; name: string; where: string; price: number; base?: number; old?: string; tag?: string }) {
  const extra = base != null && price > base ? price - base : 0;
  return (
    <div className="offer-row">
      <SysBadge sys={sys} />
      <span className="offer-name">{name}{where && <small> {where}</small>}{old && <small> · relevé {old}</small>}</span>
      <span className={"offer-extra" + (extra > 0 ? "" : " same")}>{tag ?? (extra > 0 ? `+${nf(extra)}` : base != null ? "même prix" : "")}</span>
      <span className="offer-price">{auec(price)}</span>
    </div>
  );
}
const placeOf = (o: Offer) => [o.place, o.body].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ");

function PieceRow({ p, sys }: { p: SetPiece; sys: string }) {
  const [open, setOpen] = useState(false);
  const offers = sys ? p.offers.filter((o) => o.sys === sys) : p.offers;
  const best = offers[0];
  return (
    <div className={"set-piece" + (open ? " open" : "")}>
      <ItemThumb item={p.item} size={64} />
      <div style={{ minWidth: 0 }}>
        <div className="mono set-slot">{SLOT_FR[p.slot].toUpperCase()}</div>
        <div className="cell-main" style={{ fontSize: 15 }}>{p.item.name}</div>
        {best ? (
          <div className="set-where">
            <SysBadge sys={best.sys} /> <b>{best.terminal}</b>{placeOf(best) && <span className="cell-muted"> · {placeOf(best)}</span>}
            {best.at > 0 && isOld(best.at) && <span className="cell-muted"> · relevé {age(best.at)}</span>}
          </div>
        ) : (
          <div className="set-where cell-muted">{p.offers.length ? `Pas vendu dans ${sys} : disponible dans ${[...new Set(p.offers.map((o) => o.sys))].join(", ")}` : "Aucune boutique relevée : butin, récompense ou objet de boutique RSI."}</div>
        )}
      </div>
      <div className="set-price">
        <div className="mk-num">{best ? auec(best.price) : "—"}</div>
        {offers.length > 1 && (
          <button type="button" className="more-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span className="chev" aria-hidden="true">▸</span>{open ? "Masquer" : `${offers.length - 1} autre${offers.length > 2 ? "s" : ""} boutique${offers.length > 2 ? "s" : ""}`}
          </button>
        )}
      </div>
      {open && (
        <div className="offer-list">
          {offers.slice(1).map((o, i) => <OfferRow key={o.t + "-" + i} sys={o.sys} name={o.terminal} where={placeOf(o)} price={o.price} base={best.price} old={o.at > 0 && isOld(o.at) ? age(o.at) : undefined} />)}
        </div>
      )}
    </div>
  );
}

function VariantChip({ v, active, onClick }: { v: SetVariant; active: boolean; onClick: () => void }) {
  const lead = v.pieces.find((p) => p.slot === "core") ?? v.pieces.find((p) => p.slot === "helmet") ?? v.pieces[0];
  return (
    <button type="button" className={"eq-variant" + (active ? " active" : "")} aria-pressed={active} onClick={onClick} title={`${v.name} · ${v.pieces.length} pièce(s)`}>
      <ItemThumb item={lead.item} size={56} />
      <span>{v.name}</span>
    </button>
  );
}

function Detail({ set, sys }: { set: ArmorSet; sys: string }) {
  const [vName, setVName] = useState(set.variants[0].name);
  const v = set.variants.find((x) => x.name === vName) ?? set.variants[0];
  const lead = v.pieces.find((p) => p.slot === "core") ?? v.pieces.find((p) => p.slot === "helmet") ?? v.pieces[0];
  const pic = useItemPic(lead.item);
  const { total, unsold } = variantTotal(v, sys);
  const shops = useMemo(() => oneStopShops(v).filter((s) => !sys || s.sys === sys), [v, sys]);
  const absent = set.slots.filter((s) => !v.pieces.some((p) => p.slot === s));
  return (
    <div className="panel" style={{ flex: "3 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        {pic !== null && <div style={{ flex: "0 1 260px", minWidth: 180 }}><Pic key={lead.item.id} src={pic?.full ?? null} alt={lead.item.name} ratio="4 / 3" fit="contain" className="eq-hero" /></div>}
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: "var(--cyan)" }}>ENSEMBLE{set.company ? ` · ${set.company.toUpperCase()}` : ""}</div>
          <div className="display" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--text-bright)", marginTop: 4 }}>{set.name}</div>
          <div style={{ marginTop: 4, color: "var(--muted)" }}>Coloris <b style={{ color: "var(--text-bright)" }}>{v.name}</b> · {v.pieces.length} pièce{v.pieces.length > 1 ? "s" : ""} sur {set.slots.length}</div>
          <div className="set-total">
            <div><div className="label">ENSEMBLE AU MOINS CHER{sys ? ` (${sys.toUpperCase()})` : ""}</div><div className="display" style={{ fontSize: 24, color: "var(--text-bright)" }}>{total > 0 ? auec(total) : "—"}</div></div>
            {unsold > 0 && <div className="hint" style={{ margin: 0 }}>{unsold} pièce{unsold > 1 ? "s" : ""} sans boutique{sys ? ` dans ${sys}` : ""}, non comptée{unsold > 1 ? "s" : ""}.</div>}
          </div>
        </div>
      </div>

      {set.variants.length > 1 && (
        <div>
          <div className="label" style={{ marginBottom: 6 }}>COLORIS · {set.variants.length}</div>
          <div role="group" aria-label="Coloris" className="eq-variants">
            {set.variants.map((x) => <VariantChip key={x.name} v={x} active={x.name === v.name} onClick={() => setVName(x.name)} />)}
          </div>
        </div>
      )}

      <div>
        <div className="label" style={{ marginBottom: 6 }}>PIÈCES ET LIEUX D'ACHAT</div>
        {v.pieces.map((p) => <PieceRow key={p.item.id} p={p} sys={sys} />)}
        {absent.length > 0 && <div className="hint">Pas de {absent.map((s) => SLOT_FR[s].toLowerCase()).join(", ")} dans ce coloris d'après UEX (la pièce existe dans d'autres coloris de la gamme).</div>}
      </div>

      {shops.length > 0 && (
        <div>
          <div className="label" style={{ color: "var(--green)", marginBottom: 6 }}>TOUT ACHETER AU MÊME ENDROIT · {shops.length} BOUTIQUE{shops.length > 1 ? "S" : ""}</div>
          <div className="offer-list plain">
            {shops.slice(0, 8).map((x, i) => <OfferRow key={x.terminal} sys={x.sys} name={x.terminal} where={x.where} price={x.total} base={shops[0].total} tag={i === 0 ? "le moins cher" : undefined} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function SetsView() {
  const [res, setRes] = useState<SetsResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");
  const [sys, setSys] = useState("");
  const [company, setCompany] = useState("");
  const [full, setFull] = useState(true);
  const [key, setKey] = useState<string | null>(null);
  const [shown, setShown] = useState(80);

  const load = (force: boolean) => { setBusy(true); setErr(null); loadArmorSets(force ? Date.now() : 0).then(setRes).catch((e) => setErr(errText(e))).finally(() => setBusy(false)); };
  useEffect(() => load(false), []);

  const companies = useMemo(() => [...new Set((res?.sets ?? []).map((s) => s.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")), [res]);
  const list = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    return (res?.sets ?? []).filter((s) =>
      (!full || s.slots.length >= 3) &&
      (!company || s.company === company) &&
      (!sys || s.variants.some((v) => v.pieces.some((p) => p.offers.some((o) => o.sys === sys)))) &&
      (words.length === 0 || words.every((w) => fold(`${s.name} ${s.company} ${s.variants.map((v) => v.name).join(" ")}`).includes(w))));
  }, [res, q, sys, company, full]);
  const sel = list.find((s) => s.key === key) ?? list[0] ?? null;

  if (!res) return busy ? <div className="panel empty">Assemblage des ensembles d'armure (six catégories UEX)…</div> : (
    <div className="panel empty"><div>Ensembles indisponibles : UEX n'a pas répondu{err ? ` (${err})` : ""}.</div><button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => load(true)}>Réessayer</button></div>
  );

  return (
    <>
      <Note tag="ENSEMBLES D'ARMURE">
        Chaque gamme réunit ses pièces (casque, torse, bras, jambes, sac, sous-combinaison), par coloris, avec le lieu d'achat de chacune. Le rapprochement se fait sur les noms des objets : un casque vendu sous un autre nom que sa gamme apparaît à part.
        Prix UEX relevés par les joueurs, mis à jour {age(res.at)}{res.stale ? " (cache, UEX injoignable)" : ""}.{res.missing.length > 0 && ` Catégories non reçues : ${res.missing.join(", ")}.`}
      </Note>
      <div className="mk-filters">
        <label className="field"><span className="label">RECHERCHE</span><input type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(80); }} placeholder="Gamme, fabricant ou coloris (ADP, Morozov, red…)" /></label>
        {companies.length > 1 && (
          <label className="field narrow" style={{ flexBasis: 220 }}><span className="label">FABRICANT</span>
            <select value={company} onChange={(e) => setCompany(e.target.value)}><option value="">Tous</option>{companies.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
        )}
        <label className="field narrow" style={{ flexBasis: 180 }}><span className="label">VENDU DANS</span>
          <select value={sys} onChange={(e) => setSys(e.target.value)}><option value="">Tous les systèmes</option>{SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </label>
        <label className="mk-check"><input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> Ensembles d'au moins 3 pièces</label>
        <button type="button" className="btn sm" onClick={() => load(true)} disabled={busy}>{busy ? "Chargement…" : "Actualiser"}</button>
      </div>
      <div className="hint">{nf(list.length)} ensemble(s) sur {nf(res.sets.length)}.</div>

      <section className="mk-split">
        <div className="panel mk-scroll" style={{ flex: "2 1 360px", minWidth: 0, padding: 0 }}>
          <div className="table" style={{ minWidth: 0 }}>
            <div className="head" style={{ gridTemplateColumns: "minmax(0,1fr) 90px" }}><span>ENSEMBLE</span><span className="mk-r">DÈS</span></div>
            {list.length === 0 && <div className="empty" style={{ border: 0 }}>Aucun ensemble ne correspond à ces filtres.</div>}
            {list.slice(0, shown).map((s) => {
              const lead = s.variants[0].pieces.find((p) => p.slot === "core") ?? s.variants[0].pieces[0];
              const totals = s.variants.map((v) => variantTotal(v, sys)).filter((t) => t.total > 0 && t.unsold === 0).map((t) => t.total);
              return (
                <button type="button" key={s.key} className={"row" + (sel?.key === s.key ? " active" : "")} style={{ gridTemplateColumns: "minmax(0,1fr) 90px" }} aria-pressed={sel?.key === s.key} onClick={() => setKey(s.key)}>
                  <span className="eq-name">
                    <ItemThumb item={lead.item} />
                    <span style={{ minWidth: 0, overflow: "hidden" }}>
                      <span className="cell-main" style={{ fontSize: 16 }}>{s.name}</span>
                      <span className="mk-tag cyan">{s.variants.length} COLORIS</span>
                      <small className="cell-muted set-sub">{s.slots.length} pièces{s.company ? ` · ${s.company}` : ""}</small>
                    </span>
                  </span>
                  <span className="mk-num" style={{ textAlign: "right" }}>{totals.length ? nf(Math.min(...totals)) : "—"}</span>
                </button>
              );
            })}
          </div>
          {list.length > shown && <div style={{ padding: 12, textAlign: "center" }}><button type="button" className="btn sm" onClick={() => setShown((n) => n + 80)}>Afficher 80 de plus</button></div>}
        </div>
        {sel && <Detail key={sel.key} set={sel} sys={sys} />}
      </section>
      <div className="hint">« Dès » : prix du coloris le moins cher dont toutes les pièces sont en vente, en prenant chaque pièce à son meilleur prix (en aUEC).</div>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Note } from "../../components/Hud";
import { Pic } from "../../components/Pic";
import { age, auec, errText, isOld, nf, type Loaded } from "../market/uex";
import { attrLabel, loadItemDetail, type ItemAttr } from "../equipment/items";
import { ItemThumb, useItemPic } from "../equipment/pics";
import { GROUND_INFO, SHOP_KINDS, SYSTEMS, loadMiningShop, minPrice, systemsOf, type MiningShop, type Offer, type ShopItem, type ShopKind } from "./shop";
import "../market/market.css";

const whereText = (o: Offer) => [o.place, o.body].filter(Boolean).join(" · ") || o.terminal;

/** Points de vente regroupés par système, du moins cher au plus cher. */
function Offers({ offers, sys, unit = "" }: { offers: Offer[]; sys: string; unit?: string }) {
  const shown = sys ? offers.filter((o) => o.sys === sys) : offers;
  if (offers.length === 0) return <div className="hint">Aucun point de vente relevé : objet non vendu (livré avec un vaisseau, butin) ou pas encore signalé sur UEX.</div>;
  if (shown.length === 0) return <div className="hint">Pas vendu dans {sys} d'après UEX. Disponible dans : {systemsOf(offers).join(", ") || "lieu non précisé"}.</div>;
  const groups = [...new Set(shown.map((o) => o.sys || "Lieu non précisé"))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {groups.map((g) => (
        <div key={g}>
          <div className="label" style={{ color: "var(--cyan)", marginBottom: 4 }}>{g.toUpperCase()}</div>
          {shown.filter((o) => (o.sys || "Lieu non précisé") === g).map((o, i) => (
            <div className="kv" key={o.terminal + i}>
              <span style={{ minWidth: 0 }}>{o.terminal}{whereText(o) !== o.terminal && <small className="cell-muted"> · {whereText(o)}</small>}{o.at > 0 && isOld(o.at) && <small className="cell-muted"> · relevé {age(o.at)}</small>}</span>
              <span className="v mk-num">{auec(o.price)}{unit}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Detail({ item, sys }: { item: ShopItem; sys: string }) {
  const pic = useItemPic(item);
  const [attrs, setAttrs] = useState<ItemAttr[] | null>(null);
  useEffect(() => {
    let alive = true; setAttrs(null);
    loadItemDetail(item.id).then((d) => { if (alive) setAttrs(d.data.attrs); }).catch(() => { if (alive) setAttrs([]); });
    return () => { alive = false; };
  }, [item.id]);
  return (
    <div className="panel" style={{ flex: "2 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="label">// OBJET SÉLECTIONNÉ</div>
      {pic !== null && <Pic key={item.id} src={pic?.full ?? null} alt={item.name} ratio="16 / 10" fit="contain" className="eq-hero" />}
      <div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: "var(--cyan)" }}>{(item.company || "FABRICANT INCONNU").toUpperCase()}</div>
        <div className="display" style={{ fontSize: 24, lineHeight: 1.15, color: "var(--text-bright)" }}>{item.name}</div>
      </div>
      {attrs === null ? <div className="hint">Chargement des caractéristiques…</div> : attrs.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 4 }}>CARACTÉRISTIQUES</div>
          {attrs.slice(0, 16).map((a) => <div className="kv" key={a.k}><span>{attrLabel(a.k)}</span><span className="v">{a.v}{a.u ? ` ${a.u}` : ""}</span></div>)}
        </div>
      )}
      <div>
        <div className="label" style={{ marginBottom: 6 }}>OÙ L'ACHETER · {item.offers.length} POINT{item.offers.length > 1 ? "S" : ""} DE VENTE</div>
        <Offers offers={item.offers} sys={sys} />
      </div>
    </div>
  );
}

export function MiningShopView() {
  const [shop, setShop] = useState<Loaded<MiningShop> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [kind, setKind] = useState<ShopKind>("head");
  const [sys, setSys] = useState("");
  const [selId, setSelId] = useState<number | null>(null);

  const load = (force: boolean) => {
    setBusy(true); setErr(null);
    loadMiningShop(force ? Date.now() : 0).then(setShop).catch((e) => setErr(errText(e))).finally(() => setBusy(false));
  };
  useEffect(() => load(false), []);

  const list = useMemo(() => (shop?.data.items ?? []).filter((i) => i.kind === kind), [shop, kind]);
  const sel = list.find((i) => i.id === selId) ?? list[0] ?? null;
  const info = SHOP_KINDS.find((k) => k.id === kind)!;
  const COLS = "minmax(0, 2.2fr) 130px minmax(0, 1fr)";

  if (!shop) return busy ? <div className="panel empty">Chargement des prix du matériel de minage…</div> : (
    <div className="panel empty"><div>Prix indisponibles : UEX n'a pas répondu{err ? ` (${err})` : ""}.</div><button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => load(true)}>Réessayer</button></div>
  );

  return (
    <>
      <Note tag="⚠ PRIX COMMUNAUTAIRES">Prix et lieux relevés en jeu par les joueurs (UEX), mis à jour {age(shop.at)}{shop.stale ? " — données en cache, UEX injoignable" : ""}. Un objet absent d'un système n'y a simplement pas été signalé.</Note>
      <div className="mk-filters">
        <div role="group" aria-label="Type de matériel" className="mk-cats" style={{ flex: "1 1 auto" }}>
          {SHOP_KINDS.map((k) => <button key={k.id} type="button" className={"tab" + (kind === k.id ? " active" : "")} aria-pressed={kind === k.id} onClick={() => { setKind(k.id); setSelId(null); }}>{k.label} · {(shop.data.items.filter((i) => i.kind === k.id).length)}</button>)}
        </div>
        <label className="field narrow" style={{ flexBasis: 200 }}>
          <span className="label">SYSTÈME</span>
          <select value={sys} onChange={(e) => setSys(e.target.value)}>
            <option value="">Tous les systèmes</option>
            {SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="button" className="btn sm" onClick={() => load(true)} disabled={busy}>{busy ? "Chargement…" : "Actualiser les prix"}</button>
      </div>
      <div className="hint">{info.hint}</div>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <div className="panel" style={{ flex: "3 1 560px", minWidth: 0 }}>
          {list.length === 0 ? <div className="empty">Aucun objet de ce type trouvé sur UEX.</div> : (
            <div className="table">
              <div className="head" style={{ gridTemplateColumns: COLS, gap: 10, letterSpacing: ".16em", fontSize: 10 }}>
                <span>OBJET</span><span style={{ textAlign: "right" }}>PRIX DÈS{sys ? ` (${sys.toUpperCase()})` : ""}</span><span>DISPONIBLE DANS</span>
              </div>
              {list.map((i) => {
                const p = minPrice(i.offers, sys);
                return (
                  <button key={i.id} type="button" className={"row" + (sel?.id === i.id ? " active" : "")} style={{ gridTemplateColumns: COLS, gap: 10 }} onClick={() => setSelId(i.id)}>
                    <span className="eq-name"><ItemThumb item={i} /><span style={{ minWidth: 0 }}><span className="cell-main" style={{ fontSize: 16 }}>{i.name}</span><br /><small className="cell-muted">{i.company}</small></span></span>
                    <span className="mk-num" style={{ textAlign: "right", color: p == null ? "var(--dim)" : "var(--text-bright)" }}>{p == null ? (i.offers.length ? "ailleurs" : "non vendu") : `${nf(p)} aUEC`}</span>
                    <span className="cell-muted">{systemsOf(i.offers).join(" · ") || "—"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {sel && <Detail key={sel.id} item={sel} sys={sys} />}
      </section>

      {kind === "hand" && (
        <>
          <div className="label" style={{ marginTop: 8 }}>// VÉHICULES DE MINAGE AU SOL</div>
          {!shop.data.vehiclesOk && <div className="hint">Prix des véhicules indisponibles pour le moment (UEX n'a pas répondu sur ce point).</div>}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start" }}>
            {shop.data.vehicles.map((v) => (
              <article key={v.name} className="panel small" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="display" style={{ fontSize: 20, color: "var(--text-bright)" }}>{GROUND_INFO[v.name]?.title ?? v.name}</div>
                <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>{GROUND_INFO[v.name]?.text}</div>
                <div className="label">ACHAT</div>
                <Offers offers={v.buy} sys={sys} />
                {v.rent.length > 0 && <><div className="label">LOCATION</div><Offers offers={v.rent} sys={sys} unit=" / jour" /></>}
              </article>
            ))}
          </section>
          <div className="hint">Pour miner à pied, il faut le multi-outil et son embout de minage (liste ci-dessus), plus un sac à dos pour rapporter les gemmes. Le système d'un vendeur de véhicules est déduit du nom de son terminal.</div>
        </>
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionHead, Note } from "../../components/Hud";
import { MODULE_ART } from "../../lib/images";
import { age, auec, errText, isOld, nf } from "../market/uex";
import {
  OTHER_SECTION, SECTIONS, WEAPON_FILTERS, attrLabel, catLabel, isWeaponCategory, loadCategories, loadItemDetail, loadItems,
  type Category, type Item, type ItemDetail,
} from "./items";
import { ItemThumb, useItemPic } from "./pics";
import { Pic } from "../../components/Pic";
import { WikeloView } from "./WikeloView";
import { CONTRACTS } from "./wikelo";
import "../market/market.css";

const PAGE = 150;
const EXCL_FR: Record<Exclude<Item["excl"], "">, string> = { pledge: "BOUTIQUE RSI", subscriber: "ABONNÉS", concierge: "CONCIERGE" };

type Async<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; text: string }
  | { state: "ok"; data: T; at: number; stale: boolean };

export function EquipmentPage() {
  const [cats, setCats] = useState<Async<Category[]>>({ state: "loading" });
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<"shops" | "wikelo">("shops");
  const [section, setSection] = useState<string>(SECTIONS[0].id);
  const [catId, setCatId] = useState<number | null>(null);
  const [items, setItems] = useState<Async<Item[]>>({ state: "idle" });
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [wf, setWf] = useState(-1);
  const [shown, setShown] = useState(PAGE);
  const [itemId, setItemId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Async<ItemDetail>>({ state: "idle" });

  /* catégories */
  useEffect(() => {
    let alive = true;
    setCats({ state: "loading" });
    loadCategories()
      .then((r) => { if (alive) setCats({ state: "ok", data: r.data, at: r.at, stale: r.stale }); })
      .catch((e) => { if (alive) setCats({ state: "error", text: errText(e) }); });
    return () => { alive = false; };
  }, [tick]);

  const catList = cats.state === "ok" ? cats.data : [];
  const known = useMemo(() => new Set(SECTIONS.map((s) => s.id)), []);
  const sections = useMemo(() => {
    const out = SECTIONS.filter((s) => catList.some((c) => c.section === s.id));
    if (catList.some((c) => !known.has(c.section))) out.push({ id: OTHER_SECTION, label: "Autres" });
    return out;
  }, [catList, known]);
  const inSection = useMemo(
    () => catList.filter((c) => section === OTHER_SECTION ? !known.has(c.section) : c.section === section)
      .sort((a, b) => catLabel(a).localeCompare(catLabel(b), "fr")),
    [catList, section, known]);
  const cat = catId == null ? null : catList.find((c) => c.id === catId) ?? null;

  /* une section qui n'a qu'une catégorie l'ouvre directement */
  useEffect(() => {
    if (inSection.length > 0 && !inSection.some((c) => c.id === catId)) setCatId(inSection.length === 1 ? inSection[0].id : null);
  }, [inSection, catId]);

  /* objets de la catégorie : à la demande, réponse ignorée si la sélection a changé */
  useEffect(() => {
    setItemId(null); setQ(""); setCompany(""); setWf(-1);
    if (catId == null) { setItems({ state: "idle" }); return; }
    let alive = true;
    setItems({ state: "loading" });
    loadItems(catId)
      .then((r) => { if (alive) setItems({ state: "ok", data: r.data, at: r.at, stale: r.stale }); })
      .catch((e) => { if (alive) setItems({ state: "error", text: errText(e) }); });
    return () => { alive = false; };
  }, [catId, tick]);

  /* fiche d'un objet : prix par terminal + caractéristiques */
  useEffect(() => {
    if (itemId == null) { setDetail({ state: "idle" }); return; }
    let alive = true;
    setDetail({ state: "loading" });
    loadItemDetail(itemId)
      .then((r) => { if (alive) setDetail({ state: "ok", data: r.data, at: r.at, stale: r.stale }); })
      .catch((e) => { if (alive) setDetail({ state: "error", text: errText(e) }); });
    return () => { alive = false; };
  }, [itemId, tick]);

  const itemList = items.state === "ok" ? items.data : [];
  const companies = useMemo(() => [...new Set(itemList.map((i) => i.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")), [itemList]);
  const hasSize = useMemo(() => itemList.some((i) => i.size !== ""), [itemList]);
  const weapons = isWeaponCategory(cat);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const f = weapons && wf >= 0 ? WEAPON_FILTERS[wf] : null;
    return itemList.filter((i) =>
      (!needle || i.name.toLowerCase().includes(needle) || i.company.toLowerCase().includes(needle)) &&
      (!company || i.company === company) && (!f || f.test(i.name)));
  }, [itemList, q, company, wf, weapons]);
  useEffect(() => { setShown(PAGE); }, [q, company, wf, catId]);

  const item = itemId == null ? null : itemList.find((i) => i.id === itemId) ?? null;
  const itemPic = useItemPic(item);
  const cols = hasSize ? "minmax(0, 2.4fr) minmax(0, 1fr) 70px" : "minmax(0, 2.4fr) minmax(0, 1fr)";
  const stale = (cats.state === "ok" && cats.stale) || (items.state === "ok" && items.stale);

  return (
    <>
      <PageHeader crumb="COMMERCE ▸ ÉQUIPEMENT" title="Équipement"
        sub="Armures, armes, accessoires et composants en images : où les acheter, à quel prix, et ce que Wikelo échange."
        banner={{ src: MODULE_ART.equipment, kicker: "ÉQUIPEMENT ▸ BOUTIQUES EN JEU", text: "Choisis une catégorie, puis un objet : la fiche liste les boutiques qui le vendent, de la moins chère à la plus chère, d'après les relevés des joueurs." }} />

      <div role="tablist" aria-label="Vue" className="mk-cats">
        <button type="button" role="tab" aria-selected={view === "shops"} className={"tab" + (view === "shops" ? " active" : "")} onClick={() => setView("shops")}>Boutiques en jeu</button>
        <button type="button" role="tab" aria-selected={view === "wikelo"} className={"tab" + (view === "wikelo" ? " active" : "")} onClick={() => setView("wikelo")}>Wikelo · {CONTRACTS.length} contrats</button>
      </div>

      {view === "wikelo" && <WikeloView />}
      {view === "shops" && (<>
      <Note tag="⚠ PRIX COMMUNAUTAIRES">
        Données UEX (uexcorp.space), relevées en jeu par les joueurs : un objet sans boutique listée peut simplement ne pas avoir été relevé (ou ne s'obtenir qu'en butin).
        {stale && <> <b>Hors ligne : affichage du dernier cache.</b></>}
      </Note>

      {cats.state === "loading" && <div className="empty">Lecture des catégories UEX…</div>}
      {cats.state === "error" && (
        <div className="empty">
          <div style={{ marginBottom: 12 }}>{cats.text}</div>
          <button type="button" className="btn sm" onClick={() => setTick((t) => t + 1)}>Réessayer</button>
        </div>
      )}

      {cats.state === "ok" && (
        <>
          <SectionHead n="01" title="CATÉGORIE" />
          <div role="group" aria-label="Famille" className="mk-cats">
            {sections.map((s) => <button key={s.id} type="button" className={"tab" + (section === s.id ? " active" : "")} aria-pressed={section === s.id} onClick={() => setSection(s.id)}>{s.label}</button>)}
          </div>
          {inSection.length > 1 && (
            <div role="group" aria-label="Catégorie" className="mk-cats">
              {inSection.map((c) => <button key={c.id} type="button" className={"btn sm"} aria-pressed={c.id === catId}
                style={c.id === catId ? { background: "rgba(79,179,255,.28)", color: "#fff", borderColor: "var(--rsi)" } : undefined} onClick={() => setCatId(c.id)}>{catLabel(c)}</button>)}
            </div>
          )}
          {!cat && <div className="hint">Choisis une catégorie pour afficher ses objets.</div>}

          {cat && (
            <>
              <SectionHead n="02" title={`OBJETS ▸ ${catLabel(cat).toUpperCase()}`} />
              {items.state === "loading" && <div className="empty">Lecture des objets…</div>}
              {items.state === "error" && (
                <div className="empty">
                  <div style={{ marginBottom: 12 }}>{items.text}</div>
                  <button type="button" className="btn sm" onClick={() => setTick((t) => t + 1)}>Réessayer</button>
                </div>
              )}
              {items.state === "ok" && itemList.length === 0 && <div className="empty">UEX ne répertorie aucun objet dans cette catégorie.</div>}
              {items.state === "ok" && itemList.length > 0 && (
                <>
                  <div className="mk-filters">
                    <label className="field">
                      <span className="label">RECHERCHE</span>
                      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de l'objet ou du fabricant" />
                    </label>
                    {companies.length > 1 && (
                      <label className="field narrow" style={{ flexBasis: 240 }}>
                        <span className="label">FABRICANT</span>
                        <select value={company} onChange={(e) => setCompany(e.target.value)}>
                          <option value="">Tous</option>
                          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                  {weapons && (
                    <div role="group" aria-label="Type d'arme" className="mk-cats">
                      <button type="button" className={"tab" + (wf === -1 ? " active" : "")} aria-pressed={wf === -1} onClick={() => setWf(-1)}>Toutes</button>
                      {WEAPON_FILTERS.map((f, i) => <button key={f.label} type="button" className={"tab" + (wf === i ? " active" : "")} aria-pressed={wf === i} onClick={() => setWf(i)}>{f.label}</button>)}
                    </div>
                  )}
                  <div className="hint">
                    {nf(filtered.length)} objet(s) sur {nf(itemList.length)} · liste récupérée {age(items.at)}.
                    {weapons && " UEX regroupe toutes les armes dans une seule catégorie : les raccourcis ci-dessus filtrent sur le nom anglais de l'objet."}
                  </div>

                  <section className="mk-split">
                    <div className="panel mk-scroll" style={{ flex: "3 1 440px", minWidth: 0, padding: 0 }}>
                      <div className="table" style={{ minWidth: 420 }}>
                        <div className="head" style={{ gridTemplateColumns: cols }}>
                          <span>OBJET</span><span>FABRICANT</span>{hasSize && <span className="mk-r">TAILLE</span>}
                        </div>
                        {filtered.length === 0 && <div className="empty" style={{ border: 0 }}>Aucun objet ne correspond à ces filtres.</div>}
                        {filtered.slice(0, shown).map((i) => (
                          <button type="button" key={i.id} className={"row" + (i.id === itemId ? " active" : "")} style={{ gridTemplateColumns: cols }}
                            aria-pressed={i.id === itemId} onClick={() => setItemId(i.id)}>
                            <span className="eq-name">
                              <ItemThumb item={i} />
                              <span style={{ minWidth: 0 }}>
                                <span className="cell-main" style={{ fontSize: 16 }}>{i.name}</span>
                                {i.excl && <span className="mk-tag warn">{EXCL_FR[i.excl]}</span>}
                              </span>
                            </span>
                            <span className="cell-muted">{i.company || "—"}</span>
                            {hasSize && <span className="mk-num">{i.size || "—"}</span>}
                          </button>
                        ))}
                      </div>
                      {filtered.length > shown && (
                        <div style={{ padding: 12, textAlign: "center" }}>
                          <button type="button" className="btn sm" onClick={() => setShown((n) => n + PAGE)}>Afficher {Math.min(PAGE, filtered.length - shown)} de plus</button>
                        </div>
                      )}
                    </div>

                    <div className="panel" style={{ flex: "2 1 400px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="label">// OBJET SÉLECTIONNÉ</div>
                      {!item && <div className="hint">Choisis un objet dans la liste pour voir où l'acheter.</div>}
                      {item && (
                        <>
                          {itemPic !== null && <Pic key={item.id} src={itemPic?.full ?? null} alt={item.name} ratio="16 / 10" fit="contain" className="eq-hero" />}
                          {itemPic === null && <div className="hint">Pas encore d'image pour cet objet sur le wiki.</div>}
                          <div>
                            <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: "var(--cyan)" }}>
                              {catLabel(cat).toUpperCase()}{item.company ? ` · ${item.company.toUpperCase()}` : ""}{item.size ? ` · TAILLE ${item.size}` : ""}
                            </div>
                            <div className="display" style={{ fontSize: 24, lineHeight: 1.15, color: "var(--text-bright)", marginTop: 6 }}>{item.name}</div>
                            {item.excl && <div className="hint" style={{ marginTop: 6 }}>Objet signalé par UEX comme exclusif ({EXCL_FR[item.excl].toLowerCase()}) : il peut ne pas se vendre en jeu.</div>}
                          </div>
                          {detail.state === "loading" && <div className="hint">Lecture des boutiques…</div>}
                          {detail.state === "error" && (
                            <div className="note"><span className="tag">ERREUR</span><span>{detail.text}</span>
                              <button type="button" className="btn sm" onClick={() => setTick((t) => t + 1)}>Réessayer</button></div>
                          )}
                          {detail.state === "ok" && (
                            <>
                              <div>
                                <div className="label" style={{ marginBottom: 8 }}>CARACTÉRISTIQUES (UEX)</div>
                                {detail.data.attrs.length > 0 ? (
                                  <div className="mk-attrs">
                                    {detail.data.attrs.map((a) => (
                                      <div className="kv" key={a.k}><span className="k">{attrLabel(a.k).toUpperCase()}</span><span className="v">{a.v}{a.u ? ` ${a.u}` : ""}</span></div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="hint">{detail.data.attrsOk ? "UEX ne fournit aucune caractéristique pour cet objet." : "Caractéristiques indisponibles pour le moment."}</div>
                                )}
                              </div>
                              <div>
                                <div className="label" style={{ marginBottom: 8, color: "var(--green)" }}>OÙ ACHETER (MOINS CHER D'ABORD) · {detail.data.prices.length}</div>
                                {detail.data.prices.length === 0 ? (
                                  <div className="hint">Aucune boutique relevée pour cet objet sur UEX.</div>
                                ) : (
                                  <div className="sublist mk-list">
                                    {detail.data.prices.slice(0, PAGE).map((p) => {
                                      const loc = [p.sys, p.body, p.place].filter(Boolean).join(" ▸ ");
                                      return (
                                        <div className="it" key={p.t} style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                                          <span className="mk-where"><b title={p.name}>{p.name || "Boutique inconnue"}</b><small title={loc}>{loc || "lieu non renseigné"}</small></span>
                                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                            <span className="mk-num" style={{ color: "var(--text-bright)", fontSize: 15 }}>{auec(p.buy)}</span>
                                            <span className={"mk-num" + (isOld(p.at) ? " mk-old" : "")} style={{ fontSize: 11, color: isOld(p.at) ? undefined : "var(--muted)" }}>{age(p.at)}{p.ver ? ` · ${p.ver}` : ""}</span>
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="hint">Fiche récupérée {age(detail.at)}{detail.stale ? " — hors ligne, dernier cache affiché" : ""}. L'âge sur chaque ligne est celui du relevé du joueur.</div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
      </>)}
    </>
  );
}

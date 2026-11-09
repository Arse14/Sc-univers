import { useState } from "react";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { HEADS, FAMILIES, SHIPS, DATA_VERSION, type HeadSize } from "./heads";
import { Pic } from "../../components/Pic";
import { MINING_HEADS, MINING_HEAD_SHIP_FALLBACK, MINING_SHIPS, SHIPS as SHIP_ART } from "../../lib/images";

const fmt = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} %`);
const nf = (n: number) => n.toLocaleString("fr-FR");
/** Classe de couleur : favorable / défavorable selon le sens du stat. */
const cls = (v: number | null, goodWhenNegative: boolean) => (v === null ? "cell-muted" : (v < 0) === goodWhenNegative ? "cell-muted good" : "cell-muted bad");

const COLS = "150px 60px 70px 120px 80px 80px 80px 80px";

export function MiningPage() {
  const [size, setSize] = useState<"Toutes" | HeadSize>("Toutes");
  const [selId, setSelId] = useState(HEADS[0].id);
  const list = HEADS.filter((h) => size === "Toutes" || h.size === size);
  const sel = HEADS.find((h) => h.id === selId) ?? HEADS[0];
  const fam = FAMILIES[sel.family];

  return (
    <>
      <PageHeader crumb="INDUSTRIE ▸ MINAGE" title="Têtes de minage" sub="Comparatif des lasers de minage : taille, avantages, inconvénients, vaisseaux compatibles."
        banner={{ src: SHIP_ART.orionMining, kicker: "MINAGE ▸ LASERS ET TÊTES", text: "Une tête de minage se choisit selon la roche : résistance, instabilité, fenêtre de charge. Sélectionne une tête dans le comparatif pour voir son rendu en jeu et ses forces." }} />
      <Note tag="⚠ DONNÉES COMMUNAUTAIRES">Valeurs issues de bases communautaires (synchronisées avec UEX), relevées sur l'{DATA_VERSION}. À revérifier après chaque patch.</Note>

      <section className="stat-grid" aria-label="Résumé">
        <Stat label="TÊTES RÉPERTORIÉES" value={HEADS.length} />
        <Stat label="TAILLES" value="S1 / S2" />
        <Stat label="VAISSEAUX CONFIRMÉS" value={String(SHIPS.length).padStart(2, "0")} amber />
      </section>

      <SectionHead n="01" title="VAISSEAUX ET TAILLES DE TÊTE" />
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {SHIPS.map((s) => (
          <div key={s.name} className="panel small img-card" style={{ display: "flex", flexDirection: "column" }}>
            <Pic src={MINING_SHIPS[s.name]} alt={s.name} ratio="21 / 9" dim>
              <span className="pic-cap"><span className="k">{s.size}{s.count > 1 ? ` × ${s.count}` : ""} · TÊTE{s.count > 1 ? "S" : ""} DE TAILLE {s.size[1]}</span></span>
            </Pic>
            <div className="img-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span className="display" style={{ fontSize: 20, letterSpacing: ".08em", color: "var(--text-bright)", textTransform: "uppercase" }}>{s.name}</span>
              <span className="mono" style={{ padding: "3px 10px", fontSize: 13, background: s.size === "S2" ? "var(--amber)" : "var(--cyan)", color: "#04101c" }}>{s.size}{s.count > 1 ? ` × ${s.count}` : ""}</span>
            </div>
            <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.5 }}>{s.note}</div>
            <div className="mono" style={{ fontSize: 12, letterSpacing: ".14em", color: "var(--cyan)" }}>
              {HEADS.filter((h) => h.ships.some((n) => n.startsWith(s.name))).map((h) => h.name.toUpperCase()).join(" · ")}
            </div>
            </div>
          </div>
        ))}
      </section>
      <div className="hint">ROC, Arrastra, Cydnus et Orion : compatibilité des têtes non vérifiée, à compléter.</div>

      <SectionHead n="02" title="COMPARATIF DES TÊTES" />
      <section style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <div className="panel" style={{ flex: "3 1 640px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div className="label">// {list.length} TÊTES</div>
            <div role="group" aria-label="Filtrer par taille" style={{ display: "flex", gap: 8 }}>
              {(["Toutes", "S1", "S2"] as const).map((z) => (
                <button key={z} type="button" className={"tab" + (size === z ? " active" : "")} aria-pressed={size === z} onClick={() => setSize(z)}>
                  {z === "Toutes" ? "Toutes les tailles" : `Taille ${z[1]}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div className="table" style={{ minWidth: 760 }}>
              <div className="head" style={{ gridTemplateColumns: COLS, gap: 10, letterSpacing: ".16em", fontSize: 10 }}>
                <span>TÊTE</span><span>TAILLE</span><span>MODULES</span><span>PORTÉE OPT./MAX</span><span>RÉSIST.</span><span>INSTAB.</span><span>FENÊTRE</span><span>CHARGE</span>
              </div>
              {list.map((h) => (
                <button key={h.id} type="button" className={"row" + (h.id === selId ? " active" : "")} style={{ gridTemplateColumns: COLS, gap: 10 }} onClick={() => setSelId(h.id)}>
                  <span className="display" style={{ fontSize: 16, color: "var(--text-bright)" }}>{h.name}</span>
                  <span className="cell-cyan">{h.size}</span>
                  <span className="cell-muted">{h.slots ?? "—"}</span>
                  <span className="cell-muted" style={{ color: "var(--text)" }}>{h.optimalRange} m / {h.maxRange} m</span>
                  <span className={cls(h.resistance, true)}>{fmt(h.resistance)}</span>
                  <span className={cls(h.instability, true)}>{fmt(h.instability)}</span>
                  <span className={cls(h.chargeWindow, false)}>{fmt(h.chargeWindow)}</span>
                  <span className={cls(h.chargeRate, false)}>{fmt(h.chargeRate)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mono" style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--muted)" }}>
            <span><span className="good">■</span> favorable</span><span><span className="bad">■</span> défavorable</span><span>— non renseigné</span>
          </div>
        </div>

        <div className="panel" style={{ flex: "2 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="label">// TÊTE SÉLECTIONNÉE</div>
          <Pic key={sel.id} src={MINING_HEADS[sel.id]} alt={sel.name} ratio="16 / 9" fit={MINING_HEAD_SHIP_FALLBACK.has(sel.id) ? "cover" : "contain"} style={{ border: "1px solid var(--line)", background: MINING_HEAD_SHIP_FALLBACK.has(sel.id) ? undefined : "radial-gradient(80% 80% at 50% 50%, rgba(79,179,255,.14), rgba(6,20,32,.9))" }}>
            <span className="pic-cap" style={{ left: 12, bottom: 10 }}><span className="k">{MINING_HEAD_SHIP_FALLBACK.has(sel.id) ? `PAS DE RENDU PUBLIC · ${sel.ships[0].toUpperCase()} EN ACTION` : "RENDU DU TERMINAL D'ACHAT EN JEU"}</span></span>
          </Pic>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="sel-hex" style={{ fontSize: 22 }}>{sel.size}</div>
            <div style={{ minWidth: 0 }}>
              <div className="display" style={{ fontSize: 26, lineHeight: 1.1, color: "var(--text-bright)" }}>{sel.name.toUpperCase()}</div>
              <div className="mono" style={{ fontSize: 12, letterSpacing: ".14em", color: "var(--cyan)" }}>{sel.ships.join(" · ").toUpperCase()}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {[
              ["PORTÉE OPT. / MAX", `${sel.optimalRange} m / ${sel.maxRange} m`],
              ["MODULES", String(sel.slots ?? "—")],
              ["PUISSANCE MIN / MAX", `${nf(sel.minPower)} / ${nf(sel.maxPower)}`],
              ["EXTRACTION", nf(sel.extractPower)],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: "10px 12px", border: "1px solid var(--line)" }}>
                <div className="label" style={{ fontSize: 10, letterSpacing: ".2em" }}>{k}</div>
                <div className="display" style={{ fontSize: 18 }}>{v}</div>
              </div>
            ))}
          </div>
          <div><div className="label" style={{ color: "var(--green)" }}>+ AVANTAGES</div><div style={{ lineHeight: 1.5, marginTop: 6 }}>{fam.pros}</div></div>
          <div><div className="label" style={{ color: "var(--amber)" }}>− INCONVÉNIENTS</div><div style={{ lineHeight: 1.5, marginTop: 6 }}>{fam.cons}</div></div>
          <div style={{ paddingTop: 14, borderTop: "1px solid rgba(98,208,255,.16)" }}>
            <div className="label">USAGE CONSEILLÉ</div>
            <div style={{ lineHeight: 1.5, marginTop: 6, color: "var(--muted)" }}>{fam.best}</div>
          </div>
        </div>
      </section>
    </>
  );
}

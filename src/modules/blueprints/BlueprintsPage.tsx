import { useState } from "react";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { Pic } from "../../components/Pic";
import { CRAFTING } from "../../lib/images";
import { CATEGORIES, DATA_VERSION, FABRICATOR, SOURCES, STEPS, TIPS, type SystemId } from "./blueprints";

const SYS: { id: SystemId; label: string }[] = [
  { id: "all", label: "Tous" }, { id: "stanton", label: "Stanton" }, { id: "pyro", label: "Pyro" }, { id: "nyx", label: "Nyx" }, { id: "events", label: "Événements" },
];
const COLS = "190px 110px minmax(0, 1fr) 170px 90px";

export function BlueprintsPage() {
  const [sys, setSys] = useState<SystemId>("all");
  const list = SOURCES.filter((s) => sys === "all" || s.systems.includes(sys) || s.systems.includes("all"));
  const total = CATEGORIES.reduce((a, c) => a + c.count, 0);

  return (
    <>
      <PageHeader crumb="INDUSTRIE ▸ SCHÉMAS" title="Schémas" sub="Comment gagner les schémas (blueprints), où les utiliser et comment fabriquer."
        banner={{ src: CRAFTING.fabricator, kicker: "FABRICATION ▸ ITEM FABRICATOR", text: "Un schéma débloque une recette ; l'Item Fabricator la transforme en objet à partir de matériaux. Gagne-les auprès des organisations, achète-les, ou démonte des objets." }} />
      <Note tag="⚠ DONNÉES COMMUNAUTAIRES">Relevées sur l'{DATA_VERSION}. Les lots de récompenses changent souvent : vérifie l'aperçu de récompense du contrat en jeu.</Note>

      <section className="stat-grid" aria-label="Résumé">
        <Stat label="SCHÉMAS DANS LE JEU" value={total.toLocaleString("fr-FR")} />
        <Stat label="SOURCES RÉPERTORIÉES" value={SOURCES.length} />
        <Stat label="FABRICATOR" value={FABRICATOR.price} amber />
      </section>

      <SectionHead n="01" title="C'EST QUOI UN SCHÉMA" />
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 10, lineHeight: 1.6 }}>
        <div>Un schéma est une <b>recette permanente</b>, liée à ton compte : une fois gagné, il reste dans ta base de données, il n'est pas consommé par la fabrication et il a survécu aux derniers wipes. Il se gagne en <b>récompense de contrat</b>, jamais en boutique. Chaque contrat a un lot : tu reçois un schéma au hasard dans ce lot.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <span key={c.name} className="mono" style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--line)", color: "var(--text)" }}>{c.name} <b style={{ color: "var(--cyan)" }}>{c.count}</b></span>
          ))}
        </div>
      </div>

      <SectionHead n="02" title="COMMENT LES GAGNER" />
      <div role="group" aria-label="Filtrer par système" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SYS.map((s) => <button key={s.id} type="button" className={"tab" + (sys === s.id ? " active" : "")} aria-pressed={sys === s.id} onClick={() => setSys(s.id)}>{s.label}</button>)}
      </div>
      <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ overflowX: "auto" }}>
          <div className="table" style={{ minWidth: 820 }}>
            <div className="head" style={{ gridTemplateColumns: COLS }}><span>ÉMETTEUR</span><span>SYSTÈME</span><span>COMMENT</span><span>CONDITION</span><span>LOT</span></div>
            {list.map((s) => (
              <div key={s.id} className="row" style={{ gridTemplateColumns: COLS, cursor: "default" }}>
                <span className="cell-amber" style={{ fontSize: 13, letterSpacing: ".04em" }}>{s.faction}</span>
                <span className="cell-cyan" style={{ fontSize: 12 }}>{s.systems.map((x) => SYS.find((y) => y.id === x)?.label).join(" / ")}</span>
                <span style={{ fontSize: 14, lineHeight: 1.4 }}>{s.how}{s.examples && <span style={{ color: "var(--muted)" }}> — {s.examples}</span>}</span>
                <span style={{ fontSize: 13, color: s.condition ? "var(--text)" : "var(--dimmer)" }}>{s.condition ?? "—"}</span>
                <span className="mono" style={{ fontSize: 11, letterSpacing: ".08em", color: s.guaranteed ? "var(--green)" : "var(--muted)" }}>{s.guaranteed ? "GARANTI" : "TIRAGE"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hint">« Tirage » : un schéma au hasard dans le lot du contrat. « Garanti » : récompense fixe ou choix de l'objet. Le démantèlement d'objets ne donne jamais de schéma.</div>
      </section>

      <SectionHead n="03" title="OÙ LES UTILISER : L'ITEM FABRICATOR" />
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {[[CRAFTING.craftingUi, "INTERFACE ▸ FABRICATION", "Choix de la recette et des matériaux"], [CRAFTING.blueprintsUi, "INTERFACE ▸ SCHÉMAS", "Liste des schémas connus"], [CRAFTING.dismantleUi, "INTERFACE ▸ DÉMONTAGE", "Récupérer des matériaux et des schémas"]].map(([src, k, t]) => (
          <Pic key={k} src={src} alt={t} ratio="16 / 9" dim style={{ border: "1px solid var(--line)" }}>
            <span className="pic-cap"><span className="k">{k}</span><span className="t" style={{ fontSize: 14, textTransform: "none", letterSpacing: 0, fontFamily: "var(--font-body)" }}>{t}</span></span>
          </Pic>
        ))}
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div className="panel small" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="label">LA MACHINE</div>
          <div style={{ lineHeight: 1.6 }}>{FABRICATOR.what}</div>
          <div className="display" style={{ fontSize: 22, color: "var(--amber)" }}>{FABRICATOR.price}</div>
        </div>
        <div className="panel small" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="label">OÙ L'ACHETER</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>{FABRICATOR.buy.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
        <div className="panel small" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="label">OÙ LE POSER</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>{FABRICATOR.place.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      </section>

      <SectionHead n="04" title="COMMENT FABRIQUER" />
      <section className="panel" style={{ display: "flex", flexDirection: "column" }}>
        {STEPS.map((s, i) => (
          <div key={s.t} style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr)", gap: 14, padding: "14px 0", borderBottom: i < STEPS.length - 1 ? "1px solid rgba(98,208,255,.12)" : 0 }}>
            <div className="sel-hex" style={{ width: 44, height: 50, flex: "0 0 44px", fontSize: 18 }}>{i + 1}</div>
            <div>
              <div className="display" style={{ fontSize: 17, letterSpacing: ".06em", color: "var(--text-bright)" }}>{s.t}</div>
              <div style={{ marginTop: 4, lineHeight: 1.6, color: "var(--text)" }}>{s.d}</div>
            </div>
          </div>
        ))}
      </section>

      <SectionHead n="05" title="MATÉRIAUX, QUALITÉ ET ASTUCES" />
      <section className="panel">
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>
    </>
  );
}

import { useMemo, useState } from "react";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { FACTIONS, MECHANICS, SYSTEMS, type Faction, type SystemId } from "./factions";

const LAW = { legal: { label: "LÉGAL", color: "var(--cyan)" }, illegal: { label: "ILLÉGAL", color: "var(--amber)" }, neutral: { label: "NEUTRE", color: "var(--muted)" } } as const;

export function ReputationPage() {
  const [system, setSystem] = useState<SystemId>("stanton");
  const [selId, setSelId] = useState<string>("bhg");
  const list = useMemo(() => FACTIONS.filter((f) => f.systems.includes(system)), [system]);
  const sel: Faction = FACTIONS.find((f) => f.id === selId) ?? list[0];
  const sys = SYSTEMS.find((s) => s.id === system)!;
  const pick = (id: SystemId) => { setSystem(id); const first = FACTIONS.find((f) => f.systems.includes(id)); if (first) setSelId(first.id); };

  return (
    <>
      <PageHeader crumb="CARRIÈRE ▸ RÉPUTATIONS" title="Réputations" sub="Qui sont les organisations, comment monter, et ce que chaque palier apporte, système par système." />
      <Note tag="⚠ DONNÉES COMMUNAUTAIRES">Relevées sur l'{MECHANICS.version}. Les fiches marquées « à confirmer » n'ont pas de paliers documentés. À revérifier après chaque patch.</Note>

      <section className="stat-grid" aria-label="Résumé">
        <Stat label="ORGANISATIONS RÉPERTORIÉES" value={FACTIONS.length} />
        <Stat label="SYSTÈMES" value="3 + événements" />
        <Stat label="FICHES DÉTAILLÉES" value={FACTIONS.filter((f) => f.verified).length} amber />
      </section>

      <SectionHead n="01" title="COMMENT ÇA MARCHE" />
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ lineHeight: 1.6 }}>{MECHANICS.intro}</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--muted)", lineHeight: 1.7 }}>
          {MECHANICS.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>

      <SectionHead n="02" title="PAR SYSTÈME" />
      <div role="group" aria-label="Système" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SYSTEMS.map((s) => <button key={s.id} type="button" className={"tab" + (system === s.id ? " active" : "")} aria-pressed={system === s.id} onClick={() => pick(s.id)}>{s.label}</button>)}
      </div>
      <div className="hint">{sys.note}</div>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: "2 1 460px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {list.map((f) => (
            <button key={f.id} type="button" className={"panel small" + (f.id === sel.id ? " active" : "")} onClick={() => setSelId(f.id)}
              style={{ textAlign: "left", color: "inherit", display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", borderColor: f.id === sel.id ? "var(--amber)" : undefined, background: f.id === sel.id ? "linear-gradient(90deg, rgba(255,157,46,.16), var(--panel-2))" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: ".2em", color: LAW[f.lawful].color }}>{LAW[f.lawful].label}</span>
                {!f.verified && <span className="mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--dimmer)" }}>À CONFIRMER</span>}
              </div>
              <span className="display" style={{ fontSize: 16, letterSpacing: ".04em", color: "var(--text-bright)", lineHeight: 1.2 }}>{f.name}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{f.type}</span>
            </button>
          ))}
        </div>

        <div className="panel" style={{ flex: "3 1 440px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="label">// ORGANISATION SÉLECTIONNÉE</div>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".2em", color: LAW[sel.lawful].color }}>{LAW[sel.lawful].label} · {sel.type.toUpperCase()} · {sel.systems.map((s) => SYSTEMS.find((x) => x.id === s)!.label.toUpperCase()).join(" / ")}</div>
            <div className="display" style={{ fontSize: 26, lineHeight: 1.1, color: "var(--text-bright)", marginTop: 6 }}>{sel.name}</div>
            <div style={{ marginTop: 8, lineHeight: 1.5 }}>{sel.summary}</div>
          </div>

          {sel.ranks.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 8 }}>PALIERS ET DÉBLOCAGES</div>
              <div className="sublist">
                {sel.ranks.map((r, i) => (
                  <div className="it" key={r.name} style={{ gridTemplateColumns: "28px 170px minmax(0, 1fr)" }}>
                    <span className="display" style={{ color: "var(--cyan)", fontSize: 14 }}>{i + 1}</span>
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</span>
                      {r.xp !== undefined && r.xp !== null && <span className="mono" style={{ fontSize: 11, color: "var(--amber)" }}>{r.xp.toLocaleString("fr-FR")} pts</span>}
                    </span>
                    <span style={{ fontSize: 14, color: r.unlock ? "var(--text)" : "var(--dimmer)" }}>{r.unlock ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <div className="label" style={{ color: "var(--green)" }}>+ COMMENT MONTER</div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{sel.gains.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
            <div>
              <div className="label" style={{ color: "var(--amber)" }}>− COMMENT DESCENDRE</div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{sel.losses.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          </div>

          <div style={{ paddingTop: 14, borderTop: "1px solid rgba(98,208,255,.16)" }}>
            <div className="label">CE QUE ÇA APPORTE</div>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{sel.rewards.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>

          {sel.rivals && sel.rivals.length > 0 && (
            <div className="note" style={{ padding: "10px 14px" }}>
              <span className="tag">⚔ RIVAL</span>
              <span>Monter ici fait descendre chez : {sel.rivals.map((id) => FACTIONS.find((f) => f.id === id)?.name).join(", ")}.</span>
            </div>
          )}
          {!sel.verified && <div className="hint">Paliers et récompenses précis non documentés dans les sources consultées : à compléter avec tes observations en jeu.</div>}
        </div>
      </section>
    </>
  );
}

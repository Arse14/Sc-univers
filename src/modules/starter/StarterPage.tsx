import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { loadStore, saveStore } from "../../lib/tauri";
import { CHECKLISTS, DATA_VERSION, GLOSSARY, STAGES, TROUBLES } from "./starter";

type Tab = "path" | "checklist" | "trouble" | "glossary";
interface Progress { done: Record<string, boolean>; checks: Record<string, boolean> }
const STORE_KEY = "starter-progress";
const TABS: { id: Tab; label: string }[] = [
  { id: "path", label: "Parcours guidé" }, { id: "checklist", label: "Checklists" }, { id: "trouble", label: "Dépannage" }, { id: "glossary", label: "Lexique" },
];

export function StarterPage() {
  const [tab, setTab] = useState<Tab>("path");
  const [stageId, setStageId] = useState(STAGES[0].id);
  const [prog, setProg] = useState<Progress>({ done: {}, checks: {} });
  const [q, setQ] = useState("");

  useEffect(() => { loadStore<Progress>(STORE_KEY).then((p) => { if (p) setProg({ done: p.done ?? {}, checks: p.checks ?? {} }); }).catch(() => undefined); }, []);
  const update = (next: Progress) => { setProg(next); saveStore(STORE_KEY, next).catch(() => undefined); };
  const toggleDone = (id: string) => update({ ...prog, done: { ...prog.done, [id]: !prog.done[id] } });
  const toggleCheck = (id: string) => update({ ...prog, checks: { ...prog.checks, [id]: !prog.checks[id] } });
  const resetChecks = (listId: string) => {
    const checks = { ...prog.checks };
    CHECKLISTS.find((c) => c.id === listId)?.items.forEach((_, i) => { delete checks[`${listId}:${i}`]; });
    update({ ...prog, checks });
  };

  const allSteps = STAGES.flatMap((s) => s.steps);
  const doneCount = allSteps.filter((s) => prog.done[s.id]).length;
  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
  const stageDone = (s: typeof stage) => s.steps.filter((x) => prog.done[x.id]).length;
  const glossary = useMemo(() => GLOSSARY.filter((g) => !q || (g.term + " " + g.def).toLowerCase().includes(q.toLowerCase())), [q]);

  return (
    <>
      <PageHeader crumb="DÉBUTER" title="Débuter" sub="Un parcours pas à pas pour les premières heures, des checklists, le dépannage des galères classiques et un lexique." />
      <Note tag="ⓘ TOUCHES" info>{DATA_VERSION}. Si une touche ne répond pas, vérifie Options → Keybindings : elles changent à chaque gros patch.</Note>

      <section className="stat-grid" aria-label="Résumé">
        <Stat label="ÉTAPES DU PARCOURS" value={`${doneCount} / ${allSteps.length}`} />
        <Stat label="CHAPITRES" value={STAGES.length} />
        <Stat label="PROGRESSION" value={`${Math.round((doneCount / allSteps.length) * 100)} %`} amber />
      </section>

      <div role="group" aria-label="Section" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TABS.map((t) => <button key={t.id} type="button" className={"tab" + (tab === t.id ? " active" : "")} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === "path" && (
        <>
          <SectionHead n="01" title="CHAPITRES" />
          <section style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {STAGES.map((s, i) => {
                const d = stageDone(s); const on = s.id === stage.id; const complete = d === s.steps.length;
                return (
                  <button key={s.id} type="button" className={"device-tab" + (on ? " active" : "")} aria-pressed={on} onClick={() => setStageId(s.id)} style={{ minWidth: 0, width: "100%" }}>
                    <span className="slot">{String(i + 1).padStart(2, "0")} · {s.duration.toUpperCase()}</span>
                    <span className="name" style={{ fontSize: 16, display: "flex", gap: 10, alignItems: "center" }}>
                      {s.title}{complete && <span style={{ color: "var(--green)", fontSize: 14 }}>✓</span>}
                    </span>
                    <span className="sub">{d} / {s.steps.length} · {s.goal}</span>
                  </button>
                );
              })}
            </div>

            <div className="panel" style={{ flex: "2 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="label">// CHAPITRE {String(STAGES.indexOf(stage) + 1).padStart(2, "0")}</div>
                <div className="display" style={{ fontSize: 26, color: "var(--text-bright)", marginTop: 6 }}>{stage.title}</div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>{stage.goal}</div>
              </div>
              {stage.steps.map((st, i) => {
                const done = !!prog.done[st.id];
                return (
                  <div key={st.id} style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 14, padding: "14px 0", borderTop: "1px solid rgba(98,208,255,.12)", opacity: done ? 0.7 : 1 }}>
                    <button type="button" onClick={() => toggleDone(st.id)} aria-pressed={done} aria-label={(done ? "Marquer à faire : " : "Marquer fait : ") + st.title}
                      className="sel-hex" style={{ width: 40, height: 46, flex: "0 0 40px", fontSize: 15, border: 0, cursor: "pointer", background: done ? "var(--green)" : "var(--amber)" }}>{done ? "✓" : i + 1}</button>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div className="display" style={{ fontSize: 17, letterSpacing: ".06em", color: "var(--text-bright)", textDecoration: done ? "line-through" : "none" }}>{st.title}</div>
                      <div style={{ lineHeight: 1.6 }}>{st.text}</div>
                      {st.keys && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {st.keys.map((k) => (
                            <span key={k.label} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 8px", border: "1px solid var(--line)", fontSize: 13 }}>
                              <span style={{ color: "var(--muted)" }}>{k.label}</span>
                              <kbd className="mono" style={{ padding: "2px 8px", background: "rgba(98,208,255,.12)", border: "1px solid var(--line-strong)", color: "var(--cyan)", fontSize: 12 }}>{k.key}</kbd>
                            </span>
                          ))}
                        </div>
                      )}
                      {st.tip && <div style={{ fontSize: 14, color: "var(--green)" }}>▸ {st.tip}</div>}
                      {st.trap && <div style={{ fontSize: 14, color: "var(--amber-soft)" }}>⚠ {st.trap}</div>}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 6 }}>
                <button type="button" className="btn sm" disabled={STAGES.indexOf(stage) === 0} onClick={() => setStageId(STAGES[STAGES.indexOf(stage) - 1].id)}>◀ Précédent</button>
                <button type="button" className="btn sm primary" disabled={STAGES.indexOf(stage) === STAGES.length - 1} onClick={() => setStageId(STAGES[STAGES.indexOf(stage) + 1].id)}>Chapitre suivant ▸</button>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === "checklist" && (
        <>
          <SectionHead n="02" title="CHECKLISTS" />
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {CHECKLISTS.map((c) => {
              const n = c.items.filter((_, i) => prog.checks[`${c.id}:${i}`]).length;
              return (
                <div key={c.id} className="panel small" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span className="display" style={{ fontSize: 18, letterSpacing: ".06em", color: "var(--text-bright)" }}>{c.title}</span>
                    <span className="mono" style={{ fontSize: 12, color: n === c.items.length ? "var(--green)" : "var(--muted)" }}>{n} / {c.items.length}</span>
                  </div>
                  {c.items.map((it, i) => {
                    const id = `${c.id}:${i}`; const on = !!prog.checks[id];
                    return (
                      <label key={id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: on ? "var(--muted)" : "var(--text)", textDecoration: on ? "line-through" : "none", minHeight: 32 }}>
                        <input type="checkbox" checked={on} onChange={() => toggleCheck(id)} style={{ width: 18, height: 18, accentColor: "#ff9d2e" }} />
                        <span>{it}</span>
                      </label>
                    );
                  })}
                  <button type="button" className="btn sm" style={{ alignSelf: "flex-end" }} onClick={() => resetChecks(c.id)}>Réinitialiser</button>
                </div>
              );
            })}
          </section>
        </>
      )}

      {tab === "trouble" && (
        <>
          <SectionHead n="03" title="J'AI UN PROBLÈME" />
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {TROUBLES.map((t) => (
              <div key={t.id} className="panel small" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="display" style={{ fontSize: 17, letterSpacing: ".04em", color: "var(--amber)" }}>{t.title}</div>
                <div style={{ lineHeight: 1.6 }}>{t.text}</div>
                {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: "var(--cyan)" }}>{t.link.replace("https://", "")}</a>}
              </div>
            ))}
          </section>
        </>
      )}

      {tab === "glossary" && (
        <>
          <SectionHead n="04" title="LEXIQUE" />
          <div className="field" style={{ maxWidth: 420 }}>
            <input type="search" placeholder="Rechercher un terme…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher dans le lexique" />
          </div>
          <section className="panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px 28px" }}>
            {glossary.map((g) => (
              <div key={g.term} style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 10, borderBottom: "1px solid rgba(98,208,255,.1)" }}>
                <span className="display" style={{ color: "var(--cyan)", letterSpacing: ".04em" }}>{g.term}</span>
                <span style={{ fontSize: 15, lineHeight: 1.5 }}>{g.def}</span>
              </div>
            ))}
            {glossary.length === 0 && <div className="hint">Aucun terme ne correspond.</div>}
          </section>
        </>
      )}
    </>
  );
}

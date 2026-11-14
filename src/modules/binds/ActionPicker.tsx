import { useEffect, useMemo, useRef, useState } from "react";
import { FAMILIES, GAME_VERSION, MAP_BY_NAME, searchActions, type ScAction } from "./actions";
import type { ScBinding } from "./types";

const MAX_ROWS = 80;

/**
 * Sélecteur d'action : recherche dans les 691 actions du jeu et choix de
 * celle à lier à la touche en cours. Indique où l'action est déjà liée
 * (elle sera déplacée : le jeu n'accepte qu'un bind joystick par action).
 */
export function ActionPicker({ input, controlLabel, isAxis, bindings, onPick, onClose }: {
  input: string;
  controlLabel: string;
  isAxis: boolean;
  bindings: ScBinding[];
  onPick: (a: ScAction) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string>("");
  const [kind, setKind] = useState<"match" | "all">("match");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = useMemo(() => {
    const m = new Map<string, ScBinding>();
    for (const b of bindings) if (!b.cleared) m.set(`${b.actionmap}/${b.action}`, b);
    return m;
  }, [bindings]);

  const results = useMemo(() => searchActions(q, { family: family || undefined, axis: kind === "all" ? null : isAxis }), [q, family, kind, isAxis]);
  const shown = results.slice(0, MAX_ROWS);

  return (
    <div className="picker-backdrop" role="dialog" aria-modal="true" aria-label="Choisir une action" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="picker panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div className="label">// ASSIGNER UNE ACTION</div>
            <div className="display" style={{ fontSize: 22, color: "var(--text-bright)", marginTop: 4 }}>{controlLabel}</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--cyan)" }}>{input} · {isAxis ? "AXE" : "BOUTON"}</div>
          </div>
          <button type="button" className="btn sm" onClick={onClose}>Fermer (Échap)</button>
        </div>

        <input ref={inputRef} className="picker-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : missile, train d'atterrissage, minage, v_toggle…" aria-label="Rechercher une action" />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <button type="button" className={"tab" + (family === "" ? " active" : "")} aria-pressed={family === ""} onClick={() => setFamily("")}>Tout</button>
          {FAMILIES.map((f) => <button key={f.id} type="button" className={"tab" + (family === f.id ? " active" : "")} aria-pressed={family === f.id} onClick={() => setFamily(f.id)}>{f.label}</button>)}
          <span style={{ flex: 1 }} />
          <button type="button" className={"tab" + (kind === "all" ? " active" : "")} aria-pressed={kind === "all"} onClick={() => setKind((k) => (k === "all" ? "match" : "all"))} title={isAxis ? "Par défaut, seules les actions analogiques sont proposées pour un axe." : "Par défaut, les actions analogiques (axes) sont masquées pour un bouton."}>
            {isAxis ? "Afficher aussi les actions bouton" : "Afficher aussi les actions d'axe"}
          </button>
        </div>

        <div className="picker-list" role="listbox" aria-label="Actions">
          {shown.map((a) => {
            const cur = current.get(`${a.map}/${a.name}`);
            const here = cur?.input === input;
            return (
              <button key={`${a.map}/${a.name}`} type="button" role="option" aria-selected={here} className={"picker-row" + (here ? " here" : "")} onClick={() => onPick(a)} disabled={here}>
                <span style={{ minWidth: 0 }}>
                  <span className="picker-name">{a.label}</span>
                  <span className="picker-meta mono">{MAP_BY_NAME.get(a.map)?.label ?? a.map} · {a.name}{a.mode ? ` · ${a.mode}` : ""}</span>
                </span>
                <span className="picker-tags mono">
                  {a.axis && <span className="hud-chip">AXE</span>}
                  {a.defJs && <span className="hud-chip" style={{ color: "var(--dim)" }} title="Bind joystick par défaut du jeu">DÉFAUT {a.defJs.toUpperCase()}</span>}
                  {cur && <span className="hud-chip" style={{ color: here ? "var(--green)" : "var(--amber)" }} title={here ? "Déjà sur cette touche" : "L'action quittera cette touche"}>{here ? "DÉJÀ ICI" : `ACTUEL ${cur.input.toUpperCase()}`}</span>}
                </span>
              </button>
            );
          })}
          {results.length === 0 && <div className="hint" style={{ padding: 16 }}>Aucune action ne correspond. Essaie un autre mot, ou « Afficher aussi… » si tu cherches une action de l'autre type.</div>}
        </div>
        <div className="hint" style={{ margin: 0 }}>
          {results.length > MAX_ROWS ? `${MAX_ROWS} premières actions sur ${results.length} : affine la recherche. ` : `${results.length} action(s). `}
          Catalogue du jeu Alpha {GAME_VERSION}, libellés français de la traduction communautaire SCEFRA.
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ACTION_MAPS, DOMAINS, GAME_VERSION, type ScAction } from "./actions";
import type { ScBinding } from "./types";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
type Show = "all" | "bound" | "free";

/**
 * Toutes les commandes du jeu, en français, rangées par domaine (déplacement,
 * armement, cockpit…) puis par groupe du menu des touches. Pour chacune : la
 * touche joystick qui la porte, et un bouton pour la mettre sur la commande
 * sélectionnée dans la vue de l'appareil.
 */
export function CommandCatalog({ bindings, inputName, target, onAssign, onUnassign }: {
  bindings: ScBinding[];
  /** Nom lisible d'une entrée : « js1_button1 » → « X-56 Stick · TRIGGER ». */
  inputName: (input: string) => string | null;
  /** Touche qui recevra l'action (commande sélectionnée), ou null. */
  target: { input: string; label: string; axis: boolean } | null;
  onAssign: (a: ScAction, input: string) => void;
  onUnassign: (b: ScBinding) => void;
}) {
  const [dom, setDom] = useState(DOMAINS[0].id);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>("all");

  const bound = useMemo(() => { const m = new Map<string, ScBinding>(); for (const b of bindings) if (!b.cleared) m.set(`${b.actionmap}/${b.action}`, b); return m; }, [bindings]);
  const counts = useMemo(() => new Map(DOMAINS.map((d) => {
    const acts = ACTION_MAPS.filter((m) => d.maps.includes(m.name)).flatMap((m) => m.actions);
    return [d.id, { total: acts.length, bound: acts.filter((a) => bound.has(`${a.map}/${a.name}`)).length }];
  })), [bound]);

  const words = fold(q).split(/\s+/).filter(Boolean);
  const searching = words.length > 0;
  const domain = DOMAINS.find((d) => d.id === dom)!;
  // une recherche porte sur tous les domaines ; sinon on affiche le domaine choisi
  const groups = useMemo(() => {
    const out: { key: string; title: string; color: string; domain: string; actions: ScAction[] }[] = [];
    for (const d of searching ? DOMAINS : [domain]) for (const name of d.maps) {
      const m = ACTION_MAPS.find((x) => x.name === name); if (!m) continue;
      const actions = m.actions.filter((a) => {
        const b = bound.has(`${a.map}/${a.name}`);
        if (show === "bound" && !b) return false;
        if (show === "free" && b) return false;
        return !searching || words.every((w) => `${fold(a.label)} ${a.name} ${fold(m.label)}`.includes(w));
      });
      if (actions.length) out.push({ key: m.name, title: m.label, color: d.color, domain: d.label, actions });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dom, q, show, bound]);
  const total = groups.reduce((n, g) => n + g.actions.length, 0);
  const LIMIT = 250;
  let left = LIMIT;

  return (
    <section className="panel" aria-label="Commandes du jeu" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div role="group" aria-label="Domaine" className="cmd-domains">
        {DOMAINS.map((d) => {
          const c = counts.get(d.id)!;
          return (
            <button key={d.id} type="button" className={"cmd-domain" + (!searching && dom === d.id ? " active" : "")} aria-pressed={!searching && dom === d.id} style={{ ["--dc" as string]: d.color }} onClick={() => { setDom(d.id); setQ(""); }}>
              <span className="cmd-domain-name">{d.label}</span>
              <span className="mono cmd-domain-n">{c.bound > 0 ? `${c.bound} / ${c.total} liées` : `${c.total} commandes`}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input className="picker-search" style={{ flex: "1 1 280px", minWidth: 0 }} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans toutes les commandes : train d'atterrissage, missile, phares…" aria-label="Chercher une commande" />
        {([["all", "Toutes"], ["bound", "Liées au joystick"], ["free", "Sans touche"]] as [Show, string][]).map(([k, l]) => (
          <button key={k} type="button" className={"tab" + (show === k ? " active" : "")} aria-pressed={show === k} onClick={() => setShow(k)}>{l}</button>
        ))}
      </div>
      <div className="hint" style={{ margin: 0 }}>
        {searching ? `${total} commande(s) trouvée(s) dans tous les domaines.` : `${domain.hint} ${total} commande(s).`}
        {" "}{target ? <>Le bouton « Mettre sur… » place la commande sur <b>{target.label}</b> ({target.axis ? "axe" : "bouton"}), la touche sélectionnée dans la vue de l'appareil.</> : "Sélectionne une touche dans la vue de l'appareil pour pouvoir y placer une commande."}
      </div>

      <div className="cmd-list">
        {groups.map((g) => {
          if (left <= 0) return null;
          const acts = g.actions.slice(0, left); left -= acts.length;
          return (
            <div key={g.key} className="cmd-group" style={{ ["--dc" as string]: g.color }}>
              <div className="cmd-group-head"><span className="display">{g.title}</span><span className="mono">{searching ? `${g.domain.toUpperCase()} · ` : ""}{g.actions.length} COMMANDE{g.actions.length > 1 ? "S" : ""}</span></div>
              {acts.map((a) => {
                const b = bound.get(`${a.map}/${a.name}`);
                const here = !!b && !!target && b.input === target.input;
                const mismatch = !!target && target.axis !== a.axis;
                return (
                  <div key={a.name} className={"cmd-row" + (b ? " bound" : "")}>
                    <span style={{ minWidth: 0 }}>
                      <span className="cmd-name">{a.label}</span>
                      <span className="mono cmd-meta">{a.axis ? "AXE" : "BOUTON"}{a.defKb ? ` · clavier : ${a.defKb}` : ""}{a.defJs ? ` · joystick par défaut : ${a.defJs}` : ""}</span>
                    </span>
                    <span className="cmd-bind">
                      {b ? (
                        <span className="cmd-chip" title={b.input}>
                          <span>{inputName(b.input) ?? b.input}</span>
                          <button type="button" className="bind-x" aria-label={`Retirer ${a.label} de sa touche`} title="Retirer cette commande de sa touche" onClick={() => onUnassign(b)}>✕</button>
                        </span>
                      ) : <span className="cmd-none">sans touche joystick</span>}
                    </span>
                    <button type="button" className="btn sm" disabled={!target || here || mismatch} title={!target ? "Sélectionne d'abord une touche dans la vue de l'appareil" : mismatch ? (a.axis ? "Cette commande attend un axe : sélectionne un axe" : "Cette commande attend un bouton : sélectionne un bouton") : undefined} onClick={() => target && onAssign(a, target.input)}>
                      {here ? "Déjà dessus" : target ? `Mettre sur ${target.label}` : "Mettre sur…"}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
        {total === 0 && <div className="hint" style={{ padding: 16 }}>Aucune commande ne correspond.</div>}
        {total > LIMIT && <div className="hint" style={{ padding: 12 }}>{LIMIT} premières commandes sur {total} : affine la recherche.</div>}
      </div>
      <div className="hint" style={{ margin: 0 }}>Noms des commandes du jeu Alpha {GAME_VERSION}, traduction française communautaire SCEFRA : ce sont les libellés du menu des touches en jeu réglé en français.</div>
    </section>
  );
}

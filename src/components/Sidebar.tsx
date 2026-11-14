import { useEffect, useState } from "react";
import { APP_VERSION } from "../lib/version";
import { Brand, ModuleIcon } from "./Icons";

export type ModuleId = "news" | "starter" | "dashboard" | "binds" | "hangar" | "mining" | "reputation" | "blueprints" | "market" | "equipment" | "map" | "settings";

interface Item {
  id: ModuleId;
  label: string;
  ready: boolean;
  group: "pilote" | "univers" | "systeme";
}

const ITEMS: Item[] = [
  { id: "news", label: "Actualité", ready: true, group: "pilote" },
  { id: "starter", label: "Débuter", ready: true, group: "pilote" },
  { id: "dashboard", label: "Tableau de bord", ready: true, group: "pilote" },
  { id: "binds", label: "Binds", ready: true, group: "pilote" },
  { id: "hangar", label: "Hangar", ready: true, group: "univers" },
  { id: "mining", label: "Minage", ready: true, group: "univers" },
  { id: "reputation", label: "Réputations", ready: true, group: "univers" },
  { id: "blueprints", label: "Schémas", ready: true, group: "univers" },
  { id: "market", label: "Marché", ready: true, group: "univers" },
  { id: "equipment", label: "Équipement", ready: true, group: "univers" },
  { id: "map", label: "Carte", ready: true, group: "univers" },
  { id: "settings", label: "Paramètres", ready: true, group: "systeme" },
];

const GROUPS: { id: Item["group"]; label: string }[] = [
  { id: "pilote", label: "PILOTE" }, { id: "univers", label: "UNIVERS" }, { id: "systeme", label: "SYSTÈME" },
];

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  // Heure standard UEE : l'année en jeu est l'année réelle + 930
  return { utc: now.toISOString().slice(11, 19), year: now.getUTCFullYear() + 930 };
}

export function Sidebar({ current, onSelect }: { current: ModuleId; onSelect: (m: ModuleId) => void }) {
  const clock = useClock();
  let n = 0;
  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <div className="brand">
        <div className="brand-mark"><Brand /></div>
        <div>
          <div className="brand-name">UNIVERS</div>
          <div className="brand-sub">COMPAGNON</div>
        </div>
      </div>

      <div className="nav">
        {GROUPS.map((g) => (
          <div key={g.id} className="nav-group">
            <div className="nav-title"><span>// {g.label}</span><i /></div>
            {ITEMS.filter((it) => it.group === g.id).map((it) => {
              n += 1;
              const active = current === it.id;
              return (
                <button key={it.id} type="button" className={"nav-item" + (active ? " active" : "") + (it.ready ? "" : " soon")} aria-current={active ? "page" : undefined} onClick={() => onSelect(it.id)}>
                  <span className="nav-num">{String(n).padStart(2, "0")}</span>
                  <span className="nav-ico"><ModuleIcon id={it.id} /></span>
                  <span className="nav-label">{it.label}</span>
                  {active ? <span className="nav-caret">▸</span> : !it.ready && <span className="nav-flag">N/A</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="status-box">
        <div className="label">// ÉTAT</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}><span className="status-dot" />Aucune modification du jeu</div>
        <div className="telemetry"><span>UEE STD</span><b>{clock.utc} · {clock.year}</b></div>
        <div className="mono" style={{ fontSize: 12, color: "var(--dimmer)" }}>v{APP_VERSION} · NON AFFILIÉ À CIG</div>
        <div className="status-bar" />
      </div>
    </nav>
  );
}

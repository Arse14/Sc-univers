import { useEffect, useState } from "react";

export type ModuleId = "news" | "starter" | "dashboard" | "binds" | "hangar" | "mining" | "reputation" | "blueprints" | "market" | "equipment" | "map" | "settings";

interface Item {
  id: ModuleId;
  label: string;
  ready: boolean;
}

const ITEMS: Item[] = [
  { id: "news", label: "Actualité", ready: true },
  { id: "starter", label: "Débuter", ready: true },
  { id: "dashboard", label: "Tableau de bord", ready: true },
  { id: "binds", label: "Binds", ready: true },
  { id: "hangar", label: "Hangar", ready: false },
  { id: "mining", label: "Minage", ready: true },
  { id: "reputation", label: "Réputations", ready: true },
  { id: "blueprints", label: "Schémas", ready: true },
  { id: "market", label: "Marché", ready: false },
  { id: "equipment", label: "Équipement", ready: false },
  { id: "map", label: "Carte", ready: false },
  { id: "settings", label: "Paramètres", ready: true },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  // Heure standard UEE : l'année en jeu est l'année réelle + 930
  const utc = now.toISOString().slice(11, 19);
  return { utc, year: now.getUTCFullYear() + 930 };
}

export function Sidebar({ current, onSelect }: { current: ModuleId; onSelect: (m: ModuleId) => void }) {
  const clock = useClock();
  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <div className="brand">
        <div className="brand-hex"><span>SC</span></div>
        <div>
          <div className="brand-name">UNIVERS</div>
          <div className="brand-sub">COMPAGNON</div>
        </div>
      </div>

      <div>
        <div className="nav-title">// MODULES</div>
        {ITEMS.map((it, i) => (
          <button
            key={it.id}
            type="button"
            className={"nav-item" + (current === it.id ? " active" : "")}
            aria-current={current === it.id ? "page" : undefined}
            onClick={() => onSelect(it.id)}
          >
            <span className="nav-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="nav-label">{it.label}</span>
            {current === it.id ? <span style={{ fontSize: 12, color: "var(--amber)" }}>▸</span> : !it.ready && <span className="nav-flag">N/A</span>}
          </button>
        ))}
      </div>

      <div className="status-box">
        <div className="label">// ÉTAT</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}><span className="status-dot" />Lecture de fichiers uniquement</div>
        <div className="telemetry"><span>UEE STD</span><b>{clock.utc} · {clock.year}</b></div>
        <div className="mono" style={{ fontSize: 12, color: "var(--dimmer)" }}>v0.1.0 · NON AFFILIÉ À CIG</div>
        <div className="status-bar" />
      </div>
    </nav>
  );
}

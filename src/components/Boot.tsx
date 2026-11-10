import { useEffect, useState } from "react";
import { APP_VERSION } from "../lib/version";
import { Brand } from "./Icons";

const LINES = [
  "INITIALISATION DU NOYAU",
  "LIAISON LOCALE : LECTURE DE FICHIERS UNIQUEMENT",
  "FLUX OFFICIELS : COMM-LINK · YOUTUBE · STATUT",
  "PROFIL HOTAS : RECHERCHE",
  "INTERFACE PRÊTE",
];

/** Écran de démarrage façon HUD : logo, lignes système, barre de progression. */
export function Boot({ onDone, duration = 1800 }: { onDone: () => void; duration?: number }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const per = duration / (LINES.length + 1);
    const timers = LINES.map((_, i) => setTimeout(() => setStep(i + 1), per * (i + 1)));
    const end = setTimeout(() => { setLeaving(true); setTimeout(onDone, 450); }, duration);
    return () => { timers.forEach(clearTimeout); clearTimeout(end); };
  }, [duration, onDone]);
  const pct = Math.min(100, Math.round((step / LINES.length) * 100));
  return (
    <div className={"boot" + (leaving ? " leaving" : "")} role="status" aria-live="polite">
      <div className="boot-grid" />
      <div className="boot-center">
        <div className="boot-mark"><Brand size={72} /></div>
        <div className="boot-title">SC-UNIVERS</div>
        <div className="boot-sub">COMPAGNON STAR CITIZEN · v{APP_VERSION}</div>
        <div className="boot-bar"><i style={{ width: pct + "%" }} /></div>
        <div className="boot-lines">
          {LINES.slice(0, step).map((l, i) => <div key={l} className="boot-line" style={{ animationDelay: `${i * 0.02}s` }}><span>▸</span>{l}</div>)}
        </div>
      </div>
      <div className="boot-foot mono">NODE // LOCAL · {pct} %</div>
    </div>
  );
}

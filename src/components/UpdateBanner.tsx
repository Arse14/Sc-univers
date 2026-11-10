import { useEffect, useState } from "react";
import { checkForUpdate, installUpdate, type UpdateInfo } from "../lib/updater";
import { isTauri } from "../lib/tauri";

/**
 * Bandeau discret en bas de la fenêtre quand une nouvelle version est publiée.
 * Vérifie une fois au lancement (après le boot), puis toutes les 6 h.
 */
export function UpdateBanner({ enabled }: { enabled: boolean }) {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [pct, setPct] = useState<number | null | undefined>(undefined); // undefined = pas commencé
  const [err, setErr] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!isTauri || !enabled) return;
    let stop = false;
    const run = () => checkForUpdate().then((u) => { if (!stop && u) setInfo(u); }).catch(() => undefined);
    const t = setTimeout(run, 4000);
    const iv = setInterval(run, 6 * 3600 * 1000);
    return () => { stop = true; clearTimeout(t); clearInterval(iv); };
  }, [enabled]);

  if (!info || hidden) return null;
  const busy = pct !== undefined;
  return (
    <div className="update-banner" role="status">
      <span className="hud-chip" style={{ color: "var(--green)" }}><i />MISE À JOUR</span>
      <span className="upd-text">
        <b>SC-Univers {info.version}</b> est disponible (tu as la {info.current}).
        {info.notes && <span className="upd-notes"> {info.notes.split("\n")[0].slice(0, 140)}</span>}
      </span>
      {err && <span className="mono" style={{ color: "var(--amber)", fontSize: 11 }}>{err}</span>}
      {busy ? (
        <span className="upd-progress mono">{pct === null ? "TÉLÉCHARGEMENT…" : pct < 100 ? `TÉLÉCHARGEMENT ${pct} %` : "INSTALLATION… L'APPLI VA REDÉMARRER"}<i style={{ width: `${pct ?? 30}%` }} /></span>
      ) : (
        <>
          <button type="button" className="btn primary" style={{ minHeight: 34 }} onClick={() => { setErr(null); setPct(null); installUpdate(setPct).catch((e) => { setErr(`Échec : ${e}`); setPct(undefined); }); }}>▸ Installer et redémarrer</button>
          <button type="button" className="btn" style={{ minHeight: 34 }} onClick={() => setHidden(true)}>Plus tard</button>
        </>
      )}
    </div>
  );
}

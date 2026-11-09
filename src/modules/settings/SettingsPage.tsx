import { useEffect, useState } from "react";
import { PageHeader, SectionHead, Note } from "../../components/Hud";
import { findScInstalls, isTauri, loadStore, saveStore, type ScInstall } from "../../lib/tauri";

export interface AppSettings {
  uexToken: string;          // clé API UEX (saisie par l'utilisateur, stockée en local)
  startModule: "news" | "dashboard" | "binds";
  autoRotate: boolean;
}

const KEY = "settings";
export const DEFAULT_SETTINGS: AppSettings = { uexToken: "", startModule: "news", autoRotate: true };

export function SettingsPage() {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [installs, setInstalls] = useState<ScInstall[]>([]);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadStore<AppSettings>(KEY).then((v) => v && setS({ ...DEFAULT_SETTINGS, ...v })).catch(() => undefined);
    findScInstalls().then(setInstalls).catch(() => undefined);
  }, []);

  const save = async () => { await saveStore(KEY, s); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const resetProgress = async () => { await saveStore("starter-progress", { done: {}, checks: {} }); setSaved(true); setTimeout(() => setSaved(false), 1800); };

  return (
    <>
      <PageHeader crumb="SYSTÈME ▸ PARAMÈTRES" title="Paramètres" sub="Clé API, détection du jeu, préférences. Tout est stocké en local sur ta machine."
        actions={<button type="button" className="btn primary" onClick={save}>{saved ? "Enregistré ✓" : "Enregistrer"}</button>} />

      <SectionHead n="01" title="DONNÉES DE MARCHÉ (UEX)" />
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ lineHeight: 1.6 }}>Le module Marché utilisera l'API UEX 2.0. Crée une application sur <span className="mono" style={{ color: "var(--cyan)" }}>uexcorp.space</span> (My Apps) pour obtenir un token. Il reste sur ton PC et n'est jamais mis dans le dépôt.</div>
        <label className="field" style={{ maxWidth: 560 }}>
          <span className="label">TOKEN UEX</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input type={showKey ? "text" : "password"} value={s.uexToken} onChange={(e) => setS({ ...s, uexToken: e.target.value })} placeholder="Colle ton token ici" style={{ flex: 1 }} autoComplete="off" />
            <button type="button" className="btn sm" onClick={() => setShowKey((v) => !v)}>{showKey ? "Masquer" : "Afficher"}</button>
          </div>
        </label>
      </div>

      <SectionHead n="02" title="STAR CITIZEN" />
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="label">INSTALLATIONS DÉTECTÉES</div>
        {!isTauri && <div className="hint">Détection disponible uniquement dans l'application de bureau.</div>}
        {isTauri && installs.length === 0 && <div className="hint">Aucun <span className="mono">actionmaps.xml</span> trouvé sur les emplacements habituels (C: à G:). Tu peux le charger à la main depuis le module Binds.</div>}
        {installs.map((i) => (
          <div key={i.actionmaps} style={{ display: "grid", gridTemplateColumns: "90px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
            <span className="mono" style={{ color: "var(--amber)", letterSpacing: ".16em" }}>{i.channel}</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--muted)", wordBreak: "break-all" }}>{i.actionmaps}</span>
          </div>
        ))}
      </div>

      <SectionHead n="03" title="PRÉFÉRENCES" />
      <div className="panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <label className="field">
          <span className="label">MODULE AU LANCEMENT</span>
          <select value={s.startModule} onChange={(e) => setS({ ...s, startModule: e.target.value as AppSettings["startModule"] })}>
            <option value="news">Actualité</option><option value="dashboard">Tableau de bord</option><option value="binds">Binds</option>
          </select>
        </label>
        <label className="field" style={{ justifyContent: "flex-end" }}>
          <span className="label">VUE 3D</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40 }}>
            <input type="checkbox" checked={s.autoRotate} onChange={(e) => setS({ ...s, autoRotate: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#ff9d2e" }} />
            Rotation automatique au repos
          </span>
        </label>
        <div className="field" style={{ justifyContent: "flex-end" }}>
          <span className="label">PARCOURS « DÉBUTER »</span>
          <button type="button" className="btn sm" onClick={resetProgress} style={{ alignSelf: "flex-start" }}>Réinitialiser la progression</button>
        </div>
      </div>

      <Note tag="ⓘ" info>SC-Univers lit uniquement des fichiers (actionmaps.xml, profils, images, modèles) et des APIs publiques. Aucune lecture de la mémoire du jeu. Non affilié à Cloud Imperium Games.</Note>
    </>
  );
}

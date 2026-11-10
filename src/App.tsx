import { useState } from "react";
import { Sidebar, type ModuleId } from "./components/Sidebar";
import { NewsPage } from "./modules/news/NewsPage";
import { StarterPage } from "./modules/starter/StarterPage";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { BindsPage } from "./modules/binds/BindsPage";
import { MiningPage } from "./modules/mining/MiningPage";
import { ReputationPage } from "./modules/reputation/ReputationPage";
import { BlueprintsPage } from "./modules/blueprints/BlueprintsPage";
import { MapPage } from "./modules/map/MapPage";
import { HangarPage } from "./modules/hangar/HangarPage";
import { ComingSoon } from "./modules/common/ComingSoon";
import { SettingsPage, DEFAULT_SETTINGS, type AppSettings } from "./modules/settings/SettingsPage";
import { loadStore } from "./lib/tauri";
import { useEffect, useCallback } from "react";
import { Boot } from "./components/Boot";
import { UpdateBanner } from "./components/UpdateBanner";

/**
 * Racine de l'application : une barre latérale et le module courant.
 * L'actualité s'ouvre au lancement.
 * Pas de routeur pour l'instant, un simple état suffit tant qu'il n'y a
 * ni liens profonds ni historique à gérer.
 */
export default function App() {
  const [module, setModule] = useState<ModuleId>("news");
  const [booted, setBooted] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const onBooted = useCallback(() => setBooted(true), []);
  useEffect(() => { loadStore<AppSettings>("settings").then((v) => { const st = { ...DEFAULT_SETTINGS, ...(v ?? {}) }; if (st.startModule) setModule(st.startModule); setAutoUpdate(st.autoUpdate); }).catch(() => undefined); }, []);

  return (
    <div className="app">
      <div className="stars" aria-hidden="true" />
      {!booted && <Boot onDone={onBooted} />}
      <Sidebar current={module} onSelect={setModule} />
      <main className="main" key={module}>
        {module === "news" && <NewsPage />}
        {module === "settings" && <SettingsPage />}
        {module === "starter" && <StarterPage />}
        {module === "dashboard" && <DashboardPage onGo={setModule} />}
        {module === "binds" && <BindsPage />}
        {module === "mining" && <MiningPage />}
        {module === "reputation" && <ReputationPage />}
        {module === "blueprints" && <BlueprintsPage />}
        {module === "hangar" && <HangarPage />}
        {module === "market" && (
          <ComingSoon
            title="Marché"
            crumb="MARCHÉ"
            lines={[
              "Prix d'achat et de revente par terminal (API UEX 2.0, clé saisie dans les paramètres).",
              "Routes commerciales et marges selon ton vaisseau.",
              "Prix du carburant et des locations.",
            ]}
          />
        )}
        {module === "equipment" && (
          <ComingSoon
            title="Équipement"
            crumb="ÉQUIPEMENT"
            lines={[
              "Armes et armures disponibles, avec leurs stats.",
              "Où les acheter et à quel prix, par système.",
              "Skins : à vérifier selon ce que renvoie l'API UEX.",
            ]}
          />
        )}
        {module === "map" && <MapPage />}
      </main>
      {booted && <UpdateBanner enabled={autoUpdate} />}
    </div>
  );
}

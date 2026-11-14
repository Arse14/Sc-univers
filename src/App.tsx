import { lazy, Suspense, useState } from "react";
import { Sidebar, type ModuleId } from "./components/Sidebar";
import { DEFAULT_SETTINGS, type AppSettings } from "./modules/settings/defaults";
import { loadStore } from "./lib/tauri";
import { useEffect, useCallback } from "react";
import { Boot } from "./components/Boot";
import { UpdateBanner } from "./components/UpdateBanner";

// Chaque module est chargé à la demande : son code (et Three.js pour les vues 3D)
// n'entre en mémoire que lorsqu'on l'ouvre, et la page précédente est démontée.
const NewsPage = lazy(() => import("./modules/news/NewsPage").then((m) => ({ default: m.NewsPage })));
const StarterPage = lazy(() => import("./modules/starter/StarterPage").then((m) => ({ default: m.StarterPage })));
const DashboardPage = lazy(() => import("./modules/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const BindsPage = lazy(() => import("./modules/binds/BindsPage").then((m) => ({ default: m.BindsPage })));
const MiningPage = lazy(() => import("./modules/mining/MiningPage").then((m) => ({ default: m.MiningPage })));
const ReputationPage = lazy(() => import("./modules/reputation/ReputationPage").then((m) => ({ default: m.ReputationPage })));
const BlueprintsPage = lazy(() => import("./modules/blueprints/BlueprintsPage").then((m) => ({ default: m.BlueprintsPage })));
const MapPage = lazy(() => import("./modules/map/MapPage").then((m) => ({ default: m.MapPage })));
const HangarPage = lazy(() => import("./modules/hangar/HangarPage").then((m) => ({ default: m.HangarPage })));
const SettingsPage = lazy(() => import("./modules/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const MarketPage = lazy(() => import("./modules/market/MarketPage").then((m) => ({ default: m.MarketPage })));
const EquipmentPage = lazy(() => import("./modules/equipment/EquipmentPage").then((m) => ({ default: m.EquipmentPage })));

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
        <Suspense fallback={<div className="panel empty mono" style={{ letterSpacing: ".2em", fontSize: 12 }}>CHARGEMENT DU MODULE…</div>}>
        {module === "news" && <NewsPage />}
        {module === "settings" && <SettingsPage />}
        {module === "starter" && <StarterPage />}
        {module === "dashboard" && <DashboardPage onGo={setModule} />}
        {module === "binds" && <BindsPage />}
        {module === "mining" && <MiningPage />}
        {module === "reputation" && <ReputationPage />}
        {module === "blueprints" && <BlueprintsPage />}
        {module === "hangar" && <HangarPage />}
        {module === "market" && <MarketPage />}
        {module === "equipment" && <EquipmentPage />}
        {module === "map" && <MapPage />}
        </Suspense>
      </main>
      {booted && <UpdateBanner enabled={autoUpdate} />}
    </div>
  );
}

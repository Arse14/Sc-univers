import { useState } from "react";
import { Sidebar, type ModuleId } from "./components/Sidebar";
import { NewsPage } from "./modules/news/NewsPage";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { BindsPage } from "./modules/binds/BindsPage";
import { MiningPage } from "./modules/mining/MiningPage";
import { ComingSoon } from "./modules/common/ComingSoon";

/**
 * Racine de l'application : une barre latérale et le module courant.
 * L'actualité s'ouvre au lancement.
 * Pas de routeur pour l'instant, un simple état suffit tant qu'il n'y a
 * ni liens profonds ni historique à gérer.
 */
export default function App() {
  const [module, setModule] = useState<ModuleId>("news");

  return (
    <div className="app">
      <Sidebar current={module} onSelect={setModule} />
      <main className="main">
        {module === "news" && <NewsPage />}
        {module === "dashboard" && <DashboardPage onGo={setModule} />}
        {module === "binds" && <BindsPage />}
        {module === "mining" && <MiningPage />}
        {module === "hangar" && (
          <ComingSoon
            title="Hangar"
            crumb="HANGAR"
            lines={[
              "Liste de tes vaisseaux (API FleetYards / wiki) avec leurs caractéristiques.",
              "Constructeur de loadout : composants, armes, boucliers, avec les stats.",
              "Suivi des changements d'équipement lus dans Game.log.",
            ]}
          />
        )}
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
        {module === "map" && (
          <ComingSoon
            title="Carte"
            crumb="CARTE"
            lines={[
              "Carte schématique : systèmes, planètes, stations, terminaux (données UEX).",
              "Boutiques et prix au clic sur un lieu.",
              "Distances entre terminaux pour planifier un trajet.",
            ]}
          />
        )}
      </main>
    </div>
  );
}

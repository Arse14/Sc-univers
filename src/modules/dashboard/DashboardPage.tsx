import { PageHeader, SectionHead, Note } from "../../components/Hud";
import type { ModuleId } from "../../components/Sidebar";
import { ModuleIcon } from "../../components/Icons";
import { Pic } from "../../components/Pic";
import { MODULE_ART, PLACES } from "../../lib/images";

const CARDS: { id: ModuleId; title: string; text: string; ready: boolean }[] = [
  { id: "news", title: "Actualité", text: "Comm-Link RSI, vidéos YouTube Star Citizen et état des serveurs, ouverts au lancement.", ready: true },
  { id: "starter", title: "Débuter", text: "Parcours guidé des premières heures, checklists, dépannage et lexique.", ready: true },
  { id: "binds", title: "Binds", text: "Tes commandes joystick / HOTAS lues dans actionmaps.xml, affichées sur une image de ton appareil.", ready: true },
  { id: "mining", title: "Minage", text: "Comparatif des têtes de minage : taille, stats, avantages, inconvénients, vaisseaux compatibles.", ready: true },
  { id: "reputation", title: "Réputations", text: "Organisations par système, paliers, comment monter et ce que chaque rang apporte.", ready: true },
  { id: "blueprints", title: "Schémas", text: "Où gagner les blueprints, où les utiliser (Item Fabricator) et comment fabriquer.", ready: true },
  { id: "hangar", title: "Hangar", text: "Ta flotte importée depuis HangarXPLOR, catalogue complet avec stats, prix et lieux d'achat.", ready: true },
  { id: "market", title: "Marché", text: "Prix d'achat / revente par terminal, routes commerciales.", ready: false },
  { id: "equipment", title: "Équipement", text: "Armes, armures, prix et disponibilité.", ready: false },
  { id: "map", title: "Carte", text: "Carte stellaire 3D : 90 systèmes, routes de saut, planètes, lunes et stations (données Starmap).", ready: true },
];

export function DashboardPage({ onGo }: { onGo: (m: ModuleId) => void }) {
  return (
    <>
      <PageHeader crumb="TABLEAU DE BORD" title="SC-Univers" sub="Compagnon de bureau pour Star Citizen. Lecture de fichiers locaux et d'APIs communautaires uniquement."
        banner={{ src: PLACES.stanton, kicker: "SYSTÈME STANTON ▸ UEE", text: "Actualité officielle, parcours guidé, binds de ton HOTAS, minage, réputations et schémas. Le hangar, le marché et la carte arrivent ensuite." }} />
      <SectionHead n="01" title="MODULES" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {CARDS.map((c) => (
          <button key={c.id} type="button" className="panel small img-card" style={{ textAlign: "left", color: "inherit", display: "flex", flexDirection: "column", cursor: "pointer", opacity: c.ready ? 1 : 0.75 }} onClick={() => onGo(c.id)}>
            <Pic src={MODULE_ART[c.id]} alt="" ratio="21 / 9" dim />
            <div className="img-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="display" style={{ fontSize: 20, letterSpacing: ".08em", color: "var(--text-bright)", textTransform: "uppercase" }}>{c.title}</span>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".14em", color: c.ready ? "var(--green)" : "var(--dimmer)" }}>{c.ready ? "DISPONIBLE" : "PRÉVU"}</span>
            </div>
            <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.5 }}>{c.text}</div>
            </div>
            <span className="card-ico"><ModuleIcon id={c.id} size={56} /></span>
          </button>
        ))}
      </div>
      <Note tag="ⓘ" info>SC-Univers n'est pas affilié à Cloud Imperium Games. Star Citizen® est une marque déposée de Cloud Imperium Games Corp.</Note>
    </>
  );
}

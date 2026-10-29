import { PageHeader, SectionHead, Note } from "../../components/Hud";
import type { ModuleId } from "../../components/Sidebar";

const CARDS: { id: ModuleId; title: string; text: string; ready: boolean }[] = [
  { id: "news", title: "Actualité", text: "Comm-Link RSI, vidéos YouTube Star Citizen et état des serveurs, ouverts au lancement.", ready: true },
  { id: "binds", title: "Binds", text: "Tes commandes joystick / HOTAS lues dans actionmaps.xml, affichées sur une image de ton appareil.", ready: true },
  { id: "mining", title: "Minage", text: "Comparatif des têtes de minage : taille, stats, avantages, inconvénients, vaisseaux compatibles.", ready: true },
  { id: "hangar", title: "Hangar", text: "Vaisseaux, loadouts et stats.", ready: false },
  { id: "market", title: "Marché", text: "Prix d'achat / revente par terminal, routes commerciales.", ready: false },
  { id: "equipment", title: "Équipement", text: "Armes, armures, prix et disponibilité.", ready: false },
  { id: "map", title: "Carte", text: "Carte schématique des systèmes et des lieux.", ready: false },
];

export function DashboardPage({ onGo }: { onGo: (m: ModuleId) => void }) {
  return (
    <>
      <PageHeader crumb="TABLEAU DE BORD" title="SC-Univers" sub="Compagnon de bureau pour Star Citizen. Lecture de fichiers locaux et d'APIs communautaires uniquement." />
      <SectionHead n="01" title="MODULES" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {CARDS.map((c) => (
          <button key={c.id} type="button" className="panel small" style={{ textAlign: "left", color: "inherit", display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }} onClick={() => onGo(c.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="display" style={{ fontSize: 20, letterSpacing: ".08em", color: "var(--text-bright)", textTransform: "uppercase" }}>{c.title}</span>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".14em", color: c.ready ? "var(--green)" : "var(--dimmer)" }}>{c.ready ? "DISPONIBLE" : "PRÉVU"}</span>
            </div>
            <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.5 }}>{c.text}</div>
          </button>
        ))}
      </div>
      <Note tag="ⓘ" info>SC-Univers n'est pas affilié à Cloud Imperium Games. Star Citizen® est une marque déposée de Cloud Imperium Games Corp.</Note>
    </>
  );
}

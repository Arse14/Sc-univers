/**
 * Schémas (blueprints) et fabrication — Alpha 4.7 → 4.10.2.
 *
 * Sources (nov. 2026) : expcarry.com (crafting-blueprints-guide, blueprints),
 * thisgengaming.com (guide 4.7), theimpound.com (crafting guide),
 * citizen-starter-guide.com (blueprint finder, données 4.10.2),
 * expcarry.com/star-citizen-reputation-guide (récompenses par faction).
 * À revérifier après chaque patch.
 */

export type SystemId = "stanton" | "pyro" | "nyx" | "events" | "all";

export interface BlueprintSource {
  id: string;
  faction: string;
  systems: SystemId[];
  how: string;            // mission / condition
  condition?: string;     // rang ou prérequis
  examples?: string;      // schémas connus
  guaranteed: boolean;    // récompense sûre ou tirage dans un lot
}

export const SOURCES: BlueprintSource[] = [
  { id: "start", faction: "Schémas de départ", systems: ["all"], how: "Disponibles dès le début pour tout le monde.", examples: "P4-AR (fusil).", guaranteed: true },
  { id: "foxwell-ambush", faction: "Foxwell Enforcement", systems: ["nyx", "stanton", "pyro"], how: "Missions « Ambush » (onglet Mercenaire) après la mission d'introduction Foxwell.", condition: "Intro Foxwell", examples: "Un schéma garanti parmi un lot de six (set d'armure intermédiaire + armes). Un set complet en ≈ 1 h.", guaranteed: true },
  { id: "foxwell-patrol", faction: "Foxwell Enforcement", systems: ["nyx", "stanton", "pyro"], how: "Patrouilles jaunes et plus : Security Sweep, Orange Security Patrol, Potential Security Threat, High-Risk Security Patrol.", condition: "Jr. Contractor (800) → Veteran (15 000)", examples: "aUEC, MG Scrip et schémas.", guaranteed: false },
  { id: "intersec", faction: "InterSec Defense Solutions", systems: ["nyx"], how: "Récupération de données, collecte de ressources, patrouilles. Tactical Strike Group (7+ vaisseaux).", condition: "Sr. Contractor (5 800) pour TSG", examples: "TSG : 2 schémas (un par lot) + 300 réputation.", guaranteed: false },
  { id: "adagio", faction: "Adagio Holdings", systems: ["nyx", "stanton", "pyro"], how: "Contrats de récupération (salvage).", examples: "Têtes de scraper Cinch, Abrade, Trawler.", guaranteed: false },
  { id: "recco", faction: "Recco Battaglia (Levski)", systems: ["nyx"], how: "Paliers de réputation après les trois missions d'histoire.", condition: "Introduction → Trusted Associate (6 000)", examples: "Modules Clearcut, Deluge, Overrun ; GOLEM MC-4 ; MISC Enhanced Ore Pod.", guaranteed: true },
  { id: "bhg", faction: "Bounty Hunters Guild", systems: ["stanton", "pyro"], how: "Certaines primes.", examples: "ASD, Hathor PAF.", guaranteed: false },
  { id: "northrock", faction: "Northrock Service Group", systems: ["stanton"], how: "Primes HRT.", condition: "Licence HRT", guaranteed: false },
  { id: "covalex", faction: "Covalex Shipping", systems: ["stanton"], how: "Contrats de fret de haut niveau.", condition: "Rang Master", guaranteed: false },
  { id: "cfp", faction: "Citizens for Prosperity", systems: ["pyro"], how: "Éliminations et défense de vaisseau.", condition: "Allégeance CFP (« Fight for Pyro »)", guaranteed: false },
  { id: "hh", faction: "Headhunters", systems: ["pyro"], how: "Éliminations et défense de vaisseau.", condition: "Allégeance Headhunters", guaranteed: false },
  { id: "eckhart", faction: "Eckhart Security", systems: ["nyx"], how: "Défense de vaisseau.", guaranteed: false },
  { id: "vaughn", faction: "Vaughn (illégal)", systems: ["stanton"], how: "Éliminations de cibles et de boss.", examples: "Rockcracker.", guaranteed: false },
  { id: "bitzeros", faction: "Bit Zeros (illégal)", systems: ["pyro"], how: "Récupération de boîtes noires (BlackBox Recovery).", guaranteed: false },
  { id: "jorrit", faction: "Dossier Jorrit", systems: ["stanton"], how: "Données mises à jour : énergie, sécurité, sismique, consommation.", guaranteed: false },
  { id: "rayari", faction: "Rayari Incorporated", systems: ["stanton"], how: "Collecte de gemmes et de pièces irradiées.", guaranteed: false },
  { id: "shubin", faction: "Shubin Interstellar", systems: ["stanton"], how: "Missions FPS et vaisseau.", guaranteed: false },
  { id: "wikelo", faction: "Wikelo's Emporium", systems: ["stanton"], how: "Troc d'objets collectés aux stations Dasi, Selo, Kinga.", condition: "Rang client + matériaux", examples: "4.10.2 : Gemini LMG, Grey Combat Armour.", guaranteed: true },
  { id: "events", faction: "Événements", systems: ["events"], how: "Siege of Orison, Defend Location, événements dynamiques.", guaranteed: false },
];

export const CATEGORIES = [
  { name: "Armures (sets et peintures)", count: 880 },
  { name: "Composants de vaisseau (coolers, centrales, boucliers, QD)", count: 381 },
  { name: "Armes personnelles", count: 174 },
  { name: "Armes de vaisseau", count: 95 },
  { name: "Munitions", count: 36 },
  { name: "Combinaisons et sous-combinaisons", count: 36 },
  { name: "Objets de mission", count: 4 },
];

export const FABRICATOR = {
  what: "L'Item Fabricator est une machine physique déployable : ton établi industriel. On ne fabrique pas depuis le mobiGlas.",
  price: "≈ 95 000 aUEC",
  buy: ["Ponts de raffinerie (MIC-L1 conseillé, moins fréquenté).", "Boutiques Kel-To et Dumper's Depot dans Stanton.", "Boutiques des raffineries dans Pyro.", "Le stock peut varier ; certains l'ont eu en récompense d'événement."],
  place: ["Dans ton hangar persistant : au terminal de fret, cherche « fab » pour le déployer. Astuce : le laisser sur l'ascenseur de fret et le ranger après usage.", "Dans un vaisseau avec une grille de cargo assez grande. Fermer la porte avant de le déplacer au tracteur."],
};

export const STEPS = [
  { t: "Obtenir le schéma", d: "Via une récompense de contrat (voir les sources). Il est lié au compte, permanent, et n'est pas consommé par la fabrication." },
  { t: "Rassembler les matériaux", d: "Minage (Fer, Aluminium, Hephaestanite, Cuivre, Tungstène, Laranite, Agricium, Ouratite, Aslarite, Torite, Corindon…), récupération, raffinage ou achat. Les matériaux doivent être dans l'inventaire local du fabricator." },
  { t: "Ouvrir le fabricator", d: "Interagir avec son écran, puis choisir le schéma exact de l'objet voulu." },
  { t: "Insérer les matériaux", d: "À la main, ou avec les boutons « best » / « worst ». Chaque emplacement influence des stats différentes (P4-AR : canon → impact et cadence ; carcasse et crosse → recul et maniement)." },
  { t: "Régler la qualité", d: "Qualité des matériaux de 1 à 1 000 (Q500 = neutre). Certaines recettes imposent un minimum ; le fabricator refuse en dessous. « Clear » rafraîchit l'aperçu des stats." },
  { t: "Choisir la livraison et lancer", d: "Sélectionner le lieu de livraison, puis Fabricate. Le travail entre dans la file (onglet Queues). P4-AR : 2 min 30 ; médiane ≈ 200 s ; munitions plus rapides." },
  { t: "Récupérer", d: "Au lieu de livraison choisi. Décharge les travaux finis via le Storage Manager avant un crash serveur (30k)." },
];

export const TIPS = [
  "Démantèlement : rend des matériaux, jamais de schéma. Casques P4 / ADP basiques → matériaux ≈ Q500, parfaits pour MedPens, munitions (≈ 300 Q suffisent) et Oxypens.",
  "Garde l'Orotite et la Caranite haute pureté pour les armures principales et les optiques.",
  "Signatures RS pour repérer les minerais : Aluminium 4285 / 4225, Fer 4270, Hephaestanite 4180, Orotite 4310 (rare).",
  "Les objets fabriqués par des joueurs rendent au démantèlement des matériaux de la qualité utilisée.",
  "4.7.2 : l'interface peut garder les stats d'un travail précédent. Clique « Clear Queue » avant chaque nouvelle fabrication.",
  "4.10.2 : bug connu, les bonus de stats d'un objet fabriqué peuvent être masqués dans l'inventaire jusqu'à l'équiper.",
  "Un contrat donne un schéma au hasard dans son lot : pour un schéma précis, il faut parfois répéter la mission.",
  "La fabrication de vaisseaux complets n'existe pas encore.",
];

export const DATA_VERSION = "Alpha 4.10.2 (système introduit en 4.7)";

/**
 * Têtes de minage (lasers) — données communautaires.
 *
 * Sources : grimhex.net/tools/mining/lasers (synchronisé UEX) et
 * expcarry.com (guide lasers & modules), relevées sur l'Alpha 4.10.2.
 * À revérifier après chaque patch. `null` = valeur non renseignée.
 */

export type HeadSize = "S1" | "S2";

export interface MiningHead {
  id: string;
  name: string;
  family: string;
  size: HeadSize;
  slots: number | null;
  optimalRange: number;   // m
  maxRange: number;       // m
  minPower: number;
  maxPower: number;
  extractPower: number;
  resistance: number | null;   // % (négatif = favorable)
  instability: number | null;  // % (négatif = favorable)
  chargeRate: number | null;   // % (positif = favorable)
  chargeWindow: number | null; // % (positif = favorable)
  ships: string[];
}

export interface HeadFamily {
  pros: string;
  cons: string;
  best: string;
}

export const FAMILIES: Record<string, HeadFamily> = {
  Arbor: {
    pros: "Forte réduction d'instabilité et grande fenêtre de charge : la charge reste facile à contrôler.",
    cons: "Pénalité de résistance (+25 %) : les roches dures sont plus difficiles à briser.",
    best: "Gisements maniables et apprentissage du contrôle de la manette des gaz.",
  },
  Hofstede: {
    pros: "Réduit la résistance de la roche, avec une fenêtre de charge très large et pardonnante.",
    cons: "Ajoute de l'instabilité, ce qui peut poser problème sur les roches volatiles.",
    best: "Roches de résistance modérée, quand le confort de contrôle compte plus que la puissance brute.",
  },
  Klein: {
    pros: "La plus forte réduction de résistance des familles standard.",
    cons: "Instabilité élevée (+35 %) et très peu d'emplacements de modules.",
    best: "Roches très résistantes, pour mineurs expérimentés. Pas un choix généraliste.",
  },
  Helix: {
    pros: "Réduit la résistance, offre une puissance élevée et une bonne flexibilité en modules.",
    cons: "Fenêtre de charge étroite et portée optimale courte : le positionnement et la précision comptent.",
    best: "Gisements durs, pour mineurs expérimentés.",
  },
  Lancet: {
    pros: "Charge rapidement dans la zone optimale.",
    cons: "Fenêtre très étroite (−60 %) : charger vite n'est pas facile à maîtriser.",
    best: "Configurations spécialisées où la fenêtre étroite peut être gérée.",
  },
  Impact: {
    pros: "Réduit l'instabilité, élargit la fenêtre, bonne extraction et bonne flexibilité en modules.",
    cons: "Charge optimale plus lente et résistance légèrement plus haute (+10 %).",
    best: "Minage contrôlé, quand la stabilité et l'extraction priment sur la rapidité.",
  },
  Pitman: {
    pros: "Livrée avec le Golem, avec deux emplacements de modules.",
    cons: "Tête propre au Golem. Les sources divergent sur la possibilité de la remplacer : à vérifier en jeu.",
    best: "Tête de départ du Golem.",
  },
};

const PROSPECTOR = ["MISC Prospector"];
const MOLE = ["Argo MOLE (3 tourelles)"];

export const HEADS: MiningHead[] = [
  { id: "arbor1", name: "Arbor MH1", family: "Arbor", size: "S1", slots: 1, optimalRange: 60, maxRange: 180, minPower: 189, maxPower: 1890, extractPower: 1850, resistance: 25, instability: -35, chargeRate: null, chargeWindow: 40, ships: PROSPECTOR },
  { id: "helix1", name: "Helix I", family: "Helix", size: "S1", slots: 2, optimalRange: 15, maxRange: 45, minPower: 630, maxPower: 3150, extractPower: 1850, resistance: -30, instability: null, chargeRate: null, chargeWindow: -40, ships: PROSPECTOR },
  { id: "hof1", name: "Hofstede-S1", family: "Hofstede", size: "S1", slots: 1, optimalRange: 45, maxRange: 135, minPower: 105, maxPower: 2100, extractPower: 1295, resistance: -30, instability: 10, chargeRate: 20, chargeWindow: 60, ships: PROSPECTOR },
  { id: "impact1", name: "Impact I", family: "Impact", size: "S1", slots: 2, optimalRange: 45, maxRange: 135, minPower: 420, maxPower: 2100, extractPower: 2775, resistance: 10, instability: -10, chargeRate: -40, chargeWindow: 20, ships: PROSPECTOR },
  { id: "klein1", name: "Klein-S1", family: "Klein", size: "S1", slots: 0, optimalRange: 45, maxRange: 135, minPower: 378, maxPower: 2220, extractPower: 2220, resistance: -45, instability: 35, chargeRate: null, chargeWindow: 20, ships: PROSPECTOR },
  { id: "lancet1", name: "Lancet MH1", family: "Lancet", size: "S1", slots: 1, optimalRange: 30, maxRange: 90, minPower: 504, maxPower: 2520, extractPower: 1850, resistance: null, instability: -10, chargeRate: 40, chargeWindow: -60, ships: PROSPECTOR },
  { id: "pitman", name: "Pitman", family: "Pitman", size: "S1", slots: 2, optimalRange: 40, maxRange: 45, minPower: 630, maxPower: 3150, extractPower: 1295, resistance: 25, instability: 35, chargeRate: -40, chargeWindow: 40, ships: ["Drake Golem"] },
  { id: "arbor2", name: "Arbor MH2", family: "Arbor", size: "S2", slots: 2, optimalRange: 90, maxRange: 270, minPower: 480, maxPower: 2400, extractPower: 2590, resistance: 25, instability: -35, chargeRate: null, chargeWindow: 40, ships: MOLE },
  { id: "helix2", name: "Helix II", family: "Helix", size: "S2", slots: 3, optimalRange: 30, maxRange: 90, minPower: 1020, maxPower: 4080, extractPower: 2590, resistance: -30, instability: null, chargeRate: null, chargeWindow: -40, ships: MOLE },
  { id: "hof2", name: "Hofstede-S2", family: "Hofstede", size: "S2", slots: 2, optimalRange: 60, maxRange: 180, minPower: 336, maxPower: 3360, extractPower: 1295, resistance: -30, instability: 10, chargeRate: 20, chargeWindow: 60, ships: MOLE },
  { id: "impact2", name: "Impact II", family: "Impact", size: "S2", slots: 3, optimalRange: 60, maxRange: 180, minPower: 840, maxPower: 3360, extractPower: 3145, resistance: 10, instability: -10, chargeRate: -40, chargeWindow: 20, ships: MOLE },
  { id: "klein2", name: "Klein-S2", family: "Klein", size: "S2", slots: 1, optimalRange: 60, maxRange: 180, minPower: 720, maxPower: 3600, extractPower: 2775, resistance: -45, instability: 35, chargeRate: null, chargeWindow: 20, ships: MOLE },
  { id: "lancet2", name: "Lancet MH2", family: "Lancet", size: "S2", slots: 2, optimalRange: 45, maxRange: 135, minPower: 900, maxPower: 3600, extractPower: 2590, resistance: null, instability: -10, chargeRate: 40, chargeWindow: -60, ships: MOLE },
];

export const SHIPS = [
  { name: "MISC Prospector", size: "S1", count: 1, note: "Vaisseau de minage solo. Une tête de taille 1." },
  { name: "Argo MOLE", size: "S2", count: 3, note: "Trois tourelles de minage indépendantes, chacune avec une tête de taille 2." },
  { name: "Drake Golem", size: "S1", count: 1, note: "Livré avec sa propre tête Pitman. Remplacement : sources divergentes, à vérifier en jeu." },
];

export const DATA_VERSION = "Alpha 4.10.2";

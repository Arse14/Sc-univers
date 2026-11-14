/**
 * Catalogue d'appareils intégrés : manches et manettes des gaz courants dans
 * Star Citizen, utilisables sans profil constructeur. Chaque commande porte
 * un code HID fictif au même format que les profils Logitech, ce qui donne
 * directement l'entrée Star Citizen (bouton N → jsX_buttonN, axes x/y/z…).
 *
 * La numérotation suit le réglage d'usine connu de chaque appareil. VKB et
 * Virpil se reprogramment (firmware) : la détection de touche de la page
 * permet de vérifier un bouton en appuyant dessus.
 */
import type { Device, DeviceControl } from "./types";

type Def =
  | ["b", string, number]                 // bouton : nom, numéro
  | ["h", string, number, boolean?]       // hat vu comme 4 boutons (haut, droite, bas, gauche) + appui éventuel (numéro suivant)
  | ["pov", string]                       // vrai hat (hat1)
  | ["a", string, "x" | "y" | "z" | "rotx" | "roty" | "rotz" | "slider1" | "slider2"];

const USAGE = { x: "30", y: "31", z: "32", rotx: "33", roty: "34", rotz: "35", slider1: "36", slider2: "37" } as const;
const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

function build(dev: string, defs: Def[]): DeviceControl[] {
  const id = (name: string) => `${dev}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  return defs.map((d): DeviceControl => {
    if (d[0] === "b") return { id: id(d[1]), name: d[1], kind: "button", hid: `0x0009${hex(d[2])}`, buttonIndex: d[2] };
    if (d[0] === "pov") return { id: id(d[1]), name: d[1], kind: "hat", hid: "0x00010039", buttonIndex: null };
    if (d[0] === "a") return { id: id(d[1]), name: d[1], kind: "axis", hid: `0x000100${USAGE[d[2]]}`, buttonIndex: null };
    const c: DeviceControl = { id: id(d[1]), name: d[1], kind: "hat", hid: `0x0009${hex(d[2])}`, buttonIndex: d[2] };
    if (d[3]) c.children = [{ id: id(d[1] + " appui"), name: "Appui", kind: "button", hid: `0x0009${hex(d[2] + 4)}`, buttonIndex: d[2] + 4 }];
    return c;
  });
}

export interface CatalogEntry { key: string; brand: string; name: string; kind: "stick" | "throttle"; note: string; defs: Def[] }

export const CATALOG: CatalogEntry[] = [
  {
    key: "t16000m", brand: "Thrustmaster", name: "T.16000M FCS", kind: "stick",
    note: "Numérotation d'usine : gâchette 1, boutons de tête 2 à 4, socle gauche 5 à 10, socle droit 11 à 16.",
    defs: [
      ["b", "Gâchette", 1], ["b", "Bouton bas", 2], ["b", "Bouton gauche", 3], ["b", "Bouton droit", 4], ["pov", "Chapeau"],
      ["b", "Socle G1", 5], ["b", "Socle G2", 6], ["b", "Socle G3", 7], ["b", "Socle G4", 10], ["b", "Socle G5", 9], ["b", "Socle G6", 8],
      ["b", "Socle D1", 13], ["b", "Socle D2", 12], ["b", "Socle D3", 11], ["b", "Socle D4", 14], ["b", "Socle D5", 15], ["b", "Socle D6", 16],
      ["a", "X Axis", "x"], ["a", "Y Axis", "y"], ["a", "Torsion", "rotz"], ["a", "Curseur", "slider1"],
    ],
  },
  {
    key: "twcs", brand: "Thrustmaster", name: "TWCS Throttle", kind: "throttle",
    note: "Numérotation d'usine supposée (14 boutons) : à vérifier avec la détection de touche.",
    defs: [
      ["b", "Bouton pouce orange", 1], ["b", "Bouton index", 2], ["b", "Bouton majeur", 3], ["b", "Bouton annulaire", 4], ["b", "Bouton auriculaire", 5],
      ["b", "Mini-stick appui", 6], ["pov", "Chapeau haut"], ["h", "Chapeau milieu", 7], ["h", "Chapeau bas", 11],
      ["a", "Gaz", "z"], ["a", "Mini-stick X", "x"], ["a", "Mini-stick Y", "y"], ["a", "Palonnier (palette)", "rotz"], ["a", "Molette antenne", "slider1"],
    ],
  },
  {
    key: "vkb-nxt-evo", brand: "VKB", name: "Gladiator NXT EVO SCE", kind: "stick",
    note: "Profil d'usine VKB supposé : le firmware se reprogramme, vérifie chaque bouton avec la détection de touche.",
    defs: [
      ["b", "Gâchette cran 1", 1], ["b", "Gâchette cran 2", 2], ["b", "A2 (rouge)", 3], ["b", "B1", 4], ["b", "D1 (auriculaire)", 5],
      ["h", "A3", 6, true], ["h", "A4", 11, true], ["h", "C1", 16, true], ["pov", "A1"], ["b", "A1 appui", 21],
      ["b", "Gâchette rapide avant", 22], ["b", "Gâchette rapide arrière", 23], ["b", "F1", 24], ["b", "F2", 25], ["b", "F3", 26],
      ["b", "SW1 gauche", 27], ["b", "SW1 droite", 28], ["b", "SW1 appui", 29],
      ["a", "X Axis", "x"], ["a", "Y Axis", "y"], ["a", "Torsion", "rotz"], ["a", "Levier de gaz", "z"],
    ],
  },
  {
    key: "virpil-alpha", brand: "Virpil", name: "Constellation Alpha", kind: "stick",
    note: "Chez Virpil la numérotation se règle dans VPC Configuration Tool : celle-ci est indicative, vérifie avec la détection de touche.",
    defs: [
      ["b", "Gâchette cran 1", 1], ["b", "Gâchette cran 2", 2], ["b", "Gâchette rabattable", 3], ["b", "Bouton rouge", 4], ["b", "Bouton latéral haut", 5], ["b", "Bouton latéral bas", 6], ["b", "Bouton auriculaire", 7],
      ["h", "Chapeau 1", 8, true], ["h", "Chapeau 2", 13, true], ["h", "Chapeau 3", 18, true], ["h", "Chapeau pouce", 23, true],
      ["b", "Molette haut", 28], ["b", "Molette bas", 29], ["b", "Molette appui", 30], ["b", "Mini-stick appui", 31],
      ["a", "X Axis", "x"], ["a", "Y Axis", "y"], ["a", "Torsion", "rotz"], ["a", "Mini-stick X", "rotx"], ["a", "Mini-stick Y", "roty"], ["a", "Levier de frein", "slider1"],
    ],
  },
];

export const CAT_PREFIX = "cat:";
/** Identifiant d'un appareil du catalogue : « cat:<clé>#<n> » (n = 1, 2… pour deux manches identiques). */
export const catalogId = (key: string, n: number) => `${CAT_PREFIX}${key}#${n}`;
export const isCatalogId = (id: string) => id.startsWith(CAT_PREFIX);
export function catalogEntryOf(id: string): CatalogEntry | null {
  const m = /^cat:([^#]+)#(\d+)$/.exec(id);
  return m ? CATALOG.find((e) => e.key === m[1]) ?? null : null;
}

export function catalogDevice(id: string): Device | null {
  const e = catalogEntryOf(id);
  if (!e) return null;
  const n = Number(id.split("#")[1]);
  return { id, name: e.name + (n > 1 ? ` (${n})` : ""), group: e.brand, controls: build(id, e.defs) };
}

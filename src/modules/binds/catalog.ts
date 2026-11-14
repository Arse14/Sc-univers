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

type Axis = "x" | "y" | "z" | "rotx" | "roty" | "rotz" | "slider1" | "slider2";
type Def =
  | ["b", string, number]                                   // bouton : nom, numéro
  | ["h", string, number, boolean?]                         // chapeau vu comme 4 boutons consécutifs (haut, droite, bas, gauche) + appui éventuel (numéro suivant)
  | ["h4", string, [number, number, number, number], number?] // chapeau à numéros libres [haut, droite, bas, gauche] + appui éventuel
  | ["pov", string]                                         // vrai chapeau (hat1)
  | ["a", string, Axis];

const USAGE = { x: "30", y: "31", z: "32", rotx: "33", roty: "34", rotz: "35", slider1: "36", slider2: "37" } as const;
const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

function build(dev: string, defs: Def[]): DeviceControl[] {
  const id = (name: string) => `${dev}:${name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_")}`;
  const btn = (name: string, n: number, full = name): DeviceControl => ({ id: id(full), name, kind: "button", hid: `0x0009${hex(n)}`, buttonIndex: n });
  return defs.map((d): DeviceControl => {
    if (d[0] === "b") return btn(d[1], d[2]);
    if (d[0] === "pov") return { id: id(d[1]), name: d[1], kind: "hat", hid: "0x00010039", buttonIndex: null };
    if (d[0] === "a") return { id: id(d[1]), name: d[1], kind: "axis", hid: `0x000100${USAGE[d[2]]}`, buttonIndex: null };
    if (d[0] === "h4") {
      const c: DeviceControl = { id: id(d[1]), name: d[1], kind: "hat", hid: null, buttonIndex: null, children: ["▲ Haut", "▶ Droite", "▼ Bas", "◀ Gauche"].map((n, i) => btn(n, d[2][i], d[1] + n)) };
      if (d[3]) c.children!.push(btn("Appui", d[3], d[1] + " appui"));
      return c;
    }
    const c: DeviceControl = { id: id(d[1]), name: d[1], kind: "hat", hid: `0x0009${hex(d[2])}`, buttonIndex: d[2] };
    if (d[3]) c.children = [btn("Appui", d[2] + 4, d[1] + " appui")];
    return c;
  });
}

export interface CatalogEntry { key: string; brand: string; name: string; kind: "stick" | "throttle" | "hotas"; sure: boolean; defs: Def[] }
export const KIND_FR = { stick: "manche", throttle: "manette des gaz", hotas: "manche + gaz (un seul appareil)" } as const;

const XY: Def[] = [["a", "Axes · X", "x"], ["a", "Axes · Y", "y"]];
const seq = (names: string[], from: number): Def[] => names.map((n, i): Def => ["b", n, from + i]);

/**
 * Une commande nommée « Pièce · détail » (Gâchette · cran 2, T1 · bas…) partage
 * la pièce « Pièce » du modèle 3D. `sure` : numérotation d'usine documentée
 * (relevés de la communauté) ; sinon elle est indicative.
 */
export const CATALOG: CatalogEntry[] = [
  { key: "t16000m", brand: "Thrustmaster", name: "T.16000M FCS", kind: "stick", sure: true, defs: [
    ["b", "Gâchette", 1], ["b", "Bouton bas", 2], ["b", "Bouton gauche", 3], ["b", "Bouton droit", 4], ["pov", "Chapeau"],
    ["b", "Socle G1", 5], ["b", "Socle G2", 6], ["b", "Socle G3", 7], ["b", "Socle G4", 10], ["b", "Socle G5", 9], ["b", "Socle G6", 8],
    ["b", "Socle D1", 13], ["b", "Socle D2", 12], ["b", "Socle D3", 11], ["b", "Socle D4", 14], ["b", "Socle D5", 15], ["b", "Socle D6", 16],
    ...XY, ["a", "Torsion", "rotz"], ["a", "Curseur", "slider1"] ] },
  { key: "twcs", brand: "Thrustmaster", name: "TWCS Throttle", kind: "throttle", sure: true, defs: [
    ["b", "Bouton pouce", 1], ["b", "Bouton auriculaire", 2], ["b", "Bouton annulaire", 3], ["b", "Bascule · haut", 4], ["b", "Bascule · bas", 5],
    ["b", "Mini-stick · appui", 6], ["pov", "Chapeau haut"], ["h", "Chapeau milieu", 7], ["h", "Chapeau créneau", 11],
    ["a", "Gaz", "z"], ["a", "Mini-stick · X", "x"], ["a", "Mini-stick · Y", "y"], ["a", "Palette", "rotz"], ["a", "Molette", "slider1"] ] },
  { key: "warthog-stick", brand: "Thrustmaster", name: "HOTAS Warthog (manche)", kind: "stick", sure: true, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 6], ["b", "Bouton rouge", 2], ["b", "Bouton auriculaire", 3], ["b", "Palette auriculaire", 4], ["b", "Bouton latéral", 5],
    ["h", "Chapeau gauche (TMS)", 7], ["h", "Chapeau droit (DMS)", 11], ["h", "Chapeau pouce (CMS)", 15, true], ["pov", "Trim"], ...XY ] },
  { key: "warthog-throttle", brand: "Thrustmaster", name: "HOTAS Warthog (gaz)", kind: "throttle", sure: true, defs: [
    ["a", "Gaz", "z"], ["a", "Mini-stick · X", "x"], ["a", "Mini-stick · Y", "y"], ["b", "Mini-stick · appui", 1], ["a", "Friction", "slider1"],
    ["h4", "Chapeau micro", [3, 4, 5, 6], 2], ["pov", "Coolie hat"],
    ["b", "Aérofreins · avant", 7], ["b", "Aérofreins · arrière", 8], ["b", "Boat switch · avant", 9], ["b", "Boat switch · arrière", 10],
    ["b", "China hat · avant", 11], ["b", "China hat · arrière", 12], ["b", "Pinky switch · avant", 13], ["b", "Pinky switch · arrière", 14], ["b", "Bouton rouge gauche", 15],
    ["b", "ENG fuel G", 16], ["b", "ENG fuel D", 17], ["b", "ENG OPER G · bas", 18], ["b", "ENG OPER G · haut", 31], ["b", "ENG OPER D · bas", 19], ["b", "ENG OPER D · haut", 32],
    ["b", "APU", 20], ["b", "Silence train", 21], ["b", "Volets · haut", 22], ["b", "Volets · bas", 23], ["b", "EAC", 24], ["b", "RDR ALTM", 25],
    ["b", "Autopilote", 26], ["b", "LASTE · haut", 27], ["b", "LASTE · bas", 28] ] },
  { key: "tflight-hotas", brand: "Thrustmaster", name: "T.Flight HOTAS 4 / One / X", kind: "hotas", sure: true, defs: [
    ["b", "Gâchette", 1], ["b", "Bouton L1", 2], ["b", "Bouton R3", 3], ["b", "Bouton L3", 4], ["pov", "Chapeau"],
    ["b", "Gaz ▢", 5], ["b", "Gaz ✕", 6], ["b", "Gaz ◯", 7], ["b", "Gaz △", 8], ["b", "Gaz R2", 9], ["b", "Gaz L2", 10], ["b", "Socle SE", 11], ["b", "Socle ST", 12],
    ...XY, ["a", "Torsion", "rotz"], ["a", "Gaz", "z"], ["a", "Bascule palonnier", "slider1"] ] },
  { key: "x52", brand: "Logitech", name: "X52 / X52 Pro", kind: "hotas", sure: true, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 15], ["b", "Fire (capot)", 2], ["b", "Bouton A", 3], ["b", "Bouton B", 4], ["b", "Bouton C", 5], ["b", "Palette auriculaire", 6],
    ["pov", "Chapeau 1"], ["h", "Chapeau 2", 20], ["b", "T1 · haut", 9], ["b", "T1 · bas", 10], ["b", "T2 · haut", 11], ["b", "T2 · bas", 12], ["b", "T3 · haut", 13], ["b", "T3 · bas", 14],
    ["b", "Bouton D", 7], ["b", "Bouton E", 8], ["b", "Bouton i", 31], ["b", "Mini-souris · clic", 16], ["b", "Molette gaz · bas", 17], ["b", "Molette gaz · haut", 18], ["b", "Molette gaz · clic", 19],
    ["h", "Chapeau gaz", 27], ["b", "Bouton MFD", 32],
    ...XY, ["a", "Torsion", "rotz"], ["a", "Gaz", "z"], ["a", "Rotatif haut", "roty"], ["a", "Rotatif bas", "rotx"], ["a", "Curseur", "slider1"] ] },
  { key: "extreme3d", brand: "Logitech", name: "Extreme 3D Pro", kind: "stick", sure: true, defs: [
    ["b", "Gâchette", 1], ["b", "Bouton pouce", 2], ["b", "Tête 3", 3], ["b", "Tête 4", 4], ["b", "Tête 5", 5], ["b", "Tête 6", 6], ["pov", "Chapeau"],
    ...seq(["Socle 7", "Socle 8", "Socle 9", "Socle 10", "Socle 11", "Socle 12"], 7),
    ...XY, ["a", "Torsion", "rotz"], ["a", "Curseur", "slider1"] ] },
  { key: "vkb-nxt-evo", brand: "VKB", name: "Gladiator NXT EVO", kind: "stick", sure: false, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 2], ["b", "D1 (auriculaire)", 3], ["b", "A2 (rouge)", 4], ["b", "B1", 5],
    ["h", "A3", 6, true], ["h", "A4", 11, true], ["h", "C1", 16, true], ["pov", "A1"],
    ["b", "Gâchette rapide · avant", 21], ["b", "Gâchette rapide · arrière", 22], ["b", "SW1 · gauche", 23], ["b", "SW1 · droite", 24], ["b", "F1", 27], ["b", "F2", 28], ["b", "F3", 29],
    ...XY, ["a", "Torsion", "rotz"], ["a", "Levier de gaz", "z"] ] },
  { key: "virpil-alpha", brand: "Virpil", name: "Constellation Alpha", kind: "stick", sure: false, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 2], ["b", "Gâchette rabattable", 3], ["b", "Bouton rouge", 4], ["b", "Bouton latéral", 5], ["b", "Bouton auriculaire", 6],
    ["h", "Chapeau 1", 7, true], ["h", "Chapeau 2", 12, true], ["h", "Chapeau 3", 17, true], ["h", "Chapeau pouce", 22, true],
    ["b", "Molette · haut", 27], ["b", "Molette · bas", 28], ["b", "Molette · appui", 29], ["b", "Mini-stick · appui", 30],
    ...XY, ["a", "Torsion", "rotz"], ["a", "Mini-stick · X", "rotx"], ["a", "Mini-stick · Y", "roty"], ["a", "Levier de frein", "slider1"] ] },
  { key: "virpil-cm3", brand: "Virpil", name: "MongoosT-50CM3 Throttle", kind: "throttle", sure: false, defs: [
    ["a", "Gaz gauche", "x"], ["a", "Gaz droit", "y"], ["a", "Mini-stick · X", "rotx"], ["a", "Mini-stick · Y", "roty"], ["b", "Mini-stick · appui", 1], ["a", "Molette index", "z"], ["a", "Levier volets", "slider1"],
    ["h", "Chapeau 1", 2, true], ["h", "Chapeau 2", 7, true], ["h", "Chapeau 3", 12, true], ["b", "Bouton rouge", 17], ["b", "Bouton index", 18], ["b", "Bascule doigts · avant", 19], ["b", "Bascule doigts · arrière", 20],
    ["b", "Sélecteur · gauche", 21], ["b", "Sélecteur · droite", 22], ["b", "Sélecteur · appui", 23],
    ...seq(["B1", "B2", "B3", "B4", "B5", "B6"], 24),
    ["b", "T1 · haut", 30], ["b", "T1 · bas", 31], ["b", "T2 · haut", 32], ["b", "T2 · bas", 33], ["b", "T3 · haut", 34], ["b", "T3 · bas", 35], ["b", "T4 · haut", 36], ["b", "T4 · bas", 37],
    ["b", "E1 · gauche", 38], ["b", "E1 · droite", 39], ["b", "E2 · gauche", 40], ["b", "E2 · droite", 41], ["b", "Train", 42] ] },
  { key: "ursa-minor", brand: "WinWing", name: "Ursa Minor Fighter", kind: "stick", sure: false, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 2], ["b", "Bouton rouge", 3], ["b", "Bouton pouce", 4], ["b", "Bouton auriculaire", 5], ["b", "Palette", 6],
    ["pov", "Chapeau 1"], ["h", "Chapeau 2", 7, true], ["h", "Chapeau 3", 12, true], ["h", "Chapeau 4", 17, true],
    ...seq(["Socle 1", "Socle 2", "Socle 3", "Socle 4", "Socle 5", "Socle 6", "Socle 7", "Socle 8"], 22),
    ...XY, ["a", "Torsion", "rotz"], ["a", "Curseur", "slider1"] ] },
  { key: "ch-fighterstick", brand: "CH Products", name: "Fighterstick", kind: "stick", sure: true, defs: [
    ["b", "Gâchette", 1], ["b", "Bouton haut", 2], ["b", "Bouton latéral", 3], ["b", "Bouton auriculaire", 4],
    ["h", "Chapeau gauche", 5], ["h", "Chapeau créneau", 9], ["h", "Chapeau pouce", 13], ["pov", "Chapeau POV"], ...XY, ["a", "Molette du socle", "z"] ] },
  { key: "ch-throttle", brand: "CH Products", name: "Pro Throttle", kind: "throttle", sure: true, defs: [
    ["a", "Gaz", "z"], ["a", "Mini-stick · X", "x"], ["a", "Mini-stick · Y", "y"], ["b", "Mini-stick · appui", 13],
    ["h4", "Chapeau créneau", [4, 1, 2, 3]], ["h4", "Chapeau bas", [8, 5, 6, 7]], ["h4", "Chapeau arrière", [11, 10, 9, 12]], ["pov", "Chapeau POV"],
    ["b", "Bouton avant D", 14], ["b", "Bouton avant M", 15], ["b", "Bouton avant G", 16] ] },
  { key: "velocityone", brand: "Turtle Beach", name: "VelocityOne Flightstick", kind: "stick", sure: false, defs: [
    ["b", "Gâchette", 1], ["b", "Bouton A", 2], ["b", "Bouton B", 3], ["b", "Bouton X", 4], ["b", "Bouton Y", 5], ["pov", "Chapeau"], ["b", "Mini-stick · appui", 6], ["b", "Gâchette rapide", 7],
    ...seq(["Socle G1", "Socle G2", "Socle G3", "Socle G4", "Socle D1", "Socle D2", "Socle D3", "Socle D4"], 8), ["b", "Molette · gauche", 16], ["b", "Molette · droite", 17],
    ...XY, ["a", "Torsion", "rotz"], ["a", "Mini-stick · X", "rotx"], ["a", "Mini-stick · Y", "roty"], ["a", "Levier G", "z"], ["a", "Levier D", "slider1"] ] },
  { key: "x55-stick", brand: "Saitek", name: "X-55 Rhino (manche)", kind: "stick", sure: true, defs: [
    ["b", "Trigger", 1], ["b", "A", 2], ["b", "B", 3], ["b", "D", 4], ["b", "Pinky · bouton", 5], ["b", "Pinky · palette", 6], ["h", "H1", 7], ["h", "H2", 11], ["pov", "POV"],
    ["a", "X Axis", "x"], ["a", "Y Axis", "y"], ["a", "Twist", "rotz"] ] },
  { key: "x55-throttle", brand: "Saitek", name: "X-55 Rhino (gaz)", kind: "throttle", sure: true, defs: [
    ["a", "Left Throttle", "x"], ["b", "E", 1], ["b", "F Push", 2], ["b", "G Push", 3], ["b", "H", 4], ["b", "I", 5],
    ...seq(["SW 1", "SW 2", "SW 3", "SW 4", "SW 5", "SW 6"], 6),
    ...seq(["TGL 1 Up", "TGL 1 Down", "TGL 2 Up", "TGL 2 Down", "TGL 3 Up", "TGL 3 Down", "TGL 4 Up", "TGL 4 Down"], 12),
    ["h", "H3", 20], ["h", "H4", 24], ["b", "K1 Up", 28], ["b", "K1 Down", 29], ["b", "Scroll FWD", 30], ["b", "Scroll BCK", 31],
    ["a", "Rotary 1", "z"], ["a", "Rotary 2", "rotx"], ["a", "Rotary 3", "rotz"], ["a", "Rotary 4", "roty"], ["a", "Mouse X", "slider2"], ["a", "Mouse Y", "slider1"] ] },
  { key: "x65f", brand: "Saitek", name: "X-65F", kind: "hotas", sure: true, defs: [
    ["b", "Trigger", 1], ["b", "A", 2], ["b", "B", 3], ["b", "Pinky · bouton C", 4], ["b", "Pinky · palette", 5], ["h", "H1", 9], ["h", "H2", 13], ["h", "C Stick (chapeau latéral)", 17], ["pov", "POV"],
    ["a", "X Axis", "x"], ["a", "Y Axis", "y"], ["a", "Twist", "rotz"],
    ["a", "Gaz gauche", "z"], ["a", "Gaz droit", "slider1"], ["b", "Bouton D (postcombustion)", 6], ["a", "Rotatif E · axe", "rotx"], ["b", "Rotatif E · appui", 7], ["b", "Rotatif F · appui", 8],
    ["h", "Chapeau gaz haut", 21], ["h", "Chapeau gaz bas", 25], ["h", "Chapeau gaz créneau", 29], ["h", "Chapeau molette", 33, true],
    ["b", "Molette · haut", 38], ["b", "Molette · bas", 39], ["b", "Bascule K · haut", 40], ["b", "Bascule K · bas", 41], ...seq(["T1", "T2", "T3", "T4"], 42), ["b", "Bouton Danger", 46] ] },
  { key: "x45", brand: "Saitek", name: "X-45", kind: "hotas", sure: true, defs: [
    ["b", "Gâchette", 1], ["b", "Bouton A", 2], ["b", "Bouton B", 3], ["b", "Launch (capot)", 4], ["b", "Bouton C", 8], ["b", "Palette auriculaire", 7], ["pov", "Chapeau 1"], ["h", "Chapeau 2", 15],
    ["b", "T1 · haut", 9], ["b", "T1 · bas", 10], ["b", "T2 · haut", 11], ["b", "T2 · bas", 12], ["b", "T3 · haut", 13], ["b", "T3 · bas", 14],
    ["b", "Bouton D", 5], ["b", "Bouton souris", 6], ["h", "Chapeau gaz", 19], ["h", "Chapeau souris", 23],
    ...XY, ["a", "Gaz", "slider1"], ["a", "Palonnier (bascule)", "rotz"], ["a", "Rotatif haut", "roty"], ["a", "Rotatif bas", "rotx"] ] },
  { key: "fly5", brand: "Saitek", name: "Cyborg F.L.Y. 5", kind: "stick", sure: true, defs: [
    ["b", "Gâchette", 1], ["b", "Tête 2", 2], ["b", "Tête 3", 3], ["b", "Tête 4", 4], ["b", "Tête 5", 5], ["pov", "Chapeau"],
    ...seq(["Socle 6", "Socle 7", "Socle 8", "Socle 9", "Arrière G", "Arrière D"], 6), ["b", "Molette · haut", 12], ["b", "Molette · bas", 13], ["b", "Bouton du socle", 14],
    ...XY, ["a", "Torsion", "rotz"], ["a", "Levier de gaz", "z"] ] },
  { key: "g940", brand: "Logitech", name: "G940 (manche)", kind: "stick", sure: true, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 9], ["b", "Fire", 2], ...seq(["S1", "S2", "S3", "S4", "S5"], 3), ["pov", "Chapeau"], ["b", "Mini-stick · appui", 8],
    ["a", "Mini-stick · X", "slider2"], ["a", "Mini-stick · Y", "slider1"], ...XY, ["a", "Trim 1", "rotz"], ["a", "Trim 2", "rotx"], ["a", "Trim 3", "roty"] ] },
  { key: "cobra-m5", brand: "Defender", name: "Cobra M5", kind: "stick", sure: true, defs: [
    ["b", "Gâchette", 1], ["b", "Gâchette secondaire", 2], ["b", "Bouton rouge G", 3], ["b", "Bouton rouge D", 4], ["h4", "Chapeau", [6, 7, 8, 5]], ["b", "Palette auriculaire", 9], ["pov", "Chapeau POV"],
    ...XY, ["a", "Torsion", "rotz"] ] },
  { key: "virpil-delta", brand: "Virpil", name: "WarBRD Delta", kind: "stick", sure: true, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 2], ["b", "Bouton de gâchette", 3], ["b", "Molette · haut", 4], ["b", "Molette · bas", 5], ["b", "Molette · appui", 6],
    ["b", "Mini-stick · appui", 7], ["h", "Chapeau droit", 8, true], ["h", "Chapeau gauche", 13, true], ["h", "Chapeau lumineux", 18, true],
    ...XY, ["a", "Torsion", "z"], ["a", "Mini-stick · X", "rotx"], ["a", "Mini-stick · Y", "roty"] ] },
  { key: "virpil-warbrd", brand: "Virpil", name: "WarBRD (poignée)", kind: "stick", sure: false, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 2], ["b", "Bouton rouge", 3], ["b", "Bouton auriculaire", 4], ["b", "Bouton vert", 19],
    ["h", "Chapeau haut", 5, true], ["h", "Chapeau pouce", 14, true], ...XY, ["a", "Torsion", "rotz"] ] },
  { key: "virpil-t50", brand: "Virpil", name: "MongoosT-50CM2 (poignée)", kind: "stick", sure: false, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 2], ["b", "Gâchette rabattable", 3], ["b", "Bouton rouge", 4], ["b", "Bouton noir", 5], ["b", "Bouton auriculaire", 6],
    ["pov", "Chapeau trim"], ["h", "Chapeau 2", 9, true], ["h", "Chapeau 3", 15, true], ["h", "Chapeau pouce", 25, true], ["a", "Levier de frein", "z"], ["b", "Levier de frein · butée", 31], ...XY ] },
  { key: "orion-f16", brand: "WinWing", name: "Orion 2 + poignée F-16", kind: "stick", sure: false, defs: [
    ["b", "Gâchette · cran 1", 1], ["b", "Gâchette · cran 2", 2], ["b", "Bouton rouge", 20], ["b", "Bouton auriculaire", 3], ["b", "Palette", 4],
    ["pov", "Trim"], ["b", "Trim · appui", 19], ["h4", "Chapeau droit (DMS)", [15, 16, 17, 18], 14], ["h4", "Chapeau gauche (TMS)", [32, 33, 34, 35], 31], ["h4", "Chapeau pouce (CMS)", [37, 38, 39, 40], 36], ...XY ] },
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
  return { id, name: `${e.brand} ${e.name}` + (n > 1 ? ` (${n})` : ""), group: "", controls: build(id, e.defs) };
}

/**
 * Modèles 3D des appareils du catalogue (hors X56), reconstruits par code de
 * mémoire d'après la forme connue de chaque appareil : proportions, couleurs
 * et emplacement des commandes. Même repère que models.ts : pilote côté +Z,
 * +X à sa droite, +Y vers le haut, unités en mètres.
 *
 * Chaque commande est un groupe `userData.control = <nom du catalogue>` avec
 * `userData.label` (étiquette affichée au-dessus dans la vue 3D).
 */
import * as THREE from "three";
import { MAT } from "./materials";
import { KIT, registerModels } from "./models";

const { mesh, rbox, chamferBox, at, cyl, control, decal, loft, knurledKnob } = KIT;

const X = {
  orange: new THREE.MeshStandardMaterial({ color: 0xf26a1b, roughness: 0.5, metalness: 0.15 }),
  orangeLit: new THREE.MeshStandardMaterial({ color: 0xff7a1f, emissive: 0xff6a10, emissiveIntensity: 1.1, roughness: 0.4 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.45, metalness: 0.2 }),
  grey: new THREE.MeshStandardMaterial({ color: 0x7d848c, roughness: 0.55, metalness: 0.35 }),
  darkGrey: new THREE.MeshStandardMaterial({ color: 0x33383f, roughness: 0.6, metalness: 0.3 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9aa1a9, roughness: 0.32, metalness: 0.95 }),
  whiteLed: new THREE.MeshStandardMaterial({ color: 0xdfe9f2, emissive: 0xbfd8ee, emissiveIntensity: 0.9, roughness: 0.4 }),
};


/** Commande cliquable avec son étiquette. */
function ctl(name: string, label: string, x: number, y: number, z: number, ...children: THREE.Object3D[]): THREE.Group {
  const g = control(name, x, y, z, ...children);
  g.userData.label = label;
  return g;
}

/** Bouton rond : collerette + poussoir. */
function push(r: number, h: number, mat: THREE.Material, collar: THREE.Material = MAT.plastic): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(r * 1.28, r * 1.28, 0.0016, collar, 28), 0, 0.0008, 0));
  g.add(at(cyl(r * 0.94, r, h, mat, 28), 0, h / 2 + 0.0012, 0));
  return g;
}

/** Chapeau 4 voies (+ appui) : embase, tige, tête striée ou cruciforme. */
function hat(r: number, mat: THREE.Material, style: "castle" | "dome" | "cross" = "castle"): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(r * 1.15, r * 1.25, 0.002, MAT.plastic, 32), 0, 0.001, 0));
  g.add(at(cyl(r * 0.35, r * 0.45, 0.005, MAT.gunmetal, 16), 0, 0.0045, 0));
  if (style === "dome") {
    g.add(mesh(new THREE.SphereGeometry(r * 0.8, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 0.006, 0));
    g.add(at(cyl(r * 0.8, r * 0.8, 0.0015, mat, 24), 0, 0.0055, 0));
  } else {
    g.add(at(cyl(r * 0.78, r * 0.9, 0.003, mat, style === "castle" ? 8 : 24), 0, 0.008, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + (style === "castle" ? 0 : Math.PI / 4) * 0;
      g.add(mesh(new THREE.BoxGeometry(r * 0.42, 0.0026, r * 0.3), mat, Math.cos(a) * r * 0.62, 0.0105, Math.sin(a) * r * 0.62).rotateY(-a));
    }
  }
  return g;
}

/** Mini-stick analogique : cuvette + champignon. */
function ministick(r: number, mat: THREE.Material = MAT.rubber): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(r * 1.25, r * 1.35, 0.0022, MAT.gloss, 32), 0, 0.0011, 0));
  g.add(at(cyl(r * 0.3, r * 0.36, 0.006, MAT.gunmetal, 16), 0, 0.005, 0));
  g.add(at(cyl(r * 0.82, r * 0.95, 0.0028, mat, 28), 0, 0.0092, 0));
  g.add(mesh(new THREE.TorusGeometry(r * 0.7, 0.0006, 6, 28), MAT.panel, 0, 0.0108, 0).rotateX(Math.PI / 2));
  return g;
}

/** Soufflet du cardan : cône annelé. */
function boot(r: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / n; const rr = r * (1 - t * 0.55);
    g.add(at(cyl(rr * 0.86, rr, h / n, MAT.rubber, 40), 0, (i + 0.5) * (h / n), 0));
    g.add(mesh(new THREE.TorusGeometry(rr * 0.95, h / n / 5, 8, 40), MAT.rubber, 0, i * (h / n) + 0.001, 0).rotateX(Math.PI / 2));
  }
  return g;
}

/** Gâchette : lame courbe devant la poignée (pointe vers −Z). */
function trigger(len: number, w: number, mat: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(-0.012, -0.002); s.quadraticCurveTo(-0.02, -len * 0.5, -0.011, -len); s.lineTo(-0.004, -len); s.quadraticCurveTo(-0.01, -len * 0.5, 0, -0.012); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2 });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(-Math.PI / 2);   // le profil (x→avant) passe dans le plan ZY, pointe vers −Z
  return mesh(geo, mat);
}

/** Anneau de torsion à la base d'une poignée. */
function twistRing(r: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(r, r * 1.04, 0.012, mat, 40), 0, 0.006, 0));
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; g.add(mesh(new THREE.BoxGeometry(0.0016, 0.009, 0.0012), MAT.plastic, Math.cos(a) * r * 1.02, 0.006, Math.sin(a) * r * 1.02).rotateY(-a + Math.PI / 2)); }
  return g;
}

// ─────────────────────── THRUSTMASTER T.16000M FCS ───────────────────────
// Socle large aux flancs arrondis portant 6 boutons de chaque côté (2 rangées
// de 3), curseur de gaz orange côté pilote, poignée symétrique (ambidextre)
// aux flancs orange, gâchette orange, tête avec chapeau et 3 boutons.
export function buildT16000M(): THREE.Group {
  const root = new THREE.Group(); root.name = "T.16000M";
  const H = 0.04;
  root.add(loft([{ y: 0, rx: 0.112, rz: 0.118, n: 3.2 }, { y: 0.012, rx: 0.114, rz: 0.12, n: 3.2 }, { y: H - 0.006, rx: 0.104, rz: 0.11, n: 3 }, { y: H, rx: 0.098, rz: 0.104, n: 3 }], MAT.body, 64));
  root.add(at(cyl(0.05, 0.058, 0.01, MAT.plastic, 48), 0, H + 0.005, -0.012));
  root.add(at(boot(0.042, 0.028), 0, H + 0.01, -0.012));
  root.add(at(decal("T.16000M", 0.007, "#f26a1b"), 0, H + 0.0006, 0.064));
  // boutons du socle : 2 rangées de 3 par côté, numérotation d'usine
  const rows: [string, string, number, number, number][] = [];
  ["G1", "G2", "G3"].forEach((n, i) => rows.push([`Socle ${n}`, String(5 + i), -1, i, 0]));
  ["G4", "G5", "G6"].forEach((n, i) => rows.push([`Socle ${n}`, String(10 - i), -1, i, 1]));
  ["D1", "D2", "D3"].forEach((n, i) => rows.push([`Socle ${n}`, String(13 - i), 1, i, 0]));
  ["D4", "D5", "D6"].forEach((n, i) => rows.push([`Socle ${n}`, String(14 + i), 1, i, 1]));
  for (const [name, num, side, col, row] of rows) {
    // côté gauche : colonnes de l'extérieur vers l'intérieur ; côté droit : de l'intérieur vers l'extérieur
    const x = side < 0 ? -0.09 + col * 0.0185 : 0.053 + col * 0.0185;
    const z = -0.036 + row * 0.024 + Math.abs(x) * 0.12;
    const cap = rbox(0.0145, 0.005, 0.017, 0.003, MAT.plastic);
    const led = mesh(new THREE.BoxGeometry(0.009, 0.0006, 0.0014), X.orangeLit, 0, 0.0054, -0.005);
    root.add(ctl(name, num, x, H + 0.0005, z, at(cap, 0, 0.0025, 0), led));
  }
  // curseur de gaz, côté pilote
  root.add(mesh(new THREE.BoxGeometry(0.062, 0.001, 0.008), MAT.gloss, 0, H + 0.0006, 0.086));
  root.add(ctl("Curseur", "CURSEUR", 0.012, H + 0.001, 0.086, at(rbox(0.012, 0.011, 0.014, 0.003, X.orange), 0, 0.0055, 0)));

  // poignée
  const grip = new THREE.Group(); grip.position.set(0, H + 0.034, -0.012); grip.rotation.x = -0.1;
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.021, MAT.plastic)));
  grip.add(loft([
    { y: 0.01, rx: 0.02, rz: 0.021 }, { y: 0.022, rx: 0.036, rz: 0.04, cz: 0.004, n: 2.6 }, { y: 0.03, rx: 0.037, rz: 0.041, cz: 0.004, n: 2.6 },   // repose-main
    { y: 0.036, rx: 0.0225, rz: 0.026, cz: 0.001 }, { y: 0.07, rx: 0.0215, rz: 0.0255 }, { y: 0.105, rx: 0.0225, rz: 0.0265, cz: -0.001 },
    { y: 0.125, rx: 0.026, rz: 0.03, cz: -0.002, n: 2.8 }, { y: 0.15, rx: 0.0285, rz: 0.033, cz: -0.002, n: 3 }, { y: 0.166, rx: 0.026, rz: 0.03, cz: -0.001, n: 3 }, { y: 0.174, rx: 0.018, rz: 0.022, n: 2.6 },
  ], MAT.body, 48));
  for (const sx of [-1, 1]) grip.add(at(rbox(0.003, 0.07, 0.03, 0.0012, X.orange), sx * 0.0222, 0.076, 0.001));
  grip.add(ctl("Gâchette", "1", 0, 0.128, -0.027, trigger(0.036, 0.013, X.orange)));
  grip.add(ctl("X Axis", "X / Y", 0, 0.085, 0.027, mesh(new THREE.BoxGeometry(0.012, 0.03, 0.001), MAT.rubber)));
  // tête : face inclinée vers le pilote
  const head = new THREE.Group(); head.position.set(0, 0.156, 0.022); head.rotation.x = 1.05;
  head.add(at(rbox(0.05, 0.004, 0.05, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Chapeau", "POV", 0, 0.001, -0.016, hat(0.0075, MAT.plastic, "castle")));
  head.add(ctl("Bouton bas", "2", 0, 0.001, 0.012, push(0.0052, 0.003, X.orange)));
  head.add(ctl("Bouton gauche", "3", -0.0155, 0.001, 0.0, push(0.0052, 0.003, MAT.plastic, X.orange)));
  head.add(ctl("Bouton droit", "4", 0.0155, 0.001, 0.0, push(0.0052, 0.003, MAT.plastic, X.orange)));
  grip.add(head);
  root.add(grip);
  return root;
}

// ─────────────────────── THRUSTMASTER TWCS ───────────────────────
// Manette des gaz à glissière : socle long, deux rails, poignée massive tenue
// de la main gauche. Pouce (flanc droit) : mini-stick, bouton orange, trois
// chapeaux. Avant : trois boutons, palette de palonnier, molette d'antenne.
export function buildTWCS(): THREE.Group {
  const root = new THREE.Group(); root.name = "TWCS";
  const H = 0.034;
  root.add(loft([{ y: 0, rx: 0.1, rz: 0.13, n: 4 }, { y: 0.01, rx: 0.102, rz: 0.132, n: 4 }, { y: H, rx: 0.092, rz: 0.124, n: 4 }], MAT.body, 64));
  root.add(at(rbox(0.13, 0.002, 0.2, 0.01, MAT.gloss), -0.012, H + 0.001, 0));
  for (const sx of [-1, 1]) root.add(at(cyl(0.005, 0.005, 0.2, X.steel, 16).rotateX(Math.PI / 2), -0.012 + sx * 0.04, H + 0.011, 0));
  for (const sz of [-1, 1]) root.add(at(rbox(0.11, 0.018, 0.012, 0.003, MAT.plastic), -0.012, H + 0.009, sz * 0.1));
  root.add(at(decal("TWCS", 0.008, "#f26a1b"), 0.068, H + 0.0006, 0.085));

  const car = new THREE.Group(); car.position.set(-0.012, H + 0.004, -0.01);
  car.add(at(rbox(0.105, 0.016, 0.07, 0.006, MAT.plastic), 0, 0.008, 0));
  // poignée : gros galet arrondi, plus haut côté paume (gauche)
  const handle = loft([
    { y: 0.014, rx: 0.046, rz: 0.04, n: 3 }, { y: 0.04, rx: 0.056, rz: 0.05, cz: -0.004, n: 2.8 }, { y: 0.07, rx: 0.058, rz: 0.054, cz: -0.006, n: 2.6 },
    { y: 0.092, rx: 0.05, rz: 0.048, cz: -0.006, n: 2.4 }, { y: 0.104, rx: 0.034, rz: 0.034, cz: -0.006, n: 2.2 },
  ], MAT.body, 56);
  car.add(ctl("Gaz", "GAZ", 0, 0, 0, handle));
  for (const z of [-0.03, -0.01, 0.01]) car.add(mesh(new THREE.BoxGeometry(0.06, 0.0012, 0.004), X.orange, -0.006, 0.1035 - Math.abs(z + 0.006) * 0.12, z));
  // panneau du pouce : flanc droit, incliné vers le pilote et vers le haut
  const thumb = new THREE.Group(); thumb.position.set(0.054, 0.062, 0.006); thumb.rotation.set(0, 0, -Math.PI / 2 + 0.35); thumb.rotateX(0.25);
  thumb.add(at(rbox(0.07, 0.006, 0.075, 0.012, MAT.plastic), 0, -0.002, 0));
  thumb.add(ctl("Mini-stick X", "MINI", 0.016, 0.001, 0.02, ministick(0.0075)));
  thumb.add(ctl("Bouton pouce orange", "1", -0.016, 0.001, 0.022, push(0.006, 0.0035, X.orange)));
  thumb.add(ctl("Chapeau haut", "POV", 0.017, 0.001, -0.004, hat(0.0068, X.grey, "castle")));
  thumb.add(ctl("Chapeau milieu", "7–10", -0.004, 0.001, -0.006, hat(0.0068, MAT.plastic, "cross")));
  thumb.add(ctl("Chapeau bas", "11–14", -0.02, 0.001, -0.022, hat(0.0068, X.grey, "dome")));
  car.add(thumb);
  // face avant (côté doigts)
  const front = new THREE.Group(); front.position.set(-0.004, 0.058, -0.056); front.rotation.x = -Math.PI / 2 + 0.12;
  front.add(ctl("Bouton index", "2", 0.03, 0.001, -0.022, push(0.0058, 0.0035, MAT.plastic, X.orange)));
  front.add(ctl("Bouton majeur", "3", 0.008, 0.001, -0.024, push(0.0058, 0.0035, MAT.plastic, X.orange)));
  front.add(ctl("Bouton annulaire", "4", -0.014, 0.001, -0.022, push(0.0058, 0.0035, MAT.plastic, X.orange)));
  front.add(ctl("Bouton auriculaire", "5", -0.034, 0.001, -0.012, push(0.0058, 0.0035, X.orange)));
  front.add(ctl("Palonnier (palette)", "PALETTE", 0.0, 0.004, 0.006, rbox(0.07, 0.008, 0.013, 0.004, X.orange)));
  front.add(ctl("Molette antenne", "MOLETTE", 0.034, 0.003, 0.024, knurledKnob(0.0085, 0.008, MAT.knurl)));
  car.add(front);
  root.add(car);
  return root;
}

// ─────────────────────── VKB GLADIATOR NXT EVO (SCE) ───────────────────────
// Socle carré noir : trois boutons F1–F3 et l'encodeur SW1 côté pilote, petit
// levier de gaz sur le flanc gauche. Poignée à torsion avec repose-main ; tête :
// A1 (chapeau analogique gris), A2 rouge, A3 et A4 ; C1 côté pouce, B1, D1 à
// l'auriculaire ; gâchette à deux crans et gâchette rapide rouge rabattable.
export function buildNxtEvo(): THREE.Group {
  const root = new THREE.Group(); root.name = "Gladiator NXT EVO";
  const W = 0.166, H = 0.038;
  root.add(at(chamferBox(W, H - 0.008, W, 0.016, MAT.body), 0, (H - 0.008) / 2, 0));
  root.add(at(chamferBox(W - 0.008, 0.008, W - 0.008, 0.014, MAT.plastic), 0, H - 0.004, 0));
  root.add(at(cyl(0.047, 0.052, 0.008, MAT.gloss, 48), 0, H + 0.004, -0.014));
  root.add(at(boot(0.04, 0.03), 0, H + 0.008, -0.014));
  root.add(at(decal("GLADIATOR NXT", 0.0048, "#9aa1a9"), -0.03, H + 0.0006, 0.066));
  // façade côté pilote : F1, F2, F3 éclairés + encodeur SW1
  ["F1", "F2", "F3"].forEach((n, i) => {
    const cap = rbox(0.013, 0.004, 0.011, 0.002, MAT.plastic);
    root.add(ctl(n, n, 0.006 + i * 0.019, H + 0.0005, 0.052, at(cap, 0, 0.002, 0), mesh(new THREE.BoxGeometry(0.008, 0.0005, 0.0012), X.whiteLed, 0, 0.0043, 0.003)));
  });
  root.add(ctl("SW1 gauche", "SW1", 0.064, H + 0.0005, 0.05, knurledKnob(0.0075, 0.009, MAT.knurl)));
  // levier de gaz sur le flanc gauche
  root.add(mesh(new THREE.BoxGeometry(0.004, 0.02, 0.07), MAT.gloss, -W / 2 - 0.001, H * 0.5, 0.0));
  root.add(ctl("Levier de gaz", "GAZ", -W / 2 - 0.009, H * 0.62, 0.012, rbox(0.016, 0.02, 0.012, 0.003, X.darkGrey), at(cyl(0.003, 0.003, 0.012, X.steel, 12).rotateZ(Math.PI / 2), 0.006, 0, 0)));

  const grip = new THREE.Group(); grip.position.set(0, H + 0.036, -0.014); grip.rotation.x = -0.16;
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.022, X.darkGrey)));
  grip.add(loft([
    { y: 0.012, rx: 0.021, rz: 0.023 }, { y: 0.04, rx: 0.022, rz: 0.027, cz: 0.002 }, { y: 0.085, rx: 0.0225, rz: 0.029, cz: 0.003 }, { y: 0.118, rx: 0.024, rz: 0.03, cz: 0.001 },
    { y: 0.14, rx: 0.029, rz: 0.034, cz: -0.003, n: 2.8 }, { y: 0.165, rx: 0.033, rz: 0.036, cz: -0.005, n: 3.2 }, { y: 0.184, rx: 0.031, rz: 0.032, cz: -0.004, n: 3.2 }, { y: 0.192, rx: 0.022, rz: 0.024, cz: -0.003, n: 2.6 },
  ], MAT.body, 48));
  // repose-main réglable (côté pilote / extérieur)
  grip.add(at(rbox(0.058, 0.007, 0.05, 0.014, MAT.plastic), 0.006, 0.03, 0.02));
  grip.add(ctl("X Axis", "X / Y", 0, 0.08, 0.031, mesh(new THREE.BoxGeometry(0.012, 0.03, 0.001), MAT.rubber)));
  // gâchette principale (2 crans) + gâchette rapide rouge au-dessus
  grip.add(ctl("Gâchette cran 1", "TIR 1·2", 0, 0.142, -0.031, trigger(0.04, 0.013, X.darkGrey)));
  grip.add(ctl("Gâchette rapide avant", "RAPIDE", 0, 0.168, -0.038, at(rbox(0.014, 0.006, 0.024, 0.002, X.red), 0, 0, -0.006)));
  grip.add(ctl("D1 (auriculaire)", "D1", 0, 0.062, -0.027, push(0.0052, 0.004, MAT.plastic, X.darkGrey).rotateX(-Math.PI / 2)));
  // C1 : chapeau côté pouce (flanc gauche), B1 juste au-dessous
  grip.add(ctl("C1", "C1", -0.031, 0.152, 0.004, hat(0.0066, X.grey, "castle").rotateZ(Math.PI / 2)));
  grip.add(ctl("B1", "B1", -0.026, 0.128, 0.008, push(0.005, 0.0035, MAT.plastic, X.darkGrey).rotateZ(Math.PI / 2)));
  const head = new THREE.Group(); head.position.set(0, 0.176, 0.02); head.rotation.x = 0.95;
  head.add(at(rbox(0.062, 0.004, 0.054, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("A1", "A1", -0.014, 0.001, -0.016, hat(0.0078, X.grey, "dome")));
  head.add(ctl("A2 (rouge)", "A2", 0.017, 0.001, -0.019, push(0.0056, 0.0035, X.red)));
  head.add(ctl("A3", "A3", 0.018, 0.001, 0.004, hat(0.0066, MAT.plastic, "castle")));
  head.add(ctl("A4", "A4", -0.012, 0.001, 0.01, hat(0.0066, MAT.plastic, "cross")));
  grip.add(head);
  root.add(grip);
  return root;
}

// ─────────────────────── VIRPIL CONSTELLATION ALPHA ───────────────────────
// Grande poignée gris anthracite sur base métallique (type WarBRD) : mini-stick
// analogique, trois chapeaux et un bouton rouge en tête, chapeau et deux
// boutons côté pouce, molette à l'index, gâchette à deux crans + gâchette
// rabattable, bouton et levier de frein à l'auriculaire, torsion.
export function buildAlpha(): THREE.Group {
  const root = new THREE.Group(); root.name = "Constellation Alpha";
  const W = 0.15, H = 0.012;
  root.add(at(rbox(W, H, W, 0.008, X.steel), 0, H / 2, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => root.add(at(cyl(0.004, 0.004, 0.003, MAT.gunmetal, 6), sx * (W / 2 - 0.012), H + 0.0015, sz * (W / 2 - 0.012))));
  root.add(at(rbox(0.1, 0.045, 0.1, 0.01, MAT.body), 0, H + 0.0225, 0));
  root.add(at(decal("VIRPIL", 0.007, "#c9ced4"), 0, H + 0.0006, 0.062));
  root.add(at(boot(0.036, 0.026), 0, H + 0.045, 0));
  root.add(at(cyl(0.012, 0.014, 0.03, X.steel, 24), 0, H + 0.08, 0));

  const grip = new THREE.Group(); grip.position.set(0, H + 0.092, 0); grip.rotation.x = -0.14;
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.022, X.steel)));
  grip.add(loft([
    { y: 0.012, rx: 0.02, rz: 0.022 }, { y: 0.024, rx: 0.03, rz: 0.036, cz: 0.006, n: 2.6 }, { y: 0.032, rx: 0.03, rz: 0.036, cz: 0.006, n: 2.6 },
    { y: 0.04, rx: 0.0215, rz: 0.027, cz: 0.002 }, { y: 0.09, rx: 0.022, rz: 0.029, cz: 0.003 }, { y: 0.13, rx: 0.024, rz: 0.03 },
    { y: 0.155, rx: 0.03, rz: 0.035, cz: -0.004, n: 3 }, { y: 0.185, rx: 0.035, rz: 0.038, cz: -0.006, n: 3.4 }, { y: 0.208, rx: 0.033, rz: 0.034, cz: -0.005, n: 3.4 }, { y: 0.216, rx: 0.024, rz: 0.026, cz: -0.004, n: 2.8 },
  ], X.darkGrey, 48));
  grip.add(at(rbox(0.004, 0.06, 0.022, 0.0015, MAT.rubber), 0.022, 0.085, 0.004));
  grip.add(ctl("X Axis", "X / Y", 0, 0.085, 0.031, mesh(new THREE.BoxGeometry(0.012, 0.03, 0.001), MAT.rubber)));
  grip.add(ctl("Gâchette cran 1", "TIR 1·2", 0, 0.158, -0.033, trigger(0.042, 0.013, MAT.alu)));
  grip.add(ctl("Gâchette rabattable", "RABAT", 0, 0.19, -0.04, at(rbox(0.013, 0.006, 0.026, 0.002, X.red), 0, 0, -0.007)));
  grip.add(ctl("Molette haut", "MOLETTE", 0.012, 0.176, -0.036, knurledKnob(0.006, 0.006, MAT.knurl).rotateZ(Math.PI / 2)));
  grip.add(ctl("Bouton auriculaire", "AURIC.", 0, 0.074, -0.028, push(0.0052, 0.004, X.red, MAT.alu).rotateX(-Math.PI / 2)));
  grip.add(ctl("Levier de frein", "FREIN", 0, 0.05, -0.03, at(rbox(0.012, 0.05, 0.005, 0.002, MAT.alu), 0, 0.012, -0.008).rotateX(0.25)));
  // côté pouce (flanc gauche)
  grip.add(ctl("Chapeau pouce", "POUCE", -0.033, 0.172, 0.004, hat(0.0066, MAT.alu, "castle").rotateZ(Math.PI / 2)));
  grip.add(ctl("Bouton latéral haut", "LAT. 1", -0.027, 0.146, 0.01, push(0.005, 0.0035, MAT.plastic, MAT.alu).rotateZ(Math.PI / 2)));
  grip.add(ctl("Bouton latéral bas", "LAT. 2", -0.025, 0.126, 0.012, push(0.005, 0.0035, MAT.plastic, MAT.alu).rotateZ(Math.PI / 2)));
  const head = new THREE.Group(); head.position.set(0, 0.198, 0.022); head.rotation.x = 0.9;
  head.add(at(rbox(0.066, 0.004, 0.06, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Mini-stick X", "MINI", -0.019, 0.001, -0.018, ministick(0.0068)));
  head.add(ctl("Chapeau 1", "H1", 0.002, 0.001, -0.022, hat(0.0064, MAT.alu, "castle")));
  head.add(ctl("Bouton rouge", "ROUGE", 0.022, 0.001, -0.018, push(0.0054, 0.0035, X.red, MAT.alu)));
  head.add(ctl("Chapeau 2", "H2", 0.016, 0.001, 0.006, hat(0.0064, MAT.plastic, "cross")));
  head.add(ctl("Chapeau 3", "H3", -0.012, 0.001, 0.008, hat(0.0064, MAT.alu, "dome")));
  grip.add(head);
  root.add(grip);
  return root;
}

export const EXTRA_MODELS: { test: RegExp; build: () => THREE.Group }[] = [
  { test: /T\.?16000M/i, build: buildT16000M },
  { test: /TWCS/i, build: buildTWCS },
  { test: /Gladiator NXT/i, build: buildNxtEvo },
  { test: /Constellation Alpha/i, build: buildAlpha },
];
registerModels(EXTRA_MODELS);

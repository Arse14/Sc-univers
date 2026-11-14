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
import { KIT, buildX55Stick, buildX55Throttle, registerModels } from "./models";

const { mesh, rbox, chamferBox, at, cyl, control, decal, loft, knurledKnob } = KIT;
type G = THREE.Group;

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


/** Sous-repère posé et orienté dans un parent. */
function grp(parent: THREE.Object3D, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): G {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); parent.add(g); return g;
}
const FRONT = -Math.PI / 2;   // rotation.x : la normale (+Y local) regarde l'avant (−Z)
const BACK = Math.PI / 2;     // … regarde le pilote (+Z)
const LEFT = Math.PI / 2;     // rotation.z : la normale regarde −X
const RIGHT = -Math.PI / 2;   // … regarde +X

/** Inverseur à levier : écrou + levier chromé. */
function toggle(len = 0.014, tilt = 0.3): G {
  const g = new THREE.Group();
  g.add(at(cyl(0.0048, 0.0048, 0.003, X.steel, 6), 0, 0.0015, 0));
  const lever = cyl(0.0016, 0.0022, len, MAT.chrome, 12); lever.position.set(0, 0.003 + len / 2, 0);
  const piv = new THREE.Group(); piv.rotation.x = -tilt; piv.add(lever); g.add(piv);
  return g;
}
/** Touche rectangulaire plate, éventuellement éclairée. */
function key(w: number, d: number, mat: THREE.Material = MAT.plastic, led?: THREE.Material): G {
  const g = new THREE.Group();
  g.add(at(rbox(w, 0.004, d, Math.min(w, d) * 0.2, mat), 0, 0.002, 0));
  if (led) g.add(mesh(new THREE.BoxGeometry(w * 0.6, 0.0005, 0.0012), led, 0, 0.0043, -d * 0.28));
  return g;
}
/** Poignée type chasseur (F-16 / A-10) : sections empilées, tête élargie. `k` = échelle. */
function fighterGrip(k = 1, mat: THREE.Material = MAT.body): THREE.Mesh {
  return loft([
    { y: 0.0, rx: 0.02, rz: 0.022 }, { y: 0.012, rx: 0.036, rz: 0.04, cz: 0.004, n: 2.6 }, { y: 0.02, rx: 0.036, rz: 0.04, cz: 0.004, n: 2.6 },
    { y: 0.028, rx: 0.021, rz: 0.026, cz: 0.002 }, { y: 0.075, rx: 0.0215, rz: 0.028, cz: 0.003 }, { y: 0.11, rx: 0.023, rz: 0.03, cz: 0.001 },
    { y: 0.132, rx: 0.029, rz: 0.034, cz: -0.003, n: 2.8 }, { y: 0.158, rx: 0.033, rz: 0.036, cz: -0.005, n: 3.2 }, { y: 0.178, rx: 0.031, rz: 0.032, cz: -0.004, n: 3.2 }, { y: 0.186, rx: 0.022, rz: 0.024, cz: -0.003, n: 2.6 },
  ].map((q) => ({ ...q, y: q.y * k, rx: q.rx * k, rz: q.rz * k, cz: (q.cz ?? 0) * k })), mat, 48);
}
/** Pièce invisible-utile : petite plaque « prise en main » servant d'ancre aux axes X / Y. */
function axesPad(g: THREE.Object3D, y: number, z: number, name = "Axes") {
  g.add(ctl(name, "X / Y", 0, y, z, mesh(new THREE.BoxGeometry(0.014, 0.034, 0.0012), MAT.rubber)));
}

// ─────────────────────── THRUSTMASTER T.16000M FCS ───────────────────────
// Socle large aux flancs arrondis, anneau orange autour du cardan, 6 boutons
// de chaque côté (2 rangées de 3), curseur de gaz côté pilote, poignée
// penchée à large repose-main, flancs et gâchette orange.
export function buildT16000M(): G {
  const root = new THREE.Group(); root.name = "T.16000M";
  const H = 0.04;
  root.add(loft([{ y: 0, rx: 0.112, rz: 0.118, n: 3.2 }, { y: 0.012, rx: 0.114, rz: 0.12, n: 3.2 }, { y: H - 0.006, rx: 0.104, rz: 0.11, n: 3 }, { y: H, rx: 0.098, rz: 0.104, n: 3 }], X.darkGrey, 64));
  root.add(at(cyl(0.054, 0.06, 0.006, X.orange, 48), 0, H + 0.002, -0.012));
  root.add(at(cyl(0.047, 0.052, 0.009, MAT.plastic, 48), 0, H + 0.006, -0.012));
  root.add(at(boot(0.04, 0.026), 0, H + 0.01, -0.012));
  root.add(at(decal("THRUSTMASTER", 0.0055, "#c9ced4"), -0.03, H + 0.0006, 0.07));
  const rows: [string, string, number, number, number][] = [];
  [5, 6, 7].forEach((n, i) => rows.push([`Socle G${i + 1}`, String(n), -1, i, 0]));
  [10, 9, 8].forEach((n, i) => rows.push([`Socle G${i + 4}`, String(n), -1, i, 1]));
  [13, 12, 11].forEach((n, i) => rows.push([`Socle D${i + 1}`, String(n), 1, i, 0]));
  [14, 15, 16].forEach((n, i) => rows.push([`Socle D${i + 4}`, String(n), 1, i, 1]));
  for (const [name, num, side, col, row] of rows) {
    const x = side < 0 ? -0.092 + col * 0.0185 : 0.055 + col * 0.0185;
    const z = -0.034 + row * 0.022 + Math.abs(x) * 0.1;
    root.add(ctl(name, num, x, H + 0.0005, z, key(0.016, 0.019, MAT.plastic, X.orangeLit)));
  }
  root.add(mesh(new THREE.BoxGeometry(0.008, 0.001, 0.05), MAT.gloss, 0.062, H + 0.0006, 0.062));
  root.add(ctl("Curseur", "CURSEUR", 0.062, H + 0.001, 0.07, at(rbox(0.018, 0.012, 0.012, 0.003, MAT.plastic), 0, 0.006, 0)));

  const grip = grp(root, 0, H + 0.032, -0.012, -0.2);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.021, MAT.plastic)));
  grip.add(loft([
    { y: 0.01, rx: 0.02, rz: 0.021 }, { y: 0.02, rx: 0.04, rz: 0.046, cz: 0.008, n: 2.4 }, { y: 0.027, rx: 0.041, rz: 0.047, cz: 0.008, n: 2.4 },
    { y: 0.034, rx: 0.0225, rz: 0.026, cz: 0.002 }, { y: 0.07, rx: 0.0215, rz: 0.0255 }, { y: 0.105, rx: 0.0225, rz: 0.0265, cz: -0.001 },
    { y: 0.125, rx: 0.025, rz: 0.03, cz: -0.002, n: 2.8 }, { y: 0.15, rx: 0.027, rz: 0.035, cz: -0.004, n: 3 }, { y: 0.166, rx: 0.025, rz: 0.032, cz: -0.004, n: 3 }, { y: 0.174, rx: 0.017, rz: 0.022, cz: -0.003, n: 2.6 },
  ], X.darkGrey, 48));
  for (const sx of [-1, 1]) grip.add(at(rbox(0.0026, 0.062, 0.026, 0.0012, X.orange), sx * 0.0212, 0.076, 0.001));
  grip.add(ctl("Gâchette", "1", 0, 0.128, -0.028, trigger(0.03, 0.012, X.orange)));
  axesPad(grip, 0.085, 0.027);
  const head = grp(grip, 0, 0.156, 0.024, 1.0);
  head.add(at(rbox(0.046, 0.004, 0.052, 0.012, MAT.plastic), 0, -0.001, -0.006));
  head.add(ctl("Chapeau", "POV", 0, 0.001, -0.02, hat(0.0075, MAT.plastic, "castle")));
  head.add(ctl("Bouton bas", "2", 0, 0.001, 0.01, push(0.0052, 0.003, X.orange)));
  head.add(ctl("Bouton gauche", "3", -0.0145, 0.001, -0.002, push(0.005, 0.003, MAT.plastic, X.orange)));
  head.add(ctl("Bouton droit", "4", 0.0145, 0.001, -0.002, push(0.005, 0.003, MAT.plastic, X.orange)));
  return root;
}

// ─────────────────────── THRUSTMASTER TWCS ───────────────────────
// Socle en coin avec glissière, poignée en galet tenue de la main gauche.
// Face du pouce (flanc droit) : trois chapeaux empilés et bouton orange.
// Avant : mini-stick, bascule, deux boutons orange, molette ; palette dessous.
export function buildTWCS(): G {
  const root = new THREE.Group(); root.name = "TWCS";
  const H = 0.03;
  root.add(loft([{ y: 0, rx: 0.1, rz: 0.135, n: 4.5 }, { y: 0.008, rx: 0.102, rz: 0.137, n: 4.5 }, { y: H, rx: 0.09, rz: 0.128, n: 4.5 }], X.darkGrey, 64));
  root.add(at(rbox(0.05, 0.002, 0.23, 0.004, MAT.gloss), -0.01, H + 0.001, 0));
  root.add(at(rbox(0.016, 0.003, 0.22, 0.003, X.steel), 0.05, H + 0.0015, 0));
  root.add(at(decal("THRUSTMASTER", 0.0058, "#23282e"), 0.05, H + 0.0032, 0.03).rotateZ(Math.PI / 2));
  for (const z of [-0.07, -0.05, -0.03]) root.add(mesh(new THREE.BoxGeometry(0.03, 0.0006, 0.004), X.orange, -0.06, H + 0.0004, z));

  const car = grp(root, -0.01, H + 0.002, -0.005);
  car.add(at(rbox(0.07, 0.014, 0.08, 0.006, MAT.plastic), 0, 0.007, 0));
  const pod = mesh(new THREE.SphereGeometry(1, 48, 28), X.darkGrey, 0, 0.05, -0.004); pod.scale.set(0.05, 0.043, 0.074);
  car.add(ctl("Gaz", "GAZ", 0, 0, 0, pod));
  // face du pouce : disque sur le flanc droit, légèrement tourné vers le pilote
  const th = grp(car, 0.043, 0.052, 0.022, 0, -0.35, RIGHT);
  th.add(at(cyl(0.03, 0.032, 0.008, MAT.plastic, 40), 0, -0.002, 0));
  th.add(ctl("Chapeau haut", "POV", -0.017, 0.002, -0.004, hat(0.0062, MAT.plastic, "dome")));
  th.add(ctl("Chapeau milieu", "7–10", -0.001, 0.002, 0.002, hat(0.0062, X.grey, "cross")));
  th.add(ctl("Chapeau créneau", "11–14", 0.015, 0.002, -0.002, hat(0.0062, MAT.plastic, "castle")));
  th.add(ctl("Bouton pouce", "1", 0.02, 0.002, 0.016, push(0.0048, 0.003, X.orange)));
  // avant : côté doigts
  const fr = grp(car, 0, 0.05, -0.076, FRONT);
  fr.add(ctl("Mini-stick", "MINI", 0.026, -0.006, 0.012, ministick(0.0075)));
  fr.add(ctl("Bascule", "4·5", 0.006, -0.002, 0.006, rbox(0.009, 0.006, 0.018, 0.002, MAT.plastic)));
  fr.add(ctl("Bouton annulaire", "3", -0.012, -0.004, 0.0, push(0.005, 0.003, X.orange)));
  fr.add(ctl("Bouton auriculaire", "2", -0.028, -0.01, -0.006, push(0.005, 0.003, X.orange)));
  fr.add(ctl("Molette", "MOLETTE", -0.04, -0.03, 0.004, knurledKnob(0.011, 0.012, MAT.plastic)));
  fr.add(ctl("Palette", "PALETTE", 0.0, 0.0, -0.036, rbox(0.06, 0.012, 0.008, 0.003, MAT.plastic)));
  return root;
}

// ─────────────────────── THRUSTMASTER HOTAS WARTHOG ───────────────────────
// Manche tout métal : embase lourde, collerette ronde, poignée d'A-10.
export function buildWarthogStick(): G {
  const root = new THREE.Group(); root.name = "Warthog stick";
  const H = 0.05;
  root.add(at(rbox(0.19, H, 0.19, 0.008, MAT.body), 0, H / 2, 0));
  root.add(at(cyl(0.075, 0.078, 0.004, MAT.gunmetal, 56), 0, H + 0.002, 0));
  root.add(at(decal("HOTAS WARTHOG", 0.006, "#c9ced4"), -0.03, H + 0.0006, 0.082));
  root.add(at(cyl(0.024, 0.03, 0.03, MAT.plastic, 32), 0, H + 0.018, 0));
  root.add(at(knurledKnob(0.026, 0.014, MAT.gunmetal), 0, H + 0.04, 0));
  const grip = grp(root, 0, H + 0.05, 0, -0.12);
  grip.add(at(cyl(0.05, 0.05, 0.004, MAT.plastic, 48), 0, 0.012, 0.004));   // garde ronde
  grip.add(fighterGrip(1.12, MAT.plastic));
  axesPad(grip, 0.09, 0.034);
  grip.add(ctl("Gâchette", "TIR 1·6", 0, 0.165, -0.038, trigger(0.036, 0.012, MAT.plastic)));
  const fr = grp(grip, 0, 0.07, -0.031, FRONT);
  fr.add(ctl("Bouton auriculaire", "3", 0, 0, 0.022, push(0.0048, 0.003, MAT.gunmetal)));
  fr.add(ctl("Palette auriculaire", "4", 0, 0.008, -0.012, rbox(0.01, 0.006, 0.04, 0.002, MAT.gunmetal)));
  const lf = grp(grip, -0.034, 0.168, 0.0, 0, 0, LEFT);
  lf.add(ctl("Chapeau pouce (CMS)", "CMS", 0.012, 0, 0.006, hat(0.0064, X.grey, "dome")));
  lf.add(ctl("Bouton latéral", "5", -0.012, 0, 0.012, push(0.0048, 0.003, MAT.gunmetal)));
  const head = grp(grip, 0, 0.2, 0.02, 0.85);
  head.add(at(rbox(0.066, 0.004, 0.056, 0.012, MAT.plastic), 0, -0.001, -0.006));
  head.add(ctl("Bouton rouge", "2", -0.02, 0.001, -0.022, push(0.0062, 0.004, X.red)));
  head.add(ctl("Trim", "TRIM", 0.018, 0.001, -0.02, hat(0.0085, X.grey, "dome")));
  head.add(ctl("Chapeau gauche (TMS)", "TMS", -0.016, 0.001, 0.004, hat(0.0066, MAT.plastic, "cross")));
  head.add(ctl("Chapeau droit (DMS)", "DMS", 0.016, 0.001, 0.008, hat(0.0066, MAT.plastic, "castle")));
  return root;
}

// Manette des gaz Warthog : boîtier métal, deux leviers jumelés à gauche,
// pupitre d'inverseurs à droite et à l'arrière.
export function buildWarthogThrottle(): G {
  const root = new THREE.Group(); root.name = "Warthog throttle";
  const W = 0.2, D = 0.26, H = 0.07;
  root.add(at(rbox(W, H, D, 0.005, MAT.body), 0, H / 2, 0));
  root.add(at(rbox(W - 0.006, 0.002, D - 0.006, 0.004, MAT.plastic), 0, H + 0.001, 0));
  root.add(at(decal("HOTAS WARTHOG", 0.007, "#c9ced4"), -0.02, H * 0.5, D / 2 + 0.0006).rotateX(Math.PI / 2));
  const T = H + 0.002;
  for (const sx of [-1, 1]) root.add(mesh(new THREE.BoxGeometry(0.012, 0.001, 0.12), MAT.gloss, -0.05 + sx * 0.018, T, -0.03));
  // leviers
  const arm = (x: number) => { const g = grp(root, x, T, -0.02, -0.35); g.add(at(rbox(0.012, 0.11, 0.022, 0.003, MAT.plastic), 0, 0.055, 0)); return g; };
  const aL = arm(-0.068), aR = arm(-0.032);
  aL.add(at(rbox(0.034, 0.07, 0.05, 0.012, MAT.plastic), -0.004, 0.14, 0));
  const hR = rbox(0.04, 0.085, 0.056, 0.012, MAT.plastic);
  aR.add(ctl("Gaz", "GAZ", 0.006, 0.146, 0, hR));
  // poignée gauche : interrupteur d'auriculaire et bouton rouge
  const lft = grp(aL, -0.022, 0.14, 0, 0, 0, LEFT);
  lft.add(ctl("Pinky switch", "PINKY", -0.012, 0, 0, toggle(0.01, 0)));
  lft.add(ctl("Bouton rouge gauche", "15", 0.014, 0, 0.004, push(0.0055, 0.003, X.red)));
  // poignée droite, flanc pouce (+X)
  const rt = grp(aR, 0.027, 0.15, 0, 0, 0, RIGHT);
  rt.add(ctl("Coolie hat", "COOLIE", -0.022, 0, 0.006, hat(0.0062, X.grey, "dome")));
  rt.add(ctl("Chapeau micro", "MIC", -0.004, 0, 0.012, hat(0.0062, MAT.plastic, "cross")));
  rt.add(ctl("Aérofreins", "A/F", -0.012, 0, -0.012, rbox(0.016, 0.005, 0.008, 0.002, X.grey)));
  rt.add(ctl("Boat switch", "BOAT", 0.012, 0, -0.008, rbox(0.014, 0.005, 0.007, 0.002, X.grey)));
  rt.add(ctl("China hat", "CHINA", 0.026, 0, 0.004, rbox(0.012, 0.006, 0.007, 0.002, X.red)));
  const rf = grp(aR, 0.006, 0.156, -0.03, FRONT);
  rf.add(ctl("Mini-stick", "SLEW", 0, 0, 0, ministick(0.006)));
  // pupitre
  const P = (name: string, label: string, x: number, z: number, o: THREE.Object3D) => root.add(ctl(name, label, x, T, z, o));
  P("ENG fuel G", "16", 0.03, -0.1, toggle(0.012, 0)); P("ENG fuel D", "17", 0.052, -0.1, toggle(0.012, 0));
  P("ENG OPER G", "ENG G", 0.03, -0.065, toggle(0.014)); P("ENG OPER D", "ENG D", 0.052, -0.065, toggle(0.014));
  P("APU", "APU", 0.078, -0.085, toggle(0.011, 0));
  P("Silence train", "21", 0.076, -0.03, push(0.006, 0.004, MAT.plastic, X.steel));
  P("Volets", "VOLETS", -0.086, 0.07, at(rbox(0.012, 0.012, 0.022, 0.003, X.grey), 0, 0.006, 0));
  P("EAC", "EAC", 0.0, 0.05, toggle(0.012, 0)); P("RDR ALTM", "RDR", 0.024, 0.05, toggle(0.012, 0));
  P("Autopilote", "26", 0.05, 0.062, push(0.006, 0.004, MAT.plastic, X.steel));
  P("LASTE", "LASTE", 0.076, 0.05, toggle(0.014));
  P("Friction", "FRICTION", 0.09, 0.0, at(rbox(0.008, 0.016, 0.022, 0.002, X.grey), 0, 0.008, 0));
  return root;
}

// ─────────────────────── THRUSTMASTER T.FLIGHT HOTAS 4 / ONE / X ───────────────────────
// Deux coques jointes : dôme du manche à droite (anneau bleu), bloc des gaz à gauche.
export function buildTFlight(): G {
  const root = new THREE.Group(); root.name = "T.Flight HOTAS";
  const H = 0.045;
  // manche
  const sx = 0.11;
  root.add(at(loft([{ y: 0, rx: 0.1, rz: 0.1 }, { y: 0.015, rx: 0.1, rz: 0.1 }, { y: H, rx: 0.07, rz: 0.07 }, { y: H + 0.012, rx: 0.045, rz: 0.045 }], X.darkGrey, 56), sx, 0, 0));
  root.add(mesh(new THREE.TorusGeometry(0.047, 0.003, 10, 48), new THREE.MeshStandardMaterial({ color: 0x2b62d9, emissive: 0x1b46b0, emissiveIntensity: 0.9, roughness: 0.4 }), sx, H + 0.012, 0).rotateX(Math.PI / 2));
  root.add(at(boot(0.036, 0.022), sx, H + 0.012, 0));
  const grip = grp(root, sx, H + 0.034, 0, -0.12);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.02, MAT.plastic)));
  grip.add(fighterGrip(0.92, MAT.body));
  axesPad(grip, 0.075, 0.028);
  grip.add(ctl("Gâchette", "1", 0, 0.135, -0.03, trigger(0.03, 0.012, MAT.plastic)));
  const head = grp(grip, 0, 0.164, 0.018, 0.9);
  head.add(at(rbox(0.054, 0.004, 0.046, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Chapeau", "POV", 0, 0.001, -0.014, hat(0.0075, MAT.plastic, "castle")));
  head.add(ctl("Bouton L1", "2", 0, 0.001, 0.01, push(0.0048, 0.003, MAT.plastic, X.grey)));
  head.add(ctl("Bouton R3", "3", 0.017, 0.001, 0.0, push(0.0048, 0.003, MAT.plastic, X.grey)));
  head.add(ctl("Bouton L3", "4", -0.017, 0.001, 0.0, push(0.0048, 0.003, MAT.plastic, X.grey)));
  // gaz
  const tx = -0.1;
  root.add(at(loft([{ y: 0, rx: 0.085, rz: 0.1, n: 3.5 }, { y: 0.02, rx: 0.085, rz: 0.1, n: 3.5 }, { y: H, rx: 0.07, rz: 0.085, n: 3 }], X.darkGrey, 56), tx, 0, 0));
  root.add(at(rbox(0.06, 0.03, 0.05, 0.008, MAT.body), 0.005, 0.02, 0));   // liaison
  const th = grp(root, tx - 0.01, H + 0.004, -0.005);
  th.add(at(rbox(0.03, 0.05, 0.03, 0.006, MAT.plastic), 0, 0.02, 0.01));
  const tpod = mesh(new THREE.SphereGeometry(1, 40, 24), MAT.body); tpod.scale.set(0.04, 0.03, 0.062);
  th.add(ctl("Gaz", "GAZ", 0, 0.055, 0, tpod));
  const tf = grp(th, 0.01, 0.055, -0.058, FRONT);
  ["Gaz ▢", "Gaz ✕", "Gaz ◯", "Gaz △"].forEach((n, i) => tf.add(ctl(n, String(5 + i), -0.024 + i * 0.012, -0.004, (i % 2) * 0.008 - 0.002, push(0.0042, 0.003, MAT.plastic, X.grey))));
  tf.add(ctl("Bascule palonnier", "BASCULE", 0.0, 0.0, -0.02, rbox(0.04, 0.008, 0.008, 0.003, MAT.plastic)));
  const tr = grp(th, 0.036, 0.058, 0.012, 0, 0, RIGHT);
  tr.add(ctl("Gaz R2", "9", 0, 0, -0.01, push(0.0048, 0.003, MAT.plastic, X.grey)));
  tr.add(ctl("Gaz L2", "10", 0, 0, 0.008, push(0.0048, 0.003, MAT.plastic, X.grey)));
  root.add(ctl("Socle SE", "11", tx + 0.03, H + 0.001, 0.06, push(0.0045, 0.002, MAT.plastic)));
  root.add(ctl("Socle ST", "12", tx + 0.05, H + 0.001, 0.06, push(0.0045, 0.002, MAT.plastic)));
  return root;
}

// ─────────────────────── LOGITECH / SAITEK X52 (PRO) ───────────────────────
// Manche à droite : socle carré, ressort apparent, trois inverseurs côté pilote,
// tête avec capot de tir rouge. Gaz à gauche : levier en aile, écran MFD.
export function buildX52(): G {
  const root = new THREE.Group(); root.name = "X52";
  const H = 0.045, sx = 0.12, tx = -0.12;
  root.add(at(rbox(0.19, H, 0.2, 0.014, MAT.body), sx, H / 2, 0));
  root.add(at(cyl(0.056, 0.058, 0.003, X.steel, 56), sx, H + 0.0015, -0.01));
  root.add(at(cyl(0.03, 0.034, 0.006, MAT.gloss, 40), sx, H + 0.005, -0.01));
  for (let i = 0; i < 5; i++) root.add(mesh(new THREE.TorusGeometry(0.017, 0.002, 8, 32), X.steel, sx, H + 0.012 + i * 0.006, -0.01).rotateX(Math.PI / 2));
  ["T1", "T2", "T3"].forEach((n, i) => root.add(ctl(n, n, sx - 0.05 + i * 0.022, H + 0.001, 0.074, at(rbox(0.016, 0.01, 0.018, 0.003, X.steel), 0, 0.005, 0))));
  const grip = grp(root, sx, H + 0.046, -0.01, -0.14);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.021, MAT.plastic)));
  grip.add(fighterGrip(1.05, MAT.body));
  grip.add(at(rbox(0.05, 0.006, 0.05, 0.012, X.steel), 0, 0.03, 0.022));   // repose-main métal
  axesPad(grip, 0.085, 0.032);
  grip.add(ctl("Gâchette", "TIR 1·15", 0, 0.155, -0.035, trigger(0.034, 0.012, X.steel)));
  grip.add(ctl("Palette auriculaire", "6", 0, 0.085, -0.032, at(rbox(0.01, 0.04, 0.005, 0.002, X.steel), 0, 0, -0.004)));
  const head = grp(grip, 0, 0.188, 0.02, 0.85);
  head.add(at(rbox(0.066, 0.004, 0.058, 0.012, MAT.plastic), 0, -0.001, -0.006));
  head.add(ctl("Fire (capot)", "FIRE", 0.0, 0.001, -0.022, at(rbox(0.014, 0.008, 0.02, 0.003, X.red), 0, 0.004, 0)));
  head.add(ctl("Bouton A", "A", 0.02, 0.001, -0.024, push(0.005, 0.003, X.red)));
  head.add(ctl("Chapeau 2", "H2", -0.02, 0.001, -0.02, hat(0.0064, MAT.plastic, "castle")));
  head.add(ctl("Chapeau 1", "POV", -0.004, 0.001, 0.006, hat(0.008, X.steel, "dome")));
  head.add(ctl("Bouton B", "B", 0.02, 0.001, 0.0, push(0.005, 0.003, X.red)));
  head.add(ctl("Bouton C", "C", -0.024, 0.001, 0.004, push(0.0048, 0.003, MAT.plastic, X.grey)));
  // gaz
  root.add(at(rbox(0.19, H, 0.22, 0.014, MAT.body), tx, H / 2, 0));
  const lcd = new THREE.MeshStandardMaterial({ color: 0x9fe06a, emissive: 0x7fcf45, emissiveIntensity: 0.8, roughness: 0.5 });
  root.add(at(rbox(0.07, 0.004, 0.06, 0.004, lcd), tx + 0.03, H + 0.002, 0.066));
  root.add(ctl("Bouton MFD", "MFD", tx - 0.03, H + 0.001, 0.08, key(0.014, 0.012, X.grey)));
  const arm = grp(root, tx - 0.03, H, -0.03, -0.25);
  arm.add(at(rbox(0.03, 0.08, 0.03, 0.006, MAT.plastic), 0, 0.04, 0));
  const wing = rbox(0.14, 0.04, 0.05, 0.016, MAT.body);
  arm.add(ctl("Gaz", "GAZ", 0.03, 0.095, 0, wing));
  const wr = grp(arm, 0.102, 0.095, 0, 0, 0, RIGHT);       // bout droit de l'aile (pouce)
  wr.add(ctl("Rotatif haut", "E·ROT", -0.01, 0, -0.012, knurledKnob(0.009, 0.008, MAT.knurl)));
  wr.add(ctl("Rotatif bas", "i·ROT", 0.012, 0, 0.012, knurledKnob(0.009, 0.008, MAT.knurl)));
  wr.add(ctl("Bouton E", "E", -0.01, 0.009, -0.012, push(0.004, 0.002, X.red)));
  wr.add(ctl("Bouton i", "i", 0.012, 0.009, 0.012, push(0.004, 0.002, X.red)));
  const wb = grp(arm, 0.05, 0.095, 0.027, BACK);             // face pilote de l'aile
  wb.add(ctl("Bouton D", "D", 0.03, 0, 0.0, push(0.005, 0.003, X.red)));
  wb.add(ctl("Chapeau gaz", "H3", 0.008, 0, -0.004, hat(0.006, MAT.plastic, "cross")));
  wb.add(ctl("Curseur", "CURSEUR", -0.018, 0, 0.0, rbox(0.014, 0.005, 0.007, 0.002, X.steel)));
  wb.add(ctl("Molette gaz", "MOLETTE", -0.04, 0, 0.0, knurledKnob(0.007, 0.008, MAT.knurl).rotateZ(Math.PI / 2)));
  const wf = grp(arm, 0.06, 0.095, -0.027, FRONT);
  wf.add(ctl("Mini-souris", "SOURIS", 0, 0, 0, ministick(0.006)));
  return root;
}

// ─────────────────────── LOGITECH EXTREME 3D PRO ───────────────────────
// Socle argenté à trois pieds, 6 boutons en arc à gauche, curseur à l'arrière
// droit, manche fin incliné avec repose-main, 4 boutons autour du chapeau.
export function buildExtreme3D(): G {
  const root = new THREE.Group(); root.name = "Extreme 3D Pro";
  const H = 0.04;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; root.add(at(rbox(0.07, 0.014, 0.05, 0.02, MAT.body), Math.cos(a) * 0.085, 0.007, Math.sin(a) * 0.085)); }
  root.add(loft([{ y: 0, rx: 0.088, rz: 0.088 }, { y: 0.012, rx: 0.09, rz: 0.09 }, { y: H, rx: 0.06, rz: 0.06 }], MAT.alu, 56));
  root.add(at(boot(0.034, 0.02), 0, H, 0));
  [7, 8, 9, 10, 11, 12].forEach((n, i) => {
    const col = i % 2, row = Math.floor(i / 2); const a = Math.PI * (0.86 + row * 0.13); const r = 0.07 - col * 0.02;
    root.add(ctl(`Socle ${n}`, String(n), Math.cos(a) * r, 0.03 - (r - 0.05) * 0.5, Math.sin(a) * r + 0.02, key(0.014, 0.014, MAT.plastic)));
  });
  root.add(ctl("Curseur", "CURSEUR", 0.06, 0.03, 0.04, at(rbox(0.01, 0.014, 0.024, 0.003, MAT.plastic), 0, 0.007, 0)));
  const grip = grp(root, 0, H + 0.02, 0, -0.3);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.019, MAT.plastic)));
  grip.add(loft([
    { y: 0.008, rx: 0.018, rz: 0.02 }, { y: 0.03, rx: 0.019, rz: 0.023 }, { y: 0.075, rx: 0.02, rz: 0.025, cz: 0.002 },
    { y: 0.098, rx: 0.034, rz: 0.04, cz: 0.012, n: 2.4 }, { y: 0.106, rx: 0.034, rz: 0.04, cz: 0.012, n: 2.4 },   // repose-main haut
    { y: 0.114, rx: 0.022, rz: 0.028, cz: 0.002 }, { y: 0.15, rx: 0.024, rz: 0.03 }, { y: 0.172, rx: 0.026, rz: 0.03, cz: -0.002, n: 3 }, { y: 0.182, rx: 0.018, rz: 0.022, n: 2.6 },
  ], MAT.body, 48));
  axesPad(grip, 0.055, 0.025);
  grip.add(ctl("Gâchette", "1", 0, 0.15, -0.03, trigger(0.028, 0.012, MAT.plastic)));
  grip.add(ctl("Bouton pouce", "2", -0.026, 0.15, 0.004, push(0.006, 0.003, MAT.alu).rotateZ(LEFT)));
  const head = grp(grip, 0, 0.17, 0.02, 0.95);
  head.add(at(rbox(0.05, 0.004, 0.046, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Chapeau", "POV", 0, 0.001, -0.004, hat(0.0078, MAT.plastic, "dome")));
  head.add(ctl("Tête 5", "5", -0.016, 0.001, -0.016, push(0.0045, 0.003, MAT.alu)));
  head.add(ctl("Tête 6", "6", 0.016, 0.001, -0.016, push(0.0045, 0.003, MAT.alu)));
  head.add(ctl("Tête 3", "3", -0.016, 0.001, 0.01, push(0.0045, 0.003, MAT.alu)));
  head.add(ctl("Tête 4", "4", 0.016, 0.001, 0.01, push(0.0045, 0.003, MAT.alu)));
  return root;
}

// ─────────────────────── VKB GLADIATOR NXT EVO ───────────────────────
// Socle carré : F1–F3 et encodeur SW1 côté pilote, levier de gaz sur le flanc.
// Tête : A1 (chapeau gris), A2 rouge, A3, A4 ; C1 côté pouce, B1, D1 ; gâchette
// deux crans + gâchette rapide rouge.
export function buildNxtEvo(): G {
  const root = new THREE.Group(); root.name = "Gladiator NXT EVO";
  const W = 0.166, H = 0.038;
  root.add(at(chamferBox(W, H - 0.008, W, 0.016, MAT.body), 0, (H - 0.008) / 2, 0));
  root.add(at(chamferBox(W - 0.008, 0.008, W - 0.008, 0.014, MAT.plastic), 0, H - 0.004, 0));
  root.add(at(cyl(0.047, 0.052, 0.008, MAT.gloss, 48), 0, H + 0.004, -0.014));
  root.add(at(boot(0.04, 0.03), 0, H + 0.008, -0.014));
  root.add(at(decal("GLADIATOR NXT", 0.0048, "#9aa1a9"), -0.03, H + 0.0006, 0.066));
  ["F1", "F2", "F3"].forEach((n, i) => root.add(ctl(n, n, 0.006 + i * 0.019, H + 0.0005, 0.052, key(0.013, 0.011, MAT.plastic, X.whiteLed))));
  root.add(ctl("SW1", "SW1", 0.064, H + 0.0005, 0.05, knurledKnob(0.0075, 0.009, MAT.knurl)));
  root.add(mesh(new THREE.BoxGeometry(0.004, 0.02, 0.07), MAT.gloss, -W / 2 - 0.001, H * 0.5, 0.0));
  root.add(ctl("Levier de gaz", "GAZ", -W / 2 - 0.009, H * 0.62, 0.012, rbox(0.016, 0.02, 0.012, 0.003, X.darkGrey)));
  const grip = grp(root, 0, H + 0.036, -0.014, -0.16);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.022, X.darkGrey)));
  grip.add(at(fighterGrip(1.03, MAT.body), 0, 0.008, 0));
  axesPad(grip, 0.085, 0.033);
  grip.add(ctl("Gâchette", "TIR 1·2", 0, 0.148, -0.034, trigger(0.038, 0.013, X.darkGrey)));
  grip.add(ctl("Gâchette rapide", "RAPIDE", 0, 0.176, -0.04, at(rbox(0.014, 0.006, 0.024, 0.002, X.red), 0, 0, -0.006)));
  grip.add(ctl("D1 (auriculaire)", "D1", 0, 0.066, -0.03, push(0.0052, 0.004, MAT.plastic, X.darkGrey).rotateX(FRONT)));
  const lf = grp(grip, -0.034, 0.158, 0.004, 0, 0, LEFT);
  lf.add(ctl("C1", "C1", 0, 0, 0, hat(0.0066, X.grey, "castle")));
  const rf = grp(grip, 0.034, 0.15, 0.006, 0, 0, RIGHT);
  rf.add(ctl("B1", "B1", 0, 0, 0, push(0.005, 0.0035, MAT.plastic, X.darkGrey)));
  const head = grp(grip, 0, 0.186, 0.02, 0.95);
  head.add(at(rbox(0.064, 0.004, 0.056, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("A1", "A1", -0.014, 0.001, -0.018, hat(0.0078, X.grey, "dome")));
  head.add(ctl("A2 (rouge)", "A2", 0.018, 0.001, -0.02, push(0.0056, 0.0035, X.red)));
  head.add(ctl("A3", "A3", 0.018, 0.001, 0.004, hat(0.0066, MAT.plastic, "castle")));
  head.add(ctl("A4", "A4", -0.012, 0.001, 0.01, hat(0.0066, MAT.plastic, "cross")));
  return root;
}

// ─────────────────────── VIRPIL CONSTELLATION ALPHA ───────────────────────
// Grande poignée noire à tête très large, grip quadrillé, sur base WarBRD.
// Tête : mini-stick, bouton rouge et trois chapeaux ; chapeau et bouton côté
// pouce ; molette, gâchette deux crans + rabattable ; frein à l'auriculaire.
export function buildAlpha(): G {
  const root = new THREE.Group(); root.name = "Constellation Alpha";
  const W = 0.15, H = 0.012;
  root.add(at(rbox(W, H, W, 0.008, X.steel), 0, H / 2, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => root.add(at(cyl(0.004, 0.004, 0.003, MAT.gunmetal, 6), a * (W / 2 - 0.012), H + 0.0015, b * (W / 2 - 0.012))));
  root.add(at(rbox(0.1, 0.045, 0.1, 0.01, MAT.body), 0, H + 0.0225, 0));
  root.add(at(decal("VIRPIL", 0.007, "#c9ced4"), 0, H + 0.0006, 0.062));
  root.add(at(boot(0.036, 0.026), 0, H + 0.045, 0));
  root.add(at(knurledKnob(0.022, 0.018, MAT.plastic), 0, H + 0.078, 0));
  const grip = grp(root, 0, H + 0.09, 0, -0.14);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.023, X.steel)));
  grip.add(loft([
    { y: 0.012, rx: 0.021, rz: 0.023 }, { y: 0.024, rx: 0.032, rz: 0.04, cz: 0.008, n: 2.6 }, { y: 0.032, rx: 0.032, rz: 0.04, cz: 0.008, n: 2.6 },
    { y: 0.04, rx: 0.022, rz: 0.028, cz: 0.002 }, { y: 0.09, rx: 0.023, rz: 0.03, cz: 0.003 }, { y: 0.13, rx: 0.025, rz: 0.031 },
    { y: 0.152, rx: 0.036, rz: 0.036, cz: -0.004, n: 3 }, { y: 0.182, rx: 0.046, rz: 0.04, cz: -0.006, n: 3.6 }, { y: 0.206, rx: 0.044, rz: 0.036, cz: -0.005, n: 3.6 }, { y: 0.214, rx: 0.03, rz: 0.026, cz: -0.004, n: 2.8 },
  ], MAT.body, 48));
  grip.add(at(rbox(0.004, 0.07, 0.03, 0.0015, MAT.rubber), 0.0225, 0.085, 0.004));
  grip.add(at(rbox(0.004, 0.07, 0.03, 0.0015, MAT.rubber), -0.0225, 0.085, 0.004));
  axesPad(grip, 0.085, 0.033);
  grip.add(ctl("Gâchette", "TIR 1·2", 0, 0.156, -0.034, trigger(0.04, 0.013, MAT.gunmetal)));
  grip.add(ctl("Gâchette rabattable", "RABAT", 0, 0.188, -0.042, at(rbox(0.013, 0.006, 0.026, 0.002, X.steel), 0, 0, -0.007)));
  grip.add(ctl("Molette", "MOLETTE", 0.016, 0.172, -0.038, knurledKnob(0.006, 0.006, MAT.knurl).rotateZ(Math.PI / 2)));
  grip.add(ctl("Bouton auriculaire", "AURIC.", 0, 0.074, -0.03, push(0.0052, 0.004, MAT.plastic, X.steel).rotateX(FRONT)));
  grip.add(ctl("Levier de frein", "FREIN", 0, 0.04, -0.034, at(rbox(0.012, 0.05, 0.005, 0.002, X.steel), 0, 0.012, -0.008).rotateX(0.25)));
  const lf = grp(grip, -0.046, 0.18, 0.0, 0, 0, LEFT);
  lf.add(ctl("Chapeau pouce", "POUCE", 0.004, 0, 0.006, hat(0.0066, X.steel, "castle")));
  lf.add(ctl("Bouton latéral", "LAT.", -0.02, -0.01, 0.012, push(0.005, 0.0035, MAT.plastic, X.steel)));
  const head = grp(grip, 0, 0.196, 0.022, 0.9);
  head.add(at(rbox(0.09, 0.004, 0.062, 0.014, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Mini-stick", "MINI", 0.03, 0.001, -0.014, ministick(0.0068)));
  head.add(ctl("Bouton rouge", "ROUGE", 0.004, 0.001, -0.02, push(0.0062, 0.004, X.red, X.steel)));
  head.add(ctl("Chapeau 1", "H1", -0.022, 0.001, -0.018, hat(0.0064, X.steel, "castle")));
  head.add(ctl("Chapeau 2", "H2", 0.014, 0.001, 0.008, hat(0.0064, MAT.plastic, "cross")));
  head.add(ctl("Chapeau 3", "H3", -0.014, 0.001, 0.01, hat(0.0064, X.steel, "dome")));
  return root;
}

// ─────────────────────── VIRPIL MONGOOST-50CM3 (GAZ) ───────────────────────
// Boîtier métal : grille de 6 boutons verts, 4 inverseurs, 2 encodeurs, levier
// de train ; deux leviers à grosse poignée couverte de chapeaux.
export function buildCM3(): G {
  const root = new THREE.Group(); root.name = "CM3 Throttle";
  const W = 0.2, D = 0.24, H = 0.06, T = H + 0.002;
  root.add(at(rbox(W, H, D, 0.006, MAT.body), 0, H / 2, 0));
  root.add(at(rbox(W - 0.008, 0.002, D - 0.008, 0.004, MAT.plastic), 0, H + 0.001, 0));
  const green = new THREE.MeshStandardMaterial({ color: 0x58d36a, emissive: 0x2fa845, emissiveIntensity: 0.7, roughness: 0.5 });
  ["B1", "B2", "B3", "B4", "B5", "B6"].forEach((n, i) => root.add(ctl(n, n, -0.02 + (i % 3) * 0.02, T, 0.05 + Math.floor(i / 3) * 0.02, key(0.015, 0.015, green))));
  ["T1", "T2", "T3", "T4"].forEach((n, i) => root.add(ctl(n, n, 0.05 + (i % 2) * 0.022, T, 0.045 + Math.floor(i / 2) * 0.026, toggle(0.012, 0))));
  root.add(ctl("E1", "E1", -0.07, T, 0.09, knurledKnob(0.008, 0.01, MAT.knurl)));
  root.add(ctl("E2", "E2", -0.045, T, 0.09, knurledKnob(0.008, 0.01, MAT.knurl)));
  root.add(ctl("Train", "TRAIN", 0.082, T, -0.02, at(cyl(0.003, 0.003, 0.03, X.steel, 12), 0, 0.015, 0), at(cyl(0.008, 0.008, 0.006, X.red, 20).rotateZ(Math.PI / 2), 0, 0.032, 0)));
  root.add(ctl("Levier volets", "VOLETS", -0.086, T, 0.02, at(rbox(0.01, 0.014, 0.024, 0.003, X.steel), 0, 0.007, 0)));
  for (const s of [-1, 1]) root.add(mesh(new THREE.BoxGeometry(0.014, 0.001, 0.11), MAT.gloss, -0.03 + s * 0.02, T, -0.045));
  const arm = (x: number) => { const g = grp(root, x, T, -0.03, -0.3); g.add(at(rbox(0.014, 0.1, 0.024, 0.003, X.steel), 0, 0.05, 0)); return g; };
  const aL = arm(-0.05), aR = arm(-0.01);
  aL.add(ctl("Gaz gauche", "GAZ G", -0.004, 0.13, 0, rbox(0.036, 0.075, 0.052, 0.012, MAT.plastic)));
  aR.add(ctl("Gaz droit", "GAZ D", 0.008, 0.136, 0, rbox(0.044, 0.085, 0.058, 0.012, MAT.plastic)));
  const rt = grp(aR, 0.031, 0.14, 0, 0, 0, RIGHT);
  rt.add(ctl("Chapeau 1", "H1", -0.024, 0, 0.008, hat(0.0062, X.steel, "castle")));
  rt.add(ctl("Chapeau 2", "H2", -0.006, 0, 0.014, hat(0.0062, MAT.plastic, "cross")));
  rt.add(ctl("Chapeau 3", "H3", 0.012, 0, 0.008, hat(0.0062, X.steel, "dome")));
  rt.add(ctl("Bouton rouge", "17", -0.014, 0, -0.012, push(0.005, 0.003, X.red)));
  rt.add(ctl("Sélecteur", "SÉL.", 0.006, 0, -0.012, knurledKnob(0.006, 0.006, MAT.knurl)));
  const rf = grp(aR, 0.008, 0.146, -0.03, FRONT);
  rf.add(ctl("Mini-stick", "MINI", 0, 0, 0.012, ministick(0.006)));
  rf.add(ctl("Bouton index", "18", 0.012, 0, -0.008, push(0.0048, 0.003, MAT.plastic, X.steel)));
  rf.add(ctl("Bascule doigts", "19·20", -0.008, 0, -0.012, rbox(0.008, 0.006, 0.016, 0.002, X.steel)));
  rf.add(ctl("Molette index", "MOLETTE", 0, 0, -0.03, knurledKnob(0.007, 0.008, MAT.knurl).rotateZ(Math.PI / 2)));
  return root;
}

// ─────────────────────── WINWING URSA MINOR FIGHTER ───────────────────────
// Socle noir en coin : 4 boutons de chaque côté, curseur à gauche ; poignée de
// chasseur, bouton et gâchette rouges, quatre chapeaux.
export function buildUrsaMinor(): G {
  const root = new THREE.Group(); root.name = "Ursa Minor";
  const H = 0.04;
  root.add(loft([{ y: 0, rx: 0.1, rz: 0.11, n: 4 }, { y: 0.01, rx: 0.1, rz: 0.11, n: 4 }, { y: H, rx: 0.082, rz: 0.092, n: 3.5 }], MAT.body, 56));
  root.add(at(boot(0.036, 0.024), 0, H, -0.012));
  for (let i = 0; i < 8; i++) { const side = i < 4 ? -1 : 1; const k = i % 4; root.add(ctl(`Socle ${i + 1}`, String(22 + i), side * (0.045 + (k % 2) * 0.02), H + 0.0005, 0.02 + Math.floor(k / 2) * 0.024, key(0.016, 0.016, MAT.plastic, X.whiteLed))); }
  root.add(mesh(new THREE.BoxGeometry(0.006, 0.001, 0.05), MAT.gloss, -0.07, H - 0.012, -0.03));
  root.add(ctl("Curseur", "CURSEUR", -0.07, H - 0.012, -0.03, at(rbox(0.012, 0.01, 0.012, 0.002, MAT.plastic), 0, 0.005, 0)));
  root.add(at(decal("URSA MINOR", 0.005, "#9aa1a9"), 0, H + 0.0006, 0.07));
  const grip = grp(root, 0, H + 0.03, -0.012, -0.14);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.021, MAT.plastic)));
  grip.add(at(fighterGrip(1.02, MAT.body), 0, 0.006, 0));
  axesPad(grip, 0.085, 0.032);
  grip.add(ctl("Gâchette", "TIR 1·2", 0, 0.148, -0.034, trigger(0.034, 0.012, X.red)));
  grip.add(ctl("Bouton auriculaire", "5", 0, 0.07, -0.03, push(0.005, 0.003, MAT.plastic, X.grey).rotateX(FRONT)));
  grip.add(ctl("Palette", "6", 0, 0.045, -0.032, at(rbox(0.01, 0.04, 0.005, 0.002, X.grey), 0, 0.01, -0.006)));
  const lf = grp(grip, -0.035, 0.158, 0.004, 0, 0, LEFT);
  lf.add(ctl("Chapeau 4", "H4", 0.006, 0, 0.004, hat(0.0064, X.grey, "castle")));
  lf.add(ctl("Bouton pouce", "4", -0.016, 0, 0.01, push(0.0048, 0.003, MAT.plastic, X.grey)));
  const head = grp(grip, 0, 0.186, 0.02, 0.9);
  head.add(at(rbox(0.064, 0.004, 0.056, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Bouton rouge", "3", -0.02, 0.001, -0.02, push(0.0058, 0.004, X.red)));
  head.add(ctl("Chapeau 1", "POV", 0.016, 0.001, -0.02, hat(0.008, X.grey, "dome")));
  head.add(ctl("Chapeau 2", "H2", -0.016, 0.001, 0.006, hat(0.0064, X.grey, "cross")));
  head.add(ctl("Chapeau 3", "H3", 0.016, 0.001, 0.008, hat(0.0064, X.grey, "castle")));
  return root;
}

// ─────────────────────── CH PRODUCTS ───────────────────────
// Fighterstick : gros socle noir anguleux à molette, poignée de F-16, chapeaux gris.
export function buildCHStick(): G {
  const root = new THREE.Group(); root.name = "CH Fighterstick";
  const H = 0.06;
  root.add(at(chamferBox(0.2, H, 0.21, 0.02, MAT.body), 0, H / 2, 0));
  root.add(at(boot(0.04, 0.03), 0, H, 0));
  root.add(ctl("Molette du socle", "MOLETTE", -0.1, H * 0.6, 0.0, knurledKnob(0.02, 0.008, MAT.plastic).rotateZ(Math.PI / 2)));
  for (let i = 0; i < 3; i++) root.add(at(cyl(0.003, 0.003, 0.002, [X.orange, X.red, X.whiteLed][i], 12), -0.02 + i * 0.012, H + 0.001, 0.07));
  const grip = grp(root, 0, H + 0.03, 0, -0.1);
  grip.add(fighterGrip(1.08, MAT.body));
  axesPad(grip, 0.09, 0.034);
  grip.add(ctl("Gâchette", "1", 0, 0.158, -0.036, trigger(0.034, 0.012, X.red)));
  grip.add(ctl("Bouton auriculaire", "4", 0, 0.07, -0.031, push(0.005, 0.003, X.red).rotateX(FRONT)));
  const lf = grp(grip, -0.036, 0.165, 0.004, 0, 0, LEFT);
  lf.add(ctl("Chapeau pouce", "13–16", 0.006, 0, 0.004, hat(0.0064, X.grey, "dome")));
  lf.add(ctl("Bouton latéral", "3", -0.016, 0, 0.01, push(0.005, 0.003, X.red)));
  const head = grp(grip, 0, 0.194, 0.02, 0.9);
  head.add(at(rbox(0.064, 0.004, 0.056, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Bouton haut", "2", -0.02, 0.001, -0.02, push(0.0058, 0.004, X.red)));
  head.add(ctl("Chapeau POV", "POV", 0.016, 0.001, -0.02, hat(0.008, X.grey, "dome")));
  head.add(ctl("Chapeau gauche", "5–8", -0.016, 0.001, 0.006, hat(0.0064, X.grey, "cross")));
  head.add(ctl("Chapeau créneau", "9–12", 0.016, 0.001, 0.008, hat(0.0064, X.grey, "castle")));
  return root;
}
// Pro Throttle : socle bas, poignée en galet coulissante, chapeaux sur le bout droit.
export function buildCHThrottle(): G {
  const root = new THREE.Group(); root.name = "CH Pro Throttle";
  const H = 0.04;
  root.add(at(chamferBox(0.2, H, 0.24, 0.02, MAT.body), 0, H / 2, 0));
  root.add(mesh(new THREE.BoxGeometry(0.03, 0.001, 0.16), MAT.gloss, -0.02, H + 0.0006, 0));
  for (let i = 0; i < 3; i++) root.add(at(cyl(0.003, 0.003, 0.002, [X.orange, X.red, X.whiteLed][i], 12), 0.05 + i * 0.012, H + 0.001, 0.09));
  const car = grp(root, -0.02, H, -0.01);
  car.add(at(rbox(0.03, 0.03, 0.04, 0.006, MAT.plastic), 0, 0.015, 0));
  const pod = mesh(new THREE.SphereGeometry(1, 48, 28), MAT.body, 0, 0.055, 0); pod.scale.set(0.075, 0.034, 0.045);
  car.add(ctl("Gaz", "GAZ", 0, 0, 0, pod));
  const rt = grp(car, 0.06, 0.058, 0.006, 0, -0.5, RIGHT);
  rt.add(at(cyl(0.03, 0.03, 0.01, MAT.plastic, 40), 0, -0.004, 0));
  rt.add(ctl("Chapeau POV", "POV", -0.014, 0.002, -0.006, hat(0.0062, X.grey, "dome")));
  rt.add(ctl("Chapeau créneau", "1–4", 0.004, 0.002, -0.014, hat(0.0062, X.grey, "castle")));
  rt.add(ctl("Chapeau bas", "5–8", 0.014, 0.002, 0.004, hat(0.0062, X.grey, "cross")));
  rt.add(ctl("Chapeau arrière", "9–12", -0.004, 0.002, 0.014, hat(0.0062, X.grey, "dome")));
  const fr = grp(car, 0.02, 0.056, -0.042, FRONT);
  fr.add(ctl("Mini-stick", "MINI", 0.03, 0, 0.004, ministick(0.006)));
  fr.add(ctl("Bouton avant D", "14", 0.008, 0, 0, push(0.005, 0.003, X.grey)));
  fr.add(ctl("Bouton avant M", "15", -0.012, 0, 0, push(0.005, 0.003, X.grey)));
  fr.add(ctl("Bouton avant G", "16", -0.032, 0, 0, push(0.005, 0.003, X.grey)));
  return root;
}

// ─────────────────────── TURTLE BEACH VELOCITYONE FLIGHTSTICK ───────────────────────
// Reconstruit de mémoire : socle large à deux leviers arrière, 4 boutons par
// côté, poignée ambidextre à écran, mini-stick et croix de boutons en tête.
export function buildVelocityOne(): G {
  const root = new THREE.Group(); root.name = "VelocityOne Flightstick";
  const H = 0.04;
  root.add(loft([{ y: 0, rx: 0.1, rz: 0.11, n: 3.6 }, { y: 0.012, rx: 0.1, rz: 0.11, n: 3.6 }, { y: H, rx: 0.088, rz: 0.098, n: 3.4 }], MAT.body, 56));
  const ring = new THREE.MeshStandardMaterial({ color: 0x35e0c8, emissive: 0x1fbfa8, emissiveIntensity: 1, roughness: 0.4 });
  root.add(mesh(new THREE.TorusGeometry(0.046, 0.002, 8, 48), ring, 0, H + 0.001, -0.01).rotateX(Math.PI / 2));
  root.add(at(boot(0.038, 0.024), 0, H, -0.01));
  for (let i = 0; i < 8; i++) { const side = i < 4 ? -1 : 1; const k = i % 4; root.add(ctl(`Socle ${side < 0 ? "G" : "D"}${k + 1}`, String(8 + i), side * (0.056 + (k % 2) * 0.018), H + 0.0005, 0.02 + Math.floor(k / 2) * 0.022, key(0.014, 0.014, MAT.plastic, ring))); }
  root.add(ctl("Levier G", "LEVIER G", -0.07, H, -0.06, at(rbox(0.012, 0.03, 0.014, 0.003, X.grey), 0, 0.015, 0)));
  root.add(ctl("Levier D", "LEVIER D", 0.07, H, -0.06, at(rbox(0.012, 0.03, 0.014, 0.003, X.grey), 0, 0.015, 0)));
  root.add(ctl("Molette", "MOLETTE", 0, H + 0.001, 0.075, knurledKnob(0.009, 0.006, MAT.knurl)));
  const grip = grp(root, 0, H + 0.03, -0.01, -0.12);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.021, MAT.plastic)));
  grip.add(at(fighterGrip(1.0, MAT.body), 0, 0.006, 0));
  axesPad(grip, 0.085, 0.031);
  grip.add(ctl("Gâchette", "1", 0, 0.146, -0.033, trigger(0.032, 0.012, MAT.plastic)));
  grip.add(ctl("Gâchette rapide", "7", 0, 0.172, -0.038, at(rbox(0.013, 0.006, 0.022, 0.002, X.grey), 0, 0, -0.005)));
  const head = grp(grip, 0, 0.184, 0.02, 0.9);
  head.add(at(rbox(0.064, 0.004, 0.058, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(at(rbox(0.02, 0.002, 0.012, 0.002, ring), 0, 0.002, -0.026));   // petit écran
  head.add(ctl("Chapeau", "POV", -0.016, 0.001, -0.008, hat(0.0072, MAT.plastic, "castle")));
  head.add(ctl("Mini-stick", "MINI", 0.016, 0.001, -0.008, ministick(0.0064)));
  [["Bouton A", "A", 0, 0.018], ["Bouton B", "B", 0.012, 0.01], ["Bouton X", "X", -0.012, 0.01], ["Bouton Y", "Y", 0, 0.004]].forEach(([n, l, x, z]) => head.add(ctl(n as string, l as string, x as number, 0.001, z as number, push(0.004, 0.0025, MAT.plastic, X.grey))));
  return root;
}

// ─────────────────────── SAITEK X-45 ───────────────────────
// Socles bleus sérigraphiés. Manche : poignée noire à arceau, boutons orange,
// capot de lancement. Gaz : aile grise à deux rotatifs, bouton D orange.
export function buildX45(): G {
  const root = new THREE.Group(); root.name = "X-45";
  const blue = new THREE.MeshStandardMaterial({ color: 0x2444a8, roughness: 0.45, metalness: 0.3 });
  const H = 0.045, sx = 0.12, tx = -0.12;
  for (const x of [sx, tx]) { root.add(at(rbox(0.19, H - 0.012, 0.2, 0.012, MAT.body), x, (H - 0.012) / 2, 0)); root.add(at(rbox(0.186, 0.012, 0.196, 0.012, blue), x, H - 0.006, 0)); }
  root.add(at(cyl(0.04, 0.042, 0.004, MAT.alu, 48), sx, H + 0.002, -0.01));
  root.add(at(boot(0.03, 0.02), sx, H + 0.004, -0.01));
  ["T1", "T2", "T3"].forEach((n, i) => root.add(ctl(n, n, sx - 0.022 + i * 0.022, H + 0.001, 0.076, toggle(0.01, 0))));
  const grip = grp(root, sx, H + 0.026, -0.01, -0.14);
  grip.add(fighterGrip(1.05, MAT.body));
  grip.add(at(rbox(0.006, 0.09, 0.008, 0.002, MAT.body), 0, 0.085, -0.05));          // arceau avant
  axesPad(grip, 0.085, 0.032);
  grip.add(ctl("Gâchette", "1", 0, 0.155, -0.035, trigger(0.032, 0.012, MAT.plastic)));
  grip.add(ctl("Palette auriculaire", "7", 0, 0.085, -0.032, at(rbox(0.01, 0.034, 0.005, 0.002, X.orange), 0, 0, -0.004)));
  grip.add(ctl("Bouton C", "C", -0.03, 0.15, 0.004, push(0.0052, 0.003, X.orange).rotateZ(LEFT)));
  const head = grp(grip, 0, 0.188, 0.02, 0.85);
  head.add(at(rbox(0.066, 0.004, 0.058, 0.012, MAT.plastic), 0, -0.001, -0.006));
  head.add(ctl("Launch (capot)", "LAUNCH", 0.0, 0.001, -0.022, at(rbox(0.014, 0.008, 0.02, 0.003, MAT.alu), 0, 0.004, 0)));
  head.add(ctl("Bouton A", "A", 0.021, 0.001, -0.02, push(0.005, 0.003, X.orange)));
  head.add(ctl("Bouton B", "B", -0.021, 0.001, -0.02, push(0.005, 0.003, X.orange)));
  head.add(ctl("Chapeau 1", "POV", 0.014, 0.001, 0.006, hat(0.0072, MAT.alu, "dome")));
  head.add(ctl("Chapeau 2", "H2", -0.014, 0.001, 0.006, hat(0.0066, MAT.plastic, "castle")));
  const arm = grp(root, tx - 0.02, H, -0.02, -0.25);
  arm.add(at(rbox(0.03, 0.07, 0.03, 0.006, MAT.plastic), 0, 0.035, 0));
  arm.add(ctl("Gaz", "GAZ", 0.025, 0.088, 0, rbox(0.14, 0.042, 0.052, 0.018, X.grey)));
  const wr = grp(arm, 0.097, 0.088, 0, 0, 0, RIGHT);
  wr.add(ctl("Rotatif haut", "ROT 1", -0.01, 0, -0.012, knurledKnob(0.009, 0.008, MAT.knurl)));
  wr.add(ctl("Rotatif bas", "ROT 2", 0.012, 0, 0.012, knurledKnob(0.009, 0.008, MAT.knurl)));
  const wb = grp(arm, 0.05, 0.088, 0.028, BACK);
  wb.add(ctl("Bouton D", "D", 0.03, 0, 0, push(0.0058, 0.003, X.orange)));
  wb.add(ctl("Chapeau gaz", "H3", 0.008, 0, -0.004, hat(0.006, MAT.plastic, "cross")));
  wb.add(ctl("Chapeau souris", "H4", -0.014, 0, 0.0, hat(0.006, MAT.plastic, "dome")));
  wb.add(ctl("Bouton souris", "6", -0.034, 0, 0.0, push(0.0045, 0.003, MAT.alu)));
  const wf = grp(arm, 0.0, 0.088, -0.028, FRONT);
  wf.add(ctl("Palonnier (bascule)", "BASCULE", 0, 0, 0, rbox(0.05, 0.008, 0.01, 0.003, MAT.plastic)));
  return root;
}

// ─────────────────────── SAITEK X-65F ───────────────────────
// D'après les planches SCJMapper. Manche à capteurs d'effort : il ne bouge pas,
// donc ni soufflet ni ressort — un col noir brillant cerclé d'une graduation
// jaune. Socles en pont (quatre pieds, arche sur chaque face).
const X65 = {
  matte: new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.85, metalness: 0.05 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe8d23a, emissive: 0x6b5f10, emissiveIntensity: 0.5, roughness: 0.7 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe9edf0, emissive: 0x9aa3ab, emissiveIntensity: 0.4, roughness: 0.6 }),
};
/** Socle en pont : dalle épaisse portée par quatre pieds. Renvoie la hauteur du dessus. */
function bridgeBase(g: THREE.Object3D, w: number, d: number): number {
  const LEG = 0.026, SLAB = 0.03;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(rbox(0.05, LEG, 0.05, 0.004, X65.matte), sx * (w / 2 - 0.025), LEG / 2, sz * (d / 2 - 0.025)));
  g.add(at(rbox(w, SLAB, d, 0.006, X65.matte), 0, LEG + SLAB / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(cyl(0.004, 0.004, 0.001, MAT.gloss, 16), sx * (w / 2 - 0.02), LEG + SLAB + 0.0003, sz * (d / 2 - 0.02)));
  return LEG + SLAB;
}

function x65Stick(): G {
  const g = new THREE.Group();
  const T = bridgeBase(g, 0.2, 0.2);
  const GZ = -0.01;
  // graduation jaune : cercle + traits radiaux
  g.add(mesh(new THREE.TorusGeometry(0.058, 0.0005, 6, 72), X65.yellow, 0, T + 0.0004, GZ).rotateX(Math.PI / 2));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const t = mesh(new THREE.BoxGeometry(0.0009, 0.0005, i % 3 === 0 ? 0.014 : 0.008), X65.yellow, Math.sin(a) * 0.058, T + 0.0004, GZ + Math.cos(a) * 0.058); t.rotation.y = a; g.add(t); }
  // col fixe noir brillant
  g.add(at(cyl(0.04, 0.043, 0.006, MAT.gloss, 56), 0, T + 0.003, GZ));
  g.add(at(cyl(0.03, 0.036, 0.01, MAT.gloss, 56), 0, T + 0.011, GZ));
  g.add(at(decal("SAITEK FORCE SENSING", 0.0032, "#aab0b6"), 0, T + 0.0066, GZ + 0.034));
  const grip = grp(g, 0, T + 0.014, GZ, -0.1);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, at(cyl(0.024, 0.026, 0.012, X65.matte, 40), 0, 0.006, 0)));
  // poignée droite et massive, tête anguleuse plus large
  grip.add(loft([
    { y: 0.01, rx: 0.023, rz: 0.027, n: 2.6 }, { y: 0.05, rx: 0.0235, rz: 0.03, cz: 0.001, n: 2.6 }, { y: 0.1, rx: 0.024, rz: 0.031, cz: 0.002, n: 2.6 }, { y: 0.135, rx: 0.025, rz: 0.031, cz: 0.001, n: 2.8 },
    { y: 0.152, rx: 0.036, rz: 0.035, cz: -0.004, n: 4 }, { y: 0.19, rx: 0.04, rz: 0.038, cz: -0.006, n: 5 }, { y: 0.2, rx: 0.038, rz: 0.034, cz: -0.006, n: 5 },
  ], X65.matte, 48));
  // repose-main trapézoïdal à droite, en bas
  grip.add(at(chamferBox(0.05, 0.007, 0.06, 0.012, X65.matte), 0.04, 0.035, 0.012));
  grip.add(ctl("Axes", "X / Y", 0, 0.08, 0.032, mesh(new THREE.BoxGeometry(0.014, 0.034, 0.0012), MAT.rubber)));
  // avant : gâchette grise, bouton C argenté, palette noire sur son bloc
  grip.add(ctl("Gâchette", "1", 0, 0.142, -0.031, trigger(0.03, 0.013, X.grey)));
  grip.add(ctl("Bouton C", "C", -0.012, 0.1, -0.03, push(0.0065, 0.005, MAT.alu, MAT.plastic).rotateX(FRONT)));
  grip.add(at(rbox(0.02, 0.014, 0.022, 0.003, X65.matte), 0, 0.03, -0.036));
  grip.add(ctl("Palette auriculaire", "5", 0, 0.062, -0.04, at(rbox(0.012, 0.05, 0.005, 0.002, MAT.plastic), 0, 0, 0).rotateX(-0.2)));
  // flanc gauche : chapeau latéral et bouton B
  const lf = grp(grip, -0.039, 0.172, 0.0, 0, 0, LEFT);
  lf.add(ctl("Chapeau 3 (latéral)", "H3", 0.006, 0, 0.006, hat(0.0062, MAT.plastic, "castle")));
  lf.add(ctl("Bouton B (latéral)", "B", -0.014, 0, 0.01, push(0.005, 0.003, MAT.alu, MAT.plastic)));
  // tête : deux pans, celui de gauche légèrement plus bas
  const head = grp(grip, 0, 0.196, 0.016, 0.8);
  head.add(at(rbox(0.04, 0.005, 0.066, 0.006, MAT.plastic), -0.02, -0.0015, -0.004));
  head.add(at(rbox(0.036, 0.005, 0.066, 0.006, MAT.plastic), 0.02, 0.0005, -0.004));
  const witch = new THREE.Group(); witch.add(at(cyl(0.011, 0.0118, 0.003, MAT.plastic, 40), 0, 0.0015, 0));
  for (let i = 0; i < 4; i++) witch.add(at(cyl(0.0095 - i * 0.002, 0.0105 - i * 0.002, 0.002, MAT.plastic, 40), 0, 0.004 + i * 0.002, 0));
  head.add(ctl("Chapeau 1 (sorcière)", "H1", -0.019, 0.001, -0.02, witch));
  head.add(ctl("Bouton A", "A", -0.013, 0.001, 0.008, push(0.0058, 0.004, X.red, MAT.gloss)));
  head.add(at(decal("A", 0.0045, "#ecd53a"), -0.03, 0.0012, 0.008));
  const pov = new THREE.Group(); pov.add(at(cyl(0.0125, 0.013, 0.004, MAT.plastic, 48), 0, 0.002, 0)); pov.add(at(cyl(0.0108, 0.0118, 0.006, MAT.alu, 48), 0, 0.007, 0)); pov.add(at(cyl(0.0035, 0.0035, 0.001, MAT.gunmetal, 20), 0, 0.0104, 0));
  head.add(ctl("Chapeau POV", "POV", 0.02, 0.003, -0.022, pov));
  head.add(ctl("Chapeau 2 (créneau)", "H2", 0.02, 0.003, 0.008, hat(0.0085, MAT.plastic, "castle")));
  return g;
}

function x65Throttle(): G {
  const g = new THREE.Group();
  const T = bridgeBase(g, 0.2, 0.22);
  // console centrale inclinée, deux fentes à échelle blanche
  const deck = grp(g, -0.02, T, 0.0, 0.16);
  deck.add(at(rbox(0.1, 0.012, 0.12, 0.004, X65.matte), 0, 0.006, 0));
  for (const sx of [-1, 1]) {
    deck.add(mesh(new THREE.BoxGeometry(0.03, 0.001, 0.08), MAT.gloss, sx * 0.021, 0.0125, 0.004));
    for (let i = 0; i < 9; i++) deck.add(mesh(new THREE.BoxGeometry(i % 4 === 0 ? 0.022 : 0.016, 0.0006, 0.0012), X65.white, sx * 0.021, 0.0132, 0.012 + i * 0.0034));
  }
  // galet en deux moitiés (couture au milieu), axe gauche-droite
  const half = (r: number, len: number) => { const m = mesh(new THREE.CylinderGeometry(r, r, len, 48), X65.matte); m.rotation.z = Math.PI / 2; m.scale.set(1, 1, 1.25); return m; };
  const arm = (x: number) => { const a = grp(deck, x, 0.012, 0.004, -0.5); a.add(at(rbox(0.016, 0.05, 0.03, 0.003, MAT.plastic), 0, 0.025, 0)); return a; };
  const aL = arm(-0.021), aR = arm(0.021);
  const hL = grp(aL, -0.006, 0.078, 0), hR = grp(aR, 0.006, 0.078, 0);
  hL.add(ctl("Gaz gauche", "GAZ G", 0, 0, 0, half(0.036, 0.05)));
  hL.add(at(half(0.031, 0.004), -0.027, 0, 0));
  hR.add(ctl("Gaz droit", "GAZ D", 0, 0, 0, half(0.036, 0.05)));
  // moitié gauche : bouton D sur le flanc, bascule K et molette argentée côté doigts
  hL.add(ctl("Bouton D (postcombustion)", "D", -0.03, -0.02, 0.012, rbox(0.004, 0.014, 0.018, 0.0015, X.grey)));
  const lfF = grp(hL, 0, 0, -0.045, FRONT);
  lfF.add(ctl("Bascule K", "K", 0.004, 0, 0.0, at(cyl(0.0085, 0.009, 0.002, MAT.plastic, 28), 0, 0.001, 0), at(rbox(0.011, 0.005, 0.007, 0.002, MAT.plastic), 0, 0.0045, 0)));
  hL.add(ctl("Molette", "MOLETTE", -0.033, 0.002, -0.018, knurledKnob(0.011, 0.008, MAT.alu).rotateZ(Math.PI / 2)));
  // moitié droite, prolongée par le bloc des rotatifs
  const blk = grp(hR, 0.04, 0.0, -0.004);
  blk.add(at(rbox(0.034, 0.05, 0.05, 0.01, X65.matte), 0, 0, 0));
  const knobE = new THREE.Group(); knobE.add(at(cyl(0.017, 0.018, 0.006, MAT.plastic, 48), 0, 0.003, 0)); knobE.add(at(knurledKnob(0.0155, 0.01, MAT.plastic), 0, 0.011, 0)); knobE.add(at(cyl(0.011, 0.011, 0.001, MAT.gloss, 32), 0, 0.0165, 0));
  blk.add(ctl("Rotatif E", "E", 0.002, 0.025, 0.0, knobE));
  const knobF = new THREE.Group(); knobF.add(at(knurledKnob(0.013, 0.009, MAT.plastic), 0, 0.0045, 0));
  blk.add(ctl("Rotatif F", "F", 0.002, -0.025, -0.006, knobF.rotateX(Math.PI)));
  // deux petits chapeaux argentés sous le bloc, vers le pilote
  const th = grp(blk, 0.004, -0.012, 0.0255, BACK);
  th.add(ctl("Chapeau gaz haut", "H4", -0.006, 0, -0.008, at(cyl(0.004, 0.0045, 0.008, MAT.alu, 20), 0, 0.004, 0), at(knurledKnob(0.005, 0.004, MAT.knurl), 0, 0.01, 0)));
  th.add(ctl("Chapeau gaz bas", "H5", 0.008, 0, 0.006, at(cyl(0.004, 0.0045, 0.008, MAT.alu, 20), 0, 0.004, 0), at(knurledKnob(0.005, 0.004, MAT.knurl), 0, 0.01, 0)));
  // côté doigts de la moitié droite : chapeau créneau noir et chapeau-molette argenté
  const rtF = grp(hR, 0, 0, -0.045, FRONT);
  rtF.add(ctl("Chapeau gaz créneau", "H6", -0.012, 0, 0.0, hat(0.007, MAT.plastic, "castle")));
  const wheelHat = new THREE.Group(); wheelHat.add(at(cyl(0.0095, 0.0095, 0.003, MAT.alu, 40), 0, 0.0015, 0)); wheelHat.add(at(cyl(0.0045, 0.0045, 0.002, MAT.gunmetal, 24), 0, 0.004, 0));
  rtF.add(ctl("Chapeau molette", "H7", 0.012, 0, 0.0, wheelHat));
  g.add(at(decal("X65F", 0.008, "#e9edf0"), 0.06, T + 0.0006, 0.085));
  // pupitre arrière : deux boîtiers côte à côte sur potence
  g.add(at(rbox(0.016, 0.11, 0.016, 0.003, X65.matte), 0.045, T + 0.055, -0.092));
  const panel = grp(g, 0.035, T + 0.13, -0.085, 1.25);
  panel.add(at(rbox(0.078, 0.035, 0.07, 0.003, X65.matte), -0.04, -0.0175, 0));
  panel.add(at(rbox(0.078, 0.035, 0.07, 0.003, X65.matte), 0.041, -0.0175, 0));
  for (const x of [-0.074, -0.006, 0.007, 0.075]) for (const z of [-0.03, 0.03]) panel.add(at(cyl(0.0028, 0.0028, 0.0015, MAT.alu, 12), x, 0.0006, z));
  // boîtier gauche : SAFE rouge, rangée MODE orange, F1 / F2, T1–T4
  panel.add(ctl("Bouton Danger", "SAFE", -0.07, 0.0005, -0.016, at(rbox(0.012, 0.008, 0.016, 0.002, X.red), 0, 0.004, 0)));
  panel.add(at(decal("MODE", 0.003, "#e9edf0"), -0.034, 0.0006, -0.027));
  for (let i = 0; i < 4; i++) panel.add(at(key(0.0095, 0.008, X.orangeLit), -0.052 + i * 0.012, 0.0005, -0.018));
  for (let i = 0; i < 2; i++) panel.add(at(key(0.012, 0.007, X.grey), -0.064 + i * 0.015, 0.0005, 0.0));
  ["T1", "T2", "T3", "T4"].forEach((n, i) => panel.add(ctl(n, n, -0.028 + (i % 2) * 0.017, 0.0005, 0.002 + Math.floor(i / 2) * 0.016, key(0.013, 0.009, MAT.plastic))));
  // boîtier droit : tableau des réglages d'effort
  panel.add(at(rbox(0.066, 0.0008, 0.058, 0.002, MAT.gloss), 0.041, 0.0006, 0));
  panel.add(at(decal("X65F", 0.006, "#e9edf0"), 0.026, 0.0012, -0.022));
  panel.add(at(decal("FORCE SETTING", 0.0026, "#e9edf0"), 0.056, 0.0012, -0.022));
  for (let i = 0; i < 5; i++) panel.add(mesh(new THREE.BoxGeometry(0.058, 0.0004, 0.0006), X65.white, 0.041, 0.0012, -0.014 + i * 0.009));
  for (const x of [0.012, 0.03, 0.05, 0.07]) panel.add(mesh(new THREE.BoxGeometry(0.0006, 0.0004, 0.036), X65.white, x, 0.0012, 0.004));
  ["F1", "F2", "F3", "F4"].forEach((n, i) => panel.add(at(decal(n, 0.0034, "#e9edf0"), 0.021, 0.0013, -0.0095 + i * 0.009)));
  return g;
}

export function buildX65F(): G {
  const root = new THREE.Group(); root.name = "X-65F";
  const s = x65Stick(); s.position.x = 0.13; root.add(s);
  const t = x65Throttle(); t.position.x = -0.13; root.add(t);
  return root;
}

// ─────────────────────── SAITEK CYBORG F.L.Y. 5 ───────────────────────
// Socle en Y noir et argent, levier de gaz sur la gauche, 4 touches en arc
// côté pilote ; manche réglable à tête anguleuse.
export function buildFly5(): G {
  const root = new THREE.Group(); root.name = "FLY 5";
  const H = 0.035;
  root.add(loft([{ y: 0, rx: 0.07, rz: 0.07 }, { y: 0.012, rx: 0.07, rz: 0.07 }, { y: H, rx: 0.045, rz: 0.045 }], MAT.body, 48));
  for (const [a, mat] of [[Math.PI * 0.2, MAT.alu], [Math.PI * 0.8, MAT.body], [Math.PI * 1.5, MAT.body]] as [number, THREE.Material][]) root.add(at(rbox(0.12, 0.016, 0.05, 0.02, mat), Math.cos(a) * 0.085, 0.008, Math.sin(a) * 0.085).rotateY(-a));
  root.add(at(boot(0.032, 0.02), 0, H, 0));
  [6, 7, 8, 9].forEach((n, i) => { const a = Math.PI * (0.32 + i * 0.12); root.add(ctl(`Socle ${n}`, String(n), Math.cos(a) * 0.058, 0.022, Math.sin(a) * 0.058, key(0.014, 0.012, MAT.alu).rotateY(-a + Math.PI / 2))); });
  root.add(ctl("Arrière G", "10", -0.03, 0.03, -0.045, push(0.005, 0.003, MAT.alu)));
  root.add(ctl("Arrière D", "11", 0.03, 0.03, -0.045, push(0.005, 0.003, MAT.alu)));
  root.add(ctl("Bouton du socle", "14", 0.075, 0.017, 0.045, push(0.006, 0.003, MAT.alu)));
  root.add(ctl("Levier de gaz", "GAZ", -0.085, 0.02, 0.01, at(cyl(0.011, 0.011, 0.05, MAT.plastic, 24).rotateZ(Math.PI / 2.4), 0, 0.02, 0)));
  const grip = grp(root, 0, H + 0.018, 0, -0.16);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.019, MAT.alu)));
  grip.add(at(fighterGrip(0.95, MAT.body), 0, 0.006, 0));
  axesPad(grip, 0.08, 0.03);
  grip.add(ctl("Gâchette", "1", 0, 0.138, -0.032, trigger(0.03, 0.012, MAT.alu)));
  grip.add(ctl("Molette", "MOLETTE", 0.03, 0.14, 0.0, knurledKnob(0.006, 0.006, MAT.knurl).rotateX(Math.PI / 2)));
  const head = grp(grip, 0, 0.176, 0.02, 0.9);
  head.add(at(chamferBox(0.07, 0.006, 0.056, 0.014, MAT.alu), 0, -0.002, -0.004));
  head.add(ctl("Chapeau", "POV", 0, 0.002, -0.004, hat(0.0078, MAT.plastic, "castle")));
  head.add(ctl("Tête 4", "4", -0.022, 0.002, -0.014, key(0.012, 0.01, MAT.plastic))); head.add(ctl("Tête 5", "5", 0.022, 0.002, -0.014, key(0.012, 0.01, MAT.plastic)));
  head.add(ctl("Tête 2", "2", -0.022, 0.002, 0.008, key(0.012, 0.01, MAT.plastic))); head.add(ctl("Tête 3", "3", 0.022, 0.002, 0.008, key(0.012, 0.01, MAT.plastic)));
  return root;
}

// ─────────────────────── LOGITECH G940 (MANCHE) ───────────────────────
// Gros socle gris à retour de force, trois molettes de trim côté pilote ;
// tête : bouton Fire rouge, S1–S5, mini-stick, chapeau.
export function buildG940(): G {
  const root = new THREE.Group(); root.name = "G940";
  const H = 0.07;
  root.add(at(chamferBox(0.22, H, 0.24, 0.03, X.darkGrey), 0, H / 2, 0));
  root.add(at(rbox(0.09, 0.004, 0.09, 0.01, MAT.gloss), 0, H + 0.002, -0.02));
  root.add(at(boot(0.034, 0.024), 0, H + 0.004, -0.02));
  ["Trim 1", "Trim 2", "Trim 3"].forEach((n, i) => root.add(ctl(n, n.toUpperCase(), -0.03 + i * 0.03, H + 0.001, 0.085, knurledKnob(0.009, 0.006, MAT.plastic))));
  root.add(at(decal("G940", 0.012, "#c9ced4"), 0.06, H * 0.5, 0.1206).rotateX(Math.PI / 2));
  const grip = grp(root, 0, H + 0.03, -0.02, -0.12);
  grip.add(fighterGrip(1.06, MAT.body));
  axesPad(grip, 0.09, 0.033);
  grip.add(ctl("Gâchette", "TIR 1·9", 0, 0.156, -0.035, trigger(0.034, 0.012, MAT.plastic)));
  grip.add(ctl("S5", "S5", 0, 0.075, -0.031, push(0.005, 0.003, X.grey).rotateX(FRONT)));
  grip.add(ctl("S4", "S4", -0.03, 0.15, 0.006, push(0.005, 0.003, X.grey).rotateZ(LEFT)));
  const head = grp(grip, 0, 0.19, 0.02, 0.9);
  head.add(at(rbox(0.066, 0.004, 0.058, 0.012, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Fire", "FIRE", -0.018, 0.001, -0.02, push(0.0062, 0.004, X.red)));
  head.add(ctl("Chapeau", "POV", 0.016, 0.001, -0.018, hat(0.0078, X.grey, "dome")));
  head.add(ctl("Mini-stick", "MINI", -0.016, 0.001, 0.006, ministick(0.006)));
  head.add(ctl("S1", "S1", 0.006, 0.001, 0.004, push(0.0045, 0.003, X.grey))); head.add(ctl("S2", "S2", 0.02, 0.001, 0.008, push(0.0045, 0.003, X.grey))); head.add(ctl("S3", "S3", 0.008, 0.001, 0.018, push(0.0045, 0.003, X.grey)));
  return root;
}

// ─────────────────────── DEFENDER COBRA M5 ───────────────────────
// Socle métallique gris clair, poignée grise à boutons rouges.
export function buildCobraM5(): G {
  const root = new THREE.Group(); root.name = "Cobra M5";
  const H = 0.05;
  root.add(at(chamferBox(0.19, H, 0.2, 0.02, X.grey), 0, H / 2, 0));
  root.add(at(cyl(0.04, 0.042, 0.004, MAT.plastic, 48), 0, H + 0.002, -0.01));
  root.add(at(boot(0.032, 0.024), 0, H + 0.004, -0.01));
  root.add(at(decal("COBRA M5", 0.006, "#23282e"), 0.03, H + 0.0006, 0.07));
  const grip = grp(root, 0, H + 0.03, -0.01, -0.12);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.02, MAT.plastic)));
  grip.add(at(fighterGrip(1.04, X.darkGrey), 0, 0.006, 0));
  axesPad(grip, 0.088, 0.033);
  grip.add(ctl("Gâchette", "1", 0, 0.158, -0.035, trigger(0.034, 0.012, X.grey)));
  grip.add(ctl("Gâchette secondaire", "2", -0.03, 0.156, 0.004, push(0.006, 0.004, X.red).rotateZ(LEFT)));
  grip.add(ctl("Palette auriculaire", "9", 0, 0.08, -0.032, at(rbox(0.01, 0.036, 0.005, 0.002, X.red), 0, 0, -0.004)));
  const head = grp(grip, 0, 0.192, 0.02, 0.9);
  head.add(at(rbox(0.066, 0.004, 0.056, 0.012, X.grey), 0, -0.001, -0.004));
  head.add(ctl("Chapeau POV", "POV", 0.0, 0.001, -0.018, hat(0.008, X.grey, "dome")));
  head.add(ctl("Chapeau", "5–8", 0.0, 0.001, 0.008, hat(0.0066, MAT.plastic, "castle")));
  head.add(ctl("Bouton rouge G", "3", -0.022, 0.001, -0.004, push(0.0056, 0.0035, X.red)));
  head.add(ctl("Bouton rouge D", "4", 0.022, 0.001, -0.004, push(0.0056, 0.0035, X.red)));
  return root;
}

// ─────────────────────── VIRPIL : base WarBRD commune ───────────────────────
function virpilBase(root: G): G {
  const W = 0.15, H = 0.012;
  root.add(at(rbox(W, H, W, 0.008, X.steel), 0, H / 2, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => root.add(at(cyl(0.004, 0.004, 0.003, MAT.gunmetal, 6), a * (W / 2 - 0.012), H + 0.0015, b * (W / 2 - 0.012))));
  root.add(at(rbox(0.1, 0.045, 0.1, 0.01, MAT.body), 0, H + 0.0225, 0));
  root.add(at(decal("VIRPIL", 0.007, "#c9ced4"), 0, H + 0.0006, 0.062));
  root.add(at(boot(0.036, 0.026), 0, H + 0.045, 0));
  root.add(at(knurledKnob(0.022, 0.018, MAT.plastic), 0, H + 0.078, 0));
  return grp(root, 0, H + 0.09, 0, -0.14);
}
// WarBRD Delta : tête compacte, chapeau lumineux bleu, mini-stick, molette.
export function buildDelta(): G {
  const root = new THREE.Group(); root.name = "WarBRD Delta";
  const grip = virpilBase(root);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.023, X.steel)));
  grip.add(at(fighterGrip(1.06, MAT.body), 0, 0.01, 0));
  axesPad(grip, 0.09, 0.034);
  grip.add(ctl("Gâchette", "TIR 1·2", 0, 0.16, -0.036, trigger(0.036, 0.012, X.red)));
  grip.add(ctl("Bouton de gâchette", "3", 0, 0.186, -0.04, push(0.005, 0.003, MAT.plastic, X.steel).rotateX(FRONT)));
  grip.add(ctl("Molette", "MOLETTE", 0.02, 0.15, -0.03, knurledKnob(0.006, 0.006, MAT.knurl).rotateZ(Math.PI / 2)));
  const head = grp(grip, 0, 0.2, 0.02, 0.9);
  head.add(at(rbox(0.07, 0.004, 0.058, 0.014, MAT.plastic), 0, -0.001, -0.004));
  const blue = new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x1f7fe0, emissiveIntensity: 1.2, roughness: 0.4 });
  head.add(ctl("Chapeau lumineux", "H·LED", 0.0, 0.001, -0.018, hat(0.0075, MAT.plastic, "dome"), mesh(new THREE.TorusGeometry(0.0095, 0.001, 8, 32), blue, 0, 0.002, 0).rotateX(Math.PI / 2)));
  head.add(ctl("Chapeau gauche", "H·G", -0.02, 0.001, 0.006, hat(0.0064, MAT.plastic, "castle")));
  head.add(ctl("Chapeau droit", "H·D", 0.02, 0.001, 0.006, hat(0.0064, MAT.plastic, "cross")));
  head.add(ctl("Mini-stick", "MINI", 0.0, 0.001, 0.016, ministick(0.006)));
  return root;
}
// WarBRD : poignée simple, gros bouton rouge, bouton vert, deux chapeaux.
export function buildWarBRD(): G {
  const root = new THREE.Group(); root.name = "WarBRD";
  const grip = virpilBase(root);
  grip.add(ctl("Torsion", "TORSION", 0, 0, 0, twistRing(0.023, X.steel)));
  grip.add(at(fighterGrip(1.06, MAT.body), 0, 0.01, 0));
  axesPad(grip, 0.09, 0.034);
  grip.add(ctl("Gâchette", "TIR 1·2", 0, 0.16, -0.036, trigger(0.036, 0.012, X.red)));
  grip.add(ctl("Bouton auriculaire", "4", 0, 0.07, -0.031, push(0.0056, 0.004, X.red).rotateX(FRONT)));
  grip.add(ctl("Chapeau pouce", "POUCE", -0.036, 0.165, 0.004, hat(0.0066, MAT.plastic, "castle").rotateZ(LEFT)));
  const head = grp(grip, 0, 0.2, 0.02, 0.9);
  head.add(at(rbox(0.07, 0.004, 0.058, 0.014, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Bouton rouge", "3", -0.014, 0.001, 0.004, push(0.0085, 0.004, X.red)));
  head.add(ctl("Bouton vert", "19", 0.0, 0.001, -0.02, push(0.0045, 0.003, new THREE.MeshStandardMaterial({ color: 0x35c95a, emissive: 0x1f9a3e, emissiveIntensity: 0.9 }))));
  head.add(ctl("Chapeau haut", "H1", 0.02, 0.001, -0.012, hat(0.0072, MAT.plastic, "dome")));
  return root;
}
// MongoosT-50CM2 : poignée de Su-35, boutons rouges, levier de frein avant.
export function buildT50(): G {
  const root = new THREE.Group(); root.name = "MT-50CM2";
  const grip = virpilBase(root);
  grip.add(at(fighterGrip(1.12, MAT.body), 0, 0.006, 0));
  axesPad(grip, 0.095, 0.035);
  grip.add(ctl("Gâchette", "TIR 1·2", 0, 0.165, -0.038, trigger(0.038, 0.012, X.red)));
  grip.add(ctl("Gâchette rabattable", "RABAT", 0, 0.196, -0.044, at(rbox(0.013, 0.006, 0.026, 0.002, MAT.plastic), 0, 0, -0.007)));
  grip.add(ctl("Levier de frein", "FREIN", 0, 0.05, -0.04, at(rbox(0.01, 0.09, 0.005, 0.002, MAT.plastic), 0, 0.03, -0.01).rotateX(0.2)));
  grip.add(ctl("Bouton auriculaire", "6", 0, 0.085, -0.033, push(0.005, 0.003, X.red).rotateX(FRONT)));
  grip.add(ctl("Chapeau pouce", "POUCE", -0.039, 0.176, 0.004, hat(0.0066, MAT.plastic, "castle").rotateZ(LEFT)));
  const head = grp(grip, 0, 0.21, 0.022, 0.9);
  head.add(at(rbox(0.074, 0.004, 0.062, 0.014, MAT.plastic), 0, -0.001, -0.004));
  head.add(ctl("Bouton rouge", "4", -0.022, 0.001, -0.02, push(0.006, 0.004, X.red)));
  head.add(ctl("Chapeau trim", "TRIM", 0.004, 0.001, -0.022, hat(0.0075, X.red, "dome")));
  head.add(ctl("Bouton noir", "5", 0.026, 0.001, -0.016, push(0.005, 0.003, MAT.plastic, X.steel)));
  head.add(ctl("Chapeau 2", "H2", 0.018, 0.001, 0.008, hat(0.0064, X.red, "castle")));
  head.add(ctl("Chapeau 3", "H3", -0.014, 0.001, 0.01, hat(0.0064, X.red, "cross")));
  return root;
}

// ─────────────────────── WINWING ORION 2 + POIGNÉE F-16 ───────────────────────
// Embase métal noire, poignée de F-16 : bouton rouge, trim, DMS, TMS, CMS.
export function buildOrionF16(): G {
  const root = new THREE.Group(); root.name = "Orion 2 F-16";
  const H = 0.055;
  root.add(at(rbox(0.18, H, 0.18, 0.006, MAT.body), 0, H / 2, 0));
  root.add(at(rbox(0.11, 0.004, 0.11, 0.004, MAT.gunmetal), 0, H + 0.002, 0));
  root.add(at(decal("WINWING", 0.007, "#c9ced4"), 0, H * 0.5, 0.0906).rotateX(Math.PI / 2));
  root.add(at(boot(0.036, 0.028), 0, H + 0.004, 0));
  const grip = grp(root, 0, H + 0.036, 0, -0.12);
  grip.add(fighterGrip(1.12, MAT.plastic));
  axesPad(grip, 0.095, 0.035);
  grip.add(ctl("Gâchette", "TIR 1·2", 0, 0.165, -0.038, trigger(0.036, 0.012, MAT.plastic)));
  const fr = grp(grip, 0, 0.07, -0.031, FRONT);
  fr.add(ctl("Bouton auriculaire", "3", 0, 0, 0.022, push(0.0048, 0.003, MAT.gunmetal)));
  fr.add(ctl("Palette", "4", 0, 0.008, -0.012, rbox(0.01, 0.006, 0.04, 0.002, MAT.gunmetal)));
  grip.add(ctl("Chapeau pouce (CMS)", "CMS", -0.039, 0.172, 0.004, hat(0.0064, X.grey, "dome").rotateZ(LEFT)));
  const head = grp(grip, 0, 0.2, 0.02, 0.85);
  head.add(at(rbox(0.066, 0.004, 0.056, 0.012, MAT.plastic), 0, -0.001, -0.006));
  head.add(ctl("Bouton rouge", "20", -0.02, 0.001, -0.022, push(0.0062, 0.004, X.red)));
  head.add(ctl("Trim", "TRIM", 0.018, 0.001, -0.02, hat(0.0085, X.grey, "dome")));
  head.add(ctl("Chapeau gauche (TMS)", "TMS", -0.016, 0.001, 0.004, hat(0.0066, MAT.plastic, "cross")));
  head.add(ctl("Chapeau droit (DMS)", "DMS", 0.016, 0.001, 0.008, hat(0.0066, MAT.plastic, "castle")));
  return root;
}

export const EXTRA_MODELS: { test: RegExp; build: () => G }[] = [
  { test: /T\.?16000M/i, build: buildT16000M },
  { test: /TWCS/i, build: buildTWCS },
  { test: /Warthog \(manche\)/i, build: buildWarthogStick },
  { test: /Warthog \(gaz\)/i, build: buildWarthogThrottle },
  { test: /T\.Flight/i, build: buildTFlight },
  { test: /X52/i, build: buildX52 },
  { test: /Extreme 3D/i, build: buildExtreme3D },
  { test: /Gladiator NXT/i, build: buildNxtEvo },
  { test: /Constellation Alpha/i, build: buildAlpha },
  { test: /CM3/i, build: buildCM3 },
  { test: /Ursa Minor/i, build: buildUrsaMinor },
  { test: /Fighterstick/i, build: buildCHStick },
  { test: /Pro Throttle/i, build: buildCHThrottle },
  { test: /VelocityOne/i, build: buildVelocityOne },
  { test: /X-55.*manche/i, build: buildX55Stick },
  { test: /X-55.*gaz/i, build: buildX55Throttle },
  { test: /X-65F/i, build: buildX65F },
  { test: /X-45/i, build: buildX45 },
  { test: /F\.L\.Y/i, build: buildFly5 },
  { test: /G940/i, build: buildG940 },
  { test: /Cobra M5/i, build: buildCobraM5 },
  { test: /WarBRD Delta/i, build: buildDelta },
  { test: /WarBRD/i, build: buildWarBRD },
  { test: /50CM2/i, build: buildT50 },
  { test: /Orion 2/i, build: buildOrionF16 },
];
registerModels(EXTRA_MODELS);

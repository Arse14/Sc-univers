/**
 * Modèles 3D schématiques du Logitech X56 (manche et manette des gaz),
 * construits par code. Chaque commande est un groupe portant
 * `userData.control = "<nom du profil Logitech>"` : Trigger, A, B, D, Pinky,
 * H1, H2, POV, C Stick, Twist, X Axis, Mode… Les noms correspondent au
 * fichier .pr0 pour que la sélection suive les commandes réelles.
 *
 * Unités : mètres (le manche fait ≈ 25 cm de haut).
 */
import * as THREE from "three";
import { MAT } from "./materials";

type Ctrl = THREE.Group;

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Boîte à arêtes arrondies (extrusion d'un rectangle à coins ronds). */
function roundedBox(w: number, h: number, d: number, r: number, mat: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: r * 0.5, bevelSize: r * 0.5, bevelSegments: 3, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Groupe-commande : tout ce qu'il contient est cliquable et pointe vers ce nom. */
function control(name: string, x: number, y: number, z: number, ...children: THREE.Object3D[]): Ctrl {
  const g = new THREE.Group();
  g.name = name;
  g.userData.control = name;
  g.position.set(x, y, z);
  children.forEach((c) => { c.userData.control = name; g.add(c); });
  return g;
}

/** Bouton rond. */
function roundButton(r = 0.006, h = 0.004, mat: THREE.Material = MAT.button): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 24), mat);
}

/** Hat 4 voies : socle + chapeau cruciforme. */
function hat4(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.0065 * scale, 0.0075 * scale, 0.003, 20), MAT.darkMetal));
  const cap = mesh(new THREE.CylinderGeometry(0.0045 * scale, 0.0045 * scale, 0.006, 16), MAT.rubber, 0, 0.0045, 0);
  g.add(cap);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    g.add(mesh(new THREE.BoxGeometry(0.0035 * scale, 0.003, 0.0022 * scale), MAT.rubber, Math.cos(a) * 0.0045 * scale, 0.006, Math.sin(a) * 0.0045 * scale));
  }
  return g;
}

/** Hat 8 voies (POV) : disque plat avec nervures. */
function hat8(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.0035, 24), MAT.darkMetal));
  g.add(mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 24), MAT.rubber, 0, 0.0035, 0));
  g.add(mesh(new THREE.TorusGeometry(0.0062, 0.0007, 8, 32), MAT.led, 0, 0.0056, 0).rotateX(Math.PI / 2));
  return g;
}

/** Mini-stick analogique : socle + tige + tête. */
function ministick(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.007, 0.0075, 0.003, 24), MAT.darkMetal));
  g.add(mesh(new THREE.CylinderGeometry(0.0018, 0.0022, 0.009, 12), MAT.metal, 0, 0.006, 0));
  g.add(mesh(new THREE.SphereGeometry(0.0042, 20, 14), MAT.rubber, 0, 0.0115, 0));
  return g;
}

/** Interrupteur à levier (SW). */
function toggleSwitch(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.004 * scale, 0.0045 * scale, 0.003, 16), MAT.metal));
  const lever = mesh(new THREE.CylinderGeometry(0.0013 * scale, 0.0016 * scale, 0.012 * scale, 10), MAT.metal, 0, 0.007 * scale, 0);
  lever.rotation.x = -0.45;
  g.add(lever);
  g.add(mesh(new THREE.SphereGeometry(0.002 * scale, 12, 8), MAT.metal, 0, 0.0128 * scale, -0.0055 * scale));
  return g;
}

/** Bouton-rocker haut/bas (TGL, K1). */
function rocker(w = 0.008, d = 0.012): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w + 0.002, 0.002, d + 0.002), MAT.darkMetal));
  const top = mesh(new THREE.BoxGeometry(w, 0.004, d), MAT.rubber, 0, 0.003, 0);
  top.rotation.x = 0.12;
  g.add(top);
  return g;
}

/** Molette rotative (Rotary). */
function rotary(r = 0.008, h = 0.006): THREE.Group {
  const g = new THREE.Group();
  const knob = mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 32), MAT.rubber);
  g.add(knob);
  g.add(mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, h + 0.0015, 24), MAT.metal, 0, 0.0007, 0));
  g.add(mesh(new THREE.BoxGeometry(0.0012, 0.001, r * 0.9), MAT.led, 0, h / 2 + 0.0006, r * 0.3));
  return g;
}

/** Curseur linéaire (SLD). */
function slider(len = 0.02): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.006, 0.002, len), MAT.darkMetal));
  g.add(mesh(new THREE.BoxGeometry(0.0055, 0.004, 0.006), MAT.rubber, 0, 0.0025, len * 0.2));
  return g;
}

/** Sélecteur de mode 3 positions (petit curseur avec 3 LED). */
function modeSwitch(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.016, 0.002, 0.006), MAT.darkMetal));
  g.add(mesh(new THREE.BoxGeometry(0.004, 0.0035, 0.0045), MAT.metal, -0.005, 0.0025, 0));
  [-0.005, 0, 0.005].forEach((x, i) => g.add(mesh(new THREE.SphereGeometry(0.0007, 8, 6), i === 0 ? MAT.led : MAT.darkMetal, x, 0.0014, 0.0045)));
  return g;
}

/** Profil ergonomique de la poignée du manche (lathe). */
function gripGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const profile: [number, number][] = [
    [0.012, 0], [0.017, 0.01], [0.02, 0.03], [0.021, 0.055], [0.02, 0.08], [0.0185, 0.1], [0.019, 0.115], [0.021, 0.128], [0.02, 0.138], [0.015, 0.144], [0.006, 0.147], [0, 0.148],
  ];
  profile.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  return new THREE.LatheGeometry(pts, 40);
}

// ───────────────────────────── MANCHE ─────────────────────────────

export function buildStick(): THREE.Group {
  const root = new THREE.Group();
  root.name = "X56 Stick";

  // Socle
  const base = roundedBox(0.19, 0.045, 0.21, 0.014, MAT.body);
  base.position.y = 0.0225;
  root.add(base);
  const plate = roundedBox(0.16, 0.004, 0.18, 0.01, MAT.bodyLight);
  plate.position.y = 0.047;
  root.add(plate);
  // Bandeau lumineux du socle
  const ring = mesh(new THREE.TorusGeometry(0.052, 0.0022, 10, 64), MAT.led, 0, 0.0495, 0.01);
  ring.rotation.x = Math.PI / 2;
  root.add(ring);
  // Soufflet du cardan
  root.add(mesh(new THREE.SphereGeometry(0.046, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), MAT.rubber, 0, 0.049, 0.01));
  // Tige
  const shaft = mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.08, 24), MAT.darkMetal, 0, 0.085, 0.01);
  root.add(shaft);

  // Poignée : légèrement inclinée vers l'avant (-Z = avant, vers le pilote = +Z)
  const grip = new THREE.Group();
  grip.position.set(0, 0.11, 0.01);
  grip.rotation.x = -0.14;
  root.add(grip);
  grip.add(mesh(gripGeometry(), MAT.body));
  // Garde-doigts avant (repose-index) et bossage pour le pouce
  grip.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.012), MAT.rubber, 0, 0.06, -0.024));
  grip.add(mesh(new THREE.SphereGeometry(0.0125, 20, 14), MAT.rubber, -0.021, 0.1, 0.004));
  // LED latérales
  grip.add(mesh(new THREE.BoxGeometry(0.0015, 0.04, 0.003), MAT.led, 0.0205, 0.075, 0.006));

  // ---- Commandes de la poignée (dans le repère de la poignée) ----
  // Gâchette : à l'avant, hauteur index
  const trigger = control("Trigger", 0, 0.095, -0.03,
    mesh(new THREE.BoxGeometry(0.012, 0.03, 0.006), MAT.metal).rotateX(0.35));
  grip.add(trigger);
  // Pinky : levier bas avant
  const pinky = control("Pinky", 0, 0.03, -0.028,
    mesh(new THREE.BoxGeometry(0.014, 0.012, 0.006), MAT.metal).rotateX(0.5));
  grip.add(pinky);
  // D : bouton côté pouce (gauche du manche), à mi-hauteur
  const dBtn = control("D", -0.0215, 0.085, -0.004, roundButton(0.0055, 0.004).rotateZ(Math.PI / 2));
  grip.add(dBtn);

  // Plateau supérieur
  const topY = 0.148;
  // C Stick : avant-gauche du plateau
  grip.add(control("C Stick", -0.009, topY, -0.011, ministick()));
  // H1 : avant-droit
  grip.add(control("H1", 0.009, topY, -0.011, hat4()));
  // H2 : droite arrière
  grip.add(control("H2", 0.011, topY, 0.007, hat4()));
  // POV : gauche arrière (sous le pouce)
  grip.add(control("POV", -0.0105, topY, 0.006, hat8()));
  // A et B : petits boutons à l'arrière du plateau
  grip.add(control("A", -0.004, topY + 0.001, 0.0155, roundButton(0.0032, 0.0035)));
  grip.add(control("B", 0.006, topY + 0.001, 0.0155, roundButton(0.0032, 0.0035)));
  // Mode : curseur sur le flanc avant du plateau
  const mode = control("Mode", 0, topY - 0.006, -0.0215, modeSwitch());
  mode.rotation.x = Math.PI / 2;
  grip.add(mode);

  // Axes : la poignée entière (Twist) et le cardan (X/Y). Ancre invisible pour la caméra.
  const twist = control("Twist", 0, 0.07, 0.0, new THREE.Mesh(new THREE.CylinderGeometry(0.0215, 0.0215, 0.04, 24), new THREE.MeshBasicMaterial({ visible: false })));
  grip.add(twist);
  const axes = control("X Axis", 0, 0.06, 0.01, new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ visible: false })));
  axes.userData.aliases = ["Y Axis"];
  root.add(axes);

  return root;
}

// ───────────────────────── MANETTE DES GAZ ─────────────────────────

/** Bras + poignée d'une manette, montés sur un pivot. */
function throttleLever(width: number, withThumb: boolean): THREE.Group {
  const g = new THREE.Group();
  // bras incliné
  const arm = mesh(new THREE.BoxGeometry(width, 0.11, 0.03), MAT.body, 0, 0.055, 0);
  arm.rotation.x = -0.35;
  g.add(arm);
  // tête de la manette (poignée horizontale)
  const head = roundedBox(width + 0.02, 0.04, 0.075, 0.012, MAT.body);
  head.position.set(0, 0.11, -0.03);
  head.rotation.x = -0.15;
  g.add(head);
  // bande LED
  g.add(mesh(new THREE.BoxGeometry(width + 0.021, 0.004, 0.002), MAT.led, 0, 0.1, -0.065));
  if (withThumb) {
    // plateau pouce à l'arrière-haut de la poignée gauche
    const thumb = roundedBox(0.036, 0.012, 0.05, 0.006, MAT.bodyLight);
    thumb.position.set(-0.004, 0.135, 0.0);
    thumb.rotation.x = -0.25;
    g.add(thumb);
  }
  return g;
}

export function buildThrottle(): THREE.Group {
  const root = new THREE.Group();
  root.name = "X56 Throttle";

  // Socle large
  const base = roundedBox(0.28, 0.05, 0.22, 0.016, MAT.body);
  base.position.y = 0.025;
  root.add(base);
  const panel = roundedBox(0.25, 0.004, 0.19, 0.01, MAT.bodyLight);
  panel.position.y = 0.052;
  root.add(panel);
  root.add(mesh(new THREE.BoxGeometry(0.25, 0.002, 0.003), MAT.led, 0, 0.055, -0.093));

  // Pivot des manettes (axe transversal) à l'arrière
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.06, 0.03);
  pivot.rotation.x = 0.15;
  root.add(pivot);
  root.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 24), MAT.darkMetal, 0, 0.06, 0.03).rotateZ(Math.PI / 2));

  // Manette gauche (avec commandes pouce) et droite
  const left = throttleLever(0.05, true);
  left.position.x = -0.047;
  pivot.add(left);
  const right = throttleLever(0.045, false);
  right.position.x = 0.044;
  pivot.add(right);

  // Axes des manettes : ancres invisibles
  left.add(control("Left Throttle", 0, 0.1, -0.03, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.08), new THREE.MeshBasicMaterial({ visible: false }))));
  right.add(control("Right Throttle", 0, 0.1, -0.03, new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.08), new THREE.MeshBasicMaterial({ visible: false }))));

  // Rotatifs sur le dessus des manettes (RTY 3 gauche, RTY 4 droite)
  left.add(control("Rotary 3", 0.012, 0.133, -0.05, rotary(0.009, 0.007)));
  right.add(control("Rotary 4", 0.0, 0.133, -0.05, rotary(0.009, 0.007)));

  // ---- Plateau pouce de la manette gauche (hats, mini-stick, K1, scroll, SLD) ----
  const thumbY = 0.145;
  left.add(control("H3", -0.013, thumbY, -0.012, hat4(0.9)));
  left.add(control("H4", -0.013, thumbY, 0.006, hat4(0.9)));
  left.add(control("Mouse Ministick", 0.004, thumbY, -0.004, ministick()));
  left.add(control("K1 Up", 0.016, thumbY - 0.002, 0.012, rocker(0.007, 0.011)));
  left.add(control("Scroll FWD", 0.017, thumbY - 0.004, -0.016,
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 24), MAT.rubber).rotateZ(Math.PI / 2)));
  // SLD : curseur sur le flanc extérieur gauche
  const sld = control("SLD", -0.036, 0.105, -0.03, slider(0.02));
  sld.rotation.z = Math.PI / 2;
  left.add(sld);
  // Boutons E, F Push, G Push, H, I : face avant de la poignée gauche (index/majeur)
  left.add(control("E", -0.018, 0.112, -0.071, roundButton(0.0045, 0.004).rotateX(Math.PI / 2)));
  left.add(control("F Push", -0.005, 0.1, -0.071, roundButton(0.005, 0.004).rotateX(Math.PI / 2)));
  left.add(control("G Push", 0.009, 0.1, -0.071, roundButton(0.005, 0.004).rotateX(Math.PI / 2)));
  left.add(control("H", 0.02, 0.112, -0.071, roundButton(0.0045, 0.004).rotateX(Math.PI / 2)));
  left.add(control("I", -0.03, 0.125, -0.05, roundButton(0.0045, 0.004).rotateZ(Math.PI / 2)));

  // ---- Panneau du socle : SW 1-6, TGL 1-4, RTY 1-2, Mode ----
  const py = 0.054;
  for (let i = 0; i < 6; i++) {
    root.add(control(`SW ${i + 1}`, -0.105 + i * 0.023, py, -0.06, toggleSwitch(1)));
  }
  for (let i = 0; i < 4; i++) {
    root.add(control(`TGL ${i + 1} Up`, 0.04 + i * 0.024, py, -0.06, rocker(0.009, 0.014)));
  }
  root.add(control("Rotary 1", -0.085, py, -0.015, rotary(0.011, 0.008)));
  root.add(control("Rotary 2", -0.05, py, -0.015, rotary(0.011, 0.008)));
  root.add(control("Mode", -0.1, py, 0.03, modeSwitch()));

  return root;
}

/**
 * Noms de commande du modèle ↔ noms du profil .pr0.
 * Certaines commandes du profil sont des paires (TGL 1 Up / Down, K1 Up / Down,
 * Scroll FWD / BCK) ou des familles (Mode 1/2/3) : on les rattache à une seule ancre.
 */
export function anchorNameFor(controlName: string): string {
  const n = controlName.trim();
  if (/^TGL (\d) (Up|Down)$/i.test(n)) return n.replace(/ (Up|Down)$/i, " Up");
  if (/^K1 (Up|Down)$/i.test(n)) return "K1 Up";
  if (/^Scroll (FWD|BCK)$/i.test(n)) return "Scroll FWD";
  if (/^Mode( \d)?$/i.test(n)) return "Mode";
  if (/^(X|Y) Axis$/i.test(n)) return "X Axis";
  if (/^C Stick/i.test(n)) return "C Stick";
  if (/^Mouse/i.test(n)) return "Mouse Ministick";
  return n;
}

/** Choisit le modèle à partir du nom d'appareil du profil ("Stick", "Throttle"). */
export function buildDeviceModel(deviceName: string): THREE.Group | null {
  if (/stick|joystick|manche/i.test(deviceName)) return buildStick();
  if (/throttle|gaz/i.test(deviceName)) return buildThrottle();
  return null;
}

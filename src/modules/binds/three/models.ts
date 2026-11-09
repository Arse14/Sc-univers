/**
 * Modèles 3D du Logitech G X56 H.O.T.A.S. (manche et manette des gaz),
 * reconstruits par code d'après les photos de l'appareil.
 *
 * Repère : +Z vers le pilote (arrière), −Z vers l'avant, +X à droite du
 * pilote, +Y vers le haut. Unités : mètres.
 *
 * Chaque commande est un groupe portant `userData.control = "<nom .pr0>"`
 * (Trigger, A, B, D, Pinky, H1, H2, POV, C Stick, Mode, Twist, X Axis ;
 * E, F Push, G Push, H, I, SW 1/3/5, TGL 1–4 Up, H3, H4, K1 Up, Scroll FWD,
 * Mouse Ministick, SLD, Mode, Left/Right Throttle, Rotary 3/4).
 */
import * as THREE from "three";
import { MAT } from "./materials";

// ───────────────────────────── outils ─────────────────────────────

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Boîte à arêtes arrondies, centrée, `h` en hauteur (Y). */
function rbox(w: number, h: number, d: number, r: number, mat: THREE.Material): THREE.Mesh {
  r = Math.min(r, w / 2 - 1e-4, d / 2 - 1e-4);
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const bev = Math.min(r * 0.4, h * 0.3);
  const geo = new THREE.ExtrudeGeometry(s, { depth: h - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 8 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -(h - bev * 2) / 2, 0);
  return mesh(geo, mat);
}

/** Boîte à coins coupés (chanfrein vertical), style X56. */
function chamferBox(w: number, h: number, d: number, c: number, mat: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + c, y); s.lineTo(x + w - c, y); s.lineTo(x + w, y + c); s.lineTo(x + w, y + d - c);
  s.lineTo(x + w - c, y + d); s.lineTo(x + c, y + d); s.lineTo(x, y + d - c); s.lineTo(x, y + c); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -h / 2, 0);
  return mesh(geo, mat);
}

/** Extrusion d'un profil (points en (z, y)) le long de X, centrée en X. */
function profileX(points: [number, number][], width: number, mat: THREE.Material, bevel = 0.004): THREE.Mesh {
  const s = new THREE.Shape();
  points.forEach(([z, y], i) => (i === 0 ? s.moveTo(z, y) : s.lineTo(z, y)));
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4 });
  // la forme est dans le plan (x=z-profil, y) extrudée en +Z ; on la tourne pour extruder le long de X
  geo.rotateY(-Math.PI / 2); // l'extrusion (+Z) devient −X
  geo.translate((width - bevel * 2) / 2, 0, 0); // recentrage en X
  return mesh(geo, mat);
}

/** Positionne un objet et le renvoie. */
function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T { o.position.set(x, y, z); return o; }

function cyl(rTop: number, rBot: number, h: number, mat: THREE.Material, seg = 32): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
}

/** Molette moletée : cylindre à facettes + fine bague. */
function knurledKnob(r: number, h: number, mat: THREE.Material = MAT.knurl): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(r, r * 0.96, h, mat, 56));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, h * 0.15, 32), MAT.alu, 0, h / 2 + h * 0.07, 0));
  return g;
}

/** Groupe-commande cliquable. */
function control(name: string, x: number, y: number, z: number, ...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.userData.control = name;
  g.position.set(x, y, z);
  children.forEach((c) => g.add(c));
  return g;
}

/** Bouton rond à collerette aluminium (A, B, H, I). */
function aluButton(r = 0.0055, h = 0.004): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(r * 1.3, r * 1.3, 0.0015, MAT.alu, 32));
  g.add(mesh(new THREE.CylinderGeometry(r, r, h, 32), MAT.alu, 0, h / 2 + 0.0007, 0));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.0006, 32), MAT.plastic, 0, h + 0.001, 0));
  return g;
}

/** Hat 4 voies noir du manche : embase cannelée + chapeau cruciforme. */
function blackHat(r = 0.0105): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(r, r * 1.05, 0.004, MAT.plastic, 40));
  for (let i = 1; i <= 3; i++) g.add(mesh(new THREE.TorusGeometry(r * (0.35 + i * 0.2), 0.0005, 6, 40), MAT.panel, 0, 0.0042, 0).rotateX(Math.PI / 2));
  const cap = mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.5, 0.005, 24), MAT.plastic, 0, 0.0065, 0);
  g.add(cap);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    g.add(mesh(new THREE.BoxGeometry(r * 0.5, 0.0035, r * 0.26), MAT.plastic, Math.cos(a) * r * 0.5, 0.0085, Math.sin(a) * r * 0.5).rotateY(-a));
  }
  g.add(mesh(new THREE.SphereGeometry(r * 0.16, 12, 8), MAT.gunmetal, 0, 0.0105, 0));
  return g;
}

/** Hat POV : grande coupelle aluminium avec vis centrale. */
function povHat(r = 0.0135): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(r, r * 0.92, 0.006, MAT.alu, 48));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.86, 0.003, 48), MAT.alu, 0, 0.0045, 0));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.0015, 6), MAT.gunmetal, 0, 0.0065, 0));
  return g;
}

/** Inverseur chromé (TGL) : embase, bague LED, levier. */
function toggle(leverLen = 0.016, ring = true): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.0045, 0.005, 0.003, MAT.gunmetal, 24));
  if (ring) {
    g.add(mesh(new THREE.TorusGeometry(0.0078, 0.0006, 8, 48), MAT.ledRing, 0, 0.0004, 0).rotateX(Math.PI / 2));
    g.add(mesh(new THREE.TorusGeometry(0.0098, 0.0005, 8, 48, Math.PI * 1.5), MAT.ledRing, 0, 0.0004, 0).rotateX(Math.PI / 2));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.003, 16), MAT.chrome, 0, 0.003, 0));
  const lever = mesh(new THREE.CylinderGeometry(0.0022, 0.0028, leverLen, 16), MAT.chrome, 0, 0.004 + leverLen / 2, 0);
  lever.rotation.x = -0.35;
  lever.position.z = -Math.sin(0.35) * leverLen * 0.5;
  g.add(lever);
  g.add(mesh(new THREE.SphereGeometry(0.0028, 16, 12), MAT.chrome, 0, 0.004 + Math.cos(0.35) * leverLen, -Math.sin(0.35) * leverLen));
  return g;
}

/** Arceau de protection chromé (en U) des inverseurs SW. */
function guard(len = 0.03, h = 0.02): THREE.Group {
  const g = new THREE.Group();
  const r = 0.0022;
  g.add(mesh(new THREE.CylinderGeometry(r, r, h, 12), MAT.chrome, 0, h / 2, -len / 2));
  g.add(mesh(new THREE.CylinderGeometry(r, r, h, 12), MAT.chrome, 0, h / 2, len / 2));
  g.add(mesh(new THREE.CylinderGeometry(r, r, len, 12), MAT.chrome, 0, h, 0).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 12), MAT.rubber, 0, 0.001, -len / 2));
  g.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 12), MAT.rubber, 0, 0.001, len / 2));
  return g;
}

/** Potentiomètre RTY : bouton noir cannelé + arc lumineux imprimé. */
function rty(r = 0.011): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(r * 1.55, 0.0007, 8, 64, Math.PI * 1.6), MAT.ledRing, 0, 0.0004, 0).rotateX(Math.PI / 2).rotateZ(0.6));
  g.add(mesh(new THREE.TorusGeometry(r * 1.32, 0.0005, 8, 64, Math.PI * 1.2), MAT.ledRing, 0, 0.0004, 0).rotateX(Math.PI / 2).rotateZ(-0.4));
  g.add(cyl(r, r * 1.04, 0.012, MAT.plastic, 48));
  const ridged = cyl(r * 0.9, r * 0.9, 0.006, MAT.knurl, 36); ridged.position.y = 0.012; g.add(ridged);
  g.add(mesh(new THREE.BoxGeometry(0.001, 0.0008, r * 0.8), MAT.print, 0, 0.0155, r * 0.1));
  return g;
}

/** Bague lumineuse plate (sous un bouton). */
function litDisc(r: number): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(r, r, 0.0006, 40), MAT.led);
}

// ───────────────────────────── MANCHE ─────────────────────────────

export function buildStick(): THREE.Group {
  const root = new THREE.Group();
  root.name = "X56 Stick";

  // --- Socle : 19 × 21 cm, plateau noir, bande avant avec plaque X-56 ---
  const BW = 0.19, BD = 0.215, BH = 0.05;
  root.add(at(rbox(BW, BH, BD, 0.012, MAT.body), 0, BH / 2, 0));
  // plateau supérieur légèrement en retrait
  root.add(at(rbox(BW - 0.006, 0.003, BD - 0.006, 0.01, MAT.panel), 0, BH + 0.0015, 0));
  // bande avant (côté pilote) texturée + plaque aluminium "X-56"
  root.add(mesh(new THREE.BoxGeometry(BW - 0.008, 0.0025, 0.048), MAT.plastic, 0, BH + 0.0035, BD / 2 - 0.03));
  root.add(mesh(new THREE.BoxGeometry(0.105, 0.0012, 0.03), MAT.alu, 0, BH + 0.005, BD / 2 - 0.03));
  root.add(mesh(new THREE.BoxGeometry(0.06, 0.0006, 0.009), MAT.gunmetal, -0.006, BH + 0.0059, BD / 2 - 0.034));
  // boulons hexagonaux aux angles
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    root.add(mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 6), MAT.alu, sx * (BW / 2 - 0.013), BH + 0.0045, sz * (BD / 2 - 0.013)));
  });
  // cadran gradué : deux arcs de traits gris (45°–135° à droite, 225°–315° à gauche)
  const R1 = 0.068, R2 = 0.078;
  const arcs: [number, number][] = [[Math.PI * 0.2, Math.PI * 0.8], [Math.PI * 1.2, Math.PI * 1.8]];
  for (const [a0, a1] of arcs) {
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const long = i % 11 === 0;
      const len = long ? 0.014 : 0.008;
      const rr = long ? R1 - 0.003 : R1;
      const t = mesh(new THREE.BoxGeometry(0.0022, 0.0005, len), MAT.print, Math.sin(a) * (rr + len / 2), BH + 0.0035, Math.cos(a) * (rr + len / 2));
      t.rotation.y = a;
      root.add(t);
    }
    // arc fin extérieur
    const arcMesh = mesh(new THREE.RingGeometry(R2, R2 + 0.0012, 48, 1, a0 - Math.PI / 2, a1 - a0), MAT.print, 0, BH + 0.0036, 0);
    arcMesh.rotation.x = -Math.PI / 2; arcMesh.rotation.z = -Math.PI; arcMesh.scale.x = -1;
    root.add(arcMesh);
  }
  // cuvette du cardan : noir brillant, bague à fentes, colonne
  const GZ = -0.012;
  root.add(mesh(new THREE.CylinderGeometry(0.058, 0.052, 0.006, 64), MAT.gloss, 0, BH + 0.004, GZ));
  root.add(mesh(new THREE.TorusGeometry(0.046, 0.004, 12, 64), MAT.plastic, 0, BH + 0.008, GZ).rotateX(Math.PI / 2));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    root.add(mesh(new THREE.BoxGeometry(0.004, 0.003, 0.012), MAT.body, Math.cos(a) * 0.046, BH + 0.009, GZ + Math.sin(a) * 0.046).rotateY(-a + Math.PI / 2));
  }
  root.add(mesh(new THREE.SphereGeometry(0.03, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), MAT.rubber, 0, BH + 0.004, GZ));
  // colonne + soufflet nervuré + bague
  root.add(mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.05, 32), MAT.plastic, 0, BH + 0.03, GZ));
  for (let i = 0; i < 5; i++) root.add(mesh(new THREE.TorusGeometry(0.0165, 0.0022, 10, 40), MAT.rubber, 0, BH + 0.02 + i * 0.006, GZ).rotateX(Math.PI / 2));
  root.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 40), MAT.gunmetal, 0, BH + 0.055, GZ));

  // --- Poignée : repère local à la base de l'adaptateur de twist ---
  const grip = new THREE.Group();
  grip.position.set(0, BH + 0.058, GZ);
  root.add(grip);

  // adaptateur anguleux gris foncé avec bande "X-56"
  const adapter = chamferBox(0.046, 0.04, 0.05, 0.008, MAT.gunmetal);
  adapter.position.y = 0.02;
  grip.add(adapter);
  grip.add(mesh(new THREE.BoxGeometry(0.048, 0.016, 0.008), MAT.print, 0, 0.028, 0.024));
  // ancre Twist : l'adaptateur (axe de rotation du manche)
  grip.add(control("Twist", 0, 0.02, 0, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.042, 0.054), new THREE.MeshBasicMaterial({ visible: false }))));

  // corps de la poignée : profil (z, y) vu de côté, penché vers l'arrière, section 42 mm
  const body = profileX([
    [-0.026, 0.04], [0.026, 0.04],       // base
    [0.03, 0.08], [0.036, 0.13],          // dos (côté pilote) qui s'évase
    [0.034, 0.165],                        // épaule arrière
    [-0.022, 0.17],                        // épaule avant
    [-0.03, 0.125], [-0.03, 0.08],         // face avant droite
    [-0.027, 0.055],
  ], 0.042, MAT.body, 0.005);
  grip.add(body);
  // bossage arrière (repose-paume) côté pilote
  const palm = mesh(new THREE.SphereGeometry(0.022, 24, 16), MAT.body, 0, 0.1, 0.024);
  palm.scale.set(0.95, 1.6, 0.7);
  grip.add(palm);

  // --- Tête : bloc anguleux incliné vers le pilote (plateau face au pouce) ---
  const head = new THREE.Group();
  head.position.set(0, 0.185, 0.004);
  head.rotation.x = 0.62; // ~35° vers le pilote
  grip.add(head);
  const headBox = chamferBox(0.072, 0.05, 0.082, 0.012, MAT.body);
  head.add(headBox);
  // facettes texturées à l'avant de la tête (deux panneaux inclinés)
  head.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.002), MAT.plastic, -0.018, -0.004, -0.0415).rotateY(0.15));
  head.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.002), MAT.plastic, 0.018, -0.004, -0.0415).rotateY(-0.15));
  // plateau supérieur noir satiné et rétro-éclairage bleu diffus
  head.add(mesh(new THREE.BoxGeometry(0.066, 0.0015, 0.076), MAT.plastic, 0, 0.0255, 0));
  head.add(mesh(new THREE.BoxGeometry(0.06, 0.0004, 0.07), MAT.ledRing, 0, 0.0264, 0));
  head.add(mesh(new THREE.BoxGeometry(0.066, 0.0015, 0.076), MAT.panel, 0, 0.0266, 0));
  const TOP = 0.0275;

  // Commandes du plateau (vue pilote : POV grand aluminium à gauche-arrière, A petit à gauche-avant,
  // H1 noir à droite-avant, H2 noir à droite-arrière, Mode = molette crantée sur l'arête arrière)
  head.add(control("POV", -0.017, TOP, 0.008, povHat()));
  head.add(control("A", -0.013, TOP, -0.024, aluButton(0.0048, 0.0035)));
  head.add(control("H1", 0.017, TOP, -0.014, blackHat()));
  head.add(control("H2", 0.017, TOP, 0.016, blackHat()));
  const mode = control("Mode", 0.004, 0.02, 0.039, knurledKnob(0.0075, 0.006));
  mode.rotation.x = Math.PI / 2;
  head.add(mode);
  // B : bouton rond à collerette sur le flanc droit de la tête
  const b = control("B", 0.037, 0.006, 0.004, aluButton(0.0055, 0.004));
  b.rotation.z = -Math.PI / 2;
  head.add(b);
  // petit orifice décoratif sur le flanc droit
  head.add(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.002, 12), MAT.gloss, 0.037, 0.012, -0.018).rotateZ(Math.PI / 2));

  // --- Commandes de la poignée ---
  // Gâchette double détente (gris métal) à l'avant, hauteur index
  const trig = new THREE.Group();
  trig.add(mesh(new THREE.BoxGeometry(0.016, 0.046, 0.011), MAT.gunmetal, 0, -0.02, 0));
  trig.add(mesh(new THREE.BoxGeometry(0.014, 0.012, 0.009), MAT.alu, 0, -0.046, 0.002));
  trig.rotation.x = 0.18;
  grip.add(control("Trigger", 0, 0.14, -0.034, trig));
  // D : bouton rond à collerette sur le flanc gauche (pouce), à mi-hauteur
  const d = control("D", -0.0225, 0.118, 0.0, aluButton(0.005, 0.0035));
  d.rotation.z = Math.PI / 2;
  grip.add(d);
  // C Stick : mini-stick analogique sur une potence, flanc gauche bas de la poignée
  const cstick = new THREE.Group();
  cstick.add(mesh(new THREE.BoxGeometry(0.016, 0.024, 0.018), MAT.body, -0.006, 0, 0));
  cstick.add(mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, 16), MAT.gunmetal, -0.015, 0.005, 0).rotateZ(Math.PI / 2));
  const stalk = mesh(new THREE.CylinderGeometry(0.002, 0.0024, 0.024, 12), MAT.plastic, -0.026, 0.014, 0);
  stalk.rotation.z = 0.95;
  cstick.add(stalk);
  cstick.add(mesh(new THREE.CylinderGeometry(0.0055, 0.005, 0.007, 24), MAT.knurl, -0.036, 0.022, 0).rotateZ(0.95));
  grip.add(control("C Stick", -0.02, 0.068, -0.004, cstick));
  // Pinky : paddle gris plat à l'avant-bas, légèrement à gauche, + levier noir
  const pinky = new THREE.Group();
  const paddle = mesh(new THREE.BoxGeometry(0.02, 0.034, 0.004), MAT.gunmetal, 0, 0, 0);
  paddle.rotation.x = 0.25;
  pinky.add(paddle);
  const flying = mesh(new THREE.BoxGeometry(0.005, 0.026, 0.009), MAT.plastic, -0.02, -0.004, 0.006);
  flying.rotation.z = 0.55; flying.rotation.x = -0.3;
  pinky.add(flying);
  pinky.add(mesh(new THREE.SphereGeometry(0.0035, 10, 8), MAT.plastic, -0.03, 0.007, 0.004));
  grip.add(control("Pinky", -0.012, 0.06, -0.036, pinky));

  // Axes X/Y : ancre invisible sur le cardan
  root.add(control("X Axis", 0, BH + 0.03, GZ, new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ visible: false }))));

  return root;
}

// ───────────────────────── MANETTE DES GAZ ─────────────────────────

/**
 * Poignée de levier : coque lisse en forme de botte (comme la vraie poignée
 * du X56) = ellipsoïde allongé et incliné + talon arrondi à l'arrière + jupe
 * plate dessous. Nez vers l'avant (−Z), talon vers le pilote (+Z).
 */
function leverBody(width: number): THREE.Group {
  const g = new THREE.Group();
  // coque principale : ellipsoïde allongé, légèrement plus haut à l'arrière
  const hull = mesh(new THREE.SphereGeometry(1, 40, 28), MAT.body);
  hull.scale.set(width / 2, 0.034, 0.078);
  hull.position.set(0, 0.0, -0.004);
  hull.rotation.x = 0.08;
  g.add(hull);
  // talon arrière plus haut et arrondi (repose-paume)
  const heel = mesh(new THREE.SphereGeometry(1, 32, 24), MAT.body);
  heel.scale.set(width / 2 * 0.98, 0.04, 0.045);
  heel.position.set(0, 0.004, 0.036);
  g.add(heel);
  // nez avant plus fin et bas
  const nose = mesh(new THREE.SphereGeometry(1, 32, 24), MAT.body);
  nose.scale.set(width / 2 * 0.86, 0.026, 0.04);
  nose.position.set(0, -0.012, -0.055);
  g.add(nose);
  // jupe plate sous la coque (face inférieure où vivent les commandes pouce)
  const skirt = rbox(width * 0.96, 0.012, 0.13, 0.008, MAT.plastic);
  skirt.position.set(0, -0.03, -0.006);
  g.add(skirt);
  // ligne de joint de coque (rainure) et rangée de petits trous décoratifs
  g.add(mesh(new THREE.TorusGeometry(0.0, 0.0, 1, 1), MAT.body)); // placeholder inerte
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.001, 8), MAT.gloss, -width / 2 + 0.0005, 0.018 - i * 0.004, -0.04 + i * 0.022).rotateZ(Math.PI / 2));
  return g;
}

export function buildThrottle(): THREE.Group {
  const root = new THREE.Group();
  root.name = "X56 Throttle";

  // --- Socle : 29 × 23 cm ---
  const BW = 0.29, BD = 0.23, BH = 0.055;
  root.add(at(rbox(BW, BH, BD, 0.012, MAT.body), 0, BH / 2, 0));
  root.add(at(rbox(BW - 0.006, 0.003, BD - 0.006, 0.01, MAT.panel), 0, BH + 0.0015, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    root.add(mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 6), MAT.alu, sx * (BW / 2 - 0.013), BH + 0.0045, sz * (BD / 2 - 0.013)));
  });
  const T = BH + 0.003; // niveau du plateau

  // panneaux surélevés : colonne gauche (MODE + SW), bloc central (rails), colonne droite (RTY + TGL)
  root.add(mesh(new THREE.BoxGeometry(0.085, 0.003, 0.2), MAT.body, -0.098, T + 0.0015, 0));
  root.add(mesh(new THREE.BoxGeometry(0.085, 0.003, 0.2), MAT.body, 0.098, T + 0.0015, 0));
  root.add(mesh(new THREE.BoxGeometry(0.1, 0.003, 0.05), MAT.body, 0, T + 0.0015, 0.085));
  // bloc central des rails : boîtier en relief avec deux fentes courbes et échelles lumineuses
  const rails = rbox(0.1, 0.018, 0.15, 0.008, MAT.body);
  rails.position.set(0, T + 0.009, -0.025);
  root.add(rails);
  for (const lx of [-0.024, 0.024]) {
    root.add(mesh(new THREE.BoxGeometry(0.012, 0.004, 0.13), MAT.gloss, lx, T + 0.018, -0.025));
    // échelle lumineuse (petits traits) le long de la fente
    for (let i = 0; i < 14; i++) {
      const w = i % 7 === 0 ? 0.006 : 0.003;
      root.add(mesh(new THREE.BoxGeometry(w, 0.0004, 0.0008), MAT.led, lx + (lx < 0 ? -0.0105 : 0.0105), T + 0.0185, -0.08 + i * 0.0085));
    }
    root.add(mesh(new THREE.BoxGeometry(0.0008, 0.0004, 0.115), MAT.ledRing, lx + (lx < 0 ? -0.0085 : 0.0085), T + 0.0185, -0.025));
  }
  // bande décorative grise à rayures à l'avant du bloc central
  root.add(mesh(new THREE.BoxGeometry(0.1, 0.0006, 0.016), MAT.print, -0.01, T + 0.0035, 0.072));
  for (let i = 0; i < 6; i++) root.add(mesh(new THREE.BoxGeometry(0.004, 0.0008, 0.011), MAT.body, -0.03 + i * 0.009, T + 0.0038, 0.072).rotateY(0.35));
  // molette de friction noire sur le flanc droit
  root.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 40), MAT.knurl, BW / 2 + 0.003, BH - 0.012, -0.02).rotateZ(Math.PI / 2));

  // --- Colonne gauche : MODE (sélecteur rotatif à levier) et inverseurs SW 1–6 ---
  const modeG = new THREE.Group();
  modeG.add(mesh(new THREE.TorusGeometry(0.014, 0.0012, 8, 48, Math.PI * 0.9), MAT.ledRing, 0, 0.0005, 0).rotateX(Math.PI / 2).rotateZ(-1.2));
  modeG.add(cyl(0.012, 0.013, 0.006, MAT.plastic, 32));
  const tri = new THREE.Shape(); tri.moveTo(-0.009, -0.008); tri.lineTo(0.009, -0.008); tri.lineTo(0, 0.012); tri.closePath();
  const pointer = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.009, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2 }), MAT.plastic);
  pointer.rotation.x = -Math.PI / 2; pointer.rotation.z = -0.6; pointer.position.y = 0.006;
  modeG.add(pointer);
  root.add(control("Mode", -0.128, T + 0.003, 0.04, modeG));
  // trois inverseurs 3 positions (SW 1/2, SW 3/4, SW 5/6) avec quatre arceaux chromés
  const swX = [-0.118, -0.094, -0.07];
  const swZ = 0.078;
  swX.forEach((x, i) => {
    const g = new THREE.Group();
    g.add(litDisc(0.0085));
    g.add(toggle(0.015, false));
    root.add(control(`SW ${i * 2 + 1}`, x, T + 0.003, swZ, g));
  });
  [-0.13, -0.106, -0.082, -0.058].forEach((x) => root.add(at(guard(0.03, 0.02), x, T + 0.003, swZ)));

  // --- Colonne droite : RTY 3, RTY 4, TGL 1–4 ---
  root.add(control("Rotary 3", 0.078, T + 0.003, 0.055, rty()));
  root.add(control("Rotary 4", 0.052, T + 0.003, 0.08, rty()));
  const tgl: [string, number, number][] = [["TGL 1 Up", 0.092, 0.03], ["TGL 2 Up", 0.117, 0.012], ["TGL 3 Up", 0.1, -0.02], ["TGL 4 Up", 0.125, -0.04]];
  tgl.forEach(([n, x, z]) => root.add(control(n, x, T + 0.003, z, toggle(0.017, true))));

  // --- Leviers : pivot à l'arrière, inclinés vers l'avant ---
  const pivot = new THREE.Group();
  pivot.position.set(0, T + 0.02, 0.035);
  pivot.rotation.x = -0.28;
  root.add(pivot);

  // bras fins qui sortent des fentes
  const makeLever = (x: number, width: number): THREE.Group => {
    const L = new THREE.Group();
    L.position.x = x;
    L.add(mesh(new THREE.BoxGeometry(0.012, 0.075, 0.022), MAT.plastic, 0, 0.037, 0));
    L.add(mesh(new THREE.BoxGeometry(0.016, 0.01, 0.028), MAT.gunmetal, 0, 0.078, 0));
    const bodyG = new THREE.Group();
    bodyG.position.set(0, 0.11, -0.005);
    bodyG.rotation.x = 0.1;
    bodyG.add(leverBody(width));
    L.add(bodyG);
    L.userData.body = bodyG;
    pivot.add(L);
    return L;
  };
  const left = makeLever(-0.03, 0.052);
  const right = makeLever(0.03, 0.044);
  const lb = left.userData.body as THREE.Group;
  const rb = right.userData.body as THREE.Group;

  // Ancres des axes de gaz : les corps des leviers
  lb.add(control("Left Throttle", 0, 0, 0, new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.07, 0.155), new THREE.MeshBasicMaterial({ visible: false }))));
  rb.add(control("Right Throttle", 0, 0, 0, new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.07, 0.155), new THREE.MeshBasicMaterial({ visible: false }))));

  // Capuchon décoratif du levier droit (grande molette alu avec bague)
  rb.add(at(knurledKnob(0.018, 0.014, MAT.knurl), 0, 0.04, 0.045));
  rb.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.003, 48), MAT.alu, 0, 0.0325, 0.045));

  // Levier gauche : F (molette alu sur le dessus arrière, poussoir), G (molette sous l'avant-extérieur, éclairée),
  // SLD (curseur strié sur le flanc extérieur), E (bouton carré), H et I (boutons ronds), K1 (bascule),
  // Scroll (molette à l'extrémité arrière), mini-stick souris, hats H3 / H4 (aluminium)
  const F = control("F Push", 0, 0.04, 0.045, knurledKnob(0.019, 0.015));
  lb.add(F);
  lb.add(mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.003, 48), MAT.alu, 0, 0.0325, 0.045));
  const G = control("G Push", -0.022, -0.03, -0.05, knurledKnob(0.014, 0.011, MAT.aluLit));
  G.rotation.z = Math.PI; // molette tête en bas sous le corps
  lb.add(G);
  const sld = control("SLD", -0.0295, 0.004, -0.02,
    mesh(new THREE.BoxGeometry(0.007, 0.01, 0.022), MAT.alu),
    ...[-0.006, -0.002, 0.002, 0.006].map((z) => mesh(new THREE.BoxGeometry(0.0075, 0.0105, 0.0012), MAT.gunmetal, 0, 0, z)));
  lb.add(sld);
  const e = control("E", -0.012, -0.02, -0.062, mesh(new THREE.BoxGeometry(0.011, 0.011, 0.003), MAT.alu), mesh(new THREE.BoxGeometry(0.0085, 0.0085, 0.0015), MAT.gunmetal, 0, 0, -0.0022));
  lb.add(e);
  const h = control("H", -0.027, 0.0, 0.0, aluButton(0.0055, 0.004)); h.rotation.z = Math.PI / 2; lb.add(h);
  const i = control("I", -0.027, 0.0, 0.016, aluButton(0.0055, 0.004)); i.rotation.z = Math.PI / 2; lb.add(i);
  const k1 = control("K1 Up", -0.0285, 0.004, 0.04,
    mesh(new THREE.BoxGeometry(0.006, 0.014, 0.016), MAT.gloss),
    mesh(new THREE.BoxGeometry(0.006, 0.009, 0.011), MAT.plastic, -0.003, 0, 0));
  lb.add(k1);
  const scroll = control("Scroll FWD", -0.016, 0.006, 0.081, knurledKnob(0.009, 0.006));
  scroll.rotation.z = Math.PI / 2;
  lb.add(scroll);
  // zone pouce avant-bas : mini-stick + deux hats alu
  const ms = new THREE.Group();
  ms.add(cyl(0.005, 0.005, 0.003, MAT.gunmetal, 16));
  ms.add(mesh(new THREE.CylinderGeometry(0.0018, 0.002, 0.012, 10), MAT.plastic, 0, 0.0075, 0));
  ms.add(mesh(new THREE.CylinderGeometry(0.0045, 0.004, 0.006, 20), MAT.knurl, 0, 0.0155, 0));
  const msC = control("Mouse Ministick", 0.004, -0.03, -0.066, ms);
  msC.rotation.x = -1.2;
  lb.add(msC);
  const hat = () => { const g = new THREE.Group(); g.add(cyl(0.006, 0.0065, 0.004, MAT.alu, 24)); g.add(mesh(new THREE.SphereGeometry(0.0045, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.alu, 0, 0.004, 0)); g.add(mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.001, 8), MAT.gunmetal, 0, 0.0082, 0)); return g; };
  const h3 = control("H3", 0.016, -0.026, -0.058, hat()); h3.rotation.x = -1.1; lb.add(h3);
  const h4 = control("H4", 0.014, -0.012, -0.07, hat()); h4.rotation.x = -1.4; lb.add(h4);

  return root;
}

/**
 * Nom de commande du profil .pr0 → nom de l'ancre dans le modèle.
 * Les paires (TGL n Up / Down, K1 Up / Down, Scroll FWD / BCK), les
 * inverseurs 3 positions (SW 1/2, 3/4, 5/6), les familles Mode 1/2/3 et les
 * molettes à poussoir (Rotary 1 = F, Rotary 2 = G) partagent une ancre.
 */
export function anchorNameFor(controlName: string): string {
  const n = controlName.trim();
  let m: RegExpExecArray | null;
  if ((m = /^TGL (\d) (Up|Down)$/i.exec(n))) return `TGL ${m[1]} Up`;
  if (/^K1 (Up|Down)$/i.test(n)) return "K1 Up";
  if (/^Scroll (FWD|BCK)$/i.test(n)) return "Scroll FWD";
  if ((m = /^SW (\d)$/i.exec(n))) { const k = Number(m[1]); return `SW ${k % 2 === 0 ? k - 1 : k}`; }
  if (/^Mode( \d)?$/i.test(n)) return "Mode";
  if (/^(X|Y) Axis$/i.test(n)) return "X Axis";
  if (/^C Stick/i.test(n)) return "C Stick";
  if (/^Mouse/i.test(n)) return "Mouse Ministick";
  if (/^Rotary 1$/i.test(n)) return "F Push";
  if (/^Rotary 2$/i.test(n)) return "G Push";
  return n;
}

/** Libellé imprimé affiché près de chaque ancre (comme les marquages du X56). */
export const ANCHOR_LABELS: Record<string, string> = {
  Trigger: "TRIGGER", A: "A", B: "B", D: "D", Pinky: "PINKY", H1: "H1", H2: "H2", POV: "POV", "C Stick": "C", Mode: "MODE", Twist: "TWIST", "X Axis": "X / Y",
  E: "E", "F Push": "F", "G Push": "G", H: "H", I: "I", "SW 1": "SW 1·2", "SW 3": "SW 3·4", "SW 5": "SW 5·6",
  "TGL 1 Up": "TGL 1", "TGL 2 Up": "TGL 2", "TGL 3 Up": "TGL 3", "TGL 4 Up": "TGL 4", H3: "H3", H4: "H4", "K1 Up": "K1", "Scroll FWD": "SCROLL",
  "Mouse Ministick": "MINI", SLD: "SLD", "Left Throttle": "GAZ G", "Right Throttle": "GAZ D", "Rotary 3": "RTY 3", "Rotary 4": "RTY 4",
};

/** Choisit le modèle à partir du nom d'appareil du profil ("Stick", "Throttle"). */
export function buildDeviceModel(deviceName: string): THREE.Group | null {
  if (/stick|joystick|manche/i.test(deviceName)) return buildStick();
  if (/throttle|gaz/i.test(deviceName)) return buildThrottle();
  return null;
}

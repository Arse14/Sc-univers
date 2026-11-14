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
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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

/** Marquage imprimé rétro-éclairé (texte à plat, lisible depuis le pilote). */
/** Variante Saitek en cours de construction : le X-55 et le X-65F reprennent les volumes du X56 avec leurs marquages jaunes. */
export type SaitekVariant = "x56" | "x55" | "x65f";
let VAR: SaitekVariant = "x56";
const BLUE_INK = new Set(["#59d0ff", "#9fd8ff", "#bfe6ff", "#7dff9a"]);
const YELLOW_INK = "#ecd53a";
function variantText(text: string): string {
  if (VAR === "x56") return text;
  if (text === "X-56") return VAR === "x55" ? "X-55" : "X65F";
  if (text === "ADVANCED CONTROL FLIGHT SYSTEM") return VAR === "x55" ? "RHINO H.O.T.A.S. SYSTEM" : "PRO FLIGHT CONTROL SYSTEM";
  if (text === "RTY 3") return "RTY 1";
  if (text === "RTY 4") return "RTY 2";
  return text;
}

function decal(text: string, height: number, color = "#59d0ff"): THREE.Mesh {
  if (VAR !== "x56") { text = variantText(text); if (BLUE_INK.has(color)) color = YELLOW_INK; }
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  const px = 44;
  const font = `700 ${px}px 'Titillium Web', 'Segoe UI', Arial, sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 8;
  c.width = w; c.height = px + 10;
  const ctx = c.getContext("2d")!;
  ctx.font = font; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = color;
  ctx.fillText(text, 4, c.height / 2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry((height * c.width) / c.height, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  m.name = "decal:" + text;
  return m;
}

/** Arc lumineux segmenté à plat (anneaux des inverseurs et des potentiomètres). */
function litArc(r: number, tube: number, start: number, len: number, mat: THREE.Material = MAT.ledRing): THREE.Mesh {
  const t = mesh(new THREE.TorusGeometry(r, tube, 6, 40, len), mat);
  t.rotation.x = Math.PI / 2; t.rotation.z = start;
  t.castShadow = false;
  return t;
}

/**
 * Volume lissé par sections empilées (« loft ») : chaque section est une
 * super-ellipse (rx en X, rz en Z, exposant n : 2 = ovale, 5 = presque carré)
 * centrée en (0, y, cz). Sert à la poignée et à la tête du manche.
 */
function loft(sections: { y: number; rx: number; rz: number; cz?: number; n?: number }[], mat: THREE.Material, seg = 44): THREE.Mesh {
  const pos: number[] = []; const idx: number[] = [];
  for (const s of sections) {
    const e = 2 / (s.n ?? 2.4);
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * Math.PI * 2; const c = Math.cos(t), sn = Math.sin(t);
      pos.push(s.rx * Math.sign(c) * Math.pow(Math.abs(c), e), s.y, (s.cz ?? 0) + s.rz * Math.sign(sn) * Math.pow(Math.abs(sn), e));
    }
  }
  const rings = sections.length;
  for (let r = 0; r < rings - 1; r++) for (let i = 0; i < seg; i++) {
    const a = r * seg + i, b2 = r * seg + ((i + 1) % seg), c = a + seg, d = b2 + seg;
    idx.push(a, c, b2, b2, c, d);
  }
  // bouchons
  const bot = pos.length / 3; pos.push(0, sections[0].y, sections[0].cz ?? 0);
  const top = bot + 1; const last = sections[rings - 1]; pos.push(0, last.y, last.cz ?? 0);
  for (let i = 0; i < seg; i++) { idx.push(bot, i, (i + 1) % seg); idx.push(top, (rings - 1) * seg + ((i + 1) % seg), (rings - 1) * seg + i); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return mesh(geo, mat);
}

// ───────────────────────────── MANCHE ─────────────────────────────
//
// Reconstruit d'après les photos (dessus, face, dos, profils). Pilote côté +Z.
//  - socle carré, bandeau texturé côté pilote avec la plaque aluminium X-56,
//    deux secteurs gradués (90° à droite, 270° à gauche), boulons aux angles ;
//  - cardan : cuvette noire brillante nervurée, ressort apparent, collier ;
//  - repose-main réglable : plateau gris en coin, côté pilote ;
//  - poignée penchée vers l'avant, renflement côté paume, bague grise « X-56 » ;
//  - tête large et anguleuse dont le plateau regarde le pilote : grand hat
//    POV aluminium à gauche, bouton A au-dessus, hats noirs H1 / H2 à droite,
//    plateau translucide rétro-éclairé ; bouton B sur le flanc droit ;
//  - à l'avant : capot à facettes, gâchette grise, levier d'auriculaire ;
//  - flanc gauche : bouton D et mini-stick C sur sa potence.

export function buildStick(): THREE.Group {
  const root = new THREE.Group();
  root.name = "X56 Stick";

  // ───── Socle ─────
  const BW = 0.19, BD = 0.212, BH = 0.046;
  root.add(at(rbox(BW, BH - 0.01, BD, 0.012, MAT.body), 0, (BH - 0.01) / 2, 0));
  root.add(at(rbox(BW - 0.004, 0.01, BD - 0.004, 0.011, MAT.plastic), 0, BH - 0.005, 0));
  const T = BH;
  // bandeau côté pilote : surface texturée + plaque aluminium gravée
  const bandZ = BD / 2 - 0.029;
  root.add(at(rbox(BW - 0.012, 0.0022, 0.05, 0.004, MAT.rubber), 0, T + 0.0011, bandZ));
  root.add(at(rbox(0.118, 0.0016, 0.034, 0.002, MAT.alu), 0, T + 0.003, bandZ));
  root.add(at(decal("X-56", 0.017, "#6d747c"), -0.012, T + 0.0041, bandZ - 0.004));
  root.add(at(decal("ADVANCED CONTROL FLIGHT SYSTEM", 0.0034, "#7b828a"), -0.004, T + 0.0041, bandZ + 0.009));
  // rainure entre plateau et bandeau
  root.add(mesh(new THREE.BoxGeometry(BW - 0.01, 0.0008, 0.0016), MAT.gloss, 0, T + 0.0003, bandZ - 0.0265));
  // boulons hexagonaux + rondelles
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const x = sx * (BW / 2 - 0.011), z = sz * (BD / 2 - 0.011);
    root.add(mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.001, 24), MAT.alu, x, T + (sz > 0 ? 0.0027 : 0.0005), z));
    root.add(mesh(new THREE.CylinderGeometry(0.0043, 0.0043, 0.0035, 6), MAT.alu, x, T + (sz > 0 ? 0.0049 : 0.0027), z));
  });
  // patins sous le socle
  for (const sx of [-1, 1]) root.add(mesh(new THREE.BoxGeometry(0.03, 0.004, 0.012), MAT.rubber, sx * 0.05, -0.002, BD / 2 - 0.01));

  // secteurs gradués : barres radiales grises, plus longues aux extrémités et au centre
  const GZ = -0.016; // centre du cardan
  const R0 = 0.062;
  for (const [a0, a1, mid] of [[Math.PI * 0.22, Math.PI * 0.78, "90°"], [Math.PI * 1.22, Math.PI * 1.78, "270°"]] as [number, number, string][]) {
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const edge = i === 0 || i === n;
      const len = edge ? 0.019 : 0.0125;
      const t = mesh(new THREE.BoxGeometry(0.0026, 0.0005, len), MAT.print, Math.sin(a) * (R0 + len / 2), T + 0.0003, GZ + Math.cos(a) * (R0 + len / 2));
      t.rotation.y = a; t.castShadow = false;
      root.add(t);
    }
    const am = (a0 + a1) / 2;
    root.add(at(decal(mid, 0.0042, "#aab0b6"), Math.sin(am) * (R0 + 0.019), T + 0.0004, GZ + Math.cos(am) * (R0 + 0.019)));
  }

  // ───── Cardan : cuvette brillante nervurée, ressort, collier ─────
  root.add(mesh(new THREE.CylinderGeometry(0.053, 0.056, 0.004, 64), MAT.gloss, 0, T + 0.002, GZ));
  for (const [r, tube] of [[0.047, 0.0028], [0.039, 0.0016], [0.033, 0.0016]] as [number, number][]) root.add(mesh(new THREE.TorusGeometry(r, tube, 10, 64), MAT.gloss, 0, T + 0.0045, GZ).rotateX(Math.PI / 2));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    root.add(mesh(new THREE.BoxGeometry(0.014, 0.0012, 0.005), MAT.rubber, Math.cos(a) * 0.0425, T + 0.0052, GZ + Math.sin(a) * 0.0425).rotateY(-a + Math.PI / 2));
  }
  root.add(mesh(new THREE.SphereGeometry(0.026, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), MAT.gloss, 0, T + 0.003, GZ));
  // ressort apparent
  const coil: THREE.Vector3[] = [];
  for (let i = 0; i <= 120; i++) { const t = i / 120; const a = t * Math.PI * 2 * 5.5; coil.push(new THREE.Vector3(Math.cos(a) * 0.0155, T + 0.018 + t * 0.026, GZ + Math.sin(a) * 0.0155)); }
  root.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 240, 0.0016, 8, false), MAT.gunmetal));
  root.add(mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.034, 24), MAT.plastic, 0, T + 0.03, GZ));
  root.add(mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.005, 40), MAT.plastic, 0, T + 0.0465, GZ));

  // ───── Poignée (repère local au-dessus du collier), penchée vers l'avant ─────
  const LEAN = 0.15;
  const grip = new THREE.Group();
  grip.position.set(0, T + 0.049, GZ);
  grip.rotation.x = -LEAN;
  root.add(grip);

  // collier de serrage + repose-main en coin côté pilote
  grip.add(at(chamferBox(0.05, 0.012, 0.052, 0.01, MAT.plastic), 0, 0.006, 0));
  const restShape = new THREE.Shape();
  restShape.moveTo(-0.02, 0); restShape.lineTo(0.02, 0); restShape.lineTo(0.036, 0.05); restShape.lineTo(0.03, 0.062); restShape.lineTo(-0.03, 0.062); restShape.lineTo(-0.036, 0.05); restShape.closePath();
  const restGeo = new THREE.ExtrudeGeometry(restShape, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2 });
  restGeo.rotateX(Math.PI / 2); // la forme (x, y) passe dans le plan (x, z), épaisseur vers −Y
  const rest = mesh(restGeo, MAT.gunmetal);
  rest.position.set(0, 0.013, 0.022); rest.rotation.x = LEAN + 0.1;
  grip.add(rest);
  const lip = mesh(new THREE.BoxGeometry(0.058, 0.007, 0.004), MAT.gunmetal, 0, 0.0085, 0.082); lip.rotation.x = LEAN + 0.1; grip.add(lip);
  // molette de blocage du repose-main, côté gauche
  grip.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 12), MAT.plastic, -0.031, 0.008, 0.004).rotateZ(Math.PI / 2));

  // bague de twist grise, bandes latérales « X-56 »
  grip.add(loft([{ y: 0.012, rx: 0.0235, rz: 0.0255, n: 3.2 }, { y: 0.03, rx: 0.0232, rz: 0.0252, n: 3.2 }, { y: 0.046, rx: 0.0222, rz: 0.0244, n: 3 }], MAT.gunmetal));
  for (const sx of [-1, 1]) {
    grip.add(mesh(new THREE.BoxGeometry(0.0008, 0.03, 0.018), MAT.print, sx * 0.0236, 0.03, 0.002));
    const tx = decal("X-56", 0.0085, "#3a4047"); tx.rotation.set(0, sx * Math.PI / 2, sx * Math.PI / 2); tx.position.set(sx * 0.0242, 0.03, 0.002); grip.add(tx);
  }
  grip.add(control("Twist", 0, 0.03, 0, new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.036, 16), new THREE.MeshBasicMaterial({ visible: false }))));

  // corps : manche caoutchouté, renflement côté paume (+Z), col qui s'évase vers la tête
  grip.add(loft([
    { y: 0.044, rx: 0.0212, rz: 0.0235, cz: 0.0, n: 2.8 },
    { y: 0.064, rx: 0.0208, rz: 0.0232, cz: 0.001, n: 2.6 },
    { y: 0.086, rx: 0.0212, rz: 0.0252, cz: 0.003, n: 2.5 },
    { y: 0.108, rx: 0.022, rz: 0.027, cz: 0.005, n: 2.5 },
    { y: 0.128, rx: 0.0222, rz: 0.0262, cz: 0.004, n: 2.6 },
    { y: 0.146, rx: 0.0235, rz: 0.0255, cz: 0.003, n: 2.8 },
    { y: 0.16, rx: 0.0275, rz: 0.028, cz: 0.004, n: 3.2 },
    { y: 0.172, rx: 0.033, rz: 0.032, cz: 0.006, n: 3.6 },
  ], MAT.body));
  // ligne de joint des deux demi-coques
  grip.add(mesh(new THREE.BoxGeometry(0.0008, 0.1, 0.001), MAT.gloss, 0, 0.1, 0.0318));

  // ───── Tête : large, anguleuse, plateau tourné vers le pilote ─────
  const head = new THREE.Group();
  head.position.set(0, 0.186, 0.004);
  head.rotation.x = LEAN + 0.6;
  grip.add(head);
  head.add(loft([
    { y: -0.03, rx: 0.034, rz: 0.035, cz: 0.003, n: 4 },
    { y: -0.02, rx: 0.0395, rz: 0.042, cz: 0.001, n: 4.6 },
    { y: 0.004, rx: 0.0415, rz: 0.0445, cz: 0, n: 5 },
    { y: 0.018, rx: 0.041, rz: 0.044, cz: 0, n: 5 },
    { y: 0.0225, rx: 0.039, rz: 0.042, cz: 0, n: 5 },
  ], MAT.body));
  // capot avant à facettes (deux panneaux texturés en V) + arête centrale
  for (const sx of [-1, 1]) {
    const pan = mesh(new THREE.BoxGeometry(0.036, 0.034, 0.004), MAT.rubber, sx * 0.0185, -0.002, -0.0445);
    pan.rotation.y = -sx * 0.2; pan.rotation.x = -0.12; head.add(pan);
  }
  head.add(mesh(new THREE.BoxGeometry(0.004, 0.038, 0.006), MAT.plastic, 0, -0.001, -0.0475).rotateX(-0.12));
  head.add(at(rbox(0.07, 0.006, 0.012, 0.003, MAT.plastic), 0, 0.019, -0.043));
  // plateau : cerclage noir, dalle translucide rétro-éclairée
  head.add(at(rbox(0.076, 0.002, 0.082, 0.012, MAT.plastic), 0, 0.0232, 0));
  const glow = VAR === "x56"
    ? new THREE.MeshStandardMaterial({ color: 0x0a1c30, emissive: 0x0f4f9a, emissiveIntensity: 0.32, roughness: 0.22, metalness: 0.35 })
    : new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.5, metalness: 0.2 });   // X-55 / X-65F : dalle noire, non éclairée
  head.add(at(rbox(0.07, 0.0012, 0.076, 0.01, glow), 0, 0.0246, 0));
  const TOP = 0.0252;
  // séparation en biais entre la moitié POV et la moitié hats + repère « ADV »
  head.add(mesh(new THREE.BoxGeometry(0.0009, 0.0006, 0.07), MAT.gloss, 0.001, TOP, 0).rotateY(0.1));
  head.add(at(decal("▲ADV", 0.0036, "#9fd8ff"), -0.004, TOP + 0.0003, 0.031));

  // POV : grande coupelle aluminium à gauche (côté pilote), vis centrale
  const pov = new THREE.Group();
  pov.add(cyl(0.0165, 0.0172, 0.003, MAT.plastic, 48));
  pov.add(mesh(new THREE.CylinderGeometry(0.015, 0.0158, 0.007, 48), MAT.alu, 0, 0.005, 0));
  pov.add(mesh(new THREE.CylinderGeometry(0.0118, 0.0148, 0.0035, 48), MAT.alu, 0, 0.0102, 0));
  pov.add(mesh(new THREE.TorusGeometry(0.0118, 0.0009, 8, 48), MAT.chrome, 0, 0.012, 0).rotateX(Math.PI / 2));
  pov.add(mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0012, 6), MAT.gunmetal, 0, 0.0124, 0));
  head.add(control("POV", -0.0185, TOP, 0.008, pov));
  // A : petit bouton rond en haut à gauche
  const aB = new THREE.Group();
  aB.add(cyl(0.0068, 0.0072, 0.002, MAT.gloss, 28)); aB.add(mesh(new THREE.CylinderGeometry(0.005, 0.0054, 0.0035, 24), MAT.plastic, 0, 0.0027, 0));
  aB.add(at(litArc(0.0061, 0.0005, 0, Math.PI * 2, MAT.led), 0, 0.0021, 0));
  head.add(control("A", -0.0135, TOP, -0.026, aB));
  head.add(at(decal("A", 0.0038, "#bfe6ff"), -0.0135, TOP + 0.0048, -0.026));
  // H1 (haut) et H2 (bas) : hats noirs crénelés, à droite
  head.add(control("H1", 0.0185, TOP, -0.017, blackHat(0.0112)));
  head.add(control("H2", 0.0185, TOP, 0.017, blackHat(0.0112)));
  head.add(at(decal("H1", 0.0034, "#bfe6ff"), 0.0345, TOP + 0.0003, -0.017));
  head.add(at(decal("H2", 0.0034, "#bfe6ff"), 0.0345, TOP + 0.0003, 0.017));
  // B : bouton rond sur le flanc droit de la tête
  const bB = new THREE.Group();
  bB.add(cyl(0.0078, 0.0082, 0.0018, MAT.gloss, 28)); bB.add(mesh(new THREE.CylinderGeometry(0.0058, 0.0062, 0.0038, 24), MAT.plastic, 0, 0.0028, 0));
  bB.add(at(litArc(0.0069, 0.0005, 0, Math.PI * 2, MAT.led), 0, 0.002, 0));
  const b = control("B", 0.0408, 0.002, 0.012, bB); b.rotation.z = -Math.PI / 2; head.add(b);
  for (const z of [-0.012, -0.022]) head.add(mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.001, 10), MAT.gloss, 0.0412, 0.004, z).rotateZ(Math.PI / 2));

  // ───── Commandes de la poignée ─────
  // gâchette : longue lame grise articulée sous le capot avant
  const trig = new THREE.Group();
  trig.add(mesh(new THREE.BoxGeometry(0.0125, 0.012, 0.016), MAT.plastic, 0, 0.004, 0.004));
  const blade = mesh(new THREE.BoxGeometry(0.0135, 0.05, 0.0065), MAT.gunmetal, 0, -0.024, -0.002); blade.rotation.x = 0.1; trig.add(blade);
  const tip = mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0135, 16), MAT.gunmetal, 0, -0.049, -0.0045); tip.rotation.z = Math.PI / 2; trig.add(tip);
  grip.add(control("Trigger", 0, 0.156, -0.0275, trig));
  // D : bouton rond du flanc gauche, sous la tête
  const dB = new THREE.Group();
  dB.add(cyl(0.0066, 0.007, 0.0018, MAT.gloss, 24)); dB.add(mesh(new THREE.CylinderGeometry(0.0048, 0.0052, 0.0036, 24), MAT.plastic, 0, 0.0027, 0));
  const d = control("D", -0.0228, 0.126, 0.006, dB); d.rotation.z = Math.PI / 2; grip.add(d);
  // C : mini-stick sur potence, flanc gauche à mi-hauteur
  const cs = new THREE.Group();
  cs.add(mesh(new THREE.BoxGeometry(0.012, 0.02, 0.016), MAT.plastic, -0.004, 0, 0));
  const stalk = mesh(new THREE.CylinderGeometry(0.0021, 0.0026, 0.02, 12), MAT.plastic, -0.016, 0.008, 0); stalk.rotation.z = 0.95; cs.add(stalk);
  const capG = new THREE.Group(); capG.position.set(-0.0245, 0.014, 0); capG.rotation.z = 0.95;
  capG.add(cyl(0.0058, 0.0052, 0.006, MAT.rubber, 12)); capG.add(mesh(new THREE.CylinderGeometry(0.0038, 0.0058, 0.0016, 12), MAT.plastic, 0, 0.0038, 0));
  cs.add(capG);
  grip.add(control("C Stick", -0.0205, 0.092, -0.002, cs));
  grip.add((() => { const t = decal("C", 0.0036, "#aab0b6"); t.rotation.set(0, -Math.PI / 2, 0); t.position.set(-0.0222, 0.076, 0.004); return t; })());
  // auriculaire : palette + levier courbe à l'avant-bas
  const pinky = new THREE.Group();
  const paddle = mesh(new THREE.BoxGeometry(0.018, 0.03, 0.0045), MAT.gunmetal); paddle.rotation.x = 0.2; pinky.add(paddle);
  const lever = new THREE.CatmullRomCurve3([new THREE.Vector3(0.006, -0.012, -0.002), new THREE.Vector3(0.011, -0.022, -0.008), new THREE.Vector3(0.0135, -0.03, -0.019), new THREE.Vector3(0.014, -0.034, -0.03)]);
  pinky.add(mesh(new THREE.TubeGeometry(lever, 20, 0.0036, 10, false), MAT.plastic));
  pinky.add(mesh(new THREE.SphereGeometry(0.0046, 14, 10), MAT.plastic, 0.014, -0.034, -0.03));
  grip.add(control("Pinky", 0, 0.078, -0.0265, pinky));

  // ancres sans pièce propre : axes X/Y (cardan) et sélecteur de mode (commun avec la manette des gaz)
  root.add(control("X Axis", 0, T + 0.03, GZ, new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ visible: false }))));
  root.add(control("Mode", 0.07, T + 0.004, bandZ, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.02), new THREE.MeshBasicMaterial({ visible: false }))));

  return root;
}

// ───────────────────────── MANETTE DES GAZ ─────────────────────────
//
// Reconstruite d'après les photos de l'appareil (vues de dessus, de trois
// quarts, de profil et de dos). Disposition réelle, pilote côté +Z :
//  - socle 19 × 23,5 cm, plus profond que large, boulons hexagonaux aux angles ;
//  - bandeau avant : sélecteur MODE à gauche, puis SW 1·2, 3·4, 5·6 séparés
//    par quatre arceaux chromés ;
//  - colonne droite, du pilote vers le fond : RTY 4, RTY 3, TGL 1 à TGL 4 en
//    quinconce ;
//  - carter des leviers en rampe sur les trois quarts gauches, deux fentes
//    avec échelles lumineuses, molette de friction sur le flanc GAUCHE ;
//  - poignée transversale en deux moitiés ; à son extrémité droite le bloc
//    pouce (F dessus, G dessous, SLD, E, mini-stick, H3, H4) ; sur la face
//    avant (doigts) H et I à droite, K1 et la molette de défilement à gauche.

/** Inverseur à levier chromé, double anneau lumineux, incliné de `tilt` rad vers l'avant. */
function toggleSwitch(leverLen: number, tilt: number): THREE.Group {
  const g = new THREE.Group();
  g.add(at(litArc(0.0082, 0.00055, 0.3, Math.PI * 1.55), 0, 0.0005, 0));
  g.add(at(litArc(0.0106, 0.0005, 3.5, Math.PI * 1.1), 0, 0.0005, 0));
  g.add(cyl(0.0042, 0.0048, 0.0028, MAT.gunmetal, 6));
  g.add(mesh(new THREE.CylinderGeometry(0.003, 0.0034, 0.002, 20), MAT.chrome, 0, 0.0024, 0));
  const arm = new THREE.Group();
  arm.position.y = 0.003; arm.rotation.x = -tilt;
  arm.add(mesh(new THREE.CylinderGeometry(0.0019, 0.0024, leverLen, 16), MAT.chrome, 0, leverLen / 2, 0));
  arm.add(mesh(new THREE.SphereGeometry(0.0026, 16, 12), MAT.chrome, 0, leverLen, 0));
  g.add(arm);
  return g;
}

/** Potentiomètre RTY : bouton noir cannelé, anneau de graduations lumineuses. */
function rotaryKnob(r = 0.0085): THREE.Group {
  const g = new THREE.Group();
  g.add(at(litArc(r * 1.42, 0.0006, 0.5, Math.PI * 1.7), 0, 0.0005, 0));
  for (let i = 0; i < 22; i++) {
    const a = 0.5 + (i / 21) * Math.PI * 1.7;
    const t = mesh(new THREE.BoxGeometry(0.0007, 0.0004, 0.003), MAT.led, Math.cos(a) * r * 1.78, 0.0005, -Math.sin(a) * r * 1.78);
    t.rotation.y = a + Math.PI / 2; t.castShadow = false;
    g.add(t);
  }
  g.add(cyl(r * 1.08, r * 1.12, 0.003, MAT.plastic, 40));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.86, r, 0.012, 22), MAT.plastic, 0, 0.009, 0));
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.0009, 0.0115, 0.0012), MAT.rubber, Math.cos(a) * r * 0.95, 0.009, Math.sin(a) * r * 0.95).rotateY(-a));
  }
  g.add(mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.86, 0.0012, 32), MAT.gloss, 0, 0.0156, 0));
  g.add(mesh(new THREE.BoxGeometry(0.0009, 0.0006, r * 0.7), MAT.print, 0, 0.0163, -r * 0.35));
  return g;
}

/** Arceau chromé en U couché le long de Z (protège les inverseurs SW). */
function guardBar(len: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const r = 0.0023;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, len / 2), new THREE.Vector3(0, h * 0.75, len / 2), new THREE.Vector3(0, h, len / 2 - h * 0.35),
    new THREE.Vector3(0, h, -len / 2 + h * 0.35), new THREE.Vector3(0, h * 0.75, -len / 2), new THREE.Vector3(0, 0, -len / 2),
  ], false, "catmullrom", 0.35);
  g.add(mesh(new THREE.TubeGeometry(curve, 36, r, 10, false), MAT.chrome));
  for (const z of [len / 2, -len / 2]) g.add(mesh(new THREE.CylinderGeometry(0.0038, 0.0042, 0.0022, 16), MAT.plastic, 0, 0.0011, z));
  return g;
}

/** Hat du bloc pouce : petite tourelle aluminium crénelée. */
function castleHat(r = 0.0058): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(r * 1.15, r * 1.2, 0.002, MAT.plastic, 24));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.7, 0.006, 16), MAT.gunmetal, 0, 0.004, 0));
  g.add(mesh(new THREE.CylinderGeometry(r, r * 0.9, 0.004, 8), MAT.knurl, 0, 0.0085, 0));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.0008, 12), MAT.gunmetal, 0, 0.0108, 0));
  return g;
}

/**
 * Section de la poignée (z, y) : face avant presque plane côté doigts (−Z),
 * dessus qui monte vers un dôme côté paume (+Z), dessous aplati.
 */
function gripProfile(): [number, number][] {
  const key: [number, number][] = [
    [-0.040, -0.023], [-0.0445, -0.008], [-0.044, 0.008], [-0.037, 0.021], [-0.018, 0.029], [0.004, 0.0335],
    [0.024, 0.032], [0.040, 0.022], [0.0475, 0.004], [0.043, -0.014], [0.030, -0.025], [0.0, -0.028], [-0.026, -0.027],
  ];
  const curve = new THREE.CatmullRomCurve3(key.map(([z, y]) => new THREE.Vector3(z, y, 0)), true, "catmullrom", 0.5);
  return curve.getPoints(72).slice(0, 72).map((p) => [p.x, p.y]);
}

/** Coque lisse : extrusion du profil le long de X, normales adoucies (pas de facettes). */
function smoothShell(points: [number, number][], width: number, mat: THREE.Material, bevel: number): THREE.Mesh {
  const sh = new THREE.Shape();
  points.forEach(([z, y], i) => (i === 0 ? sh.moveTo(z, y) : sh.lineTo(z, y)));
  sh.closePath();
  // bevelOffset négatif : l'arrondi des extrémités ne grossit pas la section
  const raw = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 6 });
  raw.rotateY(-Math.PI / 2);
  raw.translate((width - bevel * 2) / 2, 0, 0);
  raw.deleteAttribute("normal"); raw.deleteAttribute("uv");
  const geo = mergeVertices(raw, 1e-5);
  geo.computeVertexNormals();
  raw.dispose();
  return mesh(geo, mat);
}

export function buildThrottle(): THREE.Group {
  const root = new THREE.Group();
  root.name = "X56 Throttle";

  // ───── Socle ─────
  const BW = 0.19, BD = 0.235, BH = 0.046;
  root.add(at(rbox(BW, BH - 0.01, BD, 0.014, MAT.body), 0, (BH - 0.01) / 2, 0));
  root.add(at(rbox(BW - 0.004, 0.01, BD - 0.004, 0.013, MAT.plastic), 0, BH - 0.005, 0));
  const T = BH; // dessus du socle
  // boulons hexagonaux + rondelles aux quatre angles
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const x = sx * (BW / 2 - 0.011), z = sz * (BD / 2 - 0.011);
    root.add(mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.001, 24), MAT.alu, x, T + 0.0005, z));
    root.add(mesh(new THREE.CylinderGeometry(0.0043, 0.0043, 0.0035, 6), MAT.alu, x, T + 0.0027, z));
  });
  // prise du câble à l'arrière
  root.add(mesh(new THREE.BoxGeometry(0.014, 0.012, 0.006), MAT.rubber, 0.02, BH * 0.45, -BD / 2 - 0.002));

  // ───── Bandeau avant : MODE + SW ─────
  const FZ = 0.087; // axe du bandeau
  root.add(at(rbox(BW - 0.024, 0.0022, 0.05, 0.004, MAT.panel), 0, T + 0.0011, FZ));
  const P = T + 0.0024; // niveau des platines
  // vis des platines
  for (const [x, z] of [[-0.08, FZ - 0.021], [0.08, FZ - 0.021], [-0.08, FZ + 0.021], [0.08, FZ + 0.021]]) root.add(mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 0.0008, 10), MAT.gunmetal, x, P, z));

  // MODE : bouton rotatif à ailette, arc M1 / M2 / S1
  const modeG = new THREE.Group();
  modeG.add(cyl(0.0125, 0.0135, 0.004, MAT.plastic, 36));
  modeG.add(mesh(new THREE.CylinderGeometry(0.0095, 0.011, 0.007, 28), MAT.rubber, 0, 0.0055, 0));
  const fin = mesh(new THREE.BoxGeometry(0.005, 0.009, 0.021), MAT.plastic, 0, 0.011, -0.001);
  const finG = new THREE.Group(); finG.add(fin); finG.add(mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.008), MAT.print, 0, 0.0158, -0.007)); finG.rotation.y = -0.75;
  modeG.add(finG);
  modeG.add(at(litArc(0.0175, 0.0011, -0.15, Math.PI * 0.62, MAT.led), 0, 0.0004, 0));
  modeG.add(at(litArc(0.0205, 0.0006, -0.15, Math.PI * 0.62), 0, 0.0004, 0));
  const MX = -0.068;
  root.add(control("Mode", MX, P, FZ - 0.002, modeG));
  root.add(at(decal("M1", 0.0042, "#7dff9a"), MX + 0.026, P + 0.0003, FZ - 0.017));
  root.add(at(decal("M2", 0.0036), MX + 0.0275, P + 0.0003, FZ - 0.006));
  root.add(at(decal("S1", 0.0036), MX + 0.0245, P + 0.0003, FZ + 0.005));
  root.add(at(decal("MODE", 0.0048), MX + 0.002, P + 0.0003, FZ + 0.0195));

  // SW 1·2, 3·4, 5·6 et leurs quatre arceaux
  const swX = [-0.022, 0.018, 0.058];
  swX.forEach((x, i) => {
    root.add(control(`SW ${i * 2 + 1}`, x, P, FZ, toggleSwitch(0.0125, i === 1 ? -0.3 : 0.3)));
    root.add(at(decal(`SW ${i * 2 + 1}`, 0.0042), x, P + 0.0003, FZ - 0.0165));
    root.add(at(decal(`SW ${i * 2 + 2}`, 0.0042), x, P + 0.0003, FZ + 0.0165));
  });
  [-0.042, -0.002, 0.038, 0.078].forEach((x) => root.add(at(guardBar(0.04, 0.017), x, P, FZ)));

  // ───── Colonne droite : RTY 4, RTY 3, TGL 1–4 ─────
  const CX = 0.066;
  root.add(at(rbox(0.048, 0.0022, 0.168, 0.004, MAT.panel), CX, T + 0.0011, -0.031));
  for (const z of [-0.111, -0.031, 0.049]) for (const sx of [-1, 1]) root.add(mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 0.0008, 10), MAT.gunmetal, CX + sx * 0.0215, P, z));
  root.add(control("Rotary 4", CX - 0.008, P, 0.036, rotaryKnob()));
  root.add(at(decal("RTY 4", 0.0042), CX + 0.0125, P + 0.0003, 0.0445));
  root.add(control("Rotary 3", CX + 0.008, P, 0.008, rotaryKnob()));
  root.add(at(decal("RTY 3", 0.0042), CX - 0.0125, P + 0.0003, 0.004));
  const tgl: [string, number, number][] = [["TGL 1", CX - 0.009, -0.021], ["TGL 2", CX + 0.009, -0.045], ["TGL 3", CX - 0.009, -0.071], ["TGL 4", CX + 0.009, -0.097]];
  tgl.forEach(([n, x, z], i) => {
    root.add(control(`${n} Up`, x, P, z, toggleSwitch(0.014, 0.28)));
    root.add(at(decal(n, 0.004), x + (i % 2 === 0 ? 0.0155 : -0.0155), P + 0.0003, z + 0.004));
  });

  // ───── Plaque décorative grise + bande rayée, devant le carter ─────
  root.add(mesh(new THREE.BoxGeometry(0.05, 0.0012, 0.02), MAT.print, -0.062, T + 0.0006, 0.048));
  root.add(mesh(new THREE.BoxGeometry(0.062, 0.0012, 0.009), MAT.print, -0.004, T + 0.0006, 0.0535));
  for (let i = 0; i < 6; i++) {
    const st = mesh(new THREE.BoxGeometry(0.0052, 0.0014, 0.0075), MAT.body, -0.03 + i * 0.0095, T + 0.0007, 0.0535);
    st.geometry.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0, 0, -0.55, 0));
    root.add(st);
  }

  // ───── Carter des leviers : rampe à deux fentes ─────
  const HX = -0.027, HW = 0.122;            // centre et largeur du carter
  const zF = 0.036, zR = -0.108;            // avant (pilote) et fond
  const housing = profileX([[zF, 0], [zF, 0.005], [zF - 0.02, 0.017], [-0.075, 0.03], [zR + 0.006, 0.028], [zR, 0.02], [zR, 0]], HW, MAT.body, 0.003);
  housing.position.set(HX, T, 0);
  root.add(housing);
  // plan incliné où courent les fentes : de (z=0.016, y=0.017) à (z=-0.075, y=0.030)
  const slope = new THREE.Group();
  const sA = Math.atan2(0.013, 0.091);
  slope.position.set(HX, T + 0.0268, -0.0295);
  slope.rotation.x = sA;
  root.add(slope);
  const SL = 0.088; // longueur utile des fentes
  const slotX = [-0.0305, 0.0305];
  slotX.forEach((lx, k) => {
    slope.add(mesh(new THREE.BoxGeometry(0.016, 0.0012, SL + 0.008), MAT.gloss, lx, 0.0003, 0));
    slope.add(mesh(new THREE.BoxGeometry(0.0085, 0.0016, SL), MAT.rubber, lx, 0.0004, 0));
    const side = k === 0 ? -1 : 1;
    // échelle lumineuse : filet + graduations
    const line = mesh(new THREE.BoxGeometry(0.0007, 0.0004, SL - 0.004), MAT.ledRing, lx + side * 0.0125, 0.0004, 0); line.castShadow = false; slope.add(line);
    for (let i = 0; i <= 20; i++) {
      const major = i % 5 === 0;
      const tk = mesh(new THREE.BoxGeometry(major ? 0.0052 : 0.0028, 0.0004, 0.0006), MAT.led, lx + side * (0.0125 + (major ? 0.0026 : 0.0014)), 0.0004, -SL / 2 + 0.002 + (i / 20) * (SL - 0.004));
      tk.castShadow = false; slope.add(tk);
    }
  });
  // nervure centrale entre les deux fentes
  slope.add(mesh(new THREE.BoxGeometry(0.006, 0.0025, SL + 0.01), MAT.plastic, 0, 0.0008, 0));
  // molette de friction, flanc gauche
  const fr = new THREE.Group();
  fr.add(cyl(0.0125, 0.0125, 0.009, MAT.rubber, 28));
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; fr.add(mesh(new THREE.BoxGeometry(0.0016, 0.0092, 0.0016), MAT.plastic, Math.cos(a) * 0.0127, 0, Math.sin(a) * 0.0127).rotateY(-a)); }
  fr.rotation.z = Math.PI / 2;
  root.add(at(fr, HX - HW / 2 - 0.003, T + 0.014, -0.012));

  // ───── Leviers et poignée transversale ─────
  const GD = 0.092, GH = 0.061;             // profondeur et hauteur de la section
  const WL = 0.068, WR = 0.058, GAP = 0.003; // largeurs des deux moitiés
  const armH = 0.058;
  const prof = gripProfile();
  const makeLever = (slotLx: number, width: number, cx: number, lean: number): THREE.Group => {
    // pivot sous la rampe, à mi-course
    const pv = new THREE.Group();
    pv.position.set(HX + slotLx, T + 0.006, -0.03);
    pv.rotation.x = lean;
    root.add(pv);
    // bras : deux flasques + âme
    pv.add(mesh(new THREE.BoxGeometry(0.0075, armH, 0.026), MAT.plastic, 0, armH / 2 + 0.012, 0));
    pv.add(mesh(new THREE.BoxGeometry(0.011, armH * 0.5, 0.018), MAT.body, 0, armH * 0.75 + 0.012, 0));
    const body = new THREE.Group();
    body.position.set(cx - (HX + slotLx), armH + 0.012 + 0.024, -0.002);
    body.rotation.x = -lean + 0.1;
    const shell = smoothShell(prof, width, MAT.body, 0.007);
    body.add(shell);
    // semelle sous la poignée (raccord au bras)
    body.add(at(rbox(width * 0.5, 0.012, 0.04, 0.004, MAT.plastic), -(cx - (HX + slotLx)), -GH * 0.3, 0.002));
    pv.add(body);
    return body;
  };
  const xL = HX - 0.004 - GAP / 2 - WL / 2 + 0.004, xR = xL + WL / 2 + GAP + WR / 2;
  const lb = makeLever(slotX[0], WL, xL, -0.1);
  const rb = makeLever(slotX[1], WR, xR, -0.1);

  lb.add(control("Left Throttle", 0, 0, 0, new THREE.Mesh(new THREE.BoxGeometry(WL, GH, GD), new THREE.MeshBasicMaterial({ visible: false }))));
  rb.add(control("Right Throttle", -0.004, 0, 0, new THREE.Mesh(new THREE.BoxGeometry(WR * 0.8, GH, GD), new THREE.MeshBasicMaterial({ visible: false }))));

  // trous de vis décoratifs sur le dessus des coques
  for (const [b, w] of [[lb, WL], [rb, WR]] as [THREE.Group, number][]) for (const sx of [-1, 1]) for (const z of [-0.026, 0.03]) b.add(mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.001, 10), MAT.gloss, sx * (w / 2 - 0.009), z > 0 ? 0.031 : 0.022, z));

  // --- face avant (doigts, −Z) ---
  const faceZ = -0.0452;
  const onFront = (g: THREE.Object3D, x: number, y: number) => { g.rotation.x = -Math.PI / 2 - 0.05; g.position.set(x, y, faceZ); return g; };
  rb.add(onFront(control("H", 0, 0, 0, cyl(0.0078, 0.0082, 0.0016, MAT.plastic, 28), at(aluButton(0.0056, 0.0036), 0, 0.0012, 0)), 0.006, 0.0));
  rb.add(onFront(control("I", 0, 0, 0, cyl(0.0078, 0.0082, 0.0016, MAT.plastic, 28), at(aluButton(0.0056, 0.0036), 0, 0.0012, 0)), -0.014, 0.0));
  rb.add(onFront(decal("H", 0.0042, "#c8ced4"), 0.006, 0.0125)); rb.add(onFront(decal("I", 0.0042, "#c8ced4"), -0.014, 0.0125));
  // K1 : bascule noire dans son logement
  const k1 = new THREE.Group();
  k1.add(mesh(new THREE.BoxGeometry(0.02, 0.0016, 0.014), MAT.gloss));
  const rocker = mesh(new THREE.BoxGeometry(0.013, 0.006, 0.009), MAT.plastic, 0, 0.003, 0); rocker.rotation.z = 0.22; k1.add(rocker);
  lb.add(onFront(control("K1 Up", 0, 0, 0, k1), 0.004, -0.002));
  lb.add(onFront(decal("K1", 0.0042, "#c8ced4"), 0.004, 0.0125));
  // molette de défilement : roue moletée à l'extrémité gauche
  const scroll = new THREE.Group();
  scroll.add(cyl(0.0125, 0.0125, 0.008, MAT.knurl, 44));
  scroll.add(mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.0018, 44), MAT.alu, 0, -0.005, 0));
  scroll.add(mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.001, 24), MAT.gloss, 0, 0.0045, 0));
  const scC = control("Scroll FWD", -WL / 2 - 0.004, 0.004, -0.02, scroll);
  scC.rotation.z = Math.PI / 2;
  lb.add(scC);

  // --- bloc pouce à l'extrémité droite (solidaire du levier droit) ---
  const thumb = new THREE.Group();
  thumb.position.set(WR / 2 + 0.011, -0.002, -0.004);
  rb.add(thumb);
  thumb.add(chamferBox(0.026, 0.048, 0.07, 0.007, MAT.plastic));
  thumb.add(at(rbox(0.012, 0.034, 0.056, 0.004, MAT.body), -0.012, 0.002, 0.004));
  // marquages gravés de la face droite
  const mark = (t: string, y: number, z: number) => { const d = decal(t, 0.0038, "#c8ced4"); d.rotation.set(0, Math.PI / 2, 0); d.position.set(0.0148, y, z); return d; };
  thumb.add(mark("SLD", 0.011, -0.004)); thumb.add(mark("F", 0.019, -0.022)); thumb.add(mark("G", -0.019, -0.03)); thumb.add(mark("E", 0.0035, 0.024));
  // F : grande molette aluminium sur le dessus (rotative + poussoir)
  const fK = new THREE.Group();
  fK.add(cyl(0.0185, 0.0195, 0.004, MAT.alu, 48));
  fK.add(at(knurledKnob(0.0172, 0.0115), 0, 0.0075, 0));
  fK.add(mesh(new THREE.CylinderGeometry(0.0125, 0.0155, 0.004, 40), MAT.alu, 0, 0.0152, 0));
  fK.add(mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.0008, 32), MAT.gloss, 0, 0.0175, 0));
  fK.add(at(litArc(0.0052, 0.0006, 0.8, Math.PI * 1.5, MAT.print), 0, 0.018, 0));
  thumb.add(control("F Push", 0.002, 0.0255, -0.008, fK));
  // G : molette aluminium sous le bloc, éclairée par-dessous
  const gK = new THREE.Group();
  gK.add(cyl(0.0155, 0.0165, 0.003, MAT.alu, 44));
  gK.add(at(knurledKnob(0.0145, 0.0085), 0, 0.0055, 0));
  gK.add(mesh(new THREE.CylinderGeometry(0.0105, 0.013, 0.0045, 36), MAT.aluLit, 0, 0.012, 0));
  const gC = control("G Push", 0.003, -0.0255, -0.01, gK);
  gC.rotation.z = Math.PI;
  thumb.add(gC);
  // face droite du bloc : SLD, E, mini-stick, H3, H4
  const RX = 0.0146;
  const onRight = (g: THREE.Object3D, y: number, z: number) => { g.rotation.z = -Math.PI / 2; g.position.set(RX, y, z); return g; };
  const sld = new THREE.Group();
  sld.add(mesh(new THREE.BoxGeometry(0.014, 0.001, 0.024), MAT.gloss));
  sld.add(mesh(new THREE.BoxGeometry(0.0105, 0.0042, 0.0125), MAT.alu, 0, 0.0022, 0.003));
  for (const z of [-0.0015, 0.0015, 0.0045, 0.0075]) sld.add(mesh(new THREE.BoxGeometry(0.0108, 0.0048, 0.0011), MAT.gunmetal, 0, 0.0022, z));
  thumb.add(onRight(control("SLD", 0, 0, 0, sld), 0.011, 0.014));
  const eB = new THREE.Group();
  eB.add(mesh(new THREE.BoxGeometry(0.0125, 0.0012, 0.0125), MAT.gloss));
  eB.add(mesh(new THREE.BoxGeometry(0.0098, 0.003, 0.0098), MAT.alu, 0, 0.0018, 0));
  thumb.add(onRight(control("E", 0, 0, 0, eB), -0.006, 0.024));
  const ms = new THREE.Group();
  ms.add(cyl(0.0058, 0.0062, 0.002, MAT.gloss, 20));
  ms.add(mesh(new THREE.CylinderGeometry(0.0019, 0.0022, 0.008, 10), MAT.plastic, 0, 0.005, 0));
  ms.add(mesh(new THREE.CylinderGeometry(0.0046, 0.004, 0.0045, 20), MAT.rubber, 0, 0.0105, 0));
  thumb.add(onRight(control("Mouse Ministick", 0, 0, 0, ms), -0.017, 0.012));
  thumb.add(onRight(control("H3", 0, 0, 0, castleHat()), -0.004, -0.006));
  thumb.add(onRight(control("H4", 0, 0, 0, castleHat()), -0.016, -0.022));

  return root;
}

/**
 * Nom de commande du profil .pr0 → nom de l'ancre dans le modèle.
 * Les paires (TGL n Up / Down, K1 Up / Down, Scroll FWD / BCK), les
 * inverseurs 3 positions (SW 1/2, 3/4, 5/6), les familles Mode 1/2/3 et les
 * molettes à poussoir (Rotary 1 = F, Rotary 2 = G) partagent une ancre.
 */
/** Modèles enregistrés par models-extra.ts (évite un import circulaire). */
const EXTRA: { test: RegExp; build: () => THREE.Group }[] = [];
export function registerModels(list: { test: RegExp; build: () => THREE.Group }[]) { EXTRA.push(...list); }

export function anchorNameFor(controlName: string): string {
  const n = controlName.trim();
  const dot = n.indexOf(" · ");
  if (dot > 0) return n.slice(0, dot);   // catalogue : « Pièce · détail » → pièce
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
  for (const e of EXTRA) if (e.test.test(deviceName)) return e.build();
  if (/stick|joystick|manche/i.test(deviceName)) return buildStick();
  if (/throttle|gaz/i.test(deviceName)) return buildThrottle();
  return null;
}

/** Outils partagés avec les autres modèles (models-extra.ts). */
export const KIT = { mesh, rbox, chamferBox, profileX, at, cyl, knurledKnob, control, aluButton, blackHat, decal, litArc, loft };

// ─────────────── Variantes Saitek X-55 Rhino et X-65F ───────────────
const V_MAT = {
  yellow: new THREE.MeshStandardMaterial({ color: 0xe8d23a, emissive: 0x6b5f10, emissiveIntensity: 0.5, roughness: 0.7 }),
  green: new THREE.MeshStandardMaterial({ color: 0x86f04a, emissive: 0x5fd62a, emissiveIntensity: 1.6, roughness: 0.35 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd0242c, roughness: 0.45, metalness: 0.15 }),
};

/** Bande de danger jaune et noire, à plat. */
function hazard(w: number, d: number): THREE.Mesh {
  const c = document.createElement("canvas"); c.width = 256; c.height = Math.max(16, Math.round((256 * d) / w));
  const g = c.getContext("2d")!;
  g.fillStyle = "#16181b"; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#ecd53a";
  for (let x = -c.height; x < c.width + c.height; x += 34) { g.beginPath(); g.moveTo(x, c.height); g.lineTo(x + 17, c.height); g.lineTo(x + 17 + c.height, 0); g.lineTo(x + c.height, 0); g.closePath(); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}

/** Remplace l'éclairage bleu du X56 par les marquages jaunes / verts, retire ce que la variante n'a pas. */
function restyle(root: THREE.Group, v: SaitekVariant, part: "stick" | "throttle"): THREE.Group {
  const drop: THREE.Object3D[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      if (m.material === MAT.led) m.material = part === "throttle" ? V_MAT.green : V_MAT.yellow;
      else if (m.material === MAT.ledRing) m.material = part === "throttle" ? V_MAT.green : V_MAT.yellow;
      else if (m.material === MAT.aluLit) m.material = MAT.alu;
      else if (m.material === MAT.print && m.parent === root) m.material = V_MAT.yellow;   // graduations du socle
    }
    if (part === "stick" && v === "x55" && (o.userData.control === "C Stick" || o.name === "decal:C")) drop.push(o);
    if (part === "stick" && o.userData.control === "Mode") drop.push(o);   // le sélecteur de mode est sur les gaz
  });
  drop.forEach((o) => o.parent?.remove(o));
  // boutons rouges : A (dessus) et B (flanc) sur le manche, E sur les gaz
  const swap = (name: string, from: THREE.Material[], to: THREE.Material) =>
    root.traverse((o) => { if (o.userData.control === name) o.traverse((k) => { const m = k as THREE.Mesh; if (m.isMesh && from.includes(m.material as THREE.Material)) m.material = to; }); });
  if (part === "stick") {
    swap("A", [MAT.alu, MAT.plastic], V_MAT.red); swap("B", [MAT.alu, MAT.plastic], V_MAT.red);
    swap("POV", [MAT.alu, MAT.chrome], MAT.plastic);          // chapeau POV noir
    swap("H2", [MAT.plastic], MAT.gunmetal);                  // chapeau créneau métal
  } else swap("E", [MAT.alu], V_MAT.red);
  root.name = (v === "x55" ? "X-55 " : "X-65F ") + part;
  return root;
}

function withVariant(v: SaitekVariant, part: "stick" | "throttle", build: () => THREE.Group): THREE.Group {
  const prev = VAR; VAR = v;
  try { return restyle(build(), v, part); } finally { VAR = prev; }
}

/** Manche X-55 Rhino : volumes du X56, sans mini-stick C, marquages jaunes, bande de danger sur le socle. */
export function buildX55Stick(): THREE.Group {
  const g = withVariant("x55", "stick", buildStick);
  g.add(at(hazard(0.07, 0.012), -0.052, 0.0463, -0.094));
  return g;
}
/** Manette des gaz X-55 Rhino : anneaux verts, bandes de danger, RTY 1 / RTY 2. */
export function buildX55Throttle(): THREE.Group {
  const g = withVariant("x55", "throttle", buildThrottle);
  g.add(at(hazard(0.05, 0.012), -0.06, 0.0486, 0.108));
  g.add(at(hazard(0.04, 0.01), 0.064, 0.0463, -0.105));
  g.traverse((o) => { if (o.userData.control === "Rotary 3") o.userData.label = "RTY 1"; if (o.userData.control === "Rotary 4") o.userData.label = "RTY 2"; });
  return g;
}
/** Manche X-65F (capteurs d'effort) : poignée de la famille X-55 posée sur un socle surélevé à deux patins. */
export function buildX65FStick(): THREE.Group {
  const g = withVariant("x65f", "stick", buildStick);
  const out = new THREE.Group(); out.name = "X-65F stick";
  g.position.y = 0.03; out.add(g);
  for (const sx of [-1, 1]) out.add(at(rbox(0.034, 0.03, 0.2, 0.006, MAT.body), sx * 0.078, 0.015, 0));
  out.add(at(rbox(0.12, 0.012, 0.06, 0.004, MAT.body), 0, 0.024, -0.07));
  return out;
}

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { pixelRatio } from "../../../lib/three-utils";

/** Étiquette texte (canvas → sprite), style HUD : fond sombre, texte clair, option de couleur d'accent. */
export function makeLabel(text: string, opts: { color?: string; size?: number; box?: boolean; sub?: string } = {}): THREE.Sprite {
  const color = opts.color ?? "#e8f3ff";
  const px = opts.size ?? 40;
  const font = `600 ${px}px 'Titillium Web', 'Segoe UI', sans-serif`;
  const subFont = `${Math.round(px * 0.62)}px 'Share Tech Mono', Consolas, monospace`;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = font;
  const w1 = g.measureText(text).width;
  g.font = subFont;
  const w2 = opts.sub ? g.measureText(opts.sub).width : 0;
  const pad = 22;
  const w = Math.ceil(Math.max(w1, w2)) + pad * 2;
  const h = opts.sub ? Math.round(px * 2.1) : Math.round(px * 1.5);
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  if (opts.box !== false) {
    ctx.fillStyle = "rgba(6, 20, 32, 0.72)"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 4, h);
  }
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillStyle = color; ctx.font = font;
  ctx.fillText(text, pad, opts.sub ? h * 0.36 : h / 2);
  if (opts.sub) { ctx.fillStyle = "rgba(160, 200, 230, 0.9)"; ctx.font = subFont; ctx.fillText(opts.sub, pad, h * 0.74); }
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.userData.aspect = w / h;
  sp.center.set(0, 0.5);
  sp.renderOrder = 20;
  return sp;
}

/** Fixe la hauteur apparente d'un sprite en unités monde selon la distance caméra (taille écran constante). */
export function sizeLabel(sp: THREE.Sprite, camera: THREE.Camera, screenFrac: number) {
  const d = camera.position.distanceTo(sp.getWorldPosition(new THREE.Vector3()));
  const h = d * screenFrac;
  sp.scale.set(h * (sp.userData.aspect as number), h, 1);
}

/** Texture de halo radial pour étoiles et marqueurs. */
export function glowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(120,190,255,0)"): THREE.Texture {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner); grd.addColorStop(0.25, inner.replace(/,\s*1\)$/, ", .55)")); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Champ d'étoiles lointaines. */
export function starField(count = 2500, radius = 900): THREE.Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.6 + Math.random() * 0.4));
    pos.set([v.x, v.y, v.z], i * 3);
    const t = Math.random();
    const c = new THREE.Color().setHSL(0.58 + t * 0.08, 0.5, 0.65 + Math.random() * 0.3);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });
  return new THREE.Points(geo, mat);
}

/** Interpolation caméra + cible, ease-out cubic. Retourne une fonction d'annulation. */
export function flyTo(camera: THREE.PerspectiveCamera, controls: OrbitControls, toPos: THREE.Vector3, toTarget: THREE.Vector3, ms = 900, onDone?: () => void): () => void {
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  const start = performance.now();
  let raf = 0; let cancelled = false;
  const step = () => {
    if (cancelled) return;
    const k = Math.min(1, (performance.now() - start) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(p0, toPos, e);
    controls.target.lerpVectors(t0, toTarget, e);
    controls.update();
    if (k < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}

/** Renderer et caméra standards pour les vues carte. */
export function makeRenderer(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.05, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = true; controls.screenSpacePanning = true;
  return { renderer, camera, controls };
}

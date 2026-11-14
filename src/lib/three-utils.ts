/**
 * Hygiène mémoire des vues Three.js.
 *
 * WebGL ne libère rien tout seul : géométries, matériaux et textures restent
 * en mémoire GPU tant qu'on ne les a pas explicitement détruits. Chaque vue
 * 3D appelle `disposeScene` + `destroyRenderer` au démontage, et fait tourner
 * son rendu via `renderLoop`, qui se met en pause quand la vue n'est pas
 * visible (fenêtre réduite, onglet masqué, canevas hors écran).
 */
import * as THREE from "three";

const TEX_KEYS = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "bumpMap", "envMap", "lightMap", "displacementMap", "specularMap", "clearcoatMap", "clearcoatNormalMap", "clearcoatRoughnessMap", "sheenColorMap", "transmissionMap", "thicknessMap"] as const;

function disposeMaterial(m: THREE.Material, seen: Set<unknown>) {
  if (seen.has(m)) return;
  seen.add(m);
  const rec = m as unknown as Record<string, unknown>;
  for (const k of TEX_KEYS) {
    const t = rec[k] as THREE.Texture | null | undefined;
    if (t && typeof t.dispose === "function" && !seen.has(t)) { seen.add(t); t.dispose(); }
  }
  m.dispose();
}

/** Détruit toutes les ressources GPU atteignables depuis `root`. */
export function disposeScene(root: THREE.Object3D) {
  const seen = new Set<unknown>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const geo = mesh.geometry as THREE.BufferGeometry | undefined;
    if (geo && !seen.has(geo)) { seen.add(geo); geo.dispose(); }
    const mat = (o as THREE.Mesh | THREE.Sprite | THREE.Line | THREE.Points).material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => disposeMaterial(m, seen));
    else if (mat) disposeMaterial(mat, seen);
  });
  const sc = root as THREE.Scene;
  if (sc.isScene) {
    if (sc.environment) { sc.environment.dispose(); sc.environment = null; }
    if (sc.background && (sc.background as THREE.Texture).isTexture) (sc.background as THREE.Texture).dispose();
  }
  root.clear();
}

/** Détruit le renderer et rend son contexte WebGL au système. */
export function destroyRenderer(renderer: THREE.WebGLRenderer) {
  renderer.renderLists.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}

/** Plafond de densité de pixels : au-delà de 1,5 le coût mémoire/GPU explose pour un gain invisible. */
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 1.5);

/**
 * Boucle de rendu qui ne tourne que quand `el` est réellement visible.
 * `frame(dt)` reçoit le temps écoulé en secondes (borné à 0,1 s).
 * Renvoie la fonction d'arrêt.
 */
export function renderLoop(el: HTMLElement, frame: (dt: number) => void): () => void {
  let raf = 0; let last = 0; let onScreen = true; let stopped = false;
  const running = () => !stopped && onScreen && !document.hidden;
  const tick = (now: number) => {
    raf = 0;
    if (!running()) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    frame(dt);
    raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (running() && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver((entries) => { onScreen = entries.some((e) => e.isIntersecting); kick(); }, { threshold: 0.01 });
  io.observe(el);
  document.addEventListener("visibilitychange", kick);
  kick();
  return () => { stopped = true; if (raf) cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener("visibilitychange", kick); };
}

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HOVER_EMISSIVE, SELECT_EMISSIVE } from "./materials";
import { ANCHOR_LABELS, anchorNameFor, buildDeviceModel } from "./models";
import "./models-extra";
import { loadStore } from "../../../lib/tauri";
import { destroyRenderer, disposeScene, pixelRatio, renderLoop } from "../../../lib/three-utils";

export interface Anchor3D { x: number; y: number; z: number }

interface Props {
  deviceName: string;
  /** Modèle .glb de l'utilisateur (data URL) ; sinon modèle schématique. */
  modelUrl?: string | null;
  /** Noms des commandes du profil (pour savoir lesquelles ont une ancre). */
  controls: { id: string; name: string }[];
  /** Ancres placées à la main par l'utilisateur (coordonnées locales du modèle). */
  anchors: Record<string, Anchor3D>;
  selectedId: string | null;
  zoomed: boolean;
  placing: boolean;
  labelFor: (id: string) => string;
  onSelect: (id: string) => void;
  onPlace: (id: string, a: Anchor3D) => void;
  onAnchorsReady?: (ids: string[]) => void;
  /** Afficher les petites étiquettes imprimées près de chaque commande. */
  showLabels?: boolean;
}

const W = 560, H = 440;

/** Interpolation douce (ease out cubic). */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Vue 3D de l'appareil : rotation orbitale au repos, clic sur une commande
 * → caméra qui s'approche en douceur, halo orange et étiquette ; mode
 * placement → clic sur la surface pour poser une ancre.
 */
export function Device3D({ deviceName, modelUrl, controls, anchors, selectedId, zoomed, placing, labelFor, onSelect, onPlace, onAnchorsReady, showLabels = true }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls;
    model: THREE.Group | null; anchorsByCtrl: Map<string, THREE.Object3D>; ring: THREE.Mesh; glow: THREE.Sprite;
    tween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number; dur: number } | null;
    hover: THREE.Object3D | null; raf: number; home: { pos: THREE.Vector3; target: THREE.Vector3 }; labels?: THREE.Group;
  } | null>(null);
  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;
  useEffect(() => { const s = state.current; if (s?.labels) s.labels.visible = showLabels; }, [showLabels]);
  const [label, setLabel] = useState<{ x: number; y: number; text: string; name: string } | null>(null);
  const [ready, setReady] = useState(false);
  const autoRotatePref = useRef(true);
  const propsRef = useRef({ controls, anchors, selectedId, zoomed, placing, labelFor, onSelect, onPlace });
  propsRef.current = { controls, anchors, selectedId, zoomed, placing, labelFor, onSelect, onPlace };

  // ----- scène -----
  useEffect(() => {
    const el = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1420, 1.2);
    // Environnement : reflets doux sur les métaux
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.01, 10);
    const home = { pos: new THREE.Vector3(0.38, 0.3, 0.42), target: new THREE.Vector3(0, 0.1, 0) };
    camera.position.copy(home.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.9;
    controls.minDistance = 0.08; controls.maxDistance = 1.2;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.copy(home.target);

    // Lumières : clé froide, contre orangé, hémisphère
    scene.add(new THREE.HemisphereLight(0x9fd4ff, 0x141a22, 0.9));
    const key = new THREE.DirectionalLight(0xe8f6ff, 3.0);
    key.position.set(0.5, 0.9, 0.6); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 0.1; key.shadow.camera.far = 3;
    key.shadow.camera.left = key.shadow.camera.bottom = -0.4; key.shadow.camera.right = key.shadow.camera.top = 0.4;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff9d2e, 1.4); rim.position.set(-0.6, 0.4, -0.5); scene.add(rim);
    const fill = new THREE.PointLight(0x62d0ff, 1.2, 2); fill.position.set(-0.3, 0.2, 0.5); scene.add(fill);

    // Sol : disque sombre + grille HUD
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 64), new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.9, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(1.2, 24, 0x1f5f80, 0x123a52);
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = 0.0005; scene.add(grid);
    const haloRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.303, 96), new THREE.MeshBasicMaterial({ color: 0x62d0ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    haloRing.rotation.x = -Math.PI / 2; haloRing.position.y = 0.001; scene.add(haloRing);

    // Marqueurs de sélection : anneau pulsé + halo
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.011, 48), new THREE.MeshBasicMaterial({ color: 0xff9d2e, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }));
    ring.renderOrder = 10; ring.visible = false; scene.add(ring);
    const glowTex = makeGlowTexture();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9d2e, transparent: true, opacity: 0.85, depthTest: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(0.05, 0.05, 1); glow.renderOrder = 9; glow.visible = false; scene.add(glow);

    state.current = { renderer, scene, camera, controls, model: null, anchorsByCtrl: new Map(), ring, glow, tween: null, hover: null, raf: 0, home };
    loadStore<{ autoRotate?: boolean }>("settings").then((v) => { if (v && v.autoRotate === false) autoRotatePref.current = false; }).catch(() => undefined);

    // Interaction souris
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const pick = (ev: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const s = state.current!;
      if (!s.model) return null;
      const hits = ray.intersectObject(s.model, true);
      return hits[0] ?? null;
    };
    const ctrlOf = (o: THREE.Object3D | null): THREE.Object3D | null => {
      let cur: THREE.Object3D | null = o;
      while (cur) { if (cur.userData.control) return cur; cur = cur.parent; }
      return null;
    };
    const onMove = (ev: MouseEvent) => {
      const s = state.current!;
      const hit = pick(ev);
      const c = hit ? ctrlOf(hit.object) : null;
      if (s.hover !== c) {
        if (s.hover) setEmissive(s.hover, null);
        s.hover = c && c.userData.control && !isSelected(c) ? c : null;
        if (s.hover) setEmissive(s.hover, HOVER_EMISSIVE, 0.5);
        renderer.domElement.style.cursor = c ? "pointer" : propsRef.current.placing ? "crosshair" : "grab";
      }
    };
    const isSelected = (c: THREE.Object3D) => {
      const p = propsRef.current;
      const sel = p.controls.find((k) => k.id === p.selectedId);
      return !!sel && anchorNameFor(sel.name) === c.userData.control;
    };
    const onDown = (ev: MouseEvent) => { downAt = { x: ev.clientX, y: ev.clientY }; };
    const onUp = (ev: MouseEvent) => {
      if (!downAt) return;
      const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 4;
      downAt = null;
      if (moved) return; // c'était une rotation, pas un clic
      const p = propsRef.current;
      const hit = pick(ev);
      if (p.placing && p.selectedId && hit && state.current!.model) {
        const local = state.current!.model.worldToLocal(hit.point.clone());
        p.onPlace(p.selectedId, { x: local.x, y: local.y, z: local.z });
        return;
      }
      const c = hit ? ctrlOf(hit.object) : null;
      if (!c) return;
      // retrouver la commande du profil qui correspond à cette ancre
      const name: string = c.userData.control;
      const match = p.controls.find((k) => anchorNameFor(k.name) === name) ?? p.controls.find((k) => k.id === name);
      if (match) p.onSelect(match.id);
    };
    renderer.domElement.addEventListener("mousemove", onMove);
    renderer.domElement.addEventListener("mousedown", onDown);
    renderer.domElement.addEventListener("mouseup", onUp);

    // Boucle de rendu
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    const frame = () => {
      const s = state.current;
      if (!s) return;
      const t = clock.getElapsedTime();
      if (s.tween) {
        const k = Math.min(1, (performance.now() - s.tween.start) / s.tween.dur);
        const e = ease(k);
        camera.position.lerpVectors(s.tween.from, s.tween.to, e);
        controls.target.lerpVectors(s.tween.tFrom, s.tween.tTo, e);
        if (k >= 1) s.tween = null;
      }
      controls.update();
      // étiquettes : taille constante à l'écran, masquées pour la commande sélectionnée en zoom
      if (s.labels && s.labels.visible) {
        const p = propsRef.current;
        const selName = (() => { const c = p.controls.find((k) => k.id === p.selectedId); return c ? anchorNameFor(c.name) : null; })();
        for (const sp of s.labels.children as THREE.Sprite[]) {
          sp.getWorldPosition(tmp);
          const d = camera.position.distanceTo(tmp);
          const k = d * 0.02;
          sp.scale.set(k * (sp.userData.aspect ?? 3), k, 1);
          (sp.material as THREE.SpriteMaterial).opacity = p.zoomed ? (sp.userData.labelFor === selName ? 0 : 0.3) : 0.8;
        }
      }
      // marqueur de sélection : suit l'ancre, pulse
      if (s.ring.visible) {
        // taille constante à l'écran : proportionnelle à la distance caméra
        const d = camera.position.distanceTo(s.ring.position);
        const pulse = (1 + 0.18 * Math.sin(t * 4)) * d * 5.5;
        s.ring.scale.setScalar(pulse);
        s.ring.lookAt(camera.position);
        (s.ring.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.35 * Math.sin(t * 4);
        s.glow.scale.setScalar(d * (0.15 + 0.03 * Math.sin(t * 3)));
        // étiquette 2D projetée
        tmp.copy(s.ring.position).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
        const p = propsRef.current;
        const sel = p.controls.find((c) => c.id === p.selectedId);
        if (sel) setLabel((prev) => (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5 && prev.name === sel.name) ? prev : { x, y, text: p.labelFor(sel.id), name: sel.name });
      }
      renderer.render(scene, camera);
    };
    // Rendu suspendu quand la vue n'est pas visible (fenêtre réduite, défilement).
    const stopLoop = renderLoop(el, frame);

    return () => {
      stopLoop();
      renderer.domElement.removeEventListener("mousemove", onMove);
      renderer.domElement.removeEventListener("mousedown", onDown);
      renderer.domElement.removeEventListener("mouseup", onUp);
      controls.dispose();
      disposeScene(scene);
      destroyRenderer(renderer);
      state.current = null;
    };
  }, []);

  // ----- modèle (schématique ou .glb) -----
  useEffect(() => {
    const s = state.current;
    if (!s) return;
    let cancelled = false;
    setReady(false);
    const install = (model: THREE.Group) => {
      if (cancelled || !state.current) return;
      if (s.model) { s.scene.remove(s.model); disposeScene(s.model); }
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      s.scene.add(model);
      s.model = model;
      s.anchorsByCtrl.clear();
      model.traverse((o) => { if (o.userData.control) s.anchorsByCtrl.set(o.userData.control, o); });
      // étiquettes imprimées (sprites) au-dessus de chaque ancre connue
      model.updateMatrixWorld(true);
      const labels = new THREE.Group(); labels.name = "labels";
      s.anchorsByCtrl.forEach((obj, name) => {
        const text = (obj.userData.label as string | undefined) ?? ANCHOR_LABELS[name]; if (!text) return;
        const box = new THREE.Box3().setFromObject(obj); const c = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
        const sp = makeLabelSprite(text);
        sp.position.copy(model.worldToLocal(c)); sp.position.y += Math.max(0.009, size.y * 0.6 + 0.005);
        sp.userData.labelFor = name;
        labels.add(sp);
      });
      labels.visible = showLabelsRef.current;
      model.add(labels);
      s.labels = labels;
      // cadrer la caméra sur le modèle
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) * 0.5;
      s.home.target.set(center.x, center.y * 0.9, center.z);
      s.home.pos.set(center.x + radius * 2.1, center.y + radius * 1.5, center.z + radius * 2.3);
      s.camera.position.copy(s.home.pos); s.controls.target.copy(s.home.target);
      s.controls.minDistance = radius * 0.35; s.controls.maxDistance = radius * 7;
      setReady(true);
      onAnchorsReady?.(Array.from(s.anchorsByCtrl.keys()));
    };
    if (modelUrl) {
      new GLTFLoader().load(modelUrl, (gltf) => {
        const g = new THREE.Group(); g.add(gltf.scene);
        // normaliser à ~0.3 m de haut
        const box = new THREE.Box3().setFromObject(g); const size = box.getSize(new THREE.Vector3());
        const k = 0.3 / Math.max(size.x, size.y, size.z); g.scale.setScalar(k);
        const b2 = new THREE.Box3().setFromObject(g); g.position.y -= b2.min.y; g.position.x -= (b2.min.x + b2.max.x) / 2; g.position.z -= (b2.min.z + b2.max.z) / 2;
        install(g);
      }, undefined, () => { const m = buildDeviceModel(deviceName); if (m) install(m); });
    } else {
      const m = buildDeviceModel(deviceName) ?? new THREE.Group();
      install(m);
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceName, modelUrl]);

  // ----- sélection / zoom / placement -----
  useEffect(() => {
    const s = state.current;
    if (!s || !ready) return;
    // réinitialiser l'émissif de tout
    s.model?.traverse((o) => { if (o.userData.control && o.type === "Group") setEmissive(o, null); });
    const sel = controls.find((c) => c.id === selectedId);
    const anchorName = sel ? anchorNameFor(sel.name) : null;
    const manual = sel ? anchors[sel.id] : undefined;
    const obj = anchorName ? s.anchorsByCtrl.get(anchorName) ?? null : null;

    let worldPos: THREE.Vector3 | null = null;
    if (manual && s.model) worldPos = s.model.localToWorld(new THREE.Vector3(manual.x, manual.y, manual.z));
    else if (obj) { worldPos = new THREE.Vector3(); new THREE.Box3().setFromObject(obj).getCenter(worldPos); }

    if (obj) setEmissive(obj, SELECT_EMISSIVE, 1.2);
    s.ring.visible = s.glow.visible = !!worldPos && !placing;
    if (worldPos) { s.ring.position.copy(worldPos); s.glow.position.copy(worldPos); }
    else setLabel(null);

    s.controls.autoRotate = autoRotatePref.current && !zoomed && !placing;
    const now = performance.now();
    if (zoomed && worldPos && s.model) {
      // direction : du centre du modèle vers la commande, relevée vers le haut
      const center = new THREE.Box3().setFromObject(s.model).getCenter(new THREE.Vector3());
      const dir = worldPos.clone().sub(center); dir.y = Math.max(dir.y, 0.02); if (dir.lengthSq() < 1e-6) dir.set(0, 0.3, 1); dir.normalize();
      dir.y += 0.45; dir.normalize();
      const dist = obj ? Math.min(0.26, Math.max(0.12, new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).length() * 6)) : 0.14;
      s.tween = { from: s.camera.position.clone(), to: worldPos.clone().addScaledVector(dir, dist), tFrom: s.controls.target.clone(), tTo: worldPos.clone(), start: now, dur: 750 };
    } else if (!zoomed) {
      s.tween = { from: s.camera.position.clone(), to: s.home.pos.clone(), tFrom: s.controls.target.clone(), tTo: s.home.target.clone(), start: now, dur: 700 };
    }
  }, [selectedId, zoomed, placing, controls, anchors, ready]);

  const missing = controls.filter((c) => !anchors[c.id] && !(state.current?.anchorsByCtrl.has(anchorNameFor(c.name)))).length;

  return (
    <div className="viewport" style={{ width: W, height: H, cursor: placing ? "crosshair" : "grab" }}>
      <div ref={mount} style={{ width: W, height: H }} />
      {label && !placing && (
        <div className="pill" style={{ left: Math.min(W - 180, label.x + 18), top: Math.max(6, label.y - 34), borderLeft: "3px solid var(--amber)" }}>
          <span className="s">{label.name.toUpperCase()}</span>
          <span className="a">{label.text}</span>
        </div>
      )}
      {!ready && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".2em" }}>CHARGEMENT DU MODÈLE…</div>}
      <div className="mono" style={{ position: "absolute", left: 10, bottom: 8, fontSize: 10, letterSpacing: ".16em", color: "var(--dim)" }}>
        {modelUrl ? "MODÈLE UTILISATEUR" : "MODÈLE SCHÉMATIQUE"} · GLISSER : ORBITE · MOLETTE : ZOOM{missing ? ` · ${missing} SANS ANCRE` : ""}
      </div>
      <div className="corner tl" /><div className="corner tr" /><div className="corner bl" /><div className="corner br" />
    </div>
  );
}

/** Applique (ou retire) une couleur émissive à toutes les faces d'une commande. */
function setEmissive(obj: THREE.Object3D, color: THREE.Color | null, intensity = 1) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (!mat || !("emissive" in mat)) return;
    if (!m.userData.baseEmissive) m.userData.baseEmissive = { c: mat.emissive.clone(), i: mat.emissiveIntensity };
    // on clone le matériau par mesh pour ne pas teinter les autres commandes partageant la matière
    if (!m.userData.ownMat) { m.material = mat.clone(); m.userData.ownMat = true; }
    const own = m.material as THREE.MeshStandardMaterial;
    if (color) { own.emissive.copy(color); own.emissiveIntensity = intensity; }
    else { own.emissive.copy(m.userData.baseEmissive.c); own.emissiveIntensity = m.userData.baseEmissive.i; }
  });
}

/** Petite étiquette imprimée (texte cyan sur fond sombre) en sprite. */
function makeLabelSprite(text: string): THREE.Sprite {
  const c = document.createElement("canvas");
  const font = "bold 44px 'Share Tech Mono', 'Consolas', monospace";
  const g = c.getContext("2d")!;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 36; const h = 64;
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(6, 14, 24, 0.82)"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(98, 208, 255, 0.9)"; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.fillStyle = "#62d0ff"; ctx.font = font; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0.9 }));
  sp.scale.set(0.001, 0.001, 1); // taille réelle fixée à chaque image selon la distance caméra
  sp.renderOrder = 8;
  sp.userData.aspect = w / h;
  return sp;
}

function makeGlowTexture(): THREE.Texture {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,157,46,.7)"); grd.addColorStop(1, "rgba(255,157,46,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { cachedBinary } from "../../lib/tauri";
import { destroyRenderer, disposeScene, pixelRatio, renderLoop } from "../../lib/three-utils";
import type { ModelFile } from "./catalog";

export type ViewerMode = "textured" | "holo";
type Stage = { kind: "idle" } | { kind: "download"; mb: number | null } | { kind: "cache" } | { kind: "parse" } | { kind: "ready"; tris: number } | { kind: "error"; message: string };

/** Matériau « hologramme » : arêtes lumineuses par effet Fresnel, sans texture. */
function holoMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0x5ec1ff) }, uTime: { value: 0 } },
    vertexShader: "varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = (modelMatrix * vec4(position,1.0)).y; gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 uColor; uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); float scan = 0.85 + 0.15 * sin(vY * 60.0 - uTime * 2.0); gl_FragColor = vec4(uColor * (0.18 + f * 1.25) * scan, 0.10 + f * 0.85); }",
  });
}

const VIEWS: { id: string; label: string; dir: [number, number, number] }[] = [
  { id: "iso", label: "3/4", dir: [1, 0.55, 1.15] },
  { id: "front", label: "Face", dir: [0, 0.08, 1] },
  { id: "side", label: "Profil", dir: [1, 0.08, 0] },
  { id: "top", label: "Dessus", dir: [0.001, 1, 0.001] },
  { id: "rear", label: "Arrière", dir: [0, 0.15, -1] },
];

/**
 * Visionneuse 3D d'un vaisseau. Le modèle (.glb officiel) est téléchargé une
 * fois, gardé dans le cache disque de l'application, puis relu hors ligne.
 * Tout est libéré (GPU compris) quand on change de vaisseau ou de page.
 */
export function ShipViewer({ slug, textured, holo, autoRotate, lengthM, fallbackImage }: {
  slug: string; textured: ModelFile | null; holo: ModelFile | null; autoRotate: boolean; lengthM: number | null; fallbackImage: string | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewerMode>(textured ? "textured" : "holo");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [spin, setSpin] = useState(autoRotate);
  const api = useRef<{ view: (dir: [number, number, number]) => void; setSpin: (v: boolean) => void } | null>(null);

  const file = mode === "textured" ? textured ?? holo : holo ?? textured;
  const effectiveMode: ViewerMode = mode === "textured" && textured ? "textured" : holo ? "holo" : "textured";

  useEffect(() => { setMode(textured ? "textured" : "holo"); }, [slug, textured]);

  useEffect(() => {
    const el = host.current;
    if (!el || !file) return;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    disposeScene(room); pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / Math.max(1, el.clientHeight), 0.01, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotate = spin; controls.autoRotateSpeed = 0.7;
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x4fb3ff, 1.4); rim.position.set(-5, 2, -6); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x8fb4d8, 0.5));
    const grid = new THREE.GridHelper(4, 40, 0x2f6f95, 0x143a55);
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.45; scene.add(grid);

    let holoMat: THREE.ShaderMaterial | null = null;
    let radius = 1; let tween: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
    const frame = (dir: [number, number, number]) => new THREE.Vector3(...dir).normalize().multiplyScalar(radius * 2.5);
    camera.position.copy(frame(VIEWS[0].dir)); controls.target.set(0, 0, 0);
    api.current = { view: (dir) => { tween = { from: camera.position.clone(), to: frame(dir), t: 0 }; }, setSpin: (v) => { controls.autoRotate = v; } };

    const draco = new DRACOLoader().setDecoderPath("/draco/");
    const ktx2 = new KTX2Loader().setTranscoderPath("/basis/").detectSupport(renderer);
    const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);

    (async () => {
      try {
        const variant = effectiveMode === "textured" ? "tex" : "holo";
        const buf = await cachedBinary(file.url, `ship-${slug}-${variant}.glb`, (s) => { if (!disposed) setStage(s === "download" ? { kind: "download", mb: file.size ? file.size / 1048576 : null } : { kind: "cache" }); });
        if (disposed) return;
        setStage({ kind: "parse" });
        const gltf = await loader.parseAsync(buf, "");
        if (disposed) { disposeScene(gltf.scene); return; }
        const model = gltf.scene;
        // Normalisation : centré, posé sur la grille, plus grande dimension = 2 unités.
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
        const k = 2 / Math.max(size.x, size.y, size.z, 1e-6);
        const pivot = new THREE.Group();
        model.position.sub(center); pivot.add(model); pivot.scale.setScalar(k);
        pivot.position.y = (size.y * k) / 2 + 0.02;
        let tris = 0;
        if (effectiveMode === "holo") holoMat = holoMaterial();
        model.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
          if (holoMat) {
            const old = m.material as THREE.Material | THREE.Material[];
            (Array.isArray(old) ? old : [old]).forEach((x) => x.dispose());
            if (!g.attributes.normal) g.computeVertexNormals();
            m.material = holoMat;
          } else {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mt of mats) { const s = mt as THREE.MeshStandardMaterial; if (s.isMeshStandardMaterial) { s.envMapIntensity = 1.1; if (s.map) s.map.anisotropy = 4; } }
          }
        });
        scene.add(pivot);
        radius = new THREE.Box3().setFromObject(pivot).getBoundingSphere(new THREE.Sphere()).radius || 1;
        controls.target.set(0, pivot.position.y, 0);
        controls.minDistance = radius * 0.6; controls.maxDistance = radius * 8;
        camera.position.copy(frame(VIEWS[0].dir)).add(controls.target);
        setStage({ kind: "ready", tris: Math.round(tris) });
      } catch (e) {
        if (!disposed) setStage({ kind: "error", message: String(e instanceof Error ? e.message : e) });
      } finally {
        draco.dispose(); ktx2.dispose();
      }
    })();

    const stop = renderLoop(el, (dt) => {
      if (tween) {
        tween.t = Math.min(1, tween.t + dt / 0.7);
        const e = 1 - Math.pow(1 - tween.t, 3);
        camera.position.lerpVectors(tween.from, tween.to.clone().add(controls.target), e);
        if (tween.t >= 1) tween = null;
      }
      if (holoMat) holoMat.uniforms.uTime.value += dt;
      controls.update();
      renderer.render(scene, camera);
    });
    const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    ro.observe(el);

    return () => {
      disposed = true; stop(); ro.disconnect(); controls.dispose();
      disposeScene(scene); destroyRenderer(renderer);
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, file?.url, effectiveMode]);

  useEffect(() => { api.current?.setSpin(spin); }, [spin]);

  if (!file) {
    return (
      <div className="ship-viewer ship-viewer-empty">
        {fallbackImage && <img src={fallbackImage} alt="" />}
        <span className="mono">PAS DE MODÈLE 3D PUBLIÉ POUR CE VAISSEAU</span>
      </div>
    );
  }

  return (
    <div className="ship-viewer">
      <div ref={host} className="ship-canvas" />
      {stage.kind !== "ready" && (
        <div className="ship-overlay">
          {stage.kind === "error" && fallbackImage && <img src={fallbackImage} alt="" />}
          <span className="mono">
            {stage.kind === "download" && `TÉLÉCHARGEMENT DU MODÈLE${stage.mb ? ` (${stage.mb.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo)` : ""}… UNE SEULE FOIS, IL RESTE ENSUITE SUR TON PC`}
            {stage.kind === "cache" && "LECTURE DU MODÈLE EN CACHE…"}
            {stage.kind === "parse" && "PRÉPARATION DU MODÈLE…"}
            {stage.kind === "idle" && "INITIALISATION…"}
            {stage.kind === "error" && `MODÈLE INDISPONIBLE : ${stage.message}`}
          </span>
        </div>
      )}
      <div className="ship-tools">
        <div role="group" aria-label="Rendu" style={{ display: "flex", gap: 4 }}>
          <button type="button" className={"tab" + (effectiveMode === "textured" ? " active" : "")} aria-pressed={effectiveMode === "textured"} disabled={!textured} onClick={() => setMode("textured")}>Texturé</button>
          <button type="button" className={"tab" + (effectiveMode === "holo" ? " active" : "")} aria-pressed={effectiveMode === "holo"} disabled={!holo} onClick={() => setMode("holo")}>Hologramme</button>
        </div>
        <div role="group" aria-label="Angle de vue" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {VIEWS.map((v) => <button key={v.id} type="button" className="tab" onClick={() => api.current?.view(v.dir)} disabled={stage.kind !== "ready"}>{v.label}</button>)}
          <button type="button" className={"tab" + (spin ? " active" : "")} aria-pressed={spin} onClick={() => setSpin((s) => !s)}>Rotation</button>
        </div>
      </div>
      <div className="ship-foot mono">
        {stage.kind === "ready" ? `${stage.tris.toLocaleString("fr-FR")} TRIANGLES` : ""}{lengthM ? ` · LONGUEUR ${lengthM.toLocaleString("fr-FR")} M` : ""} · GLISSER ▸ ORBITER · MOLETTE ▸ ZOOM
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CelestialObject, StarSystem } from "../types";
import { makeLabel, sizeLabel, glowTexture, starField, flyTo, makeRenderer } from "./common";

interface Props {
  system: StarSystem;
  objects: CelestialObject[];
  selected: number | null;
  onHover: (o: CelestialObject | null) => void;
  onSelect: (o: CelestialObject) => void;
  flyRequest: number;
  autoRotate: boolean;
}

/* ----- échelles ----- */
/** Rayon d'orbite scène depuis la distance en UA (compression douce pour garder les systèmes lisibles). */
const orbitR = (au: number) => 9 * Math.sqrt(Math.max(0.05, au)) + 2.5;
/** Rayon d'une planète depuis sa taille (km) — logarithmique. */
const planetR = (km: number | null) => { const k = Math.max(100, km ?? 3000); return THREE.MathUtils.clamp(0.45 + Math.log10(k / 100) * 0.65, 0.55, 2.4); };
const moonR = (size: number | null) => THREE.MathUtils.clamp(0.14 + (size ?? 0.4) * 0.22, 0.14, 0.4);

/** Couleur d'étoile selon le type spectral (Main Sequence-Dwarf-G/K/F/M…). */
function starColor(sub: string | null): { core: number; glow: string } {
  const cls = (sub ?? "").slice(-1).toUpperCase();
  switch (cls) {
    case "O": case "B": return { core: 0xbcd4ff, glow: "rgba(170,200,255,1)" };
    case "A": case "F": return { core: 0xf4f7ff, glow: "rgba(235,240,255,1)" };
    case "K": return { core: 0xffb061, glow: "rgba(255,170,90,1)" };
    case "M": return { core: 0xff6b4a, glow: "rgba(255,110,80,1)" };
    default: return { core: 0xfff0b8, glow: "rgba(255,235,170,1)" };
  }
}

/** Couleur de planète d'après l'apparence Starmap puis le sous-type. */
function planetColor(o: CelestialObject): { base: number; accent: number } {
  const sub = (o.sub ?? "").toLowerCase();
  if (sub.includes("gas")) return { base: 0xc9a46a, accent: 0xe8d2a6 };
  if (sub.includes("ice giant")) return { base: 0x7fb7e6, accent: 0xbfe3ff };
  if (sub.includes("smog")) return { base: 0x7c7a6a, accent: 0xa8a48e };
  if (sub.includes("proto")) return { base: 0x6a6f78, accent: 0x9aa0aa };
  switch (o.app) {
    case "PLANET_GREEN": return { base: 0x4f9b6c, accent: 0xa9dcb8 };
    case "PLANET_BLUE": return { base: 0x4f8fd6, accent: 0xb6d8ff };
    case "PLANET_RED": return { base: 0xb85a3c, accent: 0xe8a07a };
    case "PLANET_BROWN": return { base: 0x8a6a4a, accent: 0xc9a98a };
    case "PLANET_GASGIANT": return { base: 0xc9a46a, accent: 0xe8d2a6 };
    default: return { base: 0x8d9aa6, accent: 0xc8d2da };
  }
}

/** Texture procédurale de planète : bandes / taches selon la famille. */
function planetTexture(o: CelestialObject, seed: number): THREE.Texture {
  const { base, accent } = planetColor(o);
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  const b = new THREE.Color(base), a = new THREE.Color(accent);
  g.fillStyle = `#${b.getHexString()}`; g.fillRect(0, 0, 256, 128);
  const rnd = (() => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const gas = (o.sub ?? "").toLowerCase().includes("giant");
  if (gas) {
    for (let y = 0; y < 128; y += 2) {
      const k = 0.5 + 0.5 * Math.sin(y * 0.25 + rnd() * 2) * (0.6 + rnd() * 0.4);
      const col = b.clone().lerp(a, k * 0.6);
      g.fillStyle = `#${col.getHexString()}`; g.fillRect(0, y, 256, 2);
    }
  } else {
    for (let i = 0; i < 70; i++) {
      const col = b.clone().lerp(a, rnd() * 0.9);
      g.fillStyle = `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${0.25 + rnd() * 0.5})`;
      g.beginPath(); g.ellipse(rnd() * 256, rnd() * 128, 8 + rnd() * 40, 4 + rnd() * 18, rnd() * Math.PI, 0, Math.PI * 2); g.fill();
    }
    // calottes
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, 0, 256, 6); g.fillRect(0, 122, 256, 6);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}

const deg = THREE.MathUtils.degToRad;

export function SystemView({ system, objects, selected, onHover, onSelect, flyRequest, autoRotate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ fly: (id: number) => void; setSelected: (id: number | null) => void; setAuto: (v: boolean) => void } | null>(null);
  const cbs = useRef({ onHover, onSelect }); cbs.current = { onHover, onSelect };

  useEffect(() => {
    const el = host.current!;
    const { renderer, camera, controls } = makeRenderer(el);
    renderer.toneMappingExposure = 1.0;
    const scene = new THREE.Scene();
    scene.add(starField(2200, 600));
    controls.minDistance = 1.2; controls.maxDistance = 260;
    controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.35;

    scene.add(new THREE.AmbientLight(0x6f8fb0, 0.9));
    const fill = new THREE.DirectionalLight(0x9fc4e8, 0.7); scene.add(fill); // lumière d'appoint suivant la caméra : faces sombres lisibles
    const star = objects.find((o) => o.type === "STAR") ?? null;
    const sc = starColor(star?.sub ?? null);
    const sun = new THREE.PointLight(sc.core, 3.2, 0, 0.6); sun.position.set(0, 0, 0); scene.add(sun);

    // ----- étoile -----
    const glow = glowTexture(sc.glow, "rgba(255,200,120,0)");
    const starMesh = new THREE.Mesh(new THREE.SphereGeometry(2.0, 32, 32), new THREE.MeshBasicMaterial({ color: sc.core }));
    starMesh.userData.id = star?.id; scene.add(starMesh);
    const starHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: sc.core, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    starHalo.scale.setScalar(16); scene.add(starHalo);
    const starLabel = makeLabel(system.name, { color: "#ffffff", size: 44, sub: star?.sub ?? system.type });
    starLabel.position.set(2.6, 1.2, 0); scene.add(starLabel);

    // ----- grille du plan orbital -----
    const polar = new THREE.PolarGridHelper(orbitR(Math.max(...objects.map((o) => (o.type === "PLANET" || o.type === "JUMPPOINT" || o.type === "ASTEROID_BELT") && o.parent !== null ? o.dist ?? 0 : 0), 1)) + 6, 12, 6, 64, 0x14405a, 0x0f3048);
    (polar.material as THREE.Material).transparent = true; (polar.material as THREE.Material).opacity = 0.35; polar.position.y = -0.02;
    scene.add(polar);

    // ----- objets -----
    const byId = new Map(objects.map((o) => [o.id, o]));
    const pos = new Map<number, THREE.Vector3>();
    const radius = new Map<number, number>();
    const pick: THREE.Object3D[] = [];
    const labels: { sp: THREE.Sprite; o: CelestialObject; minor: boolean }[] = [];
    const spinners: THREE.Mesh[] = [];
    const planetsOf = (pid: number) => objects.filter((o) => o.parent === pid && (o.type === "SATELLITE" || o.type === "MANMADE"));
    const orbitLine = (r: number, center: THREE.Vector3, color: number, opacity: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(center.x + Math.cos(a) * r, center.y, center.z + Math.sin(a) * r)); }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
      scene.add(l); return l;
    };

    pos.set(star?.id ?? -1, new THREE.Vector3()); radius.set(star?.id ?? -1, 2);

    // planètes (parent = étoile) puis planètes satellites de planètes (ex. Pyro IV)
    const planets = objects.filter((o) => o.type === "PLANET");
    const placePlanet = (o: CelestialObject) => {
      const parentPos = pos.get(o.parent ?? star?.id ?? -1) ?? new THREE.Vector3();
      const isSub = o.parent !== null && o.parent !== star?.id;
      const r = isSub ? (radius.get(o.parent!) ?? 1) + 1.4 : orbitR(o.dist ?? 1);
      const a = deg(o.lon ?? 0);
      const p = new THREE.Vector3(parentPos.x + Math.cos(a) * r, 0, parentPos.z - Math.sin(a) * r);
      pos.set(o.id, p);
      const pr = isSub ? planetR(o.size) * 0.6 : planetR(o.size);
      radius.set(o.id, pr);
      orbitLine(r, parentPos, isSub ? 0x3a6f8f : 0x2f6f95, isSub ? 0.35 : 0.5);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(pr, 40, 40), new THREE.MeshStandardMaterial({ map: planetTexture(o, o.id), roughness: 0.9, metalness: 0 }));
      mesh.position.copy(p); mesh.userData.id = o.id; mesh.rotation.z = deg(12); scene.add(mesh); pick.push(mesh); spinners.push(mesh);
      // atmosphère légère
      const atm = new THREE.Mesh(new THREE.SphereGeometry(pr * 1.06, 32, 32), new THREE.MeshBasicMaterial({ color: planetColor(o).accent, transparent: true, opacity: 0.12, side: THREE.BackSide }));
      atm.position.copy(p); scene.add(atm);
      const name = o.name ?? o.des;
      const lab = makeLabel(name, { color: "#e8f3ff", size: 40, sub: `${o.des}${o.sub ? " · " + o.sub : ""}` });
      lab.position.copy(p).add(new THREE.Vector3(pr * 1.2, pr * 0.9, 0)); scene.add(lab); labels.push({ sp: lab, o, minor: false });
    };
    planets.filter((o) => o.parent === star?.id || o.parent === null).forEach(placePlanet);
    planets.filter((o) => o.parent !== null && o.parent !== star?.id).forEach(placePlanet);

    // lunes et stations autour de leur parent
    for (const p of planets) {
      const kids = planetsOf(p.id);
      const c = pos.get(p.id)!; const pr = radius.get(p.id)!;
      let i = 0;
      for (const k of kids) {
        const isMoon = k.type === "SATELLITE";
        const r = pr + 0.9 + (isMoon ? i * 0.55 : 0.5 + i * 0.3);
        const a = deg(k.lon ?? (i * 47));
        const q = new THREE.Vector3(c.x + Math.cos(a) * r, isMoon ? 0 : 0.25, c.z - Math.sin(a) * r);
        pos.set(k.id, q);
        if (isMoon) {
          orbitLine(r, c, 0x3a6f8f, 0.3);
          const mr = moonR(k.size);
          const m = new THREE.Mesh(new THREE.SphereGeometry(mr, 20, 20), new THREE.MeshStandardMaterial({ map: planetTexture(k, k.id), roughness: 1 }));
          m.position.copy(q); m.userData.id = k.id; scene.add(m); pick.push(m); spinners.push(m); radius.set(k.id, mr);
          const lab = makeLabel(k.name ?? k.des, { color: "#cfe6f7", size: 32, box: false });
          lab.position.copy(q).add(new THREE.Vector3(mr * 1.3, mr, 0)); scene.add(lab); labels.push({ sp: lab, o: k, minor: true });
        } else {
          const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: 0x5ec1ff }));
          st.position.copy(q); st.userData.id = k.id; scene.add(st); pick.push(st); radius.set(k.id, 0.2);
          const lab = makeLabel(k.name ?? k.des, { color: "#5ec1ff", size: 30, box: false });
          lab.position.copy(q).add(new THREE.Vector3(0.25, 0.2, 0)); scene.add(lab); labels.push({ sp: lab, o: k, minor: true });
        }
        i++;
      }
    }
    // stations directement autour de l'étoile (ex. Checkmate)
    for (const k of objects.filter((o) => o.type === "MANMADE" && (o.parent === star?.id || o.parent === null))) {
      const r = orbitR(k.dist ?? 1); const a = deg(k.lon ?? 0);
      const q = new THREE.Vector3(Math.cos(a) * r, 0.3, -Math.sin(a) * r); pos.set(k.id, q); radius.set(k.id, 0.25);
      const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), new THREE.MeshBasicMaterial({ color: 0x5ec1ff }));
      st.position.copy(q); st.userData.id = k.id; scene.add(st); pick.push(st);
      const lab = makeLabel(k.name ?? k.des, { color: "#5ec1ff", size: 32, sub: "STATION" });
      lab.position.copy(q).add(new THREE.Vector3(0.35, 0.3, 0)); scene.add(lab); labels.push({ sp: lab, o: k, minor: false });
    }

    // ceintures et champs d'astéroïdes
    for (const b of objects.filter((o) => o.type === "ASTEROID_BELT" || o.type === "ASTEROID_FIELD")) {
      const parentPos = pos.get(b.parent ?? -1) ?? new THREE.Vector3();
      const ringLike = (b.sub ?? "").toLowerCase().includes("ring") && b.parent !== star?.id && b.parent !== null;
      if (ringLike) {
        const pr = radius.get(b.parent!) ?? 0.5;
        const ring = new THREE.Mesh(new THREE.RingGeometry(pr * 1.4, pr * 2.2, 64), new THREE.MeshBasicMaterial({ color: 0xb9c7d6, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
        ring.position.copy(parentPos); ring.rotation.x = -Math.PI / 2 + 0.25; scene.add(ring);
        pos.set(b.id, parentPos.clone()); radius.set(b.id, pr * 2.2);
      } else if (b.type === "ASTEROID_FIELD") {
        const r = orbitR(b.dist ?? 1); const a = deg(b.lon ?? 0);
        const q = new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r); pos.set(b.id, q); radius.set(b.id, 1.2);
        const n = 220; const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 1.6); v.y *= 0.3; arr.set([q.x + v.x, q.y + v.y, q.z + v.z], i * 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaab8c6, size: 0.08, transparent: true, opacity: 0.9 })); scene.add(pts);
        const lab = makeLabel(b.name ?? b.des, { color: "#aab8c6", size: 30, box: false }); lab.position.copy(q).add(new THREE.Vector3(1.2, 0.6, 0)); scene.add(lab); labels.push({ sp: lab, o: b, minor: true });
        const pk = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ visible: false })); pk.position.copy(q); pk.userData.id = b.id; scene.add(pk); pick.push(pk);
      } else {
        const r = orbitR(b.dist ?? 1);
        const n = 900; const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; const rr = r + (Math.random() - 0.5) * 1.6; arr.set([Math.cos(a) * rr, (Math.random() - 0.5) * 0.25, Math.sin(a) * rr], i * 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaab8c6, size: 0.07, transparent: true, opacity: 0.8 })));
        const q = new THREE.Vector3(r * Math.cos(deg(b.lon ?? 20)), 0, -r * Math.sin(deg(b.lon ?? 20))); pos.set(b.id, q); radius.set(b.id, 1);
        const lab = makeLabel(b.name ?? b.des, { color: "#aab8c6", size: 30, box: false }); lab.position.copy(q).add(new THREE.Vector3(0.6, 0.5, 0)); scene.add(lab); labels.push({ sp: lab, o: b, minor: true });
        const pk = new THREE.Mesh(new THREE.TorusGeometry(r, 0.8, 6, 96), new THREE.MeshBasicMaterial({ visible: false })); pk.rotation.x = Math.PI / 2; pk.userData.id = b.id; scene.add(pk); pick.push(pk);
      }
    }

    // points de saut : losanges en périphérie
    const jpGeo = new THREE.OctahedronGeometry(0.42, 0);
    for (const j of objects.filter((o) => o.type === "JUMPPOINT")) {
      const r = orbitR(j.dist ?? 5); const a = deg(j.lon ?? 0);
      const q = new THREE.Vector3(Math.cos(a) * r, Math.sin(deg(j.lat ?? 0)) * r * 0.25, -Math.sin(a) * r); pos.set(j.id, q); radius.set(j.id, 0.5);
      const m = new THREE.Mesh(jpGeo, new THREE.MeshBasicMaterial({ color: 0xffb347, wireframe: true })); m.position.copy(q); m.userData.id = j.id; scene.add(m); pick.push(m); spinners.push(m);
      const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([q, new THREE.Vector3(q.x, 0, q.z)]), new THREE.LineBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.25 })); scene.add(drop);
      const dest = j.des.split(" - ")[1] ?? j.des;
      const lab = makeLabel(`▸ ${dest}`, { color: "#ffb347", size: 32, sub: "POINT DE SAUT" }); lab.position.copy(q).add(new THREE.Vector3(0.5, 0.4, 0)); scene.add(lab); labels.push({ sp: lab, o: j, minor: false });
    }

    // caméra initiale : vue 3/4 englobant les orbites planétaires
    const maxR = Math.max(12, ...planets.filter((p) => p.parent === star?.id || p.parent === null).map((p) => orbitR(p.dist ?? 1)));
    camera.position.set(maxR * 0.9, maxR * 0.95, maxR * 1.25); controls.target.set(0, 0, 0); controls.update();

    // ----- sélection / interaction -----
    const selRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.08, 64), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    selRing.visible = false; scene.add(selRing);
    let selectedId: number | null = selected;
    const applySel = () => {
      const p = selectedId !== null ? pos.get(selectedId) : undefined;
      selRing.visible = !!p;
      if (p) { selRing.position.copy(p); selRing.scale.setScalar((radius.get(selectedId!) ?? 0.5) * 1.9); }
    };
    applySel();

    const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    let hovered: number | null = null; let down: { x: number; y: number } | null = null;
    const hit = (ev: PointerEvent): CelestialObject | null => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(pick, false);
      if (hits.length) return byId.get(hits[0].object.userData.id) ?? null;
      let best: CelestialObject | null = null; let bestD = 16;
      for (const [id, p] of pos) {
        const o = byId.get(id); if (!o || o.type === "STAR") continue;
        const v = p.clone().project(camera);
        const d = Math.hypot((v.x + 1) / 2 * r.width - (ev.clientX - r.left), (1 - v.y) / 2 * r.height - (ev.clientY - r.top));
        if (d < bestD && v.z < 1) { bestD = d; best = o; }
      }
      return best;
    };
    const onMove = (ev: PointerEvent) => {
      const o = hit(ev); const id = o?.id ?? null;
      if (id !== hovered) { hovered = id; renderer.domElement.style.cursor = id !== null ? "pointer" : "grab"; cbs.current.onHover(o); }
    };
    const onDown = (ev: PointerEvent) => { down = { x: ev.clientX, y: ev.clientY }; };
    const onUp = (ev: PointerEvent) => {
      if (!down) return; const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 4; down = null; if (moved) return;
      const o = hit(ev); if (o) cbs.current.onSelect(o);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    let cancelFly: (() => void) | null = null;
    const fly = (id: number) => {
      const p = pos.get(id); if (!p) return;
      cancelFly?.();
      const rr = radius.get(id) ?? 0.5;
      const dist = THREE.MathUtils.clamp(rr * 5.5, 2.2, 40);
      const dir = camera.position.clone().sub(p).normalize(); if (dir.lengthSq() < 0.01) dir.set(0.6, 0.5, 0.7).normalize();
      dir.y = Math.max(dir.y, 0.35); dir.normalize();
      cancelFly = flyTo(camera, controls, p.clone().add(dir.multiplyScalar(dist)), p.clone(), 850);
    };
    api.current = { fly, setSelected: (id) => { selectedId = id; applySel(); }, setAuto: (v) => { controls.autoRotate = v; } };

    let raf = 0; let t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop); t += 0.016;
      controls.update();
      fill.position.copy(camera.position);
      const dist = camera.position.distanceTo(controls.target);
      for (const s of spinners) s.rotation.y += 0.0025;
      starHalo.scale.setScalar(15 + Math.sin(t * 1.3) * 0.8);
      sizeLabel(starLabel, camera, 0.03);
      for (const { sp, o, minor } of labels) {
        const focus = o.id === selectedId || o.id === hovered;
        const show = !minor || dist < 30 || focus;
        (sp.material as THREE.SpriteMaterial).opacity = show ? (minor && !focus ? Math.min(1, (30 - dist) / 12 + 0.2) : 1) : 0;
        sizeLabel(sp, camera, focus ? 0.03 : minor ? 0.02 : 0.024);
      }
      if (selRing.visible) { selRing.lookAt(camera.position); selRing.rotation.z = t * 0.6; }
      renderer.render(scene, camera);
    };
    loop();

    const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); cancelFly?.();
      renderer.domElement.removeEventListener("pointermove", onMove); renderer.domElement.removeEventListener("pointerdown", onDown); renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose(); renderer.dispose(); el.innerHTML = ""; api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system.code, objects]);

  useEffect(() => { api.current?.setSelected(selected); }, [selected]);
  useEffect(() => { api.current?.setAuto(autoRotate); }, [autoRotate]);
  useEffect(() => { if (selected !== null && flyRequest > 0) api.current?.fly(selected); }, [flyRequest, selected]);

  return <div ref={host} className="map-canvas" aria-label={`Système ${system.name}`} />;
}

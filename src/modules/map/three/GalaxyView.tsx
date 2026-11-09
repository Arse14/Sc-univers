import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { StarSystem, JumpPoint } from "../types";
import { PLAYABLE } from "../types";
import { makeLabel, sizeLabel, glowTexture, starField, flyTo, makeRenderer } from "./common";

/** Coordonnées Starmap (x, y, z) → scène (x à droite, z vers le haut). */
const toScene = (s: { x: number; y: number; z: number }) => new THREE.Vector3(s.x, s.z, -s.y);

interface Props {
  systems: StarSystem[];
  jumps: JumpPoint[];
  selected: string | null;            // code
  hidden: Set<string>;                // affiliations masquées
  showJumps: boolean;
  onHover: (s: StarSystem | null) => void;
  onSelect: (s: StarSystem) => void;
  onEnter: (s: StarSystem) => void;   // double-clic / bouton : ouvre la vue système
  flyRequest: number;                 // incrémenté pour (re)centrer sur `selected`
}

export function GalaxyView({ systems, jumps, selected, hidden, showJumps, onHover, onSelect, onEnter, flyRequest }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ fly: (code: string) => void; setHidden: (h: Set<string>) => void; setSelected: (c: string | null) => void; setJumps: (v: boolean) => void } | null>(null);
  const cbs = useRef({ onHover, onSelect, onEnter });
  cbs.current = { onHover, onSelect, onEnter };

  useEffect(() => {
    const el = host.current!;
    const { renderer, camera, controls } = makeRenderer(el);
    const scene = new THREE.Scene();
    scene.add(starField(3000, 700));
    controls.minDistance = 8; controls.maxDistance = 420;
    controls.autoRotate = false;

    const byId = new Map(systems.map((s) => [s.id, s]));
    const center = systems.reduce((a, s) => a.add(toScene(s)), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, systems.length));
    camera.position.copy(center).add(new THREE.Vector3(0, 150, 170));
    controls.target.copy(center);

    // ----- plan galactique : grille fine -----
    const grid = new THREE.GridHelper(400, 40, 0x1c4a66, 0x10324a);
    grid.position.set(center.x, center.y - 0.01, center.z);
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    // ----- systèmes -----
    const glow = glowTexture();
    const group = new THREE.Group(); scene.add(group);
    const pick: THREE.Mesh[] = [];
    const nodes = new Map<string, { s: StarSystem; core: THREE.Mesh; halo: THREE.Sprite; label: THREE.Sprite; ring?: THREE.Mesh; drop: THREE.Line }>();
    const ringGeo = new THREE.RingGeometry(1.6, 1.85, 48);
    for (const s of systems) {
      const p = toScene(s);
      const col = new THREE.Color(s.color);
      const r = 0.55 + Math.min(1, s.pop / 10) * 0.9 + (PLAYABLE.has(s.code) ? 0.3 : 0);
      const core = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), new THREE.MeshBasicMaterial({ color: col }));
      core.position.copy(p); core.userData.code = s.code; group.add(core); pick.push(core);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: col, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.copy(p); halo.scale.setScalar(r * 7); group.add(halo);
      // ligne de rappel vers le plan (lecture de la hauteur, comme sur la Starmap)
      const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, new THREE.Vector3(p.x, center.y, p.z)]), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.18 }));
      group.add(drop);
      const label = makeLabel(s.name, { color: PLAYABLE.has(s.code) ? "#ffffff" : "#cfe6f7", size: 40, sub: PLAYABLE.has(s.code) ? "JOUABLE" : undefined });
      label.position.copy(p).add(new THREE.Vector3(r * 1.4, r * 0.6, 0)); group.add(label);
      let ring: THREE.Mesh | undefined;
      if (PLAYABLE.has(s.code)) {
        ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x4fb3ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
        ring.position.copy(p); ring.scale.setScalar(r); group.add(ring);
      }
      nodes.set(s.code, { s, core, halo, label, ring, drop });
    }

    // ----- routes de saut -----
    const jumpGroup = new THREE.Group(); scene.add(jumpGroup);
    const jumpLines: { j: JumpPoint; line: THREE.Line }[] = [];
    for (const j of jumps) {
      const a = byId.get(j.from), b = byId.get(j.to);
      if (!a || !b) continue;
      const op = j.size === "L" ? 0.55 : j.size === "M" ? 0.38 : 0.22;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([toScene(a), toScene(b)]), new THREE.LineBasicMaterial({ color: 0x7ec4e8, transparent: true, opacity: op }));
      line.userData.base = op;
      jumpGroup.add(line); jumpLines.push({ j, line });
    }

    // ----- sélection -----
    const selRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 64), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    selRing.visible = false; scene.add(selRing);
    let selectedCode: string | null = selected;
    let hiddenAff = new Set(hidden);
    let jumpsOn = showJumps;

    const applyVisibility = () => {
      for (const n of nodes.values()) {
        const vis = !hiddenAff.has(n.s.aff);
        n.core.visible = n.halo.visible = n.label.visible = n.drop.visible = vis;
        if (n.ring) n.ring.visible = vis;
      }
      for (const { j, line } of jumpLines) {
        const a = byId.get(j.from)!, b = byId.get(j.to)!;
        line.visible = jumpsOn && !hiddenAff.has(a.aff) && !hiddenAff.has(b.aff);
        const touches = selectedCode && (a.code === selectedCode || b.code === selectedCode);
        (line.material as THREE.LineBasicMaterial).opacity = touches ? 1 : (selectedCode ? line.userData.base * 0.45 : line.userData.base);
        (line.material as THREE.LineBasicMaterial).color.set(touches ? 0xffb347 : 0x7ec4e8);
      }
      const n = selectedCode ? nodes.get(selectedCode) : null;
      selRing.visible = !!n;
      if (n) { selRing.position.copy(n.core.position); selRing.scale.setScalar((n.core.geometry as THREE.SphereGeometry).parameters.radius * 2.4); }
    };
    applyVisibility();

    // ----- interaction -----
    const ray = new THREE.Raycaster(); ray.params.Points = { threshold: 1 };
    const mouse = new THREE.Vector2();
    let hovered: string | null = null;
    let down: { x: number; y: number } | null = null;
    let lastClick = 0;
    const hit = (ev: PointerEvent): StarSystem | null => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      // tolérance : on grossit virtuellement les cibles selon la distance
      const hits = ray.intersectObjects(pick.filter((m) => m.visible), false);
      if (hits.length) return nodes.get(hits[0].object.userData.code)?.s ?? null;
      // seconde passe : distance écran
      let best: StarSystem | null = null; let bestD = 18;
      for (const n of nodes.values()) {
        if (!n.core.visible) continue;
        const v = n.core.position.clone().project(camera);
        const sx = (v.x + 1) / 2 * r.width, sy = (1 - v.y) / 2 * r.height;
        const d = Math.hypot(sx - (ev.clientX - r.left), sy - (ev.clientY - r.top));
        if (d < bestD && v.z < 1) { bestD = d; best = n.s; }
      }
      return best;
    };
    const onMove = (ev: PointerEvent) => {
      const s = hit(ev);
      const code = s?.code ?? null;
      if (code !== hovered) {
        hovered = code;
        renderer.domElement.style.cursor = code ? "pointer" : "grab";
        cbs.current.onHover(s);
        for (const n of nodes.values()) (n.halo.material as THREE.SpriteMaterial).opacity = n.s.code === code ? 1 : 0.55;
      }
    };
    const onDown = (ev: PointerEvent) => { down = { x: ev.clientX, y: ev.clientY }; };
    const onUp = (ev: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 4; down = null;
      if (moved) return;
      const s = hit(ev);
      if (!s) return;
      const now = performance.now();
      if (now - lastClick < 350 && selectedCode === s.code) { cbs.current.onEnter(s); return; }
      lastClick = now;
      cbs.current.onSelect(s);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    let cancelFly: (() => void) | null = null;
    const fly = (code: string) => {
      const n = nodes.get(code); if (!n) return;
      cancelFly?.();
      const target = n.core.position.clone();
      const dir = camera.position.clone().sub(controls.target).normalize();
      const pos = target.clone().add(dir.multiplyScalar(26)).add(new THREE.Vector3(0, 6, 0));
      cancelFly = flyTo(camera, controls, pos, target, 900);
    };

    api.current = {
      fly,
      setHidden: (h) => { hiddenAff = new Set(h); applyVisibility(); },
      setSelected: (c) => { selectedCode = c; applyVisibility(); },
      setJumps: (v) => { jumpsOn = v; applyVisibility(); },
    };

    // ----- boucle -----
    let raf = 0; let t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      controls.update();
      const dist = camera.position.distanceTo(controls.target);
      for (const n of nodes.values()) {
        if (!n.label.visible && !hiddenAff.has(n.s.aff)) n.label.visible = true;
        // étiquettes : toujours pour les jouables et les très peuplés ; les autres quand on s'approche
        const major = PLAYABLE.has(n.s.code) || n.s.pop >= 8.6 || n.s.code === selectedCode || n.s.code === hovered;
        const show = major || dist < 120;
        (n.label.material as THREE.SpriteMaterial).opacity = show ? (major ? 1 : Math.min(1, (120 - dist) / 50)) : 0;
        sizeLabel(n.label, camera, n.s.code === selectedCode || n.s.code === hovered ? 0.028 : 0.022);
        if (n.ring) { n.ring.lookAt(camera.position); n.ring.scale.setScalar((n.core.geometry as THREE.SphereGeometry).parameters.radius * (1 + 0.08 * Math.sin(t * 2.2))); }
      }
      if (selRing.visible) { selRing.lookAt(camera.position); selRing.rotation.z = t * 0.6; }
      renderer.render(scene, camera);
    };
    loop();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); cancelFly?.();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose(); renderer.dispose(); el.innerHTML = "";
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systems, jumps]);

  useEffect(() => { api.current?.setSelected(selected); }, [selected]);
  useEffect(() => { api.current?.setHidden(hidden); }, [hidden]);
  useEffect(() => { api.current?.setJumps(showJumps); }, [showJumps]);
  useEffect(() => { if (selected && flyRequest > 0) api.current?.fly(selected); }, [flyRequest, selected]);

  return <div ref={host} className="map-canvas" aria-label="Carte de la galaxie" />;
}

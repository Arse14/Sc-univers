import * as THREE from "three";

/** Palette matière du HOTAS schématique : noir mat, gris métal, accents bleus lumineux. */
export const MAT = {
  body: new THREE.MeshStandardMaterial({ color: 0x262c34, roughness: 0.55, metalness: 0.35 }),
  bodyLight: new THREE.MeshStandardMaterial({ color: 0x3a434d, roughness: 0.5, metalness: 0.4 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.9, metalness: 0.05 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8b949c, roughness: 0.35, metalness: 0.85 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x3a4149, roughness: 0.4, metalness: 0.8 }),
  button: new THREE.MeshStandardMaterial({ color: 0x2b333c, roughness: 0.45, metalness: 0.45 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x1a7fb5, emissive: 0x1aa0e6, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.2 }),
  led: new THREE.MeshStandardMaterial({ color: 0x62d0ff, emissive: 0x62d0ff, emissiveIntensity: 1.6, roughness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x0a0f14, roughness: 0.15, metalness: 0.6 }),
};

export const SELECT_EMISSIVE = new THREE.Color(0xff9d2e);
export const HOVER_EMISSIVE = new THREE.Color(0x62d0ff);

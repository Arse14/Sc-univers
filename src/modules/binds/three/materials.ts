import * as THREE from "three";

/**
 * Matières du X56 : plastique noir texturé, inserts aluminium brossé,
 * chrome des inverseurs, LED bleu cyan (éclairage d'usine du X56).
 */
export const MAT = {
  /** Plastique noir mat du corps (socle, poignées). */
  body: new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: 0.72, metalness: 0.12 }),
  /** Plastique noir légèrement plus clair pour les plateaux. */
  panel: new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.6, metalness: 0.2 }),
  /** Plastique noir satiné (têtes de hats, capuchons). */
  plastic: new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.55, metalness: 0.1 }),
  /** Caoutchouc du soufflet. */
  rubber: new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.95, metalness: 0 }),
  /** Aluminium brossé (plaques, boutons A/B/E/H/I, molettes F/G). */
  alu: new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.38, metalness: 0.9 }),
  /** Aluminium moleté (facettes visibles). */
  knurl: new THREE.MeshStandardMaterial({ color: 0xb9bfc6, roughness: 0.45, metalness: 0.9, flatShading: true }),
  /** Chrome des leviers d'inverseurs et des arceaux. */
  chrome: new THREE.MeshStandardMaterial({ color: 0xe6eaee, roughness: 0.18, metalness: 1.0 }),
  /** Gris foncé métallique (gâchette, adaptateur de twist). */
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.45, metalness: 0.8 }),
  /** Gris clair imprimé (bandes décoratives, graduations). */
  print: new THREE.MeshStandardMaterial({ color: 0xaab0b6, roughness: 0.8, metalness: 0.1 }),
  /** Noir brillant (cuvette du cardan). */
  gloss: new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.12, metalness: 0.7 }),
  /** LED bleu cyan du X56. */
  led: new THREE.MeshStandardMaterial({ color: 0x3ec6ff, emissive: 0x2fb8ff, emissiveIntensity: 2.2, roughness: 0.3 }),
  /** Anneaux lumineux imprimés (moins intenses). */
  ledRing: new THREE.MeshStandardMaterial({ color: 0x2aa8e8, emissive: 0x1e9fe6, emissiveIntensity: 1.4, roughness: 0.5 }),
  /** Métal teinté bleu (molette G éclairée). */
  aluLit: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x1c7fc0, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.8 }),
};

export const SELECT_EMISSIVE = new THREE.Color(0xff9d2e);
export const HOVER_EMISSIVE = new THREE.Color(0x62d0ff);

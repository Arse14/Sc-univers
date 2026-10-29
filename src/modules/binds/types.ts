/** Types du module Binds. */

export type ControlKind = "button" | "hat" | "axis" | "ministick" | "slider";

/** Une commande physique lue dans le profil Logitech (.pr0). */
export interface DeviceControl {
  id: string;            // identifiant stable, ex. "stick:0x00090006"
  name: string;          // nom tel qu'affiché par le logiciel Logitech ("Pinky", "H1", "SW 1"…)
  kind: ControlKind;
  hid: string | null;    // code HID du profil, ex. "0x00090006"
  /** Index de bouton déduit du code HID (usage 0x0009xxxx → numéro xxxx), base 1. */
  buttonIndex: number | null;
  /** Sous-commandes (directions d'un hat, boutons d'un sélecteur, axes d'un mini-stick). */
  children?: DeviceControl[];
}

/** Un appareil physique (stick, throttle…). */
export interface Device {
  id: string;          // "stick", "throttle"…
  name: string;        // "Stick", "Throttle"
  group: string;       // "X-56 Control System"
  controls: DeviceControl[];
}

/** Position d'une commande sur l'image de l'appareil, en fraction (0–1) de la largeur/hauteur. */
export interface Placement {
  x: number;
  y: number;
}

/** Réglages persistés d'un appareil : image, slot js, positions. */
export interface DeviceConfig {
  /** Numéro d'instance joystick côté Star Citizen (js1, js2…). */
  jsSlot: number | null;
  /** Chemin de l'image importée (dans le dossier de l'application). */
  imagePath: string | null;
  placements: Record<string, Placement>;
}

/** Une entrée Star Citizen (ex. "js1_button6") et les actions qui lui sont liées. */
export interface ScBinding {
  input: string;       // "js1_button6", "js2_rotx", "js1_hat1_up"
  js: number;          // 1, 2…
  element: string;     // "button6", "rotx", "hat1_up"
  actionmap: string;   // "spaceship_weapons"
  action: string;      // "v_weapon_launch_missile"
  activationMode?: string;
  multiTap?: number;
}

export interface ScJoystickOption {
  instance: number;
  product: string;
}

export interface ActionMaps {
  joysticks: ScJoystickOption[];
  bindings: ScBinding[];
}

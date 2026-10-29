/**
 * Correspondance entre une commande physique (profil Logitech) et les
 * entrées que Star Citizen écrit dans actionmaps.xml (`js1_button6`…).
 *
 * Déduite des codes HID du profil :
 *  - page 0x0009 (Button)         : 0x0009000N → jsX_buttonN
 *  - page 0x0001 (Generic Desktop) : 0x30 X, 0x31 Y, 0x32 Z, 0x33 Rx, 0x34 Ry,
 *                                    0x35 Rz, 0x36 Slider, 0x37 Dial, 0x39 Hat switch
 *  - un hat Logitech (H1…H4) est vu comme 4 boutons consécutifs ; seul le POV
 *    est un vrai hat (`jsX_hat1_up` …).
 *
 * L'ordre des directions des hats-boutons et les noms d'axes slider/dial
 * sont des hypothèses : la détection de touche sert à les confirmer.
 */
import type { DeviceControl } from "./types";
import { buttonIndexFromHid } from "./parsePr0";

export interface SubInput {
  label: string;   // "▲ HAUT", "AXE X", "MODE 1"…
  input: string;   // "js1_button7"
  deduced: boolean;
}

const AXIS_BY_USAGE: Record<string, string> = {
  "30": "x", "31": "y", "32": "z", "33": "rotx", "34": "roty", "35": "rotz", "36": "slider1", "37": "slider2",
};

function axisName(hid: string | null): string | null {
  const m = /^0x0001([0-9a-f]{4})$/i.exec(hid ?? "");
  if (!m) return null;
  const usage = m[1].slice(2).toLowerCase();
  return AXIS_BY_USAGE[usage] ?? null;
}

const HAT_DIRS = ["▲ HAUT", "▶ DROITE", "▼ BAS", "◀ GAUCHE"];

/** Entrées SC d'une commande, sous-commandes comprises. */
export function inputsForControl(js: number, c: DeviceControl): SubInput[] {
  const p = `js${js}_`;
  const out: SubInput[] = [];

  if (c.kind === "button" && c.buttonIndex) {
    out.push({ label: c.name.toUpperCase(), input: `${p}button${c.buttonIndex}`, deduced: false });
  } else if (c.kind === "hat") {
    if (/^0x0001/i.test(c.hid ?? "")) {
      HAT_DIRS.forEach((d, i) => out.push({ label: d, input: `${p}hat1_${["up", "right", "down", "left"][i]}`, deduced: false }));
    } else {
      const base = buttonIndexFromHid(c.hid);
      if (base) HAT_DIRS.forEach((d, i) => out.push({ label: d, input: `${p}button${base + i}`, deduced: true }));
    }
  } else if (c.kind === "axis") {
    const a = axisName(c.hid);
    if (a) out.push({ label: c.name.toUpperCase(), input: `${p}${a}`, deduced: /slider/.test(a) });
  }

  for (const child of c.children ?? []) {
    for (const s of inputsForControl(js, child)) out.push({ ...s, label: child.name.toUpperCase() + (s.label !== child.name.toUpperCase() ? " " + s.label : "") });
  }
  return out;
}

/** Première entrée « principale » d'une commande (pour l'affichage court). */
export function primaryInput(js: number, c: DeviceControl): string {
  const list = inputsForControl(js, c);
  if (list.length === 0) return "—";
  if (list.length === 1) return list[0].input;
  const first = list[0].input;
  const last = list[list.length - 1].input;
  return `${first} … ${last.replace(`js${js}_`, "")}`;
}

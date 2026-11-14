/**
 * Catalogue des actions de Star Citizen (Alpha 4.10.2).
 *
 * Généré depuis `defaultProfile.xml` du jeu (liste des actions, binds par
 * défaut, modes d'activation) et la traduction française communautaire
 * SCEFRA (libellés). 33 groupes, 691 actions.
 */
import raw from "./actions.json";

export interface ScAction {
  map: string;        // actionmap (spaceship_movement…)
  name: string;       // v_pitch
  label: string;      // Tangage
  desc?: string;
  defJs?: string;     // bind joystick par défaut (button2, x…)
  defKb?: string;     // bind clavier par défaut
  mode?: string;      // activationMode
  axis: boolean;      // action analogique (attend un axe)
}
export interface ScActionMap { name: string; label: string; category: string; actions: ScAction[] }

interface RawAction { n: string; l: string; d?: string; j?: string; k?: string; m?: string; x?: number }
interface RawMap { n: string; l: string; c: string; a: RawAction[] }

export const GAME_VERSION: string = (raw as { version: string }).version;

export const ACTION_MAPS: ScActionMap[] = (raw as { maps: RawMap[] }).maps.map((m) => ({
  name: m.n, label: m.l, category: m.c,
  actions: m.a.map((a) => ({ map: m.n, name: a.n, label: a.l, desc: a.d, defJs: a.j, defKb: a.k, mode: a.m, axis: !!a.x })),
}));

export const MAP_BY_NAME = new Map(ACTION_MAPS.map((m) => [m.name, m]));
const BY_KEY = new Map<string, ScAction>();
const BY_NAME = new Map<string, ScAction>();
for (const m of ACTION_MAPS) for (const a of m.actions) { BY_KEY.set(`${m.name}/${a.name}`, a); if (!BY_NAME.has(a.name)) BY_NAME.set(a.name, a); }

/** Action par nom ; l'actionmap lève l'ambiguïté quand le même nom existe dans plusieurs groupes. */
export function findAction(name: string, map?: string): ScAction | undefined {
  return (map ? BY_KEY.get(`${map}/${name}`) : undefined) ?? BY_NAME.get(name);
}

/** Grandes familles pour filtrer le sélecteur. */
export const FAMILIES: { id: string; label: string; test: (m: ScActionMap) => boolean }[] = [
  { id: "flight", label: "Vol", test: (m) => /^spaceship_(movement|quantum|docking|general|view|hud|power|radar|target_hailing)$|^seat_general$|^lights_controller$|^vehicle_mfd$/.test(m.name) },
  { id: "combat", label: "Combat", test: (m) => /^spaceship_(weapons|missiles|defensive|targeting|targeting_advanced)$|^turret_/.test(m.name) },
  { id: "industry", label: "Minage · Recyclage · Scan", test: (m) => /^spaceship_(mining|salvage|scanning)$/.test(m.name) },
  { id: "ground", label: "Véhicules terrestres", test: (m) => /^vehicle_(general|driver)$/.test(m.name) },
  { id: "foot", label: "À pied · EVA", test: (m) => /^(player|prone|tractor_beam|zero_gravity_eva|zero_gravity_traversal|player_choice)$/.test(m.name) },
  { id: "social", label: "Social", test: (m) => /^(default|ui_notification|player_emotes)$/.test(m.name) },
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Recherche plein texte (libellé, nom technique, groupe), insensible aux accents. */
export function searchActions(query: string, opts: { family?: string; axis?: boolean | null } = {}): ScAction[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const fam = FAMILIES.find((f) => f.id === opts.family);
  const out: ScAction[] = [];
  for (const m of ACTION_MAPS) {
    if (fam && !fam.test(m)) continue;
    const ml = fold(m.label);
    for (const a of m.actions) {
      if (opts.axis === true && !a.axis) continue;
      if (opts.axis === false && a.axis) continue;
      if (words.length) {
        const hay = `${fold(a.label)} ${a.name} ${ml}`;
        if (!words.every((w) => hay.includes(w))) continue;
      }
      out.push(a);
    }
  }
  return out;
}

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

/**
 * Domaines : la démarcation affichée partout (catalogue, sélecteur, registre).
 * Chaque groupe du jeu (actionmap) appartient à un seul domaine, avec sa couleur.
 */
export interface Domain { id: string; label: string; hint: string; color: string; maps: string[] }
export const DOMAINS: Domain[] = [
  { id: "move", label: "Déplacement", hint: "Piloter : tangage, lacet, roulis, poussée, vitesse, quantique, amarrage.", color: "#4fb3ff", maps: ["spaceship_movement", "spaceship_quantum", "spaceship_docking"] },
  { id: "weapons", label: "Armement", hint: "Tirer : canons, groupes d'armes, cardans, missiles et torpilles.", color: "#ff6b5a", maps: ["spaceship_weapons", "spaceship_missiles"] },
  { id: "target", label: "Ciblage", hint: "Verrouiller, changer et faire défiler les cibles.", color: "#ffb347", maps: ["spaceship_targeting", "spaceship_targeting_advanced"] },
  { id: "defense", label: "Défense", hint: "Boucliers, leurres et contre-mesures.", color: "#b58cff", maps: ["spaceship_defensive"] },
  { id: "cockpit", label: "Cockpit et systèmes", hint: "Allumage, puissance, écrans MFD, HUD, phares, radar, communication, sièges.", color: "#50dc8c", maps: ["spaceship_general", "seat_general", "vehicle_mfd", "spaceship_power", "spaceship_hud", "lights_controller", "spaceship_radar", "spaceship_target_hailing"] },
  { id: "view", label: "Vue et caméra", hint: "Regarder autour de soi, zoom, vue extérieure.", color: "#62d0ff", maps: ["spaceship_view"] },
  { id: "turret", label: "Tourelles", hint: "Commandes propres au poste de tourelle.", color: "#e8d23a", maps: ["turret_movement", "turret_advanced"] },
  { id: "industry", label: "Minage · Recyclage · Scan", hint: "Laser de minage, rayons de recyclage, scanner.", color: "#d99a5b", maps: ["spaceship_mining", "spaceship_salvage", "spaceship_scanning"] },
  { id: "ground", label: "Véhicules terrestres", hint: "Conduite et commandes des véhicules au sol.", color: "#9fb7c9", maps: ["vehicle_general", "vehicle_driver"] },
  { id: "foot", label: "À pied", hint: "Se déplacer, tirer, interagir, rayon tracteur à main.", color: "#7fd6c2", maps: ["player", "prone", "tractor_beam", "player_choice"] },
  { id: "eva", label: "EVA", hint: "Déplacement en apesanteur hors du vaisseau.", color: "#8aa4ff", maps: ["zero_gravity_eva", "zero_gravity_traversal"] },
  { id: "social", label: "Social", hint: "Invitations, notifications et émotes.", color: "#f08fc0", maps: ["default", "ui_notification", "player_emotes"] },
];
const OTHER: Domain = { id: "other", label: "Autres", hint: "", color: "#8fa3b3", maps: [] };
const DOMAIN_OF = new Map<string, Domain>();
for (const d of DOMAINS) for (const m of d.maps) DOMAIN_OF.set(m, d);
/** Domaine d'un groupe du jeu (actionmap). */
export const domainOf = (map: string): Domain => DOMAIN_OF.get(map) ?? OTHER;

/** Ancien nom, gardé pour le sélecteur : mêmes entrées que les domaines. */
export const FAMILIES: { id: string; label: string; test: (m: ScActionMap) => boolean }[] = DOMAINS.map((d) => ({ id: d.id, label: d.label, test: (m: ScActionMap) => d.maps.includes(m.name) }));

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

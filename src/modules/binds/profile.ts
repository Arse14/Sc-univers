/**
 * Édition des binds joystick et export vers Star Citizen.
 *
 * Le jeu ne relit pas `actionmaps.xml` à chaud et le réécrit à sa guise :
 * on n'y touche jamais. À la place, on produit un « profil de contrôle »
 * dans `user/client/0/controls/mappings/`, que le jeu sait importer
 * (Options ▸ Raccourcis ▸ Personnalisation avancée ▸ Profils de contrôle).
 *
 * Règles du jeu reproduites ici :
 *  - une action n'a qu'un seul bind joystick à la fois ;
 *  - plusieurs actions peuvent partager la même touche ;
 *  - un bind vidé s'écrit `input="jsN_ "` (sinon le bind par défaut revient).
 */
import type { ScBinding, ScJoystickOption } from "./types";

export const AXIS_ELEMENT = /^(x|y|z|rotx|roty|rotz|slider\d+|throttlez)$/;
export const isAxisInput = (input: string) => AXIS_ELEMENT.test(input.replace(/^js\d+_/, ""));

const key = (b: { actionmap: string; action: string }) => `${b.actionmap}/${b.action}`;

/** Lie `action` à `input` ; renvoie la nouvelle liste et, le cas échéant, l'ancienne touche de l'action. */
export function assign(list: ScBinding[], actionmap: string, action: string, input: string): { next: ScBinding[]; movedFrom: string | null } {
  const m = /^js(\d+)_(.+)$/.exec(input);
  if (!m) return { next: list, movedFrom: null };
  const prev = list.find((b) => key(b) === `${actionmap}/${action}`);
  const entry: ScBinding = { input, js: Number(m[1]), element: m[2], actionmap, action, activationMode: prev?.activationMode, multiTap: prev?.multiTap };
  const next = list.filter((b) => key(b) !== `${actionmap}/${action}`);
  next.push(entry);
  return { next, movedFrom: prev && !prev.cleared && prev.input !== input ? prev.input : null };
}

/** Retire le bind joystick d'une action (il est marqué « vidé » pour que le défaut ne revienne pas). */
export function unassign(list: ScBinding[], actionmap: string, action: string): ScBinding[] {
  return list.map((b) => key(b) === `${actionmap}/${action}` ? { ...b, input: `js${b.js}_`, element: "", cleared: true } : b);
}

export interface BindDiff { added: ScBinding[]; removed: ScBinding[]; moved: { from: ScBinding; to: ScBinding }[] }

/** Écart entre les binds du jeu (actionmaps.xml) et la version en cours d'édition. */
export function diff(original: ScBinding[], current: ScBinding[]): BindDiff {
  const o = new Map(original.map((b) => [key(b), b]));
  const c = new Map(current.map((b) => [key(b), b]));
  const d: BindDiff = { added: [], removed: [], moved: [] };
  for (const [k, b] of c) {
    const prev = o.get(k);
    const wasBound = !!prev && !prev.cleared;
    if (b.cleared) { if (wasBound) d.removed.push(prev!); continue; }
    if (!wasBound) d.added.push(b);
    else if (prev!.input !== b.input) d.moved.push({ from: prev!, to: b });
  }
  for (const [k, b] of o) if (!c.has(k) && !b.cleared) d.removed.push(b);
  return d;
}
export const diffCount = (d: BindDiff) => d.added.length + d.removed.length + d.moved.length;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Produit le XML d'un profil de contrôle (binds joystick uniquement). */
export function toMappingXml(name: string, bindings: ScBinding[], joysticks: ScJoystickOption[]): string {
  const instances = new Set<number>([...joysticks.map((j) => j.instance), ...bindings.map((b) => b.js)]);
  const sorted = [...instances].filter((n) => n > 0).sort((a, b) => a - b);
  const maps = new Map<string, ScBinding[]>();
  for (const b of bindings) { const l = maps.get(b.actionmap) ?? []; l.push(b); maps.set(b.actionmap, l); }
  const out: string[] = [];
  out.push(`<ActionMaps version="1" optionsVersion="2" rebindVersion="2" profileName="${esc(name)}">`);
  out.push(` <CustomisationUIHeader label="${esc(name)}" description="Binds joystick exportés par SC-Univers" image="">`);
  out.push("  <devices>");
  for (const n of sorted) out.push(`   <joystick instance="${n}"/>`);
  out.push("  </devices>");
  out.push(" </CustomisationUIHeader>");
  for (const n of sorted) {
    const product = joysticks.find((j) => j.instance === n)?.product;
    out.push(product ? ` <options type="joystick" instance="${n}" Product="${esc(product)}"/>` : ` <options type="joystick" instance="${n}"/>`);
  }
  out.push(" <modifiers />");
  for (const [map, list] of [...maps].sort((a, b) => a[0].localeCompare(b[0]))) {
    out.push(` <actionmap name="${esc(map)}">`);
    for (const b of list.sort((a, c) => a.action.localeCompare(c.action))) {
      const attrs = [`input="${b.cleared ? `js${b.js}_ ` : esc(b.input)}"`];
      if (!b.cleared && b.activationMode) attrs.push(`activationMode="${esc(b.activationMode)}"`);
      if (!b.cleared && b.multiTap) attrs.push(`multiTap="${b.multiTap}"`);
      out.push(`  <action name="${esc(b.action)}">`);
      out.push(`   <rebind ${attrs.join(" ")}/>`);
      out.push("  </action>");
    }
    out.push(" </actionmap>");
  }
  out.push("</ActionMaps>");
  return out.join("\r\n") + "\r\n";
}

/** `…\user\client\0\Profiles\default\actionmaps.xml` → `…\user\client\0\controls\mappings\<name>.xml`. */
export function mappingPathFor(actionmapsPath: string, fileName: string): string | null {
  const m = /^(.*[\\/]user[\\/]client[\\/]0)[\\/]profiles[\\/]default[\\/]actionmaps\.xml$/i.exec(actionmapsPath);
  if (!m) return null;
  const sep = actionmapsPath.includes("\\") ? "\\" : "/";
  return `${m[1]}${sep}controls${sep}mappings${sep}${fileName}.xml`;
}

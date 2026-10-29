/**
 * Parseur des profils Logitech / Saitek (.pr0).
 *
 * Le format est un arbre de crochets :
 *   [profile=Untitled version=0x00000005
 *     [controllers
 *       [controller=<uuid> group='X-56 Control System'
 *         [member=<uuid> name=Stick shortname=Stick]
 *         [controls
 *           [button=0x00090001 name=Trigger]
 *           [hat=0x00090007 name=H1]
 *           [slider name=Mode
 *             [button=0x0009000F name='Mode 1' latchable=false]]
 *           [ministick=0x00090004 name='C Stick'
 *             [button=0x00090004 name='C Stick Click']
 *             [axis=0x00010033 name='C Stick X']]]
 *         [shifts …]]]]
 *
 * On ne lit que la partie `controls` de chaque contrôleur ; les
 * assignations (`shifts`, macros…) ne nous servent pas, Star Citizen
 * voyant les boutons bruts.
 */
import type { ControlKind, Device, DeviceControl } from "./types";

interface Node {
  tag: string;                 // "button", "hat", "controller"…
  value: string | null;        // ce qui suit "tag=" s'il y a un "="
  attrs: Record<string, string>;
  children: Node[];
}

/** Découpe le texte en arbre de nœuds. */
function parseTree(text: string): Node {
  const root: Node = { tag: "root", value: null, attrs: {}, children: [] };
  const stack: Node[] = [root];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (ch === "[") {
      // lecture de l'en-tête jusqu'au prochain "[" ou "]" hors quotes
      let j = i + 1;
      let quote: string | null = null;
      while (j < n) {
        const c = text[j];
        if (quote) { if (c === quote) quote = null; }
        else if (c === "'" || c === '"') quote = c;
        else if (c === "[" || c === "]") break;
        j++;
      }
      const head = text.slice(i + 1, j).trim();
      const node = parseHead(head);
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      i = j;
    } else if (ch === "]") {
      if (stack.length > 1) stack.pop();
      i++;
    } else {
      i++;
    }
  }
  return root;
}

/** "button=0x00090001 name='Mode 1' latchable=false" → nœud. */
function parseHead(head: string): Node {
  const tokens: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const c of head) {
    if (quote) { if (c === quote) quote = null; else cur += c; }
    else if (c === "'" || c === '"') quote = c;
    else if (/\s/.test(c)) { if (cur) { tokens.push(cur); cur = ""; } }
    else cur += c;
  }
  if (cur) tokens.push(cur);

  const [first = "", ...rest] = tokens;
  const eq = first.indexOf("=");
  const tag = eq >= 0 ? first.slice(0, eq) : first;
  const value = eq >= 0 ? first.slice(eq + 1) : null;
  const attrs: Record<string, string> = {};
  for (const t of rest) {
    const k = t.indexOf("=");
    if (k > 0) attrs[t.slice(0, k)] = t.slice(k + 1);
  }
  return { tag, value, attrs, children: [] };
}

const KINDS: ControlKind[] = ["button", "hat", "axis", "ministick", "slider"];

/** Code HID 0x0009xxxx = usage page « Button », xxxx = numéro du bouton (base 1). */
export function buttonIndexFromHid(hid: string | null): number | null {
  if (!hid) return null;
  const m = /^0x([0-9a-f]{4})([0-9a-f]{4})$/i.exec(hid);
  if (!m) return null;
  if (m[1].toLowerCase() !== "0009") return null;
  return parseInt(m[2], 16);
}

function toControl(node: Node, deviceId: string): DeviceControl {
  const kind = node.tag as ControlKind;
  const hid = node.value && /^0x/i.test(node.value) ? node.value : null;
  const name = node.attrs.name ?? node.tag;
  const children = node.children.filter((c) => KINDS.includes(c.tag as ControlKind)).map((c) => toControl(c, deviceId));
  return {
    id: `${deviceId}:${hid ?? name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    kind,
    hid,
    buttonIndex: kind === "button" ? buttonIndexFromHid(hid) : null,
    children: children.length ? children : undefined,
  };
}

/** Lit un fichier .pr0 et renvoie ses appareils. */
export function parsePr0(text: string): Device[] {
  const root = parseTree(text);
  const profile = root.children.find((c) => c.tag === "profile") ?? root;
  const controllers = profile.children.find((c) => c.tag === "controllers")?.children ?? [];

  return controllers
    .filter((c) => c.tag === "controller")
    .map((ctrl) => {
      const member = ctrl.children.find((c) => c.tag === "member");
      const name = member?.attrs.name ?? "Appareil";
      const id = (member?.attrs.shortname ?? name).toLowerCase().replace(/\s+/g, "_");
      const controlsNode = ctrl.children.find((c) => c.tag === "controls");
      const controls = (controlsNode?.children ?? [])
        .filter((c) => KINDS.includes(c.tag as ControlKind))
        .map((c) => toControl(c, id));
      return { id, name, group: ctrl.attrs.group ?? "", controls };
    });
}

/** Compte les boutons et axes d'un appareil, sous-commandes comprises. */
export function countControls(device: Device): { buttons: number; axes: number } {
  let buttons = 0;
  let axes = 0;
  const walk = (c: DeviceControl) => {
    if (c.kind === "button") buttons++;
    if (c.kind === "axis") axes++;
    c.children?.forEach(walk);
  };
  device.controls.forEach(walk);
  return { buttons, axes };
}

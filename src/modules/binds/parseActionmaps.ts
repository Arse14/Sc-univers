/**
 * Parseur de `actionmaps.xml` (Star Citizen).
 *
 * Structure typique :
 *   <ActionMaps version="1" optionsVersion="2" rebindVersion="2" profileName="default">
 *     <CustomisationUIHeader …>
 *       <devices><joystick instance="1" Product="…"/></devices>
 *     </CustomisationUIHeader>
 *     <options type="joystick" instance="1" Product="…">…</options>
 *     <actionmap name="spaceship_weapons">
 *       <action name="v_weapon_launch_missile">
 *         <rebind input="js1_button3"/>
 *       </action>
 *     </actionmap>
 *   </ActionMaps>
 *
 * Seules les entrées joystick (`jsN_…`) sont conservées ici.
 */
import type { ActionMaps, ScBinding, ScJoystickOption } from "./types";

const JS_INPUT = /^js(\d+)_(.*)$/i;

export function parseActionmaps(xml: string): ActionMaps {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("actionmaps.xml illisible : " + (err.textContent ?? "").slice(0, 200));

  const joysticks: ScJoystickOption[] = [];
  doc.querySelectorAll("options[type='joystick'], devices > joystick").forEach((el) => {
    const instance = Number(el.getAttribute("instance"));
    const product = el.getAttribute("Product") ?? "";
    if (!Number.isFinite(instance) || instance <= 0) return;
    if (!joysticks.some((j) => j.instance === instance)) joysticks.push({ instance, product });
  });

  const bindings: ScBinding[] = [];
  doc.querySelectorAll("actionmap").forEach((am) => {
    const actionmap = am.getAttribute("name") ?? "";
    am.querySelectorAll("action").forEach((ac) => {
      const action = ac.getAttribute("name") ?? "";
      ac.querySelectorAll("rebind").forEach((rb) => {
        const input = (rb.getAttribute("input") ?? "").trim();
        const m = JS_INPUT.exec(input);
        if (!m) return;
        const element = m[2].trim().toLowerCase();
        bindings.push({
          input: `js${m[1]}_${element}`,
          js: Number(m[1]),
          element,
          cleared: element === "" || undefined,
          actionmap,
          action,
          activationMode: rb.getAttribute("activationMode") ?? undefined,
          multiTap: rb.getAttribute("multiTap") ? Number(rb.getAttribute("multiTap")) : undefined,
        });
      });
    });
  });

  return { joysticks, bindings };
}

/** Index des bindings par entrée ("js1_button6" → liste d'actions). */
export function indexByInput(bindings: ScBinding[]): Map<string, ScBinding[]> {
  const map = new Map<string, ScBinding[]>();
  for (const b of bindings) {
    if (b.cleared) continue;
    const list = map.get(b.input) ?? [];
    list.push(b);
    map.set(b.input, list);
  }
  return map;
}

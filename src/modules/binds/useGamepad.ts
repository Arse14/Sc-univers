/**
 * Détection de touche via l'API Gamepad du navigateur (WebView2).
 *
 * Quand `active` est vrai, on scrute les manettes connectées et on remonte
 * le premier bouton pressé ou le premier axe fortement déplacé. L'index de
 * manette côté navigateur ne correspond pas forcément au numéro jsN de
 * Star Citizen : c'est l'utilisateur qui associe chaque appareil à son slot.
 */
import { useEffect, useRef, useState } from "react";

export interface GamepadHit {
  gamepadIndex: number;
  gamepadId: string;
  kind: "button" | "axis";
  index: number;      // numéro de bouton (base 0 côté navigateur) ou d'axe
  value: number;
}

export function useGamepadDetect(active: boolean): { hit: GamepadHit | null; pads: { index: number; id: string }[]; reset: () => void } {
  const [hit, setHit] = useState<GamepadHit | null>(null);
  const [pads, setPads] = useState<{ index: number; id: string }[]>([]);
  const baseline = useRef<Map<number, number[]>>(new Map());

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    baseline.current.clear();

    const poll = () => {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      const found: { index: number; id: string }[] = [];
      for (const gp of list) {
        if (!gp) continue;
        found.push({ index: gp.index, id: gp.id });
        // mémoriser la position initiale des axes pour ne détecter que les mouvements
        if (!baseline.current.has(gp.index)) baseline.current.set(gp.index, gp.axes.map((a) => a));
        const base = baseline.current.get(gp.index)!;
        for (let i = 0; i < gp.buttons.length; i++) {
          if (gp.buttons[i].pressed) {
            setHit({ gamepadIndex: gp.index, gamepadId: gp.id, kind: "button", index: i, value: gp.buttons[i].value });
            return;
          }
        }
        for (let i = 0; i < gp.axes.length; i++) {
          if (Math.abs(gp.axes[i] - (base[i] ?? 0)) > 0.6) {
            setHit({ gamepadIndex: gp.index, gamepadId: gp.id, kind: "axis", index: i, value: gp.axes[i] });
            return;
          }
        }
      }
      setPads((prev) => (prev.length === found.length && prev.every((p, i) => p.index === found[i].index) ? prev : found));
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [active, hit]);

  return { hit, pads, reset: () => setHit(null) };
}

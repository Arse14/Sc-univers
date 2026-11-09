import type { ModuleId } from "./Sidebar";

/** Icônes filaires (traits 1.6 px) du thème HUD, une par module. */
export function ModuleIcon({ id, size = 18 }: { id: ModuleId; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (id) {
    case "news": return <svg {...p}><path d="M4 11a8 8 0 0 1 16 0" /><path d="M7.5 11a4.5 4.5 0 0 1 9 0" /><circle cx="12" cy="11" r="1.4" /><path d="M12 12.5V21" /><path d="M8 21h8" /></svg>;
    case "starter": return <svg {...p}><path d="M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10Z" /><circle cx="12" cy="10" r="1.6" /><path d="M9 16l-2 4M15 16l2 4M12 16v5" /></svg>;
    case "dashboard": return <svg {...p}><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></svg>;
    case "binds": return <svg {...p}><path d="M12 13V5" /><circle cx="12" cy="4" r="2" /><path d="M5 19a7 3 0 0 0 14 0v-2a7 3 0 0 0-14 0Z" /><path d="M9 7l-2 1M15 7l2 1" /></svg>;
    case "hangar": return <svg {...p}><path d="M3 12l9-7 9 7" /><path d="M5 11v9h14v-9" /><path d="M9 20v-5h6v5" /></svg>;
    case "mining": return <svg {...p}><path d="M4 20l9-9" /><path d="M13 11l3-3" /><path d="M8 5c3-1 7 0 10 3l2 2c-1-3-3-5-6-6" /><path d="M14 10l2 2" /></svg>;
    case "reputation": return <svg {...p}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z" /><path d="M9 12l2 2 4-5" /></svg>;
    case "blueprints": return <svg {...p}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9Z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></svg>;
    case "market": return <svg {...p}><path d="M3 20h18" /><path d="M5 16l4-5 4 3 6-8" /><path d="M16 6h3v3" /></svg>;
    case "equipment": return <svg {...p}><path d="M5 12a7 7 0 0 1 14 0v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" /><path d="M8 13h8" /><path d="M12 5v2" /></svg>;
    case "map": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-2 6-4 2 2-6Z" /></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" /></svg>;
  }
}

/** Marque SC-Univers : hexagone double. */
export function Brand({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.14} viewBox="0 0 44 50" aria-hidden="true">
      <polygon points="22,1 43,13 43,37 22,49 1,37 1,13" fill="none" stroke="#62d0ff" strokeWidth="2" />
      <polygon points="22,7 38,16 38,34 22,43 6,34 6,16" fill="rgba(98,208,255,.08)" stroke="#ff9d2e" strokeWidth="1" strokeDasharray="4 3" />
      <text x="22" y="30" textAnchor="middle" fontFamily="Electrolize, sans-serif" fontSize="14" fill="#62d0ff">SC</text>
    </svg>
  );
}

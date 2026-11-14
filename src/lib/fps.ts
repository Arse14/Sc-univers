/** Images par seconde maximum des vues 3D (0 = cadence de l'écran). Réglable dans Paramètres. */
let MAX_FPS = 60;
export function setMaxFps(n: number | undefined) { MAX_FPS = n === 30 || n === 0 ? n : 60; }
export const maxFps = () => MAX_FPS;

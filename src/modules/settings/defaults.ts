/** Réglages de l'application (séparés de la page pour être lus au démarrage sans la charger). */
export interface AppSettings {
  uexToken: string;          // clé API UEX (saisie par l'utilisateur, stockée en local)
  startModule: "news" | "dashboard" | "binds";
  autoRotate: boolean;
  autoUpdate: boolean;
  /** Images par seconde maximum des vues 3D : 30, 60, ou 0 pour suivre l'écran. */
  fps3d: 0 | 30 | 60;
}

export const DEFAULT_SETTINGS: AppSettings = { uexToken: "", startModule: "news", autoRotate: true, autoUpdate: true, fps3d: 60 };

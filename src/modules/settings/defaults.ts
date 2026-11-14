/** Réglages de l'application (séparés de la page pour être lus au démarrage sans la charger). */
export interface AppSettings {
  uexToken: string;          // clé API UEX (saisie par l'utilisateur, stockée en local)
  startModule: "news" | "dashboard" | "binds";
  autoRotate: boolean;
  autoUpdate: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = { uexToken: "", startModule: "news", autoRotate: true, autoUpdate: true };

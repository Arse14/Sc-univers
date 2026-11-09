export type Affiliation = "uee" | "UNC" | "DEV" | "VNCL" | "BANU" | "XIAN" | string;

export interface StarSystem {
  id: number;
  code: string;
  name: string;
  x: number; y: number; z: number;
  status: string;        // P = publié, M = … , N = non visité
  type: string;          // SINGLE_STAR, BINARY…
  aff: Affiliation;
  color: string;
  size: number;          // UA
  pop: number; eco: number; danger: number;
  stars: number; planets: number; moons: number; stations: number;
}

export interface JumpPoint {
  id: number;
  size: "S" | "M" | "L";
  from: number;
  to: number;
}

export type ObjectType = "STAR" | "PLANET" | "SATELLITE" | "MANMADE" | "ASTEROID_BELT" | "ASTEROID_FIELD" | "JUMPPOINT" | "LZ" | "POI" | string;

export interface CelestialObject {
  id: number;
  name: string | null;
  type: ObjectType;
  sub: string | null;
  des: string;             // désignation (Stanton IV…)
  parent: number | null;
  size: number | null;     // km (planètes) ou unité propre
  dist: number | null;     // UA depuis le parent (ou position angulaire)
  lon: number | null;      // degrés
  lat: number | null;
  app: string | null;      // PLANET_GREEN, PLANET_BROWN…
  hab: boolean | null;
  period: number | null;   // jours
  description?: string;    // FR, si l'API l'a fournie
}

export interface SystemDetail {
  code: string;
  description: string;
  objects: CelestialObject[];
}

/** Libellés FR des affiliations (couleurs : celles de la Starmap RSI). */
export const AFFILIATIONS: Record<string, { label: string; short: string }> = {
  uee: { label: "Empire uni de la Terre (UEE)", short: "UEE" },
  UNC: { label: "Non revendiqué", short: "LIBRE" },
  DEV: { label: "En développement", short: "DÉV." },
  VNCL: { label: "Vanduul", short: "VANDUUL" },
  BANU: { label: "Protectorat Banu", short: "BANU" },
  XIAN: { label: "Empire Xi'an", short: "XI'AN" },
};

/** Systèmes jouables dans l'Alpha actuelle. */
export const PLAYABLE = new Set(["STANTON", "PYRO", "NYX"]);

export const TYPE_LABEL: Record<string, string> = {
  STAR: "Étoile", PLANET: "Planète", SATELLITE: "Lune", MANMADE: "Station", ASTEROID_BELT: "Ceinture d'astéroïdes",
  ASTEROID_FIELD: "Champ d'astéroïdes", JUMPPOINT: "Point de saut", LZ: "Zone d'atterrissage", POI: "Point d'intérêt",
};

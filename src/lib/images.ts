/**
 * Catalogue d'images distantes (chargées à l'affichage, jamais embarquées).
 *
 * Source : wiki communautaire Star Citizen (starcitizen.tools), captures et
 * rendus © Cloud Imperium Games, utilisés dans le cadre de la politique de
 * fan-site de CIG. Les URLs sont celles des fichiers d'origine ; le
 * composant <Pic> affiche un repli propre si l'une d'elles ne répond plus.
 */
const M = "https://media.starcitizen.tools";
/** Vignette redimensionnée par le wiki (plus légère que l'original). */
const thumb = (path: string, w = 640) => {
  const file = path.split("/").pop()!;
  return `${M}/thumb${path}/${w}px-${file}${/\.(png|jpg|jpeg)$/i.test(file) ? ".webp" : ""}`;
};
const full = (path: string) => `${M}${path}`;

/* ---------- Lieux et vaisseaux : réservoir de visuels « ambiance » ---------- */
export const PLACES = {
  stanton: full("/3/34/Stanton_skybox.png"),
  pyro: full("/6/63/Pyro_Skybox.png"),
  nyx: full("/d/d7/Nyx_in_space.png"),
  hurston: thumb("/8/89/Hurston-4.3.jpg", 1200),
  crusader: thumb("/d/d4/Crusader-4.3.jpg", 1200),
  arccorp: thumb("/e/e9/ArcCorp-4.3.jpg", 1200),
  microtech: thumb("/e/e7/MicroTech-4.3.jpg", 1200),
  lorville: full("/a/a8/Lorville-Teasa-Spaceport-3.19.jpg"),
  orison: thumb("/5/58/Exploring_deluxe_villas_on_Orison.png", 1200),
  area18: full("/0/0f/RSI-Arccorp_03-Min.jpg"),
  newBabbage: full("/9/9c/Microtech-new-babbage-cityscape-01.jpg"),
  grimHex: thumb("/0/09/Star_Citizen_-_GrimHEX_close-up.png", 1200),
  portOlisar: full("/3/3d/Crusader-port-olisar-3.14.jpg"),
  pyro1: full("/e/e0/Pyro-PyroI-orbit-4.0PTU.jpg"),
  ruinStation: full("/0/0c/Ruin_Station%2C_Terminus%2C_Pyro.webp"),
  levski: full("/b/bc/Levski_-_Above_complex.jpg"),
  delamar: thumb("/1/18/Delamar2024.png", 1200),
  daymar: full("/5/52/Stanton-crusader-daymar-3.8.0.jpg"),
  yela: full("/8/8f/Stanton-crusader-yela-orbit-3.8.0.jpg"),
  cellin: full("/5/5c/Stanton-crusader-cellin-orbit-3.8.0.jpg"),
  klescher: thumb("/c/cc/Klescher_Rehabilitation_Facility_Aberdeen.png", 1200),
  kareah: full("/c/c8/Rsi_stanton_tour_security_post_kareah.webp"),
  everusHarbor: full("/7/72/Hurston-everus-harbor-01.jpg"),
  seraphim: thumb("/9/9f/Seraphim_Station.png", 1200),
  checkmate: thumb("/b/b8/Cutter_Approaching_Checkmate_Station.png", 1200),
  orbituary: thumb("/2/24/Pyro_-_Orbituary_space_station.png", 1200),
} as const;

export const SHIPS = {
  prospector: full("/d/dd/Prospector_-_Hovering_mining_on_cliffside_1.jpg"),
  prospectorSpace: thumb("/2/22/Prospector_-_Mining_in_space_1.png", 1200),
  mole: full("/f/f0/Mole_flying_through_space_-_Isometric.jpg"),
  golem: thumb("/2/2c/Golem_using_mining_laser_in_dense_debris_field_-_cropped.png", 1200),
  avengerTitan: full("/4/4b/Avenger_Titan_3.2_sale_Titan_01-Squashed.jpg"),
  auroraMr: thumb("/d/d4/Aurora_MR_flying_above_world_-_Crop.png", 1200),
  cutter: full("/4/4a/Cutter_flying_over_clouds_-_Cut.jpg"),
  pisces: full("/e/ef/Pisces_C8X_flying_over_mountainous_volcanic_world_-_cropped_%26_adjusted.jpg"),
  origin100i: thumb("/8/87/100i_Microtech_-_cropped.png", 1200),
  cutlassBlack: thumb("/8/87/CutlassBlack_TouchingDown.png", 1200),
  andromeda: full("/d/d7/Andromeda_flying_from_Station_-_Front_Starboard.jpg"),
  orionMining: full("/d/d3/Comm-Link-Orion_Mining.jpg"),
  arrastraMining: full("/c/c1/Arrastra_mining_asteroid_space.jpg"),
  orion: full("/0/0a/RSI_Orion_.jpg"),
} as const;

/** Visuels de repli pour une actualité sans image : vaisseaux, planètes, stations. */
export const HERO_POOL: readonly string[] = [
  PLACES.stanton, PLACES.pyro, PLACES.hurston, PLACES.crusader, PLACES.microtech, PLACES.arccorp,
  PLACES.orison, PLACES.newBabbage, PLACES.area18, PLACES.lorville, PLACES.grimHex, PLACES.pyro1,
  PLACES.ruinStation, PLACES.daymar, PLACES.yela, PLACES.seraphim, PLACES.checkmate, PLACES.orbituary,
  SHIPS.andromeda, SHIPS.cutlassBlack, SHIPS.avengerTitan, SHIPS.auroraMr, SHIPS.cutter, SHIPS.pisces,
  SHIPS.origin100i, SHIPS.mole, SHIPS.prospectorSpace, SHIPS.orionMining,
];

/* ---------- Têtes de minage : rendu du terminal d'achat en jeu ---------- */
const laser = (path: string) => thumb(path, 800);
export const MINING_HEADS: Record<string, string> = {
  helix1: laser("/2/20/Helix_I_-_Terminal_Display_-_3.10.2.png"),
  helix2: laser("/2/20/Helix_I_-_Terminal_Display_-_3.10.2.png"),
  hof1: laser("/f/f5/Hofstede-S2_-_Terminal_Display_-_3.10.2.png"),
  hof2: laser("/f/f5/Hofstede-S2_-_Terminal_Display_-_3.10.2.png"),
  klein1: laser("/d/d3/Klein-S1_-_Terminal_Display_-_3.10.2.png"),
  klein2: laser("/d/d3/Klein-S1_-_Terminal_Display_-_3.10.2.png"),
  lancet1: laser("/a/ad/Lancet_MH1_-_Terminal_Display_-_3.10.2.png"),
  lancet2: laser("/a/ad/Lancet_MH1_-_Terminal_Display_-_3.10.2.png"),
  impact1: laser("/d/dc/Impact-S1_-_Terminal_Display_-_3.10.2.png"),
  impact2: laser("/d/dc/Impact-S1_-_Terminal_Display_-_3.10.2.png"),
  // Pas de rendu public pour ces têtes : on montre le vaisseau qui l'utilise, laser en action.
  arbor1: SHIPS.prospector,
  arbor2: SHIPS.mole,
  pitman: SHIPS.golem,
};
/** Têtes dont l'image est celle du vaisseau, faute de rendu public de la tête elle-même. */
export const MINING_HEAD_SHIP_FALLBACK = new Set(["arbor1", "arbor2", "pitman"]);

export const MINING_SHIPS: Record<string, string> = {
  "MISC Prospector": SHIPS.prospector,
  "Argo MOLE": SHIPS.mole,
  "Drake Golem": SHIPS.golem,
};

/* ---------- Organisations (logo + illustration) ---------- */
export interface OrgArt { logo?: string; picture?: string }
export const ORGS: Record<string, OrgArt> = {
  bhg: { logo: full("/0/0c/BHG_logo_3.13.png"), picture: PLACES.kareah },
  "crusader-sec": { logo: full("/2/2c/Crusader_Industries_-_JP0904.svg"), picture: full("/8/8a/Orison-CrusaderSecurityOfficer.jpg") },
  "hurston-sec": { logo: full("/6/6e/Hurston_security.png"), picture: PLACES.lorville },
  mtps: { logo: full("/6/6f/MT_Protection_Services.png"), picture: PLACES.newBabbage },
  arccorp: { logo: full("/2/25/ArcCorp.svg"), picture: PLACES.area18 },
  northrock: { logo: full("/d/db/Northrock_logo_3.13.png"), picture: PLACES.hurston },
  covalex: { logo: full("/e/e6/Covalex_Shipping_-_JP1106.svg"), picture: PLACES.daymar },
  redwind: { logo: full("/c/c3/Red_Wind_Linehaul_logo_RepUI.png"), picture: PLACES.everusHarbor },
  ling: { logo: full("/a/a1/Ling_Family_Hauling_logo_RepUI.png"), picture: PLACES.portOlisar },
  udm: { logo: full("/3/38/Unified_Distribution_Management_logo_RepUI.png"), picture: PLACES.seraphim },
  itg: { logo: full("/3/3e/Interstellar_Transport_Guild_Logo.png"), picture: SHIPS.andromeda },
  wikelo: { picture: full("/8/83/Wikelo_Hologram_-_Alpha_4.1.0.jpg") },
  rayari: { logo: full("/0/0c/Rayari_Inc._Logo.jpg"), picture: full("/6/6f/Rayari_Products.jpg") },
  shubin: { logo: full("/a/ac/Sc-logo-shubin.svg"), picture: full("/a/a4/ShubinFoundry.png") },
  vaughn: { logo: full("/a/a7/Vaughn.png"), picture: PLACES.grimHex },
  "minor-stanton": { picture: PLACES.stanton },
  cfp: { logo: full("/c/c9/Citizen_for_Prosperity_-_Fight_for_Pyro.png"), picture: full("/5/5c/IAE2953-metroloop-stands-cfp.jpg") },
  headhunters: { logo: full("/a/a1/Headhunters_-_Fight_for_Pyro.png"), picture: full("/8/84/Star_Citizen_headhunters.jpg") },
  "pyro-contacts": { picture: PLACES.ruinStation },
  intersec: { logo: full("/b/b3/InterSec_Defense_Solutions_DefenseCon_2956.png"), picture: PLACES.nyx },
  foxwell: { logo: full("/0/09/Foxwell-Enforcement-logo_256.png"), picture: PLACES.levski },
  adagio: { picture: PLACES.delamar },
  recco: { logo: full("/2/22/Recco_Battaglia_4.10_cropped.jpg"), picture: full("/2/2a/ReccoGameplay.png") },
  eckhart: { logo: full("/1/1d/Miles_Eckhart.jpg"), picture: PLACES.levski },
  "nyx-others": { logo: full("/0/08/Peoples-alliance-badge.png"), picture: full("/1/12/FTL_Courier_Service.png") },
  cdf: { logo: full("/b/b8/Civilian_Defense_Force_-_JP0901.svg"), picture: full("/b/b0/CDF_Armor_Set_-_3.14.1_Reward.jpg") },
  xenothreat: { logo: full("/8/84/Xenothreat_2956.png"), picture: full("/5/53/XenothreatScreens_Phase01_122020.jpg") },
};
export const ORG_EXTRA = {
  ninetails: full("/0/05/Nine_Tails_Soldiers.jpg"),
  roughready: full("/0/04/Rough_and_Ready_logo_at_Orbituary.jpg"),
};

/* ---------- Schémas / Item Fabricator ---------- */
export const CRAFTING = {
  fabricator: full("/6/63/Item_fabricator_keyshot.webp"),
  craftingUi: full("/3/37/Crafting_UI_ItemFab.webp"),
  blueprintsUi: full("/a/a9/Blueprints_UI_ItemFab.webp"),
  dismantleUi: full("/4/4a/Dismantling_UI_ItemFab.webp"),
  interface: full("/0/07/Fabricator_interface.png"),
  concept: full("/2/27/Crafting_concept_Citizencon_1.png"),
} as const;

/* ---------- Parcours débutant : un visuel par chapitre ---------- */
export const STARTER_STAGES: Record<string, string> = {
  spawn: PLACES.newBabbage,
  ship: PLACES.lorville,
  takeoff: SHIPS.auroraMr,
  quantum: PLACES.stanton,
  landing: PLACES.orison,
  mission: SHIPS.cutter,
  survive: PLACES.grimHex,
};

/* ---------- Tableau de bord : fond des cartes de module ---------- */
export const MODULE_ART: Record<string, string> = {
  news: PLACES.pyro,
  starter: PLACES.newBabbage,
  binds: SHIPS.avengerTitan,
  mining: SHIPS.prospectorSpace,
  reputation: PLACES.kareah,
  blueprints: CRAFTING.fabricator,
  hangar: SHIPS.andromeda,
  market: PLACES.area18,
  equipment: full("/b/b0/CDF_Armor_Set_-_3.14.1_Reward.jpg"),
  map: PLACES.stanton,
};

/**
 * Opérations : instances privées, zones contestées, hangars exécutifs et
 * halls de guilde. Relevé du 21/11/2026 (jeu LIVE : Alpha 4.10.3) d'après le
 * wiki communautaire et des guides de joueurs ; tout ce qui n'est pas
 * confirmé par ces sources est marqué « à confirmer » ou listé dans
 * `unknown`. À revoir à chaque patch.
 */
import { PLACES } from "../../lib/images";

export const OPS_DATE = "21/11/2026";
export const OPS_VERSION = "Alpha 4.10.3";

export type OpKind = "instance" | "contested" | "exec" | "upcoming";
export type OpStatus = "live" | "ptu" | "announced";
export interface Loot { name: string; note?: string }
export interface Op {
  id: string; kind: OpKind; status: OpStatus;
  name: string; system: string; where: string; players: string; img: string;
  summary: string;
  /** Comment y aller et comment la lancer. */
  access: string[];
  /** Déroulé, étape par étape. */
  steps: { title: string; items: string[] }[];
  loot: Loot[];
  tips: string[];
  /** Ce que les sources ne disent pas. */
  unknown?: string[];
  sources: { label: string; url: string }[];
}

export const KIND_FR: Record<OpKind, { label: string; hint: string }> = {
  instance: { label: "Instances privées", hint: "Une copie du lieu réservée à ton groupe : personne d'autre ne peut y entrer. Nouveauté de l'Alpha 4.10 (« Instancing on Demand »)." },
  contested: { label: "Zones contestées", hint: "Zones de tir libre PvPvE dans les stations de Pyro. Elles ne sont PAS instanciées : d'autres joueurs peuvent y entrer et te tuer." },
  exec: { label: "Hangar exécutif", hint: "L'aboutissement des zones contestées : sept cartes à réunir pour ouvrir un hangar qui contient un vaisseau." },
  upcoming: { label: "Annoncées", hint: "Présentées par CIG ou repérées par les joueurs, mais pas encore jouables. Rien n'est garanti." },
};
export const STATUS_FR: Record<OpStatus, { label: string; color: string }> = {
  live: { label: "EN JEU", color: "var(--green)" },
  ptu: { label: "SERVEUR DE TEST (PTU)", color: "var(--amber)" },
  announced: { label: "PAS ENCORE EN JEU", color: "var(--muted)" },
};

const WIKI_EXEC = { label: "Wiki — Guide Executive Hangars", url: "https://starcitizen.tools/Guide:Executive_Hangars" };
const WIKI_CZ = { label: "Wiki — Contested Zones", url: "https://starcitizen.tools/Contested_Zones" };

export const OPS: Op[] = [
  {
    id: "siege-orison", kind: "instance", status: "live",
    name: "Siège d'Orison", system: "Stanton", where: "Orison (Crusader) ▸ Cloudview Center ▸ Inspiration Station", players: "1 à 4 joueurs", img: PLACES.orison,
    summary: "Première mission instanciée du jeu (Alpha 4.10.0, 26/08/2026). Entièrement à pied : reprendre trois plateformes flottantes aux Nine Tails, jusqu'au commandant Mendo Ren.",
    access: [
      "Va à Orison, au Cloudview Center, et prends les ascenseurs du showroom Crusader Industries : une destination supplémentaire « Inspiration Station » y apparaît.",
      "Suis le trajet jusqu'au tram puis jusqu'aux ascenseurs du hall du Siège. Attends que la barrière STANDBY disparaisse : l'instance est prête.",
      "Le contrat « Retake Platforms From Nine Tails » s'accepte tout seul en entrant. Le contrat de mercenaire « Orison Platforms Under Attack » ne sert qu'à indiquer l'entrée.",
      "Forme ton groupe AVANT de franchir la porte d'instance : c'est le chef de groupe qui possède l'instance, et entrer séparément vous envoie dans des copies différentes.",
    ],
    steps: [
      { title: "1 · Plateforme Solanki", items: ["Nettoyer les positions de mortier, la principale menace du début.", "Rétablir les quatre nœuds du réseau de sécurité (deux premiers niveaux).", "Battre Remy Kettle, commandant Nine Tails (troisième niveau).", "Désactiver le premier inverseur IFF."] },
      { title: "2 · Plateforme Hartmoore", items: ["Traverser la section Ironclad, défendue par des exosquelettes Greycat Ikti.", "Rétablir deux nœuds extérieurs : il leur faut des fusibles.", "Battre le commandant de Hartmoore et désactiver le deuxième inverseur IFF."] },
      { title: "3 · Centre administratif et barge", items: ["Rejoindre l'arène du boss.", "Battre Mendo Ren en quatre phases : trois phases autour de trois réacteurs et de leurs leviers, puis le combat direct contre son arme lourde et son escorte.", "Récupérer sa carte d'accès."] },
      { title: "Final", items: ["Désactiver le dernier inverseur IFF avec la carte du commandant.", "Attendre que le contrat soit marqué terminé avant de fouiller."] },
    ],
    loot: [
      { name: "Paiement en aUEC", note: "environ 979 000 aUEC d'après une base de données de joueurs, non garanti : lis le montant dans le gestionnaire de contrats" },
      { name: "Plan : armure BUL-H4", note: "un plan tiré au sort par réussite, parmi trois" },
      { name: "Plan : casque BUL-H4", note: "même tirage" },
      { name: "Plan : sac porte-munitions H4-PBF", note: "même tirage" },
      { name: "Skin d'arme exclusif", note: "annoncé, nom non documenté" },
      { name: "Vendetta HMG (Apocalypse Arms)", note: "butin physique ; mitrailleuse utilisable seulement avec l'armure super-lourde" },
      { name: "Pièces d'armure BUL-H4 et sac H4-PBF", note: "butin physique, distinct des plans" },
      { name: "Caisses spéciales", note: "s'ouvrent avec les cartes lâchées par les ennemis d'élite" },
      { name: "Armes, munitions et équipement Nine Tails" },
    ],
    tips: [
      "Les lits médicaux servent de points de réapparition : illimités, sans consommer de MedGel. Active-les au passage.",
      "Emporte des fusibles de rechange, un multi-outil, un pistolet médical et de quoi boire et manger.",
      "Les agents de Crusader Security sont alliés : identifie tes cibles.",
      "Un groupe entièrement tué pendant Mendo Ren peut relancer le combat.",
      "Chez Wikelo, les contrats « Too Much Gun » et « Heavy and Bright » transforment la Vendetta et l'armure BUL-H4 en versions Snow Camo.",
    ],
    unknown: ["Durée moyenne", "Nom du skin d'arme", "Éventuel délai avant de recommencer (aucun n'est signalé : la mission est répétable)"],
    sources: [{ label: "expcarry — Siege of Orison Guide (4.10.2)", url: "https://expcarry.com/star-citizen-siege-of-orison-guide" }, { label: "timesaver — Siege of Orison Guide", url: "https://timesaver.gg/blog/star-citizen-siege-of-orison-guide-alpha-4-10" }],
  },
  {
    id: "recco-office", kind: "instance", status: "live",
    name: "Bureau de Recco Battaglia", system: "Nyx", where: "Levski (Delamar)", players: "Toi et ton groupe", img: PLACES.levski,
    summary: "Deuxième lieu instancié de l'Alpha 4.10. Recco Battaglia, coordinatrice minière indépendante, y donne ses missions : trois missions d'histoire puis des contrats répétables.",
    access: [
      "Rends-toi à Levski, dans le système Nyx, et va physiquement à son bureau : c'est ce qui débloque sa chaîne.",
      "Les trois missions d'histoire présentent le système, puis des paliers de contrats répétables s'ouvrent avec ta réputation.",
    ],
    steps: [{ title: "Contrats répétables", items: ["Fracturation de roches.", "Défense de mineurs.", "Recherche de personnes disparues.", "Récupération d'objets."] }],
    loot: [
      { name: "Plans de modules de minage" },
      { name: "Plans de conteneurs" },
      { name: "Plans de pods à minerai" },
      { name: "Matériel plutôt que crédits", note: "ses récompenses sont surtout des objets et des plans à fabriquer" },
    ],
    tips: ["Au lancement de la 4.10, certains joueurs à haute réputation n'ont pas vu apparaître les missions d'histoire 2 et 3 : vérifie que tu es bien passé par son bureau."],
    unknown: ["Emplacement exact du bureau dans Levski", "Liste précise des plans par palier"],
    sources: [{ label: "timesaver — Alpha 4.10 Patch Notes", url: "https://timesaver.gg/blog/star-citizen-alpha-4-10-patch-notes-siege-of-orison" }],
  },
  {
    id: "checkmate", kind: "contested", status: "live",
    name: "Checkmate", system: "Pyro", where: "Station Checkmate", players: "Groupe conseillé · PvP possible", img: PLACES.checkmate,
    summary: "Trois des sept cartes du hangar exécutif s'y trouvent (1, 2 et 3), ainsi que quatre imprimantes à cartes bleues.",
    access: ["Entrée par la zone contestée de la station. Il faut des fusibles pour les portes à fusible, une carte rouge (Supervisor) et des cartes bleues (Security)."],
    steps: [
      { title: "Carte 1", items: ["Porte à fusible, puis porte rouge."] },
      { title: "Cartes 2 et 3 (hangar de Checkmate, deux entrées)", items: ["Carte 2 : porte à fusible, porte rouge, porte bleue.", "Carte 3 : deux portes à fusible, puis deux portes bleues."] },
      { title: "Cartes bleues", items: ["Quatre imprimantes, derrière deux portes à fusible. Délai de 30 minutes par imprimante."] },
    ],
    loot: [{ name: "Cartes de circuit 1, 2 et 3", note: "pour le hangar exécutif" }, { name: "Cartes bleues (Security)" }, { name: "Composants de vaisseau et armes FPS", note: "de nouveau présents dans les zones depuis la 4.8.3" }],
    tips: ["La carte rouge ne se trouve pas ici : il faut d'abord passer par une zone Supervisor (PYAM-SUPVISR)."],
    sources: [WIKI_EXEC, WIKI_CZ],
  },
  {
    id: "orbituary", kind: "contested", status: "live",
    name: "Orbituary", system: "Pyro", where: "Station Orbituary", players: "Groupe conseillé · PvP possible", img: PLACES.orbituary,
    summary: "Cartes 4 et 7 du hangar exécutif, et deux imprimantes à cartes bleues derrière une porte rouge.",
    access: ["Entrée par la zone contestée de la station. Fusibles, carte rouge et cartes bleues nécessaires."],
    steps: [
      { title: "Carte 4", items: ["Porte à fusible, porte rouge, seconde porte à fusible."] },
      { title: "Carte 7 (hangar d'Orbituary)", items: ["Porte à fusible, porte rouge, porte à fusible, puis deux portes bleues."] },
      { title: "Cartes bleues", items: ["Deux imprimantes derrière une porte rouge (Supervisor)."] },
    ],
    loot: [{ name: "Cartes de circuit 4 et 7", note: "pour le hangar exécutif" }, { name: "Cartes bleues (Security)" }, { name: "Composants de vaisseau et armes FPS" }],
    tips: [],
    sources: [WIKI_EXEC, WIKI_CZ],
  },
  {
    id: "ruin", kind: "contested", status: "live",
    name: "Ruin Station (Ghost Arena)", system: "Pyro", where: "Ruin Station ▸ Ghost Arena", players: "Groupe conseillé · PvP possible", img: PLACES.ruinStation,
    summary: "La Ghost Arena est le carrefour de quatre zones : The Crypt, Wasteland, Last Resort et The Vault. Les cartes 5 et 6 sont dans le Vault, derrière une porte à minuterie.",
    access: ["Entrée par la Ghost Arena. Chaque carte dorée (Crypt, Wasteland, Last Resort) est derrière sa propre porte à fusible : un fusible par carte."],
    steps: [
      { title: "The Crypt", items: ["Donne la carte Crypt (dorée et verte), qui ouvre la porte de la carte 5 dans le Vault."] },
      { title: "Wasteland et Last Resort", items: ["Donnent les cartes Wasteland (dorée et bleue) et Last Resort (dorée et jaune)."] },
      { title: "The Vault", items: ["Porte à minuterie : ouverte 1 minute, fermée 20 minutes. Des lumières bleues préviennent 30 secondes avant. Impossible de l'actionner à la main.", "Carte 6 : seconde salle, au-dessus de l'étage d'entrée.", "Carte 5 : seconde salle, derrière une autre porte (carte Crypt)."] },
    ],
    loot: [{ name: "Cartes de circuit 5 et 6", note: "pour le hangar exécutif" }, { name: "Cartes Crypt, Wasteland et Last Resort" }, { name: "Composants de grade B", note: "dans la Crypt et les zones à carte" }],
    tips: ["Les imprimantes de cartes dorées ont un délai de 30 minutes.", "Prévois d'attendre devant la porte du Vault : 20 minutes entre deux ouvertures."],
    sources: [WIKI_EXEC, WIKI_CZ],
  },
  {
    id: "supervisor", kind: "contested", status: "live",
    name: "Zones Supervisor (cartes rouges)", system: "Pyro", where: "PYAM-SUPVISR-3-4 (depuis PYR3 L4) · PYAM-SUPVISR-3-5 (depuis PYR3 L5)", players: "Solo possible · PvP possible", img: PLACES.pyro1,
    summary: "Deux bases-astéroïdes en orbite de Pyro III. C'est le seul endroit où imprimer les cartes rouges qui ouvrent les portes rouges de Checkmate et d'Orbituary : c'est donc la première étape.",
    access: ["Elles n'apparaissent pas dans la recherche de la carte stellaire : il faut les trouver en déplaçant et en zoomant la carte à la main, autour de PYR3 L4 et L5."],
    steps: [{ title: "Salle de l'imprimante", items: ["La salle est fermée : on y entre en grimpant sur les caisses voisines et en passant par le plafond.", "Deux sorties : une porte latérale (déverrouillée de l'intérieur) et une trappe basse."] }],
    loot: [{ name: "Carte rouge (Supervisor)", note: "délai de 30 minutes par imprimante" }],
    tips: ["Deux bases, donc deux imprimantes : alterne si l'une est en délai ou occupée."],
    sources: [WIKI_EXEC, WIKI_CZ],
  },
  {
    id: "exec-hangar", kind: "exec", status: "live",
    name: "Hangar exécutif", system: "Pyro", where: "PYAM-EXHANG-0-1 — trois bases-astéroïdes près du soleil de Pyro, une seule active à la fois", players: "Groupe conseillé · PvP très probable", img: PLACES.pyro,
    summary: "On y insère les sept cartes de circuit pour ouvrir un hangar contenant un vaisseau, des armes rares et des composants de grade A.",
    access: [
      "Les trois bases ont le même plan. La porte du hangar est cachée au fond, de l'autre côté de l'astéroïde, dans le même plan que l'entrée.",
      "Va dans la zone en apesanteur à l'intérieur de la base : les emplacements des cartes sont le long des tuyaux, là où se trouvent les cinq voyants.",
    ],
    steps: [
      { title: "Lire les cinq voyants", items: ["Mise sous tension : un voyant rouge passe au vert toutes les 24 minutes (2 heures au total).", "Ouvert : un voyant vert s'éteint toutes les 12 minutes (1 heure d'activité).", "Remise à zéro : 5 minutes après l'extinction du dernier vert, les cinq repassent au rouge.", "Les cartes n'ouvrent la porte que s'il y a au moins un voyant vert et aucun rouge."] },
      { title: "Ouvrir et repartir", items: ["Insérer les sept cartes de circuit.", "Un seul joueur peut réclamer le vaisseau. Une fois réclamé et sorti au terminal ASOP, la porte du hangar s'ouvre.", "La porte se referme au bout de 10 minutes et ne se rouvre pas."] },
    ],
    loot: [
      { name: "Anvil F7A Hornet Mk II Executive" }, { name: "Anvil F8C Lightning Executive" }, { name: "Drake Corsair Executive" }, { name: "Drake Cutlass Black Executive" },
      { name: "Gatac Syulen Executive" }, { name: "Mirai Guardian MX Wikelo War Special" }, { name: "RSI Meteor Executive" }, { name: "RSI Scorpius Wikelo War Special" },
      { name: "Un seul vaisseau par ouverture", note: "parmi les huit ci-dessus, en variante militaire ou furtive" },
      { name: "Armes FPS rares", note: "lance-grenades, railguns" },
      { name: "Composants de vaisseau de grade A" },
    ],
    tips: ["Viens avec un vaisseau cargo : le vaisseau gagné ne peut pas forcément emporter toutes les armes et tous les composants.", "Le wiki donne deux durées contradictoires pour la porte (10 ou 30 minutes) : pars sur 10."],
    unknown: ["Quel vaisseau correspond à quelle variante", "Noms exacts des armes et des composants"],
    sources: [WIKI_EXEC],
  },
  {
    id: "municipal-works", kind: "upcoming", status: "announced",
    name: "Municipal Works", system: "Nyx", where: "Levski (des entrées ont aussi été repérées à Area18)", players: "Solo possible, pensé pour le groupe", img: PLACES.levski,
    summary: "Donjon instancié présenté à la CitizenCon 2025 : descendre sous Levski par un ascenseur et réparer des systèmes en panne, en plusieurs chapitres.",
    access: ["Pas encore jouable. Au 30/10/2026, des entrées existent en jeu mais « une entrée n'est pas une mission disponible »."],
    steps: [{ title: "Ce qui est annoncé", items: ["Trois chapitres de plusieurs missions, avec progression sauvegardée.", "Combat, enquête, récupération et minage ; boss, créatures, énigmes et butin caché."] }],
    loot: [{ name: "Butin caché", note: "composants rares, matériaux ou plans évoqués, non confirmés" }],
    tips: [],
    unknown: ["Date de sortie", "Objectifs, récompenses et conditions d'accès"],
    sources: [{ label: "elyxir — Instanced Dungeons (25/06/2026)", url: "https://www.elyxir.gg/news/star-citizen/star-citizens-new-instanced-dungeons-could-transform-fps-progression" }, { label: "elyxir — 4.10.3 et 4.10.4 (30/10/2026)", url: "https://www.elyxir.gg/news/star-citizen/star-citizen-4103-and-4104-combat-changes-fixes-and-iae-clues" }],
  },
  {
    id: "the-depths", kind: "upcoming", status: "announced",
    name: "The Depths", system: "Stanton", where: "ArcCorp ▸ Area18", players: "Solo ou groupe", img: PLACES.area18,
    summary: "Réseau souterrain en deux couches : une zone de maintenance ouverte à tous, puis des niveaux profonds instanciés.",
    access: ["Pas encore jouable et moins avancé que Municipal Works."],
    steps: [{ title: "Ce qui est annoncé", items: ["Couche haute accessible depuis plusieurs points d'Area18, possiblement partagée avec d'autres joueurs.", "Niveaux profonds débloqués par la progression, des clés ou des accès."] }],
    loot: [{ name: "Récompenses croissantes avec la profondeur", note: "plans de plus haut niveau évoqués, non confirmés" }],
    tips: [],
    unknown: ["Date de sortie", "Tout le reste"],
    sources: [{ label: "elyxir — Instanced Dungeons (25/06/2026)", url: "https://www.elyxir.gg/news/star-citizen/star-citizens-new-instanced-dungeons-could-transform-fps-progression" }],
  },
];

/** Les sept cartes de circuit du hangar exécutif. */
export const BOARDS: { n: number; zone: string; path: string }[] = [
  { n: 1, zone: "Checkmate", path: "porte à fusible, porte rouge" },
  { n: 2, zone: "Checkmate (hangar)", path: "porte à fusible, porte rouge, porte bleue" },
  { n: 3, zone: "Checkmate (hangar)", path: "deux portes à fusible, deux portes bleues" },
  { n: 4, zone: "Orbituary", path: "porte à fusible, porte rouge, porte à fusible" },
  { n: 5, zone: "Ruin Station (The Vault)", path: "porte à minuterie, puis porte à carte Crypt" },
  { n: 6, zone: "Ruin Station (The Vault)", path: "porte à minuterie, seconde salle en hauteur" },
  { n: 7, zone: "Orbituary (hangar)", path: "porte à fusible, porte rouge, porte à fusible, deux portes bleues" },
];

export const KEYCARDS: { name: string; color: string; where: string }[] = [
  { name: "Rouge (Supervisor)", color: "#ff5a4d", where: "Imprimée dans les bases PYAM-SUPVISR-3-4 et 3-5, en orbite de Pyro III." },
  { name: "Bleue (Security)", color: "#4fb3ff", where: "Checkmate : 4 imprimantes derrière deux portes à fusible. Orbituary : 2 imprimantes derrière une porte rouge." },
  { name: "Crypt (dorée et verte)", color: "#7fe08a", where: "Ruin Station, The Crypt, derrière une porte à fusible." },
  { name: "Last Resort (dorée et jaune)", color: "#f0d24a", where: "Ruin Station, Last Resort, derrière une porte à fusible." },
  { name: "Wasteland (dorée et bleue)", color: "#62d0ff", where: "Ruin Station, Wasteland, derrière une porte à fusible." },
];

/* ---------- Halls de guilde ---------- */
export interface GuildHall { name: string; note: string }
export const IAE_HALLS: GuildHall[] = [
  { name: "Academy of Sciences", note: "Science et exploration" },
  { name: "Mercenary Guild", note: "Combat et contrats de mercenaire" },
  { name: "United Resource Workers", note: "Minage et industrie" },
  { name: "Interstellar Transport Guild", note: "Transport de fret" },
];
/** Factions présentes dans Nyx d'après les notes de l'Alpha 5.0 (tenues propres à chacune). Aucune n'est confirmée comme ayant un hall. */
export const NYX_FACTIONS = ["Moraine", "First Legion", "Claw Salamanders", "Shattered Blade", "People's Alliance", "Covalex", "Rayari Inc.", "Shubin Interstellar"];
export const GUILD_SOURCES = [
  { label: "Wiki — Alpha 4.10.3 (IAE, Tobin Expo Center)", url: "https://starcitizen.tools/Update:Star_Citizen_Alpha_4.10.3" },
  { label: "Wiki — Alpha 5.0.0", url: "https://starcitizen.tools/Update:Star_Citizen_Alpha_5.0.0" },
  { label: "cavalera.news — 5.0 PTU (06/11/2026)", url: "https://cavalera.news/editions/2026-11-06?lang=en" },
  { label: "expcarry — 5.0 PTU (19/11/2026)", url: "https://expcarry.com/star-citizen-5-0-ptu-nyx-i-testing" },
];

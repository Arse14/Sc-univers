/**
 * Réputations — organisations et contacts, par système.
 *
 * Données communautaires relevées sur l'Alpha 4.10.2 (nov. 2026) :
 *  - expcarry.com/star-citizen-reputation-guide (paliers XP, débloquages)
 *  - space-vendor.com (mécanique générale, rivalités Pyro)
 *  - starcitizen.tools/Reputation (liste des organisations, licenciement 24 h)
 *  - uverse.space/reputation (liste légale / illégale)
 *  - thisgengaming.com (missions donnant des schémas)
 * À revérifier après chaque patch. `verified: false` = détails non confirmés.
 */

export type SystemId = "stanton" | "pyro" | "nyx" | "events";
export type Lawfulness = "legal" | "illegal" | "neutral";

export interface Rank {
  name: string;
  xp?: number | null;     // seuil de réputation si connu
  unlock?: string;        // ce que le palier apporte
}

export interface Faction {
  id: string;
  name: string;
  systems: SystemId[];
  type: string;           // Sécurité, Transport, Récupération…
  lawful: Lawfulness;
  summary: string;        // une phrase : qui c'est, où
  gains: string[];        // comment monter
  losses: string[];       // comment descendre
  ranks: Rank[];          // paliers connus (vide si inconnu)
  rewards: string[];      // ce que la réputation apporte globalement
  rivals?: string[];      // ids des factions opposées
  verified: boolean;
}

export const SYSTEMS: { id: SystemId; label: string; note: string }[] = [
  { id: "stanton", label: "Stanton", note: "Système UEE sécurisé : quatre méga-corporations (Hurston, Crusader, ArcCorp, microTech), guildes et transporteurs." },
  { id: "pyro", label: "Pyro", note: "Système sans loi : deux camps rivaux, Citizens for Prosperity et Headhunters. Choisir l'un ferme l'autre." },
  { id: "nyx", label: "Nyx", note: "Système frontalier autour de Levski : contractants (InterSec, Foxwell, Adagio) et le contact Recco Battaglia." },
  { id: "events", label: "Événements", note: "Factions actives uniquement pendant les événements dynamiques (XenoThreat, Siege of Orison…)." },
];

const CONTRACTOR_LADDER: Rank[] = [
  { name: "Neutral", xp: 0 },
  { name: "Jr. Contractor", xp: 800 },
  { name: "Contractor", xp: 2200 },
  { name: "Sr. Contractor", xp: 5800 },
  { name: "Veteran Contractor", xp: 15000 },
  { name: "Head Contractor", xp: 38000 },
  { name: "Elite Contractor", xp: 95250 },
];

const SECURITY_GAINS = ["Contrats de sécurité et de prime émis par l'organisation (c'est l'émetteur qui compte, pas le type de mission).", "Missions d'introduction, d'évaluation et de certification : obligatoires, les points seuls ne suffisent pas."];
const SECURITY_LOSSES = ["Échec, abandon ou expiration d'un contrat.", "Destruction d'objectifs protégés ou de cibles alliées.", "Trop d'échecs d'affilée : le donneur de mission te « licencie » 24 h."];

export const FACTIONS: Faction[] = [
  // ───────────── STANTON ─────────────
  {
    id: "bhg", name: "Bounty Hunters Guild", systems: ["stanton", "pyro"], type: "Chasse de primes", lawful: "legal",
    summary: "Guilde des chasseurs de primes. Chaque licence débloque un niveau de cible, du VLRT à l'ERT.",
    gains: ["Primes PvE réussies pour la guilde.", "Missions de certification à chaque palier (licence)."],
    losses: SECURITY_LOSSES,
    ranks: [
      { name: "Applicant", unlock: "Aucune licence." },
      { name: "Probationary Guild Member", unlock: "Tracker Training Permit → cibles VLRT." },
      { name: "Junior Guild Member", unlock: "Tracker Beginner's Permit → LRT." },
      { name: "Guild Member", unlock: "Tracker License → MRT." },
      { name: "Senior Guild Member", unlock: "Journeyman Tracker License → HRT." },
      { name: "Veteran Guild Member", unlock: "Advanced Tracker License → VHRT." },
      { name: "Guild Steward", unlock: "Master Tracker License → ERT." },
    ],
    rewards: ["Accès aux primes de niveau supérieur (et paiements plus élevés).", "Multiplicateur de paiement à chaque promotion.", "Schémas en récompense de certaines primes (ex. ASD, Hathor PAF).", "Les certifications PvP sont une piste séparée."],
    verified: true,
  },
  {
    id: "crusader-sec", name: "Crusader Security", systems: ["stanton"], type: "Sécurité · Primes · Secours", lawful: "legal",
    summary: "Sécurité de Crusader Industries, autour d'Orison et de ses lunes.",
    gains: SECURITY_GAINS, losses: [...SECURITY_LOSSES, "« Repel Raid on Orison » : l'échec ou l'abandon fait perdre de la réputation Crusader Security."],
    ranks: [], rewards: ["Missions de sécurité régionales, puis contrats de combat avancés et de groupe."], verified: false,
  },
  {
    id: "hurston-sec", name: "Hurston Security", systems: ["stanton"], type: "Sécurité · Primes", lawful: "legal",
    summary: "Sécurité d'Hurston Dynamics (Lorville, Aberdeen, Arial, Ita, Magda).",
    gains: SECURITY_GAINS, losses: SECURITY_LOSSES, ranks: [],
    rewards: ["Missions de sécurité régionales, contrats de combat avancés."], verified: false,
  },
  {
    id: "mtps", name: "MT Protection Services", systems: ["stanton"], type: "Sécurité · Primes", lawful: "legal",
    summary: "Sécurité de microTech (New Babbage, Calliope, Clio, Euterpe).",
    gains: SECURITY_GAINS, losses: SECURITY_LOSSES, ranks: [],
    rewards: ["Missions de sécurité régionales, contrats de combat avancés."], verified: false,
  },
  {
    id: "arccorp", name: "ArcCorp (Sécurité)", systems: ["stanton"], type: "Sécurité", lawful: "legal",
    summary: "Sécurité d'ArcCorp (Area18, Lyria, Wala).",
    gains: SECURITY_GAINS, losses: SECURITY_LOSSES, ranks: [], rewards: ["Missions de sécurité régionales."], verified: false,
  },
  {
    id: "northrock", name: "Northrock Service Group", systems: ["stanton"], type: "Primes · Sécurité · Courrier", lawful: "legal",
    summary: "Contractant privé présent dans tout Stanton.",
    gains: SECURITY_GAINS, losses: SECURITY_LOSSES, ranks: [],
    rewards: ["Contrats de sécurité et de prime.", "Primes HRT avec schémas en récompense."], verified: false,
  },
  {
    id: "covalex", name: "Covalex Shipping", systems: ["stanton"], type: "Transport de fret", lawful: "legal",
    summary: "Transporteur : la carrière de hauling de référence, de Stanton aux routes intersystèmes.",
    gains: ["Livraisons de fret réussies, bonus pour les livraisons rapides ou en bon état."],
    losses: ["Fret perdu ou endommagé.", "Contrat expiré ou abandonné."],
    ranks: [
      { name: "Trainee" }, { name: "Rookie" }, { name: "Junior" }, { name: "Member" },
      { name: "Experienced", unlock: "Gros transports moyens et « Large Hauls »." },
      { name: "Senior" },
      { name: "Master", unlock: "Fret interstellaire avancé et contrats à schémas." },
    ],
    rewards: ["Contrats de fret de plus en plus gros et mieux payés.", "Schémas sur certains contrats de haut niveau."], verified: true,
  },
  {
    id: "redwind", name: "Red Wind Linehaul", systems: ["stanton"], type: "Transport de fret", lawful: "legal",
    summary: "Transporteur de fret sur routes dédiées.",
    gains: ["Livraisons réussies."], losses: ["Fret perdu, contrat expiré."], ranks: [], rewards: ["Paliers de fret supplémentaires."], verified: false,
  },
  {
    id: "ling", name: "Ling Family Hauling", systems: ["stanton"], type: "Transport de fret", lawful: "legal",
    summary: "Petit transporteur familial, bonne porte d'entrée du hauling.",
    gains: ["Livraisons réussies."], losses: ["Fret perdu, contrat expiré."], ranks: [], rewards: ["Missions de fret de niveau supérieur."], verified: false,
  },
  {
    id: "udm", name: "Unified Distribution Management", systems: ["stanton"], type: "Courrier", lawful: "legal",
    summary: "Livraisons de colis (courrier).",
    gains: ["Livraisons réussies."], losses: ["Colis perdu, contrat expiré."], ranks: [], rewards: ["Contrats de livraison plus nombreux."], verified: false,
  },
  {
    id: "itg", name: "Interstellar Transport Guild", systems: ["stanton"], type: "Transport", lawful: "legal",
    summary: "Guilde des transporteurs.",
    gains: ["Contrats de transport réussis."], losses: ["Échecs de livraison."], ranks: [],
    rewards: ["Contrats plus lucratifs : cargaisons dangereuses ou périssables."], verified: true,
  },
  {
    id: "wikelo", name: "Wikelo's Emporium", systems: ["stanton"], type: "Collecte · Troc", lawful: "neutral",
    summary: "Marchand collectionneur installé sur les stations Dasi, Selo et Kinga. On lui apporte des objets, il donne des récompenses.",
    gains: ["Livrer les objets demandés (projets de collecte).", "Échanger des MG Scrip : 50 MG Scrip = 1 faveur Wikelo."],
    losses: ["Aucune perte connue."],
    ranks: [
      { name: "New Customer", xp: 0 },
      { name: "Very Good Customer", xp: 340, unlock: "Projets de niveau supérieur." },
      { name: "Very Best Customer", xp: 999, unlock: "Projets de troc haut de gamme." },
    ],
    rewards: ["Vaisseaux, armures et schémas contre des objets collectés.", "Le rang ne dispense pas des matériaux demandés.", "4.10.2 : recettes Gemini LMG et Grey Combat Armour."], verified: true,
  },
  {
    id: "rayari", name: "Rayari Incorporated", systems: ["stanton"], type: "Collecte scientifique", lawful: "legal",
    summary: "Collecte de gemmes et de pièces irradiées.",
    gains: ["Rapporter les objets demandés."], losses: ["Échecs de contrat."], ranks: [], rewards: ["Schémas en récompense des collectes."], verified: false,
  },
  {
    id: "shubin", name: "Shubin Interstellar", systems: ["stanton"], type: "Minage", lawful: "legal",
    summary: "Géant minier ; missions FPS et vaisseau liées aux installations minières.",
    gains: ["Missions Shubin réussies."], losses: ["Échecs de contrat."], ranks: [], rewards: ["Schémas sur certaines missions."], verified: false,
  },
  {
    id: "vaughn", name: "Vaughn", systems: ["stanton"], type: "Contact illégal", lawful: "illegal",
    summary: "Donneur de missions criminelles : éliminations de cibles et de « boss » dans Stanton.",
    gains: ["Éliminations réussies pour Vaughn."], losses: ["Échecs, abandon."], ranks: [],
    rewards: ["Schémas (ex. Rockcracker) sur les éliminations.", "Attention : missions illégales → CrimeStat."], verified: false,
  },
  {
    id: "minor-stanton", name: "Autres organisations Stanton", systems: ["stanton"], type: "Divers", lawful: "legal",
    summary: "Aciedo Communications, Amalga Disposal, BlacJac Security, Hockrow Agency, Klescher, United Wayfarers Club, Wildstar Racing (course), contacts Constantine Hurston, Clovus Darneely, Eddie Parr, Wallace Klim.",
    gains: ["Contrats réussis pour chaque émetteur."], losses: ["Échecs de contrat."], ranks: [],
    rewards: ["Missions supplémentaires propres à chaque émetteur ; peu documenté."], verified: false,
  },

  // ───────────── PYRO ─────────────
  {
    id: "cfp", name: "Citizens for Prosperity", systems: ["pyro"], type: "Faction d'ordre", lawful: "legal",
    summary: "Camp qui veut ramener l'ordre à Pyro. Rival direct des Headhunters.",
    gains: ["Missions CFP : éliminations, défense de vaisseau, « Fight for Pyro »."],
    losses: ["Aider les Headhunters.", "Échecs de contrat."],
    ranks: [], rewards: ["Missions d'élimination et de défense avec schémas en récompense.", "La première mission « Fight for Pyro » accomplie verrouille ton allégeance et ferme la piste rivale."],
    rivals: ["headhunters"], verified: true,
  },
  {
    id: "headhunters", name: "Headhunters", systems: ["pyro"], type: "Pirates", lawful: "illegal",
    summary: "Gang pirate dominant de Pyro. Rival direct des Citizens for Prosperity.",
    gains: ["Missions Headhunters : éliminations, défense de vaisseau."],
    losses: ["Aider Citizens for Prosperity.", "Échecs de contrat."],
    ranks: [], rewards: ["Missions d'élimination et de défense avec schémas.", "Soutenir ce camp rend l'autre hostile."],
    rivals: ["cfp"], verified: true,
  },
  {
    id: "pyro-contacts", name: "Contacts illégaux de Pyro", systems: ["pyro"], type: "Contacts", lawful: "illegal",
    summary: "Ruto, Tecia « Twitch » Pacheco, Tar Pits, Dead Saints, Bit Zeros, Nine Tails.",
    gains: ["Contrats réussis pour chaque contact."], losses: ["Échecs, trahison du contact."], ranks: [],
    rewards: ["Bit Zeros : récupération de boîtes noires → schémas.", "Autres : missions illégales, peu documenté."], verified: false,
  },

  // ───────────── NYX ─────────────
  {
    id: "intersec", name: "InterSec Defense Solutions", systems: ["nyx"], type: "Sécurité · Combat coordonné", lawful: "legal",
    summary: "Contractant de sécurité de Nyx. Échelle de contractant à 7 paliers.",
    gains: SECURITY_GAINS, losses: SECURITY_LOSSES,
    ranks: CONTRACTOR_LADDER.map((r) => r.name === "Sr. Contractor" ? { ...r, unlock: "Tactical Strike Group (7 vaisseaux ou plus) : +300 réputation et 2 schémas." } : r),
    rewards: ["Patrouilles, récupération de données, collecte de ressources → schémas.", "Tactical Strike Group : seul le propriétaire éligible touche la récompense ; les coéquipiers ont besoin de leur propre progression."], verified: true,
  },
  {
    id: "foxwell", name: "Foxwell Enforcement", systems: ["nyx", "stanton", "pyro"], type: "Sécurité · Combat", lawful: "legal",
    summary: "Contractant de sécurité présent dans les trois systèmes. Meilleure porte d'entrée pour les schémas.",
    gains: ["Mission d'introduction (onglet Mercenaire), puis patrouilles et embuscades.", ...SECURITY_GAINS],
    losses: SECURITY_LOSSES,
    ranks: CONTRACTOR_LADDER.map((r) => {
      const u: Record<string, string> = { "Jr. Contractor": "Security Sweep", "Contractor": "Orange Security Patrol", "Sr. Contractor": "Potential Security Threat", "Veteran Contractor": "High-Risk Security Patrol" };
      return u[r.name] ? { ...r, unlock: u[r.name] } : r;
    }),
    rewards: ["aUEC, réputation, MG Scrip et schémas sur les patrouilles.", "Missions « Ambush » : un schéma garanti parmi six à chaque réussite.", "50 MG Scrip = 1 faveur Wikelo."], verified: true,
  },
  {
    id: "adagio", name: "Adagio Holdings", systems: ["nyx", "stanton", "pyro"], type: "Récupération (salvage)", lawful: "legal",
    summary: "Contractant de récupération : concessions de salvage et schémas de têtes de scraper.",
    gains: ["Contrats de récupération réussis."], losses: SECURITY_LOSSES,
    ranks: CONTRACTOR_LADDER.map((r) => r.name === "Sr. Contractor" ? { ...r, unlock: "Concessions plus grandes (frais ≈ 100 000 aUEC à payer)." } : r),
    rewards: ["Schémas de têtes de récupération (Cinch, Abrade, Trawler selon le lot)."], verified: true,
  },
  {
    id: "recco", name: "Recco Battaglia", systems: ["nyx"], type: "Contact · Minage industriel", lawful: "legal",
    summary: "Contact de Levski. Piste industrielle : modules de minage puis vaisseaux « Alliance ».",
    gains: ["Trois missions d'histoire à faire dans l'ordre (les points seuls ne les sautent pas).", "Contrats miniers et industriels."],
    losses: ["Échecs de contrat."],
    ranks: [
      { name: "Introduction", unlock: "Schéma module Clearcut." },
      { name: "Associate", xp: 2400, unlock: "Schémas modules Deluge et Overrun." },
      { name: "Trusted Associate", xp: 6000, unlock: "Schémas GOLEM MC-4 et MISC Enhanced Ore Pod." },
      { name: "Prestige 1", xp: 10800, unlock: "Drake Golem « Alliance »." },
      { name: "Prestige 2", xp: 30000, unlock: "MISC Prospector « Alliance »." },
      { name: "Prestige 3", xp: 69600, unlock: "ARGO MOLE « Alliance »." },
    ],
    rewards: ["Vaisseaux de minage physiques en récompense (pas d'entrée My Hangar RSI garantie)."], verified: true,
  },
  {
    id: "eckhart", name: "Eckhart Security (Miles Eckhart)", systems: ["nyx"], type: "Sécurité", lawful: "legal",
    summary: "Contact sécurité de Nyx.",
    gains: ["Missions de défense de vaisseau."], losses: SECURITY_LOSSES, ranks: [], rewards: ["Schémas sur les missions de défense."], verified: false,
  },
  {
    id: "nyx-others", name: "People's Alliance · Shattered Blade · FTL Courier", systems: ["nyx"], type: "Divers", lawful: "neutral",
    summary: "Organisations de Nyx mentionnées par les guides, sans détail de paliers.",
    gains: ["Contrats réussis."], losses: ["Échecs."], ranks: [], rewards: ["Non documenté."], verified: false,
  },

  // ───────────── ÉVÉNEMENTS ─────────────
  {
    id: "cdf", name: "Civilian Defense Force", systems: ["events"], type: "Défense civile (événements)", lawful: "legal",
    summary: "Force de défense mobilisée pendant les événements dynamiques (XenoThreat, Siege of Orison…).",
    gains: ["Participer aux phases de l'événement côté UEE."], losses: ["Aider XenoThreat pendant un événement."],
    ranks: [], rewards: ["Récompenses d'événement : schémas (Siege of Orison), équipement, aUEC."], rivals: ["xenothreat"], verified: true,
  },
  {
    id: "xenothreat", name: "XenoThreat", systems: ["events"], type: "Terroristes (événements)", lawful: "illegal",
    summary: "Faction ennemie des événements XenoThreat. On peut aussi les aider, au prix des factions légales.",
    gains: ["Aider XenoThreat pendant l'événement."], losses: ["Combattre XenoThreat."],
    ranks: [], rewards: ["Récompenses d'événement côté hors-la-loi."], rivals: ["cdf"], verified: true,
  },
];

export const MECHANICS = {
  intro: "La réputation est suivie séparément pour chaque organisation, guilde, entreprise et certains contacts. Elle se consulte dans l'application Delphi du mobiGlas.",
  points: [
    "C'est l'émetteur du contrat qui gagne de la réputation, pas le type de mission ni le lieu.",
    "Les missions d'introduction, d'évaluation et de certification sont des portes : les points seuls ne les remplacent pas.",
    "Échelle positive Neutral → Friendly → Ally (avec sous-niveaux), négative Suspicious → Hostile → Enemy. Chaque organisation a ses propres noms de rangs.",
    "Perte : échec, abandon, expiration, destruction d'alliés ou d'objectifs protégés, fret perdu. Trop d'échecs : licencié 24 h par le donneur.",
    "Déclin lent quand on ignore une faction, en général jusqu'au bas du palier courant.",
    "Rivalités : monter chez l'un peut faire descendre chez son rival (Pyro : CFP ↔ Headhunters ; événements : CDF ↔ XenoThreat).",
    "Le « Character Repair » ne réinitialise ni la réputation ni le CrimeStat. Aucun reset connu : refaire des contrats à faible risque pour le même émetteur.",
    "Réputation remise à zéro lors du wipe 4.0 ; les schémas gagnés, eux, survivent aux wipes récents (règles susceptibles de changer).",
  ],
  version: "Alpha 4.10.2",
};

/**
 * Débuter — parcours guidé, checklists, dépannage et lexique.
 *
 * Touches : réglages par défaut clavier/souris (Options → Keybindings),
 * relevés sur starcitizen.tools (Guide:Controls, juil. 2026) et
 * Guide:New_Player_Guide (juin 2026). Les touches changent à chaque gros
 * patch : vérifier dans Options si une touche ne répond pas.
 * Le module Binds affichera plus tard tes propres touches à la place.
 */

export interface Step {
  id: string;
  title: string;
  text: string;
  keys?: { label: string; key: string }[];
  tip?: string;
  trap?: string;      // le piège classique
}

export interface Stage {
  id: string;
  title: string;
  goal: string;
  duration: string;
  steps: Step[];
}

export const STAGES: Stage[] = [
  {
    id: "spawn", title: "Se réveiller et sortir", goal: "Quitter l'habitation et atteindre le spatioport.", duration: "10 min",
    steps: [
      { id: "start-loc", title: "Choisir sa ville de départ", text: "Au premier lancement, l'onglet Univers te fait choisir une des quatre planètes de Stanton. Ce sera ta résidence et ton point de réapparition. Pour débuter : New Babbage (microTech) ou Lorville (Hurston), bien desservies et calmes. Area18 (ArcCorp) est très dense ; Orison (Crusader) est belle mais les trajets sont longs.",
        tip: "Ta résidence change quand tu dors dans un autre lieu équipé pour la réapparition (station, clinique)." },
      { id: "wake", title: "Se lever et s'équiper", text: "Tu te réveilles dans ton habitation. Interagis avec les objets (regarder, maintenir la touche d'interaction). Vérifie que tu portes bien une combinaison et un casque avant de sortir : l'espace et certaines lunes n'ont pas d'air.",
        keys: [{ label: "Interagir", key: "F" }, { label: "Inventaire", key: "I" }, { label: "mobiGlas", key: "F1" }],
        trap: "Sortir sans casque sur une lune sans atmosphère = mort en quelques secondes." },
      { id: "transit", title: "Ascenseur et métro", text: "Prends l'ascenseur, choisis le niveau du spatioport (ou « Transit »), puis le métro vers le spatioport. Les panneaux indiquent les destinations. Sur une station spatiale, tout est à quelques couloirs.",
        tip: "Les ascenseurs buggent parfois : si rien ne vient, change d'ascenseur ou attends 30 s." },
      { id: "food", title: "Manger et boire", text: "Ton personnage a faim et soif (jauges dans le mobiGlas). Achète une boisson et un plat dans un distributeur ou un commerce du spatioport ; consomme-les depuis l'inventaire ou en les tenant en main.",
        trap: "La déshydratation finit par tuer. Garde toujours une bouteille sur toi." },
    ],
  },
  {
    id: "ship", title: "Récupérer son vaisseau", goal: "Faire apparaître le vaisseau et monter à bord.", duration: "5 min",
    steps: [
      { id: "asop", title: "Terminal de flotte (ASOP)", text: "Au spatioport, cherche les terminaux « Fleet Manager ». Sélectionne ton vaisseau et « Retrieve » : un numéro de hangar ou de pad s'affiche. La première fois, le bouton dit « Deliver ».",
        tip: "Si le vaisseau est « détruit » ou perdu, fais une réclamation d'assurance (« Claim ») : il revient après un délai, raccourcissable contre des aUEC. Tout ce qu'il contenait est perdu." },
      { id: "hangar", title: "Aller au hangar", text: "Prends l'ascenseur des hangars, choisis le numéro indiqué, et marche jusqu'au vaisseau. Ouvre-le en regardant la porte ou la rampe (interaction) ; certains s'ouvrent avec une touche depuis l'extérieur.",
        keys: [{ label: "Interagir", key: "F" }] },
      { id: "seat", title: "S'asseoir et démarrer", text: "Assieds-toi dans le siège pilote (interaction). Maintiens « Flight Ready » pour allumer les systèmes : l'écran s'allume, les moteurs chauffent.",
        keys: [{ label: "Flight ready (maintenir)", key: "R" }, { label: "Quitter le siège (maintenir)", key: "Y" }],
        trap: "Portes ouvertes au décollage = dépressurisation. Vérifie qu'elles sont fermées (icône sur le MFD)." },
    ],
  },
  {
    id: "takeoff", title: "Premier décollage", goal: "Sortir du hangar et quitter la zone d'interdiction de vol.", duration: "5 min",
    steps: [
      { id: "atc", title: "Demander l'ouverture du hangar", text: "Dans un hangar fermé, demande l'ouverture au contrôle aérien : commlink du mobiGlas (F11) et appelle le contact ATC, ou touche de demande de décollage. Le toit s'ouvre.",
        keys: [{ label: "Commlink", key: "F11" }, { label: "Demander décollage / atterrissage", key: "Alt + N" }] },
      { id: "lift", title: "Décoller en douceur", text: "Rentre le train seulement une fois en l'air. Monte doucement avec la translation verticale, puis avance. Sur une planète, suis le couloir de sortie affiché jusqu'à quitter la zone d'interdiction (« no-fly zone »), sinon le jeu te renvoie ou te sanctionne.",
        keys: [{ label: "Monter / descendre", key: "Espace / Ctrl" }, { label: "Avancer / reculer", key: "W / S" }, { label: "Train d'atterrissage", key: "N" }, { label: "Limiteur de vitesse", key: "Molette" }],
        tip: "Le limiteur de vitesse (molette) est ton meilleur ami : bas pour manœuvrer, haut pour voyager." },
      { id: "modes", title: "Comprendre SCM et NAV", text: "En mode SCM (combat/manœuvre) la vitesse est limitée mais tu as armes et boucliers. En mode NAV, la vitesse est libre et le voyage quantique possible, mais armes et boucliers sont coupés. Tu passes de l'un à l'autre avec le mode quantique.",
        keys: [{ label: "Mode quantique (NAV)", key: "B" }, { label: "Couplé / découplé", key: "Alt + C" }, { label: "Frein spatial", key: "X" }, { label: "Boost", key: "Maj" }],
        trap: "Le mode découplé garde ton inertie : si tu ne sais pas pourquoi tu dérives, repasse en couplé." },
    ],
  },
  {
    id: "quantum", title: "Voyager en quantique", goal: "Rejoindre une station ou une autre planète.", duration: "5 à 15 min",
    steps: [
      { id: "starmap", title: "Choisir une destination", text: "Ouvre la carte stellaire, cherche la destination (station, ville, lune) et « Set Route ». Si elle est derrière une planète, la route passera par des marqueurs orbitaux (OM) : c'est normal, tu feras plusieurs sauts.",
        keys: [{ label: "Carte stellaire", key: "F2" }] },
      { id: "spool", title: "Caler et sauter", text: "Passe en mode quantique, aligne le réticule sur le marqueur de destination jusqu'à ce que le calibrage soit à 100 %, puis maintiens la touche pour sauter. Le voyage est automatique ; sortie un peu avant l'arrivée.",
        keys: [{ label: "Mode quantique", key: "B" }, { label: "Sauter (maintenir)", key: "B" }],
        trap: "Si « Obstructed » : un corps céleste bloque la ligne. Décale-toi ou vise d'abord un marqueur orbital." },
      { id: "fuel", title: "Surveiller le carburant", text: "Le carburant quantique ne se régénère pas. Fais le plein aux stations (menu services à l'atterrissage) ou avec un ravitailleur. Le carburant d'hydrogène, lui, se régénère lentement dans l'atmosphère.",
        trap: "Tomber en panne de quantique loin de tout = réclamation d'assurance ou appel à un autre joueur." },
    ],
  },
  {
    id: "landing", title: "Atterrir", goal: "Se poser proprement à une station ou une ville.", duration: "5 min",
    steps: [
      { id: "approach", title: "Approche", text: "À l'arrivée, ralentis (limiteur bas), vise les lumières de la plateforme ou l'entrée du hangar. Demande l'autorisation d'atterrir : un hangar ou un pad t'est attribué, affiché sur l'ATC.",
        keys: [{ label: "Demander l'atterrissage", key: "Alt + N" }, { label: "Train d'atterrissage", key: "N" }] },
      { id: "touchdown", title: "Se poser", text: "Train sorti, descends lentement au centre du pad. Dans un hangar, attends que le toit s'ouvre. Une fois posé, coupe les moteurs, quitte le siège, verrouille le vaisseau et range-le au terminal (« Store ») si tu changes de lieu.",
        tip: "Ranger le vaisseau au terminal le protège et récupère son contenu dans ton inventaire local." },
    ],
  },
  {
    id: "mission", title: "Premier contrat", goal: "Gagner ses premiers aUEC sans risque.", duration: "20 à 40 min",
    steps: [
      { id: "contracts", title: "Accepter une mission facile", text: "mobiGlas → Contracts. Pour commencer : livraisons de colis (onglet Delivery, « Local Delivery ») ou missions d'enquête simples. Évite les missions illégales (CrimeStat) et les primes supérieures à VLRT.",
        keys: [{ label: "mobiGlas", key: "F1" }],
        tip: "Les livraisons apprennent la navigation : plusieurs lieux, plusieurs atterrissages, peu de danger." },
      { id: "boxes", title: "Transporter un colis", text: "Au point de retrait, ouvre le casier indiqué, prends le colis (interaction, puis le porter), place-le dans le vaisseau (grille de cargo ou au sol, bien calé) et dépose-le au casier d'arrivée.",
        trap: "Un colis posé au sol du vaisseau peut glisser au décollage. Préfère une grille de cargo ou un coin." },
      { id: "paid", title: "Encaisser et monter en réputation", text: "Le paiement tombe à la fin. Chaque contrat réussi fait monter ta réputation auprès de l'émetteur (voir le module Réputations), ce qui débloque des contrats mieux payés.",
        tip: "Choisis un émetteur et reste fidèle quelques missions : la réputation est par organisation." },
    ],
  },
  {
    id: "survive", title: "Survivre et progresser", goal: "Éviter les pertes bêtes et choisir une voie.", duration: "en continu",
    steps: [
      { id: "death", title: "Mourir, et après", text: "Tu réapparais à ta résidence ou à la clinique la plus proche. Tu perds ce que tu portais (armure, armes, inventaire personnel), pas tes aUEC ni tes vaisseaux. Garde une tenue de rechange dans ton inventaire local.",
        keys: [{ label: "MedPen", key: "C" }] },
      { id: "crimestat", title: "Le CrimeStat", text: "Tirer sur un innocent, traverser une zone interdite, voler : tu gagnes un CrimeStat (CS 1 à 5). La sécurité te traque et tu ne peux plus atterrir dans les villes. Il s'efface en payant les amendes à un terminal (CS bas) ou en piratant un terminal de sécurité (CS élevé).",
        trap: "Ne tire jamais dans une zone armée (stations, villes) : le CrimeStat arrive vite." },
      { id: "career", title: "Choisir une carrière", text: "Livraisons → primes VLRT (chasseur) ; ou minage à la main puis au ROC ; ou transport de fret ; ou récupération. Chaque voie a son vaisseau de début et sa boucle. Le module Minage et le module Réputations t'aident à choisir.",
        tip: "Joue en groupe quand tu peux : les contrats partagés donnent réputation et paiement à tous, et une mort coûte moins cher." },
      { id: "events", title: "Suivre l'actualité", text: "Les événements dynamiques (Siege of Orison, XenoThreat, Jumptown…) arrivent par vagues. Le module Actualité te les montre ; attends d'être à l'aise en vol avant d'y participer.",
      },
    ],
  },
];

export interface Checklist { id: string; title: string; items: string[] }

export const CHECKLISTS: Checklist[] = [
  { id: "preflight", title: "Avant de décoller", items: [
    "Casque et combinaison portés",
    "Boisson et nourriture dans l'inventaire",
    "MedPens (au moins 2)",
    "Carburant quantique > 50 %",
    "Portes et rampe fermées",
    "Pas de CrimeStat actif",
    "Vaisseau verrouillé si je sors",
    "Destination définie sur la carte stellaire",
  ] },
  { id: "delivery", title: "Mission de livraison", items: [
    "Contrat accepté et lieux repérés sur la carte",
    "Place dans le vaisseau pour les colis",
    "Colis calé (grille de cargo ou coin)",
    "Ordre des arrêts noté (retrait puis dépôt)",
  ] },
  { id: "bounty", title: "Prime VLRT", items: [
    "Licence Tracker Training Permit obtenue",
    "Armes et boucliers vérifiés en SCM",
    "Munitions et missiles chargés",
    "Contre-mesures disponibles",
    "Répartition de puissance connue (U / I / O / P)",
  ] },
  { id: "mining", title: "Minage", items: [
    "Tête de minage adaptée (voir module Minage)",
    "Consommables de minage si disponibles",
    "Ravitaillement en quantique prévu",
    "Raffinerie d'arrivée repérée",
  ] },
];

export interface Trouble { id: string; title: string; text: string; link?: string }

export const TROUBLES: Trouble[] = [
  { id: "ship-gone", title: "Mon vaisseau a disparu", text: "Au terminal de flotte, s'il est « Destroyed » ou absent : « Claim » (réclamation d'assurance). Il revient après un délai, raccourcissable contre des aUEC. Son contenu est perdu. S'il est juste « Stored » ailleurs, il faut aller le chercher là-bas." },
  { id: "dead", title: "Je suis mort, qu'est-ce que j'ai perdu ?", text: "Tes vaisseaux, aUEC et réputation restent. Tu perds l'équipement porté et l'inventaire personnel. Un coéquipier peut récupérer ton corps ou ton sac avant qu'il disparaisse. Garde une tenue de secours dans l'inventaire local de ta résidence." },
  { id: "cs", title: "J'ai un CrimeStat", text: "CS 1–2 : paie les amendes à un terminal d'amendes (Fines) ou au kiosque d'une station. CS 3+ : pirater un terminal de sécurité (Security Post Kareah ou autres) avec un cryptokey, ou purger sa peine à la prison de Klescher. Évite les zones sécurisées tant que c'est actif." },
  { id: "elevator", title: "Ascenseur ou terminal qui ne répond pas", text: "Change d'ascenseur, attends 30 s, ou déconnecte-reconnecte (menu → Exit to menu, pas quitter le jeu). Les serveurs « 30k » (déconnexion) te remettent en général au même endroit grâce à la reprise." },
  { id: "mission-bug", title: "Mission bloquée", text: "Abandonne-la si possible (petite perte de réputation) et reprends-en une autre. Si elle reste bloquée, signale-la sur l'Issue Council de RSI.", link: "https://issue-council.robertsspaceindustries.com" },
  { id: "stuck", title: "Coincé dans le décor", text: "Essaie de t'accroupir, de sauter, ou d'utiliser l'inventaire pour poser/ramasser un objet. En dernier recours, le menu du jeu propose « Respawn » : tu réapparais comme après une mort." },
  { id: "obstructed", title: "Saut quantique « Obstructed »", text: "Une planète ou une lune est sur la trajectoire. Vise d'abord un marqueur orbital (OM-1 à OM-6) de la destination, saute, puis refais le saut vers le lieu." },
  { id: "no-fly", title: "Je suis renvoyé ou abattu près d'une ville", text: "Tu as traversé une zone d'interdiction de vol ou tiré en zone armée. Suis toujours le couloir de sortie affiché après le décollage, et ne tire jamais près des villes et stations." },
  { id: "status", title: "Le jeu est injouable aujourd'hui", text: "Vérifie l'état des serveurs (module Actualité, section Statut) et les patchs en cours. Les jours de patch, les files d'attente et les bugs sont fréquents : parfois il vaut mieux attendre.", link: "https://status.robertsspaceindustries.com" },
];

export interface Term { term: string; def: string }

export const GLOSSARY: Term[] = [
  { term: "aUEC", def: "Monnaie en jeu (alpha UEC). Remise à zéro lors des wipes." },
  { term: "ASOP / Fleet Manager", def: "Terminal pour faire apparaître, ranger ou réclamer ses vaisseaux." },
  { term: "ATC", def: "Contrôle aérien : à appeler pour ouvrir un hangar ou obtenir un pad." },
  { term: "Claim", def: "Réclamation d'assurance : fait réapparaître un vaisseau perdu, contenu perdu." },
  { term: "CrimeStat (CS)", def: "Niveau de criminalité, de 1 à 5. La sécurité te traque, les villes te refusent." },
  { term: "Couplé / découplé", def: "Couplé : le vaisseau compense l'inertie. Découplé : il glisse librement." },
  { term: "Delphi", def: "Application mobiGlas qui affiche tes réputations." },
  { term: "ERT / VHRT / HRT / MRT / LRT / VLRT", def: "Niveaux de primes, du plus dur (Extreme Risk Target) au plus facile (Very Low)." },
  { term: "Fabricator", def: "Machine de fabrication d'objets à partir de schémas (blueprints)." },
  { term: "Hangar persistant", def: "Ton hangar personnel, avec ascenseur de fret et stockage." },
  { term: "Jumptown", def: "Événement récurrent : site de drogue disputé entre joueurs." },
  { term: "LTI", def: "Assurance à vie sur un vaisseau acheté avec de l'argent réel. Sans effet en jeu aujourd'hui." },
  { term: "mobiGlas", def: "Ton interface personnelle (F1) : contrats, inventaire, carte, état du personnage." },
  { term: "MFD", def: "Écrans du cockpit : puissance, boucliers, armes, portes, train." },
  { term: "NAV / SCM", def: "Modes de vol : NAV pour voyager vite et sauter, SCM pour manœuvrer et combattre." },
  { term: "No-fly zone", def: "Zone d'interdiction de vol autour des villes : suivre le couloir de sortie." },
  { term: "OM-1 à OM-6", def: "Marqueurs orbitaux autour d'une planète, utiles pour contourner un obstacle quantique." },
  { term: "Ping / scan", def: "Impulsion de détection (V) qui révèle les signatures autour de toi." },
  { term: "PES / persistance", def: "Les objets posés restent dans le monde entre les sessions." },
  { term: "QT / Quantum", def: "Voyage quantique : déplacement rapide entre lieux, en mode NAV." },
  { term: "Réputation", def: "Ta cote auprès de chaque organisation ; débloque des contrats." },
  { term: "ROC", def: "Véhicule terrestre de minage de gemmes." },
  { term: "R&R", def: "Stations « Rest & Relax » aux points de Lagrange : repos, carburant, boutiques." },
  { term: "Schéma / Blueprint", def: "Recette permanente pour fabriquer un objet au Fabricator." },
  { term: "Spectrum", def: "Forums officiels de RSI." },
  { term: "Store", def: "Ranger un vaisseau au terminal : il est protégé et son contenu passe en inventaire local." },
  { term: "Wipe", def: "Remise à zéro de la progression (aUEC, objets) lors de certains patchs." },
  { term: "30k", def: "Crash serveur (erreur 30000). La reprise te remet en général au même endroit." },
];

export const DATA_VERSION = "Alpha 4.10.x — touches par défaut clavier/souris";

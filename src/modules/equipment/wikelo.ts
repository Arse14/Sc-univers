/**
 * Contrats de Wikelo (le collectionneur Banu) : ce qu'il demande, ce qu'il
 * donne. Relevé de la page « Wikelo » du wiki communautaire starcitizen.tools
 * le 14/11/2026 — ses offres changent à chaque patch, la date est affichée.
 * Format d'une ligne : catégorie | nom | réputation | demandes | récompenses | image.
 */
import { loadStore, saveStore } from "../../lib/tauri";

export const WIKELO_DATE = "14/11/2026";
export const WIKELO_SOURCE = "https://starcitizen.tools/Wikelo";

export type WikeloCat = "ship" | "weapon" | "armor" | "currency" | "other";
export const WIKELO_CATS: { id: WikeloCat; label: string }[] = [
  { id: "ship", label: "Vaisseaux et véhicules" },
  { id: "weapon", label: "Armes" },
  { id: "armor", label: "Armures" },
  { id: "currency", label: "Monnaies" },
  { id: "other", label: "Autres" },
];

export interface Line { qty: number; unit: "" | "SCU"; name: string; blueprint: boolean }
export interface Contract { id: string; cat: WikeloCat; name: string; rep: string; orders: Line[]; rewards: Line[]; thumb: string | null; large: string | null; image: string | null }

const RAW = `
C|Trade Council Scrip for Favors?||50x Council Scrip|1x Wikelo Favor|
C|Trade Merc Scrip for Favors?||50x MG Scrip|1x Wikelo Favor|
C|Trade Worm Parts for Favors?||12x Irradiated Valakkar Pearl (Grade AA)|1x Wikelo Favor|
C|Turn Things to Favor||50x Carinite|1x Wikelo Favor|
C|Want Polaris? Need something special.||24 SCU Quantainium|1x Polaris Bit|
W|Big Style LMG||1x F55 LMG; 5x Vanduul Metal; 20x Jaclium (Ore)|1x F55 "Shadowflux" LMG; 20x F55 LMG Magazine (150 cap); F55 "Shadowflux" LMG blueprint|/4/48/Big_Style_LMG_-_infobox.jpg
W|Curious Weapon||2x Vanduul Plating; 2x Vanduul Metal; 1x Boomtube Rocket Launcher|1x Boomtube "Clanguard" Rocket Launcher; 1x Boomtube Rocket|/d/da/Curious_Weapon.png
W|Fun Kopion Skull Gun||10x Carinite; 15x Saldynium (Ore); 1x Parallax Energy Assault Rifle; 20x Tundra Kopion Horn; 20x Jaclium (Ore)|1x Parallax "Fun Kopion Skull" Energy Assault Rifle; 20x Parallax Rifle Battery (80 Cap)|/7/77/Kopion_Skull_Right.png
W|Fun Military Skull Gun||10x Carinite; 15x Saldynium (Ore); 1x Parallax Energy Assault Rifle; 20x Irradiated Valakkar Fang (Juvenile); 20x Jaclium (Ore)|1x Parallax "Fun Military Skull" Energy Assault Rifle; 20x Parallax Rifle Battery (80 Cap)|/d/de/Fun_Military_Skull_Gun.png
W|Hot Shot||20x Carinite; 20x Bluemoon Fungus; 1x Tripledown Pistol|1x Tripledown "Heatwave" Pistol; 20x Tripledown Pistol Magazine (12 Cap)|/0/03/Hot_Shot.jpg
W|Make VOLT shotgun angrier||10x Irradiated Valakkar Fang (Adult); 5x Irradiated Valakkar Fang (Juvenile); 1x Prism Laser Shotgun|1x Prism "Irradiated" Laser Shotgun; 20x Prism Laser Shotgun Battery (20 cap)|/b/b0/Make_VOLT_shotgun_angrier.png
W|Red Fight Shotgun||3x Wikelo Favor; 10x Sadaryx; 1x R97 Shotgun|1x R97 "Crimson Camo" Shotgun; 20x R97 Shotgun Magazine (18 cap)|/7/7c/R97_Crimson_Camo_Shotgun.png
W|Snow Snipe||7x ASD Secure Drive; 1x Zenith Laser Sniper Rifle|1x Zenith "Snow Camo" Laser Sniper Rifle; 20x Zenith Laser Sniper Rifle Battery (22 Cap)|/6/6c/Zenith_Snow_Camo_Laser_Sniper_Rifle.png
W|Too Much Gun||1x Wikelo Favor; 1x Vendetta HMG|1x Vendetta "Snow Camo" HMG; 20x Vendetta HMG Magazine (1000 Cap); Vendetta "Snow Camo" HMG blueprint|/c/c6/Too_Much_Gun_-_infobox.png
W|Yormandi Gun||6x Yormandi Eye; 3x Yormandi Tongue; 1x Fresnel Energy LMG|1x Fresnel "Yormandi" Energy LMG|/8/8d/Yormandi_Gun.png
W|Your Best Shot||1x Wikelo Favor; 1x Killshot Rifle; 1x Expired Quantanium Fuel Canister|1x Killshot "Dominion Camo" Rifle; 20x Killshot Rifle Magazine (45 Cap); Killshot "Dominion Camo" Rifle blueprint|/7/73/Killshot_Dominion_Camo_Rifle.png
A|Armor with Vanduul||15x Vanduul Plating; 15x Vanduul Metal; 1x Testudo Legs Turfwar; 1x Testudo Helmet Turfwar; 1x Testudo Core Turfwar; 1x Testudo Arms Turfwar; 1x Testudo Backpack Turfwar|1x Testudo Helmet Clanguard; 1x Testudo Arms Clanguard; 1x Testudo Core Clanguard; 1x Testudo Legs Clanguard; 1x Testudo Backpack Clanguard|/c/c5/Armor_with_Vanduul.png
A|Do Lava Suit||30x Carinite; 4x RCMBNT-PWL-1; 4x RCMBNT-PWL-2; 4x RCMBNT-PWL-3; 1x Strata Arms; 1x Strata Legs; 1x Strata Helmet; 1x Strata Backpack; 1x Strata Core|1x Strata Core Heatwave; 1x Strata Arms Heatwave; 1x Strata Legs Heatwave; 1x Strata Helmet Heatwave; 1x Strata Backpack Heatwave|/f/fe/Lava_armor.jpg
A|Heavy and Bright||1x Wikelo Favor; 1x BUL-H4 Helmet; 1x BUL-H4 Armor; 1x H4-PBF Ammo Carrier|1x BUL-H4 Helmet Snow Camo; 1x BUL-H4 Armor Snow Camo; 1x H4-PBF Ammo Carrier Snow Camo; H4-PBF Ammo Carrier Snow Camo blueprint; BUL-H4 Helmet Snow Camo blueprint; BUL-H4 Armor Snow Camo blueprint|/b/b0/Heavy_and_Bright_-_infobox.png
A|Hide Snow Suit||4x ASD Secure Drive; 1x Geist Armor Arms ASD Edition; 1x Geist Armor Core ASD Edition; 1x Geist Armor Helmet ASD Edition; 1x Geist Armor Legs ASD Edition; 1x Geist Backpack ASD Edition|1x Geist Armor Arms Snow Camo; 1x Geist Armor Core Snow Camo; 1x Geist Armor Helmet Snow Camo; 1x Geist Armor Legs Snow Camo; 1x Geist Backpack Snow Camo|/3/3c/Hide_Snow_Suit.png
A|Make glowy armor||1x Antium Core; 1x Antium Helmet; 1x Antium Arms; 1x Antium Legs; 1x Irradiated Valakkar Pearl (Grade AAA)|1x Bokto Core; 1x Bokto Arms; 1x Bokto Legs; 1x Bokto Helmet|/8/83/Make_glowy_armor.png
A|Monolith Armor Very Smooth||1x Monolith Armor Legs; 1x Monolith Armor Arms; 1x Monolith Armor Core; 1x Monolith Helmet; 1x Monolith Backpack; 10x Vanduul Metal; 25x Saldynium (Ore)|1x Monolith Armor Legs Shadowflux; 1x Monolith Armor Core Shadowflux; 1x Monolith Backpack Shadowflux; 1x Monolith Armor Arms Shadowflux; 1x Monolith Helmet Shadowflux; Monolith Armor Arms Shadowflux blueprint; Monolith Backpack Shadowflux blueprint; Monolith Armor Core Shadowflux blueprint; Monolith Armor Legs Shadowflux blueprint|/7/7d/Monolith_Shadowflux.jpg
A|Red Fight Armor||3x Wikelo Favor; 10x Sadaryx; 1x Monde Helmet; 1x Monde Core; 1x Monde Arms; 1x Monde Legs; 1x Warden Backpack Monde|1x Monde Helmet Crimson Camo; 1x Monde Core Crimson Camo; 1x Monde Arms Crimson Camo; 1x Monde Legs Crimson Camo; 1x Warden Backpack Crimson Camo|/c/c2/Monde_Set_Crimson_Camo_Wikelo.png
A|Shiny Builder Suit||1x Corbel Core Mire; 1x Corbel Arms Mire; 1x Corbel Legs Mire; 1x Novikov Backpack Mire; 10x ASD Secure Drive; 3x RCMBNT-RGL-1; 3x RCMBNT-RGL-2; 3x RCMBNT-RGL-3; 1x Corbel Helmet Mire|1x Corbel Helmet Crush; 1x Corbel Core Crush; 1x Corbel Arms Crush; 1x Corbel Legs Crush; 1x Novikov Backpack Crush|/5/54/Shiny_Builder_Suit.png
A|Suit Up Take Off||1x Wikelo Favor; 1x Tailwind Flight Suit; 1x Tailwind Flight Helmet; 1x Expired Quantanium Fuel Canister|1x Tailwind Flight Suit Dominion Camo; 1x Tailwind Flight Helmet Dominion Camo; Tailwind Flight Suit Dominion Camo blueprint; Tailwind Flight Helmet Dominion Camo blueprint|/0/02/Tailwind_Flight_Suit_Wikelo.png
A|Test Armor||14x Yormandi Eye; 7x Yormandi Tongue; 1x Palatino Helmet; 1x Palatino Arms; 1x Palatino Legs; 1x Palatino Core; 1x Palatino Backpack|1x Palatino Helmet Mark I; 1x Palatino Arms Mark I; 1x Palatino Legs Mark I; 1x Palatino Core Mark I; 1x Palatino Backpack Mark I|/e/ee/Test_Armor.png
S|ATLS Cool Metal Color||1x Wikelo Favor; 1x Carinite (Pure); 1x Argo ATLS|1x ATLS Cool Metal Color|
S|ATLS Orange Line||1x Wikelo Favor; 36 SCU Quantainium; 1x Argo ATLS; 8 SCU Copper; 8 SCU Tungsten; 8 SCU Corundum|1x ATLS Orange Line|
S|ATLS Snowland Color||1x Wikelo Favor; 1x Irradiated Valakkar Pearl (Grade AAA); 1x Argo ATLS|1x ATLS Snowland Color|
S|Make ATLS shoot||2x Wikelo Favor; 5x Irradiated Valakkar Fang (Apex); 1x Argo ATLS; 2x NN-13 Cannon|1x Argo ATLS IKTI|/6/63/ATLS_WIKELO.png
S|Make a Ursa Mod||4x Wikelo Favor; 20x Saldynium (Ore); 20x Jaclium (Ore)|1x RSI Ursa Medivac Wikelo Special|/1/18/Ursa_Medivac_Wikelo.png
S|Make jumpy ATLS shoot||1x Wikelo Favor; 1x Argo ATLS; 2x NN-13 Cannon; 5x Irradiated Valakkar Fang (Apex); 36 SCU Quantainium|1x Argo ATLS GEO IKTI|/6/63/ATLS_WIKELO.png
S|Pulse Plus||4x Wikelo Favor|1x Mirai Pulse Wikelo Special|
S|Asgard Fight Mod.||50x Wikelo Favor; 5x RCMBNT-PWL-1; 5x RCMBNT-PWL-2; 5x RCMBNT-PWL-3; 5x RCMBNT-RGL-1; 5x RCMBNT-RGL-2; 5x RCMBNT-RGL-3; 5x RCMBNT-XTL-1; 5x RCMBNT-XTL-2; 5x RCMBNT-XTL-3; 3x ASD Secure Drive|1x Anvil Asgard Wikelo War Special|/1/13/Asgard_Wikelo.jpg
S|Build a Mod Scorpius||15x Wikelo Favor; 4x DCHS-05 Orbital Positioning Comp-Board; 1x Tevarin War Service Marker (Pristine)|1x RSI Scorpius Wikelo Sneak Special|/6/6f/Scorpius_Wikelo.jpg
S|Clipper Fight Now||1x Metamaterial Test #152|1x Drake Clipper Wikelo War Special; Metamaterial Test #152 blueprint|
S|Extra Special Wolf||1x Metamaterial Test #146|1x Kruger L-22 Alpha Wolf Wikelo War Special; Metamaterial Test #146 blueprint|
S|F8 War Mod||40x Wikelo Favor; 4x Carinite (Pure); 4x Irradiated Valakkar Pearl (Grade AAA); 4x Tevarin War Service Marker (Pristine)|1x Anvil F8C Lightning Wikelo War Special|/7/70/F8C_Lightning_Wikelo.png
S|Firebird Mod||15x Wikelo Favor; 4x DCHS-05 Orbital Positioning Comp-Board; 3x Ace Interceptor Helmet; 1x Government Cartography Agency Medal (Pristine)|1x Aegis Sabre Firebird Wikelo War Special|/d/d7/Sabre_Firebird_Wikelo.png
S|Fortune ship for you||3x Wikelo Favor; 1x Carinite (Pure)|1x MISC Fortune Wikelo Special|/2/21/Fortune_Wikelo.jpg
S|Golem Rocks||2x Wikelo Favor; 15x ASD Secure Drive|1x Drake Golem Wikelo Work Special|/b/ba/Golem_Wikelo.jpg
S|Guardian Fight Mod||15x Irradiated Valakkar Pearl (Grade AA); 10x Ace Interceptor Helmet; 1x Tevarin War Service Marker (Pristine); 20x Wikelo Favor|1x Mirai Guardian Wikelo War Special|/5/5d/Guardian_Wikelo.png
S|Guardian Wik-X||25x Wikelo Favor; 30x Vanduul Plating; 30x Vanduul Metal; 15x Ace Interceptor Helmet; 2x Large Artifact Fragment (Pristine)|1x Mirai Guardian MX Wikelo War Special|/5/5d/Guardian_Wikelo.png
S|Guardian take down ship||25x Wikelo Favor; 15x Irradiated Valakkar Pearl (Grade AA); 15x DCHS-05 Orbital Positioning Comp-Board; 2x UEE 6th Platoon Medal (Pristine)|1x Mirai Guardian QI Wikelo Special|/5/5d/Guardian_Wikelo.png
S|More than a Max||30x Wikelo Favor; 10x Ace Interceptor Helmet; 3x Carinite (Pure); 3x Irradiated Valakkar Pearl (Grade AAA)|1x MISC Starlancer MAX Wikelo Work Special|/b/b1/Starlancer_MAX_Wikelo.png
S|Most Special Wolf|Very Good Customer|5x Wikelo Favor|1x Antium Helmet Midnight Sun; 1x Antium Core Midnight Sun; 1x Antium Arms Midnight Sun; 1x Antium Legs Midnight Sun; 1x Fresnel "Deepwater" Energy LMG; 1x Kruger L-21 Wolf Wikelo War Special|/0/00/L-21_Wolf_Military_Wikelo.jpg
S|Now make Polaris. Short Time Deal.||50x Wikelo Favor; 15x Polaris Bit; 10x DCHS-05 Orbital Positioning Comp-Board; 20x Carinite; 20x Irradiated Valakkar Fang (Apex); 20x MG Scrip; 15x Ace Interceptor Helmet; 15x Irradiated Valakkar Pearl (Grade AAA); 15x UEE 6th Platoon Medal (Pristine); 15x Carinite (Pure); 15x ASD Secure Drive; 1x RCMBNT-PWL-1; 1x RCMBNT-PWL-2; 1x RCMBNT-PWL-3; 1x RCMBNT-RGL-1; 1x RCMBNT-RGL-2; 1x RCMBNT-RGL-3; 1x RCMBNT-XTL-1; 1x RCMBNT-XTL-2; 1x RCMBNT-XTL-3|1x RSI Polaris Wikelo Special|/6/62/Polaris_Wikelo.jpg
S|Peregrine Wikelo Mod||4x Wikelo Favor; 1x DCHS-05 Orbital Positioning Comp-Board|1x Aegis Sabre Peregrine Wikelo Speedy Special|/3/31/Sabre_Peregrine_Wikelo.png
S|Prospects Look Good||6x Wikelo Favor; 20x Carinite; 30x Saldynium (Ore); 40x Jaclium (Ore); 1x Carinite (Pure)|1x MISC Prospector Wikelo Work Special|/7/75/Prospector_Wikelo.png
S|Prowler More Utility||40x Wikelo Favor; 10x Yormandi Tongue; 20x Yormandi Eye; 3x Irradiated Valakkar Pearl (Grade AAA); 3x Carinite (Pure)|1x Esperia Prowler Utility Wikelo Work Special|/6/64/Prowler_Utility_Wikelo.jpg
S|RSI Meteor Mod||10x Wikelo Favor; 10x Vanduul Plating; 10x Vanduul Metal; 5x Ace Interceptor Helmet; 1x Large Artifact Fragment (Pristine)|1x RSI Meteor Wikelo Sneak Special|/6/6a/Meteor_Wikelo.png
S|Ready for Raft?||8x Wikelo Favor; 10x Irradiated Valakkar Fang (Adult); 20x Irradiated Valakkar Fang (Juvenile); 5x Irradiated Kopion Horn; 1x Irradiated Valakkar Pearl (Grade AAA)|1x Argo RAFT Wikelo Work Special|/6/6e/RAFT_Wikelo.jpg
S|Red Fight Apollo||30x Wikelo Favor; 48 SCU Savrilium|1x RSI Apollo Triage Wikelo Sneak Special|/5/51/Apollo_Triage_Wikelo.jpg
S|Sneaky Stabber||40x Wikelo Favor; 15x DCHS-05 Orbital Positioning Comp-Board; 3x Carinite (Pure); 3x Irradiated Valakkar Pearl (Grade AAA)|1x Anvil F8C Lightning Wikelo Sneak Special|/7/70/F8C_Lightning_Wikelo.png
S|Sneaky Starfighter Ion||10x Wikelo Favor; 10x Yormandi Eye; 5x Ace Interceptor Helmet; 1x Tevarin War Service Marker (Pristine)|1x Crusader Ares Star Fighter Ion Wikelo Sneak Special|/a/a9/Ares_Wikelo.jpg
S|Special Idris For Killing|Very Best Customer|50x Wikelo Favor; 50x Polaris Bit; 50x DCHS-05 Orbital Positioning Comp-Board; 50x Carinite; 50x Irradiated Valakkar Fang (Apex); 50x MG Scrip; 50x Ace Interceptor Helmet; 30x Irradiated Valakkar Pearl (Grade AAA); 30x UEE 6th Platoon Medal (Pristine); 30x Carinite (Pure); 30x ASD Secure Drive; 5x RCMBNT-PWL-1; 5x RCMBNT-PWL-2; 5x RCMBNT-PWL-3; 5x RCMBNT-RGL-1; 5x RCMBNT-RGL-2; 5x RCMBNT-RGL-3; 5x RCMBNT-XTL-1; 5x RCMBNT-XTL-2; 5x RCMBNT-XTL-3|1x Aegis Idris-P Wikelo War Special|/e/ec/Idris-P_Wikelo.jpg
S|Spirit Cargo mod||8x Wikelo Favor; 1x Tevarin War Service Marker (Pristine)|1x Crusader C1 Spirit Wikelo Special|/6/6d/C1_Spirit_Wikelo.png
S|Starfighter Inferno Special||10x Wikelo Favor; 5x Yormandi Tongue; 5x Ace Interceptor Helmet; 1x UEE 6th Platoon Medal (Pristine)|1x Crusader Ares Star Fighter Inferno Wikelo War Special|/a/a9/Ares_Wikelo.jpg
S|Starlifter A2 War Mod||50x Wikelo Favor; 20x Polaris Bit; 20x MG Scrip; 6x ASD Secure Drive; 6x Irradiated Valakkar Pearl (Grade AAA); 6x Tevarin War Service Marker (Pristine); 6x DCHS-05 Orbital Positioning Comp-Board; 6x Carinite (Pure)|1x Crusader A2 Hercules Starlifter Wikelo War Special|/0/0c/A2_Hercules_Starlifter_Wikelo.png
S|Upgrade Intrepid||3x Wikelo Favor; 1x Government Cartography Agency Medal (Pristine)|1x Crusader Intrepid Wikelo Work Special|/b/bd/Intrepid_Wikelo.png
S|Want Taurus ship||30x Wikelo Favor; 3x Carinite (Pure); 3x Irradiated Valakkar Pearl (Grade AAA); 3x Government Cartography Agency Medal (Pristine)|1x RSI Constellation Mk IV Taurus Wikelo War Special|/a/a0/Constellation_Taurus_Wikelo.jpg
S|What is Terrapin?||15x Wikelo Favor; 10x ASD Secure Drive; 1x Tevarin War Service Marker (Pristine)|1x Anvil Terrapin Medic Wikelo Savior Special|/9/9e/Terrapin_Medic_Wikelo.png
S|Where Wolf? Here Wolf||10x Wikelo Favor; 10x Vanduul Plating; 10x Vanduul Metal; 1x Large Artifact Fragment (Pristine)|1x Kruger L-21 Wolf Wikelo Sneak Special|/6/6e/L-21_Wolf_%28Stealth%29_Wikelo.jpg
S|Wikelo Navy F7||16x Wikelo Favor; 3x DCHS-05 Orbital Positioning Comp-Board; 5x Ace Interceptor Helmet; 1x Government Cartography Agency Medal (Pristine)|1x Anvil F7 Hornet Mk Wikelo|/e/e3/F7C-M_Super_Hornet_MK-II_Wikelo.jpg
S|Zeus Cargo Special||20x Wikelo Favor; 15x Carinite; 10x Ace Interceptor Helmet; 2x Carinite (Pure)|1x RSI Zeus Mk II CL|/f/f4/Zeus_MK_II_CL_Wikelo.png
S|Zeus Special||10x Wikelo Favor; 1x UEE 6th Platoon Medal (Pristine)|1x RSI Zeus Mk II ES Wikelo Work Special|/a/ac/Zeus_Mk_II_ES_Wikelo.png
O|Very Hungry||1x Berry Blend Smoothie; 1x Ermer Family Farms Fat Free Ice Cream|1x IAE 2951 Hat Blue; 1x IAE 2951 T-Shirt Blue; 1x IAE 2951 T-Shirt White; 1x IAE 2951 Hat White; 1x IAE 2952 T-shirt Black; 1x IAE 2952 T-shirt Red; 1x IAE 2952 Hat Red; 1x IAE 2953 Hat Purple; 1x IAE 2953 Shirt Purple; 1x IAE 2953 Shirt White; 1x IAE 2953 Hat White; 1x IAE 2954 T-Shirt Purple; 1x IAE 2954 Hat Purple; 1x IAE 2954 T-Shirt White; 1x IAE 2954 Hat White; 1x Coda "Ascension" Pistol; 20x Coda Pistol Magazine (6 cap); 1x Karna "Ascension" Rifle; 20x Karna Rifle Battery (35 cap); 1x Demeco "Red Alert" LMG; 20x Demeco LMG Battery (100 cap); 1x Gallant "Red Alert" Rifle; 20x Gallant Rifle Battery (45 cap); 1x Ravager-212 "Red Alert" Twin Shotgun; 20x Ravager-212 Twin Shotgun Magazine (16 cap); 1x P8-SC "Red Alert" SMG; 20x P8-SC SMG Magazine (45 cap); 1x A03 "Red Alert" Sniper Rifle; 20x A03 Sniper Rifle Magazine (15 cap); 69x Citrus Beef Burrito; 420x Snaggle Stick (Smoke Daddy)|
`;

const CAT: Record<string, WikeloCat> = { C: "currency", W: "weapon", A: "armor", S: "ship", O: "other" };
const MEDIA = "https://media.starcitizen.tools";

function parseLine(s: string): Line {
  const t = s.trim();
  let m = t.match(/^(\d+)x\s+(.+)$/);
  if (m) return { qty: Number(m[1]), unit: "", name: m[2], blueprint: false };
  m = t.match(/^(\d+)\s+SCU\s+(.+)$/);
  if (m) return { qty: Number(m[1]), unit: "SCU", name: m[2], blueprint: false };
  const bp = / blueprint$/i.test(t);
  return { qty: 1, unit: "", name: bp ? t.replace(/ blueprint$/i, "") : t, blueprint: bp };
}

export const CONTRACTS: Contract[] = RAW.trim().split("\n").map((row) => {
  const [c, name, rep, orders, rewards, img] = row.split("|");
  const file = img ? img.slice(img.lastIndexOf("/") + 1) : "";
  return {
    id: name, cat: CAT[c], name, rep,
    orders: orders.split(";").map(parseLine), rewards: rewards.split(";").map(parseLine),
    thumb: img ? `${MEDIA}/thumb${img}/200px-${file}.webp` : null,
    large: img ? `${MEDIA}/thumb${img}/600px-${file}.webp` : null,
    image: img ? MEDIA + img : null,
  };
});

/** Ce qu'on obtient d'abord : le vaisseau, l'arme ou la première pièce (hors chargeurs et plans). */
export const mainReward = (c: Contract): Line =>
  c.rewards.find((r) => /Wikelo|Special/i.test(r.name) && !r.blueprint) ?? c.rewards.find((r) => !r.blueprint && r.qty === 1) ?? c.rewards[0];
export const givesBlueprint = (c: Contract) => c.rewards.some((r) => r.blueprint);
export const favorCost = (c: Contract) => c.orders.find((o) => o.name === "Wikelo Favor")?.qty ?? 0;

export const REP_FR: Record<string, string> = { "Very Good Customer": "Très bon client", "Very Best Customer": "Meilleur client" };

/** Les quatre façons d'obtenir une Faveur de Wikelo, d'après ses contrats « monnaies ». */
export const FAVOR_WAYS = CONTRACTS.filter((c) => c.cat === "currency" && c.rewards[0].name === "Wikelo Favor").map((c) => c.orders[0]);

/** Total des demandes de plusieurs contrats, du plus demandé au moins demandé. */
export function shoppingList(list: Contract[]): (Line & { from: number })[] {
  const m = new Map<string, Line & { from: number }>();
  for (const c of list) for (const o of c.orders) {
    const k = o.unit + "|" + o.name;
    const cur = m.get(k);
    if (cur) { cur.qty += o.qty; cur.from++; } else m.set(k, { ...o, from: 1 });
  }
  return [...m.values()].sort((a, b) => (b.name === "Wikelo Favor" ? 1 : 0) - (a.name === "Wikelo Favor" ? 1 : 0) || b.qty - a.qty || a.name.localeCompare(b.name));
}

/* suivi personnel : contrats qui m'intéressent, contrats déjà faits */
export interface WikeloState { wanted: string[]; done: string[] }
export async function loadWikelo(): Promise<WikeloState> {
  const s = await loadStore<Partial<WikeloState>>("wikelo").catch(() => null);
  return { wanted: Array.isArray(s?.wanted) ? s!.wanted! : [], done: Array.isArray(s?.done) ? s!.done! : [] };
}
export const saveWikelo = (s: WikeloState) => saveStore<WikeloState>("wikelo", s);

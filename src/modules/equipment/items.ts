/**
 * Équipement : catégories, objets, prix par terminal et caractéristiques,
 * lus sur UEX et condensés à la réception. Les listes sont gardées 7 jours,
 * les fiches (prix + caractéristiques) 30 minutes, dix fiches au plus.
 */
import { Bucket, TTL_PRICES, TTL_STATIC, UexError, cached, uexGet, whereOf, type Any, type Loaded } from "../market/uex";

const num = (x: unknown): number => { const n = Number(x); return isFinite(n) ? n : 0; };
const str = (x: unknown): string => typeof x === "string" ? x.trim() : x == null ? "" : String(x);

export interface Category { id: number; section: string; name: string }

/** Sections UEX affichées, dans l'ordre, avec leur libellé français. */
export const SECTIONS: { id: string; label: string }[] = [
  { id: "Armor", label: "Armures" },
  { id: "Undersuits", label: "Sous-combinaisons" },
  { id: "Personal Weapons", label: "Armes personnelles" },
  { id: "Clothing", label: "Vêtements" },
  { id: "Systems", label: "Composants de vaisseau" },
  { id: "Vehicle Weapons", label: "Armes de vaisseau" },
  { id: "Utility", label: "Utilitaires" },
  { id: "Liveries", label: "Peintures" },
];
export const OTHER_SECTION = "__autres";

const CAT_FR: Record<string, string> = {
  Arms: "Bras", Backpacks: "Sacs à dos", Helmets: "Casques", Legs: "Jambes", Torso: "Torse", "Full Set": "Ensembles complets",
  Undersuits: "Sous-combinaisons", Attachments: "Accessoires d'arme", "Personal Weapons": "Armes",
  Footwear: "Chaussures", Gloves: "Gants", Hats: "Couvre-chefs", Jackets: "Vestes", Jumpsuits: "Combinaisons", Legwear: "Pantalons", Shirts: "Hauts", Eyeware: "Lunettes",
  Coolers: "Refroidisseurs", "Power Plants": "Générateurs", "Quantum Drives": "Moteurs quantiques", "Shield Generators": "Boucliers",
  Liveries: "Peintures de vaisseau", Guns: "Canons", "Missile Racks": "Râteliers à missiles", Missiles: "Missiles", Turrets: "Tourelles", Bombs: "Bombes", "Bomb Racks": "Râteliers à bombes",
  "Point Defense Cannon": "Défense rapprochée", "Mining Laser Heads": "Têtes de minage", "Mining Modules": "Modules de minage", Gadgets: "Gadgets de minage",
  "Tractor Beams": "Rayons tracteurs", "Scraper Beams": "Rayons de décapage", "Salvage Beams": "Rayons de récupération", "Docking Collars": "Colliers d'amarrage",
  "External Fuel Tanks": "Réservoirs externes", Container: "Conteneurs", Fabricator: "Fabricateurs",
  Consumables: "Consommables", Consumable: "Consommables", Drinks: "Boissons", Foods: "Nourriture", Miscellaneous: "Divers", Decorations: "Décorations",
  Mobiglas: "mobiGlas", Module: "Modules", "Flight Blade": "Lames de vol", Radar: "Radars", "Jump Modules": "Modules de saut", Surface: "Flair (surfaces)",
};
export const catLabel = (c: Category) => CAT_FR[c.name] ?? c.name;

export function loadCategories(minAt = 0): Promise<Loaded<Category[]>> {
  return cached<Category[]>("equip-categories", TTL_STATIC, async () => {
    const data = await uexGet("/categories?type=item");
    const out: Category[] = [];
    for (const c of data) {
      if (num(c.is_game_related) !== 1 || str(c.type) !== "item") continue;
      out.push({ id: num(c.id), section: str(c.section), name: str(c.name) });
    }
    if (out.length === 0) throw new UexError("data", "UEX n'a renvoyé aucune catégorie d'objets.");
    return out;
  }, minAt);
}

export interface Item { id: number; uuid: string; shot: string; name: string; company: string; size: string; excl: "" | "pledge" | "subscriber" | "concierge" }

/** Les 6 dernières catégories ouvertes restent disponibles hors ligne. */
const itemBucket = new Bucket<Item[]>("equip-items-v2", TTL_STATIC, 6);

export function loadItems(idCategory: number, minAt = 0): Promise<Loaded<Item[]>> {
  return itemBucket.get(idCategory, async () => {
    const data = await uexGet(`/items?id_category=${idCategory}`);
    const out = data.map((i: Any): Item => ({
      id: num(i.id), uuid: str(i.uuid), shot: /^https:\/\//.test(str(i.screenshot)) ? str(i.screenshot) : "", name: str(i.name), company: str(i.company_name), size: str(i.size),
      excl: num(i.is_exclusive_pledge) === 1 ? "pledge" : num(i.is_exclusive_subscriber) === 1 ? "subscriber" : num(i.is_exclusive_concierge) === 1 ? "concierge" : "",
    }));
    out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return out;
  }, minAt);
}

export interface ItemPrice { t: number; name: string; sys: string; body: string; place: string; buy: number; at: number; ver: string }
export interface ItemAttr { k: string; v: string; u: string }
export interface ItemDetail { prices: ItemPrice[]; attrs: ItemAttr[]; attrsOk: boolean }

const detailBucket = new Bucket<ItemDetail>("equip-details", TTL_PRICES, 10);

export function loadItemDetail(idItem: number, minAt = 0): Promise<Loaded<ItemDetail>> {
  return detailBucket.get(idItem, async () => {
    // Les prix sont indispensables ; les caractéristiques sont un plus (leur échec ne bloque pas la fiche).
    const [prices, attrs] = await Promise.all([
      uexGet(`/items_prices?id_item=${idItem}`),
      uexGet(`/items_attributes?id_item=${idItem}`).catch(() => null),
    ]);
    return {
      prices: prices
        .map((r: Any): ItemPrice => ({ t: num(r.id_terminal), name: str(r.terminal_name), ...whereOf(r), buy: num(r.price_buy), at: num(r.date_modified) * 1000, ver: str(r.game_version) }))
        .filter((r) => r.buy > 0)
        .sort((a, b) => a.buy - b.buy),
      attrs: (attrs ?? [])
        .map((a: Any): ItemAttr => ({ k: str(a.attribute_name), v: str(a.value), u: str(a.unit) }))
        .filter((a) => a.k !== "" && a.v !== ""),
      attrsOk: attrs !== null,
    };
  }, minAt);
}

/** Libellés français des caractéristiques UEX rencontrées ; les autres restent telles quelles. */
const ATTR_FR: Record<string, string> = {
  "Weapon Class": "Classe d'arme", "Weapon Type": "Type d'arme", "Item Type": "Type", "Damage Type": "Type de dégâts",
  "Effective Range": "Portée efficace", "Rate of Fire": "Cadence de tir", "Magazine Size": "Chargeur", "Area of Effect": "Zone d'effet",
  "Attachment Barrel": "Emplacement canon", "Attachment Optics": "Emplacement optique", "Attachment Underbarrel": "Emplacement sous-canon",
  Size: "Taille", Mass: "Masse", Volume: "Volume",
  "Armor Class": "Classe d'armure", "Damage Reduction": "Réduction des dégâts", "Helmet Type": "Type de casque",
  "Min Temperature": "Température min.", "Max Temperature": "Température max.",
  "Radiation Protection": "Protection radiations", "Radiation Scrub Rate": "Élimination des radiations",
};
export const attrLabel = (k: string) => ATTR_FR[k] ?? k;

/**
 * UEX range toutes les armes personnelles dans une seule catégorie : ces
 * raccourcis filtrent simplement sur le nom de l'objet (« … Pistol », « … SMG »).
 */
export const WEAPON_FILTERS: { label: string; test: (name: string) => boolean }[] = [
  { label: "Pistolets", test: (n) => /\bpistol\b/i.test(n) },
  { label: "Pistolets-mitrailleurs", test: (n) => /\bsmg\b/i.test(n) },
  { label: "Fusils", test: (n) => /\brifle\b/i.test(n) && !/\bsniper\b/i.test(n) },
  { label: "Fusils de précision", test: (n) => /\bsniper\b/i.test(n) },
  { label: "Fusils à pompe", test: (n) => /\bshotgun\b/i.test(n) },
  { label: "Mitrailleuses", test: (n) => /\blmg\b/i.test(n) },
  { label: "Lanceurs", test: (n) => /\blauncher\b/i.test(n) },
  { label: "Grenades", test: (n) => /\bgrenade\b/i.test(n) && !/\blauncher\b/i.test(n) },
  { label: "Couteaux", test: (n) => /\bknife\b/i.test(n) },
];
export const isWeaponCategory = (c: Category | null) => !!c && c.section === "Personal Weapons" && c.name === "Personal Weapons";

/* ---------- ensembles : un modèle et ses variantes (coloris, éditions) ---------- */

export interface ItemGroup { key: string; base: string; company: string; items: { item: Item; variant: string }[] }

/** Mots qui terminent le nom du modèle dans les pièces d'armure et vêtements : ce qui suit est le coloris. */
const PART = /^(.*?\b(?:Arms|Legs|Helmet|Core|Torso|Backpack|Undersuit|Armor|Suit|Jacket|Pants|Shirt|Gloves|Boots|Shoes|Hat|Cap|Jumpsuit|Coat|Vest|Hoodie|Sweater|Shorts|Skirt|Dress|Goggles|Glasses|Mask|Beanie|Bandana|Scarf|Knife|Pistol|Rifle|SMG|LMG|Shotgun|Launcher|Sniper Rifle|Railgun|Multi-Tool))\b\s*(.*)$/;

/** Nom sans la variante entre guillemets : Karna "Ascension" Rifle → base « Karna Rifle », variante « Ascension ». */
function unquote(name: string): { rest: string; quoted: string } {
  const m = /["“”]([^"“”]+)["“”]/.exec(name);
  if (!m) return { rest: name, quoted: "" };
  return { rest: (name.slice(0, m.index) + name.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim(), quoted: m[1].trim() };
}

/**
 * Regroupe les objets d'une catégorie par modèle. Trois indices, dans l'ordre :
 * variante entre guillemets, mot-clé de pièce (« ADP Arms » + coloris), puis
 * préfixe commun à plusieurs objets (« Adiva Jacket » + coloris).
 */
export function groupItems(items: Item[]): ItemGroup[] {
  const split = items.map((item) => {
    const { rest, quoted } = unquote(item.name);
    const m = PART.exec(rest);
    if (m) return { item, base: m[1].trim(), variant: [quoted, m[2].trim()].filter(Boolean).join(" · "), sure: true };
    return { item, base: rest, variant: quoted, sure: !!quoted };
  });
  // préfixe commun pour ceux qui n'ont ni guillemets ni mot-clé : le plus court préfixe d'au moins 2 mots partagé
  const loose = split.filter((s) => !s.sure);
  const count = new Map<string, number>();
  for (const s of loose) { const w = s.base.split(" "); for (let k = 2; k < w.length; k++) { const p = w.slice(0, k).join(" "); count.set(p, (count.get(p) ?? 0) + 1); } }
  const whole = new Set(loose.map((s) => s.base));
  for (const s of loose) {
    const w = s.base.split(" ");
    for (let k = 2; k < w.length; k++) {
      const p = w.slice(0, k).join(" ");
      if ((count.get(p) ?? 0) + (whole.has(p) ? 1 : 0) >= 2) { s.variant = w.slice(k).join(" "); s.base = p; break; }
    }
  }
  const groups = new Map<string, ItemGroup>();
  for (const s of split) {
    const key = `${s.base.toLowerCase()}|${s.item.company.toLowerCase()}`;
    let g = groups.get(key);
    if (!g) { g = { key, base: s.base, company: s.item.company, items: [] }; groups.set(key, g); }
    g.items.push({ item: s.item, variant: s.variant });
  }
  const out = [...groups.values()];
  for (const g of out) {
    g.items.sort((a, b) => (a.variant === "" ? -1 : b.variant === "" ? 1 : a.variant.localeCompare(b.variant, "fr")));
    for (const v of g.items) if (!v.variant) v.variant = g.items.length > 1 ? "Standard" : "";
  }
  return out.sort((a, b) => a.base.localeCompare(b.base, "fr", { numeric: true }));
}

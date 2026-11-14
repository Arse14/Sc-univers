/**
 * Taux de change dollar → euro, pour estimer la valeur des vaisseaux en euros.
 * Source : Frankfurter (taux de référence de la BCE, sans clé), un appel par
 * jour au plus, gardé en cache. Sans réseau, on garde le dernier taux connu,
 * à défaut un taux de secours approximatif — l'affichage le signale.
 */
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri, loadStore, saveStore } from "./tauri";

export interface Fx { rate: number; at: number | null; source: "bce" | "cache" | "secours" }
const FALLBACK = 0.92;
const DAY = 24 * 3600 * 1000;

export async function loadUsdEur(): Promise<Fx> {
  const c = await loadStore<{ rate: number; at: number }>("fx-usd-eur").catch(() => null);
  const ok = c && typeof c.rate === "number" && c.rate > 0.3 && c.rate < 3 ? c : null;
  if (ok && Date.now() - ok.at < DAY) return { rate: ok.rate, at: ok.at, source: "bce" };
  try {
    const f = isTauri ? tauriFetch : fetch;
    const res = await f("https://api.frankfurter.app/latest?from=USD&to=EUR", { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { rates?: { EUR?: number } };
    const rate = j?.rates?.EUR;
    if (typeof rate !== "number" || !(rate > 0.3 && rate < 3)) throw new Error("taux illisible");
    const at = Date.now();
    await saveStore("fx-usd-eur", { rate, at }).catch(() => undefined);
    return { rate, at, source: "bce" };
  } catch {
    return ok ? { rate: ok.rate, at: ok.at, source: "cache" } : { rate: FALLBACK, at: null, source: "secours" };
  }
}

/** TVA appliquée par la boutique RSI aux acheteurs français : ses prix en euros sont affichés TTC. */
export const VAT_FR = 0.2;
/** Prix boutique estimé en euros TTC à partir du prix catalogue en dollars (hors taxes). */
export const usdToEurTtc = (usd: number, rate: number) => usd * rate * (1 + VAT_FR);

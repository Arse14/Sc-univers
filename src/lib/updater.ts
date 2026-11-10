/**
 * Mise à jour automatique : interroge la dernière Release GitHub
 * (latest.json signé), télécharge et installe en un clic, puis relance.
 * Hors de l'application (navigateur), tout est inactif.
 */
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "./tauri";

export interface UpdateInfo { version: string; current: string; date: string | null; notes: string | null }

let pending: Update | null = null;

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri) return null;
  const u = await check({ timeout: 15000 });
  pending = u;
  if (!u) return null;
  return { version: u.version, current: u.currentVersion, date: u.date ?? null, notes: u.body ?? null };
}

/** Télécharge et installe ; `onProgress` reçoit un pourcentage (0–100) quand la taille est connue. */
export async function installUpdate(onProgress?: (pct: number | null) => void): Promise<void> {
  if (!pending) throw new Error("Aucune mise à jour en attente");
  let total = 0; let got = 0;
  await pending.downloadAndInstall((ev) => {
    if (ev.event === "Started") { total = ev.data.contentLength ?? 0; onProgress?.(total ? 0 : null); }
    else if (ev.event === "Progress") { got += ev.data.chunkLength; onProgress?.(total ? Math.min(100, Math.round((got / total) * 100)) : null); }
    else if (ev.event === "Finished") onProgress?.(100);
  });
  await relaunch();
}

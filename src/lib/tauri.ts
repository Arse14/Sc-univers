/**
 * Accès à la couche Rust (Tauri) avec repli navigateur.
 *
 * Dans `npm run dev` ouvert dans un navigateur classique, Tauri n'existe
 * pas : les fonctions renvoient des valeurs vides ou lèvent une erreur
 * explicite, ce qui permet de travailler l'interface sans compiler Rust.
 */
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface ScInstall {
  channel: string;
  actionmaps: string;
}

export async function findScInstalls(): Promise<ScInstall[]> {
  if (!isTauri) return [];
  return invoke<ScInstall[]>("find_sc_installs");
}

export async function readTextFile(path: string): Promise<string> {
  if (!isTauri) throw new Error("Lecture de fichier indisponible hors de l'application.");
  return invoke<string>("read_text_file", { path });
}

export async function readFileAsDataUrl(path: string): Promise<string> {
  if (!isTauri) throw new Error("Lecture de fichier indisponible hors de l'application.");
  const b64 = await invoke<string>("read_file_base64", { path });
  const ext = path.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "glb" ? "model/gltf-binary" : ext === "gltf" ? "model/gltf+json" : "image/png";
  return `data:${mime};base64,${b64}`;
}

export async function importDeviceImage(source: string, device: string): Promise<string> {
  return invoke<string>("import_device_image", { source, device });
}

export async function importDeviceModel(source: string, device: string): Promise<string> {
  return invoke<string>("import_device_image", { source, device: device + "-model" });
}

/** Stockage JSON persistant (dossier AppData de l'application), avec repli localStorage. */
export async function loadStore<T>(name: string): Promise<T | null> {
  if (!isTauri) {
    try {
      const raw = localStorage.getItem("sc-univers:" + name);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  const raw = await invoke<string | null>("load_store", { name });
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveStore<T>(name: string, value: T): Promise<void> {
  // JSON compact : les caches (catalogue, prix) pèsent vite plusieurs Mo, l'indentation les doublerait.
  const content = JSON.stringify(value);
  if (!isTauri) {
    try { localStorage.setItem("sc-univers:" + name, content); } catch { /* ignoré */ }
    return;
  }
  await invoke("save_store", { name, content });
}

/** Boîte de dialogue « ouvrir un fichier ». Renvoie le chemin ou null. */
export async function pickFile(filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  if (!isTauri) return null;
  const res = await open({ multiple: false, directory: false, filters });
  return typeof res === "string" ? res : null;
}

export async function deleteStore(name: string): Promise<void> {
  if (!isTauri) { try { localStorage.removeItem("sc-univers:" + name); } catch { /* ignoré */ } return; }
  await invoke("delete_store", { name });
}

/** Écrit un profil de contrôle dans `controls/mappings` de Star Citizen. Renvoie le chemin écrit. */
export async function writeMappingFile(path: string, content: string): Promise<string> {
  if (!isTauri) throw new Error("Écriture de fichier indisponible hors de l'application.");
  return invoke<string>("write_mapping_file", { path, content });
}

/* ---------- cache disque binaire (modèles 3D) ---------- */

/**
 * Renvoie le contenu de `url`, depuis le cache disque s'il y est, sinon en le
 * téléchargeant (par morceaux côté Rust) puis en le relisant. Hors de
 * l'application : simple téléchargement, sans cache.
 */
export async function cachedBinary(url: string, key: string, onStage?: (s: "cache" | "download") => void): Promise<ArrayBuffer> {
  if (!isTauri) {
    onStage?.("download");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  }
  const size = await invoke<number>("cache_has", { key });
  if (!size) { onStage?.("download"); await invoke<number>("cache_download", { url, key }); }
  else onStage?.("cache");
  return invoke<ArrayBuffer>("cache_get", { key });
}

export async function cacheInfo(): Promise<{ files: number; bytes: number }> {
  if (!isTauri) return { files: 0, bytes: 0 };
  return invoke<{ files: number; bytes: number }>("cache_info");
}

export async function cacheClear(): Promise<void> {
  if (isTauri) await invoke("cache_clear");
}

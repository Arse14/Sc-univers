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
  const content = JSON.stringify(value, null, 2);
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

//! Couche Rust de SC-Univers.
//!
//! Elle ne fait que ce que le navigateur ne peut pas faire : lire des
//! fichiers sur la machine, chercher les installations de Star Citizen et
//! stocker les réglages de l'application. Toute la logique métier (parseurs,
//! calculs, affichage) vit côté TypeScript.
//!
//! Règle de sécurité : lecture de fichiers uniquement. Aucune lecture de la
//! mémoire du jeu, aucune injection.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// Chemins où une installation Star Citizen peut se trouver.
/// On cherche `actionmaps.xml` dans chaque canal (LIVE, PTU, …).
#[derive(Serialize)]
struct ScInstall {
    channel: String,
    actionmaps: String,
}

const CHANNELS: [&str; 4] = ["LIVE", "PTU", "EPTU", "HOTFIX"];
const ACTIONMAPS_REL: &str = "user/client/0/Profiles/default/actionmaps.xml";

fn candidate_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    // Chemin d'installation par défaut du lanceur RSI, sur chaque lettre de lecteur.
    for drive in ['C', 'D', 'E', 'F', 'G'] {
        roots.push(PathBuf::from(format!(
            "{drive}:\\Program Files\\Roberts Space Industries\\StarCitizen"
        )));
        roots.push(PathBuf::from(format!(
            "{drive}:\\Roberts Space Industries\\StarCitizen"
        )));
        roots.push(PathBuf::from(format!("{drive}:\\Games\\StarCitizen")));
        roots.push(PathBuf::from(format!("{drive}:\\StarCitizen")));
    }
    roots
}

/// Cherche les fichiers `actionmaps.xml` des installations connues.
#[tauri::command]
fn find_sc_installs() -> Vec<ScInstall> {
    let mut found = Vec::new();
    for root in candidate_roots() {
        for channel in CHANNELS {
            let p = root.join(channel).join(ACTIONMAPS_REL);
            if p.is_file() {
                found.push(ScInstall {
                    channel: channel.to_string(),
                    actionmaps: p.to_string_lossy().to_string(),
                });
            }
        }
    }
    found
}

/// Lit un fichier texte (UTF-8, avec repli lossy pour les fichiers Windows).
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let bytes = fs::read(Path::new(&path)).map_err(|e| format!("{path} : {e}"))?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

/// Lit un fichier binaire et le renvoie encodé en base64 (images d'appareil).
#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(Path::new(&path)).map_err(|e| format!("{path} : {e}"))?;
    Ok(base64_encode(&bytes))
}

fn base64_encode(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
        let n = (b[0] as u32) << 16 | (b[1] as u32) << 8 | b[2] as u32;
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if chunk.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    out
}

/// Dossier de données de l'application (réglages, positions des commandes, images).
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Lit un document JSON stocké par l'application (`null` s'il n'existe pas).
#[tauri::command]
fn load_store(app: tauri::AppHandle, name: String) -> Result<Option<String>, String> {
    let p = data_dir(&app)?.join(format!("{}.json", sanitize(&name)));
    if !p.is_file() {
        return Ok(None);
    }
    fs::read_to_string(&p).map(Some).map_err(|e| e.to_string())
}

/// Écrit un document JSON dans le dossier de l'application.
#[tauri::command]
fn save_store(app: tauri::AppHandle, name: String, content: String) -> Result<(), String> {
    let p = data_dir(&app)?.join(format!("{}.json", sanitize(&name)));
    fs::write(&p, content).map_err(|e| e.to_string())
}

/// Copie une image d'appareil dans le dossier de l'application et renvoie son chemin.
#[tauri::command]
fn import_device_image(app: tauri::AppHandle, source: String, device: String) -> Result<String, String> {
    let ext = Path::new(&source)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let dest = data_dir(&app)?.join("devices").join(format!("{}.{}", sanitize(&device), ext));
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&source, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
}

fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            find_sc_installs,
            read_text_file,
            read_file_base64,
            load_store,
            save_store,
            import_device_image
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de SC-Univers");
}

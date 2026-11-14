//! Couche Rust de SC-Univers.
//!
//! Elle ne fait que ce que le navigateur ne peut pas faire : lire des
//! fichiers sur la machine, chercher les installations de Star Citizen et
//! stocker les réglages de l'application. Toute la logique métier (parseurs,
//! calculs, affichage) vit côté TypeScript.
//!
//! Règle de sécurité : aucune lecture de la mémoire du jeu, aucune injection.
//! Les seules écritures sont : le dossier de données de l'application
//! (réglages, cache) et, à la demande explicite de l'utilisateur, un profil
//! de contrôle dans `controls/mappings` de Star Citizen (fichier que le jeu
//! sait importer lui-même). `actionmaps.xml` n'est jamais modifié.

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

/// Écrit un profil de contrôle Star Citizen (`*.xml`) dans un dossier
/// `controls/mappings`. Refuse tout autre emplacement.
#[tauri::command]
fn write_mapping_file(path: String, content: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    let norm = path.replace('\\', "/").to_lowercase();
    let is_xml = p.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("xml")).unwrap_or(false);
    if !is_xml || !norm.contains("/controls/mappings/") || norm.contains("..") {
        return Err("Emplacement refusé : seuls les fichiers .xml de controls/mappings sont autorisés.".into());
    }
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&p, content).map_err(|e| format!("{path} : {e}"))?;
    Ok(p.to_string_lossy().to_string())
}

/* ---------- cache disque binaire (modèles 3D des vaisseaux) ---------- */

fn cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join("cache");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Hôtes depuis lesquels le cache accepte de télécharger.
const CACHE_HOSTS: [&str; 2] = ["fleetyards.net", "starcitizen.tools"];

/// Télécharge `url` dans le cache sous le nom `key`, par morceaux (le
/// fichier n'est jamais entièrement en mémoire). Renvoie la taille en octets.
#[tauri::command]
async fn cache_download(app: tauri::AppHandle, url: String, key: String) -> Result<u64, String> {
    use std::io::Write;
    use tauri_plugin_http::reqwest;
    let parsed = reqwest::Url::parse(&url).map_err(|e| e.to_string())?;
    let host = parsed.host_str().unwrap_or("").to_lowercase();
    if parsed.scheme() != "https" || !CACHE_HOSTS.iter().any(|h| host == *h || host.ends_with(&format!(".{h}"))) {
        return Err(format!("Hôte non autorisé pour le cache : {host}"));
    }
    let dir = cache_dir(&app)?;
    let name = sanitize(&key);
    let dest = dir.join(&name);
    let tmp = dir.join(format!("{name}.part"));
    let mut resp = reqwest::Client::new().get(parsed).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status().as_u16()));
    }
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    let mut total: u64 = 0;
    while let Some(chunk) = resp.chunk().await.map_err(|e| e.to_string())? {
        total += chunk.len() as u64;
        if total > 200 * 1024 * 1024 {
            drop(file);
            let _ = fs::remove_file(&tmp);
            return Err("Fichier trop volumineux (> 200 Mo)".into());
        }
        file.write_all(&chunk).map_err(|e| e.to_string())?;
    }
    drop(file);
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())?;
    Ok(total)
}

/// Taille d'une entrée du cache (0 si absente).
#[tauri::command]
fn cache_has(app: tauri::AppHandle, key: String) -> Result<u64, String> {
    let p = cache_dir(&app)?.join(sanitize(&key));
    Ok(fs::metadata(&p).map(|m| m.len()).unwrap_or(0))
}

/// Renvoie le contenu brut d'une entrée du cache (réponse binaire, sans base64).
#[tauri::command]
fn cache_get(app: tauri::AppHandle, key: String) -> Result<tauri::ipc::Response, String> {
    let p = cache_dir(&app)?.join(sanitize(&key));
    let bytes = fs::read(&p).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[derive(Serialize)]
struct CacheInfo {
    files: u64,
    bytes: u64,
}

/// Nombre de fichiers et taille totale du cache.
#[tauri::command]
fn cache_info(app: tauri::AppHandle) -> Result<CacheInfo, String> {
    let mut info = CacheInfo { files: 0, bytes: 0 };
    for e in fs::read_dir(cache_dir(&app)?).map_err(|e| e.to_string())?.flatten() {
        if let Ok(m) = e.metadata() {
            if m.is_file() {
                info.files += 1;
                info.bytes += m.len();
            }
        }
    }
    Ok(info)
}

/// Vide le cache binaire.
#[tauri::command]
fn cache_clear(app: tauri::AppHandle) -> Result<(), String> {
    for e in fs::read_dir(cache_dir(&app)?).map_err(|e| e.to_string())?.flatten() {
        let _ = fs::remove_file(e.path());
    }
    Ok(())
}

/// Supprime un document JSON de l'application (cache de données périmé).
#[tauri::command]
fn delete_store(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let p = data_dir(&app)?.join(format!("{}.json", sanitize(&name)));
    if p.is_file() {
        fs::remove_file(&p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' { c } else { '_' })
        .collect::<String>()
        .replace("..", "_")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            find_sc_installs,
            read_text_file,
            read_file_base64,
            load_store,
            save_store,
            delete_store,
            import_device_image,
            write_mapping_file,
            cache_download,
            cache_has,
            cache_get,
            cache_info,
            cache_clear
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de SC-Univers");
}

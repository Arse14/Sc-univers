# SC-Univers — installation des prérequis et premier lancement (Windows)
# Clic droit → « Exécuter avec PowerShell ». Relance le script après un
# redémarrage de session si une commande n'est pas trouvée (PATH).

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

Step "Vérification de winget"
if (-not (Has "winget")) {
  Write-Host "winget est introuvable. Installe « App Installer » depuis le Microsoft Store, puis relance ce script." -ForegroundColor Yellow
  Read-Host "Appuie sur Entrée pour quitter"; exit 1
}

Step "Node.js (LTS)"
if (-not (Has "node")) {
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
} else { Write-Host "déjà installé : $(node -v)" }

Step "Rust (rustup)"
if (-not (Has "cargo")) {
  winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements
} else { Write-Host "déjà installé : $(cargo --version)" }

Step "Visual Studio Build Tools (compilateur C++ requis par Rust)"
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasMsvc = (Test-Path $vswhere) -and ((& $vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath) -ne $null)
if (-not $hasMsvc) {
  winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-source-agreements --accept-package-agreements --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
} else { Write-Host "déjà installé" }

# Recharger le PATH de la session courante (winget modifie le PATH machine/utilisateur)
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

if (-not (Has "node") -or -not (Has "cargo")) {
  Write-Host "`nNode ou Rust viennent d'être installés : ferme cette fenêtre, rouvre PowerShell et relance setup.ps1." -ForegroundColor Yellow
  Read-Host "Appuie sur Entrée pour quitter"; exit 0
}

Step "Dépendances npm"
npm install

Step "Lancement de l'application (première compilation Rust : 5 à 10 min)"
npm run tauri:dev

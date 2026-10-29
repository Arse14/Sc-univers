# SC-Univers

Application de bureau compagnon pour **Star Citizen** : binds joystick / HOTAS, minage, hangar, marché, équipement, carte et actualité officielle.

> Non affilié à Cloud Imperium Games. Star Citizen® est une marque déposée de Cloud Imperium Games Corp.

## Principes

- **Lecture de fichiers uniquement** : `actionmaps.xml`, profils Logitech `.pr0`, plus tard `Game.log`. Aucune lecture de la mémoire du jeu, aucune injection.
- **Données communautaires** : UEX, wiki Star Citizen, FleetYards. Les données extraites du jeu (`Data.p4k`) se font sur la machine de l'utilisateur, jamais dans le dépôt.
- **Clé API UEX** saisie par l'utilisateur dans les paramètres, stockée en local.

## Modules

| Module | État | Contenu |
|---|---|---|
| Actualité | ✅ | Comm-Link RSI, YouTube Star Citizen, état des serveurs. S'ouvre au lancement. |
| Binds | ✅ v0 | Profil `.pr0` → commandes de l'appareil ; `actionmaps.xml` → fonctions liées ; image de l'appareil avec repères, zoom animé, placement manuel, détection de touche (API Gamepad). |
| Minage | ✅ | Comparatif des 13 têtes (S1/S2), stats, avantages/inconvénients, vaisseaux compatibles. |
| Hangar | ⏳ | Vaisseaux, loadouts, stats. |
| Marché | ⏳ | Prix par terminal, routes (UEX 2.0). |
| Équipement | ⏳ | Armes, armures, prix. |
| Carte | ⏳ | Carte schématique (données UEX ; référence : [Starmap RSI](https://robertsspaceindustries.com/en/starmap)). |

## Stack

- **Tauri 2** (Rust) : accès fichiers, dialogues, HTTP vers les flux officiels, ouverture de liens.
- **React 18 + TypeScript + Vite** : interface et logique métier, organisée par module (`src/modules/<module>/`).
- Thème HUD maison (`src/styles.css`), polices Electrolize / Share Tech Mono / Titillium Web.

```
src/
  components/      briques du thème (Sidebar, Hud)
  lib/tauri.ts     pont vers Rust, avec repli navigateur
  modules/
    news/          flux officiels (feeds.ts) et page
    binds/         parsePr0, parseActionmaps, mapping (HID → jsN_…), labels FR, DeviceView, page
    mining/        données têtes (heads.ts) et page
    dashboard/, common/
src-tauri/
  src/lib.rs       commandes : find_sc_installs, read_text_file, read_file_base64, load/save_store, import_device_image
  capabilities/    permissions (dialog, http vers les sources, opener)
```

## Développement

Prérequis : Node 22, Rust stable, et sous Windows les [prérequis Tauri](https://tauri.app/start/prerequisites/) (WebView2 est déjà présent sur Windows 10/11).

```bash
npm install
npm run tauri:dev      # application complète
npm run dev            # interface seule dans le navigateur (lecture de fichiers désactivée)
npm run build          # vérification TypeScript + build Vite
npm run tauri:build    # installeurs dans src-tauri/target/release/bundle/
```

## Builds et releases

- Chaque push sur `main` (ou lancement manuel) produit un installeur Windows en **artefact** dans l'onglet Actions.
- Un tag `v*` crée une **Release** (brouillon) avec les installeurs.

## Fichiers utiles

- Binds Star Citizen : `…\StarCitizen\LIVE\user\client\0\Profiles\default\actionmaps.xml` (détection automatique sur les lecteurs C–G).
- Profil HOTAS : exporter depuis le logiciel Logitech (icône d'enregistrement) en `.pr0`.
- Les fichiers personnels (`*.pr0`, `actionmaps.xml`, `Game.log`) sont ignorés par git.

## À confirmer au premier lancement réel

- Numéros d'entrée déduits des codes HID (`0x0009000N` → `jsX_buttonN`), ordre des directions des hats H1–H4, noms d'axes des rotatifs (`slider1/2`). La détection de touche sert à les vérifier.
- URLs des flux : API wiki pour les Comm-Links, `status.robertsspaceindustries.com/index.xml`, identifiant de la chaîne YouTube (`src/modules/news/feeds.ts`).
- Compatibilité des têtes de minage pour ROC, Arrastra, Cydnus, Orion.

## Données de minage

Sources : [grimhex.net](https://grimhex.net/tools/mining/lasers) (synchronisé UEX), [expcarry.com](https://expcarry.com/star-citizen-mining-lasers-modules-guide), relevées sur l'Alpha 4.10.2.

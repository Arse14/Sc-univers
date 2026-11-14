/**
 * Libellés français des actions Star Citizen les plus courantes.
 *
 * Les vrais libellés du jeu sont dans Data.p4k (fichiers global.ini) ; ils
 * seront extraits en local plus tard. En attendant, ce dictionnaire couvre
 * les actions fréquentes et le reste est « humanisé » à partir du nom brut.
 */

import { findAction, MAP_BY_NAME } from "./actions";

const ACTIONS: Record<string, string> = {
  // Vol
  v_pitch: "Tangage", v_yaw: "Lacet", v_roll: "Roulis",
  v_strafe_longitudinal: "Translation avant / arrière", v_strafe_lateral: "Translation latérale", v_strafe_vertical: "Translation verticale",
  v_strafe_forward: "Translation avant", v_strafe_back: "Translation arrière", v_strafe_up: "Translation haut", v_strafe_down: "Translation bas",
  v_strafe_left: "Translation gauche", v_strafe_right: "Translation droite",
  v_throttle_abs: "Gaz (absolu)", v_throttle_rel: "Gaz (relatif)", v_throttle_up: "Gaz +", v_throttle_down: "Gaz −", v_throttle_zero: "Gaz à zéro",
  v_afterburner: "Boost", v_boost: "Boost", v_brake: "Frein spatial", v_space_brake: "Frein spatial",
  v_toggle_vtol: "Mode VTOL", v_toggle_landing_system: "Train d'atterrissage", v_autoland: "Atterrissage automatique",
  v_toggle_cruise_control: "Régulateur", v_speed_range_rel: "Limiteur de vitesse", v_speed_range_up: "Limiteur +", v_speed_range_down: "Limiteur −",
  v_ifcs_toggle_vector_decoupling: "Vol couplé / découplé", v_ifcs_toggle_esp: "ESP", v_ifcs_toggle_gforce_safety: "Sécurité G",
  v_toggle_qdrive_engagement: "Saut quantique : engager", v_toggle_qdrive_spooling: "Quantum : calibrer", v_toggle_quantum_mode: "Mode quantum",
  v_toggle_scm_nav: "Mode SCM / NAV", v_flightready: "Vaisseau prêt au vol", v_toggle_power: "Alimentation : on / off",
  v_toggle_engines: "Moteurs : on / off", v_toggle_shields: "Boucliers : on / off", v_toggle_weapons: "Armes : on / off",
  v_toggle_lights: "Phares", v_toggle_all_doors: "Toutes les portes", v_toggle_all_doorlocks: "Verrouiller les portes", v_lock_all_doors: "Verrouiller le vaisseau",
  v_eject: "Éjection", v_self_destruct: "Autodestruction", v_exit: "Sortir du siège",
  // Armes
  v_attack1: "Tir : groupe 1", v_attack2: "Tir : groupe 2", v_attack1_group1: "Tir : groupe 1", v_attack1_group2: "Tir : groupe 2",
  v_weapon_launch_missile: "Missile : lancer", v_weapon_cycle_missile_fwd: "Missile : suivant", v_weapon_cycle_missile_back: "Missile : précédent",
  v_weapon_arm_missile: "Missile : armer", v_weapon_unarm_all_missiles: "Missiles : désarmer", v_weapon_toggle_missile_mode: "Mode missile",
  v_weapon_cycle_ammo: "Munitions : cycle", v_weapon_toggle_launch_decoy: "Leurres", v_weapon_toggle_launch_noise: "Brouillage",
  v_weapon_gimbal_mode: "Mode gimbal", v_weapon_toggle_gimbal_lock: "Verrou gimbal",
  // Ciblage
  v_target_cycle_all_fwd: "Cible : suivante", v_target_cycle_all_back: "Cible : précédente",
  v_target_cycle_hostile_fwd: "Cible hostile : suivante", v_target_cycle_hostile_back: "Cible hostile : précédente",
  v_target_cycle_friendly_fwd: "Cible amie : suivante", v_target_cycle_friendly_back: "Cible amie : précédente",
  v_target_cycle_attacker_fwd: "Attaquant : suivant", v_target_cycle_subitem_fwd: "Sous-cible : suivante", v_target_cycle_subitem_back: "Sous-cible : précédente",
  v_target_nearest_hostile: "Cible : hostile la plus proche", v_target_reticle_focus: "Cible : sous le réticule", v_target_lock_selected: "Cible : verrouiller",
  v_target_unlock: "Cible : déverrouiller", v_target_pin_selected: "Cible : épingler", v_target_cycle_pinned_fwd: "Épinglée : suivante",
  v_target_toggle_lock_index_1: "Cible épinglée 1", v_target_toggle_lock_index_2: "Cible épinglée 2", v_target_toggle_lock_index_3: "Cible épinglée 3",
  // Énergie / systèmes
  v_power_focus_weapons: "Puissance : armes", v_power_focus_shields: "Puissance : boucliers", v_power_focus_thrusters: "Puissance : moteurs",
  v_power_reset_focus: "Puissance : réinitialiser", v_power_throttle_up: "Puissance +", v_power_throttle_down: "Puissance −",
  v_shield_raise_level_forward: "Bouclier : avant", v_shield_raise_level_back: "Bouclier : arrière", v_shield_raise_level_left: "Bouclier : gauche",
  v_shield_raise_level_right: "Bouclier : droite", v_shield_raise_level_up: "Bouclier : haut", v_shield_raise_level_down: "Bouclier : bas", v_shield_reset_level: "Boucliers : réinitialiser",
  v_radar_toggle_active_or_passive: "Radar actif / passif", v_scanning_toggle: "Mode scan", v_scanning_trigger_scan: "Scanner", v_ping: "Ping",
  v_emergency_exit: "Sortie d'urgence", v_toggle_mining_mode: "Mode minage", v_toggle_salvage_mode: "Mode récupération",
  // Minage
  v_mining_throttle_increase: "Minage : puissance +", v_mining_throttle_decrease: "Minage : puissance −", v_mining_use_consumable1: "Minage : consommable 1",
  v_mining_use_consumable2: "Minage : consommable 2", v_mining_use_consumable3: "Minage : consommable 3", v_mining_cycle_laser: "Minage : laser suivant",
  // Vues
  v_view_pitch: "Vue : haut / bas", v_view_yaw: "Vue : gauche / droite", v_view_cycle_fwd: "Vue : suivante", v_view_look_behind: "Regarder derrière",
  v_view_zoom_in: "Zoom +", v_view_zoom_out: "Zoom −", v_view_freelook_mode: "Vue libre", v_view_dynamic_zoom_rel: "Zoom dynamique",
  v_view_dynamic_zoom_abs: "Zoom dynamique (absolu)",
  // MFD / HUD
  v_hud_open_scoreboard: "Tableau des scores", v_hud_interact_toggle: "Mode interaction", v_mobiglas: "MobiGlas", v_starmap: "Carte stellaire",
};

const ACTIONMAPS: Record<string, string> = {
  spaceship_general: "Vaisseau",
  spaceship_view: "Vues",
  spaceship_movement: "Pilotage",
  spaceship_quantum: "Quantum",
  spaceship_docking: "Amarrage",
  spaceship_targeting: "Ciblage",
  spaceship_targeting_advanced: "Ciblage avancé",
  spaceship_target_hailing: "Communications",
  spaceship_scanning: "Scan",
  spaceship_mining: "Minage",
  spaceship_salvage: "Récupération",
  spaceship_ping: "Ping",
  spaceship_radar: "Radar",
  spaceship_weapons: "Armes",
  spaceship_missiles: "Missiles",
  spaceship_defensive: "Défense",
  spaceship_auto_weapons: "Armes auto",
  spaceship_power: "Énergie",
  spaceship_hud: "HUD",
  turret_main: "Tourelle",
  turret_movement: "Tourelle",
  turret_advanced: "Tourelle",
  vehicle_general: "Véhicule",
  vehicle_driver: "Véhicule",
  vehicle_gunner: "Véhicule",
  player: "Personnage",
  player_emotes: "Emotes",
  player_choice: "Interaction",
  player_input_optical_tracking: "Suivi optique",
  mapui: "Carte",
  lights_controller: "Lumières",
  seat_general: "Siège",
  view_director_mode: "Mode réalisateur",
  default: "Général",
};

export function actionLabel(action: string, actionmap?: string): string {
  // Libellé du jeu (traduction FR communautaire) quand l'action est au catalogue.
  const official = findAction(action, actionmap);
  if (official) return official.label;
  if (ACTIONS[action]) return ACTIONS[action];
  return action.replace(/^v_/, "").replace(/^pl_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function actionmapLabel(actionmap: string): string {
  return ACTIONMAPS[actionmap] ?? MAP_BY_NAME.get(actionmap)?.label ?? actionmap.replace(/_/g, " ");
}

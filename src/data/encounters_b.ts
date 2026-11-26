// Encounters for the second half: Acts II-III, the Glass Orchard and the First Thread.
// e_<region>_<n> are roaming groups, b_<boss> are boss fights. Enemy ids are DESIGN.md §9's.
import type { EncounterDef } from './types';

const roam = (id: string, enemies: string[]): EncounterDef => ({ id, enemies, music: 'battle2' });

export const ENCOUNTERS_B: EncounterDef[] = [
  // ---------------------------------------------------------------- Ch5 The Frayed Expanse
  roam('e_fe_1', ['echo_villager', 'echo_villager']),
  roam('e_fe_2', ['unwoven_moth', 'driftlight']),
  roam('e_fe_3', ['knot']),
  roam('e_fe_4', ['driftlight', 'driftlight', 'unwoven_moth']),
  roam('e_fe_5', ['echo_villager', 'knot']),
  roam('e_fe_6', ['unwoven_moth', 'unwoven_moth', 'driftlight']),
  { id: 'b_tess_2', enemies: ['tess_2'], boss: true, noFlee: true, music: 'boss', endAtHp: 0.4 },
  { id: 'b_moth_mother', enemies: ['moth_mother'], boss: true, noFlee: true, music: 'boss' },

  // ---------------------------------------------------------------- Ch6 Spindlehold
  roam('e_sh_1', ['ledger_pages', 'ledger_pages']),
  roam('e_sh_2', ['choir_sentinel', 'choir_sentinel']),
  roam('e_sh_3', ['shear_knight', 'ledger_pages']),
  roam('e_sh_4', ['loom_warden']),
  roam('e_sh_5', ['shear_knight', 'choir_sentinel', 'ledger_pages']),
  roam('e_sh_6', ['loom_warden', 'choir_sentinel']),
  { id: 'b_seraphine', enemies: ['seraphine'], boss: true, noFlee: true, music: 'boss', rewardMul: 1.5 },

  // ---------------------------------------------------------------- Ch7 The Seam of Ages
  roam('e_sa_1', ['frayed_knight', 'seam_crawler']),
  roam('e_sa_2', ['storm_crow', 'storm_crow']),
  roam('e_sa_3', ['seam_crawler', 'seam_crawler', 'storm_crow']),
  roam('e_sa_4', ['frayed_knight', 'frayed_knight']),
  roam('e_sa_5', ['storm_crow', 'frayed_knight', 'seam_crawler']),
  { id: 'b_seam_eater', enemies: ['seam_eater'], boss: true, noFlee: true, music: 'boss', force: ['corin'], rewardMul: 1.5 },

  // ---------------------------------------------------------------- Ch8 The Underweave
  roam('e_uw_1', ['lost_thread', 'lost_thread']),
  roam('e_uw_2', ['grief_knot']),
  roam('e_uw_3', ['hollow_mender', 'lost_thread']),
  roam('e_uw_4', ['grief_knot', 'lost_thread', 'lost_thread']),
  roam('e_uw_5', ['hollow_mender', 'hollow_mender']),
  { id: 'b_unfated_ash', enemies: ['unfated_ash'], boss: true, noFlee: true, music: 'boss', force: ['ash'], rewardMul: 1.5 },

  // ---------------------------------------------------------------- Ch9 The Loomspire
  roam('e_ls_1', ['loomhand']),
  roam('e_ls_2', ['choir_seraph', 'loomhand']),
  roam('e_ls_3', ['fate_spinner', 'choir_seraph']),
  roam('e_ls_4', ['loomhand', 'loomhand', 'fate_spinner']),
  roam('e_ls_5', ['choir_seraph', 'choir_seraph']),
  roam('e_ls_6', ['fate_spinner', 'choir_seraph', 'loomhand']),
  { id: 'b_orrin_final', enemies: ['orrin_final'], boss: true, noFlee: true, music: 'boss_orrin', force: ['ash'], rewardMul: 2 },
  { id: 'b_weaver', enemies: ['weaver'], boss: true, noFlee: true, music: 'final_weaver', force: ['ash'], rewardMul: 2 },

  // ---------------------------------------------------------------- optional: the Glass Orchard
  roam('e_go_1', ['choir_sentinel', 'choir_sentinel', 'ledger_pages']),
  roam('e_go_2', ['loom_warden', 'choir_seraph']),
  roam('e_go_3', ['choir_seraph', 'choir_sentinel']),
  { id: 'b_glass_choir', enemies: ['glass_choir'], boss: true, noFlee: true, music: 'boss', force: ['maudra'], rewardMul: 2 },

  // ---------------------------------------------------------------- post-game: the First Thread
  roam('e_ft_1', ['grief_knot', 'hollow_mender', 'fate_spinner']),
  { id: 'b_first_thread', enemies: ['first_thread'], boss: true, noFlee: true, music: 'final_weaver', rewardMul: 3 },
];

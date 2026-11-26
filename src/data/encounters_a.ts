// Encounters for the Prologue, Act I (Hollowmere, Thimble Fields, Lanternmere, Cindermill, the Selvage) and the
// optional Bobbin Burrow. Roaming groups are e_<region>_<n>; bosses b_<boss>.
import type { EncounterDef } from './types';

export const ENCOUNTERS_A: EncounterDef[] = [
  // ---------------------------------------------------------------- Prologue: Hollowmere (levels 1-3)
  { id: 't_spar', enemies: ['spar_corin'], only: ['ash'], noFlee: true, music: 'battle', rewardMul: 0.5 },
  { id: 'e_hollowmere_1', enemies: ['frayling', 'frayling'] },
  { id: 'e_hollowmere_2', enemies: ['yarn_hound'] },
  { id: 'e_hollowmere_3', enemies: ['frayling', 'yarn_hound'] },
  { id: 'e_hollowmere_4', enemies: ['frayling', 'frayling', 'frayling'] },
  { id: 'e_hollowmere_5', enemies: ['yarn_hound', 'frayling', 'yarn_hound'] },
  { id: 'b_unspun_hound', enemies: ['unspun_hound'], boss: true, noFlee: true, music: 'boss', rewardMul: 1.5 },

  // ---------------------------------------------------------------- Ch1: Thimble Fields (levels 3-6)
  { id: 'e_thimble_fields_1', enemies: ['stitch_crow', 'stitch_crow'] },
  { id: 'e_thimble_fields_2', enemies: ['scarecrow'] },
  { id: 'e_thimble_fields_3', enemies: ['thimble_knight', 'stitch_crow'] },
  { id: 'e_thimble_fields_4', enemies: ['thimble_knight', 'thimble_knight'] },
  { id: 'e_thimble_fields_5', enemies: ['scarecrow', 'scarecrow'] },
  { id: 'e_thimble_fields_6', enemies: ['stitch_crow', 'scarecrow', 'stitch_crow'] },
  { id: 'b_old_tatter', enemies: ['stitch_crow', 'old_tatter', 'stitch_crow'], boss: true, noFlee: true, music: 'boss', rewardMul: 1.5 },

  // ---------------------------------------------------------------- Ch2: Lanternmere (levels 6-9)
  { id: 'e_lanternmere_1', enemies: ['lantern_wisp', 'lantern_wisp'] },
  { id: 'e_lanternmere_2', enemies: ['reedlurker'] },
  // Maudra's first fight: the moths that killed her escort
  { id: 'e_lanternmere_maudra', enemies: ['bog_moth', 'bog_moth'], force: ['maudra'], noFlee: true },
  { id: 'e_lanternmere_3', enemies: ['bog_moth', 'lantern_wisp'] },
  { id: 'e_lanternmere_4', enemies: ['drowned_weaver'] },
  { id: 'e_lanternmere_5', enemies: ['drowned_weaver', 'drowned_weaver'] },
  { id: 'e_lanternmere_6', enemies: ['reedlurker', 'bog_moth'] },
  { id: 'e_lanternmere_7', enemies: ['lantern_wisp', 'lantern_wisp', 'lantern_wisp'] },
  // Orrin can't make himself step into the water: he watches from the bank
  {
    id: 'b_drowned_lamplighter',
    enemies: ['lantern_wisp', 'drowned_lamplighter', 'lantern_wisp'],
    boss: true,
    noFlee: true,
    music: 'boss',
    only: ['ash', 'corin', 'wick', 'maudra'],
    rewardMul: 1.5,
  },

  // ---------------------------------------------------------------- Ch3: Cindermill (levels 9-12)
  { id: 'e_cindermill_1', enemies: ['spindle_drone', 'spindle_drone'] },
  { id: 'e_cindermill_2', enemies: ['loomhound'] },
  { id: 'b_rook_duel', enemies: ['rook_duel'], boss: true, noFlee: true, music: 'battle', endAtHp: 0.5 },
  // the Shears come for Wick; Rook fights beside the party for the first time
  { id: 'e_cindermill_shears', enemies: ['shear_acolyte', 'shear_acolyte'], force: ['rook'], noFlee: true },
  { id: 'e_cindermill_3', enemies: ['spindle_drone', 'shear_acolyte'] },
  { id: 'e_cindermill_4', enemies: ['cinder_bobbin'] },
  { id: 'e_cindermill_5', enemies: ['shear_acolyte', 'loomhound'] },
  { id: 'e_cindermill_6', enemies: ['cinder_bobbin', 'spindle_drone'] },
  { id: 'b_foreman_gristle', enemies: ['foreman_gristle'], boss: true, noFlee: true, music: 'boss', rewardMul: 1.5 },

  // ---------------------------------------------------------------- Ch4: the Selvage (levels 12-15)
  { id: 'e_selvage_1', enemies: ['seamharpy'] },
  { id: 'e_selvage_2', enemies: ['gale_shroud', 'gale_shroud'] },
  { id: 'e_selvage_3', enemies: ['selvage_sentinel'] },
  { id: 'e_selvage_4', enemies: ['selvage_sentinel', 'gale_shroud'] },
  { id: 'e_selvage_5', enemies: ['seamharpy', 'gale_shroud', 'seamharpy'] },
  { id: 'b_tess_1', enemies: ['tess_1'], boss: true, noFlee: true, music: 'boss', force: ['ash', 'corin'], endAtHp: 0.3, rewardMul: 1.5 },
  // the scripted duel: it ends when Orrin drops below 60%, and he unthreads the party in the cutscene after
  { id: 'b_orrin_1', enemies: ['orrin_1'], boss: true, noFlee: true, music: 'boss_orrin', force: ['ash', 'corin', 'wick'], endAtHp: 0.6 },

  // ---------------------------------------------------------------- optional: Bobbin Burrow (levels 6-10)
  { id: 'e_bobbin_burrow_1', enemies: ['bobbin_mimic'] },
  { id: 'e_bobbin_burrow_2', enemies: ['thimble_knight', 'bobbin_mimic'] },
  { id: 'e_bobbin_burrow_3', enemies: ['bobbin_mimic', 'bobbin_mimic'] },
  { id: 'b_grandmother_spool', enemies: ['grandmother_spool'], theme: 'burrow', boss: true, noFlee: true, music: 'boss', rewardMul: 2 },
];

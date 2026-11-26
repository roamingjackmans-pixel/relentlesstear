// NPCs that only appear in the second half (the bible's named NPCs are in npcs.ts).
import type { NpcDef } from '../data/types';

export const NPCS_B: NpcDef[] = [
  // the Frayed Expanse: Marrowlane's echoes, replaying one moment forever
  { id: 'b_echo_baker', name: 'Echo of a Baker', kind: 'ghost', palette: ['#f3e9dc', '#c9b8a6', '#8fd3ff'] },
  { id: 'b_echo_child', name: 'Echo of a Child', kind: 'ghost', palette: ['#f6efe6', '#d7c6b4', '#a7e0ff'] },
  { id: 'b_echo_elder', name: 'Echo of an Old Woman', kind: 'ghost', palette: ['#ece4da', '#bfb0a0', '#9bd8ff'] },
  // Spindlehold
  { id: 'b_gate_guard', name: 'Choir Gatekeeper', kind: 'shear', palette: ['#f4f1ea', '#c9a54a', '#3a3550'] },
  { id: 'b_novice', name: 'Choir Novice', kind: 'priest', palette: ['#f7f4ee', '#d9c27a', '#6a6280'] },
  { id: 'b_pilgrim', name: 'Pilgrim', kind: 'villager', palette: ['#8a6d55', '#d8c3a0', '#4a3b30'] },
  // Hollowmere, at the edge of the Fray
  { id: 'b_evacuee', name: 'Hollowmere Neighbour', kind: 'villager', palette: ['#a5532f', '#e2c08d', '#3d2a20'] },
  // the Underweave: Thornwick's last night
  { id: 'b_young_ash', name: 'Little Ash', kind: 'child', palette: ['#c8553d', '#f1d3b3', '#2e2a3a'] },
  { id: 'b_young_rook', name: 'Young Shear', kind: 'shear', palette: ['#2f2b3a', '#c9a54a', '#8f8a99'] },
  // the Loomspire
  { id: 'b_loom', name: 'The Loom', kind: 'ghost', palette: ['#fff6d8', '#ffd76a', '#ffffff'] },
  // the First Thread
  { id: 'b_first_mender', name: 'The First Mender', kind: 'ghost', palette: ['#d9c3a0', '#7d6a55', '#ffe7a8'] },
  // epilogues
  { id: 'b_apprentice', name: 'Apprentice', kind: 'child', palette: ['#3f6e8c', '#f0d0b0', '#2a2420'] },
];

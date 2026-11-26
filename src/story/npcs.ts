// Every named NPC in the game (all acts). `kind` picks the actor drawer; `palette` is [main, secondary, accent].
// Speakers in scripts use these ids (say('pim_spool', ...)); act_b may add more in npcs_b.ts.
import type { NpcDef } from '../data/types';

export const NPCS_A: NpcDef[] = [
  // Bobbins: small spool-bodied folk with button eyes. They call themselves "this one".
  { id: 'pim_spool', name: 'Pim Spool', kind: 'bobbin', palette: ['#c98b4a', '#f2d6a2', '#6a3f20'] },
  { id: 'nana_tuft', name: 'Nana Tuft', kind: 'bobbin', palette: ['#9b7bb8', '#efe4cf', '#4a3560'] },
  { id: 'little_reel', name: 'Little Reel', kind: 'bobbin', palette: ['#e06a4f', '#ffe0b8', '#7a2e1e'] },
  { id: 'skein', name: 'Skein', kind: 'bobbin', palette: ['#5fa86a', '#e8f0d0', '#2c5434'] },
  { id: 'grandmother_spool', name: 'Grandmother Spool', kind: 'bobbin', palette: ['#8a7d6a', '#d9cdb4', '#3d342a'] },
  { id: 'burrow_bobbin', name: 'Burrow Bobbin', kind: 'bobbin', palette: ['#b59a5e', '#efe2c0', '#4f4022'] },

  // Hollowmere
  { id: 'bram_cotter', name: 'Bram Cotter', kind: 'villager', palette: ['#c9a27a', '#f3e6d0', '#7a4a2a'] },
  { id: 'old_wenna', name: 'Old Wenna', kind: 'elder', palette: ['#6f7f9a', '#e6dccb', '#3a4258'] },
  { id: 'fen', name: 'Fen', kind: 'child', palette: ['#d4763b', '#f5e1c4', '#5a3218'] },
  { id: 'hm_villager', name: 'Villager', kind: 'villager', palette: ['#8f9a5b', '#efe6cf', '#4a5028'] },

  // Lanternmere
  { id: 'ysolde', name: 'Ysolde', kind: 'villager', palette: ['#3f5f66', '#d8d0c0', '#1f3236'] },
  { id: 'lamplighter_ghost', name: 'The Lamplighter', kind: 'ghost', palette: ['#9fd6d0', '#f6c86a', '#2a4a50'] },
  { id: 'choir_escort', name: 'Choir Escort', kind: 'priest', palette: ['#e9e4d8', '#c9a64a', '#6a5a3a'] },

  // Cindermill
  { id: 'brother_anselm', name: 'Brother Anselm', kind: 'priest', palette: ['#d8cfbf', '#b8903a', '#5a4630'] },
  { id: 'pell', name: 'Pell', kind: 'villager', palette: ['#8a5a44', '#e8d2b8', '#3a2418'] },
  { id: 'mill_worker', name: 'Mill Worker', kind: 'villager', palette: ['#7a7470', '#cfc8bf', '#3a3634'] },
  { id: 'shear_captain', name: 'Shear Captain', kind: 'shear', palette: ['#3a3a44', '#c9c2b0', '#8a1e2a'] },

  // Spindlehold and the Choir
  { id: 'seraphine', name: 'Arbiter Seraphine Vael', kind: 'arbiter', palette: ['#f4f1ea', '#d6b25a', '#6b5a8a'] },
  { id: 'archivist_coll', name: 'Archivist Coll', kind: 'priest', palette: ['#cfc6b4', '#8a7a5a', '#4a4030'] },
  { id: 'hessa', name: 'Hessa', kind: 'ghost', palette: ['#dfe7f2', '#a8b8d8', '#4a5a7a'] },

  // The Underweave
  { id: 'lio', name: 'Lio', kind: 'lio', palette: ['#f2c94c', '#f6efe2', '#7a5a1e'] },
  { id: 'corin_echo', name: 'Corin', kind: 'ghost', palette: ['#e8b86a', '#f6ecd8', '#7a4a1e'] },
  { id: 'rhoswen', name: 'Rhoswen Vey', kind: 'mother', palette: ['#b85a4a', '#f0e0cc', '#5a2a22'] },
  { id: 'mender_ghost', name: 'Hollow Mender', kind: 'ghost', palette: ['#a8c0d0', '#e8eef2', '#3a4a5a'] },

  // The Loom itself, when it speaks
  { id: 'loom_voice', name: 'The Loom', kind: 'ghost', palette: ['#fff6d8', '#ffe08a', '#c9a64a'] },
];

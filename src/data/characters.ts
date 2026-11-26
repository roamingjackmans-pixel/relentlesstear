// The seven companions: base stats, growth, signature mechanic, looks.
import type { CharId, Element } from './types';

export interface CharDef {
  id: CharId;
  name: string;
  short: string;
  title: string;
  color: string; // UI accent
  element: Element;
  base: { hp: number; hpL: number; atk: number; atkL: number; def: number; defL: number; spd: number; luck: number };
  mech: 'stitch' | 'guard' | 'pattern' | 'tension' | 'verse' | 'heat' | 'penance';
  mechName: string;
  mechDesc: string;
  weapon: string; // starting weapon
  /** look for the actor rig */
  look: Look;
  bio: string;
}

export interface Look {
  skin: string;
  hair: string;
  hairStyle: 'bob' | 'long' | 'short' | 'bald' | 'tuft' | 'bun' | 'braid' | 'messy' | 'hood';
  coat: string;
  coat2: string;
  trim: string;
  height: number; // 1 = average
  build: number; // 1 = average width
  eyes: string;
  beard?: string;
  hat?: 'none' | 'wide' | 'hood' | 'cap' | 'veil';
  glow?: string; // Wick
}

export const CHARS: Record<CharId, CharDef> = {
  ash: {
    id: 'ash', name: 'Ash Vey', short: 'Ash', title: 'New Mender', color: '#e0a052', element: 'phys',
    base: { hp: 110, hpL: 13, atk: 18, atkL: 3.2, def: 8, defL: 1.6, spd: 106, luck: 8 },
    mech: 'stitch', mechName: 'Stitches', mechDesc: 'Her skills sew Stitches into a foe (up to 5). Pull Taut and Seamrender pull them all at once for huge damage. Perfect timing sews an extra Stitch.',
    weapon: 'w_ash_1',
    look: { skin: '#e8b994', hair: '#6b3a26', hairStyle: 'bob', coat: '#7a3b2a', coat2: '#4a2a22', trim: '#e7b75a', height: 0.96, build: 0.92, eyes: '#3b2a1a', hat: 'none' },
    bio: 'Nineteen and newly Stitched. Found on a road at six with nothing but a brass thimble. Hums when she sews and does not know the tune.',
  },
  corin: {
    id: 'corin', name: 'Corin Hale', short: 'Corin', title: 'Shieldbearer', color: '#6fa86a', element: 'phys',
    base: { hp: 150, hpL: 17, atk: 15, atkL: 2.6, def: 14, defL: 2.3, spd: 92, luck: 4 },
    mech: 'guard', mechName: 'Guard', mechDesc: 'Parries and protecting others build Guard (up to 5). Last Wall and Promise spend it. Interpose makes enemies hit him instead.',
    weapon: 'w_corin_1',
    look: { skin: '#c98d66', hair: '#3a2a1c', hairStyle: 'short', coat: '#3f5a3a', coat2: '#2c3b27', trim: '#c9a35a', height: 1.12, build: 1.3, eyes: '#2a1f14', beard: '#3a2a1c', hat: 'none' },
    bio: 'Twenty-six, enormous, gentle. Cooks for everyone, names everyone. Took Ash under his arm the day Orrin carried her home.',
  },
  wick: {
    id: 'wick', name: 'Wick', short: 'Wick', title: 'Thread-born', color: '#f06a4a', element: 'thread',
    base: { hp: 95, hpL: 11, atk: 17, atkL: 3.0, def: 7, defL: 1.4, spd: 104, luck: 10 },
    mech: 'pattern', mechName: 'Patterns', mechDesc: 'Wick learns the shapes of beaten enemies: some foes teach a Pattern skill when Wick helps defeat them. Fray trades HP for a 50% stronger next skill.',
    weapon: 'w_wick_1',
    look: { skin: '#f07a4e', hair: '#ffb26b', hairStyle: 'tuft', coat: '#3b4a6b', coat2: '#2a334a', trim: '#e7b75a', height: 0.62, build: 0.85, eyes: '#fff2c8', hat: 'none', glow: '#ff9a5a' },
    bio: 'A child made of glowing red-gold thread in a coat three sizes too big. Collects words. Afraid of scissors. Dreams of water.',
  },
  orrin: {
    id: 'orrin', name: 'Orrin Thale', short: 'Orrin', title: 'Master Mender', color: '#a7b6c9', element: 'phys',
    base: { hp: 130, hpL: 14, atk: 22, atkL: 3.6, def: 11, defL: 2.0, spd: 98, luck: 6 },
    mech: 'tension', mechName: 'Tension', mechDesc: 'Every action winds Tension tighter (0-100). Great Shear grows with it; Snap releases it all across every enemy.',
    weapon: 'w_orrin_1',
    look: { skin: '#d9a982', hair: '#d8d4cc', hairStyle: 'messy', coat: '#3a4250', coat2: '#262b35', trim: '#b9c4d4', height: 1.04, build: 1.0, eyes: '#3a4a5a', beard: '#d8d4cc', hat: 'none' },
    bio: 'Sixty-two. Master Mender of Hollowmere, storyteller, tea snob. Raised Ash and Corin. Hums an old lullaby when he thinks no one is listening.',
  },
  maudra: {
    id: 'maudra', name: 'Sister Maudra Fell', short: 'Maudra', title: 'Choir Sister', color: '#c9a0e0', element: 'light',
    base: { hp: 105, hpL: 12, atk: 15, atkL: 2.8, def: 9, defL: 1.7, spd: 96, luck: 7 },
    mech: 'verse', mechName: 'Verses', mechDesc: 'Her skills add Hope, Grief or Wrath verses (3 at most). Hymn sings them: Hope heals, Grief weakens, Wrath smites, and three alike become a great Hymn.',
    weapon: 'w_maudra_1',
    look: { skin: '#b07a5a', hair: '#9a9590', hairStyle: 'bun', coat: '#e9e2d2', coat2: '#b8ad98', trim: '#c9a0e0', height: 1.0, build: 1.05, eyes: '#2a1f1a', hat: 'veil' },
    bio: 'Fifty-four. Sharp tongue, soft hands, devout. Sent "by decree" to escort the pilgrimage. Smokes sweetgrass. Had a sister once.',
  },
  rook: {
    id: 'rook', name: 'Rook Ardent', short: 'Rook', title: 'Deserter', color: '#d0603a', element: 'phys',
    base: { hp: 105, hpL: 12, atk: 19, atkL: 3.4, def: 8, defL: 1.5, spd: 112, luck: 12 },
    mech: 'heat', mechName: 'Heat', mechDesc: 'Shots and skills build Heat (0-10) and grow with it. At 10, Crucible fires everything. Vent trades Heat for AP. His first Free Aim shot each turn is free.',
    weapon: 'w_rook_1',
    look: { skin: '#a8714f', hair: '#1f1a18', hairStyle: 'long', coat: '#2a2624', coat2: '#1a1716', trim: '#b04a2a', height: 1.06, build: 0.95, eyes: '#c9a05a', beard: '#2a2220', hat: 'wide' },
    bio: 'Thirty-four. Laconic, sardonic, good with animals. Wears a Shear\'s coat with the insignia cut off. Looking for someone.',
  },
  tess: {
    id: 'tess', name: 'Tess Quill', short: 'Tess', title: 'Penitent', color: '#5ab6c9', element: 'phys',
    base: { hp: 120, hpL: 14, atk: 19, atkL: 3.4, def: 10, defL: 1.8, spd: 108, luck: 8 },
    mech: 'penance', mechName: 'Penance', mechDesc: 'Damage Tess takes fills Penance (0-100). Absolution spends it to heal everyone; Scissor Rite spends it on one enormous cut.',
    weapon: 'w_tess_1',
    look: { skin: '#e3b08c', hair: '#c94a3a', hairStyle: 'braid', coat: '#2f4a55', coat2: '#20343c', trim: '#5ab6c9', height: 1.0, build: 0.95, eyes: '#2a3a3a', hat: 'none' },
    bio: 'Twenty-four. Brilliant, prickly, laughs too loud. Trained beside Corin under Orrin. Chose the wrong side for the right reasons.',
  },
};

export const LEVEL_CAP = 60;

/** XP needed to go from level L to L+1. */
export function xpToNext(level: number): number {
  return Math.round(60 + level * 45 + level * level * 0.6);
}

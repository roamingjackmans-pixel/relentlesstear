// Items: tinctures, consumables, materials, key items, patches (passives), weapons, outfits, songs.
import type { CharId, Element, ItemDef } from './types';

export interface PatchDef {
  id: string;
  name: string;
  desc: string;
  stats?: { hp?: number; atk?: number; def?: number; spd?: number; crit?: number };
  /** the passive id the engine checks (see battle/passives) */
  passive: string;
  /** Thread Points to sew it on as an Embroidery once learned */
  tp: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  who: CharId;
  atk: number; // at level 1
  perLv: number;
  element: Element;
  perks: [string, string, string]; // passive ids at weapon level 4, 10, 20
  perkText: [string, string, string];
  desc: string;
  price: number;
}

const P = (id: string, name: string, tp: number, passive: string, desc: string, stats?: PatchDef['stats']): PatchDef => ({ id, name, tp, passive, desc, stats });

export const PATCHES: PatchDef[] = [
  P('p_first_light', 'First Light', 3, 'first_light', 'Start each battle with +1 AP.'),
  P('p_quick_hands', 'Quick Hands', 2, 'none', '+10% Speed.', { spd: 0.1 }),
  P('p_stout_heart', 'Stout Heart', 2, 'none', '+15% max HP.', { hp: 0.15 }),
  P('p_thimble_guard', 'Thimble Guard', 4, 'thimble_guard', 'Start each battle with 1 Shield.'),
  P('p_parry_echo', 'Parry Echo', 4, 'parry_echo', 'Parrying heals 3% HP.'),
  P('p_ember_hem', 'Ember Hem', 4, 'ember_hem', 'Basic attacks apply 1 Burn.'),
  P('p_frost_hem', 'Frost Hem', 5, 'frost_hem', 'Basic attacks have a 15% chance to Freeze.'),
  P('p_storm_hem', 'Storm Hem', 4, 'storm_hem', 'Basic attacks deal Storm damage, +10%.'),
  P('p_second_wind', 'Second Wind', 6, 'second_wind', 'Once per battle, survive a lethal hit with 1 HP.'),
  P('p_lucky_button', 'Lucky Button', 3, 'none', '+10% critical chance.', { crit: 0.1 }),
  P('p_sharp_eye', 'Sharp Eye', 3, 'sharp_eye', 'Free Aim shots deal +50% damage.'),
  P('p_seam_seeker', 'Seam Seeker', 5, 'seam_seeker', 'Hitting a weak point gives +1 AP.'),
  P('p_breaker', "Breaker's Thread", 4, 'breaker', '+30% Break damage.'),
  P('p_leech_stitch', 'Leech Stitch', 6, 'leech', 'Heal 8% of the damage your skills deal.'),
  P('p_running_stitch', 'Running Start', 4, 'running_start', 'Start each battle Hasted for 2 turns.'),
  P('p_patience', 'Patience', 3, 'patience', 'Basic attacks give +1 extra AP.'),
  P('p_glass_needle', 'Glass Needle', 5, 'glass_needle', '+25% damage dealt, +25% damage taken.'),
  P('p_healers_thread', "Healer's Thread", 4, 'healers_thread', 'Healing you give is 25% stronger.'),
  P('p_last_stand', 'Last Stand', 4, 'last_stand', '+40% damage while you are the only one standing.'),
  P('p_ember_lining', 'Ember Lining', 3, 'ember_lining', 'Immune to Burn; -30% Fire damage taken.'),
  P('p_wool_lining', 'Wool Lining', 3, 'wool_lining', 'Immune to Freeze; -30% Ice damage taken.'),
  P('p_copper_thread', 'Copper Thread', 3, 'copper_thread', 'Immune to Shock; -30% Storm damage taken.'),
  P('p_metronome', 'Metronome', 6, 'metronome', 'Each Perfect input in a row adds +5% damage (up to +50%); a miss resets it.'),
  P('p_counterweight', 'Counterweight', 5, 'counterweight', 'Counters deal +50% damage.'),
  P('p_light_feet', 'Light Feet', 5, 'light_feet', 'Dodge timing window +35%.'),
  P('p_steady_hand', 'Steady Hand', 6, 'steady_hand', 'Parry timing window +30%.'),
  P('p_harvest', 'Harvest', 5, 'harvest', '+1 AP whenever you defeat an enemy.'),
  P('p_wildfire', 'Wildfire', 5, 'wildfire', 'When a Burning enemy falls, its Burn spreads to the others.'),
  P('p_hunters_mark', "Hunter's Mark", 4, 'hunters_mark', 'Free Aim shots Mark their target.'),
  P('p_slow_mending', 'Slow Mending', 5, 'slow_mending', 'Regain 4% HP at the start of each turn.'),
  P('p_bright_weave', 'Bright Weave', 5, 'bright_weave', 'The Weave gauge fills 25% faster.'),
  P('p_ambusher', 'Ambusher', 4, 'ambusher', 'First Strikes deal double damage.'),
  P('p_bobbins_purse', "Bobbin's Purse", 3, 'bobbins_purse', '+25% Glim from battles.'),
  P('p_scholars_ribbon', "Scholar's Ribbon", 3, 'scholars_ribbon', '+15% XP from battles.'),
  P('p_rekindle', 'Rekindle', 4, 'rekindle', 'When revived, gain 3 AP.'),
  P('p_coup_de_grace', 'Coup de Grâce', 5, 'coup_de_grace', '+30% damage to enemies under 30% HP.'),
  P('p_shatterpoint', 'Shatterpoint', 5, 'shatterpoint', 'Breaking an enemy gives +2 AP.'),
  P('p_mirror_thread', 'Mirror Thread', 5, 'mirror_thread', 'When one of your Shields blocks a hit, the attacker takes damage.'),
  P('p_clean_hands', 'Clean Hands', 4, 'clean_hands', 'At the start of your turn, remove one ailment.'),
  P('p_grandmothers_knot', "Grandmother's Knot", 8, 'grandmothers_knot', 'Start each battle with +2 AP, 1 Shield and Regen.'),
  P('p_choir_glass', 'Choir Glass', 8, 'choir_glass', 'Parries also Weaken the attacker.', { def: 0.1 }),
  P('p_first_thread', 'The First Thread', 10, 'first_thread', '+20% to every stat. Every Perfect input adds +1 AP once per turn.', { hp: 0.2, atk: 0.2, def: 0.2, spd: 0.2 }),
];
export const PATCH_MAP: Record<string, PatchDef> = Object.fromEntries(PATCHES.map((p) => [p.id, p]));

const W = (id: string, name: string, who: CharId, atk: number, perLv: number, element: Element, perks: [string, string, string], perkText: [string, string, string], price: number, desc: string): WeaponDef => ({ id, name, who, atk, perLv, element, perks, perkText, price, desc });

export const WEAPONS: WeaponDef[] = [
  W('w_ash_1', "Apprentice's Needle", 'ash', 10, 1.5, 'phys', ['stitch_plus', 'none', 'crit10'], ['Running Stitch sews +1 Stitch', '—', '+10% crit'], 0, 'Orrin\'s old needle. Thin, honest, sharp.'),
  W('w_ash_2', 'Thimblebright', 'ash', 16, 1.7, 'light', ['first_light', 'stitch_plus', 'pull_plus'], ['+1 AP at battle start', 'Running Stitch sews +1 Stitch', 'Pull Taut +20% power'], 1400, 'A brass basket hilt shaped like her mother\'s thimble.'),
  W('w_ash_3', 'Seamrender', 'ash', 24, 1.9, 'thread', ['pull_plus', 'crit10', 'stitch_cap'], ['Pull Taut +20% power', '+10% crit', 'Stitches cap at 7'], 4200, 'It hums when it cuts. It cuts seams.'),
  W('w_ash_4', 'Last Stitch', 'ash', 34, 2.1, 'thread', ['stitch_plus', 'pull_plus', 'fatebreaker'], ['Running Stitch sews +1 Stitch', 'Pull Taut +20% power', 'Ignores resistance'], 8000, 'The needle she makes herself, from nothing anybody wrote.'),
  W('w_corin_1', 'Hearthguard', 'corin', 9, 1.4, 'phys', ['guard_plus', 'none', 'thimble_guard'], ['Start battles with 1 Guard', '—', 'Start battles with 1 Shield'], 0, 'A kitchen-door shield and a mallet. It has stopped worse than you.'),
  W('w_corin_2', 'Millstone Wall', 'corin', 15, 1.6, 'earth', ['guard_plus', 'parry_echo', 'last_wall_plus'], ['Start battles with 1 Guard', 'Parrying heals 3%', 'Last Wall +25%'], 1300, 'Cut from a millstone. Heavy enough to anchor a barn.'),
  W('w_corin_3', 'Oak & Iron', 'corin', 22, 1.8, 'earth', ['thimble_guard', 'guard_plus', 'mirror_thread'], ['Start battles with 1 Shield', 'Start battles with 1 Guard', 'Blocked hits hurt the attacker'], 4000, 'Hollowmere oak, banded by the village smith.'),
  W('w_corin_4', 'Promise', 'corin', 30, 2.0, 'light', ['guard_plus', 'last_wall_plus', 'second_wind'], ['Start battles with 1 Guard', 'Last Wall +25%', 'Survive one lethal hit'], 7000, 'He painted a little needle on the inside. Ash never saw it.'),
  W('w_wick_1', 'Little Spool', 'wick', 9, 1.5, 'thread', ['fray_plus', 'none', 'regen_start'], ['Fray costs 10% instead of 15%', '—', 'Start battles with Regen'], 0, 'A wooden spool on a ribbon. Wick insists it is a sword.'),
  W('w_wick_2', 'Kitebone', 'wick', 15, 1.7, 'storm', ['fray_plus', 'pattern_plus', 'none'], ['Fray costs 10%', 'Patterns +20% power', '—'], 1300, 'A kite frame strung with storm-silk.'),
  W('w_wick_3', 'Lullaby Ribbon', 'wick', 22, 1.9, 'light', ['regen_start', 'pattern_plus', 'healers_thread'], ['Start battles with Regen', 'Patterns +20% power', 'Heals +25%'], 4000, 'It sways to a song nobody is playing.'),
  W('w_wick_4', "Lio's Thread", 'wick', 32, 2.1, 'thread', ['pattern_plus', 'fray_plus', 'first_light'], ['Patterns +20% power', 'Fray costs 10%', '+1 AP at battle start'], 8000, 'Yellow, like a raincoat. Wick carries both of them now.'),
  W('w_orrin_1', 'Old Shears', 'orrin', 14, 1.6, 'phys', ['tension_plus', 'none', 'none'], ['Start battles with 30 Tension', '—', '—'], 0, 'A Mender\'s great shears. The blades are older than Hollowmere.'),
  W('w_orrin_2', 'Tearsong', 'orrin', 20, 1.8, 'thread', ['tension_plus', 'crit10', 'none'], ['Start battles with 30 Tension', '+10% crit', '—'], 1800, 'He had it made years ago. He never said what for.'),
  W('w_maudra_1', 'Choir Bell', 'maudra', 9, 1.4, 'light', ['verse_start', 'none', 'healers_thread'], ['Start battles with a Hope verse', '—', 'Heals +25%'], 0, 'A silver bell on a staff, rung at every death in Spindlehold.'),
  W('w_maudra_2', 'Ledger Staff', 'maudra', 15, 1.6, 'dark', ['verse_start', 'hymn_plus', 'none'], ['Start battles with a Hope verse', 'Hymns +25%', '—'], 1300, 'Ash wood bound with pages that list no names.'),
  W('w_maudra_3', "Heretic's Hymn", 'maudra', 26, 1.9, 'light', ['hymn_plus', 'verse_start', 'ignore_resist'], ['Hymns +25%', 'Start with a Hope verse', 'Ignores resistance'], 5200, 'She stripped the Choir\'s seal off and kept the bell.'),
  W('w_rook_1', 'Hollowpoint', 'rook', 11, 1.6, 'phys', ['heat_start', 'none', 'crit10'], ['Start battles with 3 Heat', '—', '+10% crit'], 0, 'A long thread-pistol. Shear issue, serial filed off.'),
  W('w_rook_2', 'Cinderkiss', 'rook', 17, 1.8, 'fire', ['heat_start', 'sharp_eye', 'crit10'], ['Start with 3 Heat', 'Free Aim +50%', '+10% crit'], 1500, 'Cindermill steel; leaves sparks in the air.'),
  W('w_rook_3', 'Penitent', 'rook', 27, 2.0, 'light', ['heat_start', 'sharp_eye', 'seam_seeker'], ['Start with 3 Heat', 'Free Aim +50%', 'Weak points give +1 AP'], 5600, 'He engraved one word on it. Ash finds out which in the Underweave.'),
  W('w_tess_1', 'Splitblade', 'tess', 22, 1.8, 'phys', ['penance_start', 'none', 'crit10'], ['Start with 20 Penance', '—', '+10% crit'], 0, 'Two short blades that fit together into one.'),
  W('w_tess_2', 'Bright Shears', 'tess', 27, 1.9, 'light', ['penance_start', 'coup_de_grace', 'crit10'], ['Start with 20 Penance', '+30% vs weakened foes', '+10% crit'], 5000, 'Orrin\'s gift when she was sixteen. She polished them anyway.'),
  W('w_tess_3', 'Atonement', 'tess', 33, 2.1, 'thread', ['penance_start', 'leech', 'second_wind'], ['Start with 20 Penance', 'Skills heal 8% of damage', 'Survive one lethal hit'], 8500, 'Forged from Corin\'s old training sword.'),
];
export const WEAPON_MAP: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const WEAPON_MAX = 30;
/** silk needed to raise a weapon from level L to L+1 */
export function upgradeCost(level: number): { item: string; n: number } {
  if (level < 8) return { item: 'silk_raw', n: 1 + Math.floor(level / 3) };
  if (level < 16) return { item: 'silk_fine', n: 1 + Math.floor((level - 8) / 3) };
  if (level < 24) return { item: 'silk_gilded', n: 1 + Math.floor((level - 16) / 3) };
  return { item: 'silk_star', n: 1 + Math.floor((level - 24) / 3) };
}
export function weaponAtk(id: string, level: number): number {
  const w = WEAPON_MAP[id];
  return w ? Math.round(w.atk + w.perLv * (level - 1)) : 8;
}
export function weaponPerks(id: string, level: number): string[] {
  const w = WEAPON_MAP[id];
  if (!w) return [];
  return w.perks.filter((p, i) => p !== 'none' && level >= [4, 10, 20][i]);
}

const items: ItemDef[] = [
  { id: 'tincture_heal', name: 'Healing Tincture', kind: 'tincture', desc: 'Heals one ally 50%. Refilled at every Waystitch.' },
  { id: 'tincture_revive', name: 'Reviving Tincture', kind: 'tincture', desc: 'Revives a fallen ally at 40%. Refilled at Waystitches.' },
  { id: 'tincture_spirit', name: 'Spirit Tincture', kind: 'tincture', desc: 'Gives an ally 3 AP. Refilled at Waystitches.' },
  { id: 'honey_bun', name: 'Honey Bun', kind: 'consumable', desc: 'Corin approves. Heals the whole party 25%.', price: 40 },
  { id: 'smelling_salts', name: 'Smelling Salts', kind: 'consumable', desc: 'Cures every ailment on one ally.', price: 30 },
  { id: 'ember_vial', name: 'Ember Vial', kind: 'consumable', desc: 'Fire damage to every enemy, with Burn.', price: 80 },
  { id: 'frost_vial', name: 'Frost Vial', kind: 'consumable', desc: 'Ice damage to every enemy; may Freeze.', price: 80 },
  { id: 'storm_vial', name: 'Storm Vial', kind: 'consumable', desc: 'Storm damage to every enemy, with Shock.', price: 80 },
  { id: 'spool_of_will', name: 'Spool of Will', kind: 'consumable', desc: 'Gives one ally 3 AP.', price: 150 },
  { id: 'golden_thread', name: 'Golden Thread', kind: 'consumable', desc: 'Revives a fallen ally at full HP.', price: 600 },
  { id: 'silk_raw', name: 'Raw Spindlesilk', kind: 'material', desc: 'Upgrades weapons to level 8.', price: 60 },
  { id: 'silk_fine', name: 'Fine Spindlesilk', kind: 'material', desc: 'Upgrades weapons to level 16.', price: 250 },
  { id: 'silk_gilded', name: 'Gilded Spindlesilk', kind: 'material', desc: 'Upgrades weapons to level 24.', price: 900 },
  { id: 'silk_star', name: 'Starsilk', kind: 'material', desc: 'Upgrades weapons to level 30. It glows faintly, like something behind the Loom.', price: 3000 },
  { id: 'glass_bead', name: 'Glass Bead', kind: 'material', desc: 'A bead of fused tincture-glass. Rest at a Waystitch to add a tincture charge.' },
  { id: 'memory_spool', name: 'Spool of Memory', kind: 'material', desc: '+1 Thread Point for Embroideries.' },
  { id: 'mothers_thimble', name: "Mother's Thimble", kind: 'key', desc: 'Brass, dented, warm from her pocket. The only thing left of wherever she came from.' },
  { id: 'music_box', name: 'Music Box', kind: 'key', desc: 'Found in the Thimble Fields. It plays a lullaby Ash somehow already knows.' },
  { id: 'ledger_page', name: 'Ledger Page', kind: 'key', desc: 'A page torn from the Ledger of Fates.' },
  { id: 'lio_ribbon', name: 'Yellow Ribbon', kind: 'key', desc: 'A child\'s hair ribbon, still damp.' },
  { id: 'corins_shield', name: "Corin's Shield", kind: 'key', desc: 'It stayed planted in the ground at the Seam. Ash carried it out.' },
  { id: 'orrins_shears', name: "Orrin's Shears", kind: 'key', desc: 'The blades that cut the Warp.' },
  { id: 'ferry_bell', name: 'Ferry Bell', kind: 'key', desc: 'Ring it at the water\'s edge in Lanternmere and the ferry comes.' },
  { id: 'grapple_spool', name: 'Grapple Spool', kind: 'key', desc: 'A Bobbin climbing line. Opens the high paths of the Selvage.' },
];
for (const p of PATCHES) items.push({ id: p.id, name: p.name, kind: 'patch', desc: p.desc, price: 0 });
for (const w of WEAPONS) items.push({ id: w.id, name: w.name, kind: 'weapon', desc: w.desc, price: w.price, who: w.who });

const OUTFIT_NAMES: Record<string, string> = {
  o_ash_1: 'Harvest Coat', o_ash_2: 'Mender\'s Grey', o_corin_1: 'Apron & Tunic', o_wick_1: 'Yellow Scarf', o_wick_2: 'Starling Coat',
  o_maudra_1: 'Plain Habit', o_rook_1: 'Dustcoat', o_tess_1: 'Old Uniform',
};
for (const [id, name] of Object.entries(OUTFIT_NAMES)) items.push({ id, name, kind: 'outfit', desc: 'An outfit. Change it from the party menu.', who: id.split('_')[1] as CharId });
for (let i = 1; i <= 10; i++) items.push({ id: `song_${String(i).padStart(2, '0')}`, name: `Music Sheet ${i}`, kind: 'song', desc: 'A song for the camp music box.' });

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));

/** Outfit palettes: overrides for a character's coat colors. */
export const OUTFITS: Record<string, { coat: string; coat2: string; trim: string }> = {
  o_ash_1: { coat: '#a8562c', coat2: '#6a3420', trim: '#f0c66a' },
  o_ash_2: { coat: '#5a5e66', coat2: '#3a3d44', trim: '#d9d2c2' },
  o_corin_1: { coat: '#c9b48a', coat2: '#7a5a3a', trim: '#6a4a2a' },
  o_wick_1: { coat: '#d9b23a', coat2: '#9a7a1a', trim: '#f06a4a' },
  o_wick_2: { coat: '#1a2a4a', coat2: '#0f1a30', trim: '#cfd8ff' },
  o_maudra_1: { coat: '#6a5a4a', coat2: '#4a3d32', trim: '#c9a0e0' },
  o_rook_1: { coat: '#8a6a4a', coat2: '#5a4430', trim: '#d0603a' },
  o_tess_1: { coat: '#6a2a2a', coat2: '#4a1a1a', trim: '#e0c08a' },
};

export const TINCTURES = ['tincture_heal', 'tincture_revive', 'tincture_spirit'] as const;
export const TINCTURE_BASE: Record<string, number> = { tincture_heal: 3, tincture_revive: 2, tincture_spirit: 2 };

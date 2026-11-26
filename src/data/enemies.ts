// Every enemy in Relentless Tear. Stats come from one curve per level (see `stats`), bent per enemy by multipliers,
// so balance stays consistent. Attack timelines: `windup` ms of telegraph, then hits at `at` ms. Hits are learnable:
// rhythms vary, some pause before the last hit. Weak points are in size-1 local units from the feet (y up is negative,
// the enemy faces left), matching the glowing spots in render/enemyArt.ts.
//
// Conventions the engine relies on:
// - An attack with `hits: []` is a pure support move (self status, heal, summon); there is nothing to defend.
// - Multi-phase bosses chain through `phases`: at the HP fraction the def switches to `to`. Every def in a chain has
//   the same max HP, so the fraction carries over.
import type { Element, EnemyAttack, EnemyDef, HitDef, StatusId, WeakPoint } from './types';

type Kind = NonNullable<HitDef['kind']>;
type Status = NonNullable<HitDef['status']>;

const st = (id: StatusId, chance: number, turns?: number, stacks?: number): Status => ({ id, chance, ...(turns ? { turns } : {}), ...(stacks ? { stacks } : {}) });

const h = (at: number, power: number, kind: Kind = 'normal', element?: Element, status?: Status): HitDef => ({
  at,
  power,
  kind,
  ...(element ? { element } : {}),
  ...(status ? { status } : {}),
});

/** n evenly spaced hits */
const run = (start: number, gap: number, n: number, power: number, kind: Kind = 'normal', element?: Element): HitDef[] => Array.from({ length: n }, (_, i) => h(start + i * gap, power, kind, element));

const A = (id: string, name: string, anim: string, windup: number, hits: HitDef[], target: EnemyAttack['target'] = 'one', extra: Partial<EnemyAttack> = {}): EnemyAttack => ({
  id,
  name,
  anim,
  windup,
  hits,
  target,
  ...extra,
});

const wp = (name: string, x: number, y: number, r: number, hp = 0): WeakPoint => ({ name, x, y, r, ...(hp ? { hp } : {}) });

interface Mods {
  hp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  brk?: number;
}

/** the level curve, bent by multipliers; `boss` multiplies HP (and xp ×8, glim ×6) */
function stats(L: number, m: Mods = {}, boss = 0): Pick<EnemyDef, 'level' | 'hp' | 'atk' | 'def' | 'spd' | 'breakHp' | 'xp' | 'glim'> {
  const hp = Math.round((60 + 70 * L) * (m.hp ?? 1) * (boss || 1));
  return {
    level: L,
    hp,
    atk: Math.round((12 + 5 * L) * (m.atk ?? 1)),
    def: Math.round((5 + 2.5 * L) * (m.def ?? 1)),
    spd: Math.round((90 + 1.5 * L) * (m.spd ?? 1)),
    breakHp: Math.round(hp * (boss ? 0.28 : 0.5) * (m.brk ?? 1)),
    xp: Math.round(8 * L * (boss ? 8 : 1) * Math.max(1, (m.hp ?? 1) * 0.9)),
    glim: Math.round(6 * L * (boss ? 6 : 1)),
  };
}

type Extra = Omit<EnemyDef, 'id' | 'name' | 'art' | 'size' | 'level' | 'hp' | 'atk' | 'def' | 'spd' | 'breakHp' | 'xp' | 'glim'>;

const list: EnemyDef[] = [];
function E(id: string, name: string, size: number, L: number, m: Mods, boss: number, extra: Extra, art = id): void {
  list.push({ id, name, art, size, ...stats(L, m, boss), ...(boss ? { boss: true } : {}), ...extra });
}

// =================================================================== Prologue: Hollowmere

E('spar_corin', 'Corin (sparring)', 1, 1, { hp: 2.2, atk: 0.45, def: 0.8, spd: 0.9, brk: 0.8 }, 0, {
  weak: [],
  resist: [],
  attacks: [
    A('practice_swing', 'Practice Swing', 'lunge', 1100, [h(0, 0.6)], 'one', { weight: 3 }),
    A('one_two', 'One-Two', 'lunge', 1000, [h(0, 0.4), h(520, 0.4)], 'one', { weight: 2 }),
    A('mallet_feint', 'Mallet Feint', 'lunge', 1100, [h(0, 0.3), h(600, 0.5)], 'one', { weight: 2 }),
    A('shield_stomp', 'Shield Stomp', 'slam', 1100, [h(0, 0.5, 'jump')], 'one', { weight: 2 }),
  ],
  lore: 'Corin says he is going easy on you. Corin is lying, a little.',
}, 'party:corin');

E('frayling', 'Frayling', 0.6, 1, { hp: 0.8, atk: 0.9 }, 0, {
  weak: ['fire'],
  resist: ['thread'],
  attacks: [
    A('tangle_hop', 'Tangle Hop', 'lunge', 700, [h(0, 1.0, 'normal', 'phys', st('slow', 0.25, 2))], 'one', { pattern: 'pat_frayling_tangle', weight: 2 }),
    A('bump_bump', 'Bump-Bump', 'lunge', 620, [h(0, 0.6), h(320, 0.7)], 'one', { weight: 2 }),
  ],
  drops: [{ item: 'honey_bun', chance: 0.08 }],
  lore: 'A knot of loose thread that learned to want. It wants to be a ball of yarn again, and it is very angry that it can’t.',
});

E('yarn_hound', 'Yarn Hound', 0.85, 2, { spd: 1.15 }, 0, {
  weak: ['fire'],
  resist: ['ice'],
  attacks: [
    A('snarl_bite', 'Snarl Bite', 'lunge', 650, [h(0, 1.1, 'normal', 'phys', st('bleed', 0.3, 2))], 'one', { pattern: 'pat_yarn_hound_bite', weight: 3 }),
    A('pounce', 'Pounce', 'swoop', 900, [h(0, 0.55), h(260, 0.55), h(820, 1.0)], 'one', { weight: 2 }),
    A('unravelling_howl', 'Unravelling Howl', 'roar', 850, [h(0, 0.45, 'magic', 'thread')], 'all', { weight: 1 }),
  ],
  drops: [{ item: 'silk_raw', chance: 0.12 }],
  lore: 'Red yarn wound into the shape of a wolf by the Fray. It still remembers whose scarf it used to be.',
});

E('unspun_hound', 'The Unspun Hound', 1.9, 3, { spd: 1.1, atk: 1.05 }, 7, {
  weak: ['fire'],
  resist: ['thread', 'ice'],
  attacks: [
    A('maul', 'Maul', 'lunge', 820, [h(0, 0.8), h(300, 0.8), h(620, 1.2)], 'one', { weight: 3 }),
    A('yarn_storm', 'Yarn Storm', 'roar', 1000, [h(0, 0.45, 'magic', 'thread'), h(260, 0.45, 'magic', 'thread'), h(520, 0.45, 'magic', 'thread'), h(1080, 0.8, 'magic', 'thread')], 'all', { weight: 2 }),
    A('ground_tear', 'Ground Tear', 'slam', 950, [h(0, 0.9, 'jump'), h(480, 0.9, 'jump')], 'all', { weight: 2 }),
    A('frenzy', 'Frenzy', 'lunge', 700, [h(0, 0.45), h(200, 0.45), h(400, 0.45), h(600, 0.5), h(1150, 1.3)], 'one', { belowHp: 0.5, weight: 3 }),
    A('call_the_litter', 'Call the Litter', 'roar', 800, [], 'one', { summon: 'frayling', belowHp: 0.6, weight: 1 }),
  ],
  weakPoints: [wp('Loose Knot', -40, -80, 14)],
  drops: [{ item: 'silk_raw', chance: 1 }],
  lore: 'The Fray swallowed half of Hollowmere’s north field and this is what walked out: every lost scarf and mitten in the village, wound into one hungry thing.',
});

// =================================================================== Ch1: Thimble Fields

E('stitch_crow', 'Stitchcrow', 0.65, 4, { hp: 0.75, spd: 1.2, def: 0.8 }, 0, {
  weak: ['storm'],
  resist: ['earth'],
  flying: true,
  attacks: [
    A('button_peck', 'Button Peck', 'swoop', 620, [h(0, 0.42), h(200, 0.42), h(400, 0.42), h(820, 0.7)], 'one', { pattern: 'pat_stitch_crow_peck', weight: 3 }),
    A('glint_snatch', 'Glint Snatch', 'swoop', 800, [h(0, 1.0, 'normal', 'phys', st('marked', 0.5, 2))], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Button Eye', -27, -84, 7)],
  drops: [{ item: 'silk_raw', chance: 0.1 }],
  lore: 'Black thread and one bright button. It steals buttons from coats, then eyes from scarecrows, then it gets ambitious.',
});

E('scarecrow', 'Hollow Scarecrow', 1, 5, { hp: 1.1, spd: 0.9 }, 0, {
  weak: ['fire'],
  resist: ['earth', 'storm'],
  attacks: [
    A('harvest_sweep', 'Harvest Sweep', 'sweep', 900, [h(0, 0.8)], 'all', { pattern: 'pat_scarecrow_sweep', weight: 2 }),
    A('reaping', 'Reaping', 'lunge', 760, [h(0, 0.6), h(360, 0.6), h(1000, 1.1)], 'one', { weight: 3 }),
    A('straw_burst', 'Straw Burst', 'roar', 720, [h(0, 0.5, 'jump'), h(320, 0.5, 'jump')], 'all', { belowHp: 0.5, weight: 2 }),
  ],
  weakPoints: [wp('Straw Heart', 0, -95, 12)],
  drops: [{ item: 'silk_raw', chance: 0.15 }],
  lore: 'Left in the fields when the farmers fled. The Fray gave it a heart of straw, and the heart told it the crows were right.',
});

E('thimble_knight', 'Thimble Knight', 0.85, 5, { def: 1.6, spd: 0.85, hp: 1.1 }, 0, {
  weak: ['storm'],
  resist: ['phys'],
  attacks: [
    A('needle_thrust', 'Needle Thrust', 'lunge', 720, [h(0, 0.95), h(520, 0.95)], 'one', { weight: 3 }),
    A('thimble_up', 'Thimble Up', 'cast', 600, [], 'one', { selfStatus: { id: 'shield', turns: 3, stacks: 2 }, weight: 1 }),
    A('shield_bash', 'Button Bash', 'slam', 900, [h(0, 1.3, 'jump')], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Thimble Helm', 0, -98, 24, 90)],
  drops: [{ item: 'silk_raw', chance: 0.2 }],
  lore: 'In the children’s story the giants left their sewing room in a hurry. Something small found the thimbles and decided to be brave in them.',
});

E('old_tatter', 'Old Tatter', 1.75, 6, { hp: 1.1, spd: 0.95 }, 8, {
  weak: ['fire'],
  resist: ['earth', 'phys'],
  immune: ['freeze'],
  attacks: [
    A('crow_volley', 'Crow Volley', 'cast', 950, [h(0, 0.4), h(220, 0.4), h(440, 0.4), h(660, 0.4), h(1120, 0.6)], 'all', { weight: 2 }),
    A('patchwork_reap', 'Patchwork Reap', 'sweep', 1000, [h(0, 0.7), h(400, 0.7), h(700, 0.7), h(1300, 1.4)], 'one', { weight: 3 }),
    A('tattered_stomp', 'Tattered Stomp', 'slam', 950, [h(0, 0.8, 'jump'), h(580, 0.8, 'jump')], 'all', { weight: 2 }),
    A('a_murder_of_crows', 'A Murder of Crows', 'cast', 1050, [h(0, 0.38), h(190, 0.38), h(380, 0.38), h(570, 0.38), h(760, 0.38), h(950, 0.45), h(1450, 0.95, 'unblockable')], 'random2', { belowHp: 0.5, weight: 3 }),
    A('restuff', 'Re-stuff', 'cast', 700, [], 'one', { heal: 0.12, belowHp: 0.35, weight: 1 }),
  ],
  weakPoints: [wp('Straw Heart', 0, -110, 14), wp('Lantern Eyes', -3, -162, 13, 260)],
  drops: [{ item: 'silk_fine', chance: 1 }],
  lore: 'Sewn from a hundred coats the field-folk left behind, it wears every one of their names. The crows say it was a kind scarecrow once. The crows lie.',
});

// =================================================================== Ch2: Lanternmere

E('lantern_wisp', 'Lantern Wisp', 0.75, 7, { hp: 0.8, def: 0.8, spd: 1.05 }, 0, {
  weak: ['light', 'ice'],
  resist: ['dark'],
  absorb: ['fire'],
  flying: true,
  attacks: [
    A('soul_lamp', 'Soul Lamp', 'cast', 820, [h(0, 1.0, 'magic', 'fire', st('burn', 0.5, 3))], 'one', { pattern: 'pat_lantern_wisp_lamp', weight: 3 }),
    A('tendril_lash', 'Tendril Lash', 'swoop', 620, [h(0, 0.5), h(260, 0.5), h(520, 0.5)], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Lantern Core', 0, -96, 11)],
  drops: [{ item: 'ember_vial', chance: 0.08 }],
  lore: 'A drowned light still trying to guide someone home. It forgot who, so it tries everyone.',
});

E('bog_moth', 'Bog Moth', 0.9, 8, { hp: 0.9, spd: 1.05 }, 0, {
  weak: ['fire'],
  resist: ['earth'],
  flying: true,
  attacks: [
    A('eye_dust', 'Eye Dust', 'cast', 900, [h(0, 0.5, 'magic', 'dark', st('weaken', 0.4, 2))], 'all', { pattern: 'pat_bog_moth_dust', weight: 2 }),
    A('wing_buffet', 'Wing Buffet', 'swoop', 720, [h(0, 0.7), h(460, 0.9)], 'one', { weight: 3 }),
    A('bog_dive', 'Bog Dive', 'swoop', 850, [h(0, 1.2, 'unblockable')], 'one', { weight: 1 }),
  ],
  weakPoints: [wp('Eye-Spot', 32, -127, 12)],
  drops: [{ item: 'smelling_salts', chance: 0.12 }],
  lore: 'The eyes on its wings are not painted. They blink when it is pleased.',
});

E('drowned_weaver', 'Drowned Weaver', 1, 8, { hp: 1.1, spd: 0.92 }, 0, {
  weak: ['storm'],
  resist: ['ice', 'fire'],
  attacks: [
    A('wet_wrap', 'Wet Wrap', 'lunge', 820, [h(0, 0.6, 'normal', 'phys', st('slow', 0.35, 2)), h(600, 0.9)], 'one', { weight: 3 }),
    A('drag_under', 'Drag Under', 'slam', 1000, [h(0, 1.3, 'jump', 'ice')], 'one', { weight: 2 }),
    A('weeping_thread', 'Weeping Thread', 'cast', 760, [h(0, 0.45, 'magic', 'ice', st('freeze', 0.15, 1))], 'all', { weight: 1 }),
  ],
  drops: [{ item: 'silk_raw', chance: 0.2 }],
  lore: 'It was weaving a net to catch fish when the water came up. It is still weaving. It has caught a great many things.',
});

E('reedlurker', 'Reedlurker', 0.95, 9, { hp: 0.95, atk: 1.1, spd: 1.2, def: 0.85 }, 0, {
  weak: ['fire'],
  resist: ['storm', 'ice'],
  attacks: [
    A('reed_ambush', 'Reed Ambush', 'lunge', 480, [h(0, 1.2)], 'one', { pattern: 'pat_reedlurker_ambush', weight: 3 }),
    A('whipping_reeds', 'Whipping Reeds', 'sweep', 820, [h(0, 0.5), h(200, 0.5), h(400, 0.6)], 'all', { weight: 2 }),
    A('cattail_spores', 'Cattail Spores', 'cast', 900, [h(0, 0.7, 'magic', 'earth', st('slow', 0.45, 2))], 'one', { weight: 1 }),
  ],
  weakPoints: [wp('Cattail', -4, -178, 12)],
  drops: [{ item: 'silk_fine', chance: 0.08 }],
  lore: 'Stand still in Lanternmere and one of the reeds will be standing a little closer than it was.',
});

E('drowned_lamplighter', 'The Drowned Lamplighter', 1.9, 10, { hp: 1.05, spd: 0.95 }, 8, {
  weak: ['light', 'storm'],
  resist: ['ice', 'dark'],
  immune: ['freeze'],
  attacks: [
    A('lantern_swing', 'Lantern Swing', 'sweep', 900, [h(0, 0.7, 'normal', 'fire'), h(460, 0.7, 'normal', 'fire'), h(1220, 1.2, 'normal', 'fire', st('burn', 0.5, 3))], 'one', { weight: 3 }),
    A('lamppost', 'Lamppost', 'slam', 1000, [h(0, 1.0, 'jump')], 'all', { weight: 2 }),
    A('light_the_way', 'Light the Way', 'cast', 1050, [...run(0, 300, 5, 0.38, 'magic', 'light'), h(1700, 0.8, 'magic', 'light')], 'all', { weight: 2 }),
    A('undertow', 'Undertow', 'cast', 1100, [h(0, 0.6, 'unblockable', 'ice'), h(520, 0.6, 'unblockable', 'ice'), h(860, 1.0, 'jump', 'ice')], 'random2', { belowHp: 0.5, weight: 3 }),
    A('relight', 'Relight', 'cast', 700, [], 'one', { heal: 0.1, belowHp: 0.3, weight: 1 }),
  ],
  weakPoints: [wp('Soul Lantern', -92, -160, 13, 420), wp('Soul Lantern', -66, -128, 11, 420)],
  drops: [{ item: 'silk_fine', chance: 1 }],
  lore: 'He drowned lighting the marsh lanterns so the boats could find their way home. Every night since, he lights one more, for one more soul he couldn’t save.',
});

// =================================================================== Ch3: Cindermill

E('spindle_drone', 'Spindle Drone', 0.75, 11, { hp: 0.7, def: 0.9, spd: 1.25 }, 0, {
  weak: ['storm', 'earth'],
  resist: ['phys'],
  flying: true,
  attacks: [
    A('whirl_cut', 'Whirl Cut', 'spin', 620, run(0, 190, 4, 0.4), 'one', { pattern: 'pat_spindle_drone_whirl', weight: 3 }),
    A('thread_shot', 'Thread Shot', 'shoot', 720, [h(0, 0.9, 'normal', 'thread', st('slow', 0.35, 2))], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Whorl Eye', 0, -77, 9)],
  drops: [{ item: 'silk_fine', chance: 0.12 }],
  lore: 'The Choir built them to spin faster than hands. They spin people now, if people stand too close.',
});

E('shear_acolyte', 'Shear Acolyte', 1, 11, { def: 1.1 }, 0, {
  weak: ['dark'],
  resist: ['phys', 'light'],
  attacks: [
    A('snip', 'Snip', 'lunge', 700, [h(0, 0.8), h(300, 0.8)], 'one', { weight: 3 }),
    A('judgement', 'Judgement', 'slam', 1050, [h(0, 1.4, 'unblockable')], 'one', { weight: 2 }),
    A('choir_chant', 'Choir Chant', 'cast', 800, [], 'one', { selfStatus: { id: 'empower', turns: 2 }, weight: 1 }),
  ],
  drops: [{ item: 'silk_fine', chance: 0.12 }],
  lore: 'The Choir’s scissors. They are taught that a cut is a kindness, done properly, and that hesitation is the only sin.',
});

E('cinder_bobbin', 'Cinder Bobbin', 1.15, 12, { hp: 1.3, def: 1.3, spd: 0.8 }, 0, {
  weak: ['ice'],
  resist: ['earth'],
  absorb: ['fire'],
  immune: ['burn'],
  attacks: [
    A('slag_spill', 'Slag Spill', 'slam', 920, [h(0, 0.6, 'jump', 'fire', st('burn', 0.4, 3)), h(520, 0.6, 'jump', 'fire')], 'all', { pattern: 'pat_cinder_bobbin_slag', weight: 2 }),
    A('furnace_punch', 'Furnace Punch', 'lunge', 820, [h(0, 0.7, 'normal', 'fire'), h(620, 1.1, 'normal', 'fire')], 'one', { weight: 3 }),
    A('stoke', 'Stoke', 'cast', 600, [], 'one', { selfStatus: { id: 'empower', turns: 2 }, weight: 1 }),
  ],
  weakPoints: [wp('Furnace Grate', 0, -75, 15)],
  drops: [{ item: 'ember_vial', chance: 0.15 }],
  lore: 'A mill bobbin that fell into the furnace and came out with opinions. The yarn on it is still molten.',
});

E('loomhound', 'Loomhound', 0.9, 12, { spd: 1.25, def: 1.1 }, 0, {
  weak: ['storm'],
  resist: ['phys'],
  attacks: [
    A('gear_bite', 'Gear Bite', 'lunge', 560, [h(0, 0.6), h(200, 0.6), h(400, 0.8)], 'one', { weight: 3 }),
    A('spring_pounce', 'Spring Pounce', 'swoop', 900, [h(0, 1.2)], 'one', { weight: 2 }),
    A('alarm_bark', 'Alarm Bark', 'roar', 720, [h(0, 0.4, 'magic', 'storm', st('shock', 0.3, 2))], 'all', { weight: 1 }),
  ],
  weakPoints: [wp('Mainspring', 18, -62, 11)],
  drops: [{ item: 'silk_fine', chance: 0.1 }],
  lore: 'Brass dogs that patrol the mill at night. Wind them up and they never stop guarding anything again.',
});

E('rook_duel', 'Rook Ardent', 1, 12, { spd: 1.25, atk: 1.05 }, 4, {
  weak: [],
  resist: [],
  attacks: [
    A('quickdraw', 'Quickdraw', 'shoot', 480, [h(0, 0.85)], 'one', { weight: 3 }),
    A('fan_the_hammer', 'Fan the Hammer', 'shoot', 820, [h(0, 0.45), h(190, 0.45), h(380, 0.45), h(570, 0.45), h(1080, 0.8)], 'one', { weight: 3 }),
    A('heat_round', 'Heat Round', 'shoot', 1000, [h(0, 1.3, 'unblockable', 'fire', st('burn', 0.5, 2))], 'one', { weight: 1 }),
  ],
  lore: 'A man who moves like he’s been ambushed before and didn’t like it. He keeps glancing at your hands. No: at your thimble.',
}, 'party:rook');

E('foreman_gristle', 'Foreman Gristle', 2.1, 13, { hp: 1.15, def: 1.2, spd: 0.85 }, 8, {
  weak: ['storm', 'ice'],
  resist: ['phys', 'fire'],
  immune: ['burn', 'bleed'],
  attacks: [
    A('spinning_arms', 'Spinning Arms', 'spin', 950, [...run(0, 200, 5, 0.42), h(1320, 0.9)], 'all', { weight: 3 }),
    A('mill_press', 'Mill Press', 'slam', 1100, [h(0, 1.6, 'jump')], 'one', { weight: 2 }),
    A('yarn_cannon', 'Yarn Cannon', 'shoot', 900, [h(0, 0.8, 'normal', 'thread', st('slow', 0.4, 2)), h(520, 0.8, 'normal', 'thread')], 'random2', { weight: 2 }),
    A('overdrive', 'Overdrive', 'spin', 820, [...run(0, 190, 6, 0.36), h(1480, 1.2, 'unblockable')], 'all', { belowHp: 0.5, weight: 3 }),
    A('vent', 'Vent Steam', 'cast', 650, [], 'one', { selfStatus: { id: 'haste', turns: 3 }, belowHp: 0.4, weight: 1 }),
  ],
  weakPoints: [wp('Pressure Valve', -50, -150, 12, 700), wp('Spinning Core', 0, -90, 20)],
  drops: [{ item: 'silk_fine', chance: 1 }],
  lore: 'The Choir’s finest mill. It spins the spare thread out of people into fate-yarn, a little at a time, so they barely notice. It has a quota.',
});

// =================================================================== Ch4: The Selvage

E('seamharpy', 'Seamharpy', 1.1, 14, { hp: 0.9, spd: 1.15 }, 0, {
  weak: ['storm'],
  resist: ['earth'],
  flying: true,
  attacks: [
    A('talon_dive', 'Talon Dive', 'swoop', 720, [h(0, 0.6), h(260, 0.6), h(760, 1.0)], 'one', { weight: 3 }),
    A('porcelain_shriek', 'Porcelain Shriek', 'roar', 900, [h(0, 0.6, 'magic', 'thread', st('silence', 0.25, 2))], 'all', { weight: 2 }),
  ],
  weakPoints: [wp('Porcelain Mask', -28, -108, 13, 320)],
  drops: [{ item: 'silk_fine', chance: 0.12 }],
  lore: 'Birds of the cliff winds that found the Choir’s discarded masks and decided they liked having faces.',
});

E('gale_shroud', 'Gale Shroud', 0.9, 14, { hp: 0.9, def: 0.9, spd: 1.1 }, 0, {
  weak: ['fire'],
  resist: ['ice', 'phys'],
  flying: true,
  attacks: [
    A('gale_wrap', 'Gale Wrap', 'cast', 820, [h(0, 0.9, 'magic', 'ice', st('slow', 0.45, 2))], 'one', { pattern: 'pat_gale_shroud_wrap', weight: 3 }),
    A('billow', 'Billow', 'sweep', 700, [h(0, 0.5), h(320, 0.5)], 'all', { weight: 2 }),
    A('smother', 'Smother', 'lunge', 1000, [h(0, 0.4), h(420, 0.4), h(900, 1.1, 'unblockable')], 'one', { weight: 1 }),
  ],
  drops: [{ item: 'frost_vial', chance: 0.12 }],
  lore: 'Washing blown off a line at the edge of the world. The wind out here is full of loose fate, and some of it stuck.',
});

E('selvage_sentinel', 'Selvage Sentinel', 1.3, 15, { hp: 1.5, def: 1.5, spd: 0.75, atk: 1.1 }, 0, {
  weak: ['fire', 'storm'],
  resist: ['phys', 'earth'],
  immune: ['bleed'],
  attacks: [
    A('bedrock_slam', 'Bedrock Slam', 'slam', 1000, [h(0, 0.85, 'jump', 'earth'), h(500, 0.85, 'jump', 'earth'), h(1000, 0.85, 'jump', 'earth')], 'all', { pattern: 'pat_selvage_sentinel_slam', weight: 2 }),
    A('stone_fist', 'Stone Fist', 'lunge', 900, [h(0, 1.5)], 'one', { weight: 3 }),
    A('rune_ward', 'Rune Ward', 'cast', 700, [], 'one', { selfStatus: { id: 'shield', turns: 3, stacks: 3 }, weight: 1 }),
  ],
  weakPoints: [wp('Binding Rune', 0, -130, 13)],
  drops: [{ item: 'silk_fine', chance: 0.25 }],
  lore: 'The first Menders bound these stones with thread to hold the edge of the world in place. They still hold it, from anyone.',
});

E('tess_1', 'Tess Quill', 1, 16, { spd: 1.2, atk: 1.05 }, 6, {
  weak: [],
  resist: [],
  attacks: [
    A('twin_cut', 'Twin Cut', 'lunge', 620, [h(0, 0.6), h(200, 0.6)], 'one', { weight: 3 }),
    A('needlework_flurry', 'Needlework Flurry', 'lunge', 900, [...run(0, 180, 5, 0.38), h(1180, 0.9)], 'one', { weight: 3 }),
    A('scissor_rite', 'Scissor Rite', 'slam', 1100, [h(0, 1.6, 'unblockable')], 'one', { weight: 1 }),
    A('penance', 'Penance', 'cast', 600, [], 'one', { selfStatus: { id: 'empower', turns: 3 }, belowHp: 0.6, weight: 1 }),
  ],
  lore: 'She knows every move you know. Orrin taught her first. She keeps looking at Corin like she’s about to say something, and then she doesn’t.',
}, 'party:tess');

E('orrin_1', 'Orrin Thale', 1, 18, { def: 1.2, atk: 1.15, spd: 1.05 }, 8, {
  weak: [],
  resist: ['thread'],
  attacks: [
    A('measure_twice', 'Measure Twice', 'lunge', 820, [h(0, 0.8), h(880, 1.2)], 'one', { weight: 3 }),
    A('a_lesson', 'A Lesson', 'lunge', 720, [...run(0, 200, 4, 0.5), h(1120, 1.0)], 'one', { weight: 3 }),
    A('snap', 'Snap', 'slam', 1000, [h(0, 1.0, 'magic', 'thread'), h(420, 1.0, 'magic', 'thread')], 'all', { weight: 2 }),
    A('wind_tension', 'Wind the Tension', 'cast', 650, [], 'one', { selfStatus: { id: 'empower', turns: 2 }, weight: 1 }),
  ],
  lore: 'Your teacher. He is not trying very hard. That is the worst part.',
}, 'party:orrin');

// =================================================================== Ch5: The Frayed Expanse

E('echo_villager', 'Echo', 1, 17, { hp: 0.9, def: 0.9 }, 0, {
  weak: ['light'],
  resist: ['phys', 'dark'],
  attacks: [
    A('remembered_blow', 'Remembered Blow', 'lunge', 720, [h(0, 0.9)], 'one', { weight: 3 }),
    A('lament', 'Lament', 'cast', 900, [h(0, 0.5, 'magic', 'dark', st('weaken', 0.3, 2))], 'all', { weight: 2 }),
    A('again_again', 'Again, Again', 'lunge', 620, [h(0, 0.5), h(420, 0.5), h(840, 0.5)], 'one', { weight: 2 }),
  ],
  drops: [{ item: 'memory_spool', chance: 0.04 }],
  lore: 'A woman carrying apples home on the last ordinary afternoon of her village. She has been carrying them for three years.',
});

E('unwoven_moth', 'Unwoven Moth', 1, 18, { hp: 0.85, spd: 1.12 }, 0, {
  weak: ['fire'],
  resist: ['thread'],
  flying: true,
  attacks: [
    A('torn_wing', 'Torn Wing', 'swoop', 700, [h(0, 0.6), h(320, 0.8)], 'one', { weight: 3 }),
    A('pale_dust', 'Pale Dust', 'cast', 900, [h(0, 0.5, 'magic', 'thread', st('expose', 0.3, 2))], 'all', { weight: 2 }),
    A('unravel_dive', 'Unravel Dive', 'swoop', 1000, [h(0, 1.3, 'unblockable', 'thread')], 'one', { weight: 1 }),
  ],
  weakPoints: [wp('Eye-Spot', 32, -127, 12)],
  drops: [{ item: 'silk_fine', chance: 0.15 }],
  lore: 'Half a moth, finished in loose thread. It flies anyway. Wick says it isn’t angry, only cold.',
});

E('knot', 'Knot', 1.3, 19, { hp: 1.4, def: 1.25, spd: 0.85 }, 0, {
  weak: ['fire'],
  resist: ['phys', 'thread'],
  attacks: [
    A('many_eyes', 'Many Eyes', 'cast', 1000, [h(0, 0.6, 'magic', 'dark', st('expose', 0.4, 2))], 'all', { pattern: 'pat_knot_eyes', weight: 2 }),
    A('tangle_crush', 'Tangle Crush', 'slam', 920, [h(0, 0.7, 'jump'), h(420, 0.7, 'jump'), h(840, 1.0)], 'one', { weight: 3 }),
    A('lashing_loops', 'Lashing Loops', 'sweep', 720, [h(0, 0.5), h(260, 0.5), h(520, 0.5)], 'random2', { weight: 2 }),
  ],
  weakPoints: [wp('Central Eye', -15, -59, 12), wp('Upper Eye', 19, -87, 8, 500)],
  drops: [{ item: 'silk_gilded', chance: 0.05 }],
  lore: 'What happens when a whole street of fates comes loose at once and tangles. Every eye belonged to someone.',
});

E('driftlight', 'Driftlight', 0.8, 18, { hp: 0.75, def: 0.8, spd: 1.1 }, 0, {
  weak: ['dark'],
  resist: ['thread'],
  absorb: ['light'],
  flying: true,
  attacks: [
    A('soft_light', 'Soft Light', 'cast', 750, [], 'one', { heal: 0.2, pattern: 'pat_driftlight_glow', weight: 2 }),
    A('sting', 'Sting', 'swoop', 620, [h(0, 0.6, 'normal', 'storm', st('shock', 0.3, 2)), h(320, 0.6, 'normal', 'storm')], 'one', { weight: 3 }),
    A('flare', 'Flare', 'cast', 820, [h(0, 0.6, 'magic', 'light')], 'all', { weight: 2 }),
  ],
  weakPoints: [wp('Soft Core', 0, -96, 9)],
  drops: [{ item: 'tincture_heal', chance: 0.04 }],
  lore: 'A kindness that came loose from whoever meant it. It mends whatever is near, friend or foe. It cannot tell the difference any more.',
});

E('tess_2', 'Tess Quill', 1, 19, { spd: 1.22, atk: 1.1 }, 4, {
  weak: [],
  resist: [],
  attacks: [
    A('twin_cut', 'Twin Cut', 'lunge', 600, [h(0, 0.6), h(200, 0.6)], 'one', { weight: 2 }),
    A('grief_cut', 'Grief Cut', 'lunge', 950, [h(0, 0.45), h(190, 0.45), h(380, 0.45), h(900, 0.45), h(1100, 1.0)], 'one', { weight: 3 }),
    A('scissor_rite', 'Scissor Rite', 'slam', 1050, [h(0, 1.6, 'unblockable')], 'one', { weight: 2 }),
    A('flee_the_light', 'Blind Them', 'cast', 800, [h(0, 0.5, 'magic', 'dark', st('weaken', 0.4, 2))], 'all', { weight: 1 }),
  ],
  lore: 'She’s crying. She doesn’t seem to know it.',
}, 'party:tess');

E('moth_mother', 'The Moth Mother', 2, 20, { hp: 1.05, spd: 1.0 }, 8, {
  weak: ['fire', 'light'],
  resist: ['dark', 'thread'],
  flying: true,
  attacks: [
    A('the_eyes_open', 'The Eyes Open', 'cast', 1100, [h(0, 0.5, 'magic', 'dark'), h(300, 0.5, 'magic', 'dark'), h(600, 0.5, 'magic', 'dark'), h(1200, 0.9, 'magic', 'dark', st('weaken', 0.4, 2))], 'all', { weight: 3 }),
    A('brood_swarm', 'Brood Swarm', 'swoop', 900, run(0, 180, 6, 0.32), 'random2', { weight: 3 }),
    A('mothers_gale', 'Mother’s Gale', 'sweep', 1000, [h(0, 0.8, 'jump'), h(520, 0.8, 'jump')], 'all', { weight: 2 }),
    A('shelter_the_brood', 'Shelter the Brood', 'cast', 800, [], 'one', { selfStatus: { id: 'shield', turns: 3, stacks: 3 }, summon: 'unwoven_moth', belowHp: 0.5, weight: 1 }),
    A('last_light', 'Last Light', 'cast', 1200, [h(0, 0.6, 'unblockable', 'light'), h(600, 0.6, 'unblockable', 'light'), h(900, 1.2, 'magic', 'light')], 'all', { belowHp: 0.25, weight: 3 }),
  ],
  weakPoints: [wp('Wing Eye', 57, -149, 16, 900), wp('Wing Eye', 88, -156, 12, 900), wp('Heart', 0, -84, 20)],
  drops: [{ item: 'silk_gilded', chance: 1 }],
  lore: 'She gathered every lost light in the Fray and wrapped her wings around them. They are not lost to her. They are hers.',
});

// =================================================================== Ch6: Spindlehold

E('choir_sentinel', 'Choir Sentinel', 1.05, 21, { def: 1.2, hp: 1.05 }, 0, {
  weak: ['earth', 'storm'],
  resist: ['light', 'dark'],
  attacks: [
    A('hymn_strike', 'Hymn Strike', 'lunge', 720, [h(0, 0.7), h(460, 0.9)], 'one', { weight: 3 }),
    A('bell_toll', 'Bell Toll', 'cast', 1000, [h(0, 0.55, 'magic', 'light', st('silence', 0.2, 2)), h(820, 0.6, 'magic', 'light')], 'all', { weight: 2 }),
    A('chorus', 'Chorus', 'cast', 650, [], 'one', { selfStatus: { id: 'shield', turns: 2, stacks: 1 }, weight: 1 }),
  ],
  weakPoints: [wp('Hymn Mask', 0, -146, 14, 520)],
  drops: [{ item: 'silk_gilded', chance: 0.06 }],
  lore: 'They sing the hours in Spindlehold. They have sung the same hymn for four hundred years and they have never once been asked what it means.',
});

E('shear_knight', 'Shear Knight', 1.1, 22, { def: 1.35, hp: 1.2, spd: 0.9 }, 0, {
  weak: ['dark', 'storm'],
  resist: ['phys', 'light'],
  attacks: [
    A('great_snip', 'Great Snip', 'slam', 920, [h(0, 0.9), h(520, 1.3)], 'one', { weight: 3 }),
    A('cleave', 'Cleave', 'sweep', 820, [h(0, 0.8)], 'all', { weight: 2 }),
    A('verdict', 'Verdict', 'lunge', 1100, [h(0, 0.4), h(200, 0.4), h(400, 0.4), h(1000, 1.5, 'unblockable')], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Breastplate', 0, -104, 18, 700)],
  drops: [{ item: 'silk_gilded', chance: 0.08 }],
  lore: 'A Shear who has cut so many threads the Choir gave him armour so he wouldn’t have to feel anything. It works.',
});

E('ledger_pages', 'Ledger Pages', 1, 21, { hp: 0.8, def: 0.85, spd: 1.15 }, 0, {
  weak: ['fire'],
  resist: ['phys'],
  flying: true,
  attacks: [
    A('paper_cuts', 'Paper Cuts', 'swoop', 720, [...run(0, 180, 4, 0.3), h(720, 0.5, 'normal', 'phys', st('bleed', 0.5, 3))], 'one', { pattern: 'pat_ledger_pages_cuts', weight: 3 }),
    A('recorded', 'Recorded', 'cast', 900, [h(0, 0.8, 'magic', 'light', st('marked', 0.6, 2))], 'one', { weight: 2 }),
    A('margin_note', 'Margin Note', 'cast', 600, [], 'one', { selfStatus: { id: 'haste', turns: 2 }, weight: 1 }),
  ],
  weakPoints: [wp('Watching Page', 0, -95, 14)],
  drops: [{ item: 'silk_fine', chance: 0.2 }],
  lore: 'Pages torn from the Ledger of Fates. Each one lists who will die, when, and how. They watch you to see if they got it right.',
});

E('loom_warden', 'Loom Warden', 1.2, 23, { hp: 1.15, def: 1.15 }, 0, {
  weak: ['earth', 'storm'],
  resist: ['light', 'thread'],
  flying: true,
  attacks: [
    A('spear_of_light', 'Spear of Light', 'lunge', 900, [h(0, 1.2, 'normal', 'light')], 'one', { weight: 3 }),
    A('halo_burst', 'Halo Burst', 'cast', 1000, [h(0, 0.6, 'magic', 'light'), h(420, 0.6, 'magic', 'light')], 'all', { weight: 2 }),
    A('wing_cut', 'Wing Cut', 'sweep', 720, [h(0, 0.55), h(260, 0.55), h(520, 0.6)], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Halo', 0, -182, 12)],
  drops: [{ item: 'silk_gilded', chance: 0.08 }],
  lore: 'The Loom’s guardians, porcelain angels with no faces. A face would mean they had to look at what they guard.',
});

const SERAPHINE_LORE = 'Arbiter of the Choir. She believes beauty requires sacrifice, and she has never once been the sacrifice.';
E('seraphine', 'Arbiter Seraphine Vael', 1.6, 24, { hp: 1.05, def: 1.1, spd: 1.05 }, 9, {
  weak: ['dark'],
  resist: ['light', 'thread'],
  immune: ['curse', 'silence'],
  attacks: [
    A('needles_of_judgement', 'Needles of Judgement', 'cast', 1000, run(0, 260, 5, 0.42, 'magic', 'light'), 'random2', { weight: 3 }),
    A('serene_cut', 'Serene Cut', 'lunge', 820, [h(0, 0.8), h(840, 1.2)], 'one', { weight: 3 }),
    A('the_beautiful_pattern', 'The Beautiful Pattern', 'cast', 1100, [h(0, 0.6, 'magic', 'thread'), h(520, 0.6, 'magic', 'thread'), h(1040, 0.85, 'jump', 'thread')], 'all', { weight: 2 }),
    A('prune', 'Prune', 'lunge', 1050, [h(0, 1.6, 'unblockable', 'thread', st('curse', 0.3, 4))], 'one', { weight: 1 }),
  ],
  phases: [{ at: 0.5, to: 'seraphine_2', line: 'You would make the Tapestry ugly. I will not allow it.' }],
  weakPoints: [wp('Porcelain Mask', -2, -168, 12)],
  drops: [{ item: 'silk_gilded', chance: 1 }],
  lore: SERAPHINE_LORE,
});

E('seraphine_2', 'Arbiter Seraphine Vael', 1.6, 24, { hp: 1.05, def: 0.95, spd: 1.15, atk: 1.12 }, 9, {
  weak: ['dark', 'earth'],
  resist: ['light'],
  immune: ['curse', 'silence'],
  attacks: [
    A('shattered_hymn', 'Shattered Hymn', 'cast', 1000, [...run(0, 190, 6, 0.34, 'magic', 'thread'), h(1500, 0.6, 'magic', 'thread'), h(1700, 0.9, 'unblockable', 'thread')], 'all', { weight: 3 }),
    A('cracked_verdict', 'Cracked Verdict', 'slam', 950, [h(0, 0.8, 'jump', 'dark'), h(380, 0.8, 'jump', 'dark'), h(760, 0.8, 'jump', 'dark')], 'all', { weight: 2 }),
    A('unmake', 'Unmake', 'lunge', 1000, [h(0, 0.5), h(240, 0.5), h(960, 1.6, 'unblockable', 'dark', st('curse', 0.35, 3))], 'one', { weight: 2 }),
    A('serene_cut', 'Serene Cut', 'lunge', 700, [h(0, 0.85), h(600, 1.25)], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Cracked Mask', -2, -168, 14)],
  drops: [{ item: 'silk_gilded', chance: 1 }],
  lore: `${SERAPHINE_LORE} The mask has cracked. What looks out is very afraid of being ugly.`,
});

// =================================================================== Ch7: The Seam of Ages

E('seam_crawler', 'Seam Crawler', 0.95, 25, { hp: 0.9, spd: 1.2 }, 0, {
  weak: ['fire'],
  resist: ['thread', 'earth'],
  attacks: [
    A('needle_legs', 'Needle Legs', 'lunge', 600, run(0, 190, 4, 0.48), 'one', { weight: 3 }),
    A('pin_down', 'Pin Down', 'shoot', 820, [h(0, 1.0, 'normal', 'phys', st('slow', 0.45, 2))], 'one', { weight: 2 }),
    A('seam_web', 'Seam Web', 'cast', 900, [h(0, 0.5, 'magic', 'thread', st('slow', 0.35, 2))], 'all', { weight: 1 }),
  ],
  weakPoints: [wp('Pincushion', 0, -58, 16)],
  drops: [{ item: 'silk_gilded', chance: 0.08 }],
  lore: 'Pincushions that crawl along the failing Seams, pulling stitches out one by one. Something taught them that.',
});

E('frayed_knight', 'Frayed Knight', 1.05, 26, { def: 1.2, hp: 1.15 }, 0, {
  weak: ['fire', 'light'],
  resist: ['phys', 'dark'],
  attacks: [
    A('unravelling_slash', 'Unravelling Slash', 'sweep', 820, [h(0, 0.8), h(420, 0.8)], 'one', { weight: 3 }),
    A('broken_oath', 'Broken Oath', 'slam', 1000, [h(0, 1.0, 'jump')], 'all', { weight: 2 }),
    A('last_charge', 'Last Charge', 'lunge', 900, [h(0, 0.5), h(300, 0.5), h(920, 1.3)], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Breach', 8, -96, 9)],
  drops: [{ item: 'silk_gilded', chance: 0.08 }],
  lore: 'A Mender’s armour, walking without the Mender. The thread that pours out of the breach is still the colour of his coat.',
});

E('storm_crow', 'Storm Crow', 0.7, 25, { hp: 0.75, spd: 1.3, def: 0.8 }, 0, {
  weak: ['earth'],
  resist: ['ice'],
  absorb: ['storm'],
  immune: ['shock'],
  flying: true,
  attacks: [
    A('thunder_dive', 'Thunder Dive', 'swoop', 720, [h(0, 1.1, 'normal', 'storm', st('shock', 0.4, 2))], 'one', { pattern: 'pat_storm_crow_dive', weight: 3 }),
    A('static_flock', 'Static Flock', 'cast', 900, [h(0, 0.4, 'magic', 'storm'), h(260, 0.4, 'magic', 'storm')], 'all', { weight: 2 }),
  ],
  weakPoints: [wp('Button Eye', -27, -84, 7)],
  drops: [{ item: 'storm_vial', chance: 0.15 }],
  lore: 'Stitchcrows that flew too close to the Seam storm. Their buttons crackle now.',
});

E('seam_eater', 'The Seam-Eater', 2.7, 27, { hp: 1.15, def: 1.1 }, 9, {
  weak: ['fire', 'light'],
  resist: ['thread', 'phys'],
  immune: ['freeze'],
  attacks: [
    A('coil_crush', 'Coil Crush', 'slam', 1000, [h(0, 0.7, 'jump'), h(420, 0.7, 'jump'), h(840, 1.1, 'jump')], 'all', { weight: 3 }),
    A('devour_the_seam', 'Devour the Seam', 'lunge', 1100, [h(0, 1.8, 'unblockable')], 'one', { weight: 2 }),
    A('cloth_storm', 'Cloth Storm', 'sweep', 920, run(0, 200, 6, 0.32), 'all', { weight: 2 }),
    A('tail_lash', 'Tail Lash', 'sweep', 720, [h(0, 0.7), h(560, 0.9)], 'random2', { weight: 2 }),
    A('swallow_the_light', 'Swallow the Light', 'cast', 1200, [h(0, 0.4, 'magic', 'dark'), h(220, 0.4, 'magic', 'dark'), h(440, 0.4, 'magic', 'dark'), h(660, 0.4, 'jump', 'dark'), h(1100, 0.4, 'magic', 'dark'), h(1320, 0.5, 'magic', 'dark'), h(1900, 1.2, 'unblockable', 'dark')], 'all', { belowHp: 0.4, weight: 3 }),
  ],
  weakPoints: [wp('Stitched Maw', -94, -110, 14), wp('Torn Seam', 20, -56, 16, 1500)],
  drops: [{ item: 'silk_gilded', chance: 1 }],
  lore: 'It is made of everything the Tear has eaten: curtains, sails, wedding veils, the flags of three kingdoms. It is still hungry. It is always still hungry.',
});

// =================================================================== Ch8: The Underweave

E('lost_thread', 'Lost Thread', 0.85, 28, { hp: 0.75, def: 0.85, spd: 1.15 }, 0, {
  weak: ['light'],
  resist: ['dark', 'thread'],
  flying: true,
  attacks: [
    A('fading_touch', 'Fading Touch', 'lunge', 720, [h(0, 0.8, 'magic', 'thread', st('weaken', 0.35, 2))], 'one', { weight: 3 }),
    A('drift', 'Drift', 'swoop', 620, [h(0, 0.5), h(420, 0.5)], 'one', { weight: 2 }),
  ],
  drops: [{ item: 'memory_spool', chance: 0.05 }],
  lore: 'A life that was cut. It drifts down here with the others, glowing a little less each year, still looking for the rest of itself.',
});

E('grief_knot', 'Grief Knot', 1.3, 30, { hp: 1.4, def: 1.2, spd: 0.85 }, 0, {
  weak: ['fire', 'light'],
  resist: ['ice', 'thread'],
  attacks: [
    A('sorrow_bind', 'Sorrow Bind', 'cast', 900, [h(0, 1.0, 'magic', 'ice', st('freeze', 0.4, 1))], 'one', { pattern: 'pat_grief_knot_bind', weight: 2 }),
    A('heavy_heart', 'Heavy Heart', 'slam', 1000, [h(0, 0.9, 'jump', 'ice'), h(600, 0.9, 'jump', 'ice')], 'all', { weight: 2 }),
    A('weep', 'Weep', 'cast', 820, run(0, 300, 3, 0.48, 'magic', 'ice'), 'all', { weight: 2 }),
  ],
  weakPoints: [wp('Central Eye', -16, -61, 12)],
  drops: [{ item: 'silk_star', chance: 0.04 }],
  lore: 'All the goodbyes nobody got to say, knotted together at the bottom of the world.',
});

E('hollow_mender', 'Hollow Mender', 1, 30, { spd: 1.1 }, 0, {
  weak: ['light'],
  resist: ['phys', 'dark'],
  attacks: [
    A('ghost_needle', 'Ghost Needle', 'lunge', 720, [...run(0, 200, 3, 0.5), h(820, 0.8)], 'one', { weight: 3 }),
    A('unstitch', 'Unstitch', 'cast', 920, [h(0, 1.2, 'unblockable', 'thread')], 'one', { weight: 2 }),
    A('mend_self', 'Mend Self', 'cast', 700, [], 'one', { heal: 0.15, weight: 1 }),
  ],
  drops: [{ item: 'silk_gilded', chance: 0.1 }],
  lore: 'A Mender who died mid-stitch. He is still trying to finish it. He thinks you are the hole.',
});

E('unfated_ash', 'Unfated Ash', 1, 32, { spd: 1.15, atk: 1.1, def: 1.05 }, 8, {
  weak: ['light'],
  resist: ['dark', 'thread'],
  immune: ['curse'],
  attacks: [
    A('mirror_stitch', 'Mirror Stitch', 'lunge', 700, run(0, 200, 4, 0.48), 'one', { weight: 3 }),
    A('pull_taut', 'Pull Taut', 'lunge', 1050, [h(0, 1.8, 'unblockable', 'thread')], 'one', { weight: 2 }),
    A('what_you_were', 'What You Were', 'cast', 1000, run(0, 400, 3, 0.6, 'magic', 'dark'), 'all', { weight: 2 }),
    A('unfated_flurry', 'Unfated Flurry', 'lunge', 900, [...run(0, 180, 6, 0.32), h(1500, 0.6), h(1700, 1.1, 'unblockable', 'dark')], 'one', { belowHp: 0.5, weight: 3 }),
  ],
  lore: 'The Ash who died at six, grown up into everything fate wanted for her. She is very tired. She would like you to stop.',
}, 'party:ash');

// =================================================================== Ch9: The Loomspire

E('loomhand', 'Loomhand', 1.3, 33, { hp: 1.1, spd: 1.05 }, 0, {
  weak: ['dark'],
  resist: ['light', 'thread'],
  flying: true,
  attacks: [
    A('needle_fingers', 'Needle Fingers', 'lunge', 820, [...run(0, 190, 4, 0.4), h(1000, 0.7)], 'one', { weight: 3 }),
    A('grasp', 'Grasp', 'slam', 1000, [h(0, 1.4, 'jump')], 'one', { weight: 2 }),
    A('pinch', 'Pinch', 'lunge', 920, [h(0, 1.6, 'unblockable')], 'one', { weight: 1 }),
  ],
  weakPoints: [wp('Palm Eye', -4, -90, 10)],
  drops: [{ item: 'silk_star', chance: 0.06 }],
  lore: 'One of the Loom’s own hands. It has woven ten thousand lives. It is very gentle with the thread and not at all gentle with you.',
});

E('choir_seraph', 'Choir Seraph', 1.3, 34, { hp: 1.15, def: 1.1 }, 0, {
  weak: ['earth', 'dark'],
  resist: ['light'],
  flying: true,
  attacks: [
    A('gilded_hymn', 'Gilded Hymn', 'cast', 1000, run(0, 500, 3, 0.55, 'magic', 'light'), 'all', { weight: 3 }),
    A('seraph_spear', 'Seraph Spear', 'lunge', 820, [h(0, 1.2, 'normal', 'light')], 'one', { weight: 3 }),
    A('anthem', 'Anthem', 'cast', 700, [], 'one', { selfStatus: { id: 'empower', turns: 2 }, weight: 1 }),
  ],
  weakPoints: [wp('Halo', 0, -182, 13)],
  drops: [{ item: 'silk_star', chance: 0.06 }],
  lore: 'The last of the Choir’s singers, gilded and winged. They sing the Loom to sleep each night. They have never heard it wake.',
});

E('fate_spinner', 'Fate Spinner', 1.2, 35, { hp: 1.25, def: 1.15, spd: 0.9 }, 0, {
  weak: ['storm', 'earth'],
  resist: ['thread', 'light'],
  attacks: [
    A('spin_fate', 'Spin Fate', 'spin', 900, [...run(0, 200, 4, 0.4, 'normal', 'thread'), h(1000, 0.8, 'normal', 'thread')], 'one', { pattern: 'pat_fate_spinner_spin', weight: 3 }),
    A('measured_end', 'Measured End', 'cast', 1100, [h(0, 1.0, 'magic', 'thread', st('curse', 0.25, 4))], 'one', { weight: 1 }),
    A('wheel_roll', 'Wheel Roll', 'slam', 920, [h(0, 1.0, 'jump')], 'all', { weight: 2 }),
  ],
  weakPoints: [wp('Spindle', -52, -106, 12)],
  drops: [{ item: 'silk_star', chance: 0.08 }],
  lore: 'It spins the thread that becomes a life. It does not know what a life is. It only knows how long.',
});

const ORRIN_LORE = 'Orrin Thale. Your teacher. The man who taught you to hold a needle, and who tore the world.';
E('orrin_final', 'Orrin, the Mentor', 1, 38, { def: 1.15, atk: 1.1, spd: 1.08 }, 10, {
  weak: [],
  resist: ['thread'],
  immune: ['curse'],
  attacks: [
    A('measure_twice', 'Measure Twice', 'lunge', 820, [h(0, 0.8), h(880, 1.25)], 'one', { weight: 3 }),
    A('old_lesson', 'The Old Lesson', 'lunge', 800, [...run(0, 200, 5, 0.42), h(1500, 1.1)], 'one', { weight: 3 }),
    A('cut_never', 'Cut Never', 'slam', 1000, [h(0, 0.9, 'magic', 'thread'), h(440, 0.9, 'magic', 'thread')], 'all', { weight: 2 }),
    A('tension', 'Wind the Tension', 'cast', 650, [], 'one', { selfStatus: { id: 'empower', turns: 2 }, weight: 1 }),
  ],
  phases: [{ at: 0.66, to: 'orrin_final_2', line: 'You hold the needle exactly like I taught you. I’m so proud of you, Ash. I’m so sorry.' }],
  lore: ORRIN_LORE,
}, 'party:orrin');

E('orrin_final_2', 'Orrin, the Father', 1, 38, { def: 1.1, atk: 1.15, spd: 1.12 }, 10, {
  weak: [],
  resist: ['thread', 'ice'],
  immune: ['curse'],
  attacks: [
    A('lios_rain', 'Lio’s Rain', 'cast', 1050, [...run(0, 220, 5, 0.36, 'magic', 'ice'), h(1500, 0.7, 'magic', 'ice', st('freeze', 0.3, 1))], 'all', { weight: 3 }),
    A('drowning_day', 'The Drowning Day', 'lunge', 1100, [h(0, 0.5), h(1000, 1.7, 'unblockable', 'ice')], 'one', { weight: 2 }),
    A('snap', 'Snap', 'slam', 950, [h(0, 1.0, 'jump', 'thread'), h(420, 1.0, 'jump', 'thread')], 'all', { weight: 2 }),
    A('lullaby', 'The Lullaby', 'cast', 900, [h(0, 0.5, 'magic', 'dark', st('weaken', 0.5, 2)), h(600, 0.5, 'magic', 'dark'), h(1200, 0.5, 'magic', 'dark')], 'all', { weight: 2 }),
  ],
  phases: [{ at: 0.33, to: 'orrin_final_3', line: 'She was seven. It was written. I read it every night for a year and I could not change one stitch.' }],
  lore: `${ORRIN_LORE} He is fighting for his daughter now.`,
}, 'party:orrin');

E('orrin_final_3', 'Orrin, the Tear', 1, 38, { def: 1.05, atk: 1.22, spd: 1.16 }, 10, {
  weak: ['light'],
  resist: ['thread'],
  immune: ['curse'],
  attacks: [
    A('open_the_tear', 'Open the Tear', 'cast', 1100, [...run(0, 190, 6, 0.34, 'magic', 'thread'), h(1500, 0.6, 'jump', 'thread'), h(1900, 1.1, 'unblockable', 'thread')], 'all', { weight: 3 }),
    A('unmake', 'Unmake', 'slam', 1000, [h(0, 0.85, 'jump'), h(420, 0.85, 'jump'), h(840, 0.85, 'jump')], 'all', { weight: 2 }),
    A('final_snap', 'Final Snap', 'lunge', 1100, [h(0, 0.45), h(220, 0.45), h(440, 0.45), h(1200, 1.9, 'unblockable')], 'one', { weight: 2 }),
    A('measure_twice', 'Measure Twice', 'lunge', 700, [h(0, 0.85), h(760, 1.3)], 'one', { weight: 2 }),
  ],
  lore: `${ORRIN_LORE} There is nothing left of him but the cut.`,
}, 'party:orrin');

const WEAVER_LORE = 'The Loom, awake. Not cruel: vast, and sorrowful, and certain that without pattern everything you love comes apart.';
E('weaver', 'The Weaver', 2.3, 40, { hp: 1.1, def: 1.15 }, 10, {
  weak: ['dark'],
  resist: ['light', 'thread'],
  immune: ['curse', 'freeze', 'stun'],
  flying: true,
  attacks: [
    A('weft_and_warp', 'Weft and Warp', 'cast', 1050, [...run(0, 210, 5, 0.38, 'magic', 'thread'), h(1500, 0.8, 'magic', 'thread')], 'all', { weight: 3 }),
    A('needle_rain', 'Needle Rain', 'cast', 950, run(0, 240, 5, 0.4, 'normal', 'light'), 'random2', { weight: 3 }),
    A('pattern_lock', 'Pattern Lock', 'cast', 900, [h(0, 0.6, 'magic', 'thread', st('slow', 0.6, 2))], 'all', { weight: 1 }),
  ],
  phases: [{ at: 0.66, to: 'weaver_2', line: 'Little unfated thing. I wove the sky you were born under. I wove the hand that holds that blade.' }],
  weakPoints: [wp('Third Eye', 0, -132, 8)],
  lore: WEAVER_LORE,
});

E('weaver_2', 'The Weaver', 2.3, 40, { hp: 1.1, def: 1.1, atk: 1.08, spd: 1.05 }, 10, {
  weak: ['dark'],
  resist: ['light'],
  immune: ['curse', 'freeze', 'stun'],
  flying: true,
  attacks: [
    A('many_hands', 'Many Hands', 'lunge', 1000, [...run(0, 190, 7, 0.32), h(1700, 0.9)], 'random2', { weight: 3 }),
    A('shears_of_heaven', 'Shears of Heaven', 'slam', 1100, [h(0, 0.5), h(1000, 1.8, 'unblockable', 'light')], 'one', { weight: 2 }),
    A('loom_song', 'Loom Song', 'cast', 900, [], 'one', { heal: 0.08, selfStatus: { id: 'regen', turns: 3 }, weight: 1 }),
    A('weft_and_warp', 'Weft and Warp', 'cast', 950, [...run(0, 210, 5, 0.38, 'magic', 'thread'), h(1500, 0.8, 'jump', 'thread')], 'all', { weight: 2 }),
  ],
  phases: [{ at: 0.33, to: 'weaver_3', line: 'Then let it all come apart. Let you see what you chose.' }],
  weakPoints: [wp('Third Eye', 0, -132, 8), wp('Loom Heart', 0, -70, 12, 4000)],
  lore: `${WEAVER_LORE} Its halo is coming apart.`,
});

E('weaver_3', 'The Weaver, Unweaving', 2.3, 40, { hp: 1.1, def: 1.0, atk: 1.15, spd: 1.12 }, 10, {
  weak: ['dark', 'thread'],
  resist: ['light'],
  immune: ['curse', 'freeze', 'stun'],
  flying: true,
  attacks: [
    A('unweave', 'Unweave', 'slam', 1050, [h(0, 0.8, 'jump', 'thread'), h(400, 0.8, 'jump', 'thread'), h(800, 0.8, 'jump', 'thread'), h(1300, 1.0, 'jump', 'thread')], 'all', { weight: 3 }),
    A('the_last_pattern', 'The Last Pattern', 'cast', 1100, [...run(0, 180, 6, 0.32, 'magic', 'light'), h(1400, 0.6, 'magic', 'light'), h(1900, 1.3, 'unblockable', 'light')], 'all', { weight: 3 }),
    A('starless', 'Starless', 'lunge', 1100, [h(0, 2.0, 'unblockable', 'dark', st('silence', 0.4, 2))], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Third Eye', 0, -132, 9), wp('Loom Heart', 0, -70, 14)],
  lore: `${WEAVER_LORE} It is unweaving itself, thread by thread, and it is singing as it goes.`,
});

// =================================================================== optional

E('bobbin_mimic', 'Bobbin Mimic', 1, 10, { hp: 1.2, atk: 1.15, def: 1.2, spd: 1.1 }, 0, {
  weak: ['storm'],
  resist: ['phys'],
  attacks: [
    A('chomp', 'Chomp', 'lunge', 520, [h(0, 0.8), h(260, 0.8)], 'one', { weight: 3 }),
    A('spit_glim', 'Spit Glim', 'shoot', 720, run(0, 200, 3, 0.5), 'random2', { weight: 2 }),
    A('lid_slam', 'Lid Slam', 'slam', 900, [h(0, 1.3, 'jump')], 'one', { weight: 2 }),
  ],
  weakPoints: [wp('Peeking Eye', -14, -62, 8)],
  drops: [{ item: 'p_bobbins_purse', chance: 1 }, { item: 'silk_fine', chance: 0.5 }],
  lore: 'The Bobbins swear it’s a cousin. “Just a very hungry cousin.”',
});

E('grandmother_spool', 'Grandmother Spool', 2, 14, { hp: 1.1, def: 1.2, spd: 0.9 }, 8, {
  weak: ['storm', 'fire'],
  resist: ['thread', 'phys'],
  attacks: [
    A('click_clack', 'Click-Clack', 'lunge', 820, [...run(0, 190, 5, 0.38), h(1250, 0.8)], 'one', { weight: 3 }),
    A('ball_of_yarn', 'Ball of Yarn', 'slam', 920, [h(0, 0.8, 'jump'), h(520, 0.8, 'jump')], 'all', { weight: 2 }),
    A('a_good_scolding', 'A Good Scolding', 'roar', 900, [h(0, 0.6, 'magic', 'thread', st('weaken', 0.5, 2))], 'all', { weight: 2 }),
    A('tea_time', 'Tea Time', 'cast', 700, [], 'one', { heal: 0.15, belowHp: 0.4, weight: 1 }),
  ],
  weakPoints: [wp('Yarn Bun', 4, -176, 14, 900), wp('Spectacles', -4, -142, 11)],
  drops: [{ item: 'p_grandmothers_knot', chance: 1 }, { item: 'silk_fine', chance: 1 }],
  lore: 'The oldest Bobbin, who wound the first Bobbins out of spare thread when the world was young. She is not angry. She is disappointed.',
});

E('glass_choir', 'The Glass Choir', 2.1, 28, { hp: 1.05, def: 0.9, spd: 1.05 }, 8, {
  weak: ['phys', 'earth'],
  resist: ['thread'],
  absorb: ['light'],
  attacks: [
    A('shatter_note', 'Shatter Note', 'cast', 1000, run(0, 260, 5, 0.42, 'magic', 'light'), 'all', { weight: 3 }),
    A('glass_rain', 'Glass Rain', 'cast', 900, [h(0, 0.7, 'jump'), h(400, 0.7, 'jump'), h(800, 0.7)], 'random2', { weight: 2 }),
    A('harmony', 'Harmony', 'cast', 750, [], 'one', { heal: 0.1, selfStatus: { id: 'shield', turns: 2, stacks: 2 }, weight: 1 }),
    A('crescendo', 'Crescendo', 'cast', 1150, [...run(0, 180, 6, 0.3, 'magic', 'light'), h(1400, 0.6, 'magic', 'light'), h(1900, 1.2, 'unblockable', 'light')], 'all', { belowHp: 0.4, weight: 3 }),
  ],
  weakPoints: [wp('Lead Voice', 0, -160, 12), wp('Small Voice', -52, -120, 10, 1500)],
  drops: [{ item: 'p_choir_glass', chance: 1 }, { item: 'silk_gilded', chance: 1 }],
  lore: 'Three choristers who sang so beautifully the Choir had them turned to glass so the song would never change. Maudra knew them. She sang beside them.',
});

E('first_thread', 'The First Thread', 2.3, 50, { hp: 1.2, def: 1.2, atk: 1.1, spd: 1.15 }, 12, {
  weak: [],
  resist: ['thread', 'dark'],
  immune: ['curse', 'freeze', 'stun', 'silence'],
  flying: true,
  attacks: [
    A('the_first_cut', 'The First Cut', 'lunge', 1000, [...run(0, 180, 7, 0.32), h(1700, 1.4, 'unblockable', 'thread')], 'one', { weight: 3 }),
    A('origin', 'Origin', 'cast', 1100, [h(0, 0.6, 'jump', 'light'), h(450, 0.6, 'jump', 'light'), h(900, 0.6, 'jump', 'light'), h(1500, 1.0, 'magic', 'thread')], 'all', { weight: 3 }),
    A('everything_after', 'Everything After', 'cast', 1050, run(0, 200, 8, 0.3, 'magic', 'thread'), 'all', { weight: 2 }),
    A('before_the_loom', 'Before the Loom', 'cast', 800, [], 'one', { heal: 0.06, selfStatus: { id: 'haste', turns: 2 }, weight: 1 }),
  ],
  weakPoints: [wp('The First Knot', 0, -100, 12)],
  drops: [{ item: 'p_first_thread', chance: 1 }, { item: 'silk_star', chance: 1 }],
  lore: 'Before the Loom wove anything, someone cut one thread to see what would happen. This is what happened.',
});

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(list.map((e) => [e.id, e]));

/** Wick's learnable Patterns, keyed by pattern id: which enemy and attack teach it. */
export const PATTERNS: Record<string, { enemy: string; attack: string }> = Object.fromEntries(
  list.flatMap((e) => e.attacks.filter((a) => a.pattern).map((a) => [a.pattern as string, { enemy: e.id, attack: a.id }] as const)),
);

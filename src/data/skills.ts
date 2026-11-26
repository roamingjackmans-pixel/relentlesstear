// Every skill: the seven companions' own, the classes', the Weave Arts and Wick's learned Patterns (built from the
// enemy attacks that carry a `pattern` id). The battle engine reads these; nothing special-cases a skill by id
// except the signature `mech` effects listed in SkillEffect.
import type { CharId, Element, StatusId } from './types';

export type Qte =
  | { kind: 'tap'; beats: number[] } // ms offsets: press Action on each beat
  | { kind: 'hold'; dur: number } // hold Action, release in the last 18% (bright zone)
  | { kind: 'rhythm'; beats: number[] } // arrows (left/up/right/down) arrive on these beats
  | { kind: 'none' };

export type Target = 'enemy' | 'all_enemies' | 'random_enemies' | 'ally' | 'all_allies' | 'self' | 'ally_ko';

export type SkillEffect =
  | { k: 'status'; id: StatusId; turns?: number; stacks?: number; chance?: number; on: 'target' | 'self' | 'allies' | 'enemies' }
  | { k: 'heal'; pct: number; on: 'target' | 'self' | 'allies' }
  | { k: 'revive'; pct: number; on: 'target' | 'allies' }
  | { k: 'ap'; n: number; on: 'self' | 'target' | 'allies' }
  | { k: 'cleanse'; on: 'target' | 'self' | 'allies' }
  | { k: 'dispel'; on: 'target' | 'enemies' }
  | { k: 'weave'; n: number }
  | { k: 'hp_cost'; pct: number }
  // signature mechanics
  | { k: 'stitch'; n: number; on?: 'target' | 'enemies' }
  | { k: 'pull' } // consume the target's stitches (each adds `scale.per` power to this skill's last hit)
  | { k: 'guard'; n: number }
  | { k: 'guard_spend' }
  | { k: 'tension'; n: number }
  | { k: 'tension_spend' }
  | { k: 'verse'; v: 'hope' | 'grief' | 'wrath' }
  | { k: 'hymn' }
  | { k: 'heat'; n: number }
  | { k: 'vent' }
  | { k: 'overheat' }
  | { k: 'penance'; n: number }
  | { k: 'penance_spend' }
  | { k: 'absolution' }
  | { k: 'fray' }
  | { k: 'free_shots' };

export interface SkillHit {
  power: number;
  brk?: number;
  /** this hit lands on every target (for all_enemies) or a random one (random_enemies); default: the skill's targets */
}

export interface SkillDef {
  id: string;
  name: string;
  owner: CharId | 'class' | 'weave' | 'pattern';
  ap: number;
  desc: string;
  target: Target;
  element?: Element; // default: the user's weapon element
  qte: Qte;
  hits: SkillHit[];
  effects?: SkillEffect[];
  anim: 'slash' | 'thrust' | 'flurry' | 'bash' | 'slam' | 'cast' | 'heal' | 'shot' | 'volley' | 'leap' | 'spin' | 'hymn' | 'throw' | 'weave' | 'buff';
  /** resource scaling: each point of `by` adds `per` to every hit's power (stitches only to the last hit) */
  scale?: { by: 'stitch' | 'guard' | 'tension' | 'heat' | 'penance' | 'missing_hp' | 'burn'; per: number };
  /** requires a resource to use */
  need?: { res: 'tension' | 'heat' | 'penance' | 'verses' | 'guard'; min: number };
  /** skill-tree: points to learn and prerequisites (companion skills) */
  cost?: number;
  req?: string[];
  /** a story flag that must be set before it can be learned */
  flag?: string;
  /** Weave Arts: the two companions needed and gauge segments */
  weave?: { with: CharId; segs: number };
  ignoreResist?: boolean;
  pierce?: boolean; // ignores Shield
  crit?: number; // bonus crit chance (0..1)
}

const tap = (...beats: number[]): Qte => ({ kind: 'tap', beats });
const hold = (dur: number): Qte => ({ kind: 'hold', dur });
const rhythm = (...beats: number[]): Qte => ({ kind: 'rhythm', beats });
const evenly = (n: number, step: number, start = 0): number[] => Array.from({ length: n }, (_, i) => start + i * step);
const H = (power: number, brk = 0): SkillHit => ({ power, brk });
const many = (n: number, power: number, brk = 0): SkillHit[] => Array.from({ length: n }, () => H(power, brk));

const list: SkillDef[] = [
  // ---------------------------------------------------------------- Ash: Stitches
  { id: 'ash_running_stitch', name: 'Running Stitch', owner: 'ash', ap: 2, target: 'enemy', anim: 'flurry', qte: tap(0, 260, 520), hits: many(3, 0.55, 8), effects: [{ k: 'stitch', n: 3 }], desc: 'Three quick thrusts. Each sews a Stitch into the target.' },
  { id: 'ash_pull_taut', name: 'Pull Taut', owner: 'ash', ap: 3, target: 'enemy', anim: 'slash', qte: hold(1100), hits: [H(1.4, 25)], scale: { by: 'stitch', per: 0.55 }, effects: [{ k: 'pull' }], desc: 'Pull every Stitch tight at once. +55% power per Stitch, which are used up.' },
  { id: 'ash_backstitch', name: 'Backstitch', owner: 'ash', ap: 1, target: 'enemy', anim: 'thrust', qte: tap(0), hits: [H(0.9, 10)], effects: [{ k: 'stitch', n: 1 }], desc: 'A precise thrust that sews one Stitch. If the target already holds 3+, regain 1 AP.' },
  { id: 'ash_hemline', name: 'Hemline', owner: 'ash', ap: 2, target: 'all_enemies', anim: 'leap', qte: tap(0, 380), hits: many(2, 0.38, 6), effects: [{ k: 'stitch', n: 1, on: 'enemies' }], cost: 1, desc: 'Dash through every enemy along a single thread, sewing a Stitch into each.' },
  { id: 'ash_thimble_ward', name: 'Thimble Ward', owner: 'ash', ap: 1, target: 'self', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'shield', stacks: 1, on: 'self' }, { k: 'status', id: 'empower', turns: 2, on: 'self' }], cost: 1, desc: "Her mother's thimble turns a blow. Gain 1 Shield and Empower for 2 turns." },
  { id: 'ash_field_mend', name: 'Field Mend', owner: 'ash', ap: 2, target: 'ally', anim: 'heal', qte: tap(0), hits: [], effects: [{ k: 'heal', pct: 0.25, on: 'target' }, { k: 'cleanse', on: 'target' }], cost: 1, desc: 'Stitch a wound closed: heal an ally 25% and remove one ailment.' },
  { id: 'ash_cross_stitch', name: 'Cross-Stitch', owner: 'ash', ap: 4, target: 'enemy', anim: 'slash', qte: tap(0, 300), hits: [H(1.0, 25), H(1.0, 25)], effects: [{ k: 'stitch', n: 2 }], cost: 2, req: ['ash_hemline'], desc: 'An X of two heavy cuts. Sews 2 Stitches and cracks guard.' },
  { id: 'ash_blanket_stitch', name: 'Blanket Stitch', owner: 'ash', ap: 5, target: 'all_enemies', anim: 'spin', qte: rhythm(0, 300, 600, 900), hits: many(4, 0.42, 6), effects: [{ k: 'stitch', n: 2, on: 'enemies' }], cost: 2, req: ['ash_cross_stitch'], desc: 'A whirling loop around the whole field. Sews 2 Stitches into every enemy.' },
  { id: 'ash_seamrender', name: 'Seamrender', owner: 'ash', ap: 7, target: 'enemy', anim: 'flurry', qte: tap(0, 180, 360, 540, 720, 900, 1300), hits: [...many(6, 0.45, 8), H(1.0, 40)], scale: { by: 'stitch', per: 0.7 }, effects: [{ k: 'stitch', n: 2 }, { k: 'pull' }], cost: 3, req: ['ash_pull_taut', 'ash_cross_stitch'], desc: 'Six lightning thrusts, then rip the seam: the finisher gains +70% per Stitch.' },
  { id: 'ash_unfated', name: 'Unfated', owner: 'ash', ap: 9, target: 'all_enemies', anim: 'weave', qte: rhythm(0, 250, 500, 750, 1000, 1400), hits: [...many(5, 0.4, 10), H(1.6, 60)], scale: { by: 'stitch', per: 0.35 }, effects: [{ k: 'pull' }], ignoreResist: true, cost: 3, flag: 'ch8_done', req: ['ash_seamrender'], desc: 'Nothing wrote this. Strikes every enemy, ignores resistance, and pulls every Stitch on the field.' },

  // ---------------------------------------------------------------- Corin: Guard
  { id: 'cor_shield_bash', name: 'Shield Bash', owner: 'corin', ap: 1, target: 'enemy', anim: 'bash', qte: tap(0), hits: [H(1.0, 30)], effects: [{ k: 'guard', n: 1 }], desc: 'Lead with the shield. Heavy break damage. +1 Guard.' },
  { id: 'cor_interpose', name: 'Interpose', owner: 'corin', ap: 1, target: 'self', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'taunt', turns: 2, on: 'self' }, { k: 'status', id: 'shield', stacks: 1, on: 'self' }, { k: 'guard', n: 1 }], desc: '"Eyes on me." Enemies must target Corin for 2 turns. +1 Shield, +1 Guard.' },
  { id: 'cor_bulwark', name: 'Bulwark', owner: 'corin', ap: 3, target: 'all_allies', anim: 'buff', qte: hold(1000), hits: [], effects: [{ k: 'status', id: 'shield', stacks: 1, on: 'allies' }, { k: 'guard', n: 1 }], desc: 'Plant the shield. Every ally gains 1 Shield. +1 Guard.' },
  { id: 'cor_last_wall', name: 'Last Wall', owner: 'corin', ap: 3, target: 'enemy', anim: 'slam', qte: tap(0, 450), hits: [H(0.6, 20), H(0.6, 20)], scale: { by: 'guard', per: 0.3 }, effects: [{ k: 'guard_spend' }], need: { res: 'guard', min: 1 }, cost: 1, desc: 'Spend all Guard: each point adds +30% power to both blows.' },
  { id: 'cor_second_helping', name: 'Second Helping', owner: 'corin', ap: 2, target: 'all_allies', anim: 'heal', qte: tap(0), hits: [], effects: [{ k: 'heal', pct: 0.15, on: 'allies' }, { k: 'status', id: 'regen', turns: 2, on: 'allies' }], cost: 1, desc: 'There is always more stew. Heal all allies 15% and Regen for 2 turns.' },
  { id: 'cor_rally', name: 'Rally', owner: 'corin', ap: 2, target: 'ally', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'ap', n: 2, on: 'target' }], cost: 1, desc: '"You\'ve got this." Give an ally 2 AP.' },
  { id: 'cor_millstone', name: 'Millstone', owner: 'corin', ap: 4, target: 'all_enemies', anim: 'slam', qte: hold(1200), hits: [H(0.9, 30)], effects: [{ k: 'status', id: 'slow', turns: 2, chance: 0.5, on: 'enemies' }], cost: 2, req: ['cor_last_wall'], element: 'earth', desc: 'Leap and drive the shield into the ground. Earth damage to all, may Slow.' },
  { id: 'cor_oak_and_iron', name: 'Oak and Iron', owner: 'corin', ap: 3, target: 'self', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'shield', stacks: 3, on: 'self' }, { k: 'guard', n: 5 }], cost: 2, req: ['cor_bulwark'], desc: 'Become a wall. Gain 3 Shields and fill Guard.' },
  { id: 'cor_brothers_keeper', name: "Brother's Keeper", owner: 'corin', ap: 5, target: 'ally_ko', anim: 'heal', qte: hold(1100), hits: [], effects: [{ k: 'revive', pct: 0.5, on: 'target' }, { k: 'status', id: 'shield', stacks: 1, on: 'target' }], cost: 2, req: ['cor_second_helping'], desc: 'Haul a fallen ally up. Revive at 50% HP with a Shield.' },
  { id: 'cor_promise', name: 'Promise', owner: 'corin', ap: 7, target: 'enemy', anim: 'slam', qte: tap(0, 300, 600, 1100), hits: [H(0.6, 25), H(0.6, 25), H(0.6, 25), H(1.4, 60)], scale: { by: 'guard', per: 0.35 }, effects: [{ k: 'guard_spend' }, { k: 'status', id: 'empower', turns: 2, on: 'allies' }], cost: 3, req: ['cor_millstone', 'cor_oak_and_iron'], desc: 'Everything he has, for them. Four blows that grow with Guard; Empowers the party.' },

  // ---------------------------------------------------------------- Wick: Patterns + Fray
  { id: 'wick_tangle', name: 'Tangle', owner: 'wick', ap: 1, target: 'enemy', anim: 'cast', qte: tap(0), hits: [H(0.75, 10)], effects: [{ k: 'status', id: 'slow', turns: 2, on: 'target' }], element: 'thread', desc: 'Loose thread wraps an enemy. Thread damage and Slow.' },
  { id: 'wick_spool_up', name: 'Spool Up', owner: 'wick', ap: 2, target: 'ally', anim: 'heal', qte: tap(0), hits: [], effects: [{ k: 'heal', pct: 0.2, on: 'target' }, { k: 'status', id: 'regen', turns: 3, on: 'target' }], desc: 'Wind a little of yourself around a friend. Heal 20% and Regen.' },
  { id: 'wick_fray', name: 'Fray', owner: 'wick', ap: 0, target: 'self', anim: 'buff', qte: { kind: 'none' }, hits: [], effects: [{ k: 'fray' }], desc: 'Unravel a little: lose 15% HP, and your next skill is 50% stronger.' },
  { id: 'wick_red_string', name: 'Red String', owner: 'wick', ap: 2, target: 'enemy', anim: 'cast', qte: tap(0), hits: [H(0.5)], effects: [{ k: 'status', id: 'marked', on: 'target' }, { k: 'status', id: 'weaken', turns: 2, on: 'target' }], element: 'thread', cost: 1, desc: 'Tie a red string to a foe: Marked (next hit +50%) and Weakened.' },
  { id: 'wick_unspool', name: 'Unspool', owner: 'wick', ap: 4, target: 'random_enemies', anim: 'volley', qte: rhythm(0, 220, 440, 660, 880), hits: many(5, 0.48, 6), element: 'thread', cost: 1, desc: 'Five lashes of thread at random enemies.' },
  { id: 'wick_knot', name: 'Knot of Holding', owner: 'wick', ap: 3, target: 'enemy', anim: 'cast', qte: hold(1000), hits: [H(0.6, 30)], effects: [{ k: 'status', id: 'stun', turns: 1, chance: 0.6, on: 'target' }], element: 'thread', cost: 2, req: ['wick_red_string'], desc: 'Tie a foe in knots. 60% chance to Stun (25% vs bosses).' },
  { id: 'wick_hum', name: 'Hum', owner: 'wick', ap: 3, target: 'all_allies', anim: 'hymn', qte: rhythm(0, 400, 800), hits: [], effects: [{ k: 'status', id: 'regen', turns: 3, on: 'allies' }, { k: 'cleanse', on: 'allies' }], cost: 2, req: ['wick_spool_up'], desc: 'A tune Wick doesn\'t know the name of. Regen and cleanse the party.' },
  { id: 'wick_patchwork', name: 'Patchwork', owner: 'wick', ap: 4, target: 'ally_ko', anim: 'heal', qte: tap(0, 300), hits: [], effects: [{ k: 'revive', pct: 0.35, on: 'target' }, { k: 'status', id: 'regen', turns: 2, on: 'target' }], cost: 2, req: ['wick_hum'], desc: 'Sew a fallen friend back together. Revive at 35% with Regen.' },
  { id: 'wick_bright_thread', name: 'Bright Thread', owner: 'wick', ap: 6, target: 'enemy', anim: 'cast', qte: tap(0, 250, 500, 1000), hits: [H(0.5, 10), H(0.5, 10), H(0.5, 10), H(1.4, 40)], element: 'light', cost: 3, req: ['wick_unspool', 'wick_knot'], desc: 'Every thread of Wick shines at once. Light damage; doubly strong while Frayed.' },

  // ---------------------------------------------------------------- Orrin: Tension
  { id: 'orr_measured_cut', name: 'Measured Cut', owner: 'orrin', ap: 1, target: 'enemy', anim: 'slash', qte: tap(0), hits: [H(1.1, 15)], effects: [{ k: 'tension', n: 25 }], desc: '"Measure twice." A clean cut. +25 Tension.' },
  { id: 'orr_great_shear', name: 'Great Shear', owner: 'orrin', ap: 3, target: 'enemy', anim: 'slash', qte: hold(1100), hits: [H(1.5, 45)], scale: { by: 'tension', per: 0.012 }, effects: [{ k: 'tension', n: 15 }], desc: 'The shears close. Grows with Tension (+1.2% per point).' },
  { id: 'orr_snap', name: 'Snap', owner: 'orrin', ap: 2, target: 'all_enemies', anim: 'spin', qte: tap(0, 350), hits: [H(0.3, 20), H(0.3, 20)], scale: { by: 'tension', per: 0.012 }, effects: [{ k: 'tension_spend' }], need: { res: 'tension', min: 50 }, element: 'thread', desc: 'Let it all go. Thread damage to every enemy, scaled by Tension, which resets.' },
  { id: 'orr_old_lesson', name: 'Old Lesson', owner: 'orrin', ap: 2, target: 'ally', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'empower', turns: 2, on: 'target' }, { k: 'status', id: 'haste', turns: 2, on: 'target' }, { k: 'tension', n: 10 }], desc: 'A word in the right ear. Empower and Haste an ally.' },
  { id: 'orr_tea_break', name: 'Tea Break', owner: 'orrin', ap: 1, target: 'self', anim: 'heal', qte: tap(0), hits: [], effects: [{ k: 'heal', pct: 0.25, on: 'self' }, { k: 'tension', n: 20 }], desc: 'Even now. Heal 25%. +20 Tension.' },
  { id: 'orr_unpick', name: 'Unpick', owner: 'orrin', ap: 3, target: 'enemy', anim: 'thrust', qte: tap(0, 300), hits: [H(0.6, 20), H(0.6, 20)], effects: [{ k: 'dispel', on: 'target' }, { k: 'tension', n: 15 }], element: 'thread', desc: 'Pick apart an enemy\'s protections: removes every buff.' },

  // ---------------------------------------------------------------- Maudra: Verses
  { id: 'mau_bell_of_hope', name: 'Bell of Hope', owner: 'maudra', ap: 1, target: 'ally', anim: 'heal', qte: tap(0), hits: [], effects: [{ k: 'heal', pct: 0.18, on: 'target' }, { k: 'verse', v: 'hope' }], desc: 'Heal an ally 18%. Adds a Hope verse.' },
  { id: 'mau_toll', name: 'Toll for the Lost', owner: 'maudra', ap: 1, target: 'enemy', anim: 'cast', qte: tap(0), hits: [H(0.85, 10)], effects: [{ k: 'status', id: 'weaken', turns: 2, chance: 0.5, on: 'target' }, { k: 'verse', v: 'grief' }], element: 'dark', desc: 'A low bell for the dead. Dark damage, may Weaken. Adds a Grief verse.' },
  { id: 'mau_censure', name: 'Censure', owner: 'maudra', ap: 2, target: 'enemy', anim: 'cast', qte: tap(0, 300), hits: [H(0.7, 10), H(0.7, 10)], effects: [{ k: 'verse', v: 'wrath' }], element: 'light', desc: 'Two strikes of judgment light. Adds a Wrath verse.' },
  { id: 'mau_hymn', name: 'Hymn', owner: 'maudra', ap: 1, target: 'all_enemies', anim: 'hymn', qte: rhythm(0, 330, 660, 990, 1320, 1650), hits: [], effects: [{ k: 'hymn' }], need: { res: 'verses', min: 2 }, desc: 'Sing the verses you hold. Hope heals, Grief weakens, Wrath smites; three alike make a great Hymn.' },
  { id: 'mau_sanctuary', name: 'Sanctuary', owner: 'maudra', ap: 4, target: 'all_allies', anim: 'hymn', qte: hold(1200), hits: [], effects: [{ k: 'status', id: 'shield', stacks: 1, on: 'allies' }, { k: 'verse', v: 'hope' }], cost: 1, desc: 'Every ally gains 1 Shield. Adds a Hope verse.' },
  { id: 'mau_last_rites', name: 'Last Rites', owner: 'maudra', ap: 3, target: 'ally_ko', anim: 'heal', qte: tap(0, 400), hits: [], effects: [{ k: 'revive', pct: 0.4, on: 'target' }, { k: 'verse', v: 'grief' }], cost: 1, desc: 'Not yet. Revive an ally at 40%. Adds a Grief verse.' },
  { id: 'mau_benediction', name: 'Benediction', owner: 'maudra', ap: 2, target: 'ally', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'empower', turns: 2, on: 'target' }, { k: 'status', id: 'regen', turns: 2, on: 'target' }, { k: 'verse', v: 'hope' }], cost: 2, req: ['mau_sanctuary'], desc: 'Empower and Regen an ally. Adds a Hope verse.' },
  { id: 'mau_heresy', name: 'Heresy', owner: 'maudra', ap: 5, target: 'enemy', anim: 'cast', qte: tap(0, 250, 500, 900), hits: [H(0.6, 15), H(0.6, 15), H(0.6, 15), H(1.2, 40)], effects: [{ k: 'verse', v: 'wrath' }, { k: 'verse', v: 'wrath' }], element: 'light', ignoreResist: true, cost: 3, flag: 'ch6_done', req: ['mau_benediction'], desc: 'She sings what the Choir forbade. Ignores resistance. Adds two Wrath verses.' },

  // ---------------------------------------------------------------- Rook: Heat
  { id: 'rook_quickdraw', name: 'Quickdraw', owner: 'rook', ap: 1, target: 'enemy', anim: 'shot', qte: tap(0), hits: [H(0.95, 12)], scale: { by: 'heat', per: 0.08 }, effects: [{ k: 'heat', n: 1 }], crit: 0.15, desc: 'Faster than you saw. +8% power per Heat. +1 Heat.' },
  { id: 'rook_fan', name: 'Fan the Hammer', owner: 'rook', ap: 3, target: 'random_enemies', anim: 'volley', qte: rhythm(0, 150, 300, 450, 600, 750), hits: many(6, 0.36, 6), scale: { by: 'heat', per: 0.03 }, effects: [{ k: 'heat', n: 3 }], desc: 'Six shots at whatever moves. +3 Heat.' },
  { id: 'rook_vent', name: 'Vent', owner: 'rook', ap: 0, target: 'self', anim: 'buff', qte: { kind: 'none' }, hits: [], effects: [{ k: 'vent' }], need: { res: 'heat', min: 3 }, desc: 'Crack the cylinder: lose all Heat, gain 1 AP per 3 Heat.' },
  { id: 'rook_flare', name: 'Flare Round', owner: 'rook', ap: 2, target: 'enemy', anim: 'shot', qte: tap(0), hits: [H(1.0, 10)], effects: [{ k: 'status', id: 'burn', stacks: 3, on: 'target' }, { k: 'heat', n: 2 }], element: 'fire', cost: 1, desc: 'A burning round: Fire damage and 3 Burn. +2 Heat.' },
  { id: 'rook_ricochet', name: 'Ricochet', owner: 'rook', ap: 2, target: 'all_enemies', anim: 'shot', qte: tap(0, 220, 440), hits: many(3, 0.25, 5), effects: [{ k: 'heat', n: 2 }], cost: 1, desc: 'One bullet, every enemy. +2 Heat.' },
  { id: 'rook_deadeye', name: 'Deadeye', owner: 'rook', ap: 2, target: 'self', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'free_shots' }, { k: 'heat', n: 1 }], cost: 2, req: ['rook_ricochet'], desc: 'For the rest of this turn, Free Aim shots cost no AP and hit 50% harder.' },
  { id: 'rook_smoke', name: 'Smoke and Mirrors', owner: 'rook', ap: 2, target: 'all_allies', anim: 'throw', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'haste', turns: 2, on: 'allies' }], cost: 1, desc: 'A Shear trick. Haste the party for 2 turns.' },
  { id: 'rook_crucible', name: 'Crucible', owner: 'rook', ap: 4, target: 'enemy', anim: 'shot', qte: hold(1300), hits: [H(4.0, 90)], effects: [{ k: 'overheat' }], need: { res: 'heat', min: 10 }, element: 'fire', cost: 2, req: ['rook_flare'], desc: 'At 10 Heat: everything in one shot. Then he Overheats (Burned and Slowed).' },
  { id: 'rook_penitent', name: 'Penitent', owner: 'rook', ap: 6, target: 'enemy', anim: 'shot', qte: tap(0, 600, 1200), hits: [H(0.9, 20), H(0.9, 20), H(1.4, 50)], scale: { by: 'heat', per: 0.06 }, effects: [{ k: 'heat', n: 2 }], pierce: true, cost: 3, req: ['rook_crucible', 'rook_deadeye'], desc: 'Three slow, honest shots that go through any Shield.' },

  // ---------------------------------------------------------------- Tess: Penance
  { id: 'tess_twin_cut', name: 'Twin Cut', owner: 'tess', ap: 1, target: 'enemy', anim: 'flurry', qte: tap(0, 200), hits: many(2, 0.62, 10), desc: 'Both blades, one breath.' },
  { id: 'tess_take_it', name: 'Take It', owner: 'tess', ap: 1, target: 'self', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'taunt', turns: 2, on: 'self' }, { k: 'status', id: 'shield', stacks: 1, on: 'self' }, { k: 'penance', n: 15 }], desc: '"Hit me instead." Taunt for 2 turns, 1 Shield, +15 Penance.' },
  { id: 'tess_absolution', name: 'Absolution', owner: 'tess', ap: 2, target: 'all_allies', anim: 'heal', qte: hold(1000), hits: [], effects: [{ k: 'absolution' }], need: { res: 'penance', min: 20 }, desc: 'Spend all Penance: heal every ally by half of it (in %).' },
  { id: 'tess_scissor_rite', name: 'Scissor Rite', owner: 'tess', ap: 3, target: 'enemy', anim: 'slash', qte: hold(1200), hits: [H(1.0, 40)], scale: { by: 'penance', per: 0.03 }, effects: [{ k: 'penance_spend' }], desc: 'Spend all Penance in one cut: +3% power per point.' },
  { id: 'tess_sever', name: 'Sever', owner: 'tess', ap: 2, target: 'enemy', anim: 'slash', qte: tap(0, 260), hits: many(2, 0.5, 15), effects: [{ k: 'dispel', on: 'target' }, { k: 'status', id: 'expose', turns: 2, on: 'target' }], element: 'thread', desc: 'Cut what protects them. Removes buffs and Exposes.' },
  { id: 'tess_hairshirt', name: 'Hairshirt', owner: 'tess', ap: 0, target: 'self', anim: 'buff', qte: { kind: 'none' }, hits: [], effects: [{ k: 'hp_cost', pct: 0.15 }, { k: 'penance', n: 30 }], cost: 1, desc: 'Lose 15% HP, gain 30 Penance.' },
  { id: 'tess_crosswind', name: 'Crosswind', owner: 'tess', ap: 4, target: 'all_enemies', anim: 'spin', qte: rhythm(0, 260, 520, 780), hits: many(4, 0.36, 8), cost: 1, desc: 'Four sweeping cuts across every enemy.' },
  { id: 'tess_forgiven', name: 'Forgiven', owner: 'tess', ap: 5, target: 'all_allies', anim: 'heal', qte: hold(1400), hits: [], effects: [{ k: 'revive', pct: 0.3, on: 'allies' }, { k: 'penance_spend' }], need: { res: 'penance', min: 50 }, cost: 2, req: ['tess_hairshirt'], desc: 'At 50+ Penance: spend it all to revive every fallen ally at 30%.' },

  // ---------------------------------------------------------------- Weave Arts (duo ultimates)
  { id: 'weave_measure', name: 'Measure Twice', owner: 'weave', ap: 0, target: 'all_enemies', anim: 'weave', qte: tap(0, 500, 1000), hits: [H(0.8, 30), H(0.8, 30), H(1.2, 50)], weave: { with: 'orrin', segs: 2 }, element: 'thread', desc: 'Ash and Orrin, master and apprentice: three perfect cuts through every enemy.' },
  { id: 'weave_hearth', name: 'Hearth and Needle', owner: 'weave', ap: 0, target: 'enemy', anim: 'weave', qte: tap(0, 300, 600, 900, 1400), hits: [H(0.6, 20), H(0.6, 20), H(0.6, 20), H(0.6, 20), H(1.6, 60)], effects: [{ k: 'status', id: 'shield', stacks: 2, on: 'allies' }, { k: 'stitch', n: 5 }], weave: { with: 'corin', segs: 2 }, desc: 'Corin holds the line while Ash sews. Party gains 2 Shields; 5 Stitches.' },
  { id: 'weave_cradle', name: "Cat's Cradle", owner: 'weave', ap: 0, target: 'all_enemies', anim: 'weave', qte: rhythm(0, 300, 600, 900), hits: many(4, 0.5, 20), effects: [{ k: 'status', id: 'stun', turns: 1, chance: 0.6, on: 'enemies' }], weave: { with: 'wick', segs: 2 }, element: 'thread', desc: 'A string game across the whole field. May Stun every enemy.' },
  { id: 'weave_vespers', name: 'Vespers', owner: 'weave', ap: 0, target: 'all_allies', anim: 'weave', qte: rhythm(0, 400, 800, 1200), hits: [], effects: [{ k: 'revive', pct: 0.3, on: 'allies' }, { k: 'heal', pct: 0.6, on: 'allies' }, { k: 'status', id: 'regen', turns: 3, on: 'allies' }], weave: { with: 'maudra', segs: 2 }, desc: 'Evening song. Revive the fallen, heal all 60%, Regen.' },
  { id: 'weave_highnoon', name: 'High Noon Hem', owner: 'weave', ap: 0, target: 'random_enemies', anim: 'weave', qte: rhythm(0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1500), hits: [...many(11, 0.42, 10), H(1.5, 50)], weave: { with: 'rook', segs: 3 }, desc: 'Ash pins them; Rook empties everything. Twelve shots.' },
  { id: 'weave_twoblades', name: 'Two Blades, One Thread', owner: 'weave', ap: 0, target: 'enemy', anim: 'weave', qte: tap(0, 400, 800, 1600), hits: [H(1.0, 40), H(1.0, 40), H(1.0, 40), H(3.2, 100)], weave: { with: 'tess', segs: 3 }, desc: 'Two of Orrin\'s students, finally on the same side.' },

  // ---------------------------------------------------------------- class skills (rank 1 / 3 / 5)
  { id: 'cl_feint', name: 'Feint', owner: 'class', ap: 1, target: 'enemy', anim: 'thrust', qte: tap(0), hits: [H(0.8, 10)], effects: [{ k: 'status', id: 'expose', turns: 2, on: 'target' }], desc: 'Duelist. A false opening: Expose the target for 2 turns.' },
  { id: 'cl_lunge', name: 'Lunge', owner: 'class', ap: 2, target: 'enemy', anim: 'thrust', qte: hold(900), hits: [H(1.8, 20)], crit: 0.3, desc: 'Duelist. A full-length lunge, +30% crit chance.' },
  { id: 'cl_thousand_cuts', name: 'Thousand Cuts', owner: 'class', ap: 5, target: 'enemy', anim: 'flurry', qte: rhythm(0, 130, 260, 390, 520, 650, 780, 910), hits: many(8, 0.36, 6), desc: 'Duelist. Eight cuts in rhythm.' },
  { id: 'cl_gale_step', name: 'Gale Step', owner: 'class', ap: 1, target: 'self', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'haste', turns: 2, on: 'self' }], desc: 'Windstep. Haste yourself for 2 turns.' },
  { id: 'cl_cyclone', name: 'Cyclone', owner: 'class', ap: 3, target: 'all_enemies', anim: 'spin', qte: tap(0, 350), hits: many(2, 0.6, 10), element: 'storm', desc: 'Windstep. A spinning gale: Storm damage to all.' },
  { id: 'cl_eye_of_storm', name: 'Eye of the Storm', owner: 'class', ap: 4, target: 'all_allies', anim: 'buff', qte: hold(1000), hits: [], effects: [{ k: 'status', id: 'haste', turns: 3, on: 'allies' }], desc: 'Windstep. Haste the whole party for 3 turns.' },
  { id: 'cl_called_shot', name: 'Called Shot', owner: 'class', ap: 2, target: 'enemy', anim: 'shot', qte: tap(0), hits: [H(1.4, 15)], effects: [{ k: 'status', id: 'marked', on: 'target' }], desc: 'Marksman. Mark the target.' },
  { id: 'cl_pin_down', name: 'Pin Down', owner: 'class', ap: 2, target: 'enemy', anim: 'shot', qte: tap(0, 250), hits: many(2, 0.55, 10), effects: [{ k: 'status', id: 'slow', turns: 2, on: 'target' }], desc: 'Marksman. Two shots at the legs: Slow.' },
  { id: 'cl_headhunter', name: 'Headhunter', owner: 'class', ap: 5, target: 'enemy', anim: 'shot', qte: hold(1300), hits: [H(3.2, 40)], crit: 0.25, desc: 'Marksman. One perfect shot; double damage on a Marked target.' },
  { id: 'cl_shield_wall', name: 'Shield Wall', owner: 'class', ap: 2, target: 'ally', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'shield', stacks: 2, on: 'target' }], desc: 'Warden. Give an ally 2 Shields.' },
  { id: 'cl_provoke', name: 'Provoke', owner: 'class', ap: 1, target: 'self', anim: 'buff', qte: tap(0), hits: [], effects: [{ k: 'status', id: 'taunt', turns: 2, on: 'self' }, { k: 'status', id: 'shield', stacks: 1, on: 'self' }], desc: 'Warden. Draw every attack for 2 turns. 1 Shield.' },
  { id: 'cl_fortress', name: 'Fortress', owner: 'class', ap: 5, target: 'all_allies', anim: 'buff', qte: hold(1100), hits: [], effects: [{ k: 'status', id: 'shield', stacks: 2, on: 'allies' }, { k: 'status', id: 'regen', turns: 2, on: 'allies' }], desc: 'Warden. 2 Shields and Regen for every ally.' },
  { id: 'cl_kindle', name: 'Kindle', owner: 'class', ap: 1, target: 'enemy', anim: 'cast', qte: tap(0), hits: [H(0.9)], effects: [{ k: 'status', id: 'burn', stacks: 2, on: 'target' }], element: 'fire', desc: 'Pyrewright. Fire damage and 2 Burn.' },
  { id: 'cl_firestorm', name: 'Firestorm', owner: 'class', ap: 4, target: 'all_enemies', anim: 'cast', qte: rhythm(0, 300, 600), hits: many(3, 0.32, 5), effects: [{ k: 'status', id: 'burn', stacks: 2, on: 'enemies' }], element: 'fire', desc: 'Pyrewright. Fire falls on every enemy: 2 Burn each.' },
  { id: 'cl_pyre', name: 'Pyre', owner: 'class', ap: 5, target: 'enemy', anim: 'cast', qte: hold(1200), hits: [H(1.0, 30)], scale: { by: 'burn', per: 0.45 }, element: 'fire', desc: 'Pyrewright. Detonate Burn: +45% power per stack (Burn is used up).' },
  { id: 'cl_frost_needle', name: 'Frost Needle', owner: 'class', ap: 2, target: 'enemy', anim: 'thrust', qte: tap(0), hits: [H(1.0, 15)], effects: [{ k: 'status', id: 'freeze', turns: 1, chance: 0.4, on: 'target' }], element: 'ice', desc: 'Rimeweaver. Ice damage, 40% chance to Freeze.' },
  { id: 'cl_hoarfrost', name: 'Hoarfrost', owner: 'class', ap: 4, target: 'all_enemies', anim: 'cast', qte: tap(0, 400), hits: many(2, 0.42, 10), effects: [{ k: 'status', id: 'freeze', turns: 1, chance: 0.25, on: 'enemies' }], element: 'ice', desc: 'Rimeweaver. Ice on every enemy, may Freeze.' },
  { id: 'cl_glacier', name: 'Glacier', owner: 'class', ap: 6, target: 'enemy', anim: 'cast', qte: hold(1300), hits: [H(2.8, 60)], effects: [{ k: 'status', id: 'freeze', turns: 1, chance: 1, on: 'target' }], element: 'ice', desc: 'Rimeweaver. A mountain of ice. Always Freezes (bosses resist).' },
  { id: 'cl_static', name: 'Static', owner: 'class', ap: 1, target: 'enemy', anim: 'cast', qte: tap(0), hits: [H(0.9, 10)], effects: [{ k: 'status', id: 'shock', turns: 2, on: 'target' }], element: 'storm', desc: 'Stormstitcher. Storm damage and Shock.' },
  { id: 'cl_chain_lightning', name: 'Chain Lightning', owner: 'class', ap: 3, target: 'random_enemies', anim: 'cast', qte: rhythm(0, 180, 360, 540), hits: many(4, 0.55, 8), element: 'storm', desc: 'Stormstitcher. Lightning leaps between enemies.' },
  { id: 'cl_thunderhead', name: 'Thunderhead', owner: 'class', ap: 6, target: 'all_enemies', anim: 'cast', qte: tap(0, 500, 1000), hits: many(3, 0.55, 15), effects: [{ k: 'status', id: 'shock', turns: 2, on: 'enemies' }], element: 'storm', desc: 'Stormstitcher. A storm breaks over every enemy. Shock all.' },
  { id: 'cl_suture', name: 'Suture', owner: 'class', ap: 1, target: 'ally', anim: 'heal', qte: tap(0), hits: [], effects: [{ k: 'heal', pct: 0.2, on: 'target' }], desc: 'Chirurgeon. Heal an ally 20%.' },
  { id: 'cl_triage', name: 'Triage', owner: 'class', ap: 3, target: 'all_allies', anim: 'heal', qte: hold(1000), hits: [], effects: [{ k: 'heal', pct: 0.25, on: 'allies' }], desc: 'Chirurgeon. Heal every ally 25%.' },
  { id: 'cl_resurrect', name: 'Resurrection', owner: 'class', ap: 5, target: 'ally_ko', anim: 'heal', qte: hold(1200), hits: [], effects: [{ k: 'revive', pct: 0.8, on: 'target' }], desc: 'Chirurgeon. Revive an ally at 80%.' },
  { id: 'cl_bloodletting', name: 'Bloodletting', owner: 'class', ap: 0, target: 'self', anim: 'buff', qte: { kind: 'none' }, hits: [], effects: [{ k: 'hp_cost', pct: 0.2 }, { k: 'ap', n: 2, on: 'self' }], desc: 'Ragged. Lose 20% HP, gain 2 AP.' },
  { id: 'cl_wild_swing', name: 'Wild Swing', owner: 'class', ap: 2, target: 'random_enemies', anim: 'slam', qte: tap(0), hits: [H(2.0, 30)], desc: 'Ragged. A huge blow at a random enemy.' },
  { id: 'cl_last_laugh', name: 'Last Laugh', owner: 'class', ap: 4, target: 'enemy', anim: 'slash', qte: tap(0, 300), hits: many(2, 0.55, 20), scale: { by: 'missing_hp', per: 0.025 }, desc: 'Ragged. +2.5% power per 1% HP you are missing.' },
  { id: 'cl_quick_fix', name: 'Quick Fix', owner: 'class', ap: 0, target: 'self', anim: 'heal', qte: tap(0), hits: [], effects: [{ k: 'heal', pct: 0.15, on: 'self' }], desc: 'Tinker. Heal yourself 15%.' },
  { id: 'cl_bomb', name: 'Thread Bomb', owner: 'class', ap: 3, target: 'all_enemies', anim: 'throw', qte: hold(900), hits: [H(1.1, 25)], effects: [{ k: 'status', id: 'burn', stacks: 1, on: 'enemies' }], element: 'fire', desc: 'Tinker. A bomb for every enemy.' },
  { id: 'cl_contraption', name: 'Grand Contraption', owner: 'class', ap: 5, target: 'random_enemies', anim: 'throw', qte: rhythm(0, 260, 520, 780, 1040), hits: many(5, 0.8, 15), desc: 'Tinker. Five explosions, wherever they land.' },
  { id: 'cl_crack', name: 'Crack', owner: 'class', ap: 1, target: 'enemy', anim: 'bash', qte: tap(0), hits: [H(0.8, 50)], desc: 'Shatterhand. Small damage, big Break.' },
  { id: 'cl_sunder', name: 'Sunder', owner: 'class', ap: 3, target: 'enemy', anim: 'slam', qte: hold(1000), hits: [H(1.5, 90)], effects: [{ k: 'status', id: 'expose', turns: 2, on: 'target' }], desc: 'Shatterhand. Huge Break and Expose.' },
  { id: 'cl_shatter', name: 'Shatter', owner: 'class', ap: 5, target: 'enemy', anim: 'slam', qte: tap(0, 400, 800), hits: [H(0.8, 30), H(0.8, 30), H(1.2, 50)], desc: 'Shatterhand. Double damage against a Broken enemy.' },
  { id: 'cl_harmony', name: 'Harmony', owner: 'class', ap: 1, target: 'all_allies', anim: 'hymn', qte: rhythm(0, 300, 600), hits: [], effects: [{ k: 'weave', n: 30 }, { k: 'heal', pct: 0.08, on: 'allies' }], desc: 'Cantor. +30 Weave and a small heal for all.' },
  { id: 'cl_cadence', name: 'Cadence', owner: 'class', ap: 2, target: 'ally', anim: 'hymn', qte: rhythm(0, 250, 500), hits: [], effects: [{ k: 'ap', n: 2, on: 'target' }], desc: 'Cantor. Give an ally 2 AP.' },
  { id: 'cl_crescendo', name: 'Crescendo', owner: 'class', ap: 6, target: 'all_enemies', anim: 'hymn', qte: rhythm(0, 200, 400, 600, 800, 1000, 1200, 1400), hits: many(8, 0.26, 6), effects: [{ k: 'weave', n: 60 }], desc: 'Cantor. Eight notes that strike every enemy. +60 Weave.' },
  { id: 'cl_unwritten', name: 'Unwritten', owner: 'class', ap: 3, target: 'enemy', anim: 'slash', qte: tap(0, 300), hits: many(2, 1.0, 25), element: 'thread', ignoreResist: true, desc: 'Fatebreaker. Thread damage that ignores resistance.' },
  { id: 'cl_loose_end', name: 'Loose End', owner: 'class', ap: 4, target: 'all_enemies', anim: 'spin', qte: tap(0, 350), hits: many(2, 0.7, 25), effects: [{ k: 'dispel', on: 'enemies' }], element: 'thread', desc: 'Fatebreaker. Strip every enemy of its buffs.' },
  { id: 'cl_no_ending', name: 'No Ending', owner: 'class', ap: 9, target: 'all_enemies', anim: 'weave', qte: rhythm(0, 250, 500, 750, 1000, 1250, 1700), hits: [...many(6, 0.45, 15), H(1.8, 80)], element: 'thread', ignoreResist: true, desc: 'Fatebreaker. Everything, everywhere, unwritten.' },
];

export const SKILLS: Record<string, SkillDef> = Object.fromEntries(list.map((s) => [s.id, s]));

/** Character skill lists: the first ones are known from the start, the rest are learned in the tree. */
export const CHAR_SKILLS: Record<CharId, string[]> = {
  ash: ['ash_running_stitch', 'ash_pull_taut', 'ash_backstitch', 'ash_hemline', 'ash_thimble_ward', 'ash_field_mend', 'ash_cross_stitch', 'ash_blanket_stitch', 'ash_seamrender', 'ash_unfated'],
  corin: ['cor_shield_bash', 'cor_interpose', 'cor_bulwark', 'cor_last_wall', 'cor_second_helping', 'cor_rally', 'cor_millstone', 'cor_oak_and_iron', 'cor_brothers_keeper', 'cor_promise'],
  wick: ['wick_tangle', 'wick_spool_up', 'wick_fray', 'wick_red_string', 'wick_unspool', 'wick_knot', 'wick_hum', 'wick_patchwork', 'wick_bright_thread'],
  orrin: ['orr_measured_cut', 'orr_great_shear', 'orr_snap', 'orr_old_lesson', 'orr_tea_break', 'orr_unpick'],
  maudra: ['mau_bell_of_hope', 'mau_toll', 'mau_censure', 'mau_hymn', 'mau_sanctuary', 'mau_last_rites', 'mau_benediction', 'mau_heresy'],
  rook: ['rook_quickdraw', 'rook_fan', 'rook_vent', 'rook_flare', 'rook_ricochet', 'rook_deadeye', 'rook_smoke', 'rook_crucible', 'rook_penitent'],
  tess: ['tess_twin_cut', 'tess_take_it', 'tess_absolution', 'tess_scissor_rite', 'tess_sever', 'tess_hairshirt', 'tess_crosswind', 'tess_forgiven'],
};

export const START_SKILLS: Record<CharId, string[]> = {
  ash: ['ash_running_stitch', 'ash_pull_taut', 'ash_backstitch'],
  corin: ['cor_shield_bash', 'cor_interpose', 'cor_bulwark'],
  wick: ['wick_tangle', 'wick_spool_up', 'wick_fray'],
  orrin: ['orr_measured_cut', 'orr_great_shear', 'orr_snap', 'orr_old_lesson', 'orr_tea_break', 'orr_unpick'],
  maudra: ['mau_bell_of_hope', 'mau_toll', 'mau_censure', 'mau_hymn'],
  rook: ['rook_quickdraw', 'rook_fan', 'rook_vent', 'rook_flare'],
  tess: ['tess_twin_cut', 'tess_take_it', 'tess_absolution', 'tess_scissor_rite', 'tess_sever'],
};

export const WEAVES = list.filter((s) => s.owner === 'weave');

/** The basic attack every character has (free, +1 AP). */
export const BASIC: SkillDef = { id: 'basic', name: 'Attack', owner: 'class', ap: 0, target: 'enemy', anim: 'slash', qte: tap(0, 320), hits: [H(0.6, 10), H(0.6, 10)], effects: [{ k: 'ap', n: 1, on: 'self' }], desc: 'A two-beat strike. +1 AP.' };

/** Free Aim shot (not a menu skill). */
export const SHOT_POWER = 0.55;
export const SHOT_BREAK = 18;

export function skill(id: string): SkillDef | undefined {
  if (id === 'basic') return BASIC;
  return SKILLS[id] ?? patternSkills[id];
}

/** Wick's Patterns, registered at startup from the enemy roster (see registerPatterns). */
const patternSkills: Record<string, SkillDef> = {};
export function registerPattern(def: SkillDef): void {
  patternSkills[def.id] = def;
}
export function allPatterns(): SkillDef[] {
  return Object.values(patternSkills);
}

export { evenly };

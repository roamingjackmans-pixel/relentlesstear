// Shared data shapes. Content (story, world, enemies, items) is plain data written against these types; the engine
// never special-cases content by id except where a type says so.

// ------------------------------------------------------------------ ids

export type CharId = 'ash' | 'corin' | 'wick' | 'orrin' | 'maudra' | 'rook' | 'tess';
export const CHAR_IDS: CharId[] = ['ash', 'corin', 'wick', 'orrin', 'maudra', 'rook', 'tess'];

export type Element = 'phys' | 'fire' | 'ice' | 'storm' | 'earth' | 'light' | 'dark' | 'thread';
export const ELEMENTS: Element[] = ['phys', 'fire', 'ice', 'storm', 'earth', 'light', 'dark', 'thread'];

export type StatusId =
  | 'burn' // damage each turn (stacks)
  | 'freeze' // skip next turn, then thaws
  | 'shock' // takes +25% damage, may chain to neighbours
  | 'marked' // next hit +50% damage, then removed
  | 'shield' // each stack blocks one hit
  | 'empower' // +25% damage
  | 'haste' // +40% speed
  | 'slow' // -40% speed
  | 'weaken' // -25% damage
  | 'expose' // -40% defense
  | 'regen' // heal each turn
  | 'silence' // cannot use skills
  | 'curse' // dies when the countdown ends
  | 'bleed' // damage when acting
  | 'taunt' // enemies must target this one
  | 'stun'; // skip next turn (Broken uses this)

export type Expr = 'neutral' | 'smile' | 'laugh' | 'sad' | 'cry' | 'angry' | 'shock' | 'tired' | 'determined' | 'tender' | 'smirk' | 'afraid';

export type ThemeId =
  | 'village_autumn'
  | 'village_ruin'
  | 'fields_gold'
  | 'marsh_night'
  | 'mill_industrial'
  | 'cliffs_wind'
  | 'fray_surreal'
  | 'porcelain_city'
  | 'seam_storm'
  | 'underweave_deep'
  | 'spire_light'
  | 'burrow'
  | 'glass';

export type TrackId =
  | 'title'
  | 'hollowmere'
  | 'fields'
  | 'marsh'
  | 'mill'
  | 'cliffs'
  | 'fray'
  | 'spindlehold'
  | 'seam'
  | 'underweave'
  | 'spire'
  | 'worldmap'
  | 'camp'
  | 'battle'
  | 'battle2'
  | 'boss'
  | 'boss_orrin'
  | 'final_weaver'
  | 'sorrow'
  | 'lullaby'
  | 'tension'
  | 'victory'
  | 'gameover'
  | 'credits';

export type SfxId =
  | 'ui_move'
  | 'ui_ok'
  | 'ui_back'
  | 'ui_error'
  | 'step'
  | 'hit_light'
  | 'hit_heavy'
  | 'hit_crit'
  | 'slash'
  | 'thrust'
  | 'shot'
  | 'parry'
  | 'parry_perfect'
  | 'dodge'
  | 'jump'
  | 'land'
  | 'qte_perfect'
  | 'qte_good'
  | 'qte_miss'
  | 'break'
  | 'burn'
  | 'freeze'
  | 'shock'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'ap_gain'
  | 'ko'
  | 'revive'
  | 'victory_sting'
  | 'chest'
  | 'journal'
  | 'waystitch'
  | 'door'
  | 'thread_pull'
  | 'stitch'
  | 'tear_rip'
  | 'magic_light'
  | 'magic_dark'
  | 'bell'
  | 'choir'
  | 'explosion'
  | 'wind'
  | 'splash'
  | 'gear'
  | 'scissors'
  | 'level_up'
  | 'unlock'
  | 'weave'
  | 'heartbeat'
  | 'thunder';

// ------------------------------------------------------------------ story script

/** Who can speak: a party member, a named NPC id from npcs.ts, or the narrator. */
export type Speaker = CharId | string;

export type Pose = 'idle' | 'walk' | 'kneel' | 'down' | 'sit' | 'cast' | 'point' | 'look_up' | 'hug' | 'fall' | 'guard' | 'attack' | 'hurt' | 'victory' | 'reach';
export type Emote = '!' | '?' | '...' | 'note' | 'tear' | 'heart' | 'anger' | 'sweat';
export type Grade = 'normal' | 'grey' | 'warm' | 'cold' | 'dream' | 'red' | 'gold';
export type VfxKind = 'unravel' | 'stitch' | 'tear' | 'glow' | 'threads' | 'burst' | 'sparkle' | 'smoke' | 'rain_heavy' | 'petals' | 'stars';

export type Cmd =
  | { t: 'say'; who: Speaker; text: string; e?: Expr; name?: string }
  | { t: 'narrate'; text: string }
  | { t: 'think'; who: Speaker; text: string; e?: Expr }
  | { t: 'choice'; options: ChoiceOption[] }
  | { t: 'wait'; ms: number }
  | { t: 'fade'; dir: 'in' | 'out'; ms: number; color?: string }
  | { t: 'title'; text: string; sub?: string; ms?: number }
  | { t: 'music'; track: TrackId | null; fadeMs?: number }
  | { t: 'sfx'; id: SfxId }
  | { t: 'shake'; power: number; ms: number }
  | { t: 'flash'; color: string; ms: number }
  | { t: 'grade'; mode: Grade; ms?: number }
  | { t: 'actor'; id: string; x: number; face?: 'left' | 'right'; pose?: Pose; kind?: string; hidden?: boolean }
  | { t: 'walk'; id: string; x: number; speed?: number; wait?: boolean }
  | { t: 'face'; id: string; dir: 'left' | 'right' }
  | { t: 'pose'; id: string; pose: Pose }
  | { t: 'emote'; id: string; emote: Emote }
  | { t: 'hide'; id: string }
  | { t: 'camera'; x: number; ms?: number }
  | { t: 'vfx'; kind: VfxKind; x: number; y?: number; ms?: number }
  | { t: 'join'; who: CharId }
  | { t: 'leave'; who: CharId }
  | { t: 'flag'; name: string; value?: boolean | number | string }
  | { t: 'give'; item: string; n?: number }
  | { t: 'glim'; n: number }
  | { t: 'battle'; enc: string; loseOk?: boolean; noFlee?: boolean; ifLose?: Cmd[] }
  | { t: 'goto'; scene: string; x?: number }
  | { t: 'worldmap'; at?: string }
  | { t: 'bond'; who: CharId; n: number }
  | { t: 'unlock'; kind: 'class' | 'region' | 'weave' | 'outfit' | 'song'; id: string }
  | { t: 'if'; flag: string; is?: boolean | number | string; then: Cmd[]; else?: Cmd[] }
  | { t: 'save' }
  | { t: 'chapter'; n: number; name: string }
  | { t: 'heal' }
  | { t: 'ending'; route: 'mend' | 'tear' }
  | { t: 'credits' }
  | { t: 'tutorial'; id: string }
  | { t: 'shop'; id: string }
  | { t: 'camp' };

export interface ChoiceOption {
  label: string;
  cmds: Cmd[];
}

export interface Cutscene {
  id: string;
  /** Plays only once per save unless `repeat` is set (a flag `seen:<id>` is set automatically). */
  repeat?: boolean;
  cmds: Cmd[];
}

/** A bond scene: an optional camp conversation between Ash and a companion. */
export interface BondScene {
  id: string;
  who: CharId;
  /** bond level this scene raises the bond to (1..6) */
  level: number;
  /** story flag that must be set before this scene is available */
  requires: string;
  title: string;
  cmds: Cmd[];
}

/** A collectible journal page from an earlier Mender (or someone else). */
export interface Journal {
  id: string;
  title: string;
  author: string;
  text: string;
}

export interface NpcDef {
  id: string;
  name: string;
  /** look for the actor drawer: 'bobbin' | 'villager' | 'priest' | 'child' | 'elder' | 'shear' | 'ghost' | 'lio' | 'mother' | 'arbiter' | 'merchant' */
  kind: string;
  palette?: string[];
}

// ------------------------------------------------------------------ world

export type SceneObject =
  | { kind: 'chest'; id: string; x: number; loot: Loot[]; hidden?: boolean }
  | { kind: 'journal'; id: string; x: number; journal: string }
  | { kind: 'bead'; id: string; x: number } // a Glass Bead (tincture upgrade)
  | { kind: 'waystitch'; id: string; x: number; name: string; camp?: boolean }
  | { kind: 'npc'; id: string; x: number; npc: string; talk: string; face?: 'left' | 'right'; requires?: string; unless?: string }
  | { kind: 'shop'; id: string; x: number; npc: string; shop: string }
  | { kind: 'enemy'; id: string; x: number; enc: string; patrol?: number; requires?: string; unless?: string }
  | { kind: 'boss'; id: string; x: number; enc: string; before?: string; after?: string; requires?: string }
  | { kind: 'trigger'; id: string; x: number; cutscene: string; requires?: string; unless?: string }
  | { kind: 'gate'; id: string; x: number; requires: string; text: string }
  | { kind: 'prop'; x: number; prop: string; scale?: number; layer?: 'back' | 'front' }
  | { kind: 'door'; id: string; x: number; to: string; toX: number; label: string; requires?: string };

export interface Loot {
  item: string;
  n?: number;
}

export interface Exit {
  side: 'left' | 'right';
  to: string;
  toX: number;
  label?: string;
  requires?: string;
  /** text shown when `requires` is not met */
  locked?: string;
}

export interface SceneSpec {
  id: string;
  region: string;
  name: string;
  theme: ThemeId;
  width: number;
  music: TrackId;
  exits: Exit[];
  objects: SceneObject[];
  /** cutscene played on first entry */
  onEnter?: string;
  /** weather override */
  weather?: 'none' | 'rain' | 'snow' | 'embers' | 'motes' | 'petals' | 'ash' | 'threads' | 'stars';
  /** 0..1 how dark the scene is (lanterns and party glow show up more) */
  dark?: number;
}

export interface RegionSpec {
  id: string;
  name: string;
  /** position on the world map, 0..1 */
  mx: number;
  my: number;
  entry: string; // scene id
  entryX: number;
  /** flag that reveals this region on the map */
  requires: string;
  optional?: boolean;
  blurb: string;
  /** regions connected by seams on the map (for drawing) */
  links: string[];
}

export interface EncounterDef {
  id: string;
  enemies: string[];
  /** battle backdrop theme (defaults to the scene's theme) */
  theme?: ThemeId;
  music?: TrackId;
  boss?: boolean;
  noFlee?: boolean;
  /** party members that must be in the active four for this fight */
  force?: CharId[];
  /** the party for this fight is exactly these (the sparring tutorial is Ash alone) */
  only?: CharId[];
  /** a scripted fight: ends when the named enemy falls below this fraction of HP (Orrin's first duel) */
  endAtHp?: number;
  /** extra glim / xp multiplier */
  rewardMul?: number;
}

export interface ShopDef {
  id: string;
  name: string;
  stock: { item: string; price: number; requires?: string }[];
}

// ------------------------------------------------------------------ combat content

/** One hit in an attack's timeline (ms after the attack's windup ends). */
export interface HitDef {
  at: number;
  /** damage multiplier for this hit */
  power: number;
  /** 'normal' can be dodged or parried; 'jump' must be jumped; 'unblockable' can only be dodged; 'magic' can be parried or dodged */
  kind?: 'normal' | 'jump' | 'unblockable' | 'magic';
  element?: Element;
  status?: { id: StatusId; chance: number; turns?: number; stacks?: number };
}

export interface EnemyAttack {
  id: string;
  name: string;
  /** ms of telegraph before the first hit */
  windup: number;
  hits: HitDef[];
  target: 'one' | 'all' | 'random2' | 'lowest';
  /** animation style for the art: 'lunge' | 'slam' | 'cast' | 'spin' | 'shoot' | 'swoop' | 'sweep' | 'roar' */
  anim: string;
  /** relative pick weight */
  weight?: number;
  /** only used below this HP fraction */
  belowHp?: number;
  /** self effects / non-damaging */
  selfStatus?: { id: StatusId; turns?: number; stacks?: number };
  summon?: string;
  heal?: number;
  /** Wick can learn this as a Pattern when the enemy is beaten */
  pattern?: string;
}

export interface WeakPoint {
  /** offset from the enemy's feet, in its own size units (scale 1) */
  x: number;
  y: number;
  r: number;
  /** HP of a breakable part (armor); 0 = a permanent weak spot */
  hp?: number;
  name: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  /** art family + palette; see render/enemyArt.ts */
  art: string;
  size: number; // draw scale (1 = man-sized)
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  breakHp: number;
  weak: Element[];
  resist: Element[];
  absorb?: Element[];
  immune?: StatusId[];
  attacks: EnemyAttack[];
  weakPoints?: WeakPoint[];
  xp: number;
  glim: number;
  drops?: { item: string; chance: number }[];
  boss?: boolean;
  /** multi-phase bosses: at this HP fraction switch to another enemy def (full heal of the new def is NOT done) */
  phases?: { at: number; to: string; line?: string }[];
  flying?: boolean;
  lore: string;
}

// ------------------------------------------------------------------ items

export type ItemKind = 'tincture' | 'consumable' | 'material' | 'key' | 'patch' | 'weapon' | 'outfit' | 'song' | 'journal';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  desc: string;
  price?: number;
  /** weapon owner */
  who?: CharId;
}

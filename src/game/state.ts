// The save file (one campaign) and the account profile (three save slots, Tasks, unlocked classes, settings).
// Everything here is plain JSON: it goes to the server whole.
import { CHARS, LEVEL_CAP, xpToNext } from '../data/characters';
import { CLASS_MAP, classRank, classSkills } from '../data/classes';
import { PATCH_MAP, TINCTURE_BASE, WEAPON_MAP, weaponAtk, weaponPerks } from '../data/items';
import { START_SKILLS } from '../data/skills';
import { CHAR_IDS, type CharId } from '../data/types';

export type Difficulty = 'story' | 'mender' | 'unthreaded';

export interface Attrs {
  vit: number;
  might: number;
  agi: number;
  def: number;
  luck: number;
}

export interface CharSave {
  id: CharId;
  level: number;
  xp: number;
  attrs: Attrs;
  attrPts: number;
  sp: number;
  learned: string[];
  equipped: string[];
  weapon: string;
  patches: string[];
  embroideries: string[];
  cls: string | null;
  classBattles: Record<string, number>;
  outfit: string | null;
  hpFrac: number;
  bond: number;
  bondSeen: string[];
  tension?: number;
}

export interface SaveData {
  v: 1;
  created: number;
  updated: number;
  playtime: number;
  chapter: number;
  chapterName: string;
  scene: string;
  x: number;
  way: { scene: string; x: number; name: string };
  roster: CharId[];
  active: CharId[];
  chars: Record<CharId, CharSave>;
  inv: Record<string, number>;
  weapons: Record<string, number>;
  patchWins: Record<string, number>;
  learnedPatches: string[];
  tinct: Record<string, number>;
  tinctMax: Record<string, number>;
  glim: number;
  flags: Record<string, boolean | number | string>;
  journals: string[];
  songs: string[];
  patterns: string[];
  weaves: string[];
  bestiary: Record<string, number>;
  cleared: string[];
  regions: string[];
  tp: number;
  ng: number;
  difficulty: Difficulty;
  /** solo: command all four instead of only Ash */
  commandAll: boolean;
}

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  timingAid: boolean;
  shake: boolean;
  textSpeed: number; // chars per second, 0 = instant
  autoAdvance: boolean;
  reducedFlash: boolean;
  quality: 'high' | 'low';
}

export interface Profile {
  v: 1;
  slots: (SaveData | null)[];
  tasks: Record<string, number>;
  classes: string[];
  settings: Settings;
  lastSlot: number;
}

export const DEFAULT_SETTINGS: Settings = { master: 0.8, music: 0.7, sfx: 0.9, timingAid: true, shake: true, textSpeed: 55, autoAdvance: false, reducedFlash: false, quality: 'high' };

export function newProfile(): Profile {
  return { v: 1, slots: [null, null, null], tasks: {}, classes: [], settings: { ...DEFAULT_SETTINGS }, lastSlot: 0 };
}

function newChar(id: CharId, level: number): CharSave {
  const start = START_SKILLS[id];
  return {
    id,
    level,
    xp: 0,
    attrs: { vit: 0, might: 0, agi: 0, def: 0, luck: 0 },
    attrPts: (level - 1) * 3,
    sp: Math.max(0, level - 2),
    learned: [...start],
    equipped: start.slice(0, 6),
    weapon: CHARS[id].weapon,
    patches: [],
    embroideries: [],
    cls: null,
    classBattles: {},
    outfit: null,
    hpFrac: 1,
    bond: 0,
    bondSeen: [],
  };
}

/** starting levels by character (later joiners arrive at the story's level; see joinLevel) */
const START_LEVEL: Record<CharId, number> = { ash: 1, corin: 1, wick: 1, orrin: 6, maudra: 6, rook: 9, tess: 26 };

export function newSave(difficulty: Difficulty): SaveData {
  const chars = {} as Record<CharId, CharSave>;
  for (const id of CHAR_IDS) chars[id] = newChar(id, START_LEVEL[id]);
  const weapons: Record<string, number> = {};
  for (const id of CHAR_IDS) weapons[CHARS[id].weapon] = 1;
  return {
    v: 1,
    created: Date.now(),
    updated: Date.now(),
    playtime: 0,
    chapter: 0,
    chapterName: 'Prologue',
    scene: 'hm_green',
    x: 300,
    way: { scene: 'hm_green', x: 300, name: 'Hollowmere Green' },
    roster: ['ash', 'corin', 'wick', 'orrin'],
    active: ['ash', 'corin', 'wick', 'orrin'],
    chars,
    inv: { mothers_thimble: 1, honey_bun: 2 },
    weapons,
    patchWins: {},
    learnedPatches: [],
    tinct: { ...TINCTURE_BASE },
    tinctMax: { ...TINCTURE_BASE },
    glim: 50,
    flags: {},
    journals: [],
    songs: [],
    patterns: [],
    weaves: [],
    bestiary: {},
    cleared: [],
    regions: ['hollowmere'],
    tp: 4,
    ng: 0,
    difficulty,
    commandAll: false,
  };
}

/** New Game+: keep levels, gear, classes, patches; reset story. */
export function newGamePlus(old: SaveData): SaveData {
  const s = newSave(old.difficulty);
  s.ng = old.ng + 1;
  s.chars = structuredClone(old.chars);
  // bonds are lived again (their Weave Arts come back with them)
  for (const id of CHAR_IDS) {
    s.chars[id].bondSeen = [];
    s.chars[id].bond = 0;
  }
  s.inv = Object.fromEntries(Object.entries(old.inv).filter(([k]) => !['ferry_bell', 'grapple_spool', 'corins_shield', 'orrins_shears', 'ledger_page', 'lio_ribbon', 'music_box'].includes(k)));
  s.weapons = { ...old.weapons };
  s.patchWins = { ...old.patchWins };
  s.learnedPatches = [...old.learnedPatches];
  s.tinctMax = { ...old.tinctMax };
  s.tinct = { ...old.tinctMax };
  s.glim = old.glim;
  s.journals = [...old.journals];
  s.songs = [...old.songs];
  s.patterns = [...old.patterns];
  s.tp = old.tp;
  s.bestiary = { ...old.bestiary };
  s.commandAll = old.commandAll;
  return s;
}

// ------------------------------------------------------------------ inventory

export const count = (s: SaveData, item: string): number => s.inv[item] ?? 0;
export function addItem(s: SaveData, item: string, n = 1): void {
  if (WEAPON_MAP[item]) {
    if (!s.weapons[item]) s.weapons[item] = 1;
    return;
  }
  if (item === 'memory_spool') {
    s.tp += n;
    return;
  }
  s.inv[item] = (s.inv[item] ?? 0) + n;
  if (s.inv[item] <= 0) delete s.inv[item];
}
export function takeItem(s: SaveData, item: string, n = 1): boolean {
  if ((s.inv[item] ?? 0) < n) return false;
  s.inv[item] -= n;
  if (s.inv[item] <= 0) delete s.inv[item];
  return true;
}

// ------------------------------------------------------------------ stats

export interface Stats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  passives: string[];
  element: string;
  skills: string[];
}

export function passivesOf(s: SaveData, c: CharSave): string[] {
  const out: string[] = [];
  for (const p of c.patches) {
    const d = PATCH_MAP[p];
    if (d && d.passive !== 'none') out.push(d.passive);
  }
  for (const p of c.embroideries) {
    const d = PATCH_MAP[p];
    if (d && d.passive !== 'none') out.push(d.passive);
  }
  if (c.cls && CLASS_MAP[c.cls]) out.push(CLASS_MAP[c.cls].passive);
  out.push(...weaponPerks(c.weapon, s.weapons[c.weapon] ?? 1));
  return out;
}

export function statsOf(s: SaveData, id: CharId): Stats {
  const c = s.chars[id];
  const b = CHARS[id].base;
  const L = c.level;
  const wl = s.weapons[c.weapon] ?? 1;
  let maxHp = b.hp + b.hpL * L + c.attrs.vit * 12;
  let atk = b.atk + b.atkL * L + c.attrs.might * 2 + weaponAtk(c.weapon, wl);
  let def = b.def + b.defL * L + c.attrs.def * 1.5;
  let spd = b.spd + L * 0.4 + c.attrs.agi * 0.8;
  let crit = (5 + b.luck * 0.5 + c.attrs.luck * 0.5) / 100;
  const mods = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };
  const addMods = (m?: Partial<typeof mods>): void => {
    if (!m) return;
    for (const k of Object.keys(m) as (keyof typeof mods)[]) mods[k] += m[k] ?? 0;
  };
  for (const p of [...c.patches, ...c.embroideries]) addMods(PATCH_MAP[p]?.stats);
  if (c.cls) addMods(CLASS_MAP[c.cls]?.mods);
  if (c.bond >= 2) addMods({ hp: 0.05, atk: 0.05, def: 0.05, spd: 0.03 });
  const passives = passivesOf(s, c);
  if (passives.includes('crit10')) mods.crit += 0.1;
  maxHp = Math.round(maxHp * (1 + mods.hp));
  atk = Math.round(atk * (1 + mods.atk));
  def = Math.round(def * (1 + mods.def));
  spd = Math.round(spd * (1 + mods.spd));
  crit = Math.min(0.75, crit + mods.crit);
  const w = WEAPON_MAP[c.weapon];
  return { maxHp, atk, def, spd, crit, passives, element: w?.element ?? 'phys', skills: c.equipped.slice(0, 6) };
}

/** Skills a character could equip now: learned + class skills at their rank + Wick's patterns. */
export function availableSkills(s: SaveData, id: CharId): string[] {
  const c = s.chars[id];
  const out = [...c.learned];
  if (c.cls) out.push(...classSkills(c.cls, classRank(c.classBattles[c.cls] ?? 0)));
  if (id === 'wick') out.push(...s.patterns);
  return [...new Set(out)];
}

/** Thread Points used by a character's embroideries; TP is shared per character (each has s.tp). */
export function tpUsed(c: CharSave): number {
  return c.embroideries.reduce((n, p) => n + (PATCH_MAP[p]?.tp ?? 0), 0);
}
export function tpTotal(s: SaveData, c: CharSave): number {
  return s.tp + Math.floor(c.level / 3);
}

export function gainXp(s: SaveData, id: CharId, xp: number): number {
  const c = s.chars[id];
  let ups = 0;
  c.xp += xp;
  while (c.level < LEVEL_CAP && c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    c.level++;
    c.attrPts += 3;
    c.sp += 1;
    ups++;
  }
  return ups;
}

/** A character joining later is caught up to the party's average level. */
export function catchUp(s: SaveData, id: CharId): void {
  const others = s.roster.filter((r) => r !== id).map((r) => s.chars[r].level);
  const avg = others.length ? Math.round(others.reduce((a, b) => a + b, 0) / others.length) : 1;
  const c = s.chars[id];
  while (c.level < avg) {
    c.level++;
    c.attrPts += 3;
    c.sp += 1;
  }
}

export const flagOn = (s: SaveData, f: string): boolean => !!s.flags[f];

/** Combine two copies of one account's profile: per slot the newer save wins (or, for offline play brought into an
 *  account, offline saves only fill empty slots); Tasks keep the higher count; unlocked classes add up. */
export function mergeProfiles(base: Profile, other: Profile, fillOnly: boolean): Profile {
  const out: Profile = { ...base, slots: [...base.slots], tasks: { ...base.tasks }, classes: [...base.classes] };
  for (let i = 0; i < Math.max(out.slots.length, other.slots.length); i++) {
    const a = out.slots[i] ?? null;
    const b = other.slots[i] ?? null;
    if (!b) continue;
    if (!a || (!fillOnly && (b.updated ?? 0) > (a.updated ?? 0))) out.slots[i] = b;
  }
  for (const [k, n] of Object.entries(other.tasks)) out.tasks[k] = Math.max(out.tasks[k] ?? 0, n);
  for (const c of other.classes) if (!out.classes.includes(c)) out.classes.push(c);
  return out;
}

export function restoreParty(s: SaveData): void {
  for (const id of s.roster) s.chars[id].hpFrac = 1;
  s.tinct = { ...s.tinctMax };
  s.cleared = [];
}

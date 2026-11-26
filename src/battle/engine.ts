// The battle rules. Pure functions over BState (plain JSON). Randomness comes from hashing the state's seed with
// the turn and per-hit keys, so the same state + the same inputs always give the same result on every client.
import { ENEMIES } from '../data/enemies';
import { BASIC, SHOT_BREAK, SHOT_POWER, skill, type SkillDef } from '../data/skills';
import type { CharId, Element, EncounterDef, EnemyAttack, EnemyDef, StatusId } from '../data/types';
import { statsOf, type SaveData } from '../game/state';
import { hashStr, rng } from '../core/util';
import type { BState, Defense, EnemyPlan, Ev, PAction, Quality, Status, Unit, WP } from './types';
import { CHARS } from '../data/characters';

export const MAX_AP = 9;
export const WEAVE_MAX = 300;
const NEGATIVE: StatusId[] = ['burn', 'freeze', 'shock', 'marked', 'slow', 'weaken', 'expose', 'silence', 'curse', 'bleed', 'stun'];
const BUFFS: StatusId[] = ['shield', 'empower', 'haste', 'regen', 'taunt'];
const QMUL: Record<Quality, number> = { perfect: 1.3, good: 1.0, miss: 0.7 };
const QHEAL: Record<Quality, number> = { perfect: 1.15, good: 1.0, miss: 0.85 };
const DIFF_DMG = { story: 0.7, mender: 1.0, unthreaded: 1.3 };

// ------------------------------------------------------------------ randomness

export function rnd(st: BState, ...keys: (string | number)[]): number {
  return rng(hashStr(`${st.seed}|${st.turn}|${keys.join('|')}`))();
}

// ------------------------------------------------------------------ helpers

export const unit = (st: BState, uid: string): Unit | undefined => st.units.find((u) => u.uid === uid);
export const alive = (st: BState, side: 'party' | 'enemy'): Unit[] => st.units.filter((u) => u.side === side && !u.ko);
export const has = (u: Unit, id: StatusId): boolean => u.statuses.some((s) => s.id === id && (s.turns > 0 || s.stacks > 0));
export const stacks = (u: Unit, id: StatusId): number => u.statuses.find((s) => s.id === id)?.stacks ?? 0;
export const hasP = (u: Unit, p: string): boolean => u.passives.includes(p);

function removeStatus(u: Unit, id: StatusId): void {
  u.statuses = u.statuses.filter((s) => s.id !== id);
}

export function effSpd(u: Unit): number {
  let s = u.spd;
  if (has(u, 'haste')) s *= 1.4;
  if (has(u, 'slow')) s *= 0.6;
  return Math.max(10, s);
}

/** The next n turns (uids) without changing the state. */
export function timeline(st: BState, n = 10): string[] {
  const nx = new Map(st.units.filter((u) => !u.ko).map((u) => [u.uid, u.next]));
  const out: string[] = [];
  for (let i = 0; i < n && nx.size; i++) {
    let best: string | null = null;
    let bt = Infinity;
    for (const [uid, t] of nx) {
      if (t < bt - 1e-6 || (Math.abs(t - bt) < 1e-6 && uid < (best ?? '~'))) {
        best = uid;
        bt = t;
      }
    }
    if (!best) break;
    out.push(best);
    const u = unit(st, best)!;
    nx.set(best, bt + 1000 / effSpd(u));
  }
  return out;
}

function tally(st: BState, u: Unit, key: string, n = 1): void {
  if (u.side !== 'party') return;
  const who = u.ctrl === 'ai' ? 'host' : u.ctrl;
  const t = (st.tally[who] ??= {});
  t[key] = (t[key] ?? 0) + n;
}

// ------------------------------------------------------------------ creation

export interface CreateOpts {
  seed: number;
  first: 'party' | 'enemy' | null;
  ctrl: Partial<Record<CharId, string>>;
  party: CharId[];
}

/** Global tuning: enemy HP as authored is a little high for snappy fights (see tests/balance.test.ts). */
export const ENEMY_HP_SCALE = 0.68;
export const BOSS_HP_SCALE = 0.5;

function enemyUnit(def: EnemyDef, uid: string, ng: number): Unit {
  const hpMul = (1 + 0.5 * ng) * (def.boss ? BOSS_HP_SCALE : ENEMY_HP_SCALE);
  const atkMul = 1 + 0.3 * ng;
  return {
    uid,
    side: 'enemy',
    id: def.id,
    name: def.name,
    art: def.art,
    size: def.size,
    level: def.level + 10 * ng,
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    atk: Math.round(def.atk * atkMul),
    def: Math.round(def.def * (1 + 0.2 * ng)),
    spd: def.spd,
    crit: 0.05,
    ap: 0,
    statuses: [],
    ko: false,
    next: 0,
    skills: [],
    passives: [],
    element: 'phys',
    ctrl: 'ai',
    guard: 0,
    tension: 0,
    verses: [],
    heat: 0,
    penance: 0,
    frayed: false,
    freeShots: false,
    shotsThisTurn: 0,
    secondWindUsed: false,
    metronome: 0,
    firstThreadAp: false,
    stitches: 0,
    brk: 0,
    breakHp: Math.round(def.breakHp * hpMul),
    broken: false,
    weak: [...def.weak],
    resist: [...def.resist],
    absorb: [...(def.absorb ?? [])],
    immune: [...(def.immune ?? [])],
    wps: (def.weakPoints ?? []).map((w) => ({ x: w.x, y: w.y, r: w.r, hp: w.hp ?? 0, maxHp: w.hp ?? 0, name: w.name })),
    boss: !!def.boss,
    flying: !!def.flying,
    xp: def.xp,
    glim: def.glim,
  };
}

export function partyUnit(save: SaveData, id: CharId, uid: string, ctrl: string): Unit {
  const s = statsOf(save, id);
  const c = save.chars[id];
  const hp = Math.max(0, Math.round(s.maxHp * c.hpFrac));
  return {
    uid,
    side: 'party',
    id,
    name: CHARS[id].short,
    art: `party:${id}`,
    size: 1,
    level: c.level,
    hp,
    maxHp: s.maxHp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    crit: s.crit,
    ap: 1,
    statuses: [],
    ko: hp <= 0,
    next: 0,
    skills: s.skills,
    passives: s.passives,
    element: s.element as Unit['element'],
    ctrl,
    guard: 0,
    tension: 0,
    verses: [],
    heat: 0,
    penance: 0,
    frayed: false,
    freeShots: false,
    shotsThisTurn: 0,
    secondWindUsed: false,
    metronome: 0,
    firstThreadAp: false,
    stitches: 0,
    brk: 0,
    breakHp: 0,
    broken: false,
    weak: [],
    resist: [],
    absorb: [],
    immune: [],
    wps: [],
    boss: false,
    flying: false,
    xp: 0,
    glim: 0,
  };
}

export function createBattle(save: SaveData, enc: EncounterDef, o: CreateOpts, theme: BState['theme'], music: BState['music']): BState {
  const st: BState = {
    seed: o.seed >>> 0,
    turn: 0,
    time: 0,
    units: [],
    weave: 0,
    phase: 'turn',
    actor: null,
    enc: enc.id,
    theme: enc.theme ?? theme,
    music: enc.music ?? (enc.boss ? 'boss' : music),
    difficulty: save.difficulty,
    ng: save.ng,
    first: o.first,
    endAtHp: enc.endAtHp ?? null,
    noFlee: !!(enc.noFlee || enc.boss),
    boss: !!enc.boss,
    tally: {},
    learned: [],
    banner: null,
    enemyCount: 0,
  };
  o.party.forEach((id, i) => st.units.push(partyUnit(save, id, `p${i}`, o.ctrl[id] ?? 'ai')));
  enc.enemies.forEach((eid, i) => {
    const def = ENEMIES[eid];
    if (def) st.units.push(enemyUnit(def, `e${i}`, save.ng));
  });
  st.enemyCount = enc.enemies.length;
  // start-of-battle passives
  for (const u of st.units.filter((x) => x.side === 'party' && !x.ko)) {
    if (hasP(u, 'first_light')) u.ap += 1;
    if (hasP(u, 'grandmothers_knot')) {
      u.ap += 2;
      addStatus(u, 'shield', 1, 1);
      addStatus(u, 'regen', 3, 1);
    }
    if (hasP(u, 'thimble_guard') || hasP(u, 'warden')) addStatus(u, 'shield', 1, 1);
    if (hasP(u, 'running_start')) addStatus(u, 'haste', 2, 1);
    if (hasP(u, 'regen_start')) addStatus(u, 'regen', 3, 1);
    if (hasP(u, 'guard_plus')) u.guard = 1;
    if (hasP(u, 'tension_plus')) u.tension = 30;
    if (hasP(u, 'heat_start')) u.heat = 3;
    if (hasP(u, 'penance_start')) u.penance = 20;
    if (hasP(u, 'verse_start')) u.verses.push('hope');
    u.ap = Math.min(MAX_AP, u.ap);
  }
  // initial turn order
  for (const u of st.units) u.next = (1000 / effSpd(u)) * (0.25 + 0.75 * rnd(st, 'init', u.uid));
  if (o.first === 'party') {
    for (const u of st.units) if (u.side === 'enemy') u.next += 14;
    const amb = st.units.some((u) => u.side === 'party' && hasP(u, 'ambusher'));
    const avgAtk = alive(st, 'party').reduce((a, u) => a + u.atk, 0) / Math.max(1, alive(st, 'party').length);
    for (const e of alive(st, 'enemy')) {
      const n = Math.round(avgAtk * 1.1 * (amb ? 2 : 1) * (100 / (100 + e.def)) * (e.boss ? 0.5 : 1));
      e.hp = Math.max(1, e.hp - n);
    }
  } else if (o.first === 'enemy') {
    for (const u of st.units) if (u.side === 'party') u.next += 14;
  }
  return st;
}

// ------------------------------------------------------------------ statuses

export function addStatus(u: Unit, id: StatusId, turns: number, n: number): void {
  const cur = u.statuses.find((s) => s.id === id);
  const maxStacks = id === 'burn' ? 10 : id === 'shield' ? 5 : 1;
  if (cur) {
    cur.turns = Math.max(cur.turns, turns);
    cur.stacks = Math.min(maxStacks, cur.stacks + n);
  } else u.statuses.push({ id, turns, stacks: Math.min(maxStacks, Math.max(1, n)) });
}

function tryStatus(st: BState, src: Unit | null, u: Unit, id: StatusId, turns: number, n: number, chance: number, key: string, evs: Ev[]): boolean {
  if (u.ko) return false;
  if (u.immune.includes(id)) return false;
  if (u.side === 'party') {
    if (id === 'burn' && hasP(u, 'ember_lining')) return false;
    if (id === 'freeze' && hasP(u, 'wool_lining')) return false;
    if (id === 'shock' && hasP(u, 'copper_thread')) return false;
  }
  let c = chance;
  if (u.boss && (id === 'stun' || id === 'freeze')) c *= id === 'stun' ? 0.4 : 0.3;
  if (rnd(st, 'st', key, u.uid, id) >= c) return false;
  addStatus(u, id, id === 'burn' || id === 'shield' ? Math.max(turns, 3) : turns, n);
  evs.push({ e: 'status', uid: u.uid, id, stacks: n });
  if (src && src.side === 'party') {
    if (id === 'burn') tally(st, src, 'burn');
    if (id === 'freeze') tally(st, src, 'freeze');
  }
  return true;
}

// ------------------------------------------------------------------ turn flow

export interface TurnStart {
  uid: string;
  skip: boolean;
  evs: Ev[];
}

/** Advance to the next unit's turn and apply its start-of-turn effects. */
export function startTurn(st: BState): TurnStart | null {
  const order = timeline(st, 1);
  if (!order.length) return null;
  const u = unit(st, order[0])!;
  st.time = u.next;
  st.actor = u.uid;
  st.turn++;
  const evs: Ev[] = [];
  u.shotsThisTurn = 0;
  u.freeShots = false;
  u.firstThreadAp = false;
  if (u.side === 'party') {
    u.ap = Math.min(MAX_AP, u.ap + 1);
    if (hasP(u, 'slow_mending')) heal(st, u, u, u.maxHp * 0.04, evs, false);
    if (hasP(u, 'clean_hands')) {
      const bad = u.statuses.find((s) => NEGATIVE.includes(s.id));
      if (bad) {
        removeStatus(u, bad.id);
        evs.push({ e: 'unstatus', uid: u.uid, id: bad.id });
      }
    }
  }
  // damage and healing over time
  const burn = stacks(u, 'burn');
  if (burn > 0) {
    const pyre = u.side === 'enemy' && st.units.some((p) => p.side === 'party' && hasP(p, 'pyrewright'));
    const pct = u.side === 'party' ? 0.04 : u.boss ? 0.012 : 0.035;
    const n = Math.max(1, Math.round(u.maxHp * pct * burn * (pyre ? 1.5 : 1)));
    hurt(st, null, u, n, evs, { el: 'fire' });
    const s = u.statuses.find((x) => x.id === 'burn');
    if (s) {
      s.stacks = Math.floor(s.stacks / 2);
      if (s.stacks <= 0) removeStatus(u, 'burn');
    }
  }
  if (has(u, 'regen') && !u.ko) heal(st, u, u, u.maxHp * (u.side === 'party' ? 0.06 : 0.03), evs, false);
  if (has(u, 'curse')) {
    const s = u.statuses.find((x) => x.id === 'curse')!;
    s.turns--;
    if (s.turns <= 0 && !u.ko) {
      u.hp = 0;
      u.ko = true;
      evs.push({ e: 'ko', uid: u.uid });
    }
  }
  if (u.ko) return { uid: u.uid, skip: true, evs };
  // lose the turn
  if (u.broken) {
    u.broken = false;
    u.brk = 0;
    evs.push({ e: 'skip', uid: u.uid, why: 'Broken' });
    return { uid: u.uid, skip: true, evs };
  }
  for (const id of ['freeze', 'stun'] as StatusId[]) {
    if (has(u, id)) {
      removeStatus(u, id);
      evs.push({ e: 'unstatus', uid: u.uid, id });
      evs.push({ e: 'skip', uid: u.uid, why: id === 'freeze' ? 'Frozen' : 'Stunned' });
      return { uid: u.uid, skip: true, evs };
    }
  }
  return { uid: u.uid, skip: false, evs };
}

/** Finish a unit's turn: tick statuses, schedule its next turn, check for the end. */
export function endTurn(st: BState, uid: string): Ev[] {
  const u = unit(st, uid);
  const evs: Ev[] = [];
  if (u) {
    for (const s of u.statuses) if (!['burn', 'shield', 'marked', 'curse'].includes(s.id)) s.turns--;
    const gone = u.statuses.filter((s) => !['burn', 'shield', 'marked', 'curse'].includes(s.id) && s.turns <= 0);
    for (const g of gone) evs.push({ e: 'unstatus', uid: u.uid, id: g.id });
    u.statuses = u.statuses.filter((s) => !gone.includes(s));
    u.next = st.time + 1000 / effSpd(u);
    u.freeShots = false;
  }
  st.actor = null;
  const end = checkEnd(st);
  if (end) evs.push({ e: 'end', result: end });
  return evs;
}

export function checkEnd(st: BState): BState['phase'] | null {
  if (st.phase !== 'turn') return st.phase;
  if (!alive(st, 'party').length) st.phase = 'lost';
  else if (!alive(st, 'enemy').length) st.phase = 'won';
  return st.phase === 'turn' ? null : st.phase;
}

// ------------------------------------------------------------------ damage and healing core

interface HurtOpts {
  el?: string;
  crit?: boolean;
  weak?: boolean;
  resist?: boolean;
  src?: string;
  pierce?: boolean;
}

/** Apply damage (already computed). Handles Shield, Second Wind, KO, Penance, phases. */
function hurt(st: BState, src: Unit | null, u: Unit, n: number, evs: Ev[], o: HurtOpts = {}): number {
  if (u.ko || n <= 0) return 0;
  if (!o.pierce && src && has(u, 'shield')) {
    const s = u.statuses.find((x) => x.id === 'shield')!;
    s.stacks--;
    if (s.stacks <= 0) removeStatus(u, 'shield');
    evs.push({ e: 'dmg', uid: u.uid, n: 0, blocked: true });
    tally(st, u, 'shield');
    if (hasP(u, 'mirror_thread') && src && !src.ko) {
      const back = Math.round(u.atk * 0.8 * (100 / (100 + src.def)));
      hurt(st, null, src, back, evs, { src: u.uid });
    }
    return 0;
  }
  n = Math.max(1, Math.round(n));
  if (u.side === 'party' && u.hp - n <= 0 && hasP(u, 'second_wind') && !u.secondWindUsed && u.hp > 1) {
    u.secondWindUsed = true;
    n = u.hp - 1;
    evs.push({ e: 'text', uid: u.uid, text: 'Second Wind', color: '#ffe08a' });
  }
  u.hp -= n;
  evs.push({ e: 'dmg', uid: u.uid, n, crit: o.crit, weak: o.weak, resist: o.resist, el: o.el as Element | undefined, src: o.src });
  if (u.side === 'party' && u.id === 'tess' && !u.ko) {
    u.penance = Math.min(100, u.penance + Math.round((n / u.maxHp) * 150));
    evs.push({ e: 'res', uid: u.uid, what: 'penance' });
  }
  if (u.side === 'enemy') {
    // phases: a boss never skips a phase
    const def = ENEMIES[u.id];
    const ph = def?.phases?.find((p) => u.hp <= p.at * u.maxHp);
    if (ph && ENEMIES[ph.to]) {
      if (u.hp <= 0) u.hp = 1;
      transform(u, ENEMIES[ph.to], st.ng);
      evs.push({ e: 'phase', uid: u.uid, to: ph.to, line: ph.line });
      st.banner = ph.line ?? null;
    }
    if (st.endAtHp != null && (u.boss || st.units.filter((x) => x.side === 'enemy').length === 1) && u.hp / u.maxHp <= st.endAtHp) {
      u.hp = Math.max(1, u.hp);
      st.phase = 'scripted';
      evs.push({ e: 'end', result: 'scripted' });
      return n;
    }
  }
  if (u.hp <= 0) {
    u.hp = 0;
    u.ko = true;
    u.statuses = [];
    evs.push({ e: 'ko', uid: u.uid });
    if (u.side === 'enemy') onEnemyDown(st, src, u, evs);
    else {
      u.ap = 0;
      u.guard = 0;
      u.verses = [];
      u.heat = 0;
    }
  }
  return n;
}

function transform(u: Unit, def: EnemyDef, ng: number): void {
  u.id = def.id;
  u.name = def.name;
  u.art = def.art;
  u.size = def.size;
  u.atk = Math.round(def.atk * (1 + 0.3 * ng));
  u.def = Math.round(def.def * (1 + 0.2 * ng));
  u.spd = def.spd;
  u.weak = [...def.weak];
  u.resist = [...def.resist];
  u.absorb = [...(def.absorb ?? [])];
  u.immune = [...(def.immune ?? [])];
  u.wps = (def.weakPoints ?? []).map((w) => ({ x: w.x, y: w.y, r: w.r, hp: w.hp ?? 0, maxHp: w.hp ?? 0, name: w.name }));
  u.breakHp = Math.round(def.breakHp * (1 + 0.5 * ng) * (def.boss ? BOSS_HP_SCALE : ENEMY_HP_SCALE));
  u.brk = 0;
  u.broken = false;
  u.statuses = u.statuses.filter((s) => s.id === 'burn' || s.id === 'shock');
}

function onEnemyDown(st: BState, src: Unit | null, u: Unit, evs: Ev[]): void {
  const def = ENEMIES[u.id];
  const wick = st.units.find((p) => p.side === 'party' && p.id === 'wick' && !p.ko);
  if (wick && def) {
    for (const a of def.attacks) if (a.pattern && !st.learned.includes(a.pattern)) st.learned.push(a.pattern);
  }
  if (src && src.side === 'party' && hasP(src, 'harvest')) gainAp(src, 1, evs);
  if (stacks(u, 'burn') > 0 || u.statuses.length === 0) {
    const spreader = st.units.find((p) => p.side === 'party' && hasP(p, 'wildfire'));
    if (spreader) for (const e of alive(st, 'enemy')) tryStatus(st, spreader, e, 'burn', 3, 2, 1, `wf${u.uid}`, evs);
  }
}

function heal(st: BState, src: Unit, u: Unit, amount: number, evs: Ev[], fromSkill = true): number {
  if (u.ko) return 0;
  let n = amount;
  if (fromSkill) {
    if (hasP(src, 'healers_thread')) n *= 1.25;
    if (hasP(src, 'chirurgeon')) n *= 1.25;
  }
  n = Math.round(Math.min(n, u.maxHp - u.hp));
  if (n <= 0) return 0;
  u.hp += n;
  evs.push({ e: 'heal', uid: u.uid, n });
  tally(st, src, 'healed', n);
  if (fromSkill && hasP(src, 'chirurgeon')) addStatus(u, 'regen', 1, 1);
  return n;
}

function revive(st: BState, src: Unit, u: Unit, pct: number, evs: Ev[]): void {
  if (!u.ko) return;
  u.ko = false;
  u.hp = Math.max(1, Math.round(u.maxHp * pct));
  u.statuses = [];
  u.next = st.time + 1000 / effSpd(u) * 0.5;
  evs.push({ e: 'revive', uid: u.uid });
  evs.push({ e: 'heal', uid: u.uid, n: u.hp });
  if (hasP(u, 'rekindle')) gainAp(u, 3, evs);
  tally(st, src, 'healed', u.hp);
}

export function gainAp(u: Unit, n: number, evs: Ev[]): void {
  const before = u.ap;
  u.ap = Math.max(0, Math.min(MAX_AP, u.ap + n));
  if (u.ap !== before) evs.push({ e: 'ap', uid: u.uid, n: u.ap - before });
}

function addWeave(st: BState, u: Unit, n: number): void {
  const bright = st.units.some((p) => p.side === 'party' && hasP(p, 'bright_weave'));
  st.weave = Math.min(WEAVE_MAX, st.weave + n * (bright ? 1.25 : 1) * (hasP(u, 'cantor') ? 1.5 : 1));
}

/** Damage a party unit deals to an enemy with one hit. Returns the events (and applies them). */
function strike(st: BState, a: Unit, t: Unit, power: number, sk: SkillDef | null, q: Quality, key: string, evs: Ev[], extra: { el?: string; brk?: number; shot?: boolean; counter?: boolean } = {}): number {
  if (t.ko) return 0;
  const el = (extra.el ?? sk?.element ?? (sk?.id === 'basic' && hasP(a, 'storm_hem') ? 'storm' : a.element)) as Unit['element'];
  const ignoreRes = !!sk?.ignoreResist || hasP(a, 'fatebreaker') || hasP(a, 'ignore_resist');
  let mul = 1;
  let weak = false;
  let resist = false;
  if (t.weak.includes(el)) {
    mul *= 1.5;
    weak = true;
  } else if (!ignoreRes && t.absorb.includes(el)) {
    const n = Math.round(a.atk * power * 0.5);
    heal(st, t, t, n, evs, false);
    evs.push({ e: 'text', uid: t.uid, text: 'Absorbed', color: '#9be8a0' });
    return 0;
  } else if (!ignoreRes && t.resist.includes(el)) {
    mul *= 0.5;
    resist = true;
  }
  if (has(a, 'empower')) mul *= 1.25;
  if (has(a, 'weaken')) mul *= 0.75;
  if (has(t, 'shock')) mul *= 1.25;
  if (t.broken) mul *= 1.5;
  if (hasP(a, 'rimeweaver') && has(t, 'freeze')) mul *= 1.3;
  if (hasP(a, 'ragged') && a.hp < a.maxHp * 0.4) mul *= 1.4;
  if (hasP(a, 'last_stand') && alive(st, 'party').length === 1) mul *= 1.4;
  if (hasP(a, 'coup_de_grace') && t.hp < t.maxHp * 0.3) mul *= 1.3;
  if (hasP(a, 'glass_needle')) mul *= 1.25;
  if (hasP(a, 'metronome')) mul *= 1 + 0.05 * Math.min(10, a.metronome);
  if (sk?.id === 'basic' && hasP(a, 'storm_hem')) mul *= 1.1;
  if (sk?.owner === 'pattern' && hasP(a, 'pattern_plus')) mul *= 1.2;
  if (sk?.effects?.some((e) => e.k === 'pull') && hasP(a, 'pull_plus')) mul *= 1.2;
  if (sk?.id === 'cor_last_wall' && hasP(a, 'last_wall_plus')) mul *= 1.25;
  if (sk?.id === 'cl_shatter' && t.broken) mul *= 2;
  if (sk?.id === 'cl_headhunter' && has(t, 'marked')) mul *= 2;
  if (extra.shot && (hasP(a, 'sharp_eye') || a.freeShots)) mul *= 1.5;
  if (extra.counter) mul *= (hasP(a, 'counterweight') ? 1.5 : 1) * (hasP(a, 'duelist') ? 1.4 : 1);
  if (has(t, 'marked')) {
    mul *= 1.5;
    removeStatus(t, 'marked');
  }
  if (has(t, 'expose') && !t.boss) mul *= 1.0;
  const defEff = t.def * (has(t, 'expose') ? 0.6 : 1);
  let n = a.atk * power * QMUL[q] * mul * (100 / (100 + defEff));
  const critChance = a.crit + (sk?.crit ?? 0);
  const crit = rnd(st, 'crit', key, t.uid) < critChance;
  if (crit) n *= 1.5;
  n *= 0.94 + 0.12 * rnd(st, 'var', key, t.uid);
  const dealt = hurt(st, a, t, n, evs, { el, crit, weak, resist, src: a.uid, pierce: sk?.pierce });
  if (el === 'storm' && dealt > 0) tally(st, a, 'storm');
  // break
  let brk = (extra.brk ?? 0) * QMUL[q];
  if (hasP(a, 'breaker')) brk *= 1.3;
  if (hasP(a, 'shatterhand')) brk *= 1.5;
  if (!t.ko && !t.broken && brk > 0 && t.breakHp > 0) {
    t.brk += brk;
    if (t.brk >= t.breakHp) {
      t.broken = true;
      t.brk = t.breakHp;
      evs.push({ e: 'break', uid: t.uid });
      tally(st, a, 'breaks');
      addWeave(st, a, 20);
      if (hasP(a, 'shatterpoint')) gainAp(a, 2, evs);
    }
  }
  // storm arcs
  if (dealt > 0 && hasP(a, 'stormstitcher') && has(t, 'shock')) {
    const others = alive(st, 'enemy').filter((e) => e.uid !== t.uid);
    if (others.length) {
      const o = others[Math.floor(rnd(st, 'arc', key) * others.length)];
      hurt(st, a, o, dealt * 0.3, evs, { el: 'storm', src: a.uid });
    }
  }
  if (dealt > 0 && hasP(a, 'leech') && sk && sk.id !== 'basic') heal(st, a, a, dealt * 0.08, evs, false);
  return dealt;
}

// ------------------------------------------------------------------ party actions

export interface ActCtx {
  uid: string;
  act: PAction;
  sk: SkillDef;
  targets: string[];
  scale: number;
  frayMul: number;
  quals: Quality[];
  stitchedBefore: number;
  dealt: number;
  error?: string;
}

/** Why a skill can't be used right now (null = it can). */
export function cannotUse(st: BState, u: Unit, sk: SkillDef): string | null {
  if (sk.weave) {
    const partner = st.units.find((p) => p.side === 'party' && p.id === sk.weave!.with && !p.ko);
    const ash = st.units.find((p) => p.side === 'party' && p.id === 'ash' && !p.ko);
    if (!partner || !ash) return `Needs Ash and ${CHARS[sk.weave.with].short} standing`;
    if (u.id !== 'ash' && u.id !== sk.weave.with) return 'Only Ash or her partner can start it';
    if (st.weave < sk.weave.segs * 100) return `Needs ${sk.weave.segs} Weave`;
    return null;
  }
  if (has(u, 'silence') && sk.id !== 'basic') return 'Silenced';
  if (u.ap < sk.ap) return `Needs ${sk.ap} AP`;
  if (sk.need) {
    const v = sk.need.res === 'verses' ? u.verses.length : sk.need.res === 'tension' ? u.tension : sk.need.res === 'heat' ? u.heat : sk.need.res === 'penance' ? u.penance : u.guard;
    if (v < sk.need.min) return `Needs ${sk.need.min} ${sk.need.res === 'verses' ? 'verses' : sk.need.res}`;
  }
  if (sk.target === 'ally_ko' && !st.units.some((p) => p.side === 'party' && p.ko)) return 'Nobody has fallen';
  return null;
}

/** Valid targets for a skill. */
export function validTargets(st: BState, u: Unit, sk: SkillDef): Unit[] {
  switch (sk.target) {
    case 'enemy':
    case 'all_enemies':
    case 'random_enemies':
      return alive(st, 'enemy');
    case 'ally':
    case 'all_allies':
      return alive(st, 'party');
    case 'self':
      return [u];
    case 'ally_ko':
      return st.units.filter((p) => p.side === 'party' && p.ko);
  }
}

function scaleValue(st: BState, u: Unit, t: Unit | undefined, sk: SkillDef): number {
  switch (sk.scale?.by) {
    case 'stitch':
      return 0; // handled per target on the last hit
    case 'guard':
      return u.guard;
    case 'tension':
      return u.tension;
    case 'heat':
      return u.heat;
    case 'penance':
      return u.penance;
    case 'missing_hp':
      return Math.round((1 - u.hp / u.maxHp) * 100);
    case 'burn':
      return t ? stacks(t, 'burn') : 0;
    default:
      return 0;
  }
}

export function beginAction(st: BState, uid: string, act: PAction): ActCtx {
  const u = unit(st, uid)!;
  const sk = act.k === 'skill' ? skill(act.id) ?? BASIC : BASIC;
  const ctx: ActCtx = { uid, act, sk, targets: [], scale: 0, frayMul: 1, quals: [], stitchedBefore: 0, dealt: 0 };
  if (act.k !== 'skill') return ctx;
  const why = cannotUse(st, u, sk);
  if (why) {
    ctx.error = why;
    return ctx;
  }
  const t = unit(st, act.target);
  if (sk.target === 'enemy' || sk.target === 'ally' || sk.target === 'ally_ko') ctx.targets = t ? [t.uid] : [];
  else if (sk.target === 'self') ctx.targets = [u.uid];
  else if (sk.target === 'all_enemies') ctx.targets = alive(st, 'enemy').map((e) => e.uid);
  else if (sk.target === 'all_allies') ctx.targets = st.units.filter((p) => p.side === 'party' && (!p.ko || sk.effects?.some((e) => e.k === 'revive'))).map((p) => p.uid);
  else ctx.targets = alive(st, 'enemy').map((e) => e.uid);
  if (!ctx.targets.length) {
    ctx.error = 'No target';
    return ctx;
  }
  // pay
  if (sk.weave) st.weave -= sk.weave.segs * 100;
  else u.ap -= sk.ap;
  ctx.scale = scaleValue(st, u, t, sk);
  ctx.stitchedBefore = t?.stitches ?? 0;
  if (u.frayed && sk.id !== 'wick_fray' && (sk.hits.length || sk.effects?.some((e) => e.k === 'heal'))) {
    ctx.frayMul = sk.id === 'wick_bright_thread' ? 2 : 1.5;
    u.frayed = false;
  }
  return ctx;
}

/** Targets struck by hit i (random_enemies picks one per hit). */
export function hitTargets(st: BState, ctx: ActCtx, i: number): string[] {
  if (ctx.sk.target === 'random_enemies') {
    const al = alive(st, 'enemy');
    if (!al.length) return [];
    return [al[Math.floor(rnd(st, 'rt', ctx.uid, i) * al.length)].uid];
  }
  if (ctx.sk.target === 'all_enemies') return ctx.targets.filter((id) => !unit(st, id)?.ko);
  return ctx.targets.filter((id) => !unit(st, id)?.ko);
}

const isPull = (sk: SkillDef): boolean => !!sk.effects?.some((e) => e.k === 'pull');

/** Resolve hit i of a party action with its timing quality. */
export function actHit(st: BState, ctx: ActCtx, i: number, q: Quality): Ev[] {
  const evs: Ev[] = [];
  const u = unit(st, ctx.uid)!;
  ctx.quals[i] = q;
  if (q === 'perfect') {
    tally(st, u, 'perfects');
    addWeave(st, u, 8);
    u.metronome++;
    if (hasP(u, 'cantor')) heal(st, u, u, u.maxHp * 0.02, evs, false);
    if (hasP(u, 'first_thread') && !u.firstThreadAp) {
      u.firstThreadAp = true;
      gainAp(u, 1, evs);
    }
  } else if (q === 'miss') u.metronome = 0;
  const hit = ctx.sk.hits[i];
  if (!hit) return evs;
  const last = i === ctx.sk.hits.length - 1;
  const stitchFx = ctx.sk.effects?.find((e) => e.k === 'stitch') as { k: 'stitch'; n: number; on?: string } | undefined;
  for (const tid of hitTargets(st, ctx, i)) {
    const t = unit(st, tid)!;
    let p = hit.power * ctx.frayMul;
    if (ctx.sk.scale && ctx.sk.scale.by !== 'stitch' && ctx.sk.scale.by !== 'burn') p *= 1 + ctx.sk.scale.per * ctx.scale;
    if (ctx.sk.scale?.by === 'burn') p *= 1 + ctx.sk.scale.per * stacks(t, 'burn');
    if (ctx.sk.scale?.by === 'stitch' && last) p *= 1 + ctx.sk.scale.per * t.stitches;
    const dealt = strike(st, u, t, p, ctx.sk, q, `${ctx.uid}h${i}`, evs, { brk: hit.brk });
    ctx.dealt += dealt;
    if (ctx.sk.id === 'basic' && hasP(u, 'ember_hem')) tryStatus(st, u, t, 'burn', 3, 1, 1, `eh${i}`, evs);
    if (ctx.sk.id === 'basic' && hasP(u, 'frost_hem')) tryStatus(st, u, t, 'freeze', 1, 1, 0.15, `fh${i}`, evs);
    // Ash's stitches go in hit by hit; pull skills consume them on the last hit
    if (u.id === 'ash' && !t.ko) {
      const cap = hasP(u, 'stitch_cap') ? 7 : 5;
      if (stitchFx && !(isPull(ctx.sk) && last)) {
        const nonFinal = Math.max(1, ctx.sk.hits.length - (isPull(ctx.sk) ? 1 : 0));
        let add = stitchFx.n / nonFinal;
        if (ctx.sk.id === 'ash_running_stitch' && hasP(u, 'stitch_plus') && i === 0) add += 1;
        if (q === 'perfect') add += 1;
        const before = Math.floor(t.stitches);
        t.stitches = Math.min(cap, t.stitches + add);
        if (Math.floor(t.stitches) !== before) evs.push({ e: 'res', uid: t.uid, what: 'stitch' });
      }
      if (isPull(ctx.sk) && last && t.stitches > 0) {
        t.stitches = 0;
        evs.push({ e: 'res', uid: t.uid, what: 'pull' });
      }
    } else if (stitchFx && !t.ko && ctx.sk.owner === 'weave') {
      t.stitches = Math.min(5, t.stitches + stitchFx.n / ctx.sk.hits.length);
    }
  }
  return evs;
}

function avgQ(ctx: ActCtx): Quality {
  if (!ctx.quals.length) return 'good';
  const score = ctx.quals.reduce((a, q) => a + (q === 'perfect' ? 2 : q === 'good' ? 1 : 0), 0) / ctx.quals.length;
  return score >= 1.6 ? 'perfect' : score >= 0.7 ? 'good' : 'miss';
}

/** Apply a skill's effects after its hits. Does not end the turn. */
export function finishAction(st: BState, ctx: ActCtx): Ev[] {
  const evs: Ev[] = [];
  const u = unit(st, ctx.uid)!;
  const sk = ctx.sk;
  const q = avgQ(ctx);
  const tgts = ctx.targets.map((id) => unit(st, id)!).filter(Boolean);
  const allies = (): Unit[] => st.units.filter((p) => p.side === 'party' && !p.ko);
  for (const fx of sk.effects ?? []) {
    switch (fx.k) {
      case 'status': {
        const list = fx.on === 'self' ? [u] : fx.on === 'allies' ? allies() : fx.on === 'enemies' ? alive(st, 'enemy') : tgts;
        for (const t of list) tryStatus(st, u, t, fx.id, fx.turns ?? 2, fx.stacks ?? 1, (fx.chance ?? 1) * (q === 'miss' && fx.chance ? 0.7 : 1), `${ctx.uid}${sk.id}`, evs);
        break;
      }
      case 'heal': {
        const list = fx.on === 'self' ? [u] : fx.on === 'allies' ? allies() : tgts;
        for (const t of list) heal(st, u, t, t.maxHp * fx.pct * QHEAL[q] * ctx.frayMul, evs);
        break;
      }
      case 'revive': {
        const list = fx.on === 'allies' ? st.units.filter((p) => p.side === 'party' && p.ko) : tgts;
        for (const t of list) revive(st, u, t, fx.pct * QHEAL[q], evs);
        break;
      }
      case 'ap': {
        const list = fx.on === 'self' ? [u] : fx.on === 'allies' ? allies() : tgts;
        for (const t of list) gainAp(t, fx.n + (sk.id === 'basic' && hasP(u, 'patience') ? 1 : 0), evs);
        break;
      }
      case 'cleanse': {
        const list = fx.on === 'self' ? [u] : fx.on === 'allies' ? allies() : tgts;
        for (const t of list) {
          const bad = t.statuses.filter((s) => NEGATIVE.includes(s.id));
          const n = fx.on === 'allies' ? bad.length : 1;
          for (const b of bad.slice(0, n)) {
            removeStatus(t, b.id);
            evs.push({ e: 'unstatus', uid: t.uid, id: b.id });
          }
        }
        break;
      }
      case 'dispel': {
        const list = fx.on === 'enemies' ? alive(st, 'enemy') : tgts;
        for (const t of list) {
          for (const b of t.statuses.filter((s) => BUFFS.includes(s.id))) {
            removeStatus(t, b.id);
            evs.push({ e: 'unstatus', uid: t.uid, id: b.id });
          }
        }
        break;
      }
      case 'weave':
        addWeave(st, u, fx.n);
        break;
      case 'hp_cost': {
        const n = Math.min(u.hp - 1, Math.round(u.maxHp * fx.pct));
        if (n > 0) {
          u.hp -= n;
          evs.push({ e: 'dmg', uid: u.uid, n });
        }
        break;
      }
      case 'guard':
        u.guard = Math.min(5, u.guard + fx.n);
        evs.push({ e: 'res', uid: u.uid, what: 'guard' });
        break;
      case 'guard_spend':
        u.guard = 0;
        evs.push({ e: 'res', uid: u.uid, what: 'guard' });
        break;
      case 'tension':
        u.tension = Math.min(100, u.tension + fx.n);
        evs.push({ e: 'res', uid: u.uid, what: 'tension' });
        break;
      case 'tension_spend':
        u.tension = 0;
        evs.push({ e: 'res', uid: u.uid, what: 'tension' });
        break;
      case 'verse':
        if (u.verses.length >= 3) u.verses.shift();
        u.verses.push(fx.v);
        evs.push({ e: 'res', uid: u.uid, what: 'verse' });
        break;
      case 'hymn':
        hymn(st, u, q, evs);
        break;
      case 'heat':
        u.heat = Math.min(10, u.heat + fx.n);
        evs.push({ e: 'res', uid: u.uid, what: 'heat' });
        break;
      case 'vent': {
        const n = Math.floor(u.heat / 3);
        u.heat = 0;
        gainAp(u, n, evs);
        evs.push({ e: 'res', uid: u.uid, what: 'heat' });
        break;
      }
      case 'overheat':
        u.heat = 0;
        addStatus(u, 'burn', 3, 2);
        addStatus(u, 'slow', 2, 1);
        evs.push({ e: 'text', uid: u.uid, text: 'Overheated', color: '#ff8a4a' });
        break;
      case 'penance':
        u.penance = Math.min(100, u.penance + fx.n);
        evs.push({ e: 'res', uid: u.uid, what: 'penance' });
        break;
      case 'penance_spend':
        u.penance = 0;
        evs.push({ e: 'res', uid: u.uid, what: 'penance' });
        break;
      case 'absolution': {
        const pct = u.penance / 200;
        for (const t of allies()) heal(st, u, t, t.maxHp * pct * QHEAL[q], evs);
        u.penance = 0;
        evs.push({ e: 'res', uid: u.uid, what: 'penance' });
        break;
      }
      case 'fray': {
        const cost = Math.round(u.maxHp * (hasP(u, 'fray_plus') ? 0.1 : 0.15));
        if (u.hp > cost) {
          u.hp -= cost;
          evs.push({ e: 'dmg', uid: u.uid, n: cost });
          u.frayed = true;
          evs.push({ e: 'text', uid: u.uid, text: 'Frayed', color: '#ff9a5a' });
        }
        break;
      }
      case 'free_shots':
        u.freeShots = true;
        break;
      case 'stitch':
      case 'pull':
        break;
    }
  }
  // Backstitch: +1 AP if the target already held 3+ stitches
  if (sk.id === 'ash_backstitch' && ctx.stitchedBefore >= 3) gainAp(u, 1, evs);
  // Pyre consumes Burn
  if (sk.scale?.by === 'burn') for (const t of tgts) if (stacks(t, 'burn')) removeStatus(t, 'burn');
  return evs;
}

function hymn(st: BState, u: Unit, q: Quality, evs: Ev[]): void {
  const v = u.verses;
  if (!v.length) return;
  const mul = QHEAL[q] * (hasP(u, 'hymn_plus') ? 1.25 : 1);
  const n = (k: string): number => v.filter((x) => x === k).length;
  const allies = st.units.filter((p) => p.side === 'party' && !p.ko);
  const foes = alive(st, 'enemy');
  const three = v.length === 3 && (n('hope') === 3 || n('grief') === 3 || n('wrath') === 3);
  evs.push({ e: 'text', uid: u.uid, text: three ? (n('hope') === 3 ? 'Hymn of Morning' : n('grief') === 3 ? 'Requiem' : 'Day of Wrath') : 'Hymn', color: '#e8d2ff' });
  if (n('hope')) {
    for (const t of allies) heal(st, u, t, t.maxHp * (three ? 0.5 : 0.14 * n('hope')) * mul, evs);
    if (three) {
      for (const t of allies) {
        addStatus(t, 'regen', 3, 1);
        for (const b of t.statuses.filter((s) => NEGATIVE.includes(s.id))) removeStatus(t, b.id);
      }
      for (const t of st.units.filter((p) => p.side === 'party' && p.ko)) revive(st, u, t, 0.25, evs);
    }
  }
  if (n('grief')) {
    for (const f of foes) {
      tryStatus(st, u, f, 'expose', 2, 1, 1, 'hg', evs);
      if (n('grief') >= 2) tryStatus(st, u, f, 'weaken', 2, 1, 1, 'hg2', evs);
      if (three) tryStatus(st, u, f, 'slow', 3, 1, 1, 'hg3', evs);
    }
    if (three) for (const f of foes) strike(st, u, f, 1.2 * mul, null, 'good', 'req', evs, { el: 'dark', brk: 30 });
  }
  if (n('wrath')) {
    const p = three ? 2.6 : 0.75 * n('wrath');
    for (const f of foes) strike(st, u, f, p * mul, null, 'good', `hw${f.uid}`, evs, { el: 'light', brk: 20 * n('wrath') });
  }
  u.verses = [];
  evs.push({ e: 'res', uid: u.uid, what: 'verse' });
}

/** Free Aim: one shot at a target (optionally a weak point index). Costs 1 AP unless free. Doesn't end the turn. */
export function shotCost(u: Unit): number {
  if (u.freeShots) return 0;
  if (u.shotsThisTurn === 0 && (u.id === 'rook' || hasP(u, 'marksman'))) return 0;
  return 1;
}

export function shoot(st: BState, uid: string, tid: string, wpi: number): Ev[] {
  const u = unit(st, uid)!;
  const t = unit(st, tid);
  const evs: Ev[] = [];
  if (!t || t.ko) return evs;
  const cost = shotCost(u);
  if (u.ap < cost) return evs;
  u.ap -= cost;
  u.shotsThisTurn++;
  st.turn++;
  const wp: WP | undefined = wpi >= 0 ? t.wps[wpi] : undefined;
  let power = SHOT_POWER;
  let brk = SHOT_BREAK;
  if (wp && wp.hp >= 0) {
    power *= hasP(u, 'marksman') ? 2.5 : 2;
    brk *= 2.5;
    tally(st, u, 'weakpoint');
    if (hasP(u, 'seam_seeker')) gainAp(u, 1, evs);
  }
  if (u.id === 'rook') {
    power *= 1 + 0.05 * u.heat;
    u.heat = Math.min(10, u.heat + 1);
    evs.push({ e: 'res', uid: u.uid, what: 'heat' });
  }
  const dealt = strike(st, u, t, power, null, 'good', `shot${u.shotsThisTurn}`, evs, { brk, shot: true, el: u.element });
  // armor plates soak shots until they crack: then the foe's defense drops and its guard staggers
  if (wp && wp.maxHp > 0 && wp.hp > 0) {
    wp.hp -= Math.max(1, dealt);
    if (wp.hp <= 0 && !t.ko) {
      wp.hp = -1;
      evs.push({ e: 'wpbreak', uid: t.uid, i: wpi });
      t.def = Math.round(t.def * 0.75);
      t.brk = Math.min(t.breakHp, t.brk + t.breakHp * 0.25);
    }
  }
  if (hasP(u, 'hunters_mark') && !t.ko) tryStatus(st, u, t, 'marked', 1, 1, 1, 'hm', evs);
  const end = checkEnd(st);
  if (end) evs.push({ e: 'end', result: end });
  return evs;
}

export function useItem(st: BState, uid: string, item: string, tid: string, items: Record<string, number>): Ev[] {
  const u = unit(st, uid)!;
  const t = unit(st, tid) ?? u;
  const evs: Ev[] = [];
  if ((items[item] ?? 0) <= 0) return evs;
  items[item]--;
  tally(st, u, 'items');
  const mul = hasP(u, 'tinker') ? 1.5 : 1;
  switch (item) {
    case 'tincture_heal':
      heal(st, u, t, t.maxHp * 0.5 * mul, evs, false);
      break;
    case 'tincture_revive':
      revive(st, u, t, Math.min(1, 0.4 * mul), evs);
      break;
    case 'tincture_spirit':
    case 'spool_of_will':
      gainAp(t, Math.round(3 * mul), evs);
      break;
    case 'honey_bun':
      for (const p of alive(st, 'party')) heal(st, u, p, p.maxHp * 0.25 * mul, evs, false);
      break;
    case 'smelling_salts':
      for (const b of t.statuses.filter((s) => NEGATIVE.includes(s.id))) {
        removeStatus(t, b.id);
        evs.push({ e: 'unstatus', uid: t.uid, id: b.id });
      }
      break;
    case 'golden_thread':
      revive(st, u, t, 1, evs);
      break;
    case 'ember_vial':
    case 'frost_vial':
    case 'storm_vial': {
      const el = item === 'ember_vial' ? 'fire' : item === 'frost_vial' ? 'ice' : 'storm';
      for (const f of alive(st, 'enemy')) {
        strike(st, u, f, 1.3 * mul, null, 'good', `vial${f.uid}`, evs, { el, brk: 20 });
        if (el === 'fire') tryStatus(st, u, f, 'burn', 3, 2, 1, 'v', evs);
        if (el === 'ice') tryStatus(st, u, f, 'freeze', 1, 1, 0.35, 'v', evs);
        if (el === 'storm') tryStatus(st, u, f, 'shock', 2, 1, 1, 'v', evs);
      }
      break;
    }
  }
  return evs;
}

export function tryFlee(st: BState, uid: string): boolean {
  if (st.noFlee) return false;
  const pa = alive(st, 'party');
  const en = alive(st, 'enemy');
  const ps = pa.reduce((a, u) => a + effSpd(u), 0) / Math.max(1, pa.length);
  const es = en.reduce((a, u) => a + effSpd(u), 0) / Math.max(1, en.length);
  const chance = Math.max(0.3, Math.min(0.92, 0.6 + (ps - es) / 60));
  const ok = rnd(st, 'flee', uid) < chance;
  if (ok) st.phase = 'fled';
  return ok;
}

/** Whole party action in one call (used by spectators, the host for remote players, tests and the AI). */
export function applyAction(st: BState, uid: string, act: PAction, quals: Quality[], items: Record<string, number>): Ev[] {
  if (act.k === 'pass') return [];
  if (act.k === 'flee') {
    tryFlee(st, uid);
    return [];
  }
  if (act.k === 'item') return useItem(st, uid, act.item, act.target, items);
  if (act.k === 'shot') return shoot(st, uid, act.target, act.wp);
  const ctx = beginAction(st, uid, act);
  if (ctx.error) return [];
  const evs: Ev[] = [];
  const n = Math.max(ctx.sk.hits.length, qteBeats(ctx.sk));
  for (let i = 0; i < n; i++) {
    evs.push(...actHit(st, ctx, i, quals[i] ?? 'good'));
    if (st.phase !== 'turn') break;
  }
  if (st.phase === 'turn' || st.phase === 'won') evs.push(...finishAction(st, ctx));
  return evs;
}

export function qteBeats(sk: SkillDef): number {
  return sk.qte.kind === 'none' ? 0 : sk.qte.kind === 'hold' ? 1 : sk.qte.beats.length;
}

// ------------------------------------------------------------------ enemy actions

function attackOf(u: Unit, id: string): EnemyAttack | undefined {
  return ENEMIES[u.id]?.attacks.find((a) => a.id === id);
}
export function enemyAttack(u: Unit, id: string): EnemyAttack | undefined {
  return attackOf(u, id);
}

export function planEnemy(st: BState, uid: string): EnemyPlan {
  const u = unit(st, uid)!;
  const def = ENEMIES[u.id];
  const frac = u.hp / u.maxHp;
  let pool = (def?.attacks ?? []).filter((a) => a.belowHp == null || frac <= a.belowHp);
  pool = pool.filter((a) => !a.summon || alive(st, 'enemy').length < 4);
  pool = pool.filter((a) => !a.heal || frac < 0.6);
  if (!pool.length) pool = def?.attacks.slice(0, 1) ?? [];
  const total = pool.reduce((s, a) => s + (a.weight ?? 1) * (a.belowHp != null ? 1.5 : 1), 0);
  let r = rnd(st, 'atk', uid) * total;
  let atk = pool[0];
  for (const a of pool) {
    r -= (a.weight ?? 1) * (a.belowHp != null ? 1.5 : 1);
    if (r <= 0) {
      atk = a;
      break;
    }
  }
  const party = alive(st, 'party');
  let targets: string[] = [];
  if (atk && atk.hits.length) {
    const taunt = party.filter((p) => has(p, 'taunt'));
    if (atk.target === 'all') targets = party.map((p) => p.uid);
    else if (atk.target === 'lowest') targets = [[...party].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]?.uid].filter(Boolean) as string[];
    else if (taunt.length) targets = [taunt[0].uid];
    else {
      const n = atk.target === 'random2' ? Math.min(2, party.length) : 1;
      const pool2 = [...party];
      for (let i = 0; i < n && pool2.length; i++) {
        const weights = pool2.map((p) => 1.4 - 0.6 * (p.hp / p.maxHp));
        let w = rnd(st, 'tg', uid, i) * weights.reduce((a, b) => a + b, 0);
        let idx = 0;
        for (let k = 0; k < weights.length; k++) {
          w -= weights[k];
          if (w <= 0) {
            idx = k;
            break;
          }
        }
        targets.push(pool2[idx].uid);
        pool2.splice(idx, 1);
      }
    }
  }
  return { uid, attack: atk?.id ?? '', targets };
}

/** Does this defense avoid this hit? */
export function defends(kind: string | undefined, d: Defense): boolean {
  if (d === 'none') return false;
  switch (kind ?? 'normal') {
    case 'jump':
      return d === 'jump';
    case 'unblockable':
      return d === 'dodge';
    default:
      return d === 'dodge' || d === 'parry';
  }
}

/** Resolve hit i of an enemy attack on one target, given what the defender did. */
export function enemyHit(st: BState, plan: EnemyPlan, i: number, tid: string, d: Defense): Ev[] {
  const evs: Ev[] = [];
  const a = unit(st, plan.uid);
  const t = unit(st, tid);
  if (!a || !t || a.ko || t.ko) return evs;
  const atk = attackOf(a, plan.attack);
  const hit = atk?.hits[i];
  if (!atk || !hit) return evs;
  if (defends(hit.kind, d)) {
    evs.push({ e: 'miss', uid: t.uid, how: d });
    if (d === 'parry') {
      tally(st, t, 'parry');
      gainAp(t, 1, evs);
      addWeave(st, t, 6);
      if (t.id === 'corin') {
        t.guard = Math.min(5, t.guard + 1);
        evs.push({ e: 'res', uid: t.uid, what: 'guard' });
      }
      if (hasP(t, 'parry_echo')) heal(st, t, t, t.maxHp * 0.03, evs, false);
      if (hasP(t, 'choir_glass')) tryStatus(st, t, a, 'weaken', 2, 1, 1, 'cg', evs);
    } else if (d === 'dodge') {
      tally(st, t, 'dodge');
      addWeave(st, t, 3);
      if (hasP(t, 'windstep')) gainAp(t, 1, evs);
    } else if (d === 'jump') {
      tally(st, t, 'dodge');
      addWeave(st, t, 4);
    }
    return evs;
  }
  let mul = DIFF_DMG[st.difficulty];
  const el = hit.element ?? 'phys';
  if (el === 'fire' && hasP(t, 'ember_lining')) mul *= 0.7;
  if (el === 'ice' && hasP(t, 'wool_lining')) mul *= 0.7;
  if (el === 'storm' && hasP(t, 'copper_thread')) mul *= 0.7;
  if (has(a, 'empower')) mul *= 1.25;
  if (has(a, 'weaken')) mul *= 0.75;
  if (has(t, 'shock')) mul *= 1.25;
  if (hasP(t, 'glass_needle')) mul *= 1.25;
  const defEff = t.def * (has(t, 'expose') ? 0.6 : 1);
  const n = a.atk * hit.power * mul * (100 / (100 + defEff)) * (0.92 + 0.16 * rnd(st, 'ev', plan.uid, i, tid));
  const before = evs.length;
  hurt(st, a, t, n, evs, { el, src: a.uid });
  const blocked = evs.slice(before).some((x) => x.e === 'dmg' && x.blocked);
  if (hit.status && !blocked) tryStatus(st, a, t, hit.status.id, hit.status.turns ?? 2, hit.status.stacks ?? 1, hit.status.chance, `eh${i}`, evs);
  return evs;
}

/** After all hits: counters, self effects, summons. Does not end the turn. */
export function finishEnemy(st: BState, plan: EnemyPlan, defs: Record<string, Defense[]>): Ev[] {
  const evs: Ev[] = [];
  const a = unit(st, plan.uid);
  if (!a) return evs;
  const atk = attackOf(a, plan.attack);
  if (!atk) return evs;
  // counters
  if (!a.ko && atk.hits.length) {
    for (const tid of plan.targets) {
      const t = unit(st, tid);
      const d = defs[tid] ?? [];
      if (!t || t.ko) continue;
      const parryable = atk.hits.map((h, i) => ({ h, i })).filter(({ h }) => (h.kind ?? 'normal') !== 'jump');
      const jumps = atk.hits.map((h, i) => ({ h, i })).filter(({ h }) => h.kind === 'jump');
      const allParried = parryable.length > 0 && parryable.every(({ i }) => d[i] === 'parry') && jumps.every(({ i }) => d[i] === 'jump');
      const allJumped = jumps.length > 0 && parryable.length === 0 && jumps.every(({ i }) => d[i] === 'jump');
      if ((allParried || allJumped) && !a.ko) {
        evs.push({ e: 'counter', uid: t.uid, target: a.uid });
        strike(st, t, a, allParried ? 1.2 : 1.0, null, 'good', `ctr${tid}`, evs, { brk: 30, counter: true });
        addWeave(st, t, 10);
        if (hasP(t, 'duelist')) gainAp(t, 1, evs);
        if (a.ko) break;
      }
    }
  }
  if (!a.ko) {
    if (atk.selfStatus) {
      addStatus(a, atk.selfStatus.id, atk.selfStatus.turns ?? 2, atk.selfStatus.stacks ?? 1);
      evs.push({ e: 'status', uid: a.uid, id: atk.selfStatus.id });
    }
    if (atk.heal) heal(st, a, a, a.maxHp * atk.heal, evs, false);
    if (atk.summon && ENEMIES[atk.summon] && alive(st, 'enemy').length < 5) {
      const nu = enemyUnit(ENEMIES[atk.summon], `e${st.enemyCount++}`, st.ng);
      nu.next = st.time + 1000 / effSpd(nu);
      st.units.push(nu);
      evs.push({ e: 'summon', uid: nu.uid });
    }
  }
  return evs;
}

export function applyEnemy(st: BState, plan: EnemyPlan, defs: Record<string, Defense[]>): Ev[] {
  const evs: Ev[] = [];
  const a = unit(st, plan.uid);
  if (!a) return evs;
  const atk = attackOf(a, plan.attack);
  if (atk) {
    for (let i = 0; i < atk.hits.length; i++) {
      for (const tid of plan.targets) evs.push(...enemyHit(st, plan, i, tid, defs[tid]?.[i] ?? 'none'));
      if (st.phase !== 'turn') break;
    }
  }
  if (st.phase === 'turn') evs.push(...finishEnemy(st, plan, defs));
  return evs;
}

// ------------------------------------------------------------------ AI

const AI_Q = { story: [0.55, 0.9], mender: [0.42, 0.82], unthreaded: [0.32, 0.75] };
const AI_D = { story: [0.32, 0.68], mender: [0.24, 0.55], unthreaded: [0.18, 0.45] };

export function aiQuals(st: BState, uid: string, sk: SkillDef): Quality[] {
  const [p, g] = AI_Q[st.difficulty];
  const n = Math.max(1, qteBeats(sk), sk.hits.length);
  return Array.from({ length: n }, (_, i) => {
    const r = rnd(st, 'aiq', uid, sk.id, i);
    return r < p ? 'perfect' : r < g ? 'good' : 'miss';
  });
}

export function aiDefense(st: BState, plan: EnemyPlan, tid: string): Defense[] {
  const a = unit(st, plan.uid);
  const atk = a ? attackOf(a, plan.attack) : undefined;
  if (!atk) return [];
  const [p, d] = AI_D[st.difficulty];
  return atk.hits.map((h, i) => {
    const r = rnd(st, 'aid', plan.uid, tid, i);
    if (h.kind === 'jump') return r < d ? 'jump' : 'none';
    if (h.kind === 'unblockable') return r < d * 0.85 ? 'dodge' : 'none';
    return r < p ? 'parry' : r < d ? 'dodge' : 'none';
  });
}

/** Choose a sensible action for an AI-controlled party member. */
export function aiAction(st: BState, uid: string, items: Record<string, number>): PAction {
  const u = unit(st, uid)!;
  const foes = alive(st, 'enemy');
  const friends = alive(st, 'party');
  const down = st.units.filter((p) => p.side === 'party' && p.ko);
  if (!foes.length) return { k: 'pass' };
  const usable = u.skills.map((id) => skill(id)).filter((s): s is SkillDef => !!s && !cannotUse(st, u, s));
  const lowest = [...friends].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  // revive
  if (down.length) {
    const rev = usable.find((s) => s.target === 'ally_ko' || (s.target === 'all_allies' && s.effects?.some((e) => e.k === 'revive')));
    if (rev) return { k: 'skill', id: rev.id, target: down[0].uid };
    if ((items.tincture_revive ?? 0) > 0 && rnd(st, 'aiitem', uid) < 0.7) return { k: 'item', item: 'tincture_revive', target: down[0].uid };
  }
  // heal
  if (lowest && lowest.hp / lowest.maxHp < 0.4) {
    const healer = usable.find((s) => s.effects?.some((e) => e.k === 'heal') && s.target !== 'self');
    if (healer) return { k: 'skill', id: healer.id, target: lowest.uid };
    if (u.id === 'maudra' && u.verses.filter((v) => v === 'hope').length >= 2 && usable.find((s) => s.id === 'mau_hymn')) return { k: 'skill', id: 'mau_hymn', target: foes[0].uid };
    if (lowest.hp / lowest.maxHp < 0.25 && (items.tincture_heal ?? 0) > 0 && rnd(st, 'aiheal', uid) < 0.6) return { k: 'item', item: 'tincture_heal', target: lowest.uid };
  }
  // weave
  const weave = usable.find((s) => s.weave);
  if (weave && rnd(st, 'aiweave', uid) < 0.5) return { k: 'skill', id: weave.id, target: foes[0].uid };
  // pick a target: broken/marked/weak/lowest
  const score = (f: Unit): number => (f.broken ? 3 : 0) + (has(f, 'marked') ? 1 : 0) + (1 - f.hp / f.maxHp) * 2 + (f.stitches >= 3 ? 1 : 0);
  const target = [...foes].sort((a, b) => score(b) - score(a))[0];
  // signature spenders
  const pick = (id: string, cond: boolean): PAction | null => (cond && usable.some((s) => s.id === id) ? { k: 'skill', id, target: target.uid } : null);
  const sig =
    pick('ash_pull_taut', target.stitches >= 3) ??
    pick('ash_seamrender', target.stitches >= 2) ??
    pick('cor_last_wall', u.guard >= 3) ??
    pick('cor_promise', u.guard >= 4) ??
    pick('orr_snap', u.tension >= 80 && foes.length > 1) ??
    pick('orr_great_shear', u.tension >= 60) ??
    pick('mau_hymn', u.verses.length >= 3) ??
    pick('rook_crucible', u.heat >= 10) ??
    pick('rook_vent', u.heat >= 8 && u.ap <= 2) ??
    pick('tess_scissor_rite', u.penance >= 70) ??
    (lowest && lowest.hp / lowest.maxHp < 0.6 ? pick('tess_absolution', u.penance >= 50) : null);
  if (sig) {
    if (sig.k === 'skill' && sig.id === 'tess_absolution') return { ...sig, target: u.uid };
    return sig;
  }
  // best value damage skill
  let best: SkillDef | null = null;
  let bestScore = 0.62 * 2 * 1.1; // a basic attack, with its AP gain
  for (const s of usable) {
    if (!s.hits.length || s.ap === 0) continue;
    const per = s.hits.reduce((a, h) => a + h.power, 0) * (s.target === 'all_enemies' ? Math.min(foes.length, 3) * 0.8 : 1);
    const el = s.element ?? u.element;
    const w = target.weak.includes(el) ? 1.5 : target.resist.includes(el) ? 0.5 : 1;
    const value = (per * w) / Math.max(1, s.ap * 0.55) + (s.effects?.length ? 0.2 : 0);
    const save = u.ap - s.ap >= 1 || u.ap >= 6 ? 1 : 0.7;
    const sc = value * save * (0.85 + 0.3 * rnd(st, 'aisk', uid, s.id));
    if (sc > bestScore) {
      bestScore = sc;
      best = s;
    }
  }
  // support skills now and then
  if (!best) {
    const sup = usable.find((s) => !s.hits.length && s.target !== 'ally_ko' && !s.effects?.some((e) => e.k === 'heal' || e.k === 'hp_cost' || e.k === 'fray' || e.k === 'vent') && rnd(st, 'aisup', uid, s.id) < 0.25);
    if (sup) return { k: 'skill', id: sup.id, target: sup.target === 'ally' ? lowest.uid : u.uid };
  }
  if (best) {
    const tgt = best.target === 'ally' ? lowest.uid : best.target === 'self' ? u.uid : target.uid;
    return { k: 'skill', id: best.id, target: tgt };
  }
  return { k: 'skill', id: 'basic', target: target.uid };
}

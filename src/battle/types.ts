// Battle state: plain JSON so the co-op host can send it whole. Everything random comes from hashing
// (seed, turn, keys), so any client given the same state and the same inputs computes the same result.
import type { CharId, Element, StatusId, ThemeId, TrackId } from '../data/types';

export type Quality = 'perfect' | 'good' | 'miss';
export type Defense = 'none' | 'dodge' | 'parry' | 'jump';

export interface Status {
  id: StatusId;
  turns: number;
  stacks: number;
}

export interface WP {
  x: number;
  y: number;
  r: number;
  hp: number; // 0 = permanent weak spot; >0 armor still on; <0 broken off
  maxHp: number;
  name: string;
}

export interface Unit {
  uid: string;
  side: 'party' | 'enemy';
  id: string; // CharId or enemy id
  name: string;
  art: string;
  size: number;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  ap: number;
  statuses: Status[];
  ko: boolean;
  next: number;
  // party
  skills: string[];
  passives: string[];
  element: Element;
  ctrl: string; // 'ai' | 'host' | a player's user id
  // signature resources
  guard: number;
  tension: number;
  verses: ('hope' | 'grief' | 'wrath')[];
  heat: number;
  penance: number;
  frayed: boolean;
  freeShots: boolean;
  shotsThisTurn: number;
  secondWindUsed: boolean;
  metronome: number;
  firstThreadAp: boolean;
  // enemy
  stitches: number;
  brk: number;
  breakHp: number;
  broken: boolean;
  weak: Element[];
  resist: Element[];
  absorb: Element[];
  immune: StatusId[];
  wps: WP[];
  boss: boolean;
  flying: boolean;
  xp: number;
  glim: number;
}

export interface BState {
  seed: number;
  turn: number; // increments every action (keys the hash RNG)
  time: number;
  units: Unit[];
  weave: number; // 0..300
  phase: 'turn' | 'won' | 'lost' | 'fled' | 'scripted';
  actor: string | null;
  enc: string;
  theme: ThemeId;
  music: TrackId;
  difficulty: 'story' | 'mender' | 'unthreaded';
  ng: number;
  first: 'party' | 'enemy' | null;
  endAtHp: number | null;
  noFlee: boolean;
  boss: boolean;
  /** task counters per controller ('host' or a user id) */
  tally: Record<string, Record<string, number>>;
  /** enemies Wick helped beat that carry patterns */
  learned: string[];
  banner: string | null;
  enemyCount: number;
}

export type Ev =
  | { e: 'dmg'; uid: string; n: number; crit?: boolean; weak?: boolean; resist?: boolean; absorb?: boolean; blocked?: boolean; el?: Element; src?: string }
  | { e: 'heal'; uid: string; n: number }
  | { e: 'miss'; uid: string; how: Defense | 'immune' }
  | { e: 'status'; uid: string; id: StatusId; stacks?: number }
  | { e: 'unstatus'; uid: string; id: StatusId }
  | { e: 'ko'; uid: string }
  | { e: 'revive'; uid: string }
  | { e: 'break'; uid: string }
  | { e: 'wpbreak'; uid: string; i: number }
  | { e: 'ap'; uid: string; n: number }
  | { e: 'counter'; uid: string; target: string }
  | { e: 'phase'; uid: string; to: string; line?: string }
  | { e: 'summon'; uid: string }
  | { e: 'learn'; pattern: string; name: string }
  | { e: 'res'; uid: string; what: string } // resource change (stitches, guard...) for UI pulses
  | { e: 'text'; uid: string; text: string; color?: string }
  | { e: 'skip'; uid: string; why: string }
  | { e: 'end'; result: BState['phase'] };

export type PAction =
  | { k: 'skill'; id: string; target: string }
  | { k: 'item'; item: string; target: string }
  | { k: 'shot'; target: string; wp: number }
  | { k: 'flee' }
  | { k: 'pass' };

export interface EnemyPlan {
  uid: string;
  attack: string;
  targets: string[];
}

export interface PartyMemberIn {
  id: CharId;
  ctrl: string;
}

export const PARTY_IDS = (s: BState): Unit[] => s.units.filter((u) => u.side === 'party');
export type { CharId };

// After a battle: XP, levels, Glim, drops, learned Patterns, mastered Patches, class ranks, Tasks.
import type { BState } from '../battle/types';
import { CLASS_MAP, CLASSES, classRank } from '../data/classes';
import { ENEMIES, PATTERNS } from '../data/enemies';
import { ITEMS, PATCH_MAP } from '../data/items';
import { registerPattern, type SkillDef } from '../data/skills';
import type { CharId } from '../data/types';
import { addItem, gainXp, type Profile, type SaveData } from './state';

export interface Rewards {
  xp: number;
  glim: number;
  items: { id: string; n: number }[];
  levels: { id: CharId; to: number }[];
  patterns: string[];
  mastered: string[];
  ranks: { id: CharId; cls: string; rank: number }[];
  classes: string[];
}

/** Turn every enemy attack that carries a `pattern` into a Wick skill. */
export function registerPatterns(): void {
  for (const [pid, ref] of Object.entries(PATTERNS)) {
    const def = ENEMIES[ref.enemy];
    const atk = def?.attacks.find((a) => a.id === ref.attack);
    if (!atk) continue;
    const hits = atk.hits.length ? atk.hits : [{ at: 0, power: 0.8 }];
    const heal = atk.heal ?? 0;
    const sk: SkillDef = {
      id: pid,
      name: atk.name,
      owner: 'pattern',
      ap: Math.max(2, Math.min(6, hits.length + 1 + (atk.target === 'all' ? 1 : 0))),
      desc: `A Pattern Wick learned from the ${def.name}.${atk.target === 'all' ? ' Hits every enemy.' : ''}${hits[0]?.status ? ` May inflict ${hits[0].status.id}.` : ''}${heal ? ' Heals the party.' : ''}`,
      target: heal ? 'all_allies' : atk.target === 'all' ? 'all_enemies' : 'enemy',
      element: hits[0]?.element ?? 'thread',
      qte: heal ? { kind: 'tap', beats: [0] } : { kind: 'tap', beats: hits.map((_, i) => i * 260) },
      hits: heal ? [] : hits.map((hh) => ({ power: Math.max(0.35, hh.power * 0.85), brk: 12 })),
      effects: [
        ...(hits[0]?.status ? [{ k: 'status' as const, id: hits[0].status.id, turns: hits[0].status.turns ?? 2, stacks: hits[0].status.stacks ?? 1, chance: Math.min(1, hits[0].status.chance + 0.2), on: (atk.target === 'all' ? 'enemies' : 'target') as 'enemies' | 'target' }] : []),
        ...(heal ? [{ k: 'heal' as const, pct: Math.max(0.15, heal), on: 'allies' as const }] : []),
      ],
      anim: heal ? 'heal' : atk.target === 'all' ? 'spin' : 'cast',
    };
    registerPattern(sk);
  }
}

export function applyRewards(st: BState, save: SaveData, profile: Profile, me: string, enc: { rewardMul?: number; id: string }): Rewards {
  const r: Rewards = { xp: 0, glim: 0, items: [], levels: [], patterns: [], mastered: [], ranks: [], classes: [] };
  const won = st.phase === 'won' || st.phase === 'scripted';
  // HP carries over; the fallen get back up with a little
  for (const u of st.units.filter((x) => x.side === 'party')) {
    const c = save.chars[u.id as CharId];
    if (c) c.hpFrac = u.ko ? 0.15 : Math.max(0.05, u.hp / u.maxHp);
  }
  // tasks for this player
  const tally = st.tally[me] ?? {};
  for (const [k, n] of Object.entries(tally)) profile.tasks[k] = (profile.tasks[k] ?? 0) + n;
  if (won && st.units.some((u) => u.side === 'party' && !u.ko && u.hp < u.maxHp * 0.25)) profile.tasks.ragged = (profile.tasks.ragged ?? 0) + 1;
  if (won && enc.id === 'b_first_thread') profile.tasks.first_thread = 1;
  for (const c of CLASSES) {
    if (!profile.classes.includes(c.id) && (profile.tasks[c.task] ?? 0) >= c.need) {
      profile.classes.push(c.id);
      r.classes.push(c.id);
    }
  }
  if (!won) return r;
  const foes = st.units.filter((u) => u.side === 'enemy');
  const party = st.units.filter((u) => u.side === 'party');
  const has = (p: string): boolean => party.some((u) => u.passives.includes(p));
  const mul = (enc.rewardMul ?? 1) * (1 + 0.25 * save.ng);
  r.xp = Math.round(foes.reduce((a, u) => a + u.xp, 0) * mul * (has('scholars_ribbon') ? 1.15 : 1));
  r.glim = Math.round(foes.reduce((a, u) => a + u.glim, 0) * mul * (has('bobbins_purse') ? 1.25 : 1));
  save.glim += r.glim;
  for (const id of save.roster) {
    const active = party.some((u) => u.id === id);
    const before = save.chars[id].level;
    gainXp(save, id, active ? r.xp : Math.round(r.xp * 0.5));
    if (save.chars[id].level > before) r.levels.push({ id, to: save.chars[id].level });
  }
  for (const f of foes) {
    save.bestiary[f.id] = (save.bestiary[f.id] ?? 0) + 1;
    for (const d of ENEMIES[f.id]?.drops ?? []) {
      if (Math.random() < d.chance && ITEMS[d.item]) {
        addItem(save, d.item, 1);
        const ex = r.items.find((x) => x.id === d.item);
        if (ex) ex.n++;
        else r.items.push({ id: d.item, n: 1 });
      }
    }
  }
  for (const p of st.learned) {
    if (!save.patterns.includes(p) && PATTERNS[p]) {
      save.patterns.push(p);
      r.patterns.push(p);
    }
  }
  for (const u of party) {
    const c = save.chars[u.id as CharId];
    if (!c) continue;
    for (const p of c.patches) {
      save.patchWins[p] = (save.patchWins[p] ?? 0) + 1;
      if (save.patchWins[p] >= 4 && !save.learnedPatches.includes(p) && PATCH_MAP[p]) {
        save.learnedPatches.push(p);
        r.mastered.push(p);
      }
    }
    if (c.cls && CLASS_MAP[c.cls]) {
      const before = classRank(c.classBattles[c.cls] ?? 0);
      c.classBattles[c.cls] = (c.classBattles[c.cls] ?? 0) + 1;
      const after = classRank(c.classBattles[c.cls]);
      if (after > before) r.ranks.push({ id: u.id as CharId, cls: c.cls, rank: after });
    }
  }
  return r;
}

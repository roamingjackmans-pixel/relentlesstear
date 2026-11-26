// Plays the campaign's fights in story order with AI on both sides (Mender difficulty AI timing, which is worse than
// a practised player), levelling the party as it goes. Prints a table and checks the fights are winnable and fair.
import { describe, expect, it } from 'vitest';
import * as E from '../src/battle/engine';
import type { BState } from '../src/battle/types';
import { CHAR_SKILLS, skill } from '../src/data/skills';
import { ENCOUNTERS } from '../src/data/encounters';
import { ENEMIES } from '../src/data/enemies';
import { WEAPONS } from '../src/data/items';
import type { CharId, Cmd } from '../src/data/types';
import { applyRewards, registerPatterns } from '../src/game/rewards';
import { availableSkills, newProfile, newSave, type SaveData } from '../src/game/state';
import { CUTSCENES } from '../src/story';
import { SCENES } from '../src/world';

registerPatterns();

const ORDER: { region: string; ch: number; active: CharId[]; roster: CharId[] }[] = [
  { region: 'hollowmere', ch: 0, active: ['ash', 'corin', 'wick', 'orrin'], roster: ['ash', 'corin', 'wick', 'orrin'] },
  { region: 'thimble_fields', ch: 1, active: ['ash', 'corin', 'wick', 'orrin'], roster: ['ash', 'corin', 'wick', 'orrin'] },
  { region: 'lanternmere', ch: 2, active: ['ash', 'corin', 'wick', 'orrin'], roster: ['ash', 'corin', 'wick', 'orrin', 'maudra'] },
  { region: 'cindermill', ch: 3, active: ['ash', 'corin', 'wick', 'maudra'], roster: ['ash', 'corin', 'wick', 'orrin', 'maudra', 'rook'] },
  { region: 'selvage', ch: 4, active: ['ash', 'corin', 'wick', 'rook'], roster: ['ash', 'corin', 'wick', 'orrin', 'maudra', 'rook'] },
  { region: 'bobbin_burrow', ch: 4, active: ['ash', 'corin', 'wick', 'rook'], roster: ['ash', 'corin', 'wick', 'orrin', 'maudra', 'rook'] },
  { region: 'frayed_expanse', ch: 5, active: ['ash', 'corin', 'wick', 'maudra'], roster: ['ash', 'corin', 'wick', 'maudra', 'rook'] },
  { region: 'spindlehold', ch: 6, active: ['ash', 'corin', 'maudra', 'rook'], roster: ['ash', 'corin', 'wick', 'maudra', 'rook'] },
  { region: 'glass_orchard', ch: 6, active: ['ash', 'maudra', 'rook', 'wick'], roster: ['ash', 'corin', 'wick', 'maudra', 'rook'] },
  { region: 'seam_of_ages', ch: 7, active: ['ash', 'corin', 'wick', 'maudra'], roster: ['ash', 'corin', 'wick', 'maudra', 'rook'] },
  { region: 'underweave', ch: 8, active: ['ash', 'wick', 'maudra', 'rook'], roster: ['ash', 'wick', 'maudra', 'rook', 'tess'] },
  { region: 'loomspire', ch: 9, active: ['ash', 'wick', 'tess', 'rook'], roster: ['ash', 'wick', 'maudra', 'rook', 'tess'] },
  { region: 'first_thread', ch: 10, active: ['ash', 'tess', 'maudra', 'rook'], roster: ['ash', 'wick', 'maudra', 'rook', 'tess'] },
];

function battlesIn(cmds: Cmd[], out: string[]): void {
  for (const c of cmds) {
    if (c.t === 'battle') out.push(c.enc);
    if (c.t === 'choice') for (const o of c.options) battlesIn(o.cmds, out);
    if (c.t === 'if') {
      battlesIn(c.then, out);
      battlesIn(c.else ?? [], out);
    }
  }
}

function regionFights(region: string): { enc: string; boss: boolean }[] {
  const out: { enc: string; boss: boolean }[] = [];
  const seen = new Set<string>();
  for (const s of Object.values(SCENES).filter((x) => x.region === region)) {
    const cs = [s.onEnter, ...s.objects.flatMap((o) => (o.kind === 'trigger' ? [o.cutscene] : o.kind === 'boss' ? [o.before, o.after] : []))].filter(Boolean) as string[];
    for (const id of cs) {
      const list: string[] = [];
      battlesIn(CUTSCENES[id]?.cmds ?? [], list);
      for (const e of list) if (!seen.has(e)) {
        seen.add(e);
        out.push({ enc: e, boss: !!ENCOUNTERS[e]?.boss });
      }
    }
    for (const o of s.objects) {
      if ((o.kind === 'enemy' || o.kind === 'boss') && !seen.has(o.enc)) {
        seen.add(o.enc);
        out.push({ enc: o.enc, boss: o.kind === 'boss' });
      }
    }
  }
  return out;
}

function gearUp(s: SaveData, ch: number): void {
  for (const id of s.roster) {
    const c = s.chars[id];
    // attributes: a sensible spread
    const order: (keyof typeof c.attrs)[] = ['vit', 'might', 'might', 'agi', 'vit', 'def'];
    let i = 0;
    while (c.attrPts > 0) {
      c.attrs[order[i++ % order.length]]++;
      c.attrPts--;
    }
    // learn skills in tree order
    for (const sid of CHAR_SKILLS[id]) {
      const sk = skill(sid);
      if (!sk || c.learned.includes(sid)) continue;
      if ((sk.req ?? []).every((r) => c.learned.includes(r)) && (!sk.flag || s.flags[sk.flag]) && c.sp >= (sk.cost ?? 1)) {
        c.sp -= sk.cost ?? 1;
        c.learned.push(sid);
      }
    }
    const avail = availableSkills(s, id);
    c.equipped = avail.filter((x) => (skill(x)?.ap ?? 0) > 0 || x === 'wick_fray').slice(-6);
    // best weapon for the chapter, upgraded
    const tier = ch >= 8 ? 4 : ch >= 5 ? 3 : ch >= 2 ? 2 : 1;
    const ws = WEAPONS.filter((w) => w.who === id && Number(w.id.slice(-1)) <= tier);
    const w = ws[ws.length - 1];
    if (w) {
      c.weapon = w.id;
      s.weapons[w.id] = Math.min(30, 1 + ch * 3);
    }
    c.hpFrac = 1;
  }
}

function simulate(s: SaveData, enc: string, seed: number): BState {
  const def = ENCOUNTERS[enc];
  const party = (def.only?.length ? def.only : s.active).slice(0, 4);
  const ctrl: Partial<Record<CharId, string>> = {};
  for (const p of party) ctrl[p] = 'ai';
  const st = E.createBattle(s, def, { seed, first: null, ctrl, party }, 'village_autumn', 'battle');
  const items: Record<string, number> = { tincture_heal: 3, tincture_revive: 2, tincture_spirit: 2 };
  for (let n = 0; n < 400 && st.phase === 'turn'; n++) {
    const ts = E.startTurn(st);
    if (!ts) break;
    if (!ts.skip && st.phase === 'turn') {
      const u = E.unit(st, ts.uid)!;
      if (u.side === 'party') {
        const act = E.aiAction(st, u.uid, items);
        const sk = act.k === 'skill' ? skill(act.id) : null;
        E.applyAction(st, u.uid, act, sk ? E.aiQuals(st, u.uid, sk) : [], items);
      } else {
        const plan = E.planEnemy(st, u.uid);
        const defs: Record<string, ('none' | 'dodge' | 'parry' | 'jump')[]> = {};
        for (const t of plan.targets) defs[t] = E.aiDefense(st, plan, t);
        E.applyEnemy(st, plan, defs);
      }
    }
    if (st.phase === 'turn') E.endTurn(st, ts.uid);
  }
  return st;
}

describe('balance', () => {
  it('the campaign is winnable by the AI at Mender difficulty', () => {
    const s = newSave('mender');
    const profile = newProfile();
    const rows: string[] = [];
    const lost: string[] = [];
    let seed = 1;
    for (const step of ORDER) {
      s.roster = [...step.roster];
      s.active = [...step.active];
      for (let k = 0; k < step.ch; k++) s.flags[`ch${k}_done`] = true;
      let wins = 0;
      let fights = 0;
      let turns = 0;
      const bossNotes: string[] = [];
      for (const f of regionFights(step.region)) {
        gearUp(s, step.ch);
        const def = ENCOUNTERS[f.enc];
        const tries = f.boss ? 3 : 1;
        let won = false;
        let st: BState | null = null;
        for (let t = 0; t < tries && !won; t++) {
          st = simulate(s, f.enc, seed++);
          won = st.phase === 'won' || st.phase === 'scripted';
        }
        fights++;
        turns += st!.turn;
        if (won) wins++;
        else if (!def.endAtHp) lost.push(`${step.region}/${f.enc}`);
        if (f.boss) {
          const hpLeft = st!.units.filter((u) => u.side === 'party').reduce((a, u) => a + u.hp / u.maxHp, 0) / 4;
          bossNotes.push(`${f.enc}:${won ? 'W' : 'L'}${Math.round(hpLeft * 100)}%/${st!.turn}t`);
        }
        if (st) applyRewards({ ...st, phase: won ? 'won' : st.phase }, s, profile, 'host', def);
      }
      const lv = s.active.map((id) => s.chars[id].level).join('/');
      const elv = regionFights(step.region).map((f) => ENEMIES[ENCOUNTERS[f.enc].enemies[0]]?.level ?? 0);
      rows.push(`${step.region.padEnd(15)} party Lv ${lv.padEnd(12)} enemy Lv ${Math.min(...elv)}-${Math.max(...elv)}  wins ${wins}/${fights}  avg turns ${Math.round(turns / Math.max(1, fights))}  ${bossNotes.join(' ')}`);
    }
    console.log(`\n${rows.join('\n')}\n`);
    // regular fights should almost never beat the AI party; bosses get three tries
    expect(lost.length, lost.join(', ')).toBeLessThanOrEqual(3);
  }, 120000);
});

// Every reference in the story and world data points at something real, and every flag a gate waits on can be set.
import { describe, expect, it } from 'vitest';
import { CHARS } from '../src/data/characters';
import { CLASS_MAP } from '../src/data/classes';
import { ENCOUNTERS } from '../src/data/encounters';
import { ENEMIES } from '../src/data/enemies';
import { ITEMS } from '../src/data/items';
import { SKILLS } from '../src/data/skills';
import type { Cmd } from '../src/data/types';
import { BOND_SCENES, CUTSCENES, JOURNALS, NPCS } from '../src/story';
import { WEAVE_ALIAS } from '../src/story/runner';
import { REGION_LIST, SCENES, SHOP_MAP } from '../src/world';

const npc = (id: string): boolean => !!NPCS[id] || Object.keys(NPCS).some((n) => n.endsWith(`_${id}`) || n.startsWith(`${id}_`) || n.includes(id));
const isChar = (id: string): boolean => id in CHARS;

function walk(cmds: Cmd[], fn: (c: Cmd) => void): void {
  for (const c of cmds) {
    fn(c);
    if (c.t === 'choice') for (const o of c.options) walk(o.cmds, fn);
    if (c.t === 'if') {
      walk(c.then, fn);
      walk(c.else ?? [], fn);
    }
    if (c.t === 'battle') walk(c.ifLose ?? [], fn);
  }
}

const allScripts: { id: string; cmds: Cmd[] }[] = [...Object.values(CUTSCENES), ...BOND_SCENES.map((b) => ({ id: b.id, cmds: b.cmds }))];

describe('content', () => {
  it('has a lot of it', () => {
    expect(Object.keys(CUTSCENES).length).toBeGreaterThan(100);
    expect(Object.keys(SCENES).length).toBeGreaterThan(40);
    expect(BOND_SCENES.length).toBeGreaterThan(25);
    expect(Object.keys(JOURNALS).length).toBe(24);
  });

  it('scenes point at real cutscenes, encounters, scenes, NPCs, shops, journals and items', () => {
    const bad: string[] = [];
    for (const s of Object.values(SCENES)) {
      if (s.onEnter && !CUTSCENES[s.onEnter]) bad.push(`${s.id}: onEnter ${s.onEnter}`);
      for (const e of s.exits) if (e.to !== 'worldmap' && !SCENES[e.to]) bad.push(`${s.id}: exit -> ${e.to}`);
      for (const o of s.objects) {
        switch (o.kind) {
          case 'trigger':
            if (!CUTSCENES[o.cutscene]) bad.push(`${s.id}: trigger ${o.cutscene}`);
            break;
          case 'npc':
            if (!CUTSCENES[o.talk]) bad.push(`${s.id}: talk ${o.talk}`);
            if (!npc(o.npc)) bad.push(`${s.id}: npc ${o.npc}`);
            break;
          case 'shop':
            if (!SHOP_MAP[o.shop]) bad.push(`${s.id}: shop ${o.shop}`);
            break;
          case 'enemy':
          case 'boss':
            if (!ENCOUNTERS[o.enc]) bad.push(`${s.id}: enc ${o.enc}`);
            if (o.kind === 'boss' && o.before && !CUTSCENES[o.before]) bad.push(`${s.id}: before ${o.before}`);
            if (o.kind === 'boss' && o.after && !CUTSCENES[o.after]) bad.push(`${s.id}: after ${o.after}`);
            break;
          case 'door':
            if (!SCENES[o.to]) bad.push(`${s.id}: door -> ${o.to}`);
            break;
          case 'journal':
            if (!JOURNALS[o.journal]) bad.push(`${s.id}: journal ${o.journal}`);
            break;
          case 'chest':
            for (const l of o.loot) if (l.item !== 'glim' && !ITEMS[l.item]) bad.push(`${s.id}: loot ${l.item}`);
            break;
        }
      }
    }
    for (const sh of Object.values(SHOP_MAP)) for (const it of sh.stock) if (!ITEMS[it.item]) bad.push(`shop ${sh.id}: ${it.item}`);
    for (const r of REGION_LIST) if (!SCENES[r.entry]) bad.push(`region ${r.id}: entry ${r.entry}`);
    expect(bad).toEqual([]);
  });

  it('encounters use real enemies', () => {
    const bad: string[] = [];
    for (const e of Object.values(ENCOUNTERS)) for (const id of e.enemies) if (!ENEMIES[id]) bad.push(`${e.id}: ${id}`);
    expect(bad).toEqual([]);
  });

  it('scripts point at real things', () => {
    const bad: string[] = [];
    for (const s of allScripts) {
      walk(s.cmds, (c) => {
        if (c.t === 'battle' && !ENCOUNTERS[c.enc]) bad.push(`${s.id}: battle ${c.enc}`);
        if (c.t === 'goto' && !SCENES[c.scene]) bad.push(`${s.id}: goto ${c.scene}`);
        if (c.t === 'give' && c.item !== 'glim' && !ITEMS[c.item]) bad.push(`${s.id}: give ${c.item}`);
        if ((c.t === 'join' || c.t === 'leave') && !isChar(c.who)) bad.push(`${s.id}: ${c.t} ${c.who}`);
        if (c.t === 'unlock' && c.kind === 'weave' && !SKILLS[WEAVE_ALIAS[c.id] ?? c.id]) bad.push(`${s.id}: weave ${c.id}`);
        if (c.t === 'unlock' && c.kind === 'class' && !CLASS_MAP[c.id]) bad.push(`${s.id}: class ${c.id}`);
        if (c.t === 'unlock' && c.kind === 'region' && !REGION_LIST.some((r) => r.id === c.id)) bad.push(`${s.id}: region ${c.id}`);
        if (c.t === 'shop' && !SHOP_MAP[c.id]) bad.push(`${s.id}: shop ${c.id}`);
        if (c.t === 'say' && c.who !== 'narrator' && !isChar(c.who) && !npc(c.who) && !c.name) bad.push(`${s.id}: speaker ${c.who}`);
        if (c.t === 'actor' && c.kind && !isChar(c.kind) && !npc(c.kind) && !ENEMIES[c.kind]) bad.push(`${s.id}: actor kind ${c.kind}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('every flag something waits on can be set', () => {
    const set = new Set<string>();
    for (const s of allScripts)
      walk(s.cmds, (c) => {
        if (c.t === 'flag') set.add(c.name);
        if (c.t === 'chapter') set.add(`ch${c.n}_start`);
      });
    const ok = (f: string): boolean => !f || set.has(f) || /^(seen|beat|got):/.test(f) || f === 'route' || f === 'game_done' || f.startsWith('bondpts:');
    const bad: string[] = [];
    for (const s of Object.values(SCENES)) {
      for (const e of s.exits) if (e.requires && !ok(e.requires)) bad.push(`${s.id} exit: ${e.requires}`);
      for (const o of s.objects) {
        const r = (o as { requires?: string }).requires;
        const u = (o as { unless?: string }).unless;
        if (r && !ok(r)) bad.push(`${s.id} ${o.kind}: requires ${r}`);
        if (u && !ok(u)) bad.push(`${s.id} ${o.kind}: unless ${u}`);
      }
    }
    for (const b of BOND_SCENES) if (b.requires && !ok(b.requires)) bad.push(`bond ${b.id}: ${b.requires}`);
    for (const r of REGION_LIST) if (r.requires && !ok(r.requires)) bad.push(`region ${r.id}: ${r.requires}`);
    expect(bad).toEqual([]);
  });

  it('both endings exist and end in credits', () => {
    for (const id of ['end_mend', 'end_tear']) {
      const cs = CUTSCENES[id];
      expect(cs, id).toBeTruthy();
      let credits = false;
      walk(cs.cmds, (c) => {
        if (c.t === 'credits') credits = true;
      });
      expect(credits, id).toBe(true);
    }
  });
});

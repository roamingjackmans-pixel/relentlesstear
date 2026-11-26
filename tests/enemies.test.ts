import { describe, expect, it } from 'vitest';
import { ENEMIES, PATTERNS } from '../src/data/enemies';
import { ART_KEYS, drawBobbin, drawEnemy, enemyBox, type EnemyPose } from '../src/render/enemyArt';

/** Every enemy id named in docs/DESIGN.md §9 (plus the sparring Corin and the boss phase defs). */
const ROSTER = [
  'spar_corin',
  'frayling', 'yarn_hound', 'unspun_hound',
  'stitch_crow', 'scarecrow', 'thimble_knight', 'old_tatter',
  'lantern_wisp', 'bog_moth', 'drowned_weaver', 'reedlurker', 'drowned_lamplighter',
  'spindle_drone', 'shear_acolyte', 'cinder_bobbin', 'loomhound', 'rook_duel', 'foreman_gristle',
  'seamharpy', 'gale_shroud', 'selvage_sentinel', 'tess_1', 'orrin_1',
  'echo_villager', 'unwoven_moth', 'knot', 'driftlight', 'tess_2', 'moth_mother',
  'choir_sentinel', 'shear_knight', 'ledger_pages', 'loom_warden', 'seraphine', 'seraphine_2',
  'seam_crawler', 'frayed_knight', 'storm_crow', 'seam_eater',
  'lost_thread', 'grief_knot', 'hollow_mender', 'unfated_ash',
  'loomhand', 'choir_seraph', 'fate_spinner', 'orrin_final', 'orrin_final_2', 'orrin_final_3', 'weaver', 'weaver_2', 'weaver_3',
  'bobbin_mimic', 'grandmother_spool', 'glass_choir', 'first_thread',
];

const PARTY_ART = new Set(['spar_corin', 'rook_duel', 'tess_1', 'tess_2', 'orrin_1', 'orrin_final', 'orrin_final_2', 'orrin_final_3', 'unfated_ash']);

/** A stand-in 2D context. Like a real canvas it rejects negative radii; it also rejects NaN / Infinity coordinates. */
function mockCtx(): { ctx: CanvasRenderingContext2D; calls: { n: number } } {
  const store: Record<string, unknown> = { globalAlpha: 1 };
  const calls = { n: 0 };
  const grad = { addColorStop: (o: number, c: string): void => {
    if (!(o >= 0 && o <= 1)) throw new Error(`bad colour stop offset ${o}`);
    if (typeof c !== 'string' || !c) throw new Error('bad colour');
  } };
  const finite = (name: string, args: unknown[]): void => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) throw new Error(`${name} got ${a}`);
  };
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop in store) return store[prop];
      return (...args: unknown[]) => {
        calls.n++;
        finite(prop, args);
        if (prop === 'arc' && (args[2] as number) < 0) throw new Error(`arc radius ${args[2]}`);
        if (prop === 'ellipse' && ((args[2] as number) < 0 || (args[3] as number) < 0)) throw new Error(`ellipse radii ${args[2]},${args[3]}`);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          if (prop === 'createRadialGradient' && ((args[2] as number) < 0 || (args[5] as number) < 0)) throw new Error('negative gradient radius');
          return grad;
        }
        if (prop === 'getLineDash') return [];
        return undefined;
      };
    },
    set(_t, prop, v) {
      if (prop === 'globalAlpha' && !(typeof v === 'number' && Number.isFinite(v))) throw new Error(`globalAlpha ${v}`);
      if ((prop === 'fillStyle' || prop === 'strokeStyle') && typeof v === 'string' && v.includes('NaN')) throw new Error(`${String(prop)} ${v}`);
      store[prop as string] = v;
      return true;
    },
  };
  return { ctx: new Proxy({}, handler) as unknown as CanvasRenderingContext2D, calls };
}

describe('enemy data', () => {
  it('has every roster enemy', () => {
    for (const id of ROSTER) expect(ENEMIES[id], id).toBeDefined();
    for (const [id, e] of Object.entries(ENEMIES)) expect(e.id).toBe(id);
  });

  it('uses party art only for the party-art foes', () => {
    for (const e of Object.values(ENEMIES)) {
      if (PARTY_ART.has(e.id)) expect(e.art.startsWith('party:'), e.id).toBe(true);
      else expect(ART_KEYS, e.id).toContain(e.art);
    }
  });

  it('has positive numbers', () => {
    for (const e of Object.values(ENEMIES)) {
      for (const k of ['level', 'hp', 'atk', 'def', 'spd', 'breakHp', 'xp', 'glim', 'size'] as const) {
        expect(e[k], `${e.id}.${k}`).toBeGreaterThan(0);
        expect(Number.isFinite(e[k]), `${e.id}.${k}`).toBe(true);
      }
      expect(e.lore.length, e.id).toBeGreaterThan(20);
    }
  });

  it('chains phases to defs that exist, with the same max HP', () => {
    for (const e of Object.values(ENEMIES)) {
      for (const ph of e.phases ?? []) {
        const to = ENEMIES[ph.to];
        expect(to, `${e.id} -> ${ph.to}`).toBeDefined();
        expect(to.hp, `${e.id} -> ${ph.to} hp`).toBe(e.hp);
        expect(ph.at).toBeGreaterThan(0);
        expect(ph.at).toBeLessThan(1);
      }
    }
    expect(ENEMIES.seraphine.phases?.[0].to).toBe('seraphine_2');
    expect(ENEMIES.weaver.phases?.[0].to).toBe('weaver_2');
    expect(ENEMIES.weaver_2.phases?.[0].to).toBe('weaver_3');
    expect(ENEMIES.orrin_final.phases?.[0].to).toBe('orrin_final_2');
    expect(ENEMIES.orrin_final_2.phases?.[0].to).toBe('orrin_final_3');
  });

  it('has learnable, readable attack timelines', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.attacks.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.attacks.length, e.id).toBeLessThanOrEqual(5);
      const ids = new Set<string>();
      for (const a of e.attacks) {
        const tag = `${e.id}.${a.id}`;
        expect(ids.has(a.id), `duplicate ${tag}`).toBe(false);
        ids.add(a.id);
        expect(a.windup, tag).toBeGreaterThanOrEqual(450);
        expect(a.windup, tag).toBeLessThanOrEqual(1200);
        expect(a.hits.length, tag).toBeLessThanOrEqual(8);
        if (!a.hits.length) expect(!!(a.selfStatus || a.heal || a.summon), `${tag} does nothing`).toBe(true);
        if (a.summon) expect(ENEMIES[a.summon], `${tag} summons ${a.summon}`).toBeDefined();
        for (let i = 0; i < a.hits.length; i++) {
          const hit = a.hits[i];
          expect(hit.power, tag).toBeGreaterThan(0);
          if (i === 0) expect(hit.at, tag).toBe(0);
          else {
            const gap = hit.at - a.hits[i - 1].at;
            expect(gap, `${tag} hit ${i} gap`).toBeGreaterThanOrEqual(180);
            expect(gap, `${tag} hit ${i} gap`).toBeLessThanOrEqual(1100);
          }
          if (hit.status) expect(hit.status.chance).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has at least 14 Wick patterns, all unique', () => {
    const ids = Object.keys(PATTERNS);
    expect(ids.length).toBeGreaterThanOrEqual(14);
    for (const id of ids) expect(id.startsWith('pat_'), id).toBe(true);
  });

  it('keeps weak points on the creature', () => {
    for (const e of Object.values(ENEMIES)) {
      for (const w of e.weakPoints ?? []) {
        expect(w.r, e.id).toBeGreaterThan(0);
        expect(w.y, e.id).toBeLessThan(0);
        if (!e.art.startsWith('party:')) {
          const box = enemyBox(e.art, 1);
          expect(Math.abs(w.x), `${e.id} ${w.name} x`).toBeLessThanOrEqual(box.w);
          expect(-w.y, `${e.id} ${w.name} y`).toBeLessThanOrEqual(box.h + 10);
        }
      }
    }
  });

  it('keeps the biggest bosses within ~420 px tall', () => {
    for (const e of Object.values(ENEMIES)) {
      if (e.art.startsWith('party:')) continue;
      expect(enemyBox(e.art, e.size).h, e.id).toBeLessThanOrEqual(425);
    }
  });
});

describe('enemy art', () => {
  const anims: EnemyPose['anim'][] = ['idle', 'windup', 'attack', 'hurt', 'die', 'broken', 'cast'];

  it('draws every art key in every pose without throwing', () => {
    const { ctx, calls } = mockCtx();
    for (const art of [...ART_KEYS, 'party:rook', 'no_such_enemy']) {
      for (const anim of anims) {
        for (const [t, p, flash] of [
          [0, 0, 0],
          [1.37, 0.31, 0.5],
          [12.9, 0.77, 1],
          [123.4, 1, 0.2],
        ]) {
          const before = calls.n;
          drawEnemy(ctx, art, 600, 560, 1.3, { t, anim, p, flash, alpha: 1, seed: 3.7 });
          expect(calls.n, `${art} ${anim}`).toBeGreaterThan(before);
        }
      }
    }
  });

  it('draws nothing when fully faded', () => {
    const { ctx, calls } = mockCtx();
    drawEnemy(ctx, 'frayling', 0, 0, 1, { t: 0, anim: 'idle', p: 0, flash: 0, alpha: 0, seed: 0 });
    expect(calls.n).toBe(0);
  });

  it('gives every art key a sensible box', () => {
    for (const art of ART_KEYS) {
      const b = enemyBox(art, 1);
      expect(b.w, art).toBeGreaterThan(30);
      expect(b.h, art).toBeGreaterThan(50);
    }
    expect(enemyBox('unknown', 2).h).toBeGreaterThan(0);
  });

  it('draws Bobbin NPCs', () => {
    const { ctx, calls } = mockCtx();
    drawBobbin(ctx, 100, 560, 1, { t: 2.5, face: -1, talking: true, walk: 1.2, palette: ['#4a7ac0', '#c89a62', '#f2d27a'] });
    drawBobbin(ctx, 100, 560, 1.5, { t: 0, face: 1 });
    expect(calls.n).toBeGreaterThan(20);
  });
});

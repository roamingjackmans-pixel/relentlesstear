// A side-scrolling scene: the party walks, talks, opens, rests; roaming enemies patrol; triggers start cutscenes.
// Cutscenes drive the same actors through the methods at the bottom (setActor, walkTo, ...).
import { audio } from '../audio';
import { glyph, input } from '../core/input';
import { clamp, hashStr, lerp } from '../core/util';
import { CHARS } from '../data/characters';
import { ENCOUNTERS } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import type { CharId, Emote, Pose, SceneObject, SceneSpec } from '../data/types';
import { flagOn } from '../game/state';
import { drawFigure, figureFor, npcFigure, type ActorAnim, type Figure } from '../render/actors';
import { drawGlow, GROUND, H, W } from '../render/canvas';
import { drawBobbin, drawEnemy } from '../render/enemyArt';
import { Backdrop, drawGrade, drawVignette } from '../render/painter';
import { drawProp } from '../render/props';
import { resolveNpc } from '../ui/dialogue';
import type { Game } from '../game/game';

export interface Actor {
  id: string;
  fig: Figure | null;
  bobbin: boolean;
  palette?: string[];
  enemyArt?: string;
  enemySize?: number;
  x: number;
  y: number;
  face: 1 | -1;
  anim: ActorAnim;
  animT: number;
  pose: Pose | null;
  walk: number;
  target: number | null;
  speed: number;
  scripted: boolean;
  hidden: boolean;
  ghost: boolean;
  alpha: number;
  emote: Emote | null;
  emoteT: number;
  talking: boolean;
  party: boolean;
  /** what it was made from (a CharId, NPC id or enemy id) */
  kind?: string;
  scale: number;
  seed: number;
  vy: number;
}

interface Roamer {
  obj: Extract<SceneObject, { kind: 'enemy' }>;
  x: number;
  home: number;
  dir: 1 | -1;
  t: number;
  disabled: number;
  alert: boolean;
  art: string;
  size: number;
  hit: number;
}

const POSE_ANIM: Record<Pose, ActorAnim> = {
  idle: 'idle',
  walk: 'walk',
  kneel: 'kneel',
  down: 'down',
  sit: 'sit',
  cast: 'cast',
  point: 'point',
  look_up: 'look_up',
  hug: 'hug',
  fall: 'fall',
  guard: 'guard',
  attack: 'slash',
  hurt: 'hurt',
  victory: 'victory',
  reach: 'reach',
};

const EMOTE_TEXT: Record<Emote, string> = { '!': '!', '?': '?', '...': '…', note: '♪', tear: '💧', heart: '♥', anger: '#', sweat: '💦' };

export class Explore {
  spec: SceneSpec;
  back: Backdrop;
  camX = 0;
  camGoal: { x: number; from: number; t: number; dur: number } | null = null;
  camLock = false;
  actors = new Map<string, Actor>();
  leader: CharId = 'ash';
  trail: { x: number; face: 1 | -1 }[] = [];
  roamers: Roamer[] = [];
  t = 0;
  grade = { mode: 'normal', amt: 0, target: 0 };
  vfx: { kind: string; x: number; y: number; t: number; dur: number }[] = [];
  private triggered = new Set<string>();
  private game: Game;
  private prompt: { x: number; label: string } | null = null;
  private exitCooldown = 0.6;
  private strikeT = 0;
  /** co-op guest: position comes from the host */
  remote = false;

  constructor(game: Game, spec: SceneSpec, x: number) {
    this.game = game;
    this.spec = spec;
    this.back = new Backdrop(spec.theme, { weather: spec.weather, dark: spec.dark });
    const party = game.save.active.length ? game.save.active : (['ash'] as CharId[]);
    this.leader = party.includes('ash') ? 'ash' : party[0];
    const order = [this.leader, ...party.filter((p) => p !== this.leader)];
    order.forEach((id, i) => {
      const a = this.makeActor(id, x - i * 70 * 1, id, true);
      this.actors.set(id, a);
    });
    for (let i = 0; i < 300; i++) this.trail.push({ x: x - i * 2, face: 1 });
    for (const o of spec.objects) {
      if (o.kind === 'npc' || o.kind === 'shop') {
        const npc = resolveNpc(o.npc);
        const a = this.makeActor(o.id, o.x, o.npc, false);
        a.face = (o as { face?: string }).face === 'left' ? -1 : 1;
        if (npc?.kind === 'bobbin' || o.kind === 'shop') a.face = -1;
        this.actors.set(o.id, a);
      }
      if (o.kind === 'enemy') {
        const enc = ENCOUNTERS[o.enc];
        const first = ENEMIES[enc?.enemies[0] ?? ''];
        this.roamers.push({ obj: o, x: o.x, home: o.x, dir: -1, t: Math.random() * 6, disabled: 0, alert: false, art: first?.art ?? 'frayling', size: Math.min(1.25, (first?.size ?? 1) * 0.72), hit: 0 });
      }
    }
    this.camX = clamp(x - W / 2, 0, Math.max(0, spec.width - W));
  }

  makeActor(id: string, x: number, kind: string, party: boolean): Actor {
    const a: Actor = { id, fig: null, bobbin: false, x, y: 0, face: 1, anim: 'idle', animT: 0, pose: null, walk: 0, target: null, speed: 1, scripted: false, hidden: false, ghost: false, alpha: 1, emote: null, emoteT: 0, talking: false, party, scale: 1, seed: hashStr(id) % 1000, vy: 0 };
    this.applyKind(a, kind);
    return a;
  }

  applyKind(a: Actor, kind: string): void {
    a.kind = kind;
    a.fig = null;
    a.bobbin = false;
    a.enemyArt = undefined;
    a.ghost = false;
    if ((CHARS as Record<string, unknown>)[kind]) {
      const id = kind as CharId;
      a.fig = figureFor(id, this.game.save.chars[id]?.outfit);
      if (a.id !== kind && a.id.includes('echo')) {
        a.fig = npcFigure('ghost', undefined, a.id, id);
        a.ghost = true;
      }
      return;
    }
    const npc = resolveNpc(kind);
    if (npc) {
      if (npc.kind === 'bobbin') {
        a.bobbin = true;
        a.palette = npc.palette;
        return;
      }
      a.fig = npcFigure(npc.kind, npc.palette, npc.id, npc.id === 'corin_echo' ? 'corin' : undefined);
      a.ghost = npc.kind === 'ghost';
      return;
    }
    const en = ENEMIES[kind];
    if (en) {
      if (en.art.startsWith('party:')) {
        const cid = en.art.slice(6) as CharId;
        const f = figureFor(cid);
        a.fig = kind === 'unfated_ash' ? { ...f, look: { ...f.look, coat: '#2a2030', coat2: '#140e18', trim: '#8a6ac0', skin: '#c8b0c0', eyes: '#d0a0ff' } } : f;
      } else {
        a.enemyArt = en.art;
        a.enemySize = Math.min(1.6, en.size * 0.8);
      }
      return;
    }
    a.fig = npcFigure('villager', undefined, kind);
  }

  get lead(): Actor {
    return this.actors.get(this.leader) ?? [...this.actors.values()].find((a) => a.party) ?? [...this.actors.values()][0];
  }

  // ------------------------------------------------------------------ update

  update(dt: number, controls: boolean): void {
    this.t += dt;
    this.exitCooldown = Math.max(0, this.exitCooldown - dt);
    this.strikeT = Math.max(0, this.strikeT - dt);
    const L = this.lead;
    if (controls && !this.remote) this.controlLeader(dt);
    this.updateFollowers(dt);
    for (const a of this.actors.values()) this.updateActor(a, dt);
    this.updateRoamers(dt, controls);
    this.updateCamera(dt);
    if (this.grade.amt !== this.grade.target) this.grade.amt = lerp(this.grade.amt, this.grade.target, Math.min(1, dt * 2));
    this.vfx = this.vfx.filter((v) => (v.t += dt) < v.dur);
    // one thing at a time: a battle, a cutscene, a conversation or an exit, never two in one frame
    if (controls && !this.remote && this.game.busy === 0) {
      this.checkTriggers();
      if (this.game.busy > 0) return;
      this.updatePrompt();
      if (this.prompt && input.pressed('interact')) {
        input.eat('interact');
        void this.interact();
        return;
      }
      this.checkExits();
    } else this.prompt = null;
    void L;
  }

  private controlLeader(dt: number): void {
    const L = this.lead;
    if (L.scripted) return;
    let ax = input.axisX();
    if (Math.abs(ax) < 0.2) ax = 0;
    const run = input.down('run');
    const speed = (run ? 360 : 215) * Math.abs(ax || 0);
    if (ax) {
      L.face = ax > 0 ? 1 : -1;
      let nx = L.x + Math.sign(ax) * speed * dt;
      nx = this.applyGates(L.x, nx);
      L.x = clamp(nx, 10, this.spec.width - 10);
      L.walk += dt * (run ? 13 : 9);
      L.anim = run ? 'run' : 'walk';
      if (Math.floor(L.walk / Math.PI) !== Math.floor((L.walk - dt * (run ? 13 : 9)) / Math.PI)) audio.sfx('step', { vol: 0.25 });
    } else if (this.strikeT <= 0) L.anim = 'idle';
    if (input.pressed('strike') && this.strikeT <= 0) {
      input.eat('strike');
      this.strikeT = 0.4;
      L.anim = 'slash';
      L.animT = 0;
      audio.sfx('slash', { vol: 0.6 });
      // first strike on a roaming enemy in front
      for (const r of this.roamers) {
        if (r.disabled > 0 || this.game.save.cleared.includes(r.obj.id)) continue;
        const dx = (r.x - L.x) * L.face;
        if (dx > -20 && dx < 130) {
          r.hit = 0.3;
          this.game.fx.burst(r.x - this.camX, GROUND - 50, '#fff2c8', 16, 300);
          audio.sfx('hit_heavy');
          void this.game.roamBattle(r.obj, 'party');
          return;
        }
      }
    }
    const tr = this.trail[0];
    if (!tr || Math.abs(tr.x - L.x) > 1.5) {
      this.trail.unshift({ x: L.x, face: L.face });
      if (this.trail.length > 400) this.trail.pop();
    }
  }

  /** Gates stop the leader unless their flag is set. */
  private applyGates(from: number, to: number): number {
    for (const o of this.spec.objects) {
      if (o.kind !== 'gate' || flagOn(this.game.save, o.requires)) continue;
      if ((from < o.x && to >= o.x - 30) || (from > o.x && to <= o.x + 30)) {
        if (Math.abs(from - o.x) > 28) {
          if (!this.gateToastT || this.t - this.gateToastT > 2.5) {
            this.gateToastT = this.t;
            this.game.toast(o.text);
          }
          return from < o.x ? o.x - 31 : o.x + 31;
        }
      }
    }
    return to;
  }
  private gateToastT = 0;

  private updateFollowers(dt: number): void {
    const party = [...this.actors.values()].filter((a) => a.party && a.id !== this.leader && !a.scripted);
    let dist = 0;
    let idx = 0;
    const spacing = 62;
    party.forEach((a, i) => {
      const want = (i + 1) * spacing;
      while (idx < this.trail.length - 1 && dist < want) {
        dist += Math.abs(this.trail[idx].x - this.trail[idx + 1].x);
        idx++;
      }
      const tp = this.trail[Math.min(idx, this.trail.length - 1)];
      const goal = tp.x;
      const dx = goal - a.x;
      if (Math.abs(dx) > 2) {
        const sp = Math.min(Math.abs(dx), (Math.abs(dx) > 120 ? 420 : 260) * dt);
        a.x += Math.sign(dx) * sp;
        a.face = dx > 0 ? 1 : -1;
        a.walk += dt * (Math.abs(dx) > 120 ? 13 : 9);
        a.anim = Math.abs(dx) > 120 ? 'run' : 'walk';
      } else {
        a.anim = 'idle';
        a.face = this.lead.x > a.x ? 1 : this.lead.x < a.x - 5 ? -1 : a.face;
      }
    });
  }

  private updateActor(a: Actor, dt: number): void {
    a.animT += dt;
    if (a.emote) {
      a.emoteT -= dt;
      if (a.emoteT <= 0) a.emote = null;
    }
    if (a.target != null) {
      const dx = a.target - a.x;
      const sp = 170 * a.speed * dt;
      if (Math.abs(dx) <= sp) {
        a.x = a.target;
        a.target = null;
        a.anim = a.pose ? POSE_ANIM[a.pose] : 'idle';
      } else {
        a.x += Math.sign(dx) * sp;
        a.face = dx > 0 ? 1 : -1;
        a.walk += dt * 9 * Math.max(0.6, a.speed);
        a.anim = a.speed > 1.6 ? 'run' : 'walk';
      }
    } else if (a.scripted || !a.party) {
      a.anim = a.pose ? POSE_ANIM[a.pose] : 'idle';
    }
    if (a.y < 0 || a.vy) {
      a.vy += 1600 * dt;
      a.y = Math.min(0, a.y + a.vy * dt);
      if (a.y >= 0) a.vy = 0;
    }
  }

  private updateRoamers(dt: number, controls: boolean): void {
    const L = this.lead;
    for (const r of this.roamers) {
      r.hit = Math.max(0, r.hit - dt);
      if (this.game.save.cleared.includes(r.obj.id)) continue;
      if (!this.roamerActive(r)) continue;
      r.t += dt;
      if (r.disabled > 0) {
        r.disabled -= dt;
        continue;
      }
      const d = L.x - r.x;
      r.alert = Math.abs(d) < 300 && controls;
      if (r.alert) {
        r.dir = d > 0 ? 1 : -1;
        r.x += r.dir * 125 * dt;
      } else {
        const span = r.obj.patrol ?? 120;
        r.x += r.dir * 45 * dt;
        if (r.x > r.home + span) r.dir = -1;
        if (r.x < r.home - span) r.dir = 1;
      }
      if (controls && !this.remote && Math.abs(L.x - r.x) < 42) {
        // touched: ambush if the leader had its back turned
        const facingAway = Math.sign(r.x - L.x) !== L.face;
        void this.game.roamBattle(r.obj, facingAway ? 'enemy' : null);
        return;
      }
    }
  }

  roamerActive(r: Roamer): boolean {
    const s = this.game.save;
    if (r.obj.requires && !flagOn(s, r.obj.requires)) return false;
    if (r.obj.unless && flagOn(s, r.obj.unless)) return false;
    return true;
  }

  /** after a fled battle: the group is stunned for a moment and the party steps back */
  disableRoamer(id: string): void {
    const r = this.roamers.find((x) => x.obj.id === id);
    if (r) {
      r.disabled = 3;
      const L = this.lead;
      L.x = clamp(L.x + (L.x < r.x ? -140 : 140), 10, this.spec.width - 10);
    }
  }

  private updateCamera(dt: number): void {
    const maxX = Math.max(0, this.spec.width - W);
    if (this.camGoal) {
      const g = this.camGoal;
      g.t += dt;
      const k = Math.min(1, g.t / Math.max(0.01, g.dur));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.camX = clamp(lerp(g.from, g.x, e), 0, maxX);
      if (k >= 1 && !this.camLock) this.camGoal = null;
      return;
    }
    if (this.camLock) return;
    const L = this.lead;
    const goal = clamp(L.x - W / 2 + L.face * 90, 0, maxX);
    this.camX = lerp(this.camX, goal, Math.min(1, dt * 3.2));
  }

  private checkTriggers(): void {
    const s = this.game.save;
    const L = this.lead;
    for (const o of this.spec.objects) {
      if (o.kind === 'trigger') {
        if (this.triggered.has(o.id) || flagOn(s, `seen:${o.cutscene}`)) continue;
        if (o.requires && !flagOn(s, o.requires)) continue;
        if (o.unless && flagOn(s, o.unless)) continue;
        if (Math.abs(L.x - o.x) < 40) {
          this.triggered.add(o.id);
          void this.game.runCutscene(o.cutscene);
          return;
        }
      }
      if (o.kind === 'boss') {
        // beaten, but its closing scene never finished (the game was closed): play it now, or the story can stall
        if (flagOn(s, `beat:${o.enc}`) && o.after && !flagOn(s, `seen:${o.after}`) && !this.triggered.has(`${o.id}:after`)) {
          this.triggered.add(`${o.id}:after`);
          void this.game.runCutscene(o.after);
          return;
        }
        if (flagOn(s, `beat:${o.enc}`) || (o.requires && !flagOn(s, o.requires))) continue;
        if (Math.abs(L.x - o.x) < 150 && !this.triggered.has(o.id)) {
          this.triggered.add(o.id);
          void this.game.bossFight(o).finally(() => this.triggered.delete(o.id));
          return;
        }
      }
    }
  }

  private objVisible(o: SceneObject): boolean {
    const s = this.game.save;
    const req = (o as { requires?: string }).requires;
    const unl = (o as { unless?: string }).unless;
    if (o.kind !== 'gate' && o.kind !== 'door' && req && !flagOn(s, req)) return false;
    if (unl && flagOn(s, unl)) return false;
    switch (o.kind) {
      case 'chest':
      case 'bead':
        return !flagOn(s, `got:${o.id}`);
      case 'journal':
        return !s.journals.includes(o.journal);
      case 'boss':
        return !flagOn(s, `beat:${o.enc}`);
      case 'gate':
        return !flagOn(s, o.requires);
    }
    return true;
  }

  private updatePrompt(): void {
    const L = this.lead;
    let best: { x: number; label: string; d: number } | null = null;
    for (const o of this.spec.objects) {
      if (!this.objVisible(o)) continue;
      let label = '';
      let range = 75;
      switch (o.kind) {
        case 'chest':
          label = 'Open';
          if (o.hidden && Math.abs(L.x - o.x) > 60) continue;
          break;
        case 'journal':
          label = 'Read';
          break;
        case 'bead':
          label = 'Take';
          break;
        case 'waystitch':
          label = 'Rest';
          range = 90;
          break;
        case 'npc':
          label = 'Talk';
          break;
        case 'shop':
          label = 'Trade';
          break;
        case 'door':
          label = o.label || 'Enter';
          if (o.requires && !flagOn(this.game.save, o.requires)) continue;
          break;
        default:
          continue;
      }
      const ox = (o.kind === 'npc' || o.kind === 'shop' ? this.actors.get(o.id)?.x : undefined) ?? o.x;
      const d = Math.abs(L.x - ox);
      if (d < range && (!best || d < best.d)) best = { x: ox, label, d };
    }
    this.prompt = best ? { x: best.x, label: best.label } : null;
  }

  private async interact(): Promise<void> {
    const L = this.lead;
    let target: SceneObject | null = null;
    let bd = Infinity;
    for (const o of this.spec.objects) {
      if (!this.objVisible(o)) continue;
      if (!['chest', 'journal', 'bead', 'waystitch', 'npc', 'shop', 'door'].includes(o.kind)) continue;
      if (o.kind === 'door' && o.requires && !flagOn(this.game.save, o.requires)) continue;
      const ox = (o.kind === 'npc' || o.kind === 'shop' ? this.actors.get(o.id)?.x : undefined) ?? o.x;
      const d = Math.abs(L.x - ox);
      if (d < 95 && d < bd) {
        bd = d;
        target = o;
      }
    }
    if (!target) return;
    L.face = target.x > L.x ? 1 : -1;
    const g = this.game;
    switch (target.kind) {
      case 'chest':
        await g.openChest(target);
        break;
      case 'journal':
        await g.readJournal(target.journal);
        break;
      case 'bead':
        await g.takeBead(target.id);
        break;
      case 'waystitch':
        await g.openWaystitch(target);
        break;
      case 'npc': {
        const a = this.actors.get(target.id);
        if (a) a.face = L.x > a.x ? 1 : -1;
        await g.runCutscene(target.talk);
        break;
      }
      case 'shop': {
        const a = this.actors.get(target.id);
        if (a) a.face = L.x > a.x ? 1 : -1;
        await g.openShop(target.shop);
        break;
      }
      case 'door':
        audio.sfx('door');
        await g.gotoScene(target.to, target.toX);
        break;
    }
  }

  private checkExits(): void {
    if (this.exitCooldown > 0) return;
    const L = this.lead;
    const side = L.x <= 14 ? 'left' : L.x >= this.spec.width - 14 ? 'right' : null;
    if (!side) return;
    const ex = this.spec.exits.find((e) => e.side === side);
    if (!ex) return;
    if (ex.requires && !flagOn(this.game.save, ex.requires)) {
      this.game.toast(ex.locked ?? 'The way is closed for now.');
      L.x = side === 'left' ? 60 : this.spec.width - 60;
      this.exitCooldown = 1;
      return;
    }
    this.exitCooldown = 2;
    if (ex.to === 'worldmap') void this.game.openWorldMap(this.spec.region, { scene: this.spec.id, x: side === 'left' ? 70 : this.spec.width - 70 });
    else void this.game.gotoScene(ex.to, ex.toX);
  }

  // ------------------------------------------------------------------ draw

  draw(ctx: CanvasRenderingContext2D, dt: number): void {
    const [sx, sy] = this.game.fx.offset();
    const cam = this.camX - sx;
    ctx.save();
    ctx.translate(0, sy);
    this.back.drawBack(ctx, cam, this.t);
    this.back.drawGround(ctx, cam);
    ctx.save();
    ctx.translate(-cam, 0);
    const lights: { x: number; y: number; r: number; a?: number }[] = [];
    const visL = cam - 300;
    const visR = cam + W + 300;
    // back props
    this.spec.objects.forEach((o, i) => {
      if (o.kind !== 'prop' || o.layer === 'front' || o.x < visL - 200 || o.x > visR + 200) return;
      const l = drawProp(ctx, o.prop, o.x, GROUND + 6, o.scale ?? 1, this.spec.theme, this.t, i * 31 + (hashStr(this.spec.id) % 97));
      if (l) lights.push({ ...l, x: l.x - cam });
    });
    for (const o of this.spec.objects) {
      if (o.x < visL || o.x > visR || !this.objVisible(o)) continue;
      this.drawObject(ctx, o, lights, cam);
    }
    // actors: NPCs and roamers first, then the party (leader last)
    const list = [...this.actors.values()].filter((a) => !a.hidden && a.x > visL && a.x < visR);
    list.sort((a, b) => (a.party ? 1 : 0) - (b.party ? 1 : 0) || (a.id === this.leader ? 1 : 0) - (b.id === this.leader ? 1 : 0));
    for (const r of this.roamers) {
      if (this.game.save.cleared.includes(r.obj.id) || !this.roamerActive(r)) continue;
      if (r.x < visL || r.x > visR) continue;
      const flick = r.disabled > 0 ? 0.35 + 0.35 * Math.sin(this.t * 30) : 1;
      ctx.save();
      if (r.dir > 0) {
        ctx.translate(r.x * 2, 0);
        ctx.scale(-1, 1);
      }
      drawEnemy(ctx, r.art, r.x, GROUND + 4, r.size, { t: this.t + r.home, anim: r.hit > 0 ? 'hurt' : r.alert ? 'windup' : 'idle', p: r.hit > 0 ? 1 - r.hit / 0.3 : (this.t % 1.2) / 1.2, flash: r.hit, alpha: flick, seed: r.home });
      ctx.restore();
      if (r.alert && r.disabled <= 0) {
        ctx.fillStyle = '#ff5a4a';
        ctx.font = '700 26px "IM Fell English SC", Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('!', r.x, GROUND - 130 * r.size - 20);
      }
    }
    for (const a of list) this.drawActor(ctx, a);
    // party glow
    const wick = this.actors.get('wick');
    if (wick && !wick.hidden) lights.push({ x: wick.x - cam, y: GROUND - 50, r: 260 });
    lights.push({ x: this.lead.x - cam, y: GROUND - 60, r: 300, a: 0.85 });
    // front props
    this.spec.objects.forEach((o, i) => {
      if (o.kind !== 'prop' || o.layer !== 'front' || o.x < visL || o.x > visR) return;
      drawProp(ctx, o.prop, o.x, GROUND + 40, (o.scale ?? 1) * 1.15, this.spec.theme, this.t, i * 31);
    });
    // vfx in world space
    for (const v of this.vfx) this.drawVfx(ctx, v);
    // interaction prompt
    if (this.prompt) this.drawPrompt(ctx, this.prompt.x, this.prompt.label);
    for (const a of list) if (a.emote) this.drawEmote(ctx, a);
    ctx.restore();
    this.back.drawFront(ctx, cam, this.t, dt);
    this.back.drawLight(ctx, lights);
    ctx.restore();
    drawGrade(ctx, this.grade.mode, this.grade.amt);
    drawVignette(ctx, 0.42);
  }

  drawActor(ctx: CanvasRenderingContext2D, a: Actor): void {
    const y = GROUND + 4 + a.y;
    if (a.bobbin) {
      drawBobbin(ctx, a.x, y, 1.25 * a.scale, { t: this.t + a.seed, face: a.face, palette: a.palette, talking: a.talking, walk: a.anim === 'walk' ? a.walk : undefined });
      return;
    }
    if (a.enemyArt) {
      ctx.save();
      if (a.face > 0) {
        ctx.translate(a.x * 2, 0);
        ctx.scale(-1, 1);
      }
      drawEnemy(ctx, a.enemyArt, a.x, y, a.enemySize ?? 1, { t: this.t + a.seed, anim: a.anim === 'cast' ? 'cast' : a.anim === 'slash' ? 'attack' : a.anim === 'down' ? 'broken' : 'idle', p: (this.t % 1.5) / 1.5, flash: 0, alpha: a.alpha, seed: a.seed });
      ctx.restore();
      return;
    }
    if (!a.fig) return;
    const p = a.anim === 'slash' ? Math.min(1, a.animT / 0.35) : (this.t % 1.2) / 1.2;
    drawFigure(ctx, a.fig, a.x, y, { anim: a.anim, t: this.t + a.seed, p, face: a.face, walk: a.walk, flash: 0, alpha: a.alpha, scale: 1.02 * a.scale, ghost: a.ghost, talking: a.talking });
  }

  private drawObject(ctx: CanvasRenderingContext2D, o: SceneObject, lights: { x: number; y: number; r: number }[], cam: number): void {
    const t = this.t;
    const y = GROUND + 6;
    switch (o.kind) {
      case 'waystitch': {
        // a tall stitched post with a glowing spool and a spiral of gold thread
        ctx.fillStyle = '#4a3222';
        ctx.fillRect(o.x - 6, y - 150, 12, 150);
        ctx.fillStyle = '#c89a5a';
        ctx.fillRect(o.x - 22, y - 172, 44, 10);
        ctx.fillRect(o.x - 22, y - 128, 44, 10);
        ctx.fillStyle = '#e25b3a';
        ctx.fillRect(o.x - 16, y - 162, 32, 34);
        ctx.strokeStyle = 'rgba(255,220,140,0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) {
          const k = i / 40;
          const xx = o.x + Math.sin(k * 18 + t * 2) * 22 * (1 - k * 0.3);
          const yy = y - 20 - k * 150;
          i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
        drawGlow(ctx, o.x, y - 145, 90 + 10 * Math.sin(t * 2), '#ffd36a', 0.65);
        if (o.camp) drawProp(ctx, 'campfire', o.x + 70, y, 0.8, this.spec.theme, t, 7);
        lights.push({ x: o.x - cam, y: y - 120, r: 340 });
        break;
      }
      case 'chest': {
        const near = Math.abs(this.lead.x - o.x) < 220;
        if (o.hidden && !near) {
          drawGlow(ctx, o.x, y - 20, 14 + 4 * Math.sin(t * 4), '#fff2c8', 0.5);
          break;
        }
        ctx.save();
        ctx.globalAlpha = o.hidden ? 0.85 : 1;
        const gr = ctx.createLinearGradient(0, y - 46, 0, y);
        gr.addColorStop(0, '#8a5a32');
        gr.addColorStop(1, '#4a2e1a');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.roundRect(o.x - 30, y - 40, 60, 40, 5);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(o.x, y - 40, 30, 12, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#e7b75a';
        ctx.lineWidth = 3;
        ctx.strokeRect(o.x - 30, y - 40, 60, 40);
        ctx.fillStyle = '#e7b75a';
        ctx.fillRect(o.x - 5, y - 30, 10, 12);
        ctx.restore();
        drawGlow(ctx, o.x, y - 30, 40 + 6 * Math.sin(t * 3), '#ffd36a', 0.35);
        lights.push({ x: o.x - cam, y: y - 30, r: 120 });
        break;
      }
      case 'journal': {
        const bob = Math.sin(t * 2 + o.x) * 4;
        drawGlow(ctx, o.x, y - 50 + bob, 46, '#fff2c8', 0.6);
        ctx.save();
        ctx.translate(o.x, y - 50 + bob);
        ctx.rotate(Math.sin(t + o.x) * 0.1);
        ctx.fillStyle = '#f3e6c8';
        ctx.fillRect(-14, -18, 28, 36);
        ctx.strokeStyle = 'rgba(90,60,30,0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(-9, -10 + i * 6);
          ctx.lineTo(9, -10 + i * 6);
          ctx.stroke();
        }
        ctx.restore();
        lights.push({ x: o.x - cam, y: y - 50, r: 150 });
        break;
      }
      case 'bead':
        drawGlow(ctx, o.x, y - 26 + Math.sin(t * 3) * 3, 30, '#9ae8ff', 0.8);
        ctx.fillStyle = 'rgba(200,245,255,0.9)';
        ctx.beginPath();
        ctx.arc(o.x, y - 26 + Math.sin(t * 3) * 3, 8, 0, Math.PI * 2);
        ctx.fill();
        lights.push({ x: o.x - cam, y: y - 26, r: 110 });
        break;
      case 'gate': {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,220,140,0.75)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.moveTo(o.x - 10 + Math.sin(t * 2 + i) * 3, y - 20 - i * 26);
          ctx.lineTo(o.x + 10 + Math.cos(t * 2 + i) * 3, y - 40 - i * 26);
          ctx.stroke();
        }
        drawGlow(ctx, o.x, y - 120, 80, '#ffd36a', 0.3);
        ctx.restore();
        break;
      }
      case 'door': {
        const open = !o.requires || flagOn(this.game.save, o.requires);
        if (!open) break;
        drawGlow(ctx, o.x, y - 40, 50, '#ffd88a', 0.35 + 0.1 * Math.sin(t * 2));
        break;
      }
      case 'boss': {
        const en = ENCOUNTERS[o.enc];
        const def = ENEMIES[en?.enemies[0] ?? ''];
        if (!def) break;
        if (def.art.startsWith('party:')) break;
        drawEnemy(ctx, def.art, o.x, y, Math.min(2.2, def.size * 0.85), { t, anim: 'idle', p: (t % 2) / 2, flash: 0, alpha: 1, seed: 3 });
        break;
      }
    }
  }

  private drawPrompt(ctx: CanvasRenderingContext2D, x: number, label: string): void {
    const text = `${glyph('interact')}  ${label}`;
    ctx.save();
    ctx.font = '600 18px Spectral, Georgia, serif';
    const w = ctx.measureText(text).width + 26;
    const y = GROUND - 190 + Math.sin(this.t * 3) * 3;
    ctx.fillStyle = 'rgba(20,12,16,0.85)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 16, w, 32, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(231,183,90,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f3e6c8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  private drawEmote(ctx: CanvasRenderingContext2D, a: Actor): void {
    const h = a.bobbin ? 80 : a.fig ? 135 * a.fig.look.height : 140;
    const x = a.x + 18;
    const y = GROUND - h - 22 - Math.max(0, Math.sin((1 - a.emoteT) * 8)) * 6;
    ctx.save();
    ctx.fillStyle = '#f3e6c8';
    ctx.strokeStyle = '#2a1a1e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 14);
    ctx.lineTo(x - 14, y + 26);
    ctx.lineTo(x, y + 15);
    ctx.fill();
    ctx.fillStyle = a.emote === 'heart' || a.emote === 'anger' ? '#c83a3a' : '#2a1a1e';
    ctx.font = '700 22px "IM Fell English SC", Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(EMOTE_TEXT[a.emote!] ?? '!', x, y + 1);
    ctx.restore();
  }

  private drawVfx(ctx: CanvasRenderingContext2D, v: { kind: string; x: number; y: number; t: number; dur: number }): void {
    const k = v.t / v.dur;
    const y = v.y || GROUND - 70;
    switch (v.kind) {
      case 'stitch':
      case 'threads':
        ctx.strokeStyle = `rgba(255,215,120,${1 - k})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + v.t;
          ctx.beginPath();
          ctx.moveTo(v.x, y);
          ctx.quadraticCurveTo(v.x + Math.cos(a) * 40, y + Math.sin(a) * 40, v.x + Math.cos(a + 0.5) * 90 * k, y + Math.sin(a + 0.5) * 90 * k);
          ctx.stroke();
        }
        break;
      case 'unravel':
        ctx.strokeStyle = `rgba(255,240,240,${1 - k})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 20; i++) {
          ctx.beginPath();
          ctx.moveTo(v.x + (i - 10) * 6, y + 40 - k * 60);
          ctx.bezierCurveTo(v.x + (i - 10) * 9, y - k * 160, v.x + (i - 10) * 14, y - 80 - k * 200, v.x + (i - 10) * 20, y - 140 - k * 300);
          ctx.stroke();
        }
        break;
      case 'tear':
        drawGlow(ctx, v.x, y - 100, 300 * Math.min(1, k * 2), '#ffffff', 1 - k * 0.5);
        ctx.fillStyle = `rgba(255,255,255,${0.95 - k * 0.5})`;
        ctx.fillRect(v.x - 6 - k * 10, 0, 12 + k * 20, GROUND);
        break;
      case 'glow':
      case 'burst':
      case 'sparkle':
        drawGlow(ctx, v.x, y, 160 * (v.kind === 'burst' ? k * 2 : 1), v.kind === 'sparkle' ? '#fff2c8' : '#ffd36a', 1 - k);
        break;
      case 'smoke':
        ctx.fillStyle = `rgba(60,50,50,${0.5 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(v.x, y - k * 40, 40 + k * 60, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'petals':
      case 'stars':
        for (let i = 0; i < 18; i++) drawGlow(ctx, v.x + Math.sin(i * 7.1) * 200, y - 200 + ((i * 53 + v.t * 60) % 300), 8, v.kind === 'stars' ? '#ffffff' : '#ffb0c0', (1 - k) * 0.8);
        break;
      case 'rain_heavy':
        break;
    }
  }

  // ------------------------------------------------------------------ cutscene hooks

  setActor(id: string, x: number, face: 'left' | 'right' = 'right', pose: Pose = 'idle', kind?: string, hidden = false): Actor {
    let a = this.actors.get(id);
    if (!a) {
      a = this.makeActor(id, x, kind ?? id, false);
      this.actors.set(id, a);
    } else if (kind && kind !== id) this.applyKind(a, kind);
    a.x = x;
    a.face = face === 'left' ? -1 : 1;
    a.pose = pose;
    a.anim = POSE_ANIM[pose];
    a.hidden = hidden;
    a.scripted = true;
    a.target = null;
    a.alpha = 1;
    return a;
  }

  actor(id: string): Actor | undefined {
    return this.actors.get(id);
  }

  /** release scripted control at the end of a cutscene: party members rejoin the follow line, cutscene-only actors leave */
  releaseActors(): void {
    for (const [id, a] of [...this.actors]) {
      a.talking = false;
      if (a.party) {
        a.scripted = false;
        a.pose = null;
        a.target = null;
        a.hidden = false;
        continue;
      }
      const isObj = this.spec.objects.some((o) => o.kind !== 'prop' && (o as { id?: string }).id === id);
      if (!isObj) this.actors.delete(id);
      else {
        a.scripted = false;
        a.target = null;
      }
    }
    // re-seed the trail behind the leader so followers don't sprint across the screen
    const L = this.lead;
    this.trail = [];
    for (let i = 0; i < 300; i++) this.trail.push({ x: L.x - L.face * i * 2, face: L.face });
    this.camGoal = null;
    this.camLock = false;
  }

  /** party changes (join/leave) while in a scene */
  syncParty(): void {
    const s = this.game.save;
    for (const [id, a] of [...this.actors]) if (a.party && !s.active.includes(id as CharId)) this.actors.delete(id);
    s.active.forEach((id, i) => {
      if (!this.actors.has(id)) {
        const a = this.makeActor(id, this.lead?.x ?? 300 - i * 60, id, true);
        this.actors.set(id, a);
      } else this.actors.get(id)!.party = true;
    });
    if (!s.active.includes(this.leader)) this.leader = s.active[0];
  }

  cameraTo(x: number, ms: number, lock = true): void {
    this.camGoal = { x: clamp(x - W / 2, 0, Math.max(0, this.spec.width - W)), from: this.camX, t: 0, dur: ms / 1000 };
    this.camLock = lock;
  }

  addVfx(kind: string, x: number, y: number | undefined, ms: number): void {
    this.vfx.push({ kind, x, y: y ?? 0, t: 0, dur: ms / 1000 });
  }
}

export { H };

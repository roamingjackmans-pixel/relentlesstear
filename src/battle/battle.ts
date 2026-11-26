// The battle screen: draws the fight, runs the turn loop, the command menus, the timed inputs (rings, holds, rhythm
// arrows), live defense (dodge/parry/jump), Free Aim, and co-op hand-offs. Rules live in engine.ts.
import { audio } from '../audio';
import { glyph, input, type Action } from '../core/input';
import { clamp, easeOut, lerp, rgba } from '../core/util';
import { CHARS } from '../data/characters';
import { ITEMS } from '../data/items';
import { BASIC, skill, type SkillDef } from '../data/skills';
import type { CharId, Element, StatusId } from '../data/types';
import { drawFigure, figureFor, portrait, type ActorAnim, type Figure } from '../render/actors';
import { ctx2d, drawGlow, GROUND, H, makeCanvas, W } from '../render/canvas';
import { drawEnemy, enemyBox } from '../render/enemyArt';
import { Backdrop, drawVignette } from '../render/painter';
import { btn, h, pushLayer } from '../ui/dom';
import type { Game } from '../game/game';
import * as E from './engine';
import type { BState, Defense, EnemyPlan, Ev, PAction, Quality, Unit } from './types';

const PARTY_SLOTS = [
  { x: 420, y: 610 },
  { x: 330, y: 548 },
  { x: 260, y: 640 },
  { x: 170, y: 572 },
];
const ENEMY_SLOTS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 950, y: 605 }],
  2: [
    { x: 880, y: 620 },
    { x: 1070, y: 565 },
  ],
  3: [
    { x: 850, y: 630 },
    { x: 990, y: 555 },
    { x: 1110, y: 630 },
  ],
  4: [
    { x: 830, y: 615 },
    { x: 950, y: 545 },
    { x: 1050, y: 640 },
    { x: 1160, y: 570 },
  ],
  5: [
    { x: 820, y: 620 },
    { x: 930, y: 545 },
    { x: 1020, y: 645 },
    { x: 1120, y: 565 },
    { x: 1190, y: 650 },
  ],
};
const EL_COLOR: Record<Element, string> = { phys: '#ffffff', fire: '#ff8a3a', ice: '#9ad8ff', storm: '#ffe66a', earth: '#c8a060', light: '#fff4c0', dark: '#b08ae0', thread: '#ff8ab0' };
const STATUS_ICON: Partial<Record<StatusId, [string, string]>> = {
  burn: ['🔥', '#ff8a3a'],
  freeze: ['❄', '#9ad8ff'],
  shock: ['ϟ', '#ffe66a'],
  marked: ['◎', '#ff5a5a'],
  shield: ['⛨', '#e7b75a'],
  empower: ['▲', '#ff7a6a'],
  haste: ['»', '#8ad8a0'],
  slow: ['«', '#8a9ad8'],
  weaken: ['▼', '#c08ae0'],
  expose: ['◇', '#ffb0a0'],
  regen: ['✚', '#8ad88a'],
  silence: ['∅', '#aaaaaa'],
  curse: ['☠', '#c06ae0'],
  bleed: ['♦', '#e04a4a'],
  taunt: ['!', '#ffd36a'],
  stun: ['✦', '#ffe08a'],
};

interface UView {
  x: number;
  y: number;
  hx: number;
  hy: number;
  anim: ActorAnim | 'windup' | 'attack' | 'cast' | 'broken' | 'die';
  a0: number;
  adur: number;
  flash: number;
  alpha: number;
  jump: number;
  hpShown: number;
  fig: Figure | null;
  face: 1 | -1;
  size: number;
  dead: number;
}

type QBeat = { t: number; q: Quality | null; dir?: number };
interface Qte {
  kind: 'tap' | 'hold' | 'rhythm';
  beats: QBeat[];
  holdStart?: number;
  holdDur?: number;
  holdRel?: number;
  start: number;
  ax: number;
  ay: number;
  onBeat: (i: number, q: Quality) => void;
  done: (qs: Quality[]) => void;
  auto?: Quality[];
  fin?: boolean;
}

interface DefHit {
  t: number;
  kind: string;
  i: number;
  resolved: boolean;
  d: Defense;
}
interface DefState {
  plan: EnemyPlan;
  hits: DefHit[];
  local: string[]; // party uids defended by this client
  lastPress: number;
  used: Set<number>;
  presses: { a: Defense; t: number; used: boolean }[];
}

export interface BattleLink {
  me: string; // this client's controller id ('host' or a user id)
  isHost: boolean;
  sendAct(turn: number, uid: string, act: PAction, quals: Quality[]): void;
  waitAct(turn: number, uid: string): Promise<{ act: PAction; quals: Quality[] }>;
  sendPlan(turn: number, plan: EnemyPlan): void;
  waitPlan(turn: number): Promise<EnemyPlan>;
  sendDef(turn: number, uid: string, defs: Defense[]): void;
  waitDef(turn: number, uid: string): Promise<Defense[]>;
  sendState(st: BState, items: Record<string, number>): void;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Actions after which the same unit keeps its turn: Free Aim shots and Deadeye. */
function keepsTurn(a: PAction): boolean {
  return a.k === 'shot' || (a.k === 'skill' && !!skill(a.id)?.effects?.some((e) => e.k === 'free_shots'));
}

/** Turn-order portraits, pre-shrunk once (shrinking a full portrait 9 times a frame is wasted work). */
const smallCache = new Map<string, HTMLCanvasElement>();
function smallPortrait(id: CharId, outfit: string | null, expr: 'neutral' | 'angry'): HTMLCanvasElement {
  const key = `${id}|${outfit}|${expr}`;
  let c = smallCache.get(key);
  if (!c) {
    c = makeCanvas(84, 92);
    ctx2d(c).drawImage(portrait(figureFor(id, outfit), expr), 0, 0, 84, 92);
    smallCache.set(key, c);
  }
  return c;
}

/** A small round portrait of an enemy for the turn order, drawn once per art. */
const iconCache = new Map<string, HTMLCanvasElement>();
function enemyIcon(art: string): HTMLCanvasElement {
  let c = iconCache.get(art);
  if (c) return c;
  c = makeCanvas(64, 64);
  const g = ctx2d(c);
  const box = enemyBox(art, 1);
  const k = Math.min(1, 54 / Math.max(box.w, box.h));
  g.fillStyle = '#3a1418';
  g.fillRect(0, 0, 64, 64);
  drawEnemy(g, art, 32, 32 + (box.h * k) / 2, k, { t: 0.4, anim: 'idle', p: 0.3, flash: 0, alpha: 1, seed: 1 });
  iconCache.set(art, c);
  return c;
}

export class Battle {
  st: BState;
  items: Record<string, number>;
  back: Backdrop;
  view = new Map<string, UView>();
  t = 0;
  hint = '';
  qte: Qte | null = null;
  def: DefState | null = null;
  aim: { uid: string; x: number; y: number; on: boolean } | null = null;
  targeting: { uids: string[]; i: number; all: boolean; resolve: (uid: string | null) => void } | null = null;
  banner: { text: string; t: number; color: string } | null = null;
  private menuEl: HTMLElement | null = null;
  private popMenu: (() => void) | null = null;
  private done!: (r: BState['phase']) => void;
  private game: Game;
  link: BattleLink | null;
  me: string;
  private tutorialShown = false;
  speedUp = 1;
  private lastDefenseKind = '';
  defBtns: HTMLElement | null = null;
  private ended = false;
  /** co-op guests: the host's state at the start of a turn, adopted to undo any drift */
  pendingSync: { st: BState; items: Record<string, number> } | null = null;

  constructor(game: Game, st: BState, items: Record<string, number>, link: BattleLink | null) {
    this.game = game;
    this.st = st;
    this.items = items;
    this.link = link;
    this.me = link?.me ?? 'host';
    this.back = new Backdrop(st.theme);
    this.layout();
  }

  // ------------------------------------------------------------------ layout & lookup

  private layout(): void {
    const party = this.st.units.filter((u) => u.side === 'party');
    party.forEach((u, i) => {
      const s = PARTY_SLOTS[i] ?? PARTY_SLOTS[0];
      if (!this.view.has(u.uid)) this.view.set(u.uid, this.newView(u, s.x, s.y));
    });
    const foes = this.st.units.filter((u) => u.side === 'enemy');
    const slots = ENEMY_SLOTS[Math.min(5, Math.max(1, foes.length))];
    foes.forEach((u, i) => {
      let s = slots[i] ?? { x: 900 + i * 60, y: 600 };
      if (foes.length === 1 && u.size > 1.6) s = { x: 980, y: 625 };
      if (!this.view.has(u.uid) && this.view.size > 0) {
        // a summon: the first spot no living enemy stands on
        const living = foes.filter((f) => !f.ko && this.view.has(f.uid)).map((f) => this.v(f.uid));
        s = ENEMY_SLOTS[5].find((c) => living.every((v) => Math.hypot(v.hx - c.x, v.hy - c.y) > 70)) ?? { x: 860 + Math.random() * 280, y: 560 + Math.random() * 80 };
      }
      if (!this.view.has(u.uid)) {
        const v = this.newView(u, s.x, s.y);
        v.alpha = 0;
        this.view.set(u.uid, v);
      }
    });
  }

  private newView(u: Unit, x: number, y: number): UView {
    let fig: Figure | null = null;
    if (u.side === 'party') fig = figureFor(u.id as CharId, this.game.save.chars[u.id as CharId]?.outfit);
    else if (u.art.startsWith('party:')) {
      const f = figureFor(u.art.slice(6) as CharId);
      fig = u.id === 'unfated_ash' ? { ...f, look: { ...f.look, coat: '#2a2030', coat2: '#140e18', trim: '#8a6ac0', skin: '#c8b0c0', eyes: '#d0a0ff', glow: '#8a5ad0' } } : f;
    }
    return { x, y, hx: x, hy: y, anim: u.ko ? 'ko' : 'ready', a0: 0, adur: 0, flash: 0, alpha: 1, jump: 0, hpShown: u.hp, fig, face: u.side === 'party' ? 1 : -1, size: u.size, dead: u.ko ? 1 : 0 };
  }

  private v(uid: string): UView {
    return this.view.get(uid)!;
  }

  private headY(uid: string): number {
    const u = E.unit(this.st, uid)!;
    const v = this.v(uid);
    if (u.side === 'party' || v.fig) return v.y - 150 * (v.fig?.look.height ?? 1) * (u.side === 'enemy' ? u.size : 1) - 10;
    return v.y - enemyBox(u.art, u.size).h - 6;
  }

  private midY(uid: string): number {
    const v = this.v(uid);
    return (v.y + this.headY(uid)) / 2;
  }

  private anim(uid: string, a: UView['anim'], dur = 600): void {
    const v = this.view.get(uid);
    if (!v) return;
    v.anim = a;
    v.a0 = this.t;
    v.adur = dur / 1000;
  }

  private isLocal(u: Unit): boolean {
    if (u.side !== 'party') return false;
    return u.ctrl === this.me || (this.me === 'host' && u.ctrl === 'host');
  }

  // ------------------------------------------------------------------ main loop

  run(): Promise<BState['phase']> {
    return new Promise((res) => {
      this.done = res;
      void this.loop();
    });
  }

  private async loop(): Promise<void> {
    audio.music(this.st.music);
    // enemies fade in
    for (const u of this.st.units) if (u.side === 'enemy') this.v(u.uid).alpha = 0;
    this.say(this.st.first === 'party' ? 'First Strike!' : this.st.first === 'enemy' ? 'Ambushed!' : '', '#ffe08a');
    if (this.st.first === 'party') {
      for (const u of E.alive(this.st, 'enemy')) {
        this.v(u.uid).flash = 1;
        this.game.fx.burst(this.v(u.uid).x, this.midY(u.uid), '#fff2c8', 14, 280);
      }
      audio.sfx('hit_heavy');
    }
    await this.wait(700);
    if (!this.tutorialShown) {
      this.tutorialShown = true;
      await this.game.tutorialOnce('battle_basics');
      await this.game.tutorialOnce('defense');
    }
    while (this.st.phase === 'turn') {
      if (this.link?.isHost) this.link.sendState(this.st, this.items);
      else if (this.link && this.pendingSync && this.pendingSync.st.turn === this.st.turn) {
        this.st = this.pendingSync.st;
        Object.assign(this.items, this.pendingSync.items);
        this.pendingSync = null;
        this.layout();
      }
      const ts = E.startTurn(this.st);
      if (!ts) break;
      await this.showEvents(ts.evs);
      if (this.st.phase !== 'turn') break;
      const u = E.unit(this.st, ts.uid)!;
      if (ts.skip) {
        await this.wait(450);
        await this.showEvents(E.endTurn(this.st, u.uid));
        continue;
      }
      if (u.side === 'party') await this.partyTurn(u);
      else await this.enemyTurn(u);
      if (this.st.phase !== 'turn') break;
      await this.showEvents(E.endTurn(this.st, u.uid));
      await this.wait(120);
    }
    this.closeMenu();
    this.qte = null;
    this.def = null;
    this.aim = null;
    this.setDefButtons(false);
    const r = this.st.phase;
    if (r === 'won') {
      this.say('Victory', '#ffe08a');
      audio.music('victory', 300);
      for (const u of E.alive(this.st, 'party')) this.anim(u.uid, 'victory', 4000);
      await this.wait(1600);
    } else if (r === 'lost') {
      this.say('The thread snaps…', '#ff9a8a');
      audio.music('gameover', 600);
      await this.wait(1800);
    } else if (r === 'fled') {
      this.say('Escaped', '#cfe0ff');
      audio.sfx('dodge');
      await this.wait(700);
    } else if (r === 'scripted') await this.wait(900);
    this.done(r);
  }

  private wait(ms: number): Promise<void> {
    return sleep(ms / this.speedUp);
  }

  private say(text: string, color = '#ffe08a'): void {
    this.banner = text ? { text, t: 0, color } : null;
  }

  // ------------------------------------------------------------------ party turns

  private async partyTurn(u: Unit): Promise<void> {
    this.anim(u.uid, 'ready', 0);
    if (this.isLocal(u)) {
      for (;;) {
        if (this.st.phase !== 'turn') return;
        const act = await this.chooseAction(u);
        if (!act || act.k === 'shot') continue; // shots are resolved inside the aim loop
        await this.perform(u, act, null);
        if (keepsTurn(act) && this.st.phase === 'turn') continue;
        return;
      }
    }
    if (u.ctrl === 'ai' && (!this.link || this.link.isHost)) {
      await this.wait(380);
      const act = E.aiAction(this.st, u.uid, this.items);
      const sk = act.k === 'skill' ? skill(act.id) : null;
      const quals = sk ? E.aiQuals(this.st, u.uid, sk) : [];
      this.link?.sendAct(this.st.turn, u.uid, act, quals);
      await this.perform(u, act, quals);
      return;
    }
    // someone else's character (or the host's AI, seen by a guest)
    this.hint = `${u.name} is deciding…`;
    for (;;) {
      // only a seat that a player held can be handed to the AI mid-fight (the host's own AI acts by message)
      const handoff: Promise<'ai'> = u.ctrl !== 'ai' ? this.untilAi(u.uid) : new Promise(() => {});
      const got = await Promise.race([this.link!.waitAct(this.st.turn, u.uid), handoff]);
      this.hint = '';
      if (got === 'ai') {
        // the player left: the host plays this seat from now on (and tells everyone what it did)
        if (!this.link?.isHost || this.st.phase !== 'turn') return;
        const act = E.aiAction(this.st, u.uid, this.items);
        const sk = act.k === 'skill' ? skill(act.id) : null;
        const quals = sk ? E.aiQuals(this.st, u.uid, sk) : [];
        this.link.sendAct(this.st.turn, u.uid, act, quals);
        await this.perform(u, act, quals);
        return;
      }
      await this.perform(u, got.act, got.quals);
      if (!keepsTurn(got.act) || this.st.phase !== 'turn') return;
    }
  }

  /** Resolves once a unit's seat has been handed to the AI (its player left), or the fight is over. */
  private untilAi(uid: string): Promise<'ai'> {
    return new Promise((res) => {
      const iv = setInterval(() => {
        if (E.unit(this.st, uid)?.ctrl === 'ai' || this.st.phase !== 'turn' || this.ended) {
          clearInterval(iv);
          res('ai');
        }
      }, 250);
    });
  }

  /** Command menu -> a full action (or a shot, already applied). */
  private chooseAction(u: Unit): Promise<PAction | null> {
    return new Promise((resolve) => {
      const C = CHARS[u.id as CharId];
      const list = h('div', { class: 'list' });
      const close = (): void => this.closeMenu();
      const pick = (a: PAction | null): void => {
        close();
        resolve(a);
      };
      const usableWeaves = this.game.save.weaves.map((id) => skill(id)).filter((s): s is SkillDef => !!s && !E.cannotUse(this.st, u, s));
      const opts = [
        btn(h('span', {}, 'Attack ', h('span', { class: 'muted' }, '+1 AP')), () => void this.pickTarget(u, BASIC).then((t) => pick(t ? { k: 'skill', id: 'basic', target: t } : null)), 'btn', { 'data-autofocus': '1' }),
        btn('Skills', () => void this.skillMenu(u).then(pick)),
        btn(h('span', {}, 'Free Aim ', h('span', { class: 'muted' }, `${E.shotCost(u)} AP`)), () => {
          close();
          void this.aimMode(u).then(() => resolve(null));
        }),
        usableWeaves.length ? btn('✦ Weave Art', () => void this.subMenu(u, usableWeaves, true).then(pick), 'btn gold') : null,
        btn('Items', () => void this.itemMenu(u).then(pick)),
        !this.st.noFlee ? btn('Flee', () => pick({ k: 'flee' })) : null,
      ];
      for (const o of opts) if (o) list.append(o);
      const res = this.resourceText(u);
      const panel = h('div', { class: 'panel dark b-cmd' }, h('div', { class: 'who' }, h('span', {}, C.short), h('span', { style: 'font-size:16px;color:#e8c88a' }, `${u.ap} AP${res ? ` · ${res}` : ''}`)), list);
      this.menuEl = panel;
      this.popMenu = pushLayer(panel, undefined);
      if (!this.game.tutSeen.has('timing')) void this.game.tutorialOnce('timing');
    });
  }

  private resourceText(u: Unit): string {
    switch (CHARS[u.id as CharId]?.mech) {
      case 'guard':
        return `Guard ${u.guard}`;
      case 'tension':
        return `Tension ${u.tension}`;
      case 'verse':
        return u.verses.length ? u.verses.map((v) => v[0].toUpperCase()).join('') : 'no verses';
      case 'heat':
        return `Heat ${u.heat}`;
      case 'penance':
        return `Penance ${u.penance}`;
      case 'pattern':
        return u.frayed ? 'Frayed' : '';
      default:
        return '';
    }
  }

  private closeMenu(): void {
    this.popMenu?.();
    this.popMenu = null;
    this.menuEl = null;
  }

  private skillMenu(u: Unit): Promise<PAction | null> {
    const skills = u.skills.map((id) => skill(id)).filter((s): s is SkillDef => !!s);
    return this.subMenu(u, skills, false);
  }

  private subMenu(u: Unit, skills: SkillDef[], weave: boolean): Promise<PAction | null> {
    return new Promise((resolve) => {
      const desc = h('div', { class: 'desc' });
      const list = h('div', { class: 'list' });
      let pop: () => void = () => {};
      const back = (): void => {
        pop();
        resolve(null);
      };
      skills.forEach((s, i) => {
        const why = E.cannotUse(this.st, u, s);
        const b = h(
          'button',
          {
            class: 'item-row',
            'data-nav': '1',
            ...(i === 0 ? { 'data-autofocus': '1' } : {}),
            disabled: !!why,
            on: {
              focus: () => (desc.textContent = `${s.desc}${why ? `  (${why})` : ''}`),
              mouseenter: () => (desc.textContent = `${s.desc}${why ? `  (${why})` : ''}`),
              click: () => {
                if (why) return;
                audio.sfx('ui_ok');
                void this.pickTarget(u, s).then((t) => {
                  if (!t) return;
                  pop();
                  resolve({ k: 'skill', id: s.id, target: t });
                });
              },
            },
          },
          h('span', { class: 'n' }, s.name),
          h('span', { class: 'r' }, weave ? `${s.weave?.segs} Weave` : `${s.ap} AP`),
        );
        list.append(b);
      });
      if (!skills.length) list.append(h('p', { class: 'muted' }, 'No skills equipped.'));
      const panel = h('div', { class: 'panel dark b-sub' }, h('h3', {}, weave ? 'Weave Arts' : 'Skills'), list, desc);
      pop = pushLayer(panel, back);
    });
  }

  private itemMenu(u: Unit): Promise<PAction | null> {
    return new Promise((resolve) => {
      const desc = h('div', { class: 'desc' });
      const list = h('div', { class: 'list' });
      let pop: () => void = () => {};
      const back = (): void => {
        pop();
        resolve(null);
      };
      const usable = ['tincture_heal', 'tincture_revive', 'tincture_spirit', 'honey_bun', 'smelling_salts', 'spool_of_will', 'golden_thread', 'ember_vial', 'frost_vial', 'storm_vial'].filter((id) => (this.items[id] ?? 0) > 0);
      usable.forEach((id, i) => {
        const it = ITEMS[id];
        list.append(
          h(
            'button',
            {
              class: 'item-row',
              'data-nav': '1',
              ...(i === 0 ? { 'data-autofocus': '1' } : {}),
              on: {
                focus: () => (desc.textContent = it.desc),
                mouseenter: () => (desc.textContent = it.desc),
                click: () => {
                  audio.sfx('ui_ok');
                  const target = id.endsWith('_vial') ? 'enemy' : id === 'honey_bun' ? 'self' : id === 'tincture_revive' || id === 'golden_thread' ? 'ally_ko' : 'ally';
                  const pseudo: SkillDef = { ...BASIC, id: `item:${id}`, target: target === 'enemy' ? 'all_enemies' : target === 'self' ? 'self' : (target as 'ally' | 'ally_ko'), ap: 0 };
                  void this.pickTarget(u, pseudo).then((t) => {
                    if (!t) return;
                    pop();
                    resolve({ k: 'item', item: id, target: t });
                  });
                },
              },
            },
            h('span', { class: 'n' }, it.name),
            h('span', { class: 'r' }, `×${this.items[id]}`),
          ),
        );
      });
      if (!usable.length) list.append(h('p', { class: 'muted' }, 'Nothing to use.'));
      const panel = h('div', { class: 'panel dark b-sub' }, h('h3', {}, 'Items'), list, desc);
      pop = pushLayer(panel, back);
    });
  }

  /** Choose a target with arrows/mouse. Resolves with a uid, or null on Back. */
  private pickTarget(u: Unit, sk: SkillDef): Promise<string | null> {
    const cands = E.validTargets(this.st, u, sk);
    if (!cands.length) return Promise.resolve(null);
    const all = sk.target === 'all_enemies' || sk.target === 'all_allies' || sk.target === 'random_enemies';
    if (sk.target === 'self') return Promise.resolve(u.uid);
    return new Promise((resolve) => {
      let start = 0;
      if (cands[0].side === 'enemy') {
        const pri = cands.findIndex((c) => c.broken || E.has(c, 'marked'));
        start = pri >= 0 ? pri : 0;
      } else if (sk.target === 'ally') {
        start = cands.reduce((b, c, i) => (c.hp / c.maxHp < cands[b].hp / cands[b].maxHp ? i : b), 0);
      }
      // the target picker is a layer with no buttons: arrows/confirm are read in update()
      const holder = h('div', { class: 'passive' });
      const pop = pushLayer(holder, () => {
        pop();
        this.targeting = null;
        resolve(null);
      }, { noFocus: true });
      this.targeting = {
        uids: cands.map((c) => c.uid),
        i: start,
        all,
        resolve: (uid) => {
          pop();
          this.targeting = null;
          resolve(uid);
        },
      };
      this.hint = all ? `${glyph('confirm')} to use on everyone · ${glyph('back')} back` : `Choose a target · ${glyph('confirm')} confirm · ${glyph('back')} back`;
    });
  }

  // ------------------------------------------------------------------ free aim

  private async aimMode(u: Unit): Promise<void> {
    await this.game.tutorialOnce('aim');
    const foe = E.alive(this.st, 'enemy')[0];
    this.aim = { uid: u.uid, x: foe ? this.v(foe.uid).x : 900, y: foe ? this.midY(foe.uid) : 480, on: true };
    this.anim(u.uid, 'shoot', 100000);
    return new Promise((resolve) => {
      const holder = h('div', { class: 'passive' });
      const pop = pushLayer(holder, () => {
        pop();
        this.aim = null;
        this.anim(u.uid, 'ready', 0);
        this.hint = '';
        resolve();
      }, { noFocus: true });
      this.aimExit = () => {
        pop();
        this.aim = null;
        this.anim(u.uid, 'ready', 0);
        this.hint = '';
        resolve();
      };
    });
  }
  private aimExit: (() => void) | null = null;

  private fireAim(): void {
    const a = this.aim;
    if (!a) return;
    const u = E.unit(this.st, a.uid)!;
    const cost = E.shotCost(u);
    if (u.ap < cost) {
      audio.sfx('ui_error');
      this.say('Not enough AP', '#ff9a8a');
      return;
    }
    // hit test: weak points first, then bodies
    let tid = '';
    let wp = -1;
    let best = Infinity;
    for (const e of E.alive(this.st, 'enemy')) {
      const v = this.v(e.uid);
      e.wps.forEach((w, i) => {
        if (w.hp < 0) return;
        const wx = v.x + w.x * e.size;
        const wy = v.y + w.y * e.size;
        const d = Math.hypot(a.x - wx, a.y - wy);
        if (d < w.r * e.size + 12 && d < best) {
          best = d;
          tid = e.uid;
          wp = i;
        }
      });
    }
    if (!tid) {
      for (const e of E.alive(this.st, 'enemy')) {
        const v = this.v(e.uid);
        const box = e.art.startsWith('party:') ? { w: 90, h: 160 * e.size } : enemyBox(e.art, e.size);
        if (Math.abs(a.x - v.x) < box.w / 2 && a.y < v.y && a.y > v.y - box.h) {
          tid = e.uid;
          break;
        }
      }
    }
    const act: PAction = { k: 'shot', target: tid || E.alive(this.st, 'enemy')[0]?.uid || '', wp: tid ? wp : -2 };
    if (!tid) {
      // a miss: still costs the AP
      u.ap -= cost;
      u.shotsThisTurn++;
      this.tracer(a.uid, a.x, a.y, false);
      this.link?.sendAct(this.st.turn, u.uid, act, []);
      return;
    }
    this.link?.sendAct(this.st.turn, u.uid, act, []);
    const evs = E.shoot(this.st, u.uid, tid, wp);
    this.tracer(a.uid, a.x, a.y, wp >= 0);
    void this.showEvents(evs);
    if (this.st.phase !== 'turn' || !E.alive(this.st, 'enemy').length) this.aimExit?.();
  }

  private tracer(uid: string, x: number, y: number, weak: boolean): void {
    const v = this.v(uid);
    audio.sfx('shot');
    this.game.fx.add({ x: v.x + 50, y: v.y - 95, vx: (x - v.x) * 8, vy: (y - v.y + 95) * 8, life: 0.12, size: 4, color: '#fff2c8', kind: 'spark' });
    this.game.fx.burst(x, y, weak ? '#ffe08a' : '#ffffff', weak ? 18 : 8, weak ? 320 : 180);
    if (weak) this.game.fx.ring(x, y, '#ffe08a', 8, 60, 0.35, 3);
    this.anim(uid, 'shoot', 100000);
    this.recoil = this.t;
  }
  private recoil = -10;

  // ------------------------------------------------------------------ performing a party action

  /** Animate and resolve one party action. quals = null: play the timed inputs live. */
  private async perform(u: Unit, act: PAction, quals: Quality[] | null): Promise<void> {
    if (act.k === 'pass') return;
    if (act.k === 'shot') {
      if (act.wp === -2) {
        u.ap -= E.shotCost(u);
        u.shotsThisTurn++;
        return;
      }
      const evs = E.shoot(this.st, u.uid, act.target, act.wp);
      const tv = this.view.get(act.target);
      this.tracer(u.uid, tv?.x ?? 900, tv ? this.midY(act.target) : 500, act.wp >= 0);
      await this.showEvents(evs);
      await this.wait(250);
      this.anim(u.uid, 'ready', 0);
      return;
    }
    if (act.k === 'flee') {
      this.anim(u.uid, 'run', 700);
      this.v(u.uid).face = -1;
      await this.wait(500);
      const ok = E.tryFlee(this.st, u.uid);
      this.v(u.uid).face = 1;
      if (!ok) {
        this.say('Couldn’t get away!', '#ff9a8a');
        audio.sfx('ui_error');
        await this.wait(600);
      }
      if (this.isLocal(u) || (u.ctrl === 'ai' && this.link?.isHost)) this.link?.sendAct(this.st.turn, u.uid, act, []);
      return;
    }
    if (act.k === 'item') {
      if (this.isLocal(u)) this.link?.sendAct(this.st.turn, u.uid, act, []);
      this.anim(u.uid, 'cast', 600);
      audio.sfx(act.item.endsWith('_vial') ? 'explosion' : 'heal');
      await this.wait(350);
      if (act.item.endsWith('_vial')) for (const e of E.alive(this.st, 'enemy')) this.game.fx.burst(this.v(e.uid).x, this.midY(e.uid), act.item === 'ember_vial' ? '#ff8a3a' : act.item === 'frost_vial' ? '#9ad8ff' : '#ffe66a', 20, 300);
      await this.showEvents(E.useItem(this.st, u.uid, act.item, act.target, this.items));
      await this.wait(300);
      this.anim(u.uid, 'ready', 0);
      return;
    }
    const sk = skill(act.id) ?? BASIC;
    const ctx = E.beginAction(this.st, u.uid, act);
    if (ctx.error) {
      this.say(ctx.error, '#ff9a8a');
      await this.wait(500);
      return;
    }
    if (sk.weave) {
      this.say(sk.name, '#ffe08a');
      audio.sfx('weave');
      this.game.fx.flash('#fff4d0', 250);
      const partner = this.st.units.find((p) => p.side === 'party' && p.id === sk.weave!.with);
      if (partner) this.anim(partner.uid, 'cast', 1800);
    } else if (sk.id !== 'basic') this.say(sk.name, '#f3e6c8');
    const v = this.v(u.uid);
    const tgt = ctx.targets[0];
    const melee = ['slash', 'thrust', 'flurry', 'bash', 'slam', 'spin', 'leap', 'weave'].includes(sk.anim) && sk.hits.length > 0 && E.unit(this.st, tgt)?.side === 'enemy';
    if (melee && tgt) {
      const tv = this.v(tgt);
      const allE = sk.target === 'all_enemies' || sk.target === 'random_enemies';
      const dest = allE ? 760 : tv.x - 120 * Math.max(1, (E.unit(this.st, tgt)?.size ?? 1) * 0.8);
      this.anim(u.uid, 'run', 400);
      await this.tween(v, dest, tv.y + (allE ? 0 : 6), 260);
      this.anim(u.uid, 'ready', 0);
    } else if (sk.anim === 'cast' || sk.anim === 'heal' || sk.anim === 'buff' || sk.anim === 'hymn' || sk.anim === 'weave') {
      this.anim(u.uid, 'cast', 60000);
      audio.sfx(sk.anim === 'heal' ? 'magic_light' : sk.anim === 'hymn' ? 'choir' : 'magic_light', { vol: 0.5 });
    } else if (sk.anim === 'shot' || sk.anim === 'volley') this.anim(u.uid, 'shoot', 60000);
    const qte = sk.qte;
    const hits = sk.hits.length;
    const onBeat = (i: number, q: Quality): void => {
      const evs = E.actHit(this.st, ctx, i, q);
      this.beatFx(u, sk, i, q, ctx.targets);
      void this.showEvents(evs);
    };
    let qs: Quality[];
    if (qte.kind === 'none') {
      qs = [];
      for (let i = 0; i < hits; i++) onBeat(i, 'good');
    } else {
      qs = await this.runQte(u, sk, quals, onBeat);
    }
    await this.wait(200);
    if (this.st.phase === 'turn' || this.st.phase === 'won') await this.showEvents(E.finishAction(this.st, ctx));
    if (quals === null) this.link?.sendAct(this.st.turn, u.uid, act, qs);
    await this.wait(300);
    if (melee) {
      this.anim(u.uid, 'run', 300);
      v.face = -1;
      await this.tween(v, v.hx, v.hy, 260);
      v.face = 1;
    }
    this.anim(u.uid, 'ready', 0);
  }

  private tween(v: UView, x: number, y: number, ms: number): Promise<void> {
    const x0 = v.x;
    const y0 = v.y;
    const t0 = performance.now();
    return new Promise((res) => {
      const step = (): void => {
        const k = Math.min(1, (performance.now() - t0) / (ms / this.speedUp));
        const e = easeOut(k);
        v.x = lerp(x0, x, e);
        v.y = lerp(y0, y, e);
        if (k < 1) setTimeout(step, 16);
        else res();
      };
      step();
    });
  }

  private beatFx(u: Unit, sk: SkillDef, i: number, q: Quality, targets: string[]): void {
    const anim: Record<string, ActorAnim> = { slash: 'slash', thrust: 'thrust', flurry: i % 2 ? 'thrust' : 'slash', bash: 'bash', slam: 'slash', spin: 'slash', leap: 'slash', weave: 'slash', shot: 'shoot', volley: 'shoot', cast: 'cast', heal: 'cast', buff: 'cast', hymn: 'cast', throw: 'slash' };
    const a = anim[sk.anim] ?? 'slash';
    this.anim(u.uid, a, a === 'cast' || a === 'shoot' ? 60000 : 330);
    if (a === 'shoot') this.recoil = this.t;
    if (q === 'perfect') {
      audio.sfx('qte_perfect', { vol: 0.7 });
      this.game.fx.ring(this.v(u.uid).x, this.midY(u.uid), '#ffe08a', 20, 80, 0.3, 3);
    } else if (q === 'miss') audio.sfx('qte_miss', { vol: 0.5 });
    if (!sk.hits[i]) return;
    const el = sk.element ?? u.element;
    const snd = sk.anim === 'shot' || sk.anim === 'volley' ? 'shot' : sk.anim === 'thrust' || sk.anim === 'flurry' ? 'thrust' : sk.anim === 'cast' ? (el === 'dark' ? 'magic_dark' : 'magic_light') : 'slash';
    audio.sfx(snd, { vol: 0.8, pitch: 0.95 + Math.random() * 0.1 });
    for (const tid of targets.slice(0, 5)) {
      const tv = this.view.get(tid);
      if (!tv) continue;
      if (sk.anim === 'shot' || sk.anim === 'volley' || sk.anim === 'cast') {
        const uv = this.v(u.uid);
        this.game.fx.add({ x: uv.x + 40, y: this.midY(u.uid), vx: (tv.x - uv.x) * 6, vy: (this.midY(tid) - this.midY(u.uid)) * 6, life: 0.15, size: 5, color: EL_COLOR[el], kind: 'spark' });
      }
      this.game.fx.burst(tv.x, this.midY(tid), EL_COLOR[el], q === 'perfect' ? 18 : 10, q === 'perfect' ? 340 : 240);
      if (el === 'thread' || u.id === 'ash' || u.id === 'wick') this.game.fx.threads(tv.x, this.midY(tid), u.id === 'wick' ? '#ff9a5a' : '#ffd36a', 4);
    }
  }

  // ------------------------------------------------------------------ timed inputs

  private windows(): { perfect: number; good: number } {
    const m = this.st.difficulty === 'story' ? 1.5 : this.st.difficulty === 'unthreaded' ? 0.75 : 1;
    return { perfect: 70 * m, good: 150 * m };
  }

  private runQte(u: Unit, sk: SkillDef, auto: Quality[] | null, onBeat: (i: number, q: Quality) => void): Promise<Quality[]> {
    const q = sk.qte;
    const tid = sk.target === 'all_enemies' || sk.target === 'random_enemies' ? (E.alive(this.st, 'enemy')[0]?.uid ?? u.uid) : sk.target === 'self' || sk.target === 'all_allies' ? u.uid : (E.unit(this.st, (this as { _t?: string })._t ?? '')?.uid ?? u.uid);
    void tid;
    const lead = 700;
    const now = performance.now();
    const target = this.lastTarget(sk, u);
    const ax = target ? this.v(target).x : this.v(u.uid).x;
    const ay = target ? this.midY(target) : this.midY(u.uid);
    return new Promise((resolve) => {
      const beats: QBeat[] = q.kind === 'hold' ? [{ t: now + lead, q: null }] : q.kind === 'none' ? [] : q.beats.map((b, i) => ({ t: now + lead + b / this.speedUp, q: null, dir: q.kind === 'rhythm' ? (Math.floor(E.rnd(this.st, 'dir', u.uid, i) * 4) as number) : undefined }));
      const qte: Qte = {
        kind: q.kind === 'none' ? 'tap' : q.kind,
        beats,
        start: now,
        ax,
        ay,
        holdDur: q.kind === 'hold' ? q.dur : undefined,
        onBeat: (i, qq) => {
          if (q.kind === 'hold') {
            // all hits land in sequence after the release
            const n = Math.max(1, sk.hits.length);
            for (let k = 0; k < n; k++) setTimeout(() => onBeat(k, qq), (k * 180) / this.speedUp);
          } else onBeat(i, qq);
        },
        done: (qs) => {
          const extra = q.kind === 'hold' ? Math.max(0, sk.hits.length - 1) * 180 + 60 : 0;
          setTimeout(() => {
            this.qte = null;
            resolve(q.kind === 'hold' ? Array(Math.max(1, sk.hits.length)).fill(qs[0]) : qs);
          }, extra / this.speedUp);
        },
        auto: auto ?? undefined,
      };
      if (q.kind === 'hold' && auto) {
        qte.holdStart = now + lead - (q.dur * 0.9) / this.speedUp;
      }
      this.qte = qte;
    });
  }

  private lastTargetUid: string | null = null;
  private lastTarget(sk: SkillDef, u: Unit): string | null {
    if (sk.target === 'all_enemies' || sk.target === 'random_enemies') {
      const al = E.alive(this.st, 'enemy');
      return al[Math.floor(al.length / 2)]?.uid ?? null;
    }
    if (sk.target === 'self' || sk.target === 'all_allies') return u.uid;
    return this.lastTargetUid;
  }

  private updateQte(): void {
    const q = this.qte;
    if (!q) return;
    const now = performance.now();
    const w = this.windows();
    const finished = (): boolean => q.beats.every((b) => b.q);
    if (q.auto) {
      // replay a known result (AI or a remote player)
      q.beats.forEach((b, i) => {
        if (!b.q && now >= b.t) {
          b.q = q.auto![i] ?? 'good';
          q.onBeat(i, b.q);
        }
      });
      if (q.kind === 'hold' && q.holdStart && !q.holdRel && now >= q.beats[0].t) q.holdRel = now;
      if (finished() && !q.fin) {
        q.fin = true;
        q.done(q.beats.map((b) => b.q!));
      }
      return;
    }
    if (q.kind === 'hold') {
      const b = q.beats[0];
      const dur = (q.holdDur ?? 1000) / this.speedUp;
      if (!q.holdStart && (input.pressed('confirm') || input.pressed('parry') || this.mouseDown())) {
        q.holdStart = now;
        audio.sfx('thread_pull', { vol: 0.5 });
      }
      if (q.holdStart && !q.holdRel) {
        const f = (now - q.holdStart) / dur;
        const released = !(input.down('confirm') || input.down('parry') || input.mouse.down);
        if (released || f > 1.18) {
          q.holdRel = now;
          const ff = (q.holdRel - q.holdStart) / dur;
          b.q = ff >= 0.82 && ff <= 0.98 ? 'perfect' : ff >= 0.7 && ff <= 1.06 ? 'good' : 'miss';
          q.onBeat(0, b.q);
          q.done([b.q]);
        }
      } else if (!q.holdStart && !q.holdRel && now > b.t + 1800) {
        b.q = 'miss';
        q.holdRel = now;
        q.onBeat(0, 'miss');
        q.done(['miss']);
      }
      return;
    }
    // tap / rhythm
    const dirActs: Action[] = ['left', 'up', 'right', 'down'];
    let pressT = -1;
    let pressDir = -1;
    if (input.pressed('confirm') || input.pressed('parry') || input.mouse.clicked) pressT = Math.max(input.pressAt('confirm'), input.pressAt('parry'), input.mouse.clicked ? input.mouse.clickAt : -1);
    if (q.kind === 'rhythm')
      dirActs.forEach((a, i) => {
        if (input.pressed(a)) {
          pressT = input.pressAt(a);
          pressDir = i;
        }
      });
    if (pressT > 0) {
      input.eat('confirm');
      input.eat('parry');
      const open = q.beats.filter((b) => !b.q);
      let next = open[0];
      for (const b of open) if (Math.abs(pressT - b.t) < Math.abs(pressT - next.t)) next = b;
      if (next) {
        const d = Math.abs(pressT - next.t);
        if (d <= w.good || pressT > next.t - 320) {
          for (const b of open) {
            if (b === next || b.t > next.t) continue;
            b.q = 'miss';
            q.onBeat(q.beats.indexOf(b), 'miss');
          }
          let qq: Quality = d <= w.perfect ? 'perfect' : d <= w.good ? 'good' : 'miss';
          if (q.kind === 'rhythm' && pressDir >= 0 && pressDir !== next.dir) qq = 'miss';
          if (q.kind === 'rhythm' && pressDir < 0 && qq === 'perfect') qq = 'good';
          next.q = qq;
          q.onBeat(q.beats.indexOf(next), qq);
          this.judgeText(qq, q.ax, q.ay);
        }
      }
    }
    q.beats.forEach((b, i) => {
      if (!b.q && now > b.t + w.good) {
        b.q = 'miss';
        q.onBeat(i, 'miss');
        this.judgeText('miss', q.ax, q.ay);
      }
    });
    if (finished() && !q.fin) {
      q.fin = true;
      q.done(q.beats.map((b) => b.q!));
    }
  }

  private mouseDown(): boolean {
    return input.mouse.clicked;
  }

  private judgeText(q: Quality, x: number, y: number): void {
    if (q === 'perfect') this.game.fx.num(x, y - 70, 'Perfect!', '#ffe08a', 26);
    else if (q === 'good') this.game.fx.num(x, y - 70, 'Good', '#e8e0d0', 20);
    else this.game.fx.num(x, y - 70, 'Miss', '#c8a0a0', 18);
  }

  // ------------------------------------------------------------------ enemy turns & defense

  private async enemyTurn(u: Unit): Promise<void> {
    let plan: EnemyPlan;
    if (!this.link || this.link.isHost) {
      plan = E.planEnemy(this.st, u.uid);
      this.link?.sendPlan(this.st.turn, plan);
    } else plan = await this.link.waitPlan(this.st.turn);
    const atk = E.enemyAttack(u, plan.attack);
    if (!atk) return;
    this.say(atk.name, '#ffb0a0');
    const ev = this.v(u.uid);
    // support moves
    if (!atk.hits.length) {
      this.anim(u.uid, 'cast', 900);
      audio.sfx('magic_dark', { vol: 0.6 });
      await this.wait(800);
      await this.showEvents(E.finishEnemy(this.st, plan, {}));
      await this.wait(300);
      this.anim(u.uid, 'ready', 0);
      return;
    }
    const tgts = plan.targets.map((id) => E.unit(this.st, id)!).filter(Boolean);
    const local = tgts.filter((t) => this.isLocal(t)).map((t) => t.uid);
    const ai = tgts.filter((t) => t.ctrl === 'ai');
    const remote = tgts.filter((t) => !this.isLocal(t) && t.ctrl !== 'ai');
    // move in for melee attacks
    const melee = ['lunge', 'slam', 'sweep', 'swoop', 'spin'].includes(atk.anim);
    const tv = this.v(tgts[0].uid);
    if (local.length && !this.game.tutSeen.has('defense')) await this.game.tutorialOnce('defense');
    if (melee && tgts.length === 1) {
      this.anim(u.uid, 'idle', 400);
      await this.tween(ev, tv.x + 150 * Math.max(1, u.size * 0.7), tv.y + 4, 320);
    }
    this.anim(u.uid, 'windup', atk.windup);
    audio.sfx('wind', { vol: 0.3 });
    const start = performance.now() + (atk.windup + 250) / this.speedUp;
    const hits: DefHit[] = atk.hits.map((hh, i) => ({ t: start + hh.at / this.speedUp, kind: hh.kind ?? 'normal', i, resolved: false, d: 'none' }));
    // AI defenders decide now (deterministic); remote defenders are awaited below
    const defs: Record<string, Defense[]> = {};
    for (const a of ai) defs[a.uid] = E.aiDefense(this.st, plan, a.uid);
    this.def = { plan, hits, local, lastPress: 0, used: new Set(), presses: [] };
    for (const l of local) defs[l] = [];
    this.setDefButtons(local.length > 0);
    this.hint = local.length ? `${glyph('dodge')} Dodge · ${glyph('parry')} Parry · ${glyph('jump')} Jump` : '';
    const perHit: Promise<void>[] = [];
    for (const hh of hits) {
      perHit.push(
        (async () => {
          const late = Math.max(this.defWindow('late', 'dodge') * (this.localPassive('light_feet') ? 1.35 : 1), this.defWindow('late', 'parry') * (this.localPassive('steady_hand') ? 1.3 : 1), this.defWindow('late', 'jump') * (this.localPassive('light_feet') ? 1.35 : 1));
          await sleep(Math.max(0, hh.t + late - performance.now()));
          if (this.st.phase !== 'turn') return;
          // the local defenders' result for this hit
          const d = local.length ? this.resolveLocal(hh) : 'none';
          for (const l of local) defs[l][hh.i] = d;
          this.anim(u.uid, 'attack', 260);
          if (this.link) {
            // co-op: show your own parry/dodge now; damage is applied below, in one fixed order for everyone
            for (const l of local) if (d !== 'none') this.defenseFx(l, d, hh.kind, atk.hits[hh.i].element ?? 'phys');
            return;
          }
          const evs: Ev[] = [];
          for (const t of tgts) {
            const dd: Defense = local.includes(t.uid) ? d : defs[t.uid]?.[hh.i] ?? 'none';
            evs.push(...E.enemyHit(this.st, plan, hh.i, t.uid, dd));
            this.defenseFx(t.uid, dd, hh.kind, atk.hits[hh.i].element ?? 'phys');
          }
          await this.showEvents(evs);
        })(),
      );
    }
    await Promise.all(perHit);
    this.def = null;
    this.setDefButtons(false);
    this.hint = '';
    for (const l of local) this.link?.sendDef(this.st.turn, l, defs[l]);
    if (this.link) {
      // remote defenders: wait for their inputs (a player who left is played by the host's AI)
      for (const r of remote) {
        const got = await Promise.race([this.link.waitDef(this.st.turn, r.uid), this.untilAi(r.uid)]);
        if (got === 'ai') {
          defs[r.uid] = E.aiDefense(this.st, plan, r.uid);
          if (this.link.isHost) this.link.sendDef(this.st.turn, r.uid, defs[r.uid]);
        } else defs[r.uid] = got;
      }
      for (let i = 0; i < atk.hits.length && this.st.phase === 'turn'; i++) {
        const evs: Ev[] = [];
        for (const tid of plan.targets) {
          const dd = defs[tid]?.[i] ?? 'none';
          evs.push(...E.enemyHit(this.st, plan, i, tid, dd));
          if (!local.includes(tid)) this.defenseFx(tid, dd, atk.hits[i].kind ?? 'normal', atk.hits[i].element ?? 'phys');
        }
        await this.showEvents(evs);
        await this.wait(90);
      }
    }
    await this.wait(200);
    if (this.st.phase === 'turn') {
      const fin = E.finishEnemy(this.st, plan, defs);
      for (const e of fin) if (e.e === 'counter') await this.counterFx(e.uid, e.target);
      await this.showEvents(fin);
    }
    if (melee && tgts.length === 1 && !u.ko) await this.tween(ev, ev.hx, ev.hy, 320);
    this.anim(u.uid, 'ready', 0);
    for (const t of tgts) if (!t.ko) this.anim(t.uid, 'ready', 0);
  }

  private defWindow(which: 'early' | 'late', kind: 'parry' | 'dodge' | 'jump' = 'dodge'): number {
    const m = this.st.difficulty === 'story' ? 1.6 : this.st.difficulty === 'unthreaded' ? 0.7 : 1;
    const base = kind === 'parry' ? (which === 'early' ? 95 : 55) : kind === 'jump' ? (which === 'early' ? 190 : 70) : which === 'early' ? 170 : 75;
    return base * m;
  }

  private localPassive(p: string): boolean {
    return this.def?.local.some((uid) => E.hasP(E.unit(this.st, uid)!, p)) ?? false;
  }

  /** Read live defense presses (called every frame while an enemy attacks). */
  private updateDefense(): void {
    const d = this.def;
    if (!d || !d.local.length) return;
    const now = performance.now();
    const read = (a: Action, as: Defense): void => {
      if (!input.pressed(a)) return;
      input.eat(a);
      const t = input.pressAt(a);
      if (t - d.lastPress < 110) return; // no mashing
      d.lastPress = t;
      d.presses.push({ a: as, t, used: false });
      for (const uid of d.local) {
        const v = this.v(uid);
        if (as === 'jump') v.jump = 0.0001;
        this.anim(uid, as === 'parry' ? 'parry' : as === 'dodge' ? 'dodge' : 'jump', as === 'jump' ? 600 : 320);
      }
      audio.sfx(as === 'jump' ? 'jump' : as === 'dodge' ? 'dodge' : 'thrust', { vol: 0.4 });
    };
    read('parry', 'parry');
    read('dodge', 'dodge');
    read('jump', 'jump');
    if (input.mouse.clicked) {
      input.mouse.clicked = false;
      if (now - d.lastPress >= 110) {
        d.lastPress = now;
        d.presses.push({ a: 'parry', t: input.mouse.clickAt || now, used: false });
        for (const uid of d.local) this.anim(uid, 'parry', 320);
      }
    }
  }

  private resolveLocal(hh: DefHit): Defense {
    const d = this.def;
    if (!d) return 'none';
    const steady = this.localPassive('steady_hand') ? 1.3 : 1;
    const light = this.localPassive('light_feet') ? 1.35 : 1;
    let best: Defense = 'none';
    let bestD = Infinity;
    let used: { a: Defense; t: number; used: boolean } | null = null;
    for (const p of d.presses) {
      if (p.used) continue;
      const dt = p.t - hh.t;
      const k = p.a as 'parry' | 'dodge' | 'jump';
      const mul = k === 'parry' ? steady : light;
      const early = this.defWindow('early', k) * mul;
      const late = this.defWindow('late', k) * mul;
      if (dt >= -early && dt <= late && Math.abs(dt) < bestD && E.defends(hh.kind, p.a)) {
        best = p.a;
        bestD = Math.abs(dt);
        used = p;
      }
    }
    if (used) used.used = true;
    // presses that missed this hit's window are spent
    for (const p of d.presses) if (!p.used && p.t < hh.t - 260) p.used = true;
    if (best === 'parry' && bestD < 35) this.game.fx.num(this.v(d.local[0]).x, this.headY(d.local[0]) - 20, 'Perfect Parry', '#ffe08a', 22);
    return best;
  }

  private defenseFx(uid: string, d: Defense, kind: string, el: Element): void {
    const v = this.v(uid);
    const y = this.midY(uid);
    if (d === 'parry') {
      audio.sfx('parry_perfect');
      this.game.fx.burst(v.x + 30, y, '#fff6d0', 18, 380, 'spark', 200);
      this.game.fx.ring(v.x + 30, y, '#ffe08a', 10, 70, 0.3, 3);
      this.anim(uid, 'parry', 260);
      this.game.fx.num(v.x, y - 70, 'Parry', '#ffe08a', 22);
    } else if (d === 'dodge') {
      audio.sfx('dodge');
      this.anim(uid, 'dodge', 300);
      this.game.fx.num(v.x, y - 70, 'Dodge', '#cfe8ff', 20);
    } else if (d === 'jump') {
      this.anim(uid, 'jump', 500);
      if (!v.jump) v.jump = 0.0001;
      this.game.fx.num(v.x, y - 90, 'Jump', '#cfe8ff', 20);
    } else {
      this.game.fx.burst(v.x, y, EL_COLOR[el], 12, 260);
      if (kind === 'jump') this.game.fx.ring(v.x, v.y, '#ff6a4a', 10, 90, 0.4, 5);
    }
  }

  private async counterFx(uid: string, target: string): Promise<void> {
    const v = this.v(uid);
    const tv = this.v(target);
    this.say('Counter!', '#ffe08a');
    const x0 = v.x;
    const y0 = v.y;
    this.anim(uid, 'run', 300);
    await this.tween(v, tv.x - 100, tv.y, 160);
    this.anim(uid, 'slash', 300);
    audio.sfx('hit_crit');
    this.game.fx.burst(tv.x, this.midY(target), '#ffe08a', 24, 400);
    this.game.fx.shake(8, 220);
    await this.wait(260);
    await this.tween(v, x0, y0, 200);
    this.anim(uid, 'ready', 0);
  }

  private setDefButtons(on: boolean): void {
    if (input.device !== 'touch') on = false;
    if (on && !this.defBtns) {
      const mk = (label: string, a: Action): HTMLButtonElement =>
        h('button', {
          on: {
            pointerdown: (e: Event) => {
              e.preventDefault();
              input.press(a, (e as PointerEvent).timeStamp || performance.now());
            },
            pointerup: () => input.release(a),
            pointerleave: () => input.release(a),
            // the browser can take the touch back (a system gesture): never leave a defense held
            pointercancel: () => input.release(a),
            contextmenu: (e: Event) => e.preventDefault(),
          },
        }, label);
      this.defBtns = h('div', { class: 'def-btns' }, mk('Jump', 'jump'), mk('Dodge', 'dodge'), mk('Parry', 'parry'));
      document.getElementById('ui')!.append(this.defBtns);
    } else if (!on && this.defBtns) {
      this.defBtns.remove();
      this.defBtns = null;
    }
  }

  // ------------------------------------------------------------------ events -> visuals

  private async showEvents(evs: Ev[]): Promise<void> {
    for (const e of evs) {
      switch (e.e) {
        case 'dmg': {
          const v = this.view.get(e.uid);
          if (!v) break;
          const y = this.headY(e.uid);
          if (e.blocked) {
            this.game.fx.num(v.x, y, 'Blocked', '#e7b75a', 22);
            audio.sfx('parry', { vol: 0.6 });
            break;
          }
          const col = e.crit ? '#ffd24a' : e.weak ? '#ff9a5a' : e.resist ? '#b8b0a8' : E.unit(this.st, e.uid)?.side === 'party' ? '#ff8a8a' : '#ffffff';
          this.game.fx.num(v.x, y, `${e.n}${e.crit ? '!' : ''}`, col, e.crit ? 38 : e.weak ? 34 : 30);
          if (e.weak) this.game.fx.num(v.x, y - 30, 'Weak', '#ff9a5a', 18);
          if (e.resist) this.game.fx.num(v.x, y - 30, 'Resist', '#c8c0b8', 16);
          v.flash = 1;
          if (E.unit(this.st, e.uid)?.side === 'party') {
            this.anim(e.uid, 'hurt', 300);
            audio.sfx('hit_heavy', { vol: 0.8 });
            this.game.fx.shake(e.n > 0 ? 6 : 0, 180);
          } else {
            this.anim(e.uid, 'hurt', 260);
            audio.sfx(e.crit ? 'hit_crit' : 'hit_light', { vol: 0.8 });
            if (e.crit) this.game.fx.shake(5, 160);
          }
          break;
        }
        case 'heal': {
          const v = this.view.get(e.uid);
          if (!v) break;
          this.game.fx.num(v.x, this.headY(e.uid), `+${e.n}`, '#9cf0a0', 28);
          this.game.fx.glowPuff(v.x, this.midY(e.uid), '#9cf0a0', 6);
          audio.sfx('heal', { vol: 0.5 });
          break;
        }
        case 'miss':
          break;
        case 'status': {
          const v = this.view.get(e.uid);
          const ic = STATUS_ICON[e.id];
          if (v && ic) this.game.fx.num(v.x + 30, this.headY(e.uid) + 10, `${ic[0]} ${e.id[0].toUpperCase()}${e.id.slice(1)}`, ic[1], 18);
          if (e.id === 'burn') audio.sfx('burn', { vol: 0.5 });
          else if (e.id === 'freeze') audio.sfx('freeze', { vol: 0.5 });
          else if (e.id === 'shock') audio.sfx('shock', { vol: 0.5 });
          else if (['empower', 'haste', 'regen', 'shield'].includes(e.id)) audio.sfx('buff', { vol: 0.4 });
          else audio.sfx('debuff', { vol: 0.4 });
          break;
        }
        case 'ko': {
          const u = E.unit(this.st, e.uid);
          if (!u) break;
          if (u.side === 'enemy') {
            this.anim(e.uid, 'die', 1200);
            audio.sfx('break', { vol: 0.6 });
            this.game.fx.threads(this.v(e.uid).x, this.midY(e.uid), '#f3e6c8', 16);
          } else {
            this.anim(e.uid, 'ko', 0);
            audio.sfx('ko');
          }
          break;
        }
        case 'revive':
          this.anim(e.uid, 'ready', 0);
          this.v(e.uid).dead = 0;
          audio.sfx('revive');
          this.game.fx.glowPuff(this.v(e.uid).x, this.midY(e.uid), '#fff2c8', 12);
          break;
        case 'break': {
          const v = this.v(e.uid);
          this.game.fx.burst(v.x, this.midY(e.uid), '#ffe08a', 30, 420, 'shard', 500);
          this.game.fx.num(v.x, this.headY(e.uid) - 30, 'BREAK', '#ffd24a', 40);
          audio.sfx('break');
          this.game.fx.shake(10, 260);
          break;
        }
        case 'wpbreak':
          this.game.fx.num(this.v(e.uid).x, this.headY(e.uid) - 50, 'Armor cracked', '#ffd24a', 20);
          audio.sfx('break', { vol: 0.6 });
          break;
        case 'ap':
          if (e.n > 0) {
            const v = this.view.get(e.uid);
            if (v) this.game.fx.num(v.x - 30, this.headY(e.uid) + 20, `+${e.n} AP`, '#8ad8ff', 18);
            audio.sfx('ap_gain', { vol: 0.35 });
          }
          break;
        case 'phase': {
          const u = E.unit(this.st, e.uid)!;
          const v = this.v(e.uid);
          const nv = this.newView(u, v.hx, v.hy);
          v.fig = nv.fig;
          v.size = u.size;
          this.game.fx.flash('#ffffff', 400);
          this.game.fx.shake(12, 500);
          audio.sfx('tear_rip');
          if (e.line) this.say(e.line, '#ffd0d0');
          await this.wait(900);
          break;
        }
        case 'summon': {
          this.layout();
          const v = this.v(e.uid);
          v.alpha = 0;
          this.game.fx.threads(v.x, v.y - 60, '#ffd36a', 14);
          break;
        }
        case 'learn':
          break;
        case 'res': {
          const v = this.view.get(e.uid);
          if (!v) break;
          if (e.what === 'stitch') audio.sfx('stitch', { vol: 0.4 });
          if (e.what === 'pull') {
            this.game.fx.threads(v.x, this.midY(e.uid), '#ffd36a', 18);
            audio.sfx('thread_pull');
          }
          break;
        }
        case 'text': {
          const v = this.view.get(e.uid);
          if (v) this.game.fx.num(v.x, this.headY(e.uid) - 24, e.text, e.color ?? '#fff', 22);
          break;
        }
        case 'skip': {
          const v = this.view.get(e.uid);
          if (v) this.game.fx.num(v.x, this.headY(e.uid) - 10, e.why, '#cfd8ff', 22);
          break;
        }
        case 'counter':
        case 'end':
        case 'unstatus':
          break;
      }
    }
  }

  // ------------------------------------------------------------------ per frame

  update(dt: number): void {
    this.t += dt;
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > 1.6) this.banner = null;
    }
    this.updateQte();
    this.updateDefense();
    this.updateTargeting();
    this.updateAim(dt);
    for (const [uid, v] of this.view) {
      const u = E.unit(this.st, uid);
      if (!u) continue;
      v.flash = Math.max(0, v.flash - dt * 4);
      v.hpShown = lerp(v.hpShown, u.hp, Math.min(1, dt * 8));
      if (u.side === 'enemy') {
        if (u.ko) v.dead = Math.min(1, v.dead + dt * 0.9);
        else v.alpha = Math.min(1, v.alpha + dt * 2.5);
      }
      if (v.jump) {
        const k = (this.t - v.a0) / 0.5;
        if (k >= 1 || v.anim !== 'jump') v.jump = 0;
        else v.jump = Math.max(0.0001, Math.sin(Math.min(1, k) * Math.PI) * 90);
      }
      if (v.adur && this.t - v.a0 > v.adur && !['ko', 'die', 'victory'].includes(v.anim)) {
        v.anim = u.side === 'party' ? (u.ko ? 'ko' : 'ready') : u.broken ? 'broken' : 'idle';
        v.adur = 0;
      }
      if (u.side === 'enemy' && u.broken && v.anim === 'idle') v.anim = 'broken';
      if (u.side === 'party' && u.ko && v.anim !== 'ko' && v.anim !== 'hurt') v.anim = 'ko';
    }
  }

  private updateTargeting(): void {
    const tg = this.targeting;
    if (!tg) return;
    const n = tg.uids.length;
    if (!tg.all) {
      if (input.pressed('left') || input.pressed('up')) {
        tg.i = (tg.i + n - 1) % n;
        audio.sfx('ui_move');
      }
      if (input.pressed('right') || input.pressed('down')) {
        tg.i = (tg.i + 1) % n;
        audio.sfx('ui_move');
      }
    }
    let onTarget = false;
    if (input.mouse.moved || input.mouse.clicked) {
      for (let i = 0; i < n; i++) {
        const v = this.v(tg.uids[i]);
        if (Math.abs(input.mouse.x - v.x) < 60 && input.mouse.y < v.y + 10 && input.mouse.y > this.headY(tg.uids[i]) - 10) {
          tg.i = i;
          onTarget = true;
        }
      }
    }
    if (input.pressed('confirm') || (input.mouse.clicked && (onTarget || tg.all))) {
      input.eat('confirm');
      input.mouse.clicked = false;
      const uid = tg.uids[tg.i];
      this.lastTargetUid = uid;
      this.hint = '';
      audio.sfx('ui_ok');
      tg.resolve(uid);
    }
  }

  private updateAim(dt: number): void {
    const a = this.aim;
    if (!a) return;
    const sp = 620 * dt;
    if (input.mouse.moved) {
      a.x = input.mouse.x;
      a.y = input.mouse.y;
    }
    if (input.down('left')) a.x -= sp;
    if (input.down('right')) a.x += sp;
    if (input.down('up')) a.y -= sp;
    if (input.down('down')) a.y += sp;
    a.x += input.stick.rx * sp;
    a.y += input.stick.ry * sp;
    a.x = clamp(a.x, 0, W);
    a.y = clamp(a.y, 80, H - 40);
    const u = E.unit(this.st, a.uid);
    if (u) this.hint = `Aim · ${glyph('confirm')} fire (${E.shotCost(u)} AP, you have ${u.ap}) · ${glyph('back')} done`;
    if (input.pressed('confirm') || input.mouse.clicked || input.pressed('strike')) {
      input.eat('confirm');
      input.eat('strike');
      input.mouse.clicked = false;
      this.fireAim();
    }
  }

  // ------------------------------------------------------------------ draw

  draw(ctx: CanvasRenderingContext2D, dt: number): void {
    const [sx, sy] = this.game.fx.offset();
    ctx.save();
    ctx.translate(sx, sy);
    const cam = 400 + Math.sin(this.t * 0.1) * 40;
    this.back.drawBack(ctx, cam, this.t);
    this.back.drawGround(ctx, cam);
    // telegraph glows under defenders
    if (this.def) this.drawTelegraphs(ctx);
    // units sorted by depth
    const units = [...this.st.units].sort((a, b) => this.v(a.uid).y - this.v(b.uid).y);
    for (const u of units) this.drawUnit(ctx, u);
    this.game.fx.draw(ctx);
    if (this.qte) this.drawQte(ctx);
    this.back.drawFront(ctx, cam, this.t, dt);
    this.back.drawLight(ctx, E.alive(this.st, 'party').map((u) => ({ x: this.v(u.uid).x, y: this.v(u.uid).y - 70, r: 280 })).concat(E.alive(this.st, 'enemy').map((u) => ({ x: this.v(u.uid).x, y: this.v(u.uid).y - 70, r: 240 }))), -0.15);
    ctx.restore();
    drawVignette(ctx, 0.38);
    this.drawHud(ctx);
    if (this.aim) this.drawAim(ctx);
    if (this.targeting) this.drawTargeting(ctx);
    if (this.banner) {
      const k = this.banner.t;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 6, (1.6 - k) * 3);
      ctx.font = '400 40px "IM Fell English SC", Georgia';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(20,10,10,0.85)';
      ctx.strokeText(this.banner.text, W / 2, 200);
      ctx.fillStyle = this.banner.color;
      ctx.fillText(this.banner.text, W / 2, 200);
      ctx.restore();
    }
    if (this.hint) {
      ctx.save();
      ctx.font = '600 18px Spectral, Georgia';
      const w = ctx.measureText(this.hint).width + 36;
      ctx.fillStyle = 'rgba(20,12,16,0.85)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - w / 2, 112, w, 34, 17);
      ctx.fill();
      ctx.strokeStyle = 'rgba(231,183,90,0.6)';
      ctx.stroke();
      ctx.fillStyle = '#f3e6c8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.hint, W / 2, 130);
      ctx.restore();
    }
  }

  private drawUnit(ctx: CanvasRenderingContext2D, u: Unit): void {
    const v = this.v(u.uid);
    if (u.side === 'enemy' && v.dead >= 1) return;
    const isActor = this.st.actor === u.uid;
    if (isActor && !u.ko) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.t * 4);
      ctx.strokeStyle = u.side === 'party' ? '#ffe08a' : '#ff8a7a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(v.x, v.y + 2, 60 * (u.side === 'enemy' ? Math.max(1, u.size * 0.8) : 1), 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (u.side === 'party' || v.fig) {
      const anim = (v.anim === 'windup' ? 'ready' : v.anim === 'attack' ? 'slash' : v.anim === 'die' ? 'ko' : v.anim === 'broken' ? 'hurt' : v.anim) as ActorAnim;
      const p = v.adur ? Math.min(1, (this.t - v.a0) / v.adur) : (this.t % 1) / 1;
      const scale = u.side === 'party' ? 1.28 : 1.28 * u.size;
      ctx.save();
      ctx.globalAlpha = u.side === 'enemy' ? v.alpha * (1 - v.dead) : 1;
      if (u.side === 'enemy' && v.anim === 'windup') drawGlow(ctx, v.x, v.y - 80 * scale, 120 * scale, '#ff6a5a', 0.4);
      const dodgeX = v.anim === 'dodge' ? -50 * Math.sin(Math.min(1, (this.t - v.a0) / 0.3) * Math.PI) : 0;
      const recoil = v.anim === 'shoot' && this.t - this.recoil < 0.15 ? 0.4 : 0.1;
      drawFigure(ctx, v.fig!, v.x + dodgeX * v.face, v.y - v.jump, { anim, t: this.t + u.uid.charCodeAt(1), p: anim === 'shoot' ? recoil : p, face: v.face, walk: this.t * 12, flash: v.flash, alpha: 1, scale }, u.hp < u.maxHp * 0.25 && !u.ko ? 'tired' : isActor ? 'determined' : 'neutral');
      ctx.restore();
    } else {
      const anim = v.anim === 'ready' ? 'idle' : v.anim === 'hurt' ? 'hurt' : v.anim === 'die' ? 'die' : (v.anim as 'idle');
      const p = v.adur ? Math.min(1, (this.t - v.a0) / v.adur) : (this.t % 1.4) / 1.4;
      drawEnemy(ctx, u.art, v.x, v.y, u.size, { t: this.t + u.uid.charCodeAt(1) * 1.7, anim: u.broken && anim === 'idle' ? 'broken' : (anim as 'idle'), p: anim === 'die' ? v.dead : p, flash: v.flash, alpha: v.alpha * (anim === 'die' ? 1 : 1), seed: u.uid.charCodeAt(1) });
    }
    // floating bars over enemies
    if (u.side === 'enemy' && !u.ko) this.drawEnemyBars(ctx, u, v);
    if (u.side === 'party' && E.has(u, 'shield') && !u.ko) drawGlow(ctx, v.x, v.y - 80, 90, '#e7b75a', 0.18 + 0.05 * Math.sin(this.t * 3));
  }

  private drawEnemyBars(ctx: CanvasRenderingContext2D, u: Unit, v: UView): void {
    const top = this.headY(u.uid) - 4;
    const w = Math.max(90, Math.min(200, 110 * u.size));
    const x = v.x - w / 2;
    ctx.save();
    ctx.globalAlpha = v.alpha;
    ctx.fillStyle = 'rgba(15,8,10,0.75)';
    ctx.beginPath();
    ctx.roundRect(x - 3, top - 26, w + 6, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#3a1a1a';
    ctx.fillRect(x, top - 23, w, 8);
    const f = Math.max(0, v.hpShown / u.maxHp);
    ctx.fillStyle = '#ffd0a0';
    ctx.fillRect(x, top - 23, w * Math.max(f, u.hp / u.maxHp), 8);
    ctx.fillStyle = u.boss ? '#e04a3a' : '#d8503a';
    ctx.fillRect(x, top - 23, (w * u.hp) / u.maxHp, 8);
    // break
    ctx.fillStyle = '#2a2418';
    ctx.fillRect(x, top - 13, w, 4);
    ctx.fillStyle = u.broken ? '#ffe08a' : '#c8a040';
    ctx.fillRect(x, top - 13, (w * Math.min(u.brk, u.breakHp)) / Math.max(1, u.breakHp), 4);
    ctx.font = '600 14px Spectral, Georgia';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f3e6c8';
    ctx.fillText(u.name, x, top - 32);
    // stitches
    const st = Math.floor(u.stitches);
    for (let i = 0; i < st; i++) {
      ctx.strokeStyle = '#ffd36a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w + 8 + i * 9, top - 26);
      ctx.lineTo(x + w + 14 + i * 9, top - 14);
      ctx.stroke();
    }
    // statuses
    let sx = x;
    for (const s of u.statuses) {
      const ic = STATUS_ICON[s.id];
      if (!ic) continue;
      ctx.fillStyle = ic[1];
      ctx.font = '15px Spectral, Georgia';
      ctx.fillText(ic[0] + (s.stacks > 1 ? s.stacks : ''), sx, top + 6);
      sx += s.stacks > 1 ? 30 : 20;
    }
    if (u.broken) {
      ctx.fillStyle = '#ffe08a';
      ctx.font = '400 16px "IM Fell English SC", Georgia';
      ctx.fillText('BROKEN', x + w - 60, top + 6);
    }
    ctx.restore();
  }

  private drawTelegraphs(ctx: CanvasRenderingContext2D): void {
    const d = this.def!;
    const now = performance.now();
    const aid = this.game.settings.timingAid;
    const atkU = E.unit(this.st, d.plan.uid);
    for (const hh of d.hits) {
      if (hh.resolved) continue;
      const k = (hh.t - now) / 700;
      if (k > 1 || k < -0.15) continue;
      for (const tid of d.plan.targets) {
        const v = this.view.get(tid);
        if (!v) continue;
        const col = hh.kind === 'jump' ? '#ff5a3a' : hh.kind === 'unblockable' ? '#c060ff' : hh.kind === 'magic' ? '#6ab0ff' : '#fff2d0';
        if (hh.kind === 'jump') {
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.4 * (1 - Math.max(0, k));
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.ellipse(v.x, v.y + 4, 70, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (hh.kind === 'unblockable' && atkU) drawGlow(ctx, this.v(atkU.uid).x, this.midY(atkU.uid), 100, '#c060ff', 0.4 * (1 - Math.max(0, k)));
        if (aid && k > 0) {
          ctx.save();
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.85 * (1 - k * 0.5);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(v.x, this.midY(tid), 34 + k * 110, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(v.x, this.midY(tid), 34, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  private drawQte(ctx: CanvasRenderingContext2D): void {
    const q = this.qte!;
    const now = performance.now();
    const w = this.windows();
    ctx.save();
    if (q.kind === 'hold') {
      const x = q.ax - 110;
      const y = q.ay - 140;
      const dur = (q.holdDur ?? 1000) / this.speedUp;
      const f = q.holdStart ? Math.min(1.2, ((q.holdRel ?? now) - q.holdStart) / dur) : 0;
      ctx.fillStyle = 'rgba(15,8,10,0.8)';
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 6, 232, 30, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,224,138,0.35)';
      ctx.fillRect(x + 220 * 0.7, y, 220 * 0.36, 18);
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      ctx.fillRect(x + 220 * 0.82, y, 220 * 0.16, 18);
      ctx.fillStyle = f > 1.06 ? '#ff7a6a' : '#e25b3a';
      ctx.fillRect(x, y + 4, Math.min(220, 220 * f), 10);
      ctx.font = '600 16px Spectral, Georgia';
      ctx.fillStyle = '#f3e6c8';
      ctx.textAlign = 'center';
      ctx.fillText(q.holdStart ? 'release in the light' : `hold ${glyph('confirm')}`, q.ax, y - 14);
    } else if (q.kind === 'rhythm') {
      const lane = { x: q.ax, y: q.ay - 130 };
      ctx.fillStyle = 'rgba(15,8,10,0.6)';
      ctx.beginPath();
      ctx.roundRect(lane.x - 40, lane.y - 34, 520, 68, 34);
      ctx.fill();
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lane.x, lane.y, 28, 0, Math.PI * 2);
      ctx.stroke();
      const arrows = ['←', '↑', '→', '↓'];
      for (const b of q.beats) {
        if (b.q) continue;
        const k = (b.t - now) / 1000;
        if (k > 1.6 || k < -0.2) continue;
        const x = lane.x + k * 300;
        ctx.fillStyle = Math.abs(b.t - now) < w.good ? '#ffe08a' : '#f3e6c8';
        ctx.beginPath();
        ctx.arc(x, lane.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a1a1e';
        ctx.font = '700 26px Spectral, Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(arrows[b.dir ?? 0], x, lane.y + 1);
      }
    } else {
      for (const b of q.beats) {
        if (b.q) continue;
        const k = (b.t - now) / 650;
        if (k > 1.2 || k < -0.25) continue;
        const r = 30 + Math.max(0, k) * 120;
        ctx.strokeStyle = Math.abs(b.t - now) <= w.perfect ? '#ffe08a' : '#fff2d0';
        ctx.globalAlpha = Math.min(1, 1.4 - k);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(q.ax, q.ay, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(q.ax, q.ay, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
    }
    ctx.restore();
  }

  private drawAim(ctx: CanvasRenderingContext2D): void {
    const a = this.aim!;
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,8,0.25)';
    ctx.fillRect(0, 0, W, H);
    // weak points
    for (const e of E.alive(this.st, 'enemy')) {
      const v = this.v(e.uid);
      e.wps.forEach((w) => {
        if (w.hp < 0) return;
        const x = v.x + w.x * e.size;
        const y = v.y + w.y * e.size;
        const r = w.r * e.size;
        drawGlow(ctx, x, y, r * 2.4, w.maxHp ? '#ffb04a' : '#ffe08a', 0.55 + 0.25 * Math.sin(this.t * 5));
        ctx.strokeStyle = w.maxHp ? '#ffb04a' : '#ffe08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    ctx.strokeStyle = '#fff2d0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 22, 0, Math.PI * 2);
    ctx.moveTo(a.x - 34, a.y);
    ctx.lineTo(a.x - 10, a.y);
    ctx.moveTo(a.x + 10, a.y);
    ctx.lineTo(a.x + 34, a.y);
    ctx.moveTo(a.x, a.y - 34);
    ctx.lineTo(a.x, a.y - 10);
    ctx.moveTo(a.x, a.y + 10);
    ctx.lineTo(a.x, a.y + 34);
    ctx.stroke();
    ctx.restore();
  }

  private drawTargeting(ctx: CanvasRenderingContext2D): void {
    const tg = this.targeting!;
    const list = tg.all ? tg.uids : [tg.uids[tg.i]];
    for (const uid of list) {
      const v = this.v(uid);
      const y = this.headY(uid) - 40 + Math.sin(this.t * 6) * 5;
      ctx.save();
      ctx.fillStyle = '#ffe08a';
      ctx.strokeStyle = '#2a1a1e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(v.x, y + 18);
      ctx.lineTo(v.x - 13, y);
      ctx.lineTo(v.x + 13, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const u = E.unit(this.st, uid)!;
      if (u.side === 'enemy' && (u.weak.length || u.resist.length)) {
        ctx.font = '600 14px Spectral, Georgia';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffb08a';
        const txt = `${u.weak.length ? `Weak: ${u.weak.join(', ')}` : ''}${u.resist.length ? `  Resists: ${u.resist.join(', ')}` : ''}`;
        ctx.fillText(txt, v.x, y - 12);
      }
      ctx.restore();
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    // turn order
    const order = E.timeline(this.st, 9);
    let x = 330;
    ctx.save();
    ctx.font = '400 14px "IM Fell English SC", Georgia';
    ctx.fillStyle = 'rgba(243,230,200,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('TURN ORDER', 330, 20);
    order.forEach((uid, i) => {
      const u = E.unit(this.st, uid)!;
      const r = i === 0 ? 28 : 22;
      const cx = x + r;
      const cy = 56;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = u.side === 'party' ? '#3a2a22' : '#3a1418';
      ctx.fill();
      ctx.clip();
      if (u.side === 'party') {
        const pc = smallPortrait(u.id as CharId, this.game.save.chars[u.id as CharId]?.outfit ?? null, 'neutral');
        ctx.drawImage(pc, cx - r * 1.15, cy - r * 0.95, r * 2.3, r * 2.5);
      } else if (u.art.startsWith('party:')) {
        const pc = smallPortrait(u.art.slice(6) as CharId, null, 'angry');
        ctx.drawImage(pc, cx - r * 1.15, cy - r * 0.95, r * 2.3, r * 2.5);
      } else {
        const ic = enemyIcon(u.art);
        ctx.drawImage(ic, cx - r, cy - r, r * 2, r * 2);
      }
      ctx.restore();
      ctx.strokeStyle = u.side === 'party' ? CHARS[u.id as CharId]?.color ?? '#e7b75a' : '#e04a3a';
      ctx.lineWidth = i === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      x += r * 2 + 8;
    });
    ctx.restore();
    // party panels
    const party = this.st.units.filter((u) => u.side === 'party');
    party.forEach((u, i) => {
      const px = 14;
      const py = 14 + i * 58;
      const C = CHARS[u.id as CharId];
      const act = this.st.actor === u.uid;
      ctx.save();
      ctx.fillStyle = act ? 'rgba(60,34,30,0.92)' : 'rgba(20,12,16,0.8)';
      ctx.beginPath();
      ctx.roundRect(px, py, 270, 54, 10);
      ctx.fill();
      ctx.strokeStyle = act ? '#ffe08a' : 'rgba(231,183,90,0.4)';
      ctx.lineWidth = act ? 2 : 1;
      ctx.stroke();
      ctx.fillStyle = u.ko ? '#9a8a8a' : '#f3e6c8';
      ctx.font = '400 18px "IM Fell English SC", Georgia';
      ctx.textAlign = 'left';
      ctx.fillText(C.short, px + 10, py + 20);
      if (u.ctrl !== 'ai' && u.ctrl !== this.me && this.link) {
        ctx.fillStyle = '#8ad8ff';
        ctx.font = '12px Spectral';
        ctx.fillText('friend', px + 70, py + 19);
      }
      // hp
      const hw = 150;
      const hx = px + 110;
      ctx.fillStyle = '#2a1414';
      ctx.fillRect(hx, py + 10, hw, 9);
      const v = this.v(u.uid);
      ctx.fillStyle = '#ffd0a0';
      ctx.fillRect(hx, py + 10, hw * Math.max(0, v.hpShown / u.maxHp), 9);
      ctx.fillStyle = u.hp < u.maxHp * 0.25 ? '#e04a3a' : '#6ac86a';
      ctx.fillRect(hx, py + 10, (hw * u.hp) / u.maxHp, 9);
      ctx.fillStyle = '#f3e6c8';
      ctx.font = '12px Spectral, Georgia';
      ctx.textAlign = 'right';
      ctx.fillText(`${u.hp}/${u.maxHp}`, hx + hw, py + 32);
      // AP pips
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = k < u.ap ? '#8ad8ff' : 'rgba(138,216,255,0.15)';
        ctx.beginPath();
        ctx.arc(px + 16 + k * 10, py + 40, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // resource
      ctx.textAlign = 'left';
      ctx.font = '12px Spectral, Georgia';
      ctx.fillStyle = C.color;
      const res = this.resourceText(u);
      if (res) ctx.fillText(res, px + 112, py + 46);
      // statuses
      let sx = px + 200;
      for (const s of u.statuses.slice(0, 4)) {
        const ic = STATUS_ICON[s.id];
        if (!ic) continue;
        ctx.fillStyle = ic[1];
        ctx.fillText(ic[0], sx, py + 46);
        sx += 15;
      }
      ctx.restore();
    });
    // weave gauge
    const gx = 14;
    const gy = 14 + party.length * 58;
    ctx.save();
    ctx.font = '400 15px "IM Fell English SC", Georgia';
    ctx.fillStyle = '#ffe08a';
    ctx.fillText('WEAVE', gx + 4, gy + 14);
    for (let k = 0; k < 3; k++) {
      const f = clamp((this.st.weave - k * 100) / 100, 0, 1);
      ctx.fillStyle = 'rgba(20,12,16,0.8)';
      ctx.fillRect(gx + 70 + k * 66, gy + 4, 60, 12);
      ctx.fillStyle = f >= 1 ? '#ffe08a' : rgba('#ffe08a', 0.55);
      ctx.fillRect(gx + 70 + k * 66, gy + 4, 60 * f, 12);
      if (f >= 1) drawGlow(ctx, gx + 100 + k * 66, gy + 10, 30, '#ffe08a', 0.3 + 0.2 * Math.sin(this.t * 4));
    }
    ctx.restore();
  }

  destroy(): void {
    this.ended = true;
    this.closeMenu();
    this.setDefButtons(false);
    this.qte = null;
    this.def = null;
  }
}

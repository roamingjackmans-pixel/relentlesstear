// Co-op glue between the Game and the relay. The host streams the scene (who stands where), dialogue, fades and
// battles; guests mirror it and play their own seat in battle.
import { audio } from '../audio';
import { Battle } from '../battle/battle';
import type { BState, Ev } from '../battle/types';
import type { CharId, Expr, Pose } from '../data/types';
import { Explore } from '../explore/explore';
import type { Coop } from '../net/coop';
import { api } from '../net/api';
import { ENCOUNTERS } from '../data/encounters';
import { CLASS_MAP, CLASSES } from '../data/classes';
import { h, notice, toast, uiRoot } from '../ui/dom';
import { SCENES } from '../world';
import type { Game } from './game';
import type { SaveData } from './state';

type Msg = { t: string; [k: string]: unknown };

interface SnapActor {
  id: string;
  x: number;
  y: number;
  f: 1 | -1;
  a: string;
  p: Pose | null;
  h: boolean;
  k?: string;
  e?: string | null;
  party: boolean;
  w: number;
}

export class HostSync {
  readonly isHost = true;
  private game: Game;
  private coop: Coop;
  private acc = 0;
  private offs: (() => void)[] = [];

  constructor(game: Game, coop: Coop) {
    this.game = game;
    this.coop = coop;
    game.dialogue.onLine = (who, text, e, mode, name) => this.cast({ t: 'line', who, text, e, mode, name });
    this.offs.push(
      coop.on('claim', (m) => {
        const who = String(m.from);
        const ch = m.char as CharId;
        for (const [k, v] of Object.entries(coop.seats)) if (v === who) delete coop.seats[k as CharId];
        if (ch && !Object.entries(coop.seats).some(([k, v]) => k === ch && v !== who)) coop.seats[ch] = who;
        this.cast({ t: 'seats', seats: coop.seats });
      }),
      // before Start the lobby answers hellos itself; the world is only sent once the game has begun
      coop.on('hello', () => {
        if (this.started) this.sendWorld();
      }),
      coop.on('room', () => {
        // free the seats of anyone no longer in the room
        const here = new Set(coop.room.players.map((p) => p.userId));
        for (const [k, v] of Object.entries(coop.seats)) if (v && v !== coop.hostId && !here.has(v)) delete coop.seats[k as CharId];
        this.cast({ t: 'seats', seats: coop.seats });
      }),
      coop.on('left', (m) => {
        const who = String(m.userId);
        for (const [k, v] of Object.entries(coop.seats)) if (v === who) delete coop.seats[k as CharId];
        // mid-battle: the host's AI takes their companion so nobody waits forever
        for (const u of this.game.battleScr?.st.units ?? []) if (u.ctrl === who) u.ctrl = 'ai';
        this.cast({ t: 'seats', seats: coop.seats });
      }),
    );
  }

  cast(m: Msg): void {
    this.coop.broadcast(m);
  }

  cutLine(who: string, text: string, e: Expr | undefined, mode: string, name?: string): void {
    this.cast({ t: 'line', who, text, e, mode, name });
  }

  sendWorld(): void {
    const g = this.game;
    if (!g.save) return;
    this.cast({ t: 'world', save: g.save, scene: g.explore?.spec.id, x: g.explore?.lead.x ?? 0, seats: this.coop.seats, mode: g.mode });
  }

  started = false;
  sceneChanged(): void {
    this.started = true;
    this.sendWorld();
  }

  battleStarted(enc: string, st: BState, items: Record<string, number>): void {
    this.cast({ t: 'battle', enc, st, items, seats: this.coop.seats });
  }

  battleEnded(result: string, st: BState): void {
    this.cast({ t: 'battleEnd', result, tally: st.tally, save: this.game.save });
  }

  tick(dt: number): void {
    this.acc += dt;
    if (this.acc < 0.085) return;
    this.acc = 0;
    const ex = this.game.explore;
    if (!ex) return;
    const actors: SnapActor[] = [];
    for (const a of ex.actors.values()) actors.push({ id: a.id, x: Math.round(a.x), y: Math.round(a.y), f: a.face, a: a.anim, p: a.pose, h: a.hidden, e: a.emote, party: a.party, w: Math.round(a.walk * 10) / 10, k: a.kind });
    this.cast({ t: 'snap', scene: ex.spec.id, leader: ex.leader, cam: Math.round(ex.camX), actors, grade: ex.grade, cleared: this.game.save.cleared, roam: ex.roamers.map((r) => [Math.round(r.x), r.dir]) });
  }

  leave(): void {
    this.cast({ t: 'end' });
    for (const o of this.offs) o();
    this.game.dialogue.onLine = null;
  }
}

export class GuestMirror {
  readonly isHost = false;
  private game: Game;
  private coop: Coop;
  private offs: (() => void)[] = [];
  private mapNote: HTMLElement | null = null;

  constructor(game: Game, coop: Coop) {
    this.game = game;
    this.coop = coop;
    game.dialogue.locked = true;
    this.offs.push(coop.on('*', (m) => void this.onMsg(m)));
    coop.toHost({ t: 'hello' });
  }

  cast(): void {
    /* guests don't broadcast */
  }
  cutLine(): void {}
  sceneChanged(): void {}
  battleStarted(): void {}
  battleEnded(): void {}
  tick(): void {}

  private async onMsg(m: Msg): Promise<void> {
    const g = this.game;
    switch (m.t) {
      case 'world': {
        g.save = m.save as SaveData;
        if (m.seats) this.coop.seats = m.seats as typeof this.coop.seats;
        const id = String(m.scene ?? '');
        if (SCENES[id] && g.mode !== 'battle' && (!g.explore || g.explore.spec.id !== id)) this.enterScene(id, Number(m.x));
        break;
      }
      case 'seats':
        this.coop.seats = m.seats as typeof this.coop.seats;
        break;
      case 'snap': {
        const ex = g.explore;
        if (!ex || ex.spec.id !== m.scene) {
          if (SCENES[String(m.scene)] && g.mode === 'explore') this.enterScene(String(m.scene), 300);
          return;
        }
        this.clearMapNote();
        ex.camX = Number(m.cam);
        ex.grade = m.grade as Explore['grade'];
        if (g.save) g.save.cleared = m.cleared as string[];
        const seen = new Set<string>();
        for (const s of m.actors as SnapActor[]) {
          seen.add(s.id);
          let a = ex.actor(s.id);
          if (!a) a = ex.setActor(s.id, s.x, s.f > 0 ? 'right' : 'left', s.p ?? 'idle', s.k);
          a.x = s.x;
          a.y = s.y;
          a.face = s.f;
          a.anim = s.a as typeof a.anim;
          a.pose = s.p;
          a.hidden = s.h;
          a.party = s.party;
          a.walk = s.w;
          a.scripted = true;
          if (s.e && a.emote !== s.e) {
            a.emote = s.e as typeof a.emote;
            a.emoteT = 1.6;
          }
        }
        for (const id of [...ex.actors.keys()]) if (!seen.has(id)) ex.actors.delete(id);
        if (m.leader && ex.actors.has(String(m.leader))) ex.leader = m.leader as CharId;
        (m.roam as [number, 1 | -1][]).forEach(([x, d], i) => {
          const r = ex.roamers[i];
          if (r) {
            r.x = x;
            r.dir = d;
          }
        });
        break;
      }
      case 'line':
        void g.dialogue.show(String(m.who), String(m.text), (m.e as Expr) ?? 'neutral', (m.mode as 'say') ?? 'say', m.name as string | undefined);
        break;
      case 'cutEnd':
        g.dialogue.close();
        break;
      case 'choice': {
        void g.dialogue.choose(m.options as string[], true);
        break;
      }
      case 'choiceDone':
        g.dialogue.pendingChoice?.(Number(m.i));
        g.dialogue.pendingChoice = null;
        break;
      case 'fade':
        void g.fade(m.dir as 'in' | 'out', Number(m.ms), String(m.color ?? '#000'));
        break;
      case 'title':
        void g.titleCard(String(m.text), m.sub as string | undefined, Number(m.ms));
        break;
      case 'toast':
        toast(String(m.text));
        break;
      case 'mode':
        if (m.mode === 'worldmap') this.showMapNote();
        break;
      case 'battle':
        this.clearMapNote();
        await this.runBattle(m);
        break;
      case 'bstate':
        if (g.battleScr) g.battleScr.pendingSync = { st: m.st as BState, items: m.items as Record<string, number> };
        break;
      case 'battleEnd': {
        if (g.save && m.save) g.save = m.save as SaveData;
        const tally = (m.tally as Record<string, Record<string, number>>)[this.coop.me] ?? {};
        for (const [k, n] of Object.entries(tally)) g.profile.tasks[k] = (g.profile.tasks[k] ?? 0) + n;
        for (const c of CLASSES) {
          if (!g.profile.classes.includes(c.id) && (g.profile.tasks[c.task] ?? 0) >= c.need) {
            g.profile.classes.push(c.id);
            toast(`Class unlocked: ${CLASS_MAP[c.id].name}`);
          }
        }
        // guests' own Tasks are saved to their own account
        this.saveGuestProfile();
        break;
      }
      case 'closed':
      case 'end':
        await notice('The game has ended', m.reason ? String(m.reason) : 'The host closed the game.');
        await g.toTitle();
        break;
    }
  }

  private saveGuestProfile(): void {
    // a guest's profile holds their own saves; only Tasks and classes changed
    if (!this.game.user) return;
    api.save(this.game.profile, this.game.rev).then((r) => (this.game.rev = r.rev)).catch(() => {});
  }

  private enterScene(id: string, x: number): void {
    const g = this.game;
    const spec = SCENES[id];
    g.explore = new Explore(g, spec, x);
    g.explore.remote = true;
    g.mode = 'explore';
    audio.music(spec.music);
    this.clearMapNote();
  }

  private showMapNote(): void {
    this.clearMapNote();
    this.mapNote = h('div', { class: 'toast passive', style: 'animation:none;top:300px' }, 'The host is choosing where to go next…');
    uiRoot().append(this.mapNote);
  }
  private clearMapNote(): void {
    this.mapNote?.remove();
    this.mapNote = null;
  }

  private async runBattle(m: Msg): Promise<void> {
    const g = this.game;
    const st = m.st as BState;
    const items = m.items as Record<string, number>;
    if (!ENCOUNTERS[String(m.enc)]) return;
    this.coop.resetBattle();
    g.dialogue.close();
    audio.sfx('tear_rip', { vol: 0.5 });
    await g.fade('out', 220, '#fff6e0');
    g.battleScr = new Battle(g, st, items, this.coop.battleLink());
    g.mode = 'battle';
    void g.fade('in', 380, '#fff6e0');
    await g.battleScr.run();
    g.battleScr.destroy();
    g.battleScr = null;
    g.mode = 'explore';
    if (g.explore) audio.music(g.explore.spec.music);
  }

  leave(): void {
    for (const o of this.offs) o();
    this.game.dialogue.locked = false;
    this.clearMapNote();
  }
}

export type { Ev };

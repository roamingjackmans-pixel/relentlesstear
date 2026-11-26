// Co-op: the host's campaign, up to three guests, each playing one of the active four. The host runs the world and
// the rules; every client runs the same deterministic battle engine, and each player resolves their own timed inputs
// locally (so timing feels right at any ping) and sends the results.
import type { BattleLink } from '../battle/battle';
import type { BState, Defense, EnemyPlan, PAction, Quality } from '../battle/types';
import type { CharId } from '../data/types';
import { Net, type RoomView } from './socket';

export type Seats = Partial<Record<CharId, string>>; // charId -> user id ('host' = the host)

type Msg = { t: string; [k: string]: unknown };

export class Coop {
  net: Net;
  role: 'host' | 'guest';
  me: string;
  hostId: string;
  room: RoomView;
  seats: Seats = {};
  private waiters = new Map<string, (v: unknown) => void>();
  private inbox = new Map<string, unknown>();
  private handlers = new Map<string, Set<(m: Msg) => void>>();
  private offs: (() => void)[] = [];

  constructor(net: Net, role: 'host' | 'guest', me: string, room: RoomView) {
    this.net = net;
    this.role = role;
    this.me = me;
    this.room = room;
    this.hostId = room.host;
    if (role === 'host') {
      this.offs.push(
        net.on('guestmsg', (m: { from: string; msg: Msg }) => this.fromGuest(m.from, m.msg)),
        net.on('room', (r: RoomView) => {
          this.room = r;
          this.emit({ t: 'room' });
        }),
      );
    } else {
      this.offs.push(
        net.on('hostmsg', (m: Msg) => this.fromHost(m)),
        net.on('room', (r: RoomView) => {
          this.room = r;
          this.emit({ t: 'room' });
        }),
      );
    }
    this.offs.push(net.on('closed', (m: { reason: string }) => this.emit({ t: 'closed', reason: m.reason })));
  }

  get isHost(): boolean {
    return this.role === 'host';
  }

  /** controller id for battle units: the host's own seat is 'host' */
  ctrlFor(userId: string): string {
    return userId === this.hostId ? 'host' : userId;
  }
  get myCtrl(): string {
    return this.isHost ? 'host' : this.me;
  }

  on(t: string, fn: (m: Msg) => void): () => void {
    if (!this.handlers.has(t)) this.handlers.set(t, new Set());
    this.handlers.get(t)!.add(fn);
    return () => this.handlers.get(t)?.delete(fn);
  }
  private emit(m: Msg): void {
    for (const fn of this.handlers.get(m.t) ?? []) fn(m);
    for (const fn of this.handlers.get('*') ?? []) fn(m);
  }

  /** host -> everyone */
  broadcast(m: Msg): void {
    if (this.isHost) this.net.hostSend(m);
  }
  /** guest -> host */
  toHost(m: Msg): void {
    if (!this.isHost) this.net.guestSend(m);
  }

  private fromGuest(from: string, m: Msg): void {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'b') {
      // relay battle inputs to everyone, then use them here
      this.net.hostSend({ ...m, from });
      this.deliver(m);
      return;
    }
    this.emit({ ...m, from });
  }

  private fromHost(m: Msg): void {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'b') {
      this.deliver(m);
      return;
    }
    this.emit(m);
  }

  private key(kind: string, turn: number, uid = ''): string {
    return `${kind}|${turn}|${uid}`;
  }

  private deliver(m: Msg): void {
    const k = this.key(String(m.kind), Number(m.turn), String(m.uid ?? ''));
    const w = this.waiters.get(k);
    if (w) {
      this.waiters.delete(k);
      w(m);
    } else {
      // shots arrive several per turn: queue them in order
      const q = (this.inbox.get(k) as Msg[] | undefined) ?? [];
      q.push(m);
      this.inbox.set(k, q);
    }
  }

  private wait<T>(kind: string, turn: number, uid = ''): Promise<T> {
    const k = this.key(kind, turn, uid);
    const q = this.inbox.get(k) as Msg[] | undefined;
    if (q && q.length) {
      const m = q.shift()!;
      if (!q.length) this.inbox.delete(k);
      return Promise.resolve(m as unknown as T);
    }
    return new Promise((res) => this.waiters.set(k, res as (v: unknown) => void));
  }

  private sendB(m: Msg): void {
    if (this.isHost) this.net.hostSend(m);
    else this.net.guestSend(m);
  }

  /** a BattleLink for this client */
  battleLink(): BattleLink {
    const self = this;
    const seen = new Set<string>();
    return {
      me: this.myCtrl,
      isHost: this.isHost,
      sendAct(turn: number, uid: string, act: PAction, quals: Quality[]) {
        self.sendB({ t: 'b', kind: 'act', turn, uid, act, quals, n: Math.random() });
      },
      async waitAct(turn: number, uid: string) {
        for (;;) {
          const m = await self.wait<{ act: PAction; quals: Quality[]; n: number }>('act', turn, uid);
          const id = `${turn}|${uid}|${m.n}`;
          if (seen.has(id)) continue; // our own message echoed back
          seen.add(id);
          return { act: m.act, quals: m.quals };
        }
      },
      sendPlan(turn: number, plan: EnemyPlan) {
        self.broadcast({ t: 'b', kind: 'plan', turn, uid: '', plan });
      },
      async waitPlan(turn: number) {
        const m = await self.wait<{ plan: EnemyPlan }>('plan', turn);
        return m.plan;
      },
      sendDef(turn: number, uid: string, defs: Defense[]) {
        self.sendB({ t: 'b', kind: 'def', turn, uid, defs, n: Math.random() });
      },
      async waitDef(turn: number, uid: string) {
        const m = await self.wait<{ defs: Defense[] }>('def', turn, uid);
        return m.defs;
      },
      sendState(st: BState, items: Record<string, number>) {
        self.broadcast({ t: 'bstate', st, items });
      },
    };
  }

  /** forget pending battle messages (a battle ended) */
  resetBattle(): void {
    this.waiters.clear();
    this.inbox.clear();
  }

  close(): void {
    for (const o of this.offs) o();
    this.offs = [];
    this.net.leave();
  }
}

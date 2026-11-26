// Plays one compiled track: a lookahead scheduler that walks the event list and schedules notes on the audio clock a
// little ahead of time (the timer only wakes it up; timing never depends on the timer). One bus per instrument part,
// with its own pan and reverb send, all faded together for crossfades.
import type { TrackId } from '../data/types';
import type { Compiled } from './compile';
import { INSTRUMENTS, type X } from './instruments';

interface Bus {
  inst: (typeof INSTRUMENTS)[keyof typeof INSTRUMENTS];
  input: GainNode;
}

export class TrackPlayer {
  readonly id: TrackId;
  readonly comp: Compiled;
  readonly startAt: number;
  private readonly x: X;
  private readonly out: GainNode;
  private readonly revOut: GainNode;
  private readonly buses: Bus[] = [];
  private readonly extra: AudioNode[] = [];
  private idx = 0;
  private loopN = 0;
  private stopped = false;
  /** audio time the last note of a non-looping track ends (Infinity while looping) */
  endAt = Infinity;

  constructor(x: X, musicIn: AudioNode, revIn: AudioNode, id: TrackId, comp: Compiled, fadeSec: number) {
    this.x = x;
    this.id = id;
    this.comp = comp;
    const c = x.c;
    this.startAt = c.currentTime + 0.06;
    this.out = c.createGain();
    this.revOut = c.createGain();
    for (const g of [this.out, this.revOut]) {
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(1, c.currentTime + Math.max(0.02, fadeSec));
    }
    this.out.connect(musicIn);
    this.revOut.connect(revIn);
    for (const b of comp.buses) {
      const input = c.createGain();
      let head: AudioNode = input;
      if (b.pan && typeof c.createStereoPanner === 'function') {
        const p = c.createStereoPanner();
        p.pan.value = b.pan;
        input.connect(p);
        head = p;
        this.extra.push(p);
      }
      head.connect(this.out);
      if (b.rev > 0) {
        const s = c.createGain();
        s.gain.value = b.rev;
        head.connect(s);
        s.connect(this.revOut);
        this.extra.push(s);
      }
      this.buses.push({ inst: INSTRUMENTS[b.inst], input });
    }
  }

  /** schedule everything that starts before now + ahead */
  tick(now: number, ahead: number): void {
    if (this.stopped || this.endAt !== Infinity) return;
    const { events, loop, seconds, spb } = this.comp;
    if (!events.length || seconds <= 0) {
      this.endAt = this.startAt;
      return;
    }
    for (let guard = 0; guard < 10000; guard++) {
      if (this.idx >= events.length) {
        if (!loop) {
          this.endAt = this.startAt + seconds;
          return;
        }
        this.loopN++;
        this.idx = 0;
      }
      const ev = events[this.idx];
      const at = this.startAt + this.loopN * seconds + ev.t * spb;
      if (at > now + ahead) return;
      // a note that is already late (the tab stalled) is skipped rather than played out of time
      if (at >= now - 0.04) {
        const bus = this.buses[ev.bus];
        const dur = ev.d * spb;
        for (const f of ev.f) bus.inst(this.x, bus.input, at, f, dur, ev.v);
      }
      this.idx++;
    }
  }

  /** stop scheduling and fade out; frees the buses afterwards */
  stop(fadeSec: number): void {
    if (this.stopped) return;
    this.stopped = true;
    const c = this.x.c;
    const t = c.currentTime;
    for (const g of [this.out, this.revOut]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fadeSec));
    }
    // ring-outs and reverb tails finish inside the fade window plus a little; then let go of everything
    setTimeout(() => this.dispose(), (Math.max(0.02, fadeSec) + 3) * 1000);
  }

  private dispose(): void {
    for (const n of [...this.buses.map((b) => b.input), ...this.extra, this.out, this.revOut])
      try {
        n.disconnect();
      } catch {
        /* gone */
      }
  }
}

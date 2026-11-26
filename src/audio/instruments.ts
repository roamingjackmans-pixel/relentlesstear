// Synthesized instruments. Each voice builds a few nodes, schedules them on the audio clock, and disconnects itself
// when its source ends, so nothing piles up. Every voice takes (start time, frequency, held length in seconds,
// velocity) and connects to `out` (a part's bus).

/** what a voice needs: the context and the shared noise buffer */
export interface X {
  c: AudioContext;
  noise: AudioBuffer;
}

export type Inst = (x: X, out: AudioNode, t: number, f: number, dur: number, v: number) => void;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

function osc(c: AudioContext, type: OscillatorType, f: number, t: number, detune = 0): OscillatorNode {
  const n = c.createOscillator();
  n.type = type;
  n.frequency.setValueAtTime(Math.max(1, f), t);
  if (detune) n.detune.setValueAtTime(detune, t);
  return n;
}

function gain(c: AudioContext, v = 0): GainNode {
  const n = c.createGain();
  n.gain.value = v;
  return n;
}

function filt(c: AudioContext, type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
  const n = c.createBiquadFilter();
  n.type = type;
  n.frequency.value = clamp(f, 20, 20000);
  n.Q.value = q;
  return n;
}

function noise(x: X): AudioBufferSourceNode {
  const s = x.c.createBufferSource();
  s.buffer = x.noise;
  s.loop = true;
  return s;
}

/** start sources at t, stop them at end, and free the listed nodes once the first source has ended */
function run(srcs: AudioScheduledSourceNode[], t: number, end: number, free: AudioNode[]): void {
  for (const s of srcs) {
    if ('buffer' in s) (s as AudioBufferSourceNode).start(t, Math.random() * 1.5);
    else s.start(t);
    s.stop(end);
  }
  srcs[0].onended = () => {
    for (const n of free)
      try {
        n.disconnect();
      } catch {
        /* already gone */
      }
  };
}

/** attack to peak, settle to sus*peak, release from the note-off; returns when the note has faded */
function adsr(p: AudioParam, t: number, dur: number, peak: number, a: number, dTau: number, sus: number, rTau: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(peak * sus, t + a, dTau);
  const off = Math.max(t + a, t + dur);
  p.setTargetAtTime(0, off, rTau);
  return off + rTau * 6;
}

/** a struck/plucked envelope: up to peak, decay with tau; damped from the note-off with dTau (0 = ring out) */
function strike(p: AudioParam, t: number, peak: number, a: number, tau: number): void {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(0, t + a, tau);
}

/** delayed vibrato on an oscillator's frequency */
function vibrato(c: AudioContext, target: OscillatorNode, t: number, rate: number, depthHz: number, delay: number): OscillatorNode {
  const lfo = osc(c, 'sine', rate, t);
  const g = gain(c, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.setValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(depthHz, t + delay + 0.35);
  lfo.connect(g);
  g.connect(target.frequency);
  return lfo;
}

const piano: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const peak = 0.2 * v;
  const tau = clamp(0.35 + 0.35 * Math.sqrt(220 / f), 0.3, 1.4);
  const env = gain(c);
  strike(env.gain, t, peak, 0.005, tau);
  const off = Math.max(t + 0.02, t + dur);
  env.gain.setTargetAtTime(0, off, 0.1);
  const lp = filt(c, 'lowpass', Math.min(9000, f * 5 + 1200 * v));
  const a = osc(c, 'triangle', f, t);
  const b = osc(c, 'sine', f * 2, t);
  const bg = gain(c, 0.3);
  a.connect(lp);
  b.connect(bg);
  bg.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([a, b], t, Math.min(off + 0.8, t + tau * 6 + 0.1), [env, lp, bg]);
};

const pad: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const a = clamp(dur * 0.4, 0.05, 0.45);
  const end = adsr(env.gain, t, dur, 0.065 * v, a, 1, 1, 0.32);
  const lp = filt(c, 'lowpass', Math.min(5200, f * 2.2 + 500), 0.6);
  const s1 = osc(c, 'sawtooth', f, t, -8);
  const s2 = osc(c, 'sawtooth', f, t, 8);
  s1.connect(lp);
  s2.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([s1, s2], t, end, [env, lp]);
};

const organ: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.055 * v, 0.05, 1, 1, 0.12);
  const srcs: OscillatorNode[] = [];
  const free: AudioNode[] = [env];
  for (const [mul, amp] of [
    [1, 1],
    [2, 0.5],
    [4, 0.22],
  ]) {
    const o = osc(c, 'sine', f * mul, t);
    const g = gain(c, amp);
    o.connect(g);
    g.connect(env);
    srcs.push(o);
    free.push(g);
  }
  env.connect(out);
  run(srcs, t, end, free);
};

const choir: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.11 * v, clamp(dur * 0.5, 0.06, 0.35), 1, 1, 0.35);
  const pre = gain(c, 1);
  const s1 = osc(c, 'sawtooth', f, t, -9);
  const s2 = osc(c, 'sawtooth', f, t, 11);
  s1.connect(pre);
  s2.connect(pre);
  const b1 = filt(c, 'bandpass', 800, 4);
  const b2 = filt(c, 'bandpass', 1200, 5);
  const lp = filt(c, 'lowpass', f * 1.5 + 200);
  const g1 = gain(c, 1.4);
  const g2 = gain(c, 0.9);
  const g3 = gain(c, 0.25);
  pre.connect(b1);
  pre.connect(b2);
  pre.connect(lp);
  b1.connect(g1);
  b2.connect(g2);
  lp.connect(g3);
  g1.connect(env);
  g2.connect(env);
  g3.connect(env);
  env.connect(out);
  run([s1, s2], t, end, [env, pre, b1, b2, lp, g1, g2, g3]);
};

const pluck: Inst = (x, out, t, f, _dur, v) => {
  const c = x.c;
  const tau = clamp(0.55 * Math.pow(330 / f, 0.4), 0.15, 1.4);
  const env = gain(c);
  strike(env.gain, t, 0.2 * v, 0.002, tau);
  const lp = filt(c, 'lowpass', Math.min(6000, f * 8));
  lp.frequency.setValueAtTime(Math.min(6000, f * 8), t);
  lp.frequency.setTargetAtTime(f * 1.6, t, 0.08);
  const o = osc(c, 'triangle', f, t);
  o.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([o], t, t + tau * 6 + 0.05, [env, lp]);
};

const guitar: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  strike(env.gain, t, 0.11 * v, 0.003, 0.55);
  const off = Math.max(t + 0.05, t + dur);
  env.gain.setTargetAtTime(0, off, 0.08);
  const lp = filt(c, 'lowpass', 3500, 0.9);
  lp.frequency.setValueAtTime(3500, t);
  lp.frequency.setTargetAtTime(Math.max(500, f * 2), t, 0.12);
  const o = osc(c, 'sawtooth', f, t);
  o.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([o], t, Math.min(off + 0.6, t + 3.5), [env, lp]);
};

const musicbox: Inst = (x, out, t, f, _dur, v) => {
  const c = x.c;
  const tau = clamp(0.9 * Math.sqrt(880 / f), 0.3, 1.6);
  const env = gain(c);
  strike(env.gain, t, 0.15 * v, 0.002, tau);
  const ting = gain(c);
  strike(ting.gain, t, 0.045 * v, 0.001, 0.06);
  const a = osc(c, 'sine', f, t);
  const b = osc(c, 'sine', f * 3, t);
  a.connect(env);
  b.connect(ting);
  env.connect(out);
  ting.connect(out);
  run([a, b], t, t + tau * 6, [env, ting]);
};

const bell: Inst = (x, out, t, f, _dur, v) => {
  const c = x.c;
  const srcs: OscillatorNode[] = [];
  const free: AudioNode[] = [];
  for (const [mul, amp, tau] of [
    [0.5, 0.45, 2.6],
    [1, 1, 2.0],
    [2.4, 0.4, 1.2],
    [3, 0.28, 0.8],
    [4.2, 0.15, 0.4],
  ]) {
    const o = osc(c, 'sine', f * mul, t);
    const g = gain(c);
    strike(g.gain, t, 0.12 * v * amp, 0.004, tau);
    o.connect(g);
    g.connect(out);
    srcs.push(o);
    free.push(g);
  }
  run(srcs, t, t + 13, free);
};

const glass: Inst = (x, out, t, f, _dur, v) => {
  const c = x.c;
  const env = gain(c);
  strike(env.gain, t, 0.09 * v, 0.012, 1.2);
  const srcs: OscillatorNode[] = [];
  const free: AudioNode[] = [env];
  for (const [mul, amp] of [
    [1, 1],
    [1.0035, 0.6],
    [2.01, 0.2],
  ]) {
    const o = osc(c, 'sine', f * mul, t);
    const g = gain(c, amp);
    o.connect(g);
    g.connect(env);
    srcs.push(o);
    free.push(g);
  }
  env.connect(out);
  run(srcs, t, t + 6, free);
};

const bassInst: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.26 * v, 0.008, 0.2, 0.8, 0.06);
  const lp = filt(c, 'lowpass', 900);
  const a = osc(c, 'triangle', f, t);
  const b = osc(c, 'sine', f, t);
  const bg = gain(c, 0.6);
  a.connect(lp);
  b.connect(bg);
  bg.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([a, b], t, end, [env, lp, bg]);
};

const synthbass: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.17 * v, 0.004, 0.15, 0.7, 0.04);
  const lp = filt(c, 'lowpass', 1800, 3);
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.setTargetAtTime(350, t, 0.07);
  const o = osc(c, 'sawtooth', f, t);
  o.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([o], t, end, [env, lp]);
};

const lead: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.085 * v, 0.03, 0.3, 0.85, 0.1);
  const pk = filt(c, 'peaking', 2600, 1);
  pk.gain.value = 5;
  const lp = filt(c, 'lowpass', 3800);
  const o = osc(c, 'sawtooth', f, t);
  const lfo = vibrato(c, o, t, 5.8, f * 0.006, 0.15);
  o.connect(pk);
  pk.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([o, lfo], t, end, [env, pk, lp]);
};

const cello: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.11 * v, 0.07, 0.4, 0.9, 0.14);
  const lp = filt(c, 'lowpass', 1500, 0.8);
  const o = osc(c, 'sawtooth', f, t);
  const lfo = vibrato(c, o, t, 5.2, f * 0.005, 0.2);
  o.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([o, lfo], t, end, [env, lp]);
};

const horn: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.12 * v, 0.05, 0.3, 0.85, 0.12);
  const lp = filt(c, 'lowpass', f * 1.3, 1);
  lp.frequency.setValueAtTime(f * 1.3, t);
  lp.frequency.linearRampToValueAtTime(Math.min(5000, f * 4 + 400), t + 0.08);
  lp.frequency.setTargetAtTime(f * 2.6 + 200, t + 0.08, 0.25);
  const o = osc(c, 'sawtooth', f, t);
  o.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([o], t, end, [env, lp]);
};

const flute: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.15 * v, 0.05, 0.3, 0.9, 0.1);
  const a = osc(c, 'sine', f, t);
  const b = osc(c, 'triangle', f, t);
  const bg = gain(c, 0.15);
  const lfo = vibrato(c, a, t, 5, f * 0.004, 0.25);
  a.connect(env);
  b.connect(bg);
  bg.connect(env);
  env.connect(out);
  const breath = gain(c);
  strike(breath.gain, t, 0.02 * v, 0.02, 0.06);
  const n = noise(x);
  const bp = filt(c, 'bandpass', Math.min(12000, f * 2), 3);
  n.connect(bp);
  bp.connect(breath);
  breath.connect(out);
  run([a, b, lfo, n], t, end, [env, bg, breath, bp]);
};

const swell: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const peak = 0.07 * Math.max(0.01, v);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + dur * 0.92);
  env.gain.linearRampToValueAtTime(0, t + dur);
  const lp = filt(c, 'lowpass', f * 0.8);
  lp.frequency.setValueAtTime(f * 0.8, t);
  lp.frequency.exponentialRampToValueAtTime(Math.min(6000, f * 5), t + dur);
  const s1 = osc(c, 'sawtooth', f, t, -14);
  const s2 = osc(c, 'sawtooth', f, t, 14);
  s1.connect(lp);
  s2.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([s1, s2], t, t + dur + 0.05, [env, lp]);
};

const drone: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.08 * v, clamp(dur * 0.3, 0.1, 2), 1, 1, 0.9);
  const lp = filt(c, 'lowpass', 240 + f * 0.6, 0.8);
  const s1 = osc(c, 'sawtooth', f, t);
  const s2 = osc(c, 'sawtooth', f * 1.006, t);
  s1.connect(lp);
  s2.connect(lp);
  lp.connect(env);
  env.connect(out);
  run([s1, s2], t, end, [env, lp]);
};

const sub: Inst = (x, out, t, f, dur, v) => {
  const c = x.c;
  const env = gain(c);
  const end = adsr(env.gain, t, dur, 0.28 * v, 0.12, 1, 1, 0.25);
  const o = osc(c, 'sine', f, t);
  o.connect(env);
  env.connect(out);
  run([o], t, end, [env]);
};

const kick: Inst = (x, out, t, _f, _dur, v) => {
  const c = x.c;
  const o = osc(c, 'sine', 150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const env = gain(c);
  strike(env.gain, t, 0.8 * v, 0.003, 0.09);
  o.connect(env);
  env.connect(out);
  run([o], t, t + 0.5, [env]);
};

/** a noise hit through one filter */
function noiseHit(x: X, out: AudioNode, t: number, type: BiquadFilterType, f: number, q: number, peak: number, a: number, tau: number, end: number): void {
  const c = x.c;
  const n = noise(x);
  const fl = filt(c, type, f, q);
  const env = gain(c);
  strike(env.gain, t, peak, a, tau);
  n.connect(fl);
  fl.connect(env);
  env.connect(out);
  run([n], t, end, [env, fl]);
}

const snare: Inst = (x, out, t, _f, _dur, v) => {
  noiseHit(x, out, t, 'highpass', 1100, 0.7, 0.3 * v, 0.001, 0.05, t + 0.35);
  const c = x.c;
  const o = osc(c, 'triangle', 190, t);
  const env = gain(c);
  strike(env.gain, t, 0.22 * v, 0.001, 0.03);
  o.connect(env);
  env.connect(out);
  run([o], t, t + 0.25, [env]);
};

const hat: Inst = (x, out, t, _f, _dur, v) => noiseHit(x, out, t, 'highpass', 7500, 0.7, 0.08 * v, 0.001, 0.012, t + 0.12);
const ohat: Inst = (x, out, t, _f, _dur, v) => noiseHit(x, out, t, 'highpass', 7000, 0.7, 0.07 * v, 0.001, 0.08, t + 0.5);
const shaker: Inst = (x, out, t, _f, _dur, v) => noiseHit(x, out, t, 'bandpass', 5500, 1.2, 0.07 * v, 0.006, 0.025, t + 0.2);
const crash: Inst = (x, out, t, _f, _dur, v) => noiseHit(x, out, t, 'highpass', 3800, 0.7, 0.12 * v, 0.001, 0.55, t + 3);
const rim: Inst = (x, out, t, _f, _dur, v) => noiseHit(x, out, t, 'bandpass', 2200, 5, 0.22 * v, 0.001, 0.008, t + 0.1);

const clank: Inst = (x, out, t, f, _dur, v) => {
  const c = x.c;
  const env = gain(c);
  strike(env.gain, t, 0.05 * v, 0.001, 0.09);
  const hp = filt(c, 'highpass', 300);
  const srcs: OscillatorNode[] = [];
  for (const [mul, type] of [
    [1, 'square'],
    [1.47, 'square'],
    [2.83, 'sine'],
  ] as [number, OscillatorType][]) {
    const o = osc(c, type, f * mul, t);
    o.connect(hp);
    srcs.push(o);
  }
  hp.connect(env);
  env.connect(out);
  run(srcs, t, t + 0.6, [env, hp]);
  noiseHit(x, out, t, 'bandpass', 2800, 3, 0.12 * v, 0.001, 0.015, t + 0.15);
};

const timpani: Inst = (x, out, t, f, _dur, v) => {
  const c = x.c;
  const env = gain(c);
  strike(env.gain, t, 0.42 * v, 0.003, 0.55);
  const a = osc(c, 'sine', f * 1.06, t);
  a.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  const b = osc(c, 'sine', f * 1.5, t);
  const bg = gain(c, 0.3);
  a.connect(env);
  b.connect(bg);
  bg.connect(env);
  env.connect(out);
  run([a, b], t, t + 3, [env, bg]);
  noiseHit(x, out, t, 'lowpass', 260, 0.7, 0.25 * v, 0.001, 0.03, t + 0.2);
};

const tom: Inst = (x, out, t, f, _dur, v) => {
  const c = x.c;
  const o = osc(c, 'sine', f * 1.35, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
  const env = gain(c);
  strike(env.gain, t, 0.36 * v, 0.002, 0.16);
  o.connect(env);
  env.connect(out);
  run([o], t, t + 1, [env]);
};

export const INSTRUMENTS = {
  piano,
  pad,
  organ,
  choir,
  pluck,
  guitar,
  musicbox,
  bell,
  glass,
  bass: bassInst,
  synthbass,
  lead,
  cello,
  horn,
  flute,
  swell,
  drone,
  sub,
  kick,
  snare,
  hat,
  ohat,
  shaker,
  clank,
  timpani,
  tom,
  crash,
  rim,
} satisfies Record<string, Inst>;

export type InstId = keyof typeof INSTRUMENTS;

/** how much of each instrument goes to the shared reverb by default */
export const DEFAULT_REV: Record<InstId, number> = {
  piano: 0.25,
  pad: 0.3,
  organ: 0.3,
  choir: 0.45,
  pluck: 0.3,
  guitar: 0.2,
  musicbox: 0.45,
  bell: 0.5,
  glass: 0.55,
  bass: 0.05,
  synthbass: 0.03,
  lead: 0.2,
  cello: 0.25,
  horn: 0.3,
  flute: 0.3,
  swell: 0.5,
  drone: 0.3,
  sub: 0,
  kick: 0.05,
  snare: 0.12,
  hat: 0.05,
  ohat: 0.08,
  shaker: 0.08,
  clank: 0.2,
  timpani: 0.25,
  tom: 0.15,
  crash: 0.2,
  rim: 0.1,
};

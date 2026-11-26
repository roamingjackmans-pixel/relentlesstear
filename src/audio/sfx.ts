// Sound effects: short, layered, synthesized on the spot. Each one schedules its own nodes from time t, scaled by
// pitch p and volume v, into `out` (dry) and `rev` (the shared reverb), and returns how long it lasts.
import type { SfxId } from '../data/types';
import type { X } from './instruments';

export type SfxFn = (x: X, out: AudioNode, rev: AudioNode, t: number, p: number, v: number) => number;

interface ToneOpts {
  type?: OscillatorType;
  f: number;
  /** glide to this frequency */
  f2?: number;
  glide?: number;
  t: number;
  a?: number;
  peak: number;
  tau: number;
  lp?: number;
  hp?: number;
  q?: number;
  /** reverb send amount (0 = dry only) */
  rev?: number;
}

function free(nodes: AudioNode[]): () => void {
  return () => {
    for (const n of nodes)
      try {
        n.disconnect();
      } catch {
        /* gone */
      }
  };
}

function shape(x: X, head: AudioNode, o: { lp?: number; hp?: number; q?: number }, nodes: AudioNode[]): AudioNode {
  let h = head;
  for (const [type, f] of [
    ['lowpass', o.lp],
    ['highpass', o.hp],
  ] as [BiquadFilterType, number | undefined][]) {
    if (!f) continue;
    const fl = x.c.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = Math.min(20000, Math.max(20, f));
    fl.Q.value = o.q ?? 0.7;
    h.connect(fl);
    h = fl;
    nodes.push(fl);
  }
  return h;
}

function envelope(x: X, t: number, a: number, peak: number, tau: number): GainNode {
  const g = x.c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(Math.max(0, peak), t + a);
  g.gain.setTargetAtTime(0, t + a, tau);
  return g;
}

function sends(x: X, g: GainNode, out: AudioNode, rev: AudioNode, amt: number | undefined, nodes: AudioNode[]): void {
  g.connect(out);
  if (amt) {
    const s = x.c.createGain();
    s.gain.value = amt;
    g.connect(s);
    s.connect(rev);
    nodes.push(s);
  }
}

/** one oscillator with an optional glide, filter and envelope */
function tone(x: X, out: AudioNode, rev: AudioNode, o: ToneOpts): void {
  const c = x.c;
  const os = c.createOscillator();
  os.type = o.type ?? 'sine';
  os.frequency.setValueAtTime(Math.max(1, o.f), o.t);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), o.t + (o.glide ?? 0.1));
  const a = o.a ?? 0.003;
  const nodes: AudioNode[] = [];
  const g = envelope(x, o.t, a, o.peak, o.tau);
  nodes.push(g);
  shape(x, os, o, nodes).connect(g);
  sends(x, g, out, rev, o.rev, nodes);
  os.start(o.t);
  os.stop(o.t + a + o.tau * 7);
  os.onended = free(nodes);
}

interface NoiseOpts {
  t: number;
  a?: number;
  peak: number;
  tau: number;
  type: BiquadFilterType;
  f: number;
  f2?: number;
  glide?: number;
  q?: number;
  rev?: number;
}

/** filtered noise with an optional filter sweep */
function hiss(x: X, out: AudioNode, rev: AudioNode, o: NoiseOpts): void {
  const c = x.c;
  const src = c.createBufferSource();
  src.buffer = x.noise;
  src.loop = true;
  const fl = c.createBiquadFilter();
  fl.type = o.type;
  fl.frequency.setValueAtTime(o.f, o.t);
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), o.t + (o.glide ?? 0.1));
  fl.Q.value = o.q ?? 0.7;
  const a = o.a ?? 0.002;
  const nodes: AudioNode[] = [fl];
  const g = envelope(x, o.t, a, o.peak, o.tau);
  nodes.push(g);
  src.connect(fl);
  fl.connect(g);
  sends(x, g, out, rev, o.rev, nodes);
  src.start(o.t, Math.random() * 1.5);
  src.stop(o.t + a + o.tau * 7);
  src.onended = free(nodes);
}

const R = (): number => Math.random();

/** a few notes in a row (arpeggios, chimes) */
function arpeggio(x: X, out: AudioNode, rev: AudioNode, t: number, freqs: number[], gap: number, o: Omit<ToneOpts, 'f' | 't'>, lastTau?: number): void {
  freqs.forEach((f, i) => tone(x, out, rev, { ...o, f, t: t + i * gap, tau: i === freqs.length - 1 && lastTau ? lastTau : o.tau }));
}

const hitHeavy: SfxFn = (x, o, r, t, p, v) => {
  hiss(x, o, r, { t, type: 'lowpass', f: 1500 * p, f2: 400 * p, glide: 0.1, peak: 0.4 * v, tau: 0.07 });
  tone(x, o, r, { f: 130 * p, f2: 48 * p, glide: 0.12, t, peak: 0.5 * v, tau: 0.1 });
  tone(x, o, r, { type: 'square', f: 85 * p, t, peak: 0.08 * v, tau: 0.05, lp: 600 });
  return 0.6;
};

export const SFX: Record<SfxId, SfxFn> = {
  ui_move: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 1200 * p, f2: 1500 * p, glide: 0.03, t, peak: 0.045 * v, tau: 0.02 });
    return 0.15;
  },
  ui_ok: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'triangle', f: 660 * p, t, peak: 0.07 * v, tau: 0.04 });
    tone(x, o, r, { type: 'triangle', f: 990 * p, t: t + 0.06, peak: 0.07 * v, tau: 0.06, rev: 0.2 });
    return 0.4;
  },
  ui_back: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'triangle', f: 700 * p, t, peak: 0.06 * v, tau: 0.035 });
    tone(x, o, r, { type: 'triangle', f: 470 * p, t: t + 0.05, peak: 0.06 * v, tau: 0.05 });
    return 0.35;
  },
  ui_error: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'square', f: 160 * p, t, peak: 0.05 * v, tau: 0.05, lp: 900 });
    tone(x, o, r, { type: 'square', f: 150 * p, t: t + 0.09, peak: 0.05 * v, tau: 0.06, lp: 900 });
    return 0.45;
  },
  step: (x, o, r, t, p, v) => {
    const q = p * (0.9 + R() * 0.2);
    hiss(x, o, r, { t, type: 'lowpass', f: 700 * q, peak: 0.07 * v, tau: 0.025 });
    tone(x, o, r, { f: 90 * q, f2: 60 * q, glide: 0.05, t, peak: 0.05 * v, tau: 0.03 });
    return 0.2;
  },
  hit_light: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'bandpass', f: 1800 * p, q: 1, peak: 0.3 * v, tau: 0.035 });
    tone(x, o, r, { f: 240 * p, f2: 120 * p, glide: 0.06, t, peak: 0.25 * v, tau: 0.05 });
    return 0.35;
  },
  hit_heavy: hitHeavy,
  hit_crit: (x, o, r, t, p, v) => {
    hitHeavy(x, o, r, t, p, v);
    hiss(x, o, r, { t, type: 'highpass', f: 3500 * p, peak: 0.35 * v, tau: 0.02 });
    tone(x, o, r, { type: 'triangle', f: 1500 * p, t: t + 0.01, peak: 0.08 * v, tau: 0.12, rev: 0.5 });
    return 0.9;
  },
  slash: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'bandpass', f: 900 * p, f2: 4200 * p, glide: 0.12, q: 1.5, a: 0.03, peak: 0.25 * v, tau: 0.05 });
    tone(x, o, r, { f: 2600 * p, t: t + 0.1, peak: 0.05 * v, tau: 0.04 });
    return 0.4;
  },
  thrust: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'bandpass', f: 2400 * p, f2: 700 * p, glide: 0.08, q: 2, a: 0.01, peak: 0.25 * v, tau: 0.04 });
    tone(x, o, r, { f: 400 * p, f2: 200 * p, glide: 0.05, t, peak: 0.1 * v, tau: 0.03 });
    return 0.3;
  },
  shot: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'highpass', f: 700 * p, peak: 0.5 * v, tau: 0.03 });
    tone(x, o, r, { f: 220 * p, f2: 55 * p, glide: 0.08, t, peak: 0.45 * v, tau: 0.07 });
    hiss(x, o, r, { t, type: 'bandpass', f: 1200 * p, q: 0.8, a: 0.005, peak: 0.15 * v, tau: 0.15, rev: 0.6 });
    return 1;
  },
  parry: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'triangle', f: 1250 * p, f2: 1420 * p, glide: 0.05, t, peak: 0.22 * v, tau: 0.22, rev: 0.4 });
    tone(x, o, r, { f: 3400 * p, t, peak: 0.08 * v, tau: 0.09 });
    tone(x, o, r, { f: 2150 * p, t, peak: 0.1 * v, tau: 0.15 });
    hiss(x, o, r, { t, type: 'highpass', f: 5000, peak: 0.2 * v, tau: 0.008 });
    return 1.2;
  },
  parry_perfect: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'triangle', f: 1600 * p, f2: 1850 * p, glide: 0.04, t, peak: 0.25 * v, tau: 0.3, rev: 0.5 });
    tone(x, o, r, { f: 4100 * p, t, peak: 0.1 * v, tau: 0.12 });
    arpeggio(x, o, r, t, [3200, 4000, 4800, 5600].map((f) => f * p), 0.03, { peak: 0.06 * v, tau: 0.25, rev: 0.6 });
    hiss(x, o, r, { t, type: 'highpass', f: 6000, peak: 0.2 * v, tau: 0.01 });
    return 1.5;
  },
  dodge: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'bandpass', f: 2800 * p, f2: 600 * p, glide: 0.22, q: 0.9, a: 0.05, peak: 0.22 * v, tau: 0.07 });
    return 0.5;
  },
  jump: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 280 * p, f2: 620 * p, glide: 0.1, t, peak: 0.12 * v, tau: 0.06 });
    hiss(x, o, r, { t, type: 'bandpass', f: 1500 * p, f2: 3000 * p, glide: 0.1, a: 0.02, peak: 0.08 * v, tau: 0.04 });
    return 0.4;
  },
  land: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'lowpass', f: 500 * p, peak: 0.25 * v, tau: 0.04 });
    tone(x, o, r, { f: 95 * p, f2: 50 * p, glide: 0.08, t, peak: 0.25 * v, tau: 0.06 });
    return 0.4;
  },
  qte_perfect: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 1760 * p, t, peak: 0.14 * v, tau: 0.35, rev: 0.5 });
    tone(x, o, r, { f: 2640 * p, t, peak: 0.06 * v, tau: 0.25 });
    tone(x, o, r, { f: 4400 * p, t, peak: 0.03 * v, tau: 0.12 });
    tone(x, o, r, { f: 2093 * p, t: t + 0.05, peak: 0.06 * v, tau: 0.3, rev: 0.5 });
    return 2;
  },
  qte_good: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 1320 * p, t, peak: 0.1 * v, tau: 0.2, rev: 0.3 });
    tone(x, o, r, { f: 1980 * p, t, peak: 0.04 * v, tau: 0.12 });
    return 1.2;
  },
  qte_miss: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 150 * p, f2: 85 * p, glide: 0.08, t, peak: 0.2 * v, tau: 0.07 });
    hiss(x, o, r, { t, type: 'lowpass', f: 300 * p, peak: 0.15 * v, tau: 0.03 });
    return 0.5;
  },
  break: (x, o, r, t, p, v) => {
    for (let i = 0; i < 7; i++) hiss(x, o, r, { t: t + i * 0.035, type: 'bandpass', f: (2000 + R() * 1500) * p, q: 1.5, peak: 0.25 * v * (1 - i / 9), tau: 0.018 });
    tone(x, o, r, { f: 2800 * p, t, peak: 0.07 * v, tau: 0.25, rev: 0.5 });
    tone(x, o, r, { f: 3900 * p, t, peak: 0.05 * v, tau: 0.2, rev: 0.5 });
    tone(x, o, r, { f: 5150 * p, t, peak: 0.04 * v, tau: 0.15, rev: 0.5 });
    tone(x, o, r, { f: 110 * p, f2: 50 * p, glide: 0.1, t, peak: 0.3 * v, tau: 0.08 });
    return 1.8;
  },
  burn: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'lowpass', f: 400 * p, f2: 2600 * p, glide: 0.25, a: 0.08, peak: 0.22 * v, tau: 0.12 });
    tone(x, o, r, { f: 85 * p, t, a: 0.05, peak: 0.15 * v, tau: 0.15 });
    for (let i = 0; i < 4; i++) hiss(x, o, r, { t: t + 0.05 + R() * 0.25, type: 'highpass', f: 3000, peak: 0.1 * v, tau: 0.006 });
    return 1;
  },
  freeze: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'highpass', f: 5000 * p, a: 0.03, peak: 0.12 * v, tau: 0.18, rev: 0.4 });
    arpeggio(x, o, r, t, [2000, 2600, 3300, 4100].map((f) => f * p), 0.025, { peak: 0.05 * v, tau: 0.2, rev: 0.6 });
    return 1.6;
  },
  shock: (x, o, r, t, p, v) => {
    const c = x.c;
    const saw = c.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(120 * p, t);
    saw.frequency.linearRampToValueAtTime(90 * p, t + 0.3);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    const trem = c.createGain();
    trem.gain.value = 0.5;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 28;
    const depth = c.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth);
    depth.connect(trem.gain);
    const g = envelope(x, t, 0.005, 0.12 * v, 0.12);
    saw.connect(lp);
    lp.connect(trem);
    trem.connect(g);
    g.connect(o);
    saw.start(t);
    lfo.start(t);
    saw.stop(t + 0.9);
    lfo.stop(t + 0.9);
    saw.onended = free([lp, trem, depth, g]);
    for (let i = 0; i < 5; i++) hiss(x, o, r, { t: t + R() * 0.3, type: 'highpass', f: 4000, peak: 0.15 * v, tau: 0.01 });
    return 1;
  },
  heal: (x, o, r, t, p, v) => {
    arpeggio(x, o, r, t, [1047, 1319, 1568, 2093].map((f) => f * p), 0.06, { peak: 0.07 * v, tau: 0.3, rev: 0.6 });
    hiss(x, o, r, { t, type: 'highpass', f: 6000, a: 0.1, peak: 0.03 * v, tau: 0.2, rev: 0.5 });
    return 2.2;
  },
  buff: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'triangle', f: 420 * p, f2: 920 * p, glide: 0.25, t, a: 0.02, peak: 0.1 * v, tau: 0.15 });
    tone(x, o, r, { f: 1840 * p, t: t + 0.2, peak: 0.05 * v, tau: 0.2, rev: 0.5 });
    return 1.4;
  },
  debuff: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'triangle', f: 720 * p, f2: 240 * p, glide: 0.3, t, peak: 0.1 * v, tau: 0.18 });
    tone(x, o, r, { type: 'triangle', f: 735 * p, f2: 235 * p, glide: 0.3, t, peak: 0.06 * v, tau: 0.18 });
    return 1.2;
  },
  ap_gain: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 1046 * p, t, peak: 0.07 * v, tau: 0.04 });
    tone(x, o, r, { f: 1568 * p, t: t + 0.05, peak: 0.07 * v, tau: 0.07, rev: 0.3 });
    return 0.6;
  },
  ko: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 220 * p, f2: 55 * p, glide: 0.5, t, a: 0.01, peak: 0.2 * v, tau: 0.25 });
    hiss(x, o, r, { t, type: 'lowpass', f: 400 * p, peak: 0.2 * v, tau: 0.06 });
    tone(x, o, r, { f: 660 * p, t: t + 0.05, peak: 0.05 * v, tau: 0.5, rev: 0.6 });
    return 2.5;
  },
  revive: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'triangle', f: 330 * p, f2: 660 * p, glide: 0.4, t, a: 0.3, peak: 0.1 * v, tau: 0.2, rev: 0.4 });
    arpeggio(x, o, r, t + 0.3, [880, 1109, 1319, 1760].map((f) => f * p), 0.05, { peak: 0.06 * v, tau: 0.3, rev: 0.6 });
    return 2.4;
  },
  victory_sting: (x, o, r, t, p, v) => {
    arpeggio(x, o, r, t, [523, 659, 784].map((f) => f * p), 0.08, { type: 'sawtooth', peak: 0.07 * v, tau: 0.06, lp: 2500, rev: 0.3 });
    tone(x, o, r, { type: 'sawtooth', f: 1047 * p, t: t + 0.24, peak: 0.07 * v, tau: 0.35, lp: 2500, rev: 0.4 });
    return 2.6;
  },
  chest: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 180 * p, f2: 230 * p, glide: 0.15, t, a: 0.02, peak: 0.08 * v, tau: 0.1 });
    hiss(x, o, r, { t, type: 'bandpass', f: 600 * p, q: 3, a: 0.02, peak: 0.06 * v, tau: 0.1 });
    arpeggio(x, o, r, t + 0.18, [1568, 1976, 2349].map((f) => f * p), 0.06, { peak: 0.05 * v, tau: 0.15, rev: 0.6 });
    return 1.6;
  },
  journal: (x, o, r, t, p, v) => {
    for (let i = 0; i < 5; i++) hiss(x, o, r, { t: t + i * 0.05 + R() * 0.02, type: 'bandpass', f: 3000 * p, q: 0.7, peak: 0.06 * v, tau: 0.02 });
    tone(x, o, r, { f: 1568 * p, t: t + 0.25, peak: 0.05 * v, tau: 0.4, rev: 0.6 });
    return 2.2;
  },
  waystitch: (x, o, r, t, p, v) => {
    for (const f of [262, 523, 659, 784]) tone(x, o, r, { f: f * p, t, a: 0.15, peak: 0.06 * v, tau: 1, rev: 0.7 });
    tone(x, o, r, { f: 2093 * p, t: t + 0.1, a: 0.3, peak: 0.02 * v, tau: 0.8, rev: 0.7 });
    return 8;
  },
  door: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'sawtooth', f: 140 * p, f2: 95 * p, glide: 0.3, t, a: 0.05, peak: 0.05 * v, tau: 0.15, lp: 900 });
    tone(x, o, r, { f: 90 * p, f2: 50 * p, glide: 0.08, t: t + 0.35, peak: 0.25 * v, tau: 0.08 });
    hiss(x, o, r, { t: t + 0.35, type: 'lowpass', f: 300 * p, peak: 0.15 * v, tau: 0.05 });
    return 1.2;
  },
  thread_pull: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'sawtooth', f: 300 * p, f2: 1600 * p, glide: 0.18, t, a: 0.01, peak: 0.07 * v, tau: 0.08, lp: 4000 });
    hiss(x, o, r, { t, type: 'highpass', f: 3000 * p, f2: 6000 * p, glide: 0.18, peak: 0.06 * v, tau: 0.06 });
    return 0.7;
  },
  stitch: (x, o, r, t, p, v) => {
    for (const d of [0, 0.11]) {
      hiss(x, o, r, { t: t + d, type: 'bandpass', f: 4500 * p, q: 2, a: 0.01, peak: 0.14 * v, tau: 0.025 });
      tone(x, o, r, { f: 1800 * p, f2: 2600 * p, glide: 0.05, t: t + d, peak: 0.04 * v, tau: 0.03 });
    }
    hiss(x, o, r, { t: t + 0.22, type: 'highpass', f: 7000, peak: 0.08 * v, tau: 0.004 });
    return 0.6;
  },
  tear_rip: (x, o, r, t, p, v) => {
    for (let i = 0; i < 14; i++)
      hiss(x, o, r, { t: t + i * 0.055 + R() * 0.02, type: 'bandpass', f: (1200 + R() * 1600) * p, q: 1, peak: 0.22 * v * (1 - i / 18), tau: 0.025 });
    hiss(x, o, r, { t, type: 'bandpass', f: 1500 * p, q: 0.6, a: 0.05, peak: 0.12 * v, tau: 0.3, rev: 0.5 });
    tone(x, o, r, { f: 70 * p, f2: 40 * p, glide: 0.9, t, a: 0.35, peak: 0.25 * v, tau: 0.25, rev: 0.4 });
    return 3;
  },
  magic_light: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 880 * p, f2: 1760 * p, glide: 0.4, t, a: 0.05, peak: 0.06 * v, tau: 0.25, rev: 0.6 });
    tone(x, o, r, { f: 1320 * p, f2: 2640 * p, glide: 0.4, t, a: 0.05, peak: 0.04 * v, tau: 0.25, rev: 0.6 });
    tone(x, o, r, { f: 2637 * p, t: t + 0.3, peak: 0.05 * v, tau: 0.4, rev: 0.6 });
    return 2.6;
  },
  magic_dark: (x, o, r, t, p, v) => {
    tone(x, o, r, { type: 'sawtooth', f: 75 * p, f2: 55 * p, glide: 0.5, t, a: 0.08, peak: 0.08 * v, tau: 0.3, lp: 500, rev: 0.4 });
    tone(x, o, r, { type: 'sawtooth', f: 79 * p, f2: 58 * p, glide: 0.5, t, a: 0.08, peak: 0.08 * v, tau: 0.3, lp: 500 });
    hiss(x, o, r, { t, type: 'bandpass', f: 900 * p, q: 4, a: 0.1, peak: 0.05 * v, tau: 0.2, rev: 0.5 });
    return 2.4;
  },
  bell: (x, o, r, t, p, v) => {
    const f = 523 * p;
    for (const [mul, amp, tau] of [
      [0.5, 0.12, 2.5],
      [1, 0.2, 2],
      [2.4, 0.09, 1.1],
      [3, 0.06, 0.7],
      [4.2, 0.03, 0.35],
    ])
      tone(x, o, r, { f: f * mul, t, a: 0.004, peak: amp * v, tau, rev: 0.6 });
    return 6;
  },
  choir: (x, o, r, t, p, v) => {
    const c = x.c;
    for (const f of [220, 262, 330, 440]) {
      const nodes: AudioNode[] = [];
      const pre = c.createGain();
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 800;
      bp.Q.value = 4;
      const body = c.createBiquadFilter();
      body.type = 'lowpass';
      body.frequency.value = 1200;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06 * v, t + 0.25);
      g.gain.setTargetAtTime(0, t + 0.7, 0.25);
      nodes.push(pre, bp, body, g);
      const srcs = [-9, 10].map((det) => {
        const os = c.createOscillator();
        os.type = 'sawtooth';
        os.frequency.value = f * p;
        os.detune.value = det;
        os.connect(pre);
        return os;
      });
      pre.connect(bp);
      pre.connect(body);
      bp.connect(g);
      body.connect(g);
      sends(x, g, o, r, 0.6, nodes);
      for (const s of srcs) {
        s.start(t);
        s.stop(t + 2.4);
      }
      srcs[0].onended = free(nodes);
    }
    return 3;
  },
  explosion: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'lowpass', f: 1200 * p, f2: 150 * p, glide: 0.6, peak: 0.5 * v, tau: 0.35, rev: 0.4 });
    tone(x, o, r, { f: 70 * p, f2: 28 * p, glide: 0.5, t, peak: 0.5 * v, tau: 0.3 });
    hiss(x, o, r, { t, type: 'highpass', f: 2500, peak: 0.2 * v, tau: 0.03 });
    return 3;
  },
  wind: (x, o, r, t, p, v) => {
    const c = x.c;
    const src = c.createBufferSource();
    src.buffer = x.noise;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(400 * p, t);
    bp.frequency.linearRampToValueAtTime(1100 * p, t + 0.6);
    bp.frequency.linearRampToValueAtTime(450 * p, t + 1.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12 * v, t + 0.4);
    g.gain.setTargetAtTime(0, t + 0.8, 0.2);
    src.connect(bp);
    bp.connect(g);
    const nodes: AudioNode[] = [bp, g];
    sends(x, g, o, r, 0.3, nodes);
    src.start(t, R() * 1.5);
    src.stop(t + 2.2);
    src.onended = free(nodes);
    return 2.3;
  },
  splash: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'bandpass', f: 1400 * p, f2: 400 * p, glide: 0.25, q: 0.8, a: 0.005, peak: 0.25 * v, tau: 0.12, rev: 0.3 });
    tone(x, o, r, { f: 1300 * p, t: t + 0.15, peak: 0.05 * v, tau: 0.04 });
    tone(x, o, r, { f: 1750 * p, t: t + 0.27, peak: 0.04 * v, tau: 0.04 });
    tone(x, o, r, { f: 1100 * p, t: t + 0.36, peak: 0.03 * v, tau: 0.04 });
    return 1;
  },
  gear: (x, o, r, t, p, v) => {
    for (let i = 0; i < 4; i++) {
      hiss(x, o, r, { t: t + i * 0.055, type: 'bandpass', f: 3200 * p, q: 3, peak: 0.14 * v, tau: 0.008 });
      tone(x, o, r, { type: 'square', f: 420 * p, t: t + i * 0.055, peak: 0.03 * v, tau: 0.02, lp: 1800 });
    }
    return 0.6;
  },
  scissors: (x, o, r, t, p, v) => {
    for (const d of [0, 0.14]) {
      hiss(x, o, r, { t: t + d, type: 'highpass', f: 4500 * p, peak: 0.16 * v, tau: 0.03 });
      tone(x, o, r, { f: 3100 * p, f2: 2200 * p, glide: 0.05, t: t + d, peak: 0.05 * v, tau: 0.03 });
    }
    return 0.6;
  },
  level_up: (x, o, r, t, p, v) => {
    arpeggio(x, o, r, t, [523, 659, 784, 1047, 1319].map((f) => f * p), 0.07, { type: 'triangle', peak: 0.07 * v, tau: 0.12, rev: 0.4 }, 0.4);
    hiss(x, o, r, { t: t + 0.3, type: 'highpass', f: 7000, a: 0.05, peak: 0.03 * v, tau: 0.2, rev: 0.5 });
    return 2.6;
  },
  unlock: (x, o, r, t, p, v) => {
    arpeggio(x, o, r, t, [784, 988, 1175, 1568].map((f) => f * p), 0.06, { peak: 0.07 * v, tau: 0.2, rev: 0.5 }, 0.5);
    return 3;
  },
  weave: (x, o, r, t, p, v) => {
    for (const f of [220, 330, 440, 554, 659]) tone(x, o, r, { type: 'sawtooth', f: f * p, t, a: 0.4, peak: 0.03 * v, tau: 0.45, lp: 2000, rev: 0.6 });
    hiss(x, o, r, { t, type: 'bandpass', f: 500 * p, f2: 5000 * p, glide: 0.9, a: 0.6, peak: 0.08 * v, tau: 0.15, rev: 0.5 });
    tone(x, o, r, { f: 1760 * p, t: t + 0.85, peak: 0.08 * v, tau: 0.6, rev: 0.7 });
    return 5;
  },
  heartbeat: (x, o, r, t, p, v) => {
    tone(x, o, r, { f: 62 * p, f2: 42 * p, glide: 0.08, t, peak: 0.45 * v, tau: 0.07 });
    tone(x, o, r, { f: 60 * p, f2: 40 * p, glide: 0.08, t: t + 0.2, peak: 0.3 * v, tau: 0.07 });
    return 0.8;
  },
  thunder: (x, o, r, t, p, v) => {
    hiss(x, o, r, { t, type: 'highpass', f: 1800, peak: 0.35 * v, tau: 0.05 });
    for (let i = 0; i < 3; i++) hiss(x, o, r, { t: t + 0.05 + R() * 0.3, type: 'highpass', f: 2200, peak: 0.15 * v, tau: 0.02 });
    hiss(x, o, r, { t, type: 'lowpass', f: 700 * p, f2: 120 * p, glide: 1.5, a: 0.05, peak: 0.45 * v, tau: 0.7, rev: 0.5 });
    tone(x, o, r, { f: 45 * p, t, a: 0.1, peak: 0.2 * v, tau: 0.6 });
    return 5;
  },
};

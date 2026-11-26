// Looping ambience beds under the music: rain (with drips), wind, fire (with crackles), sea swells and a low hum.
// Beds loop the shared noise buffer through filters, with slow LFOs; the scheduler's tick adds the random details.
import type { X } from './instruments';

export type AmbKind = 'none' | 'rain' | 'wind' | 'fire' | 'sea' | 'hum';

export interface AmbHandle {
  kind: AmbKind;
  setVol(v: number): void;
  stop(fadeMs: number): void;
  /** called by the scheduler ~25 times a second: random drips and crackles */
  tick(now: number): void;
}

function noiseLoop(x: X): AudioBufferSourceNode {
  const s = x.c.createBufferSource();
  s.buffer = x.noise;
  s.loop = true;
  return s;
}

function filter(x: X, type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
  const n = x.c.createBiquadFilter();
  n.type = type;
  n.frequency.value = f;
  n.Q.value = q;
  return n;
}

function lfo(x: X, rate: number, depth: number, target: AudioParam): OscillatorNode {
  const o = x.c.createOscillator();
  o.frequency.value = rate;
  const g = x.c.createGain();
  g.gain.value = depth;
  o.connect(g);
  g.connect(target);
  return o;
}

/** a quick plinked sine (a drip) or a noise tick (a crackle) straight into `out` */
function blip(x: X, out: AudioNode, t: number, f: number, peak: number, tau: number, noisy: boolean): void {
  const c = x.c;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.002);
  g.gain.setTargetAtTime(0, t + 0.002, tau);
  let src: AudioScheduledSourceNode;
  let fl: BiquadFilterNode | null = null;
  if (noisy) {
    const n = noiseLoop(x);
    fl = filter(x, 'highpass', f);
    n.connect(fl);
    fl.connect(g);
    src = n;
    n.start(t, Math.random() * 1.5);
  } else {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + tau * 3);
    o.connect(g);
    src = o;
    o.start(t);
  }
  g.connect(out);
  src.stop(t + tau * 7 + 0.01);
  src.onended = () => {
    try {
      g.disconnect();
      fl?.disconnect();
    } catch {
      /* gone */
    }
  };
}

export function startAmbience(x: X, dest: AudioNode, kind: AmbKind, vol: number, fadeMs: number): AmbHandle | null {
  if (kind === 'none') return null;
  const c = x.c;
  const now = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(vol, now + Math.max(0.05, fadeMs / 1000));
  master.connect(dest);
  const srcs: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [master];
  const add = <T extends AudioNode>(n: T): T => {
    nodes.push(n);
    return n;
  };
  let tick: (now: number) => void = () => {};

  if (kind === 'rain') {
    const n = noiseLoop(x);
    const hp = add(filter(x, 'highpass', 400));
    const lp = add(filter(x, 'lowpass', 6000));
    const g = add(c.createGain());
    g.gain.value = 0.11;
    n.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(master);
    const n2 = noiseLoop(x);
    const bp = add(filter(x, 'bandpass', 1200, 0.5));
    const g2 = add(c.createGain());
    g2.gain.value = 0.05;
    n2.connect(bp);
    bp.connect(g2);
    g2.connect(master);
    srcs.push(n, n2);
    tick = (t) => {
      if (Math.random() < 0.35) blip(x, master, t + 0.05 + Math.random() * 0.1, 1800 + Math.random() * 1400, 0.035, 0.03, false);
    };
  } else if (kind === 'wind') {
    const n = noiseLoop(x);
    const bp = add(filter(x, 'bandpass', 500, 1.5));
    const g = add(c.createGain());
    g.gain.value = 0.14;
    n.connect(bp);
    bp.connect(g);
    g.connect(master);
    srcs.push(n, lfo(x, 0.11, 300, bp.frequency), lfo(x, 0.07, 0.06, g.gain));
    const n2 = noiseLoop(x);
    const hp = add(filter(x, 'bandpass', 2400, 3));
    const g2 = add(c.createGain());
    g2.gain.value = 0.025;
    n2.connect(hp);
    hp.connect(g2);
    g2.connect(master);
    srcs.push(n2, lfo(x, 0.05, 900, hp.frequency));
  } else if (kind === 'fire') {
    const n = noiseLoop(x);
    const lp = add(filter(x, 'lowpass', 400));
    const g = add(c.createGain());
    g.gain.value = 0.07;
    n.connect(lp);
    lp.connect(g);
    g.connect(master);
    srcs.push(n, lfo(x, 0.3, 0.02, g.gain));
    tick = (t) => {
      if (Math.random() < 0.5) blip(x, master, t + 0.05 + Math.random() * 0.1, 2000 + Math.random() * 3000, 0.03 + Math.random() * 0.07, 0.004 + Math.random() * 0.006, true);
    };
  } else if (kind === 'sea') {
    const n = noiseLoop(x);
    const lp = add(filter(x, 'lowpass', 700));
    const g = add(c.createGain());
    g.gain.value = 0.09;
    n.connect(lp);
    lp.connect(g);
    g.connect(master);
    srcs.push(n, lfo(x, 0.08, 0.05, g.gain), lfo(x, 0.08, 250, lp.frequency));
    const n2 = noiseLoop(x);
    const hp = add(filter(x, 'highpass', 3000));
    const g2 = add(c.createGain());
    g2.gain.value = 0.015;
    n2.connect(hp);
    hp.connect(g2);
    g2.connect(master);
    srcs.push(n2, lfo(x, 0.085, 0.012, g2.gain));
  } else if (kind === 'hum') {
    const lp = add(filter(x, 'lowpass', 300));
    const g = add(c.createGain());
    g.gain.value = 0.06;
    for (const [f, type] of [
      [55, 'sine'],
      [55.4, 'sine'],
      [110, 'triangle'],
    ] as [number, OscillatorType][]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(lp);
      srcs.push(o);
    }
    lp.connect(g);
    g.connect(master);
    srcs.push(lfo(x, 0.13, 0.015, g.gain));
  }

  for (const s of srcs) {
    if ('buffer' in s) (s as AudioBufferSourceNode).start(now, Math.random() * 1.5);
    else s.start(now);
  }

  let stopped = false;
  return {
    kind,
    setVol(v) {
      if (stopped) return;
      const t = c.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(v, t + 0.4);
    },
    stop(ms) {
      if (stopped) return;
      stopped = true;
      const t = c.currentTime;
      const end = t + Math.max(0.05, ms / 1000);
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, end);
      for (const s of srcs) s.stop(end + 0.05);
      srcs[0].onended = () => {
        for (const n of nodes)
          try {
            n.disconnect();
          } catch {
            /* gone */
          }
      };
    },
    tick(t) {
      if (!stopped) tick(t);
    },
  };
}

// The audio graph, built once on the first user gesture:
//
//   tracks ──► musicVol ─► duck ─► muffle ─────────────┐
//   track reverb sends ─► musicRevVol ─► duckRev ─► muffleRev ─► reverb ─► master ─► compressor ─► speakers
//   sfx ─► sfxVol ──────────────────────────────────────┤        ▲
//   sfx reverb sends ─► sfxRevVol ──────────────────────┼────────┘
//   ambience ─► ambVol ─────────────────────────────────┘
import type { X } from './instruments';

export interface Engine extends X {
  master: GainNode;
  musicVol: GainNode;
  musicRevVol: GainNode;
  duck: GainNode;
  duckRev: GainNode;
  muffle: BiquadFilterNode;
  muffleRev: BiquadFilterNode;
  sfxVol: GainNode;
  sfxRevVol: GainNode;
  ambVol: GainNode;
}

/** a stereo room: decaying noise, a touch of predelay, darker towards the tail */
function impulse(c: AudioContext, seconds: number): AudioBuffer {
  const rate = c.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = c.createBuffer(2, len, rate);
  const pre = Math.floor(rate * 0.012);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const k = (i - pre) / (len - pre);
      const white = Math.random() * 2 - 1;
      // a one-pole lowpass that closes as the tail goes on: high frequencies die first
      const a = 0.25 + 0.7 * k;
      lp = lp * a + white * (1 - a);
      d[i] = lp * Math.pow(1 - k, 2.6) * (1.6 + k);
    }
  }
  return buf;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function createEngine(): Engine | null {
  const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AC = g.AudioContext ?? g.webkitAudioContext;
  if (!AC) return null;
  let c: AudioContext;
  try {
    c = new AC({ latencyHint: 'interactive' });
  } catch {
    try {
      c = new AC();
    } catch {
      return null;
    }
  }
  const gain = (v = 1): GainNode => {
    const n = c.createGain();
    n.gain.value = v;
    return n;
  };
  const lowpass = (): BiquadFilterNode => {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 20000;
    f.Q.value = 0.5;
    return f;
  };

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;
  comp.connect(c.destination);
  const master = gain(0.8);
  master.connect(comp);

  const reverb = c.createConvolver();
  reverb.buffer = impulse(c, 2.6);
  const revOut = gain(0.9);
  reverb.connect(revOut);
  revOut.connect(master);

  const musicVol = gain(0.6);
  const duck = gain(1);
  const muffle = lowpass();
  musicVol.connect(duck);
  duck.connect(muffle);
  muffle.connect(master);

  const musicRevVol = gain(0.6);
  const duckRev = gain(1);
  const muffleRev = lowpass();
  musicRevVol.connect(duckRev);
  duckRev.connect(muffleRev);
  muffleRev.connect(reverb);

  const sfxVol = gain(0.8);
  sfxVol.connect(master);
  const sfxRevVol = gain(0.8);
  sfxRevVol.connect(reverb);
  const ambVol = gain(0.8);
  ambVol.connect(master);

  return { c, noise: noiseBuffer(c), master, musicVol, musicRevVol, duck, duckRev, muffle, muffleRev, sfxVol, sfxRevVol, ambVol };
}

/** move a param to a value smoothly from wherever it is now */
export function glide(p: AudioParam, c: AudioContext, to: number, seconds: number): void {
  const t = c.currentTime;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.linearRampToValueAtTime(to, t + Math.max(0.01, seconds));
}

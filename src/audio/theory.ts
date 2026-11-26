// Music theory helpers for writing the score as compact strings (no Web Audio here: safe in Node and tests).
//
// A sequence string is tokens separated by spaces. A token is PITCHES[:BEATS][@VEL]:
//   PITCHES  'A4', 'C#5', 'Bb3'; a chord joins notes with '+': 'A3+C4+E4'; '-' is a rest
//   BEATS    length in beats (default 1)        VEL  0..1.5 (default 1)
//   '|'      a bar line: compileTrack checks that every bar adds up to the track's meter
//
// Chord names: root + quality, e.g. 'Am', 'F#m7', 'Bb', 'Cmaj7', 'D5' (power chord), with an optional ':beats'
// suffix overriding how long that chord lasts ('Gm:2').

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI number of a note name (C4 = 60, A4 = 69). Throws on a bad name. */
export function midiOf(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!m) throw new Error(`bad note "${note}"`);
  return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
}

export const freqOf = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
export const nameOf = (m: number): string => SHARPS[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const fmt = (n: number): string => String(Math.round(n * 10000) / 10000);

export type Tok = { kind: 'bar' } | { kind: 'note'; p: string[] | null; d: number; v: number };

/** Parses a sequence string into tokens (validating every note name, length and velocity). */
export function tokens(s: string): Tok[] {
  const out: Tok[] = [];
  for (const raw of s.replace(/\|/g, ' | ').split(/\s+/)) {
    if (!raw) continue;
    if (raw === '|') {
      out.push({ kind: 'bar' });
      continue;
    }
    const [body, vel] = raw.split('@');
    const [pitches, dur] = body.split(':');
    const d = dur === undefined || dur === '' ? 1 : Number(dur);
    const v = vel === undefined ? 1 : Number(vel);
    if (!Number.isFinite(d) || d <= 0) throw new Error(`bad length in "${raw}"`);
    if (!Number.isFinite(v) || v < 0) throw new Error(`bad velocity in "${raw}"`);
    const p = pitches === '-' ? null : pitches.split('+');
    if (p) for (const n of p) midiOf(n);
    out.push({ kind: 'note', p, d, v });
  }
  return out;
}

export function untokens(ts: Tok[]): string {
  return ts
    .map((t) => (t.kind === 'bar' ? '|' : `${t.p ? t.p.join('+') : '-'}${t.d !== 1 ? ':' + fmt(t.d) : ''}${t.v !== 1 ? '@' + fmt(t.v) : ''}`))
    .join(' ');
}

/** total beats of a sequence */
export function beatsOf(s: string): number {
  let n = 0;
  for (const t of tokens(s)) if (t.kind === 'note') n += t.d;
  return Math.round(n * 1e6) / 1e6;
}

/** transpose by semitones (bar lines kept) */
export const tr = (s: string, semis: number): string =>
  untokens(tokens(s).map((t) => (t.kind === 'note' && t.p ? { ...t, p: t.p.map((n) => nameOf(midiOf(n) + semis)) } : t)));

/** multiply every length by k (bar lines dropped: the bars no longer fit the meter) */
export const stretch = (s: string, k: number): string =>
  untokens(tokens(s).flatMap((t) => (t.kind === 'note' ? [{ ...t, d: t.d * k }] : [])));

/** scale every velocity by k */
export const soft = (s: string, k: number): string => untokens(tokens(s).map((t) => (t.kind === 'note' ? { ...t, v: t.v * k } : t)));

/** drop bar lines (to splice a 3/4 phrase into a 4/4 track) */
export const nobars = (s: string): string => untokens(tokens(s).filter((t) => t.kind === 'note'));

/** bars `from`..`to` (1-based, inclusive) of a sequence written with bar lines */
export function bars(s: string, from: number, to: number): string {
  return s
    .split('|')
    .slice(from - 1, to)
    .map((x) => x.trim())
    .join(' | ');
}

export const rep = (s: string, n: number): string => Array.from({ length: n }, () => s).join(' ');
export const cat = (...ss: string[]): string => ss.filter((x) => x && x.trim()).join(' ');

// ------------------------------------------------------------------ chords

const QUAL: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  '5': [0, 7, 12],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '9': [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
};

export function parseChord(name: string): { root: number; iv: number[] } {
  const m = /^([A-G])(#|b)?(.*)$/.exec(name);
  if (!m) throw new Error(`bad chord "${name}"`);
  const iv = QUAL[m[3]];
  if (!iv) throw new Error(`unknown chord quality "${m[3]}" in "${name}"`);
  return { root: (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, iv };
}

interface Span {
  name: string;
  beats: number;
}

function spans(chords: string[], beatsEach: number): Span[] {
  return chords.map((c) => {
    const [name, b] = c.split(':');
    const beats = b ? Number(b) : beatsEach;
    if (!Number.isFinite(beats) || beats <= 0) throw new Error(`bad chord length "${c}"`);
    return { name, beats };
  });
}

/** transpose a chord list (lengths kept) */
export function trChords(chords: string[], semis: number): string[] {
  return chords.map((c) => {
    const [name, b] = c.split(':');
    const m = /^([A-G](?:#|b)?)(.*)$/.exec(name);
    if (!m) throw new Error(`bad chord "${c}"`);
    parseChord(name);
    const root = nameOf(midiOf(`${m[1]}4`) + semis).replace(/-?\d+$/, '');
    return `${root}${m[2]}${b ? ':' + b : ''}`;
  });
}

const mean = (a: number[]): number => a.reduce((s, x) => s + x, 0) / a.length;

/** Voices each chord near `center` (a MIDI note), choosing the inversion that moves least from the last one. */
export function voicings(chords: string[], center: number): number[][] {
  let prev: number[] | null = null;
  const out: number[][] = [];
  for (const c of chords) {
    const { root, iv } = parseChord(c.split(':')[0]);
    let best: number[] = [];
    let bestScore = Infinity;
    const simple = iv.filter((x) => x < 12).length;
    for (let inv = 0; inv < simple; inv++) {
      const shape = iv.map((x, i) => (i < inv && x < 12 ? x + 12 : x)).sort((a, b) => a - b);
      const k0 = Math.round((center - root - mean(shape)) / 12);
      for (let o = -1; o <= 1; o++) {
        const base = root + 12 * (k0 + o);
        const v = shape.map((x) => x + base);
        const m = mean(v);
        let score = Math.abs(m - center) * 0.6;
        if (prev) {
          const p: number[] = prev;
          let move = 0;
          for (let i = 0; i < Math.min(p.length, v.length); i++) move += Math.abs(p[i] - v[i]);
          score += Math.abs(m - mean(p)) * 0.5 + move * 0.15;
        }
        if (score < bestScore) {
          bestScore = score;
          best = v;
        }
      }
    }
    out.push(best);
    prev = best;
  }
  return out;
}

const velStr = (v: number): string => (v !== 1 ? '@' + fmt(v) : '');

/** block chords, one per chord, voice-led around `center` */
export function pad(chords: string[], beatsEach: number, center = 57, v = 1): string {
  const sp = spans(chords, beatsEach);
  const vs = voicings(chords, center);
  return sp.map((s, i) => `${vs[i].map(nameOf).join('+')}:${fmt(s.beats)}${velStr(v)}`).join(' ');
}

/**
 * Arpeggios: `pattern` indexes the voiced chord's notes from the bottom (an index past the top climbs an octave;
 * null is a rest), one note every `step` beats, cycling the pattern through each chord.
 */
export function arp(chords: string[], pattern: (number | null)[], step: number, beatsEach: number, center = 57, v = 1): string {
  const sp = spans(chords, beatsEach);
  const vs = voicings(chords, center);
  const out: string[] = [];
  sp.forEach((s, i) => {
    const tones = vs[i];
    const n = Math.round(s.beats / step);
    for (let k = 0; k < n; k++) {
      const p = pattern[k % pattern.length];
      if (p === null) {
        out.push(`-:${fmt(step)}`);
        continue;
      }
      const m = tones[p % tones.length] + 12 * Math.floor(p / tones.length);
      out.push(`${nameOf(m)}:${fmt(step)}${velStr(v)}`);
    }
  });
  return out.join(' ');
}

function degree(deg: string, iv: number[]): number {
  if (deg === 'R') return 0;
  if (deg === '3') return iv[1] ?? 4;
  if (deg === '5') return iv.find((x) => x === 7 || x === 6 || x === 8) ?? 7;
  if (deg === '7') return iv.find((x) => x === 10 || x === 11 || x === 9) ?? 10;
  if (deg === '8') return 12;
  if (/^[+-]\d+$/.test(deg)) return Number(deg);
  throw new Error(`bad degree "${deg}"`);
}

/**
 * A bass line (or any root-based figure) from chord roots at octave `oct`. Figure tokens: DEGREE[:BEATS] where
 * DEGREE is R (root), 3 (the chord's third), 5, 7 (the chord's 7th, b7 for triads), 8 (octave), +N / -N
 * (semitones from the root) or '-' (rest). The figure cycles to fill each chord; the last note is cut to fit.
 */
export function bass(chords: string[], figure: string, beatsEach: number, oct = 2, v = 1): string {
  const sp = spans(chords, beatsEach);
  const fig = figure
    .split(/\s+/)
    .filter(Boolean)
    .map((tk) => {
      const [body, vv] = tk.split('@');
      const [deg, d] = body.split(':');
      return { deg, d: d ? Number(d) : 1, v: vv ? Number(vv) : 1 };
    });
  if (!fig.length) throw new Error('empty bass figure');
  const out: string[] = [];
  for (const s of sp) {
    const { root, iv } = parseChord(s.name);
    const r = root + (oct + 1) * 12;
    let left = s.beats;
    let k = 0;
    while (left > 1e-6) {
      const f = fig[k % fig.length];
      const d = Math.min(f.d, left);
      out.push(f.deg === '-' ? `-:${fmt(d)}` : `${nameOf(r + degree(f.deg, iv))}:${fmt(d)}${velStr(v * f.v)}`);
      left -= d;
      k++;
    }
  }
  return out.join(' ');
}

/** Chord stabs in a rhythm: tokens 'x[:beats][@vel]' play the voiced chord, '-[:beats]' rests; cycles per chord. */
export function comp(chords: string[], rhythm: string, beatsEach: number, center = 57, v = 1): string {
  const sp = spans(chords, beatsEach);
  const vs = voicings(chords, center);
  const fig = rhythm
    .split(/\s+/)
    .filter(Boolean)
    .map((tk) => {
      const [body, vv] = tk.split('@');
      const [x, d] = body.split(':');
      return { hit: x !== '-', d: d ? Number(d) : 1, v: vv ? Number(vv) : 1 };
    });
  const out: string[] = [];
  sp.forEach((s, i) => {
    let left = s.beats;
    let k = 0;
    while (left > 1e-6) {
      const f = fig[k % fig.length];
      const d = Math.min(f.d, left);
      out.push(f.hit ? `${vs[i].map(nameOf).join('+')}:${fmt(d)}${velStr(v * f.v)}` : `-:${fmt(d)}`);
      left -= d;
      k++;
    }
  });
  return out.join(' ');
}

/** Sparse, deterministic "random" notes from a pool: water drips, glass glints, distant bells. */
export function drips(nBars: number, meter: number, pool: string[], chance = 0.25, seed = 1, step = 0.5, vlo = 0.25, vhi = 0.6): string {
  let s = seed >>> 0 || 1;
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out: string[] = [];
  const n = Math.round((nBars * meter) / step);
  for (let i = 0; i < n; i++) {
    if (rnd() < chance) out.push(`${pool[Math.floor(rnd() * pool.length)]}:${fmt(step)}@${fmt(vlo + rnd() * (vhi - vlo))}`);
    else out.push(`-:${fmt(step)}`);
  }
  return out.join(' ');
}

/** a drum roll on one pitch, `beats` long, one hit per `step`, velocity sliding from v0 to v1 */
export function roll(note: string, beats: number, step: number, v0: number, v1: number): string {
  const n = Math.round(beats / step);
  return Array.from({ length: n }, (_, i) => `${note}:${fmt(step)}@${fmt(v0 + ((v1 - v0) * i) / Math.max(1, n - 1))}`).join(' ');
}

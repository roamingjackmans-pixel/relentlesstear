// Turns a track written as sections of parts (sequence strings and drum grids) into one sorted list of note events.
// Pure data work, no Web Audio: tests run it in Node, and it throws with a clear message on any mistake in the score
// (a bad note, a bar that doesn't add up to the meter, a part longer than its section).
import { DEFAULT_REV, INSTRUMENTS, type InstId } from './instruments';
import { freqOf, midiOf, tokens } from './theory';

export interface PartDef {
  inst: InstId;
  /** a sequence string (see theory.ts) */
  notes?: string;
  /** a drum grid: 'x' hit, 'X' accent, 'o' soft, '.' or '-' rest; spaces and '|' ignored */
  grid?: string;
  /** grid steps per beat (default 4) */
  steps?: number;
  /** pitch for grid hits (timpani, clanks); default C4 */
  pitch?: string;
  vol?: number;
  pan?: number;
  /** reverb send 0..1 (default per instrument) */
  rev?: number;
  /** transpose by octaves */
  oct?: number;
  /** repeat to fill the section (default: grids yes, notes no) */
  loop?: boolean;
}

export interface SectionDef {
  bars: number;
  parts: PartDef[];
}

export interface TrackDef {
  bpm: number;
  /** beats per bar */
  meter: number;
  loop: boolean;
  sections: Record<string, SectionDef>;
  order: string[];
  /** overall level for this track */
  gain?: number;
}

export interface BusDef {
  inst: InstId;
  pan: number;
  rev: number;
}

export interface CEv {
  /** start, in beats from the top of the track */
  t: number;
  /** held length in beats */
  d: number;
  bus: number;
  f: number[];
  v: number;
}

export interface Compiled {
  name: string;
  bpm: number;
  meter: number;
  loop: boolean;
  beats: number;
  /** seconds per beat */
  spb: number;
  seconds: number;
  events: CEv[];
  buses: BusDef[];
}

interface RawEv {
  t: number;
  d: number;
  m: number[];
  v: number;
}

const EPS = 1e-6;

function seqEvents(s: string, meter: number, where: string): { evs: RawEv[]; len: number } {
  const evs: RawEv[] = [];
  let t = 0;
  let bar = 0;
  let barNo = 1;
  let sawBar = false;
  for (const tk of tokens(s)) {
    if (tk.kind === 'bar') {
      if (Math.abs(bar - meter) > EPS) throw new Error(`${where}: bar ${barNo} has ${bar} beats, the meter is ${meter}`);
      sawBar = true;
      bar = 0;
      barNo++;
      continue;
    }
    if (tk.p) evs.push({ t, d: tk.d, m: tk.p.map(midiOf), v: tk.v });
    t += tk.d;
    bar += tk.d;
  }
  if (sawBar && bar > EPS && Math.abs(bar - meter) > EPS) throw new Error(`${where}: bar ${barNo} has ${bar} beats, the meter is ${meter}`);
  return { evs, len: t };
}

function gridEvents(g: string, steps: number, pitch: string | undefined, where: string): { evs: RawEv[]; len: number } {
  const m = midiOf(pitch ?? 'C4');
  const evs: RawEv[] = [];
  const d = 1 / steps;
  let i = 0;
  for (const ch of g) {
    if (ch === ' ' || ch === '|') continue;
    const v = ch === 'x' ? 1 : ch === 'X' ? 1.25 : ch === 'o' ? 0.55 : ch === '.' || ch === '-' ? 0 : NaN;
    if (Number.isNaN(v)) throw new Error(`${where}: bad grid character "${ch}"`);
    if (v > 0) evs.push({ t: i * d, d, m: [m], v });
    i++;
  }
  return { evs, len: i * d };
}

export function compileTrack(def: TrackDef, name = 'track'): Compiled {
  if (!(def.bpm > 0) || !(def.meter > 0)) throw new Error(`${name}: bad tempo or meter`);
  const buses: BusDef[] = [];
  const busIndex = new Map<string, number>();
  const events: CEv[] = [];
  let off = 0;
  for (const secName of def.order) {
    const sec = def.sections[secName];
    if (!sec) throw new Error(`${name}: no section "${secName}"`);
    const secBeats = sec.bars * def.meter;
    for (const part of sec.parts) {
      const where = `${name}/${secName}/${part.inst}`;
      if (!(part.inst in INSTRUMENTS)) throw new Error(`${where}: unknown instrument`);
      const pan = part.pan ?? 0;
      const rev = part.rev ?? DEFAULT_REV[part.inst];
      const key = `${part.inst}|${pan}|${rev}`;
      let bi = busIndex.get(key);
      if (bi === undefined) {
        bi = buses.length;
        buses.push({ inst: part.inst, pan, rev });
        busIndex.set(key, bi);
      }
      let parsed: { evs: RawEv[]; len: number };
      if (part.grid !== undefined) parsed = gridEvents(part.grid, part.steps ?? 4, part.pitch, where);
      else if (part.notes !== undefined) parsed = seqEvents(part.notes, def.meter, where);
      else throw new Error(`${where}: a part needs notes or a grid`);
      const { evs, len } = parsed;
      if (len > secBeats + EPS) throw new Error(`${where}: ${len} beats is longer than the section (${secBeats})`);
      const shift = (part.oct ?? 0) * 12;
      const vol = (part.vol ?? 1) * (def.gain ?? 1);
      const loop = part.loop ?? part.grid !== undefined;
      if (len <= EPS) continue;
      for (let r = 0; ; r++) {
        const base = r * len;
        if (base >= secBeats - EPS) break;
        for (const e of evs) {
          const t = base + e.t;
          if (t >= secBeats - EPS) break;
          events.push({ t: off + t, d: Math.min(e.d, secBeats - t), bus: bi, f: e.m.map((n) => freqOf(n + shift)), v: e.v * vol });
        }
        if (!loop) break;
      }
    }
    off += secBeats;
  }
  events.sort((a, b) => a.t - b.t);
  const spb = 60 / def.bpm;
  return { name, bpm: def.bpm, meter: def.meter, loop: def.loop, beats: off, spb, seconds: off * spb, events, buses };
}

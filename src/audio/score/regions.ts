// Exploration themes, one per land, warm to cold across the acts, plus the world map.
import type { PartDef, TrackDef } from '../compile';
import { arp, bars, bass, cat, comp, drips, nobars, pad, stretch, tr, trChords } from '../theory';
import { LULLABY as L, LULLABY_CHORDS as LC } from './lullaby';

// ------------------------------------------------------------------ Hollowmere: a warm folk waltz, fiddle lead
const HM =
  'B4:2 D5 | G5:1.5 F#5:0.5 E5 | E5:2 G5 | D5:3 | E5 D5 B4 | C5:1.5 B4:0.5 A4 | A4 B4 C5 | D5:2 F#4 | ' +
  'G4 B4 D5 | G5:2 F#5:0.5 E5:0.5 | E5 C5 E5 | D5:1.5 B4:0.5 G4 | B4 E5 D5 | C5 A4 F#4 | G4:3 | -:1 D4 E4:0.5 F#4:0.5';
const HMC = ['G', 'G', 'C', 'G', 'Em', 'C', 'D', 'D', 'G', 'G', 'C', 'G', 'Em', 'D', 'G', 'G'];
/** the lullaby half-remembered in E minor, which sits inside G major */
const HM_LC = trChords(LC.slice(0, 8), 7);

const hollowBed = (vol = 1): PartDef[] => [
  { inst: 'bass', notes: bass(HMC, 'R:1 -:2', 3, 2), vol: 0.55 * vol },
  { inst: 'guitar', notes: comp(HMC, '-:1 x:1@0.8 x:1@0.7', 3, 60), vol: 0.5 * vol },
  { inst: 'shaker', grid: 'x.o.o.', steps: 2, vol: 0.5 * vol },
  { inst: 'kick', grid: 'x.....', steps: 2, vol: 0.35 * vol },
];

// ------------------------------------------------------------------ Thimble Fields: bright pastoral, flute and harp
const FA = 'F#5 E5:0.5 D5:0.5 A4:2 | C#5 D5:0.5 E5:0.5 A4:2 | B4 C#5:0.5 D5:0.5 F#5:1.5 E5:0.5 | D5:3 - | F#5 G5:0.5 A5:0.5 F#5 D5 | E5 C#5 A4 C#5 | B4 D5 G5:1.5 F#5:0.5 | E5:4';
const FB = 'B5:2 A5 G5 | F#5:2 D5:2 | E5 F#5 G5 B5 | A5:3 - | G5 F#5 E5 D5 | F#5:1.5 E5:0.5 D5:2 | D5 B4 C#5 D5 | E5:2 C#5 -';
const FAC = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'];
const FBC = ['G', 'D', 'Em', 'A', 'G', 'D', 'Bm', 'A'];
const FIELD_ARP = [0, 1, 2, 3, 2, 1, 2, 1];
const fieldBed = (ch: string[], center = 57): PartDef[] => [
  { inst: 'pluck', notes: arp(ch, FIELD_ARP, 0.5, 4, center), vol: 0.36 },
  { inst: 'pad', notes: pad(ch, 4, center), vol: 0.3 },
  { inst: 'bass', notes: bass(ch, 'R:2 5:2', 4, 2), vol: 0.5 },
  { inst: 'kick', grid: 'x.......x.......', vol: 0.32 },
  { inst: 'shaker', grid: 'x.o.x.o.x.o.x.o.', vol: 0.4 },
];

// ------------------------------------------------------------------ Lanternmere: slow, wet, music box over drones
const MM = 'A5 - D6 | C6:2 A5 | Bb5:1.5 A5:0.5 G5 | F5:3 | G5 - Bb5 | A5:2 G5 | E5 F5 G5 | A5:3 | D6:1.5 C6:0.5 A5 | F5:2 G5 | D5 F5 E5 | D5:3';
const MC = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A', 'Dm', 'Dm', 'Bb', 'Dm'];

// ------------------------------------------------------------------ Cindermill: machines keep the time
const MILA = 'E4:1.5 G4:0.5 B4 A4 | G4 F#4 E4:2 | E4:1.5 G4:0.5 C5 B4 | A4:2 F#4:2 | E4:1.5 G4:0.5 B4 E5 | D5 B4 G4:2 | A4 C5 E5:1.5 D5:0.5 | B4:4';
const MILB = 'A4:2 C5 E5 | B4:2 G4:2 | A4 C5 E5 A5 | G5:2 E5:2 | E5 G5 E5 C5 | D5 F#5 D5 A4 | B4 D#5 F#5 A5 | B5:2 F#5:2';
const MAC = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B'];
const MBC = ['Am', 'Em', 'Am', 'Em', 'C', 'D', 'B', 'B'];
const MOST = 'R:0.5 R:0.5 8:0.5 R:0.5 3:0.5 R:0.5 5:0.5 R:0.5';
const millDrums: PartDef[] = [
  { inst: 'clank', grid: 'x..x..x...x..x..', pitch: 'E5', vol: 0.7, pan: -0.2 },
  { inst: 'clank', grid: '..o...o...o..o.o', pitch: 'B5', vol: 0.5, pan: 0.3 },
  { inst: 'kick', grid: 'x...x...x...x...', vol: 0.7 },
  { inst: 'hat', grid: '..x...x...x...x.', vol: 0.5 },
  { inst: 'snare', grid: '....x.......x...', vol: 0.45 },
];
const millBed = (ch: string[]): PartDef[] => [
  { inst: 'synthbass', notes: bass(ch, MOST, 4, 2), vol: 0.5 },
  { inst: 'pad', notes: pad(ch, 4, 55), vol: 0.24 },
  ...millDrums,
];

// ------------------------------------------------------------------ The Selvage: open fifths, a lonely horn
const CLA = 'A3:2 D4 E4 | F4:2 E4 C4 | D4:3 A3 | C4:2 E4:2 | D4:2 A4 G4 | F4:1.5 G4:0.5 A4:2 | G4 E4 D4 C4 | D4:4';
const CLB = 'D5 E5 F5:2 | E5 C5 G4:2 | F5 D5 Bb4:2 | C5:3 - | A5:2 G5 F5 | A5:1.5 G5:0.5 F5 C5 | D5 E5 F5 G5 | A5:4';
const CAC = ['D5', 'C5', 'Bb5', 'C5', 'D5', 'F5', 'C5', 'D5'];
const CBC = ['D5', 'C5', 'Bb5', 'F5', 'D5', 'F5', 'Bb5', 'A5'];

// ------------------------------------------------------------------ The Frayed Expanse: whole-tone swells that never resolve
const FRAY_CL = ['C4+D4+F#4', 'D4+E4+G#4', 'A#3+C4+E4', 'C#4+D#4+G4', 'D4+F#4+G#4', 'C4+E4+F#4', 'B3+C#4+F4', 'D#4+F4+A4', 'C4+D4+F#4', 'E4+F#4+A#4'];
const FRAY_SWELLS = FRAY_CL.map((c, i) => `${c}:8@${(0.6 + (0.4 * ((i * 7) % 5)) / 4).toFixed(2)}`).join(' ');
const FRAY_LOW = cat('-:4', FRAY_CL.slice(0, 9).map((c) => tr(`${c}:8@0.7`, -12)).join(' '));

// ------------------------------------------------------------------ Spindlehold: choir and bells, beautiful and cold
const SHC = ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B'];
const SHM = 'B4:2 E5:2 | G5:3 F#5 | D5:2 G5 F#5 | A4:4 | B4 E5 G5 B5 | A5:3 G5 | E5:2 C5:2 | D#5:4';
const SH_BELLS = 'E4:4 -:4 G4:4 -:4 E4:4 -:4 A4:4 -:4';

// ------------------------------------------------------------------ The Seam of Ages: a storm in C minor
const SEA = 'G4:1.5 Ab4:0.5 G4 Eb4 | C4:2 Eb4 G4 | Ab4:1.5 G4:0.5 F4 Eb4 | D4:2 F4:2 | G4:1.5 C5:0.5 Bb4 G4 | Eb5:2 D5 C5 | Ab4 C5 Eb5 D5 | D5:4';
const SEB = 'C5:2 Ab4:2 | G4:2 Eb4:2 | Ab4 Bb4 C5 Eb5 | D5:4 | C5:2 F5:2 | Eb5:2 G5:2 | Ab5 G5 F5 Eb5 | B4:4';
const SAC = ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb'];
const SBC = ['Fm', 'Cm', 'Ab', 'G', 'Fm', 'Cm', 'Ab', 'G'];
const SOST = 'R:0.5 R:0.5 5:0.5 R:0.5 3:0.5 R:0.5 5:0.5 +10:0.5';
const seamBed = (ch: string[]): PartDef[] => [
  { inst: 'cello', notes: bass(ch, SOST, 4, 3), vol: 0.55 },
  { inst: 'timpani', notes: bass(ch, 'R:2 5:2', 4, 2), vol: 0.45 },
  { inst: 'pad', notes: pad(ch, 4, 55), vol: 0.28 },
  { inst: 'kick', grid: 'x.....x.x.......', vol: 0.7 },
  { inst: 'snare', grid: '....x.......x...', vol: 0.5 },
  { inst: 'hat', grid: 'x.x.x.x.x.x.x.x.', vol: 0.4 },
];

// ------------------------------------------------------------------ The Underweave: deep, sparse, glassy
const UWC = ['F#m:8', 'D:8', 'Bm:8', 'C#m:8', 'F#m:8', 'D:8', 'E:8', 'F#m:8'];

// ------------------------------------------------------------------ The Loomspire: luminous, rising (D lydian)
const SPC = ['D', 'E', 'Bm', 'G', 'D', 'E', 'F#m', 'A'];
const SPBC = ['G', 'A', 'Bm', 'A', 'G', 'E', 'E', 'A'];
const SPM = 'A4:2 D5 E5 | G#5:3 F#5 | F#5:2 D5 B4 | D5:2 E5:2 | A5:2 F#5 D5 | E5 G#5 B5:2 | A5 G#5 F#5 C#5 | E5:4';
const SPR = 'D5:2 E5:2 | F#5:2 G#5:2 | A5:2 B5:2 | C#6:4 | D6:2 C#6:2 | B5:2 A5:2 | G#5:2 F#5:2 | E5:4';
const UP16 = [0, 1, 2, 3, 4, 5, 6, 7];

// ------------------------------------------------------------------ the world map: a gentle travelling theme
const WMA = 'C5:1.5 A4:0.5 F4 A4 | G4:2 E4 G4 | A4:1.5 F4:0.5 D4 F4 | D5:3 - | C5 D5 C5 A4 | G4:1.5 A4:0.5 Bb4 G4 | F4 G4 A4 Bb4 | C5:4';
const WMB = 'D5:2 F5:2 | C5:2 A4:2 | Bb4 D5 G5 F5 | E5:3 - | D5 F5 Bb5 A5 | A5:1.5 G5:0.5 F5:2 | G5 F5 E5 C5 | F5:4';
const WAC = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'];
const WBC = ['Bb', 'F', 'Gm', 'C', 'Bb', 'F', 'Gm:2', 'C:2', 'F'];
const mapBed = (ch: string[]): PartDef[] => [
  { inst: 'bass', notes: bass(ch, 'R:1 3:1 5:1 3:1', 4, 2), vol: 0.45 },
  { inst: 'pluck', notes: arp(ch, [0, 1, 2, 1], 0.5, 4, 60), vol: 0.28 },
  { inst: 'pad', notes: pad(ch, 4, 57), vol: 0.28 },
  { inst: 'shaker', grid: 'x.o.x.o.x.o.x.o.', vol: 0.35 },
];

export const regionTracks = {
  hollowmere: {
    bpm: 112,
    meter: 3,
    loop: true,
    sections: {
      a: { bars: 16, parts: [{ inst: 'lead', notes: HM, vol: 0.7 }, ...hollowBed()] },
      b: {
        bars: 8,
        parts: [
          { inst: 'flute', notes: bars(tr(L, 7), 1, 8), vol: 0.5 },
          { inst: 'pluck', notes: arp(HM_LC, [0, 1, 2, 1, 2, 1], 0.5, 3, 55), vol: 0.34 },
          { inst: 'pad', notes: pad(HM_LC, 3, 57), vol: 0.34 },
          { inst: 'bass', notes: bass(HM_LC, 'R:3', 3, 2), vol: 0.35 },
        ],
      },
      a2: {
        bars: 16,
        parts: [
          { inst: 'lead', notes: HM, vol: 0.7 },
          { inst: 'pluck', notes: HM, vol: 0.22 },
          { inst: 'pad', notes: pad(HMC, 3, 57), vol: 0.26 },
          ...hollowBed(),
        ],
      },
    },
    order: ['a', 'b', 'a2'],
  },

  fields: {
    bpm: 100,
    meter: 4,
    loop: true,
    sections: {
      a: { bars: 8, parts: [{ inst: 'flute', notes: FA, vol: 0.6 }, ...fieldBed(FAC)] },
      b: { bars: 8, parts: [{ inst: 'flute', notes: FB, vol: 0.6 }, ...fieldBed(FBC)] },
      a2: { bars: 8, parts: [{ inst: 'flute', notes: FA, vol: 0.6 }, { inst: 'pluck', notes: tr(FA, -12), vol: 0.28 }, ...fieldBed(FAC)] },
      c: {
        bars: 8,
        parts: [
          { inst: 'pluck', notes: tr(FA, -12), vol: 0.6 },
          { inst: 'flute', notes: 'F#5:4 | E5:4 | D5:4 | D5:4 | F#5:4 | E5:4 | D5:4 | C#5:4', vol: 0.4 },
          ...fieldBed(FAC, 64),
        ],
      },
    },
    order: ['a', 'b', 'a2', 'c'],
  },

  marsh: {
    bpm: 66,
    meter: 3,
    loop: true,
    sections: {
      s1: {
        bars: 12,
        parts: [
          { inst: 'drone', notes: 'D2+A2:36', vol: 0.55 },
          { inst: 'musicbox', notes: MM, vol: 0.7 },
          { inst: 'pad', notes: pad(MC, 3, 50), vol: 0.22 },
          { inst: 'pluck', notes: drips(12, 3, ['A6', 'D7', 'F6', 'E6'], 0.12, 3), vol: 0.5, pan: 0.3 },
        ],
      },
      s2: {
        bars: 12,
        parts: [
          { inst: 'drone', notes: 'D2+A2:36', vol: 0.55 },
          { inst: 'glass', notes: tr(MM, -12), vol: 0.6 },
          { inst: 'cello', notes: 'D3:3 | C3:3 | Bb2:3 | A2:3 | G2:3 | Bb2:3 | A2:3 | C#3:3 | D3:3 | F3:3 | Bb2:3 | D3:3', vol: 0.5 },
          { inst: 'musicbox', notes: drips(12, 3, ['A6', 'D7', 'C7', 'F6'], 0.1, 11), vol: 0.4, pan: -0.3 },
          { inst: 'pad', notes: pad(MC, 3, 50), vol: 0.22 },
        ],
      },
    },
    order: ['s1', 's2'],
  },

  mill: {
    bpm: 118,
    meter: 4,
    loop: true,
    sections: {
      intro: { bars: 4, parts: [{ inst: 'synthbass', notes: bass(['Em', 'Em', 'Em', 'Em'], MOST, 4, 2), vol: 0.5 }, ...millDrums.filter((p) => p.inst !== 'snare')] },
      a: { bars: 8, parts: [{ inst: 'cello', notes: MILA, vol: 0.65 }, ...millBed(MAC)] },
      b: { bars: 8, parts: [{ inst: 'horn', notes: MILB, vol: 0.6 }, ...millBed(MBC)] },
      a2: { bars: 8, parts: [{ inst: 'horn', notes: MILA, vol: 0.55 }, { inst: 'cello', notes: MILA, oct: -1, vol: 0.4 }, ...millBed(MAC)] },
      brk: {
        bars: 4,
        parts: [
          { inst: 'synthbass', notes: bass(['Em', 'C', 'D', 'B'], 'R:1 -:1 R:1 -:1', 4, 2), vol: 0.45 },
          { inst: 'pad', notes: pad(['Em', 'C', 'D', 'B'], 4, 55), vol: 0.3 },
          { inst: 'clank', grid: 'x.......x.......', pitch: 'E5', vol: 0.5 },
        ],
      },
    },
    order: ['intro', 'a', 'b', 'a2', 'brk'],
  },

  cliffs: {
    bpm: 72,
    meter: 4,
    loop: true,
    sections: {
      a: {
        bars: 8,
        parts: [
          { inst: 'horn', notes: CLA, vol: 0.7 },
          { inst: 'pad', notes: pad(CAC, 4, 50), vol: 0.45 },
          { inst: 'drone', notes: bass(CAC, 'R:4', 4, 2), vol: 0.4 },
        ],
      },
      b: {
        bars: 8,
        parts: [
          { inst: 'flute', notes: CLB, vol: 0.55 },
          { inst: 'pluck', notes: arp(CBC, [0, 1, 2, 1], 1, 4, 62), vol: 0.4 },
          { inst: 'pad', notes: pad(CBC, 4, 55), vol: 0.4 },
          { inst: 'timpani', notes: bass(CBC, 'R:4', 4, 2), vol: 0.3 },
        ],
      },
      a2: {
        bars: 8,
        parts: [
          { inst: 'horn', notes: CLA, vol: 0.65 },
          { inst: 'flute', notes: 'A4:4 | G4:4 | F4:4 | G4:4 | A4:4 | C5:4 | G4:4 | A4:4', vol: 0.35 },
          { inst: 'pad', notes: pad(CAC, 4, 52), vol: 0.42 },
          { inst: 'pluck', notes: arp(CAC, [0, 1, 2, 1], 1, 4, 62), vol: 0.25 },
        ],
      },
    },
    order: ['a', 'b', 'a2'],
  },

  fray: {
    bpm: 60,
    meter: 4,
    loop: true,
    sections: {
      s: {
        bars: 20,
        parts: [
          { inst: 'swell', notes: FRAY_SWELLS, vol: 0.75 },
          { inst: 'swell', notes: FRAY_LOW, vol: 0.5, pan: -0.3 },
          { inst: 'drone', notes: 'C2+F#2:40 A#1+E2:40', vol: 0.45 },
          { inst: 'glass', notes: drips(20, 4, ['C6', 'D6', 'F#6', 'G#6', 'A#6', 'E7'], 0.12, 5, 0.5, 0.2, 0.5), vol: 0.5, pan: 0.35 },
          // the lullaby, a semitone wrong and half as fast: an echo of something lost
          { inst: 'musicbox', notes: cat('-:32', stretch(tr(bars(L, 1, 4), 1), 2)), vol: 0.35 },
        ],
      },
    },
    order: ['s'],
  },

  spindlehold: {
    bpm: 70,
    meter: 4,
    loop: true,
    sections: {
      a: {
        bars: 8,
        parts: [
          { inst: 'choir', notes: pad(SHC, 4, 62), vol: 0.55 },
          { inst: 'organ', notes: bass(SHC, 'R:4', 4, 2), vol: 0.5 },
          { inst: 'bell', notes: SH_BELLS, vol: 0.5 },
        ],
      },
      b: {
        bars: 8,
        parts: [
          { inst: 'choir', notes: SHM, vol: 0.6 },
          { inst: 'choir', notes: pad(SHC, 4, 58), vol: 0.45 },
          { inst: 'organ', notes: bass(SHC, 'R:4', 4, 2), vol: 0.5 },
          { inst: 'pluck', notes: arp(SHC, [0, 1, 2, 3, 2, 1, 2, 1], 0.5, 4, 60), vol: 0.28 },
          { inst: 'bell', notes: SH_BELLS, vol: 0.4 },
        ],
      },
      a2: {
        bars: 8,
        parts: [
          { inst: 'choir', notes: pad(SHC, 4, 62), vol: 0.5 },
          { inst: 'organ', notes: bass(SHC, 'R:4', 4, 2), vol: 0.5 },
          { inst: 'glass', notes: arp(SHC, [0, 1, 2, 3, 4, 3, 2, 1], 0.5, 4, 72), vol: 0.28 },
          { inst: 'flute', notes: SHM, vol: 0.32 },
          { inst: 'bell', notes: SH_BELLS, vol: 0.5 },
        ],
      },
    },
    order: ['a', 'b', 'a2'],
  },

  seam: {
    bpm: 132,
    meter: 4,
    loop: true,
    sections: {
      intro: {
        bars: 4,
        parts: [
          { inst: 'cello', notes: bass(['Cm', 'Cm', 'Ab', 'G'], SOST, 4, 3), vol: 0.6 },
          { inst: 'timpani', notes: bass(['Cm', 'Cm', 'Ab', 'G'], 'R:2 5:2', 4, 2), vol: 0.5 },
          { inst: 'swell', notes: 'C3+G3+C4:16', vol: 0.5 },
        ],
      },
      a: { bars: 8, parts: [{ inst: 'horn', notes: SEA, vol: 0.7 }, ...seamBed(SAC)] },
      b: { bars: 8, parts: [{ inst: 'horn', notes: SEB, vol: 0.7 }, ...seamBed(SBC)] },
      a2: { bars: 8, parts: [{ inst: 'horn', notes: SEA, vol: 0.65 }, { inst: 'choir', notes: SEA, vol: 0.4 }, { inst: 'crash', notes: 'C4:4', vol: 0.45 }, ...seamBed(SAC)] },
      b2: { bars: 8, parts: [{ inst: 'lead', notes: SEB, vol: 0.55 }, { inst: 'horn', notes: SEB, oct: -1, vol: 0.45 }, ...seamBed(SBC)] },
      outro: {
        bars: 4,
        parts: [
          { inst: 'cello', notes: bass(['Cm', 'Ab', 'G', 'G'], SOST, 4, 3), vol: 0.6 },
          { inst: 'timpani', notes: 'C2:2 G1:2 Ab1:2 Eb2:2 G1:4 G1:0.5 G1:0.5 G1:0.5 G1:0.5 G1:0.5 G1:0.5 G1:0.5 G1:0.5', vol: 0.5 },
          { inst: 'pad', notes: pad(['Cm', 'Ab', 'G', 'G'], 4, 55), vol: 0.3 },
        ],
      },
    },
    order: ['intro', 'a', 'b', 'a2', 'b2', 'outro'],
  },

  underweave: {
    bpm: 56,
    meter: 4,
    loop: true,
    sections: {
      s: {
        bars: 16,
        parts: [
          { inst: 'sub', notes: bass(UWC, 'R:8', 8, 1), vol: 0.55 },
          { inst: 'drone', notes: 'F#2+C#3:64', vol: 0.3 },
          { inst: 'choir', notes: pad(UWC, 8, 60), vol: 0.3 },
          { inst: 'glass', notes: drips(16, 4, ['F#5', 'A5', 'B5', 'C#6', 'E6'], 0.1, 13, 1, 0.2, 0.5), vol: 0.5, pan: 0.25 },
          { inst: 'glass', notes: cat('-:32', nobars(tr(bars(L, 1, 4), 9)), '-:20'), vol: 0.55, pan: -0.2 },
        ],
      },
    },
    order: ['s'],
  },

  spire: {
    bpm: 84,
    meter: 4,
    loop: true,
    sections: {
      a: {
        bars: 8,
        parts: [
          { inst: 'pluck', notes: arp(SPC, UP16, 0.25, 4, 60), vol: 0.3 },
          { inst: 'organ', notes: pad(SPC, 4, 55), vol: 0.4 },
          { inst: 'choir', notes: pad(SPC, 4, 64), vol: 0.2 },
        ],
      },
      b: {
        bars: 8,
        parts: [
          { inst: 'flute', notes: SPM, vol: 0.55 },
          { inst: 'pluck', notes: arp(SPC, UP16, 0.25, 4, 60), vol: 0.28 },
          { inst: 'organ', notes: pad(SPC, 4, 55), vol: 0.4 },
        ],
      },
      c: {
        bars: 8,
        parts: [
          { inst: 'choir', notes: SPR, vol: 0.6 },
          { inst: 'bell', notes: 'D5:4 -:4 -:4 A4:4 D5:4 -:4 -:4 A4:4', vol: 0.4 },
          { inst: 'pluck', notes: arp(SPBC, UP16, 0.25, 4, 60), vol: 0.28 },
          { inst: 'organ', notes: pad(SPBC, 4, 55), vol: 0.42 },
          { inst: 'timpani', notes: bass(SPBC, 'R:4', 4, 2), vol: 0.3 },
        ],
      },
      a2: {
        bars: 8,
        parts: [
          { inst: 'flute', notes: SPM, vol: 0.5 },
          { inst: 'choir', notes: SPM, vol: 0.35 },
          { inst: 'glass', notes: arp(SPC, [0, 2, 4, 6], 1, 4, 72), vol: 0.25 },
          { inst: 'pluck', notes: arp(SPC, UP16, 0.25, 4, 60), vol: 0.26 },
          { inst: 'organ', notes: pad(SPC, 4, 55), vol: 0.4 },
        ],
      },
    },
    order: ['a', 'b', 'c', 'a2'],
  },

  worldmap: {
    bpm: 96,
    meter: 4,
    loop: true,
    sections: {
      a: { bars: 8, parts: [{ inst: 'horn', notes: WMA, vol: 0.6 }, ...mapBed(WAC)] },
      b: { bars: 8, parts: [{ inst: 'flute', notes: WMB, vol: 0.55 }, { inst: 'kick', grid: 'x.......x.......', vol: 0.3 }, ...mapBed(WBC)] },
      a2: { bars: 8, parts: [{ inst: 'flute', notes: tr(WMA, 12), vol: 0.45 }, { inst: 'horn', notes: WMA, vol: 0.4 }, ...mapBed(WAC)] },
      b2: { bars: 8, parts: [{ inst: 'flute', notes: WMB, vol: 0.5 }, { inst: 'horn', notes: WMB, oct: -1, vol: 0.45 }, ...mapBed(WBC)] },
    },
    order: ['a', 'b', 'a2', 'b2'],
  },
} satisfies Record<string, TrackDef>;

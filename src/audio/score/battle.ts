// Fights and stingers: the battle themes, the boss theme, tension, victory and defeat.
import type { PartDef, TrackDef } from '../compile';
import { bass, comp, drips, pad, roll, tr, trChords } from '../theory';

// ------------------------------------------------------------------ battle: D minor, driving, a hook you hum later
const BTA =
  'D5:0.75 D5:0.25 F5:0.5 A5 G5:0.5 F5:0.5 E5:0.5 | F5:1.5 D5:0.5 Bb4:2 | C5:0.5 E5:0.5 G5 F5:0.5 E5:0.5 C5 | E5:2 C#5 A4 | ' +
  'D5:0.75 D5:0.25 F5:0.5 A5 D6 C6:0.5 | Bb5:1.5 A5:0.5 F5 D5 | E5:0.5 F5:0.5 G5 A5:0.5 G5:0.5 E5 | A5:3 -';
const BTB = 'G4:2 Bb4 D5 | F5:2 E5 D5 | D5:1.5 C5:0.5 Bb4 D5 | C#5:4 | G5:2 F5 E5 | F5:2 A5:2 | G#5:2 B5 G#5 | A5:2 E5 C#5';
const BTC = 'F5 G5 A5:2 | G5 A5 Bb5:2 | A5:4 | -:2 D5:0.5 E5:0.5 F5:0.5 G5:0.5 | A5 Bb5 C6:2 | Bb5 A5 G5:2 | A5:2 C#6:2 | E6:4';
const BAC = ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A'];
const BBC = ['Gm', 'Dm', 'Bb', 'A', 'Gm', 'Dm', 'E', 'A'];
const BCC = ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'];
const OST = 'R:0.5 R:0.5 8:0.5 R:0.5 +10:0.5 R:0.5 8:0.5 5:0.5';
const BASS8 = 'R:0.5 R:0.5 R:0.5 R:0.5 R:0.5 R:0.5 5:0.5 8:0.5';
const drums: PartDef[] = [
  { inst: 'kick', grid: 'x.....x.x.....x.', vol: 0.8 },
  { inst: 'snare', grid: '....x.......x..o', vol: 0.6 },
  { inst: 'hat', grid: 'x.x.x.x.x.x.x.x.', vol: 0.45 },
  { inst: 'ohat', grid: '..o...o...o...o.', vol: 0.3 },
];
const battleBed = (ch: string[]): PartDef[] => [
  { inst: 'cello', notes: bass(ch, OST, 4, 3), vol: 0.5 },
  { inst: 'synthbass', notes: bass(ch, BASS8, 4, 2), vol: 0.5 },
  { inst: 'pad', notes: pad(ch, 4, 57), vol: 0.26 },
  ...drums,
];

// ------------------------------------------------------------------ battle2: Act II onward, C# minor, darker
const B2A = tr('C5:0.5 Eb5:0.5 G5 F5:0.5 Eb5:0.5 D5 | Eb5:1.5 C5:0.5 Ab4:2 | F5:0.5 G5:0.5 Ab5 G5:0.5 F5:0.5 C5 | D5:2 B4:2 | C5:0.5 Eb5:0.5 G5 C6 Bb5:0.5 G5:0.5 | Ab5:1.5 G5:0.5 Eb5:2 | F5 Ab5 G5:0.5 F5:0.5 Eb5 | D5:3 -', 1);
const B2B = tr('C5:2 Eb5:2 | D5:2 F5:2 | G5:4 | -:4 | Ab5:2 G5:2 | F5:2 D5:2 | B4:2 D5:2 | G5:4', 1);
const B2AC = trChords(['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Fm', 'G'], 1);
const B2BC = trChords(['Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'G', 'G'], 1);
const B2_INTRO = trChords(['Cm', 'Cm', 'Ab', 'G'], 1);
const drums2: PartDef[] = [
  { inst: 'kick', grid: 'x..x..x...x..x..', vol: 0.85 },
  { inst: 'snare', grid: '....x.......x...', vol: 0.6 },
  { inst: 'hat', grid: 'x.x.x.x.x.x.x.x.', vol: 0.42 },
];
const battle2Bed = (ch: string[]): PartDef[] => [
  { inst: 'synthbass', notes: bass(ch, BASS8, 4, 2), vol: 0.55 },
  { inst: 'cello', notes: bass(ch, OST, 4, 3), vol: 0.45 },
  { inst: 'pad', notes: pad(ch, 4, 55), vol: 0.26 },
  ...drums2,
];

// ------------------------------------------------------------------ boss: F minor, timpani and choir
const BOA = 'F4 Ab4 C5:1.5 Bb4:0.5 | Ab4:2 F4:2 | G4 Bb4 Eb5:1.5 Db5:0.5 | C5:2 E4:2 | F4 Ab4 C5 F5 | Eb5 Db5 Ab4:2 | Bb4 Db5 Eb5 G5 | E5:4';
const BOB = 'Db5:2 F5:2 | C5:2 Ab4:2 | Db5 F5 Ab5:2 | G5:2 E5:2 | F5 Db5 Bb4:2 | Ab4 C5 F5:2 | Ab5:2 F5:2 | E5:2 G5:2';
const BOAC = ['Fm', 'Db', 'Eb', 'C', 'Fm', 'Db', 'Eb', 'C'];
const BOBC = ['Bbm', 'Fm', 'Db', 'C', 'Bbm', 'Fm', 'Db', 'C'];
const BOCC = ['Db', 'Eb', 'Fm', 'Fm', 'Db', 'Eb', 'C', 'C'];
const BOST = 'R:0.5 8:0.5 R:0.5 +7:0.5 R:0.5 8:0.5 3:0.5 +7:0.5';
const bossBed = (ch: string[]): PartDef[] => [
  { inst: 'cello', notes: bass(ch, BOST, 4, 3), vol: 0.5 },
  { inst: 'organ', notes: pad(ch, 4, 52), vol: 0.32 },
  { inst: 'timpani', notes: bass(ch, 'R:1 -:1 R:0.5 R:0.5 -:1', 4, 2), vol: 0.5 },
  { inst: 'synthbass', notes: bass(ch, 'R:1', 4, 2), vol: 0.4 },
  { inst: 'kick', grid: 'x..x....x.x.....', vol: 0.85 },
  { inst: 'snare', grid: '....x.......x...', vol: 0.6 },
  { inst: 'hat', grid: 'x.x.x.x.x.x.x.x.', vol: 0.4 },
];

export const battleTracks = {
  battle: {
    bpm: 150,
    meter: 4,
    loop: true,
    sections: {
      intro: {
        bars: 2,
        parts: [
          { inst: 'cello', notes: bass(['Dm', 'Dm'], OST, 4, 3), vol: 0.55 },
          { inst: 'synthbass', notes: bass(['Dm', 'Dm'], BASS8, 4, 2), vol: 0.5 },
          { inst: 'timpani', notes: 'D2 -:3 D2:0.5 D2:0.5 D2:0.5 D2:0.5 A1:2', vol: 0.6 },
          { inst: 'crash', notes: 'C4:4', vol: 0.5 },
          ...drums,
        ],
      },
      a: { bars: 8, parts: [{ inst: 'lead', notes: BTA, vol: 0.7 }, ...battleBed(BAC)] },
      b: { bars: 8, parts: [{ inst: 'horn', notes: BTB, vol: 0.7 }, ...battleBed(BBC)] },
      a2: { bars: 8, parts: [{ inst: 'lead', notes: BTA, vol: 0.65 }, { inst: 'horn', notes: tr(BTA, -12), vol: 0.4 }, { inst: 'crash', notes: 'C4:4', vol: 0.45 }, ...battleBed(BAC)] },
      c: {
        bars: 8,
        parts: [
          { inst: 'lead', notes: BTC, vol: 0.65 },
          { inst: 'choir', notes: pad(BCC, 4, 62), vol: 0.45 },
          { inst: 'timpani', notes: bass(BCC, 'R:1 -:1 R:1 -:1', 4, 2), vol: 0.45 },
          ...battleBed(BCC),
        ],
      },
      a3: { bars: 8, parts: [{ inst: 'lead', notes: BTA, vol: 0.7 }, { inst: 'choir', notes: pad(BAC, 4, 62), vol: 0.35 }, { inst: 'crash', notes: 'C4:4', vol: 0.45 }, ...battleBed(BAC)] },
    },
    order: ['intro', 'a', 'b', 'a2', 'c', 'a3'],
  },

  battle2: {
    bpm: 156,
    meter: 4,
    loop: true,
    sections: {
      intro: {
        bars: 4,
        parts: [
          { inst: 'synthbass', notes: bass(B2_INTRO, BASS8, 4, 2), vol: 0.55 },
          { inst: 'timpani', notes: bass(B2_INTRO, 'R:1 -:1 R:0.5 R:0.5 -:1', 4, 2), vol: 0.5 },
          { inst: 'choir', notes: comp(B2_INTRO, 'x:0.5 -:3.5', 4, 62), vol: 0.5 },
          ...drums2,
        ],
      },
      a: { bars: 8, parts: [{ inst: 'lead', notes: B2A, vol: 0.7 }, { inst: 'choir', notes: comp(B2AC, 'x:0.5 -:1.5', 4, 62), vol: 0.35 }, ...battle2Bed(B2AC)] },
      b: {
        bars: 8,
        parts: [
          { inst: 'choir', notes: B2B, vol: 0.6 },
          { inst: 'horn', notes: B2B, vol: 0.6 },
          { inst: 'timpani', notes: bass(B2BC, 'R:1 R:1 -:2', 4, 2), vol: 0.5 },
          { inst: 'crash', notes: 'C4:4', vol: 0.45 },
          ...battle2Bed(B2BC),
        ],
      },
      a2: { bars: 8, parts: [{ inst: 'lead', notes: B2A, vol: 0.65 }, { inst: 'horn', notes: tr(B2A, -12), vol: 0.4 }, ...battle2Bed(B2AC)] },
      b2: {
        bars: 8,
        parts: [
          { inst: 'choir', notes: B2B, vol: 0.6 },
          { inst: 'lead', notes: B2B, vol: 0.45 },
          { inst: 'timpani', notes: bass(B2BC, 'R:1 R:1 -:2', 4, 2), vol: 0.5 },
          { inst: 'crash', notes: 'C4:4', vol: 0.45 },
          ...battle2Bed(B2BC),
        ],
      },
      tag: {
        bars: 4,
        parts: [
          { inst: 'timpani', notes: roll('G#1', 16, 0.25, 0.3, 1), vol: 0.5 },
          { inst: 'synthbass', notes: bass(['G#', 'G#', 'G#', 'G#'], BASS8, 4, 2), vol: 0.5 },
          { inst: 'swell', notes: 'G#3+D#4+G#4:16', vol: 0.5 },
          { inst: 'kick', grid: 'x...x...x...x...', vol: 0.75 },
        ],
      },
    },
    order: ['intro', 'a', 'b', 'a2', 'b2', 'tag'],
  },

  boss: {
    bpm: 140,
    meter: 4,
    loop: true,
    sections: {
      intro: {
        bars: 4,
        parts: [
          { inst: 'swell', notes: 'F3+C4+F4:16', vol: 0.6 },
          { inst: 'organ', notes: 'F2+C3:16', vol: 0.5 },
          { inst: 'timpani', notes: roll('F2', 16, 0.25, 0.2, 1), vol: 0.6 },
        ],
      },
      a: { bars: 8, parts: [{ inst: 'horn', notes: BOA, vol: 0.7 }, { inst: 'choir', notes: BOA, vol: 0.35 }, { inst: 'crash', notes: 'C4:4', vol: 0.5 }, ...bossBed(BOAC)] },
      b: { bars: 8, parts: [{ inst: 'lead', notes: BOB, vol: 0.65 }, { inst: 'choir', notes: pad(BOBC, 4, 62), vol: 0.35 }, ...bossBed(BOBC)] },
      a2: { bars: 8, parts: [{ inst: 'lead', notes: tr(BOA, 12), vol: 0.5 }, { inst: 'horn', notes: BOA, vol: 0.6 }, { inst: 'crash', notes: 'C4:4', vol: 0.5 }, ...bossBed(BOAC)] },
      brg: {
        bars: 8,
        parts: [
          { inst: 'choir', notes: 'Ab4:4 | Bb4:4 | C5:4 | C5:4 | Db5:4 | Eb5:4 | E5:4 | E5:4', vol: 0.65 },
          { inst: 'choir', notes: pad(BOCC, 4, 57), vol: 0.4 },
          { inst: 'organ', notes: pad(BOCC, 4, 50), vol: 0.4 },
          { inst: 'timpani', notes: bass(BOCC, 'R:2 R:1 R:1', 4, 2), vol: 0.55 },
          { inst: 'kick', grid: 'x.......x.......', vol: 0.7 },
        ],
      },
      b2: { bars: 8, parts: [{ inst: 'lead', notes: BOB, vol: 0.65 }, { inst: 'horn', notes: tr(BOB, -12), vol: 0.45 }, { inst: 'crash', notes: 'C4:4', vol: 0.5 }, ...bossBed(BOBC)] },
    },
    order: ['intro', 'a', 'b', 'a2', 'brg', 'b2'],
  },

  /** a held breath: pulse, low strings, small dissonances */
  tension: {
    bpm: 90,
    meter: 4,
    loop: true,
    sections: {
      a: {
        bars: 8,
        parts: [
          { inst: 'bass', notes: 'A1:0.5 A1:0.5@0.55', loop: true, vol: 0.5 },
          { inst: 'cello', notes: 'A2:8 G2:8 F2:8 E2:8', vol: 0.5 },
          { inst: 'pad', notes: 'A3+Bb3+E4:8 G3+Ab3+D4:8 F3+Gb3+C4:8 E3+F3+B3:8', vol: 0.22 },
          { inst: 'kick', grid: 'x..o............', vol: 0.5 },
        ],
      },
      b: {
        bars: 8,
        parts: [
          { inst: 'bass', notes: 'A1:0.5 A1:0.5@0.55', loop: true, vol: 0.5 },
          { inst: 'cello', notes: 'A3:1.5 Bb3:0.5 A3:2 -:4 G3:1.5 Ab3:0.5 G3:2 -:4 F3:1.5 Gb3:0.5 F3:2 -:4 E3:1.5 F3:0.5 E3:2 -:4', vol: 0.55 },
          { inst: 'pad', notes: 'A3+Bb3+E4:8 G3+Ab3+D4:8 F3+Gb3+C4:8 E3+F3+B3:8', vol: 0.22 },
          { inst: 'kick', grid: 'x..o............', vol: 0.5 },
        ],
      },
      c: {
        bars: 8,
        parts: [
          { inst: 'bass', notes: 'A1:0.5 A1:0.5@0.55', loop: true, vol: 0.55 },
          { inst: 'cello', notes: 'A2:8 G2:8 F2:8 E2:8', vol: 0.5 },
          { inst: 'swell', notes: 'A4+Bb4:32', vol: 0.4 },
          { inst: 'glass', notes: drips(8, 4, ['A6', 'Bb6', 'E7'], 0.08, 19), vol: 0.4 },
          { inst: 'kick', grid: 'x..o............', vol: 0.55 },
        ],
      },
    },
    order: ['a', 'b', 'c'],
  },

  /** a bright fanfare, 5 seconds, no loop */
  victory: {
    bpm: 144,
    meter: 4,
    loop: false,
    sections: {
      s: {
        bars: 3,
        parts: [
          { inst: 'lead', notes: 'G4:0.5 C5:0.5 E5:0.5 G5:0.5 C6 G5 | A5 F5:0.5 A5:0.5 B5 D6 | C6:4', vol: 0.7 },
          { inst: 'horn', notes: 'C4+E4+G4:4 F4+A4+C5:2 G4+B4+D5:2 C4+E4+G4+C5:4', vol: 0.55 },
          { inst: 'timpani', notes: 'C2 -:3 F2:2 G2:2 C2:4', vol: 0.7 },
          { inst: 'crash', notes: '-:8 C4:4', vol: 0.6 },
          { inst: 'pluck', notes: '-:8 C5:0.25 E5:0.25 G5:0.25 C6:0.25 E6:0.25 G6:0.25 C7:1.5', vol: 0.45 },
          { inst: 'bass', notes: 'C2:4 F2:2 G2:2 C2:4', vol: 0.5 },
        ],
      },
    },
    order: ['s'],
  },

  /** falling, quiet, no loop */
  gameover: {
    bpm: 70,
    meter: 4,
    loop: false,
    sections: {
      s: {
        bars: 2,
        parts: [
          { inst: 'piano', notes: 'E5 D5 C5 B4 | A4:4', vol: 0.7 },
          { inst: 'pad', notes: 'A3+C4+E4:4 F3+A3+C4:2 A2+E3+A3:2', vol: 0.35 },
          { inst: 'cello', notes: 'A2:4 F2:2 A1:2', vol: 0.4 },
        ],
      },
    },
    order: ['s'],
  },
} satisfies Record<string, TrackDef>;

// Lio's lullaby and everything built on it: the music box, the title, camp, sorrow, Orrin's boss theme, the Weaver
// and the credits. One melody, many griefs.
import type { TrackDef } from '../compile';
import { arp, bars, bass, cat, comp, drips, nobars, pad, rep, roll, stretch, tr, trChords } from '../theory';

/** Lio's lullaby: 16 bars of 3/4 in A minor, ending warm on A major. */
export const LULLABY =
  'E4 A4 B4 | C5:1.5 B4:0.5 A4 | G4 E4 G4 | A4:3 | ' +
  'E4 A4 B4 | C5:1.5 D5:0.5 E5 | D5 C5 B4 | C5:3 | ' +
  'E5:1.5 D5:0.5 C5 | D5:1.5 C5:0.5 B4 | C5 A4 F4 | G#4:3 | ' +
  'E4 A4 B4 | C5:1.5 B4:0.5 A4 | B4 G#4 E4 | A4:3';
export const LULLABY_CHORDS = ['Am', 'F', 'C', 'Am', 'Am', 'F', 'G', 'C', 'Am', 'G', 'F', 'E', 'Am', 'F', 'E', 'A'];

const L = LULLABY;
const LC = LULLABY_CHORDS;
/** the same harmony ending in minor (no warm resolution: the boss themes) */
const LCM = [...LC.slice(0, 15), 'Am'];
/** a rocking 3/4 arpeggio in eighths */
const WALTZ8 = [0, 1, 2, 3, 2, 1];

// the lullaby in D minor for the Weaver
const D_L = tr(L, 5);
const D_LC = trChords(LC, 5);
const D_LCM = trChords(LCM, 5);

export const lullabyTracks = {
  /** the music box alone, then with strings */
  lullaby: {
    bpm: 80,
    meter: 3,
    loop: true,
    sections: {
      box: {
        bars: 16,
        parts: [
          { inst: 'musicbox', notes: tr(L, 12), vol: 0.85 },
          { inst: 'musicbox', notes: arp(LC, [0, 2, 1], 1, 3, 64), vol: 0.32 },
        ],
      },
      strings: {
        bars: 16,
        parts: [
          { inst: 'musicbox', notes: tr(L, 12), vol: 0.8 },
          { inst: 'pad', notes: pad(LC, 3, 57), vol: 0.7 },
          { inst: 'pluck', notes: arp(LC, WALTZ8, 0.5, 3, 52), vol: 0.32 },
          { inst: 'cello', notes: bass(LC, 'R:3', 3, 2), vol: 0.45 },
        ],
      },
    },
    order: ['box', 'strings'],
  },

  /** piano and strings; the strings take the melody the second time */
  title: {
    bpm: 76,
    meter: 3,
    loop: true,
    sections: {
      intro: {
        bars: 4,
        parts: [
          { inst: 'piano', notes: arp(['Am', 'F', 'Am', 'E'], WALTZ8, 0.5, 3, 55), vol: 0.55 },
          { inst: 'pad', notes: pad(['Am', 'F', 'Am', 'E'], 3, 57), vol: 0.4 },
        ],
      },
      a: {
        bars: 16,
        parts: [
          { inst: 'piano', notes: L, vol: 0.85 },
          { inst: 'piano', notes: arp(LC, WALTZ8, 0.5, 3, 50), vol: 0.42 },
          { inst: 'pad', notes: pad(LC, 3, 57), vol: 0.42 },
        ],
      },
      b: {
        bars: 16,
        parts: [
          { inst: 'cello', notes: tr(L, -12), vol: 0.8 },
          { inst: 'pad', notes: pad(LC, 3, 64), vol: 0.5 },
          { inst: 'piano', notes: arp(LC, WALTZ8, 0.5, 3, 60), vol: 0.36 },
          { inst: 'pluck', notes: cat('-:24', nobars(tr(bars(L, 9, 16), 12))), vol: 0.35 },
        ],
      },
      outro: {
        bars: 4,
        parts: [
          { inst: 'piano', notes: 'F3+A3+C4+E4:3 E3+G#3+B3+E4:3 A2+E3+A3+C#4+E4:6', vol: 0.6 },
          { inst: 'musicbox', notes: '-:6 A5 C#6 E6 A6:3', vol: 0.5 },
          { inst: 'pad', notes: pad(['F', 'E', 'A:6'], 3, 57), vol: 0.4 },
        ],
      },
    },
    order: ['intro', 'a', 'b', 'outro'],
  },

  /** guitar-ish plucks round the fire; the flute takes the tune the second time */
  camp: {
    bpm: 72,
    meter: 3,
    loop: true,
    sections: {
      a: {
        bars: 16,
        parts: [
          { inst: 'guitar', notes: arp(LC, [0, 1, 2, 1, 2, 1], 0.5, 3, 52), vol: 0.55 },
          { inst: 'pluck', notes: L, vol: 0.7 },
          { inst: 'pad', notes: pad(LC, 3, 60), vol: 0.28 },
        ],
      },
      b: {
        bars: 16,
        parts: [
          { inst: 'guitar', notes: arp(LC, [0, 2, 1, 3, 2, 1], 0.5, 3, 52), vol: 0.55 },
          { inst: 'flute', notes: tr(L, 12), vol: 0.5 },
          { inst: 'pad', notes: pad(LC, 3, 60), vol: 0.32 },
          { inst: 'bass', notes: bass(LC, 'R:1 -:2', 3, 2), vol: 0.45 },
        ],
      },
    },
    order: ['a', 'b'],
  },

  /** slow solo piano, then the cello alone with the last phrase */
  sorrow: {
    bpm: 58,
    meter: 3,
    loop: true,
    sections: {
      a: {
        bars: 16,
        parts: [
          { inst: 'piano', notes: L, vol: 0.8 },
          { inst: 'piano', notes: comp(LC, 'x:3@0.55', 3, 48), vol: 0.45 },
        ],
      },
      b: {
        bars: 8,
        parts: [
          { inst: 'cello', notes: tr(bars(L, 9, 16), -12), vol: 0.8 },
          { inst: 'piano', notes: arp(LC.slice(8), [0, 1, 2, null, 2, null], 0.5, 3, 55), vol: 0.35 },
          { inst: 'pad', notes: pad(LC.slice(8), 3, 57), vol: 0.22 },
        ],
      },
    },
    order: ['a', 'b'],
  },

  /** Orrin: the lullaby turned minor and driving, timpani and choir */
  boss_orrin: {
    bpm: 160,
    meter: 3,
    loop: true,
    sections: {
      intro: {
        bars: 4,
        parts: [
          { inst: 'cello', notes: bass(['Am', 'Am', 'Am', 'E'], 'R:0.5 8:0.5 R:0.5 +10:0.5 R:0.5 5:0.5', 3, 3), vol: 0.7 },
          { inst: 'timpani', notes: 'A2:1 -:2 A2:1 -:2 A2:1 -:2 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5', vol: 0.85 },
          { inst: 'swell', notes: 'A3+E4+A4:12', vol: 0.6 },
        ],
      },
      a: {
        bars: 16,
        parts: [
          { inst: 'lead', notes: L, vol: 0.75 },
          { inst: 'cello', notes: bass(LCM, 'R:0.5 8:0.5 R:0.5 +10:0.5 R:0.5 5:0.5', 3, 3), vol: 0.55 },
          { inst: 'synthbass', notes: bass(LCM, 'R:1', 3, 2), vol: 0.5 },
          { inst: 'timpani', notes: bass(LCM, 'R:1 -:2', 3, 2), vol: 0.5 },
          { inst: 'pad', notes: pad(LCM, 3, 57), vol: 0.3 },
          { inst: 'kick', grid: 'x...x.', steps: 2, vol: 0.8 },
          { inst: 'snare', grid: '..x..x', steps: 2, vol: 0.55 },
          { inst: 'hat', grid: 'xxxxxx', steps: 2, vol: 0.5 },
        ],
      },
      b: {
        bars: 16,
        parts: [
          { inst: 'horn', notes: L, vol: 0.75 },
          { inst: 'choir', notes: L, vol: 0.45 },
          { inst: 'cello', notes: bass(LCM, 'R:0.5 8:0.5 R:0.5 +10:0.5 R:0.5 5:0.5', 3, 3), vol: 0.55 },
          { inst: 'timpani', notes: bass(LCM, 'R:1 -:1 R:0.5 R:0.5', 3, 2), vol: 0.55 },
          { inst: 'pad', notes: pad(LCM, 3, 60), vol: 0.35 },
          { inst: 'kick', grid: 'x...x.', steps: 2, vol: 0.8 },
          { inst: 'snare', grid: '..x..x', steps: 2, vol: 0.6 },
          { inst: 'hat', grid: 'xoxoxo', steps: 2, vol: 0.5 },
          { inst: 'crash', notes: 'C4:3', vol: 0.5 },
        ],
      },
      c: {
        bars: 8,
        parts: [
          { inst: 'lead', notes: 'A4:1.5 B4:0.5 C5 | D5:1.5 C5:0.5 B4 | G#4:1.5 A4:0.5 B4 | C5:3 | C5:1.5 D5:0.5 E5 | F5:1.5 E5:0.5 D5 | E5:1.5 D5:0.5 B4 | G#4:3', vol: 0.75 },
          { inst: 'choir', notes: pad(['Am', 'Dm', 'E', 'Am', 'F', 'Dm', 'E', 'E'], 3, 60), vol: 0.5 },
          { inst: 'cello', notes: bass(['Am', 'Dm', 'E', 'Am', 'F', 'Dm', 'E', 'E'], 'R:0.5 8:0.5 R:0.5 +10:0.5 R:0.5 5:0.5', 3, 3), vol: 0.55 },
          { inst: 'timpani', notes: rep('A2:0.5@0.5 A2:0.5@0.6 A2:0.5@0.7 A2:0.5@0.8 A2:0.5@0.9 A2:0.5', 4) + ' ' + rep('E2:0.5@0.6 E2:0.5@0.7 E2:0.5@0.8 E2:0.5@0.9 E2:0.5 E2:0.5@1.1', 4), vol: 0.5 },
          { inst: 'kick', grid: 'x.....', steps: 2, vol: 0.7 },
        ],
      },
      d: {
        bars: 12,
        parts: [
          { inst: 'lead', notes: cat(bars(L, 9, 16), '|', 'E5:3 | D5:1.5 C5:0.5 B4 | C5:1.5 B4:0.5 A4 | G#4:3'), vol: 0.75 },
          { inst: 'horn', notes: cat(bars(L, 9, 16), '|', 'E5:3 | D5:1.5 C5:0.5 B4 | C5:1.5 B4:0.5 A4 | G#4:3'), oct: -1, vol: 0.55 },
          { inst: 'choir', notes: pad([...LCM.slice(8), 'E', 'Dm', 'Am', 'E'], 3, 60), vol: 0.45 },
          { inst: 'cello', notes: bass([...LCM.slice(8), 'E', 'Dm', 'Am', 'E'], 'R:0.5 8:0.5 R:0.5 +10:0.5 R:0.5 5:0.5', 3, 3), vol: 0.55 },
          { inst: 'timpani', notes: bass([...LCM.slice(8), 'E', 'Dm', 'Am', 'E'], 'R:1 -:1 R:0.5 R:0.5', 3, 2), vol: 0.55 },
          { inst: 'kick', grid: 'x...x.', steps: 2, vol: 0.85 },
          { inst: 'snare', grid: '..x..x', steps: 2, vol: 0.6 },
          { inst: 'hat', grid: 'xxxxxx', steps: 2, vol: 0.5 },
          { inst: 'crash', notes: 'C4:3', vol: 0.5 },
        ],
      },
    },
    order: ['intro', 'a', 'b', 'c', 'd'],
  },

  /** the Weaver: choir, organ, timpani; the lullaby stretched huge, then whole, then home in D major */
  final_weaver: {
    bpm: 138,
    meter: 3,
    loop: true,
    sections: {
      intro: {
        bars: 4,
        parts: [
          { inst: 'swell', notes: 'D3+A3+D4+F4:12', vol: 0.75 },
          { inst: 'organ', notes: 'D2+A2:12', vol: 0.5 },
          { inst: 'choir', notes: 'D4+F4+A4:12', vol: 0.4 },
          { inst: 'timpani', notes: roll('D2', 12, 0.25, 0.15, 0.9), vol: 0.65 },
        ],
      },
      a: {
        bars: 16,
        parts: [
          { inst: 'organ', notes: arp(D_LCM, WALTZ8, 0.5, 3, 50), vol: 0.45 },
          { inst: 'horn', notes: tr(L, -7), vol: 0.75 },
          { inst: 'choir', notes: pad(D_LCM, 3, 62), vol: 0.45 },
          { inst: 'timpani', notes: bass(D_LCM, 'R:1 -:1 5:1', 3, 2), vol: 0.55 },
          { inst: 'bass', notes: bass(D_LCM, 'R:3', 3, 2), vol: 0.55 },
          { inst: 'kick', grid: 'x.....', steps: 2, vol: 0.75 },
          { inst: 'snare', grid: '....x.', steps: 2, vol: 0.5 },
          { inst: 'hat', grid: 'x.x.x.', steps: 2, vol: 0.4 },
        ],
      },
      b: {
        bars: 16,
        parts: [
          { inst: 'choir', notes: stretch(bars(D_L, 1, 8), 2), vol: 0.7 },
          { inst: 'horn', notes: tr(stretch(bars(D_L, 1, 8), 2), -12), vol: 0.5 },
          { inst: 'organ', notes: pad(D_LCM.slice(0, 8), 6, 52), vol: 0.45 },
          { inst: 'pluck', notes: arp(D_LCM.slice(0, 8), [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3], 0.5, 6, 57), vol: 0.35 },
          { inst: 'timpani', notes: bass(D_LCM.slice(0, 8), 'R:1 R:0.5 R:0.5 -:1', 6, 2), vol: 0.55 },
          { inst: 'kick', grid: 'x.....', steps: 2, vol: 0.75 },
          { inst: 'snare', grid: '....x.', steps: 2, vol: 0.5 },
          { inst: 'hat', grid: 'x.x.x.', steps: 2, vol: 0.4 },
          { inst: 'crash', notes: 'C4:3', vol: 0.5 },
        ],
      },
      c: {
        bars: 8,
        parts: [
          { inst: 'swell', notes: 'D4+D#4+G#4:6 C#4+D4+G4:6 D4+E4+A#4:6 C#4+F4+A4:6', vol: 0.7 },
          { inst: 'choir', notes: rep('D4+F4+G#4:0.5 -:2.5', 4) + ' ' + rep('C#4+E4+A4:0.5 -:2.5', 4), vol: 0.7 },
          { inst: 'timpani', notes: rep('D2:0.5 D2:0.5 G#1 D2', 8), vol: 0.6 },
          { inst: 'glass', notes: drips(8, 3, ['D6', 'D#6', 'G#6', 'A6', 'C#7'], 0.3, 7), vol: 0.4 },
          { inst: 'crash', notes: 'C4:3', vol: 0.5 },
          { inst: 'kick', grid: 'x.x.x.', steps: 2, vol: 0.6 },
        ],
      },
      d: {
        bars: 16,
        parts: [
          { inst: 'choir', notes: D_L, vol: 0.65 },
          { inst: 'horn', notes: tr(L, -7), vol: 0.6 },
          { inst: 'lead', notes: D_L, vol: 0.45 },
          { inst: 'organ', notes: arp(D_LC, WALTZ8, 0.5, 3, 52), vol: 0.45 },
          { inst: 'timpani', notes: bass(D_LC, 'R:1 R:0.5 R:0.5 5:1', 3, 2), vol: 0.55 },
          { inst: 'bass', notes: bass(D_LC, 'R:2 5:1', 3, 2), vol: 0.5 },
          { inst: 'kick', grid: 'x..x..', steps: 2, vol: 0.75 },
          { inst: 'snare', grid: '....x.', steps: 2, vol: 0.55 },
          { inst: 'hat', grid: 'xxxxxx', steps: 2, vol: 0.4 },
          { inst: 'crash', notes: 'C4:3', vol: 0.55 },
        ],
      },
      outro: {
        bars: 4,
        parts: [
          { inst: 'organ', notes: 'D3+F#3+A3+D4:12', vol: 0.5 },
          { inst: 'choir', notes: 'D4+F#4+A4+D5:12', vol: 0.55 },
          { inst: 'timpani', notes: roll('D2', 12, 0.25, 0.8, 0.1), vol: 0.6 },
        ],
      },
    },
    order: ['intro', 'a', 'b', 'c', 'd', 'outro'],
  },

  /** the whole lullaby, arranged every way the game has heard it */
  credits: {
    bpm: 84,
    meter: 3,
    loop: true,
    sections: {
      intro: {
        bars: 4,
        parts: [
          { inst: 'piano', notes: arp(['Am', 'F', 'C', 'E'], WALTZ8, 0.5, 3, 55), vol: 0.55 },
          { inst: 'pad', notes: pad(['Am', 'F', 'C', 'E'], 3, 57), vol: 0.35 },
        ],
      },
      a: {
        bars: 16,
        parts: [
          { inst: 'piano', notes: L, vol: 0.85 },
          { inst: 'piano', notes: arp(LC, WALTZ8, 0.5, 3, 50), vol: 0.4 },
          { inst: 'pad', notes: pad(LC, 3, 57), vol: 0.4 },
        ],
      },
      b: {
        bars: 16,
        parts: [
          { inst: 'cello', notes: tr(L, -12), vol: 0.8 },
          { inst: 'pluck', notes: arp(LC, WALTZ8, 0.5, 3, 55), vol: 0.35 },
          { inst: 'pad', notes: pad(LC, 3, 64), vol: 0.45 },
          { inst: 'flute', notes: arp(LC, [2], 3, 3, 74), vol: 0.35 },
        ],
      },
      c: {
        bars: 16,
        parts: [
          { inst: 'lead', notes: L, vol: 0.7 },
          { inst: 'horn', notes: tr(L, -12), vol: 0.35 },
          { inst: 'choir', notes: pad(LC, 3, 62), vol: 0.45 },
          { inst: 'guitar', notes: arp(LC, WALTZ8, 0.5, 3, 52), vol: 0.45 },
          { inst: 'bass', notes: bass(LC, 'R:1 -:1 5:1', 3, 2), vol: 0.5 },
          { inst: 'kick', grid: 'x.....', steps: 2, vol: 0.5 },
          { inst: 'shaker', grid: 'x.o.o.', steps: 2, vol: 0.6 },
        ],
      },
      d: {
        bars: 16,
        parts: [
          { inst: 'musicbox', notes: tr(L, 12), vol: 0.8 },
          { inst: 'pad', notes: pad(LC, 3, 57), vol: 0.45 },
          { inst: 'pluck', notes: arp(LC, [0, 2, 1], 1, 3, 55), vol: 0.3 },
        ],
      },
      outro: {
        bars: 4,
        parts: [
          { inst: 'piano', notes: 'F3+A3+C4+E4:3 E3+G#3+B3+E4:3 A2+E3+A3+C#4+E4:6', vol: 0.6 },
          { inst: 'musicbox', notes: '-:6 A5 C#6 E6 A6:3', vol: 0.5 },
          { inst: 'pad', notes: pad(['F', 'E', 'A:6'], 3, 57), vol: 0.35 },
        ],
      },
    },
    order: ['intro', 'a', 'b', 'c', 'd', 'outro'],
  },
} satisfies Record<string, TrackDef>;

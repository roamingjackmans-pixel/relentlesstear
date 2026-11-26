import { describe, expect, it } from 'vitest';
import { audio } from '../src/audio';
import { compileTrack } from '../src/audio/compile';
import { INSTRUMENTS } from '../src/audio/instruments';
import { LULLABY, LULLABY_CHORDS, TRACKS } from '../src/audio/score';
import { SFX } from '../src/audio/sfx';
import { arp, bars, bass, beatsOf, midiOf, nameOf, pad, parseChord, stretch, tr, trChords } from '../src/audio/theory';
import type { SfxId, TrackId } from '../src/data/types';

const TRACK_IDS: TrackId[] = [
  'title', 'hollowmere', 'fields', 'marsh', 'mill', 'cliffs', 'fray', 'spindlehold', 'seam', 'underweave', 'spire', 'worldmap',
  'camp', 'battle', 'battle2', 'boss', 'boss_orrin', 'final_weaver', 'sorrow', 'lullaby', 'tension', 'victory', 'gameover', 'credits',
];

const SFX_IDS: SfxId[] = [
  'ui_move', 'ui_ok', 'ui_back', 'ui_error', 'step', 'hit_light', 'hit_heavy', 'hit_crit', 'slash', 'thrust', 'shot', 'parry',
  'parry_perfect', 'dodge', 'jump', 'land', 'qte_perfect', 'qte_good', 'qte_miss', 'break', 'burn', 'freeze', 'shock', 'heal',
  'buff', 'debuff', 'ap_gain', 'ko', 'revive', 'victory_sting', 'chest', 'journal', 'waystitch', 'door', 'thread_pull', 'stitch',
  'tear_rip', 'magic_light', 'magic_dark', 'bell', 'choir', 'explosion', 'wind', 'splash', 'gear', 'scissors', 'level_up',
  'unlock', 'weave', 'heartbeat', 'thunder',
];

describe('music theory helpers', () => {
  it('names and numbers notes', () => {
    expect(midiOf('A4')).toBe(69);
    expect(midiOf('C4')).toBe(60);
    expect(midiOf('Bb3')).toBe(58);
    expect(nameOf(61)).toBe('C#4');
    expect(() => midiOf('H2')).toThrow();
  });

  it('parses chords and transposes', () => {
    expect(parseChord('F#m7')).toEqual({ root: 6, iv: [0, 3, 7, 10] });
    expect(() => parseChord('Cwobble')).toThrow();
    expect(trChords(['Am', 'E:2'], 5)).toEqual(['Dm', 'A:2']);
    expect(tr('A4:2 C5@0.5 | -', 3)).toBe('C5:2 D#5@0.5 | -');
    expect(stretch('A4 B4:0.5 | C5', 2)).toBe('A4:2 B4 C5:2');
    expect(bars('A | B | C', 2, 3)).toBe('B | C');
  });

  it('generators fill exactly the chords they are given', () => {
    const ch = ['Am', 'F', 'C:2', 'G:6'];
    expect(beatsOf(pad(ch, 4))).toBe(16);
    expect(beatsOf(arp(ch, [0, 1, 2], 0.5, 4))).toBe(16);
    expect(beatsOf(bass(ch, 'R:1.5 5:1 8', 4))).toBe(16);
  });

  it('the lullaby is 16 bars of 3/4 with a chord per bar', () => {
    expect(beatsOf(LULLABY)).toBe(48);
    expect(LULLABY.split('|')).toHaveLength(16);
    expect(LULLABY_CHORDS).toHaveLength(16);
  });
});

describe('the score', () => {
  it('has a piece for every track id and nothing else', () => {
    expect(Object.keys(TRACKS).sort()).toEqual([...TRACK_IDS].sort());
  });

  for (const id of TRACK_IDS) {
    it(`${id} compiles, fits its bars and has a sane length`, () => {
      const def = TRACKS[id];
      const c = compileTrack(def, id);
      expect(c.events.length).toBeGreaterThan(10);
      for (const ev of c.events) {
        expect(ev.t).toBeGreaterThanOrEqual(0);
        expect(ev.t).toBeLessThan(c.beats);
        expect(ev.d).toBeGreaterThan(0);
        expect(ev.v).toBeGreaterThan(0);
        for (const f of ev.f) {
          expect(f).toBeGreaterThan(20);
          expect(f).toBeLessThan(8000);
        }
        expect(c.buses[ev.bus]).toBeDefined();
        expect(c.buses[ev.bus].inst in INSTRUMENTS).toBe(true);
      }
      if (id === 'victory' || id === 'gameover') {
        expect(def.loop).toBe(false);
        expect(c.seconds).toBeGreaterThanOrEqual(3);
        expect(c.seconds).toBeLessThanOrEqual(9);
      } else if (id === 'credits') {
        expect(c.seconds).toBeGreaterThanOrEqual(100);
        expect(c.seconds).toBeLessThanOrEqual(200);
      } else {
        expect(def.loop).toBe(true);
        expect(c.seconds).toBeGreaterThanOrEqual(45);
        expect(c.seconds).toBeLessThanOrEqual(120);
      }
    });
  }

  it('catches a bar that does not add up', () => {
    expect(() =>
      compileTrack({ bpm: 100, meter: 4, loop: true, sections: { a: { bars: 2, parts: [{ inst: 'piano', notes: 'C4:4 | D4:3' }] } }, order: ['a'] }),
    ).toThrow(/bar 2/);
    expect(() =>
      compileTrack({ bpm: 100, meter: 4, loop: true, sections: { a: { bars: 1, parts: [{ inst: 'piano', notes: 'C4:8' }] } }, order: ['a'] }),
    ).toThrow(/longer than the section/);
  });

  it('loops grids to fill their section', () => {
    const c = compileTrack({ bpm: 120, meter: 4, loop: true, sections: { a: { bars: 3, parts: [{ inst: 'kick', grid: 'x...' }] } }, order: ['a'] });
    expect(c.events).toHaveLength(12);
  });
});

describe('sound effects', () => {
  it('has one for every sfx id and nothing else', () => {
    expect(Object.keys(SFX).sort()).toEqual([...SFX_IDS].sort());
    for (const id of SFX_IDS) expect(typeof SFX[id]).toBe('function');
  });
});

describe('the audio API without Web Audio', () => {
  it('is a silent no-op that never throws', () => {
    expect(() => {
      audio.music('title');
      audio.unlock();
      audio.unlock();
      audio.music('battle', 300);
      audio.music(null);
      audio.music('hollowmere');
      for (const id of SFX_IDS) audio.sfx(id, { vol: 0.5, pitch: 1.2, pan: -0.5 });
      audio.ambience('rain', 0.5);
      audio.ambience('none');
      audio.duck(0.3, 500);
      audio.muffle(true);
      audio.muffle(false);
      audio.setVolume('music', 0.4);
      audio.setVolume('sfx', 2);
    }).not.toThrow();
    expect(audio.current()).toBe('hollowmere');
    expect(audio.getVolume('music')).toBe(0.4);
    expect(audio.getVolume('sfx')).toBe(1);
    expect(audio.beat()).toBeCloseTo(60 / TRACKS.hollowmere.bpm);
    audio.music(null);
    expect(audio.current()).toBeNull();
    expect(audio.beat()).toBe(0.5);
  });
});

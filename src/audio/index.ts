// Relentless Tear's audio: everything synthesized with Web Audio (no audio files).
//
//   audio.unlock()            call from the first click/key/tap (browsers only allow sound after a gesture)
//   audio.music('hollowmere') crossfade to a track; asking for the playing track again does nothing
//   audio.sfx('parry')        a sound effect (optional { vol, pitch, pan })
//   audio.ambience('rain')    a looping bed under the music
//
// Everything is a silent no-op before unlock() and wherever Web Audio is missing (Node, tests, old browsers).
// music()/ambience() called before unlock() are remembered and start as soon as audio is unlocked.
import type { SfxId, TrackId } from '../data/types';
import { startAmbience, type AmbHandle, type AmbKind } from './ambience';
import { compileTrack, type Compiled } from './compile';
import { createEngine, glide, type Engine } from './engine';
import { TrackPlayer } from './player';
import { TRACKS } from './score';
import { SFX } from './sfx';

type VolKind = 'master' | 'music' | 'sfx';

const LOOKAHEAD = 0.15;
const TICK_MS = 40;
const MAX_PER_SFX = 4;
/** how long a finished stinger rings on before the track counts as over */
const STINGER_TAIL = 1.5;

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

const state = {
  vol: { master: 0.8, music: 0.6, sfx: 0.8 } as Record<VolKind, number>,
  want: null as TrackId | null,
  amb: { kind: 'none' as AmbKind, vol: 1 },
  muffled: false,
};

let eng: Engine | null = null;
let failed = false;
let player: TrackPlayer | null = null;
let amb: AmbHandle | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let listening = false;
const compiled = new Map<TrackId, Compiled>();
const busy = new Map<SfxId, number[]>();

function compiledTrack(id: TrackId): Compiled | null {
  let c = compiled.get(id);
  if (!c) {
    const def = TRACKS[id];
    if (!def) return null;
    c = compileTrack(def, id);
    compiled.set(id, c);
  }
  return c;
}

function tick(): void {
  if (!eng) return;
  try {
    const now = eng.c.currentTime;
    if (player) {
      player.tick(now, LOOKAHEAD);
      if (now > player.endAt + STINGER_TAIL) {
        // a stinger (victory, game over) has played out: nothing is playing any more
        player.stop(0.1);
        if (state.want === player.id) state.want = null;
        player = null;
      }
    }
    amb?.tick(now);
  } catch {
    /* never let a scheduling hiccup break the game */
  }
}

function startTimer(): void {
  if (timer === null) timer = setInterval(tick, TICK_MS);
}

function stopTimer(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function onVisibility(): void {
  if (!eng || typeof document === 'undefined') return;
  if (document.hidden) {
    stopTimer();
    eng.c.suspend().catch(() => {});
  } else {
    eng.c.resume().catch(() => {});
    startTimer();
    tick();
  }
}

function applyVolumes(): void {
  if (!eng) return;
  const { c } = eng;
  glide(eng.master.gain, c, state.vol.master, 0.05);
  glide(eng.musicVol.gain, c, state.vol.music, 0.05);
  glide(eng.musicRevVol.gain, c, state.vol.music, 0.05);
  glide(eng.sfxVol.gain, c, state.vol.sfx, 0.05);
  glide(eng.sfxRevVol.gain, c, state.vol.sfx, 0.05);
  glide(eng.ambVol.gain, c, state.vol.sfx, 0.05);
}

function playTrack(id: TrackId | null, fadeMs: number): void {
  if (!eng) return;
  const fade = Math.max(0, fadeMs) / 1000;
  if (player) {
    player.stop(Math.max(0.05, fade));
    player = null;
  }
  if (!id) return;
  const comp = compiledTrack(id);
  if (!comp) return;
  player = new TrackPlayer(eng, eng.musicVol, eng.musicRevVol, id, comp, fade);
  tick();
}

function playAmbience(fadeMs: number): void {
  if (!eng) return;
  if (amb && amb.kind === state.amb.kind) {
    amb.setVol(state.amb.vol);
    return;
  }
  amb?.stop(fadeMs);
  amb = startAmbience(eng, eng.ambVol, state.amb.kind, state.amb.vol, fadeMs);
}

export const audio = {
  unlock(): void {
    try {
      if (failed) return;
      if (!eng) {
        eng = createEngine();
        if (!eng) {
          failed = true;
          return;
        }
        applyVolumes();
        if (state.muffled) eng.muffle.frequency.value = 700;
        if (!listening && typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', onVisibility);
          listening = true;
        }
        startTimer();
        if (state.want) playTrack(state.want, 800);
        if (state.amb.kind !== 'none') playAmbience(800);
      }
      if (eng.c.state === 'suspended' && !(typeof document !== 'undefined' && document.hidden)) eng.c.resume().catch(() => {});
    } catch {
      /* no sound, but the game goes on */
    }
  },

  music(track: TrackId | null, fadeMs = 1200): void {
    try {
      if (track === state.want && (!eng || player?.id === track || track === null)) return;
      state.want = track;
      playTrack(track, fadeMs);
    } catch {
      /* ignore */
    }
  },

  sfx(id: SfxId, opts: { vol?: number; pitch?: number; pan?: number } = {}): void {
    try {
      if (!eng || eng.c.state !== 'running') return;
      const fn = SFX[id];
      if (!fn) return;
      const { c } = eng;
      const now = c.currentTime;
      const live = (busy.get(id) ?? []).filter((end) => end > now);
      if (live.length >= MAX_PER_SFX) return;
      const out = c.createGain();
      let head: AudioNode = out;
      let panner: StereoPannerNode | null = null;
      if (opts.pan && typeof c.createStereoPanner === 'function') {
        panner = c.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
        out.connect(panner);
        head = panner;
      }
      head.connect(eng.sfxVol);
      const rev = c.createGain();
      rev.connect(eng.sfxRevVol);
      const len = fn(eng, out, rev, now + 0.005, Math.max(0.1, opts.pitch ?? 1), Math.max(0, opts.vol ?? 1));
      live.push(now + len);
      busy.set(id, live);
      setTimeout(
        () => {
          for (const n of [out, rev, panner])
            try {
              n?.disconnect();
            } catch {
              /* gone */
            }
        },
        (len + 0.5) * 1000,
      );
    } catch {
      /* ignore */
    }
  },

  ambience(kind: AmbKind, vol = 1): void {
    try {
      state.amb = { kind, vol: clamp01(vol) };
      playAmbience(1500);
    } catch {
      /* ignore */
    }
  },

  setVolume(kind: VolKind, v: number): void {
    state.vol[kind] = clamp01(v);
    try {
      applyVolumes();
    } catch {
      /* ignore */
    }
  },

  getVolume(kind: VolKind): number {
    return state.vol[kind];
  },

  duck(to: number, ms: number): void {
    try {
      if (!eng) return;
      const { c } = eng;
      const t = c.currentTime;
      const lo = clamp01(to);
      const hold = Math.max(0, ms) / 1000;
      for (const p of [eng.duck.gain, eng.duckRev.gain]) {
        p.cancelScheduledValues(t);
        p.setValueAtTime(p.value, t);
        p.linearRampToValueAtTime(lo, t + 0.15);
        p.setValueAtTime(lo, t + 0.15 + hold);
        p.linearRampToValueAtTime(1, t + 0.75 + hold);
      }
    } catch {
      /* ignore */
    }
  },

  muffle(on: boolean): void {
    state.muffled = on;
    try {
      if (!eng) return;
      const t = eng.c.currentTime;
      for (const f of [eng.muffle.frequency, eng.muffleRev.frequency]) {
        f.cancelScheduledValues(t);
        f.setValueAtTime(f.value, t);
        f.exponentialRampToValueAtTime(on ? 700 : 20000, t + 0.35);
      }
    } catch {
      /* ignore */
    }
  },

  current(): TrackId | null {
    return state.want;
  },

  beat(): number {
    const def = state.want ? TRACKS[state.want] : null;
    return def ? 60 / def.bpm : 0.5;
  },
};

export type { AmbKind } from './ambience';

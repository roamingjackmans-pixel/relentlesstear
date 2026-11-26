// The director: modes (title, explore, battle, world map), the frame loop, saving, and every story hook that
// scenes, cutscenes and battles call.
import { audio } from '../audio';
import { Battle } from '../battle/battle';
import { createBattle } from '../battle/engine';
import type { BState } from '../battle/types';
import { input } from '../core/input';
import { CHARS } from '../data/characters';
import { CLASS_MAP } from '../data/classes';
import { ENCOUNTERS } from '../data/encounters';
import { ITEMS, PATCH_MAP } from '../data/items';
import type { CharId, Cmd, SceneObject, ThemeId, TrackId } from '../data/types';
import { Explore } from '../explore/explore';
import { WorldMap } from '../explore/worldmap';
import { api, getToken, setToken, type User } from '../net/api';
import type { Coop } from '../net/coop';
import { fit, H, setLowQuality, W, type View } from '../render/canvas';
import { Fx } from '../render/fx';
import { clearPropCache } from '../render/props';
import { BOND_SCENES, CUTSCENES, JOURNALS } from '../story';
import { Aborted, playCutscene, runCmds } from '../story/runner';
import { Dialogue } from '../ui/dialogue';
import { btn, confirmBox, h, layerCount, navigate, notice, pushLayer, toast, tutorial } from '../ui/dom';
import { openPartyMenu, openPauseMenu, openShopMenu, showRewards } from '../ui/menus';
import { showTitle } from '../ui/title';
import { OPENING_CUTSCENE, SCENES } from '../world';
import { applyRewards } from './rewards';
import { addItem, DEFAULT_SETTINGS, flagOn, newProfile, restoreParty, type Profile, type SaveData, type Settings } from './state';
import { GuestMirror, HostSync } from './sync';

export type Mode = 'title' | 'explore' | 'battle' | 'worldmap' | 'credits' | 'void';

const LOCAL_KEY = 'rt.profile';

export class Game {
  view: View;
  fx = new Fx();
  dialogue = new Dialogue();
  profile: Profile = newProfile();
  save!: SaveData;
  slot = 0;
  user: User | null = null;
  rev = 0;
  offline = false;
  mode: Mode = 'title';
  explore: Explore | null = null;
  battleScr: Battle | null = null;
  worldmap: WorldMap | null = null;
  busy = 0;
  ff = false;
  abortCutscene = false;
  tutSeen = new Set<string>();
  net: (HostSync | GuestMirror) | null = null;
  coop: Coop | null = null;
  private fadeA = 0;
  private fadeColor = '#000';
  private fadeAnim: { from: number; to: number; t: number; dur: number; res: () => void } | null = null;
  private pendingMap: string | null = null;
  private pendingEnter: string | null = null;
  private cutDepth = 0;
  private holdSkip = 0;
  private lastT = performance.now();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savePending = false;
  private playStart = 0;
  private fps = { frames: 0, t: 0, slow: 0 };
  titleBg: ((ctx: CanvasRenderingContext2D, dt: number) => void) | null = null;

  constructor(view: View) {
    this.view = view;
    this.loadLocal();
    this.applySettings();
  }

  get settings(): Settings {
    return this.profile.settings;
  }

  // ------------------------------------------------------------------ profile & saving

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Profile;
        if (p && p.v === 1) this.profile = { ...newProfile(), ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      }
      const seen = localStorage.getItem('rt.tutSeen');
      if (seen) this.tutSeen = new Set(JSON.parse(seen));
    } catch {
      /* private window */
    }
  }

  applySettings(): void {
    const s = this.settings;
    audio.setVolume('master', s.master);
    audio.setVolume('music', s.music);
    audio.setVolume('sfx', s.sfx);
    this.fx.shakeEnabled = s.shake;
    this.fx.reducedFlash = s.reducedFlash;
    this.dialogue.speed = s.textSpeed;
    this.dialogue.auto = s.autoAdvance;
    const low = s.quality === 'low';
    setLowQuality(low);
    fit(this.view, this.view.canvas.parentElement!);
  }

  /** Sign in with a stored token and fetch the cloud profile. */
  async resume(): Promise<boolean> {
    if (!getToken()) return false;
    try {
      const r = await api.me();
      this.user = r.user;
      this.rev = r.rev;
      if (r.profile && (r.profile as Profile).v === 1) {
        const p = r.profile as Profile;
        this.profile = { ...newProfile(), ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      } else {
        // first time on this account: bring this device's local progress along
        this.profile.slots = this.profile.slots.map((s) => s ?? null);
        await this.pushProfile();
      }
      this.offline = false;
      this.applySettings();
      return true;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) setToken('');
      return false;
    }
  }

  async signedIn(token: string, user: User): Promise<void> {
    setToken(token);
    this.user = user;
    await this.resume();
  }

  async signOut(): Promise<void> {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken('');
    this.user = null;
    this.profile = newProfile();
    this.loadLocal();
  }

  /** Save now (local immediately, cloud debounced). */
  persist(): Promise<void> {
    if (this.net && !this.net.isHost) return Promise.resolve(); // guests never write the host's save
    if (this.save) {
      this.save.updated = Date.now();
      if (this.playStart) {
        this.save.playtime += Date.now() - this.playStart;
        this.playStart = Date.now();
      }
      this.profile.slots[this.slot] = this.save;
      this.profile.lastSlot = this.slot;
    }
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(this.profile));
      localStorage.setItem('rt.tutSeen', JSON.stringify([...this.tutSeen]));
    } catch {
      /* storage full or blocked */
    }
    if (this.user && !this.offline) {
      this.savePending = true;
      if (!this.saveTimer)
        this.saveTimer = setTimeout(() => {
          this.saveTimer = null;
          void this.pushProfile();
        }, 1200);
    }
    return Promise.resolve();
  }

  private async pushProfile(): Promise<void> {
    if (!this.user) return;
    this.savePending = false;
    try {
      const r = await api.save(this.profile, this.rev);
      this.rev = r.rev;
    } catch (e) {
      const err = e as { status?: number; body?: { rev?: number } };
      if (err.status === 409 && typeof err.body?.rev === 'number') {
        // another device saved: keep ours (it's the newer play), take their revision number
        this.rev = err.body.rev;
        try {
          const r = await api.save(this.profile, this.rev);
          this.rev = r.rev;
        } catch {
          toast('Cloud save failed; your progress is saved on this device.');
        }
      } else if (err.status !== 0) toast('Cloud save failed; your progress is saved on this device.');
    }
  }

  // ------------------------------------------------------------------ frame loop

  start(): void {
    let last = 0;
    const step = (now: number): void => {
      const dt = Math.min(0.05, (now - this.lastT) / 1000);
      this.lastT = now;
      last = performance.now();
      this.tick(dt);
    };
    const frame = (now: number): void => {
      step(now);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // testing aid: ?bgtick keeps the game running in a hidden tab (automated play-throughs)
    if (new URLSearchParams(location.search).has('bgtick'))
      setInterval(() => {
        if (performance.now() - last > 40) step(performance.now());
      }, 16);
  }

  private tick(dt: number): void {
    input.poll();
    const ctx = this.view.ctx;
    ctx.setTransform(this.view.scale, 0, 0, this.view.scale, 0, 0);
    // DOM menus get first go at the input
    const uiTook = layerCount() > 0 ? navigate() : false;
    this.dialogue.update();
    this.fx.update(dt);
    this.updateFade(dt);
    // hold Esc to fast-forward a cutscene
    if (this.cutDepth > 0 && !uiTook && !this.ff) {
      if (input.down('menu')) {
        this.holdSkip += dt;
        if (this.holdSkip > 0.9) {
          this.ff = true;
          this.dialogue.finish();
        }
      } else this.holdSkip = 0;
    }
    const controls = this.mode === 'explore' && this.busy === 0 && !uiTook && !this.dialogue.open && !this.fadeAnim && !(this.net && !this.net.isHost);
    switch (this.mode) {
      case 'title':
      case 'void':
        ctx.fillStyle = '#0b0709';
        ctx.fillRect(0, 0, W, H);
        this.titleBg?.(ctx, dt);
        break;
      case 'explore':
        if (this.explore) {
          if (controls && input.pressed('menu')) {
            input.eat('menu');
            input.eat('back');
            void this.pauseMenu();
          }
          if (controls && input.pressed('map') && flagOn(this.save, 'pro_done')) {
            input.eat('map');
            void this.openWorldMap(this.explore.spec.region, { scene: this.explore.spec.id, x: this.explore.lead.x });
          }
          this.explore.update(dt, controls);
          this.net?.tick(dt);
          this.explore.draw(ctx, dt);
        }
        break;
      case 'battle':
        if (this.battleScr) {
          this.battleScr.update(dt);
          this.battleScr.draw(ctx, dt);
        }
        break;
      case 'worldmap':
        this.worldmap?.update(dt, !uiTook);
        this.worldmap?.draw(ctx);
        break;
      case 'credits':
        ctx.fillStyle = '#05040a';
        ctx.fillRect(0, 0, W, H);
        this.titleBg?.(ctx, dt);
        break;
    }
    if (this.mode !== 'battle') this.fx.draw(ctx);
    this.fx.drawScreen(ctx);
    if (this.cutDepth > 0 && this.holdSkip > 0.05 && !this.ff) {
      ctx.save();
      ctx.font = '600 16px Spectral, Georgia';
      ctx.fillStyle = 'rgba(243,230,200,0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(`Fast-forwarding… ${Math.min(100, Math.round((this.holdSkip / 0.9) * 100))}%`, W - 20, 30);
      ctx.restore();
    }
    if (this.fadeA > 0.001) {
      ctx.save();
      ctx.globalAlpha = this.fadeA;
      ctx.fillStyle = this.fadeColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // keep an eye on the frame rate: drop to low quality if it stays poor
    this.fps.frames++;
    this.fps.t += dt;
    if (this.fps.t > 4) {
      const f = this.fps.frames / this.fps.t;
      if (f < 38 && this.settings.quality === 'high' && this.mode !== 'title') {
        this.fps.slow++;
        if (this.fps.slow >= 2) {
          this.settings.quality = 'low';
          this.applySettings();
          clearPropCache();
          toast('Switched to faster graphics (Settings to change).');
        }
      } else this.fps.slow = 0;
      this.fps.frames = 0;
      this.fps.t = 0;
    }
    input.endFrame();
  }

  // ------------------------------------------------------------------ fades and cards

  fade(dir: 'in' | 'out', ms: number, color = '#000'): Promise<void> {
    this.net?.cast({ t: 'fade', dir, ms, color });
    this.fadeColor = color;
    return new Promise((res) => {
      this.fadeAnim?.res();
      this.fadeAnim = { from: this.fadeA, to: dir === 'out' ? 1 : 0, t: 0, dur: Math.max(0.01, ms / 1000), res };
    });
  }

  private updateFade(dt: number): void {
    const f = this.fadeAnim;
    if (!f) return;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    this.fadeA = f.from + (f.to - f.from) * k;
    if (k >= 1) {
      this.fadeAnim = null;
      f.res();
    }
  }

  titleCard(text: string, sub: string | undefined, ms: number): Promise<void> {
    this.net?.cast({ t: 'title', text, sub, ms });
    const el = h('div', { class: 'titlecard passive' }, h('div', { class: 't' }, text), h('div', { class: 'line' }), sub ? h('div', { class: 's' }, sub) : null);
    document.getElementById('ui')!.append(el);
    audio.sfx('bell', { vol: 0.5 });
    return new Promise((res) => {
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => {
          el.remove();
          res();
        }, 800);
      }, ms);
    });
  }

  toast(text: string): void {
    this.net?.cast({ t: 'toast', text });
    toast(text);
  }

  choose(options: string[]): Promise<number> {
    this.net?.cast({ t: 'choice', options });
    return this.dialogue.choose(options).then((i) => {
      this.net?.cast({ t: 'choiceDone', i });
      return i;
    });
  }

  charName(id: CharId): string {
    return CHARS[id].short;
  }

  tutorialOnce(id: string): Promise<void> {
    if (this.net && !this.net.isHost && ['move', 'waystitch', 'worldmap', 'camp'].includes(id)) return Promise.resolve();
    const p = tutorial(id, this.tutSeen);
    void this.persist();
    return p;
  }

  // ------------------------------------------------------------------ starting play

  /** Begin a loaded save (Continue / Load / New Game). */
  async play(slot: number, save: SaveData, isNew: boolean): Promise<void> {
    this.slot = slot;
    this.save = save;
    this.profile.lastSlot = slot;
    this.playStart = Date.now();
    this.mode = 'void';
    this.titleBg = null;
    this.fadeA = 1;
    if (isNew) {
      await this.persist();
      const cs = CUTSCENES[OPENING_CUTSCENE];
      // the opening narration plays over Hollowmere's sky before the story drops into the village
      this.explore = new Explore(this, SCENES.hm_green, 300);
      for (const a of this.explore.actors.values()) a.hidden = true;
      this.explore.camX = 0;
      this.mode = 'explore';
      if (cs) await this.runCutscene(cs.id);
      if (!this.explore || this.explore.spec.id !== 'hm_green') await this.gotoScene('hm_green', 300);
      for (const a of this.explore!.actors.values()) if (a.party) a.hidden = false;
      void this.tutorialOnce('move');
      return;
    }
    await this.gotoScene(save.scene, save.x);
  }

  // ------------------------------------------------------------------ scenes and the map

  async gotoScene(id: string, x?: number, inCutscene = false): Promise<void> {
    const spec = SCENES[id];
    if (!spec) {
      console.warn('[rt] unknown scene', id);
      return;
    }
    if (this.mode === 'explore' || this.mode === 'worldmap') await this.fade('out', 380);
    this.closeWorldMap();
    this.explore = new Explore(this, spec, x ?? 200);
    this.mode = 'explore';
    this.save.scene = id;
    this.save.x = x ?? 200;
    audio.music(spec.music);
    audio.ambience(spec.weather === 'rain' || spec.theme === 'marsh_night' ? 'rain' : spec.theme === 'cliffs_wind' || spec.theme === 'seam_storm' ? 'wind' : spec.theme === 'mill_industrial' ? 'fire' : spec.theme === 'underweave_deep' ? 'hum' : 'none', 0.5);
    audio.muffle(spec.theme === 'underweave_deep');
    this.net?.sceneChanged();
    void this.fade('in', 500);
    if (spec.onEnter && !flagOn(this.save, `seen:${spec.onEnter}`)) {
      if (inCutscene || this.cutDepth > 0) this.pendingEnter = spec.onEnter;
      else await this.runCutscene(spec.onEnter);
    }
    void this.persist();
  }

  queueWorldMap(at?: string): void {
    this.pendingMap = at ?? this.explore?.spec.region ?? 'hollowmere';
    if (this.cutDepth === 0) void this.flushPending();
  }

  private async flushPending(): Promise<void> {
    if (this.pendingEnter) {
      const e = this.pendingEnter;
      this.pendingEnter = null;
      if (!flagOn(this.save, `seen:${e}`)) await this.runCutscene(e);
    }
    if (this.pendingMap) {
      const m = this.pendingMap;
      this.pendingMap = null;
      await this.openWorldMap(m);
    }
  }

  async openWorldMap(at: string, back?: { scene: string; x: number }): Promise<void> {
    if (this.net && !this.net.isHost) return;
    await this.fade('out', 300);
    this.mode = 'worldmap';
    audio.music('worldmap');
    audio.ambience('none');
    this.worldmap = new WorldMap(this, at, back);
    this.net?.cast({ t: 'mode', mode: 'worldmap', at });
    void this.fade('in', 400);
    void this.tutorialOnce('worldmap');
  }

  closeWorldMap(): void {
    this.worldmap?.destroy();
    this.worldmap = null;
  }

  // ------------------------------------------------------------------ cutscenes

  async runCutscene(id: string): Promise<void> {
    const cs = CUTSCENES[id];
    if (!cs) {
      console.warn('[rt] missing cutscene', id);
      return;
    }
    if (!cs.repeat && flagOn(this.save, `seen:${id}`) && this.cutDepth === 0) return;
    this.cutDepth++;
    this.busy++;
    try {
      await playCutscene(this, cs);
      // marked seen only once it has played to the end, so closing the game mid-scene can't skip it for good
      this.save.flags[`seen:${id}`] = true;
    } catch (e) {
      if (!(e instanceof Aborted)) console.error('[rt] cutscene error', id, e);
    } finally {
      this.cutDepth--;
      this.busy--;
      if (this.cutDepth === 0) {
        this.ff = false;
        this.abortCutscene = false;
        this.holdSkip = 0;
        this.dialogue.close();
        this.explore?.releaseActors();
        this.net?.cast({ t: 'cutEnd' });
        void this.persist();
        void this.flushPending();
      }
    }
  }

  /** run a list of commands as a cutscene (bond scenes) */
  async runScript(cmds: Cmd[]): Promise<void> {
    this.cutDepth++;
    this.busy++;
    try {
      await runCmds(this, cmds);
    } catch (e) {
      if (!(e instanceof Aborted)) console.error('[rt] script error', e);
    } finally {
      this.cutDepth--;
      this.busy--;
      if (this.cutDepth === 0) {
        this.ff = false;
        this.dialogue.close();
        this.explore?.releaseActors();
        void this.flushPending();
      }
    }
  }

  // ------------------------------------------------------------------ battles

  async roamBattle(obj: Extract<SceneObject, { kind: 'enemy' }>, first: 'party' | 'enemy' | null): Promise<void> {
    if (this.busy > 0 || this.mode !== 'explore') return;
    const r = await this.battle(obj.enc, { first });
    if (r === 'won') {
      if (!this.save.cleared.includes(obj.id)) this.save.cleared.push(obj.id);
    } else if (r === 'fled') this.explore?.disableRoamer(obj.id);
  }

  async bossFight(o: Extract<SceneObject, { kind: 'boss' }>): Promise<void> {
    if (this.busy > 0) return;
    if (o.before && !flagOn(this.save, `seen:${o.before}`)) await this.runCutscene(o.before);
    if (flagOn(this.save, `beat:${o.enc}`)) return;
    const r = await this.battle(o.enc, {});
    if ((r === 'won' || r === 'scripted') && o.after) await this.runCutscene(o.after);
  }

  /** Run a battle; returns how it ended. Handles defeat (retry / back to the Waystitch) unless loseOk. */
  async battle(encId: string, o: { first?: 'party' | 'enemy' | null; loseOk?: boolean; noFlee?: boolean; fromCutscene?: boolean }): Promise<BState['phase']> {
    const enc = ENCOUNTERS[encId];
    if (!enc) {
      console.warn('[rt] missing encounter', encId);
      return 'won';
    }
    if (o.noFlee) enc.noFlee = true;
    this.busy++;
    try {
      for (;;) {
        const r = await this.fight(encId, o.first ?? null);
        if (r === 'lost' && !o.loseOk) {
          const again = await this.gameOver();
          if (again) continue;
          // back to the last Waystitch
          restoreParty(this.save);
          if (this.cutDepth > 0) this.abortCutscene = true;
          await this.gotoScene(this.save.way.scene, this.save.way.x);
          return 'lost';
        }
        if (r === 'won' || r === 'scripted') this.save.flags[`beat:${encId}`] = true;
        void this.persist();
        return r;
      }
    } finally {
      this.busy--;
    }
  }

  private partyFor(encId: string): CharId[] {
    const enc = ENCOUNTERS[encId];
    const s = this.save;
    if (enc?.only?.length) return enc.only.filter((id) => s.roster.includes(id) || enc.only!.includes(id));
    let party = s.active.filter((id) => s.roster.includes(id)).slice(0, 4);
    for (const f of enc?.force ?? []) {
      if (!party.includes(f) && s.roster.includes(f)) {
        if (party.length >= 4) party = party.slice(0, 3);
        party.unshift(f);
      }
    }
    for (const r of s.roster) if (party.length < 4 && !party.includes(r)) party.push(r);
    return party.slice(0, 4);
  }

  private async fight(encId: string, first: 'party' | 'enemy' | null): Promise<BState['phase']> {
    const enc = ENCOUNTERS[encId];
    const s = this.save;
    const party = this.partyFor(encId);
    const ctrl: Partial<Record<CharId, string>> = {};
    if (this.coop) {
      for (const id of party) {
        const seat = this.coop.seats[id];
        ctrl[id] = seat ? this.coop.ctrlFor(seat) : 'ai';
      }
      if (!Object.values(ctrl).includes('host')) {
        const free = party.find((id) => ctrl[id] === 'ai');
        if (free && !Object.values(this.coop.seats).includes(this.coop.hostId)) ctrl[free] = 'host';
      }
    } else {
      const lead: CharId = party.includes('ash') ? 'ash' : party[0];
      for (const id of party) ctrl[id] = s.commandAll || id === lead ? 'host' : 'ai';
    }
    // testing aid: window.rtAuto = true lets the AI play every seat (automated play-throughs)
    if ((window as unknown as { rtAuto?: boolean }).rtAuto) for (const id of party) ctrl[id] = 'ai';
    const items: Record<string, number> = {};
    for (const [k, n] of Object.entries(s.tinct)) items[k] = n;
    for (const id of ['honey_bun', 'smelling_salts', 'spool_of_will', 'golden_thread', 'ember_vial', 'frost_vial', 'storm_vial']) if (s.inv[id]) items[id] = s.inv[id];
    const theme: ThemeId = this.explore?.spec.theme ?? 'village_autumn';
    const music: TrackId = enc.boss ? 'boss' : s.chapter >= 5 ? 'battle2' : 'battle';
    const st = createBattle(s, enc, { seed: (Math.random() * 2 ** 31) | 0, first, ctrl, party }, theme, music);
    // transition: a thread pulls tight across the screen
    audio.sfx('tear_rip', { vol: 0.5 });
    this.fx.flash('#fff6e0', 220);
    await this.fade('out', 260, '#fff6e0');
    this.dialogue.close();
    const link = this.coop ? this.coop.battleLink() : null;
    this.battleScr = new Battle(this, st, items, link);
    this.net?.battleStarted(encId, st, items);
    this.mode = 'battle';
    void this.fade('in', 380, '#fff6e0');
    const result = await this.battleScr.run();
    const fin = this.battleScr.st;
    this.battleScr.destroy();
    this.coop?.resetBattle();
    // tinctures and items back to the save
    for (const k of Object.keys(s.tinct)) s.tinct[k] = items[k] ?? s.tinct[k];
    for (const id of ['honey_bun', 'smelling_salts', 'spool_of_will', 'golden_thread', 'ember_vial', 'frost_vial', 'storm_vial']) {
      if (items[id] != null) {
        if (items[id] > 0) s.inv[id] = items[id];
        else delete s.inv[id];
      }
    }
    const rw = applyRewards(fin, s, this.profile, 'host', enc);
    this.net?.battleEnded(result, fin);
    if (result === 'won') await showRewards(this, rw);
    else if (rw.classes.length) for (const c of rw.classes) toast(`Class unlocked: ${CLASS_MAP[c]?.name}`);
    if (result !== 'lost' || this.cutDepth > 0) {
      await this.fade('out', 250);
      this.battleScr = null;
      this.mode = 'explore';
      if (this.explore) audio.music(this.explore.spec.music);
      void this.fade('in', 400);
    }
    return result;
  }

  private gameOver(): Promise<boolean> {
    return new Promise((res) => {
      let pop: () => void = () => {};
      const el = h(
        'div',
        { class: 'panel dark rewards' },
        h('p', { class: 'big', style: 'color:#ff9a8a' }, 'The Thread Snaps'),
        h('p', { class: 'muted' }, 'But a pattern can be woven again.'),
        h(
          'div',
          { class: 'row', style: 'justify-content:center;margin-top:16px' },
          btn('Try again', () => {
            pop();
            res(true);
          }, 'btn gold', { 'data-autofocus': '1' }),
          btn('Back to the Waystitch', () => {
            pop();
            res(false);
          }),
        ),
      );
      pop = pushLayer(el, undefined);
    });
  }

  // ------------------------------------------------------------------ world objects

  async openChest(o: Extract<SceneObject, { kind: 'chest' }>): Promise<void> {
    this.busy++;
    try {
      this.save.flags[`got:${o.id}`] = true;
      audio.sfx('chest');
      this.fx.glowPuff(640, 400, '#ffe08a', 10);
      const rows: HTMLElement[] = [];
      let patch = false;
      for (const l of o.loot) {
        if (l.item === 'glim') {
          this.save.glim += l.n ?? 0;
          rows.push(h('div', { class: 'item' }, h('b', {}, `${l.n} Glim`)));
          continue;
        }
        addItem(this.save, l.item, l.n ?? 1);
        if (l.item.startsWith('song_') && !this.save.songs.includes(l.item)) this.save.songs.push(l.item);
        const it = ITEMS[l.item];
        if (it?.kind === 'patch') patch = true;
        rows.push(h('div', { class: 'item' }, h('b', {}, it?.name ?? l.item), (l.n ?? 1) > 1 ? ` ×${l.n}` : '', it ? h('div', { class: 'muted', style: 'font-size:15px' }, it.desc) : null));
      }
      await notice('Found', rows);
      if (patch) await this.tutorialOnce('patches');
      void this.persist();
    } finally {
      this.busy--;
    }
  }

  async readJournal(id: string): Promise<void> {
    const j = JOURNALS[id];
    this.busy++;
    try {
      audio.sfx('journal');
      if (!this.save.journals.includes(id)) this.save.journals.push(id);
      if (j) await notice(j.title, [h('p', { class: 'muted', style: 'font-style:italic' }, `— ${j.author}`), h('div', { class: 'scroll', style: 'max-height:380px;text-align:left;white-space:pre-wrap;font-size:18px;line-height:1.5' }, j.text)], 'Close');
      void this.persist();
    } finally {
      this.busy--;
    }
  }

  async takeBead(id: string): Promise<void> {
    this.save.flags[`got:${id}`] = true;
    const order = ['tincture_heal', 'tincture_spirit', 'tincture_heal', 'tincture_revive'];
    const n = Number(this.save.flags.beads ?? 0);
    const kind = order[n % order.length];
    this.save.flags.beads = n + 1;
    this.save.tinctMax[kind] = (this.save.tinctMax[kind] ?? 0) + 1;
    this.save.tinct[kind] = (this.save.tinct[kind] ?? 0) + 1;
    audio.sfx('unlock');
    this.toast(`Glass Bead: +1 ${ITEMS[kind].name} charge`);
    void this.persist();
  }

  async openWaystitch(o: Extract<SceneObject, { kind: 'waystitch' }>): Promise<void> {
    if (this.net && !this.net.isHost) return;
    this.busy++;
    this.save.way = { scene: this.explore!.spec.id, x: o.x, name: o.name };
    audio.sfx('waystitch');
    await this.tutorialOnce('waystitch');
    try {
      await new Promise<void>((res) => {
        let pop: () => void = () => {};
        const close = (): void => {
          pop();
          res();
        };
        const rest = (): void => {
          restoreParty(this.save);
          this.explore?.roamers.forEach((r) => (r.disabled = 0));
          audio.sfx('heal');
          this.fx.glowPuff(640, 420, '#fff2c8', 16, 300);
          this.toast('Rested. Wounds closed, tinctures refilled. The Frayed stir again.');
          void this.persist();
        };
        const el = h(
          'div',
          { class: 'panel', style: 'left:420px;top:140px;width:440px' },
          h('h2', { class: 'center' }, o.name),
          h('p', { class: 'center muted' }, 'A Waystitch. The thread here is warm.'),
          h(
            'div',
            { class: 'col', style: 'margin-top:12px' },
            btn('Rest', rest, 'btn gold', { 'data-autofocus': '1' }),
            btn('Party', () => void openPartyMenu(this)),
            o.camp ? btn('Make Camp', () => {
              pop();
              void this.openCamp().then(res);
            }) : null,
            flagOn(this.save, 'pro_done') ? btn('Travel', () => {
              pop();
              res();
              void this.openWorldMap(this.explore!.spec.region, { scene: this.explore!.spec.id, x: o.x });
            }) : null,
            btn('Save', () => {
              void this.persist().then(() => toast('Saved.'));
            }),
            btn('Leave', close),
          ),
        );
        pop = pushLayer(el, close);
      });
    } finally {
      this.busy--;
    }
  }

  async openShop(id: string): Promise<void> {
    if (this.net && !this.net.isHost) return;
    this.busy++;
    try {
      await openShopMenu(this, id);
    } finally {
      this.busy--;
    }
  }

  availableBonds(): { who: CharId; id: string; title: string; level: number }[] {
    const s = this.save;
    const out: { who: CharId; id: string; title: string; level: number }[] = [];
    for (const who of s.roster) {
      if (who === 'ash') continue;
      const c = s.chars[who];
      const next = BOND_SCENES.filter((b) => b.who === who && !c.bondSeen.includes(b.id) && b.level === c.bond + 1 && (!b.requires || flagOn(s, b.requires)));
      if (next[0]) out.push({ who, id: next[0].id, title: next[0].title, level: next[0].level });
    }
    return out;
  }

  async openCamp(): Promise<void> {
    if (this.net && !this.net.isHost) return;
    await this.tutorialOnce('camp');
    audio.music('camp');
    restoreParty(this.save);
    for (;;) {
      const bonds = this.availableBonds();
      const pick = await new Promise<{ who: CharId; id: string } | null>((res) => {
        let pop: () => void = () => {};
        const done = (v: { who: CharId; id: string } | null): void => {
          pop();
          res(v);
        };
        const el = h(
          'div',
          { class: 'panel', style: 'left:360px;top:110px;width:560px' },
          h('h2', { class: 'center' }, 'Camp'),
          h('p', { class: 'center muted' }, 'The fire cracks. Someone has put the kettle on. (The party is rested.)'),
          h(
            'div',
            { class: 'col', style: 'margin-top:10px' },
            bonds.length ? bonds.map((b, i) => btn(h('span', {}, `Talk with ${CHARS[b.who].short} `, h('span', { class: 'muted' }, `· ${b.title}`)), () => done({ who: b.who, id: b.id }), 'btn', i === 0 ? { 'data-autofocus': '1' } : {})) : h('p', { class: 'center muted' }, 'Nobody has anything new to say tonight. Travel on and come back.'),
            this.save.songs.length ? btn('Music box', () => {
              const list = this.save.songs;
              const tracks: TrackId[] = ['lullaby', 'hollowmere', 'fields', 'marsh', 'mill', 'cliffs', 'fray', 'spindlehold', 'seam', 'underweave', 'spire'];
              const n = Number(this.save.flags.jukebox ?? 0) % Math.min(tracks.length, list.length + 1);
              this.save.flags.jukebox = n + 1;
              audio.music(tracks[n]);
              toast(`♪ ${tracks[n]}`);
            }) : null,
            btn('Break camp', () => done(null), bonds.length ? 'btn' : 'btn gold'),
          ),
        );
        pop = pushLayer(el, () => done(null));
      });
      if (!pick) break;
      const scene = BOND_SCENES.find((b) => b.id === pick.id)!;
      await this.fade('out', 400);
      await this.fade('in', 400);
      await this.runScript(scene.cmds);
      const c = this.save.chars[pick.who];
      c.bondSeen.push(scene.id);
      c.bond = Math.max(c.bond, scene.level);
      const perks = scene.level === 2 ? 'Their stats grow a little.' : scene.level === 4 ? 'They gain a skill point.' : scene.level === 6 ? 'Your bond is unbreakable.' : '';
      if (scene.level === 4) c.sp += 1;
      if (scene.level === 6) {
        const weave = { corin: 'weave_hearth', wick: 'weave_cradle', maudra: 'weave_vespers', rook: 'weave_highnoon', tess: 'weave_twoblades', orrin: 'weave_measure' }[pick.who as string];
        if (weave && !this.save.weaves.includes(weave)) this.save.weaves.push(weave);
      }
      audio.sfx('level_up');
      await notice(`Bond with ${CHARS[pick.who].short}: ${scene.level}`, h('p', {}, perks || 'Something between you has changed.'));
      audio.music('camp');
      void this.persist();
    }
    if (this.explore) audio.music(this.explore.spec.music);
  }

  async pauseMenu(): Promise<void> {
    this.busy++;
    audio.muffle(true);
    try {
      await openPauseMenu(this);
    } finally {
      audio.muffle(this.explore?.spec.theme === 'underweave_deep');
      this.busy--;
    }
  }

  // ------------------------------------------------------------------ credits and the title

  credits(): Promise<void> {
    audio.music('credits', 2000);
    const lines: [string, string[]][] = [
      ['Relentless Tear', ['A story about what we are given, and what we choose.']],
      ['The Menders', ['Ash Vey', 'Corin Hale', 'Wick', 'Sister Maudra Fell', 'Rook Ardent', 'Tess Quill']],
      ['And', ['Orrin Thale, who measured twice', 'Lio, in her yellow raincoat']],
      ['Made for', ['josephjackman.com/games']],
      ['Everything you saw and heard', ['was drawn and played in code, in your browser.']],
      ['Thank you for playing', ['Corin would want you to eat something green.']],
    ];
    const roll = h('div', { class: 'roll' });
    for (const [head, ps] of lines) {
      roll.append(h('h2', {}, head));
      for (const p of ps) roll.append(h('p', {}, p));
    }
    const el = h('div', { class: 'credits' }, roll);
    const prev = this.mode;
    this.mode = 'credits';
    document.getElementById('ui')!.append(el);
    return new Promise((res) => {
      let y = H;
      const t0 = performance.now();
      const step = (): void => {
        const k = (performance.now() - t0) / 1000;
        y = H - k * 42;
        roll.style.top = `${y}px`;
        const done = y < -roll.offsetHeight - 40 || (k > 3 && (input.down('confirm') || input.down('back')));
        if (done) {
          el.remove();
          this.mode = prev === 'credits' ? 'explore' : prev;
          res();
        } else setTimeout(step, 16);
      };
      step();
    });
  }

  async toTitle(): Promise<void> {
    await this.persist();
    this.closeWorldMap();
    this.explore = null;
    this.battleScr = null;
    this.mode = 'title';
    this.net?.leave();
    this.net = null;
    this.coop?.close();
    this.coop = null;
    audio.ambience('none');
    audio.muffle(false);
    await showTitle(this);
  }

  // ------------------------------------------------------------------ co-op

  startHosting(coop: Coop): void {
    this.coop = coop;
    this.net = new HostSync(this, coop);
  }

  startGuest(coop: Coop): void {
    this.coop = coop;
    this.net = new GuestMirror(this, coop);
  }

  async confirmQuit(): Promise<void> {
    if (await confirmBox('Return to the title?', 'Your progress is saved at your last Waystitch and after every event.', 'Return', 'Stay')) await this.toTitle();
  }

  patchName(id: string): string {
    return PATCH_MAP[id]?.name ?? id;
  }
}

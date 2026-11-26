// Runs story scripts (Cmd lists) against the current scene, the dialogue box and the save.
import { audio } from '../audio';
import { CLASS_MAP } from '../data/classes';
import { ITEMS } from '../data/items';
import type { CharId, Cmd, Cutscene } from '../data/types';
import { addItem, catchUp } from '../game/state';
import type { Game } from '../game/game';
import { tutorial } from '../ui/dom';
import { CUTSCENES } from './index';

/** Weave Art ids used in scripts -> skill ids */
export const WEAVE_ALIAS: Record<string, string> = {
  measure_twice: 'weave_measure',
  hearth_and_needle: 'weave_hearth',
  cats_cradle: 'weave_cradle',
  vespers: 'weave_vespers',
  high_noon_hem: 'weave_highnoon',
  two_blades_one_thread: 'weave_twoblades',
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class Aborted extends Error {}

export async function playCutscene(game: Game, cs: Cutscene): Promise<void> {
  await runCmds(game, cs.cmds);
}

export async function runCmds(game: Game, cmds: Cmd[]): Promise<void> {
  for (const c of cmds) {
    if (game.abortCutscene) throw new Aborted();
    await runCmd(game, c);
  }
}

async function waitMs(game: Game, ms: number): Promise<void> {
  if (game.ff) return sleep(Math.min(ms, 30));
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (game.ff || game.abortCutscene) return;
    await sleep(Math.min(50, end - performance.now()));
  }
}

async function runCmd(game: Game, c: Cmd): Promise<void> {
  const ex = game.explore;
  const s = game.save;
  switch (c.t) {
    case 'say':
    case 'think':
    case 'narrate': {
      const who = c.t === 'narrate' ? 'narrator' : c.who;
      const a = ex?.actor(who);
      if (a) a.talking = true;
      if (game.ff) {
        game.net?.cutLine(who, c.text, c.t === 'narrate' ? undefined : c.e, c.t, c.t === 'say' ? c.name : undefined);
        if (a) a.talking = false;
        return;
      }
      const p = game.dialogue.show(who, c.text, c.t === 'narrate' ? 'neutral' : c.e ?? 'neutral', c.t, c.t === 'say' ? c.name : undefined);
      // stop the mouth moving once the line is fully shown
      const stop = setTimeout(() => {
        if (a) a.talking = false;
      }, Math.min(4000, (c.text.length / Math.max(10, game.dialogue.speed)) * 1000));
      await p;
      clearTimeout(stop);
      if (a) a.talking = false;
      return;
    }
    case 'choice': {
      const i = await game.choose(c.options.map((o) => o.label));
      await runCmds(game, c.options[i]?.cmds ?? []);
      return;
    }
    case 'wait':
      return waitMs(game, c.ms);
    case 'fade':
      return game.fade(c.dir, game.ff ? 30 : c.ms, c.color);
    case 'title':
      if (game.ff) return;
      return game.titleCard(c.text, c.sub, c.ms ?? 3200);
    case 'music':
      audio.music(c.track, c.fadeMs);
      return;
    case 'sfx':
      if (!game.ff) audio.sfx(c.id);
      return;
    case 'shake':
      if (!game.ff) game.fx.shake(c.power, c.ms);
      return;
    case 'flash':
      if (!game.ff) game.fx.flash(c.color, c.ms);
      return;
    case 'grade':
      if (ex) {
        ex.grade.mode = c.mode;
        ex.grade.target = c.mode === 'normal' ? 0 : 1;
        if (c.mode === 'normal') ex.grade.amt = Math.min(ex.grade.amt, 1);
        if (game.ff) ex.grade.amt = ex.grade.target;
      }
      return;
    case 'actor':
      ex?.setActor(c.id, c.x, c.face, c.pose, c.kind, c.hidden);
      return;
    case 'walk': {
      const a = ex?.actor(c.id) ?? ex?.setActor(c.id, ex.lead.x);
      if (!a || !ex) return;
      a.scripted = true;
      a.pose = null;
      if (game.ff) {
        a.x = c.x;
        return;
      }
      a.target = c.x;
      a.speed = c.speed ?? 1;
      if (c.wait !== false) {
        const t0 = performance.now();
        while (a.target != null && performance.now() - t0 < 12000 && !game.ff && !game.abortCutscene) await sleep(30);
        a.x = c.x;
        a.target = null;
      }
      return;
    }
    case 'face': {
      const a = ex?.actor(c.id);
      if (a) a.face = c.dir === 'left' ? -1 : 1;
      return;
    }
    case 'pose': {
      const a = ex?.actor(c.id);
      if (a) {
        a.scripted = true;
        a.pose = c.pose;
        a.animT = 0;
      }
      return;
    }
    case 'emote': {
      const a = ex?.actor(c.id);
      if (a && !game.ff) {
        a.emote = c.emote;
        a.emoteT = 1.6;
        audio.sfx('ui_move', { vol: 0.3, pitch: 1.4 });
      }
      return;
    }
    case 'hide': {
      const a = ex?.actor(c.id);
      if (a) a.hidden = true;
      return;
    }
    case 'camera':
      ex?.cameraTo(c.x, game.ff ? 1 : c.ms ?? 1000);
      if (!game.ff) await waitMs(game, c.ms ?? 1000);
      return;
    case 'vfx':
      if (!game.ff) ex?.addVfx(c.kind, c.x, c.y, c.ms ?? 1200);
      return;
    case 'join': {
      const id = c.who;
      if (!s.roster.includes(id)) s.roster.push(id);
      catchUp(s, id);
      s.chars[id].hpFrac = 1;
      if (!s.active.includes(id)) {
        if (s.active.length < 4) s.active.push(id);
      }
      ex?.syncParty();
      if (!game.ff) game.toast(`${game.charName(id)} joins the party.`);
      return;
    }
    case 'leave': {
      const id = c.who;
      s.roster = s.roster.filter((r) => r !== id);
      s.active = s.active.filter((r) => r !== id);
      for (const r of s.roster) if (s.active.length < 4 && !s.active.includes(r)) s.active.push(r);
      // the actor stays on stage for the rest of the scene, no longer part of the follow line
      const a = ex?.actor(id);
      if (a) a.party = false;
      ex?.syncParty();
      return;
    }
    case 'flag':
      s.flags[c.name] = c.value ?? true;
      return;
    case 'give': {
      if (c.item === 'glim') {
        s.glim += c.n ?? 1;
        return;
      }
      addItem(s, c.item, c.n ?? 1);
      if (c.item.startsWith('o_') && !game.ff) game.toast(`New outfit: ${ITEMS[c.item]?.name ?? c.item}`);
      else if (!game.ff && ITEMS[c.item]?.kind !== 'key') game.toast(`Received ${ITEMS[c.item]?.name ?? c.item}${(c.n ?? 1) > 1 ? ` ×${c.n}` : ''}`);
      else if (!game.ff) game.toast(`Key item: ${ITEMS[c.item]?.name ?? c.item}`);
      if (c.item.startsWith('song_') && !s.songs.includes(c.item)) s.songs.push(c.item);
      return;
    }
    case 'glim':
      s.glim += c.n;
      if (!game.ff) game.toast(`+${c.n} Glim`);
      return;
    case 'battle': {
      const r = await game.battle(c.enc, { loseOk: c.loseOk, noFlee: c.noFlee, fromCutscene: true });
      if (r === 'lost' && c.ifLose) await runCmds(game, c.ifLose);
      return;
    }
    case 'goto':
      await game.gotoScene(c.scene, c.x, true);
      return;
    case 'worldmap':
      game.queueWorldMap(c.at);
      return;
    case 'bond':
      s.flags[`bondpts:${c.who}`] = Number(s.flags[`bondpts:${c.who}`] ?? 0) + c.n;
      return;
    case 'unlock':
      switch (c.kind) {
        case 'class':
          if (CLASS_MAP[c.id] && !game.profile.classes.includes(c.id)) {
            game.profile.classes.push(c.id);
            if (!game.ff) game.toast(`Class unlocked: ${CLASS_MAP[c.id].name}`);
          }
          return;
        case 'region':
          if (!s.regions.includes(c.id)) s.regions.push(c.id);
          return;
        case 'weave': {
          const id = WEAVE_ALIAS[c.id] ?? c.id;
          if (!s.weaves.includes(id)) {
            s.weaves.push(id);
            if (!game.ff) game.toast('A new Weave Art!');
          }
          return;
        }
        case 'outfit':
          addItem(s, c.id, 1);
          return;
        case 'song':
          if (!s.songs.includes(c.id)) s.songs.push(c.id);
          return;
      }
      return;
    case 'if': {
      const v = s.flags[c.flag];
      const ok = c.is === undefined ? !!v : v === c.is || String(v) === String(c.is);
      await runCmds(game, ok ? c.then : c.else ?? []);
      return;
    }
    case 'save':
      await game.persist();
      return;
    case 'chapter':
      s.chapter = c.n;
      s.chapterName = c.name;
      s.flags[`ch${c.n}_start`] = true;
      if (!game.ff) await game.titleCard(c.n === 0 ? 'Prologue' : `Chapter ${c.n}`, c.name, 3400);
      return;
    case 'heal':
      for (const id of s.roster) s.chars[id].hpFrac = 1;
      s.tinct = { ...s.tinctMax };
      return;
    case 'ending': {
      s.flags.route = c.route;
      const cs = CUTSCENES[`end_${c.route}`];
      if (cs) await runCmds(game, cs.cmds);
      return;
    }
    case 'credits':
      game.ff = false;
      await game.credits();
      return;
    case 'tutorial':
      if (!game.ff) await tutorial(c.id, game.tutSeen);
      return;
    case 'shop':
      await game.openShop(c.id);
      return;
    case 'camp':
      await game.openCamp();
      return;
  }
}

export function isCharId(x: string): x is CharId {
  return ['ash', 'corin', 'wick', 'orrin', 'maudra', 'rook', 'tess'].includes(x);
}

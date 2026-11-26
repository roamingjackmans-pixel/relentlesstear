// Title screen, sign-in (email + password, shared with the other games), save slots, new game, co-op lobby.
import { audio } from '../audio';
import { input } from '../core/input';
import { CHARS } from '../data/characters';
import type { CharId } from '../data/types';
import type { Game } from '../game/game';
import { newGamePlus, newSave, type Difficulty, type SaveData } from '../game/state';
import { api, ApiError } from '../net/api';
import { Coop } from '../net/coop';
import { Net } from '../net/socket';
import { drawFigure, figureFor } from '../render/actors';
import { GROUND, W } from '../render/canvas';
import { Backdrop } from '../render/painter';
import { VERSION } from '../version';
import { btn, clearUi, confirmBox, fmtTime, h, notice, pushLayer, toast, uiRoot } from './dom';

let triedResume = false;

function titleBackdrop(g: Game): void {
  const back = new Backdrop('cliffs_wind', { weather: 'threads' });
  let t = 0;
  const ash = figureFor('ash');
  g.titleBg = (ctx, dt) => {
    t += dt;
    const cam = 200 + Math.sin(t * 0.05) * 160;
    back.drawBack(ctx, cam, t);
    back.drawGround(ctx, cam);
    drawFigure(ctx, ash, W * 0.22, GROUND + 4, { anim: 'look_up', t, p: 0, face: 1, walk: 0, flash: 0, alpha: 1, scale: 1.1 });
    back.drawFront(ctx, cam, t, dt);
    ctx.fillStyle = 'rgba(10,6,10,0.25)';
    ctx.fillRect(0, 0, W, 720);
  };
}

export async function showTitle(g: Game): Promise<void> {
  clearUi();
  g.mode = 'title';
  titleBackdrop(g);
  audio.music('title');
  if (!triedResume) {
    triedResume = true;
    const ok = await g.resume();
    if (!ok && !localStorage.getItem('rt.offline')) {
      await signInPanel(g, true);
    }
  }
  mainMenu(g);
}

function mainMenu(g: Game): void {
  clearUi();
  const p = g.profile;
  const last = p.slots[p.lastSlot];
  const menu = h('div', { class: 'title-menu' });
  const el = h(
    'div',
    { class: 'title-screen' },
    h('div', { class: 'logo' }, h('div', { class: 'big' }, 'Relentless', h('span', { class: 'tear' }), 'Tear'), h('div', { class: 'sub' }, 'The world is sewn together. Someone is tearing it open.')),
    menu,
    h('div', { class: 'corner bl' }, g.user ? `Signed in as ${g.user.name}` : 'Playing on this device'),
    h('div', { class: 'corner br' }, `v${VERSION}`),
  );
  if (last) menu.append(btn(h('span', {}, 'Continue ', h('span', { style: 'font-size:15px;opacity:0.75' }, `· ${last.chapterName}`)), () => {
    clearUi();
    void g.play(p.lastSlot, last, false);
  }, 'btn gold', { 'data-autofocus': '1' }));
  menu.append(
    btn(last ? 'Saves' : 'New Game', () => void slotsPanel(g, 'solo'), last ? 'btn' : 'btn gold', last ? {} : { 'data-autofocus': '1' }),
    btn('Play Together', () => void coopPanel(g)),
    btn('Settings', () => void settingsPanel(g)),
    btn(g.user ? 'Account' : 'Sign in', () => void (g.user ? accountPanel(g) : signInPanel(g, false).then(() => mainMenu(g)))),
  );
  pushLayer(el, undefined);
}

// ------------------------------------------------------------------ sign in

export function signInPanel(g: Game, first: boolean): Promise<void> {
  return new Promise((res) => {
    let pop: () => void = () => {};
    let mode: 'in' | 'up' | 'forgot' | 'reset' = 'in';
    const email = h('input', { type: 'email', autocomplete: 'email', placeholder: 'you@example.com', 'data-nav': '1' });
    const pass = h('input', { type: 'password', autocomplete: 'current-password', placeholder: '8+ characters', 'data-nav': '1' });
    const name = h('input', { type: 'text', placeholder: 'What should friends see?', maxLength: 24, 'data-nav': '1' });
    const code = h('input', { type: 'text', inputMode: 'numeric', placeholder: '6-digit code', maxLength: 6, 'data-nav': '1' });
    const err = h('div', { class: 'err' });
    const body = h('div', { class: 'col' });
    for (const inp of [email, pass, name, code]) {
      inp.addEventListener('focus', () => (input.typing = true));
      inp.addEventListener('blur', () => (input.typing = false));
      inp.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') void submit();
        if ((e as KeyboardEvent).key === 'Escape') (inp as HTMLInputElement).blur();
      });
    }
    const done = (): void => {
      input.typing = false;
      pop();
      res();
    };
    const submit = async (): Promise<void> => {
      err.textContent = '';
      try {
        if (mode === 'in') {
          const r = await api.login(email.value, pass.value);
          await g.signedIn(r.token, r.user);
          toast(`Welcome back, ${r.user.name}.`);
          done();
        } else if (mode === 'up') {
          const r = await api.signup(email.value, pass.value, name.value);
          await g.signedIn(r.token, r.user);
          toast(`Welcome, ${r.user.name}. Your saves now follow you.`);
          done();
        } else if (mode === 'forgot') {
          await api.forgot(email.value);
          mode = 'reset';
          draw();
          err.className = 'ok';
          err.textContent = 'If that email has an account, a 6-digit code is on its way (check spam). It lasts 10 minutes.';
        } else {
          const r = await api.reset(email.value, code.value.trim(), pass.value);
          await g.signedIn(r.token, r.user);
          toast('Password changed. You are signed in.');
          done();
        }
      } catch (e) {
        err.className = 'err';
        err.textContent = e instanceof ApiError ? e.message : 'Something went wrong.';
      }
    };
    const field = (label: string, el: HTMLElement): HTMLElement => h('label', { class: 'field' }, label, el);
    const draw = (): void => {
      body.innerHTML = '';
      pass.setAttribute('autocomplete', mode === 'up' || mode === 'reset' ? 'new-password' : 'current-password');
      if (mode === 'in') body.append(field('Email', email), field('Password', pass));
      if (mode === 'up') body.append(field('Email', email), field('Password', pass), field('Name', name));
      if (mode === 'forgot') body.append(h('p', {}, 'Type your account email. We\'ll send a 6-digit code.'), field('Email', email));
      if (mode === 'reset') body.append(field('Email', email), field('Code from the email', code), field('New password', pass));
      body.append(err);
      const extra = [
        h('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' }, btn({ in: 'Sign in', up: 'Create account', forgot: 'Send code', reset: 'Set password' }[mode], () => void submit(), 'btn gold'), mode === 'in' ? h('button', { class: 'link', on: { click: () => {
          mode = 'forgot';
          draw();
        } } }, 'Forgot password?') : h('button', { class: 'link', on: { click: () => {
          mode = 'in';
          draw();
        } } }, 'Back to sign in')),
        mode === 'in' ? h('p', { class: 'center', style: 'margin-top:10px' }, 'New here? ', h('button', { class: 'link', on: { click: () => {
          mode = 'up';
          draw();
        } } }, 'Create an account'), h('br'), h('span', { class: 'muted', style: 'font-size:14px' }, 'One account for Relentless Tear, Shoallhell, Smash Your Bros and Baker\'s Dozen.')) : null,
        first ? h('p', { class: 'center' }, h('button', { class: 'link', on: { click: () => {
          try {
            localStorage.setItem('rt.offline', '1');
          } catch {
            /* ignore */
          }
          g.offline = true;
          done();
        } } }, 'Play on this device without an account')) : null,
      ];
      for (const x of extra) if (x) body.append(x);
      requestAnimationFrame(() => (mode === 'reset' ? code : email).focus());
    };
    draw();
    const el = h('div', { class: 'panel', style: 'left:390px;top:110px;width:500px' }, h('h2', { class: 'center' }, 'Relentless Tear'), h('p', { class: 'center muted' }, 'Sign in to keep your saves in the cloud and play with friends.'), body);
    pop = pushLayer(el, first ? undefined : done, { noFocus: true });
  });
}

function accountPanel(g: Game): void {
  let pop: () => void = () => {};
  const close = (): void => pop();
  const el = h(
    'div',
    { class: 'panel', style: 'left:420px;top:180px;width:440px' },
    h('h2', {}, 'Account'),
    h('p', {}, `Signed in as ${g.user?.name} (${g.user?.email}).`),
    h('p', { class: 'muted' }, 'Your saves, unlocked classes and settings are stored with your account.'),
    h('div', { class: 'row', style: 'margin-top:12px' }, btn('Sign out', () => {
      close();
      void g.signOut().then(() => mainMenu(g));
    }), btn('Back', close, 'btn gold', { 'data-autofocus': '1' })),
  );
  pop = pushLayer(el, close);
}

// ------------------------------------------------------------------ saves

function slotLine(s: SaveData | null, i: number): HTMLElement {
  if (!s) return h('div', { class: 'col' }, h('div', { class: 't' }, `Slot ${i + 1}`), h('div', { class: 'muted' }, 'Empty'));
  const lv = Math.max(...s.roster.map((r) => s.chars[r]?.level ?? 1));
  return h('div', { class: 'col', style: 'gap:2px' }, h('div', { class: 't' }, `${s.chapterName}${s.ng ? `  (NG+${s.ng > 1 ? s.ng : ''})` : ''}`), h('div', {}, `${s.way?.name ?? ''} · Level ${lv} · ${fmtTime(s.playtime)} · ${s.difficulty}`), h('div', { class: 'muted', style: 'font-size:14px' }, s.roster.map((r) => CHARS[r].short).join(', ')));
}

function slotsPanel(g: Game, purpose: 'solo' | 'host'): Promise<number | null> {
  return new Promise((res) => {
    let pop: () => void = () => {};
    const close = (v: number | null): void => {
      pop();
      res(v);
    };
    const list = h('div', { class: 'col' });
    g.profile.slots.forEach((s, i) => {
      list.append(
        h(
          'button',
          {
            class: 'slot',
            'data-nav': '1',
            ...(i === g.profile.lastSlot ? { 'data-autofocus': '1' } : {}),
            on: {
              click: async () => {
                audio.sfx('ui_ok');
                if (s) {
                  const opts = ['Play', 'Start over (new game)'];
                  if (s.flags.game_done) opts.push('New Game+');
                  const which = await choosePanel(`Slot ${i + 1}`, opts);
                  if (which === 0) {
                    if (purpose === 'host') return close(i);
                    close(i);
                    clearUi();
                    void g.play(i, s, false);
                  } else if (which === 1) {
                    if (!(await confirmBox('Start over?', 'This slot\'s story will be replaced by a new game. Classes you unlocked stay.', 'Start over', 'Keep it'))) return;
                    const d = await difficultyPanel();
                    if (!d) return;
                    if (purpose === 'host') {
                      g.profile.slots[i] = newSave(d);
                      return close(i);
                    }
                    close(i);
                    clearUi();
                    void g.play(i, newSave(d), true);
                  } else if (which === 2) {
                    const ng = newGamePlus(s);
                    if (purpose === 'host') {
                      g.profile.slots[i] = ng;
                      return close(i);
                    }
                    close(i);
                    clearUi();
                    void g.play(i, ng, true);
                  }
                } else {
                  const d = await difficultyPanel();
                  if (!d) return;
                  if (purpose === 'host') {
                    g.profile.slots[i] = newSave(d);
                    return close(i);
                  }
                  close(i);
                  clearUi();
                  void g.play(i, newSave(d), true);
                }
              },
            },
          },
          slotLine(s, i),
        ),
      );
    });
    const el = h('div', { class: 'panel', style: 'left:340px;top:90px;width:600px' }, h('h2', {}, purpose === 'host' ? 'Which story will you share?' : 'Saves'), list, h('div', { style: 'text-align:right;margin-top:12px' }, btn('Back', () => close(null))));
    pop = pushLayer(el, () => close(null));
  });
}

function choosePanel(title: string, options: string[]): Promise<number | null> {
  return new Promise((res) => {
    let pop: () => void = () => {};
    const done = (v: number | null): void => {
      pop();
      res(v);
    };
    const el = h('div', { class: 'panel loot' }, h('h2', {}, title), h('div', { class: 'col' }, options.map((o, i) => btn(o, () => done(i), i === 0 ? 'btn gold' : 'btn', i === 0 ? { 'data-autofocus': '1' } : {})), btn('Back', () => done(null))));
    pop = pushLayer(el, () => done(null));
  });
}

function difficultyPanel(): Promise<Difficulty | null> {
  return new Promise((res) => {
    let pop: () => void = () => {};
    const done = (v: Difficulty | null): void => {
      pop();
      res(v);
    };
    const opt = (d: Difficulty, name: string, text: string, focus = false): HTMLElement =>
      h('button', { class: 'slot', 'data-nav': '1', ...(focus ? { 'data-autofocus': '1' } : {}), on: { click: () => {
        audio.sfx('ui_ok');
        done(d);
      } } }, h('div', { class: 'col', style: 'gap:2px' }, h('div', { class: 't' }, name), h('div', {}, text)));
    const el = h(
      'div',
      { class: 'panel', style: 'left:340px;top:120px;width:600px' },
      h('h2', {}, 'How hard should the world push back?'),
      h('div', { class: 'col' }, opt('story', 'Story', 'Wide timing windows, gentle enemies, a timing aid on every blow. For the tale.'), opt('mender', 'Mender', 'The intended challenge. Learn the rhythms, parry, and the hardest fights open up.', true), opt('unthreaded', 'Unthreaded', 'Tight windows and hard hits. For people who parry everything.')),
      h('p', { class: 'muted' }, 'You can change this any time in Settings.'),
      h('div', { style: 'text-align:right' }, btn('Back', () => done(null))),
    );
    pop = pushLayer(el, () => done(null));
  });
}

// ------------------------------------------------------------------ settings (title)

function settingsPanel(g: Game): void {
  let pop: () => void = () => {};
  const close = (): void => {
    pop();
    void g.persist();
  };
  const st = g.settings;
  const slider = (label: string, key: 'master' | 'music' | 'sfx'): HTMLElement =>
    h('label', { class: 'field' }, label, h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(st[key]), 'data-nav': '1', on: { input: (e: Event) => {
      st[key] = Number((e.target as HTMLInputElement).value);
      g.applySettings();
    } } }));
  const el = h('div', { class: 'panel', style: 'left:390px;top:130px;width:500px' }, h('h2', {}, 'Settings'), slider('Master volume', 'master'), slider('Music', 'music'), slider('Effects', 'sfx'), btn(`Graphics: ${st.quality === 'high' ? 'Beautiful' : 'Fast'}`, () => {
    st.quality = st.quality === 'high' ? 'low' : 'high';
    g.applySettings();
    (document.activeElement as HTMLElement).textContent = `Graphics: ${st.quality === 'high' ? 'Beautiful' : 'Fast'}`;
  }, 'btn small'), h('p', { class: 'muted' }, 'More options are in the in-game menu (Esc).'), h('div', { style: 'text-align:right' }, btn('Done', close, 'btn gold')));
  pop = pushLayer(el, close);
}

// ------------------------------------------------------------------ co-op

async function coopPanel(g: Game): Promise<void> {
  if (!g.user) {
    await notice('Sign in first', 'Playing together needs an account, so your friends can find you.');
    await signInPanel(g, false);
    if (!g.user) return;
    mainMenu(g);
  }
  const which = await choosePanel('Play Together', ['Host a game', 'Join with a code']);
  if (which === 0) await hostLobby(g);
  else if (which === 1) await joinLobby(g);
}

async function hostLobby(g: Game): Promise<void> {
  const slot = await slotsPanel(g, 'host');
  if (slot == null) return;
  const save = g.profile.slots[slot]!;
  let net: Net;
  try {
    net = await Net.shared();
  } catch (e) {
    await notice('Can\'t connect', (e as Error).message);
    return;
  }
  let room;
  try {
    room = await net.create();
  } catch (e) {
    await notice('Can\'t open a game', (e as Error).message);
    return;
  }
  const coop = new Coop(net, 'host', g.user!.id, room);
  g.save = save;
  g.slot = slot;
  coop.seats = { [save.active.includes('ash') ? 'ash' : save.active[0]]: g.user!.id };
  g.startHosting(coop);
  let pop: () => void = () => {};
  const seatsEl = h('div', { class: 'col' });
  const draw = (): void => {
    seatsEl.innerHTML = '';
    for (const id of save.active) {
      const who = coop.seats[id];
      const pl = coop.room.players.find((p) => p.userId === who);
      seatsEl.append(
        h('div', { class: 'seat' }, h('span', { class: 'who', style: `color:${CHARS[id].color}` }, CHARS[id].short), h('span', { class: 'grow' }, who ? `${pl?.name ?? 'someone'}${who === g.user!.id ? ' (you)' : ''}` : h('span', { class: 'muted' }, 'AI companion')), btn(who === g.user!.id ? 'Yours' : 'Take', () => {
          for (const [k, v] of Object.entries(coop.seats)) if (v === g.user!.id) delete coop.seats[k as CharId];
          coop.seats[id] = g.user!.id;
          coop.broadcast({ t: 'seats', seats: coop.seats });
          broadcastLobby();
          draw();
        }, 'btn small', { disabled: !!who && who !== g.user!.id })),
      );
    }
    seatsEl.append(h('p', { class: 'muted' }, `${coop.room.players.length} of 4 here. Friends join with the code; seats nobody takes are played by AI.`));
  };
  const broadcastLobby = (): void => coop.broadcast({ t: 'lobby', active: save.active, seats: coop.seats, chapter: save.chapterName });
  const off1 = coop.on('room', () => {
    broadcastLobby();
    draw();
  });
  const off2 = coop.on('claim', () => {
    broadcastLobby();
    draw();
  });
  const off3 = coop.on('hello', () => broadcastLobby());
  draw();
  const el = h(
    'div',
    { class: 'panel', style: 'left:340px;top:70px;width:600px' },
    h('h2', { class: 'center' }, 'Your game'),
    h('p', { class: 'center muted' }, `${save.chapterName} · share this code`),
    h('div', { class: 'code-big' }, room.code),
    seatsEl,
    h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' }, btn('Cancel', () => {
      pop();
      off1();
      off2();
      off3();
      coop.close();
      g.net?.leave();
      g.net = null;
      g.coop = null;
    }), btn('Start', () => {
      pop();
      off1();
      off2();
      off3();
      clearUi();
      void g.play(slot, save, !save.flags['seen:pro_opening']);
    }, 'btn gold', { 'data-autofocus': '1' })),
  );
  pop = pushLayer(el, undefined);
}

async function joinLobby(g: Game): Promise<void> {
  const code = await askCode();
  if (!code) return;
  let net: Net;
  try {
    net = await Net.shared();
  } catch (e) {
    await notice('Can\'t connect', (e as Error).message);
    return;
  }
  let room;
  try {
    room = await net.join(code);
  } catch (e) {
    await notice('Can\'t join', (e as Error).message);
    return;
  }
  const coop = new Coop(net, 'guest', g.user!.id, room);
  let pop: () => void = () => {};
  let active: CharId[] = [];
  const seatsEl = h('div', { class: 'col' }, h('p', { class: 'muted' }, 'Waiting for the host…'));
  const draw = (): void => {
    seatsEl.innerHTML = '';
    for (const id of active) {
      const who = coop.seats[id];
      const pl = coop.room.players.find((p) => p.userId === who);
      seatsEl.append(h('div', { class: 'seat' }, h('span', { class: 'who', style: `color:${CHARS[id].color}` }, CHARS[id].short), h('span', { class: 'grow' }, who ? `${pl?.name ?? 'someone'}${who === g.user!.id ? ' (you)' : ''}` : h('span', { class: 'muted' }, 'AI companion')), btn(who === g.user!.id ? 'Yours' : 'Take', () => coop.toHost({ t: 'claim', char: id }), 'btn small', { disabled: !!who && who !== g.user!.id })));
    }
    if (active.length) seatsEl.append(h('p', { class: 'muted' }, 'Pick who you\'ll play. The host starts the game.'));
  };
  const offs = [
    coop.on('lobby', (m) => {
      active = m.active as CharId[];
      coop.seats = m.seats as typeof coop.seats;
      draw();
    }),
    coop.on('seats', (m) => {
      coop.seats = m.seats as typeof coop.seats;
      draw();
    }),
    coop.on('room', () => draw()),
    coop.on('world', () => {
      for (const o of offs) o();
      pop();
      clearUi();
    }),
    coop.on('closed', () => {
      for (const o of offs) o();
      pop();
    }),
  ];
  g.startGuest(coop);
  const el = h('div', { class: 'panel', style: 'left:340px;top:90px;width:600px' }, h('h2', { class: 'center' }, `Game ${code}`), seatsEl, h('div', { style: 'text-align:right;margin-top:10px' }, btn('Leave', () => {
    for (const o of offs) o();
    pop();
    coop.close();
    g.net?.leave();
    g.net = null;
    g.coop = null;
  })));
  pop = pushLayer(el, undefined);
  coop.toHost({ t: 'hello' });
}

function askCode(): Promise<string | null> {
  return new Promise((res) => {
    let pop: () => void = () => {};
    const inp = h('input', { type: 'text', inputMode: 'numeric', maxLength: 6, placeholder: '1234', style: 'font-size:34px;text-align:center;letter-spacing:0.3em' });
    inp.addEventListener('focus', () => (input.typing = true));
    inp.addEventListener('blur', () => (input.typing = false));
    const done = (v: string | null): void => {
      input.typing = false;
      pop();
      res(v);
    };
    inp.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') done(inp.value.trim());
    });
    const el = h('div', { class: 'panel loot' }, h('h2', {}, 'Join a game'), h('p', {}, 'Type the code your host sees.'), h('label', { class: 'field' }, inp), h('div', { class: 'row', style: 'justify-content:center' }, btn('Join', () => done(inp.value.trim()), 'btn gold'), btn('Back', () => done(null))));
    pop = pushLayer(el, () => done(null), { noFocus: true });
    requestAnimationFrame(() => inp.focus());
  });
}

export { uiRoot };

// DOM helpers for the UI layer, plus keyboard/gamepad navigation of whatever panel is on top.
import { audio } from '../audio';
import { input } from '../core/input';

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string; on?: Record<string, (e: Event) => void> };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k === 'html') el.innerHTML = String(v);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  const add = (c: Child): void => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

export function btn(label: Child, onClick: () => void, cls = 'btn', extra: Attrs = {}): HTMLButtonElement {
  return h('button', {
    class: cls,
    'data-nav': '1',
    ...extra,
    on: {
      click: (e: Event) => {
        e.stopPropagation();
        if ((e.currentTarget as HTMLButtonElement).disabled) return;
        audio.sfx('ui_ok');
        onClick();
      },
      ...(extra.on ?? {}),
    },
  }, label);
}

let root: HTMLElement;
export function uiRoot(): HTMLElement {
  return (root ??= document.getElementById('ui')!);
}

/** A stack of open panels. The top one gets keyboard/gamepad navigation and Back. */
interface Layer {
  el: HTMLElement;
  onBack?: () => void;
  grid?: boolean;
}
const stack: Layer[] = [];

export function pushLayer(el: HTMLElement, onBack?: () => void, o: { grid?: boolean; noFocus?: boolean } = {}): () => void {
  uiRoot().append(el);
  const layer: Layer = { el, onBack, grid: o.grid };
  stack.push(layer);
  if (!o.noFocus) requestAnimationFrame(() => focusFirst(el));
  return () => popLayer(el);
}

export function popLayer(el: HTMLElement): void {
  const i = stack.findIndex((l) => l.el === el);
  if (i >= 0) stack.splice(i, 1);
  el.remove();
  const top = stack[stack.length - 1];
  if (top && !top.el.contains(document.activeElement)) focusFirst(top.el);
}

export function topLayer(): HTMLElement | null {
  return stack[stack.length - 1]?.el ?? null;
}
export function layerCount(): number {
  return stack.length;
}

function navItems(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('[data-nav]')].filter((b) => !(b as HTMLButtonElement).disabled && b.offsetParent !== null);
}

export function focusFirst(el: HTMLElement): void {
  const pref = el.querySelector<HTMLElement>('[data-autofocus]');
  const items = navItems(el);
  (pref && !(pref as HTMLButtonElement).disabled ? pref : items[0])?.focus({ preventScroll: false });
}

/** Called every frame: arrows move focus spatially, confirm clicks, back closes. Returns true if UI ate input. */
export function navigate(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  if (input.typing) return true;
  const items = navItems(top.el);
  const cur = document.activeElement as HTMLElement | null;
  const dirs: [string, number, number][] = [
    ['up', 0, -1],
    ['down', 0, 1],
    ['left', -1, 0],
    ['right', 1, 0],
  ];
  for (const [a, dx, dy] of dirs) {
    if (!input.pressed(a as 'up')) continue;
    if (cur && cur.tagName === 'INPUT' && (cur as HTMLInputElement).type === 'range' && dx) {
      const r = cur as HTMLInputElement;
      r.value = String(Number(r.value) + dx * Number(r.step || 1));
      r.dispatchEvent(new Event('input'));
      return true;
    }
    if (!items.length) return true;
    if (!cur || !items.includes(cur)) {
      items[0].focus();
      audio.sfx('ui_move');
      return true;
    }
    const cr = cur.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    let best: HTMLElement | null = null;
    let bd = Infinity;
    for (const it of items) {
      if (it === cur) continue;
      const r = it.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx;
      const y = r.top + r.height / 2 - cy;
      const along = x * dx + y * dy;
      if (along <= 2) continue;
      const across = Math.abs(x * dy) + Math.abs(y * dx);
      const d = along + across * 2.2;
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    if (!best && dy) {
      // wrap vertically in simple lists
      const idx = items.indexOf(cur);
      best = items[(idx + (dy > 0 ? 1 : items.length - 1)) % items.length];
    }
    if (best) {
      best.focus();
      best.scrollIntoView({ block: 'nearest' });
      audio.sfx('ui_move');
    }
    return true;
  }
  if (input.pressed('confirm') && cur && items.includes(cur) && !(cur.tagName === 'INPUT')) {
    input.eat('confirm');
    cur.click();
    return true;
  }
  if (input.pressed('back') && top.onBack) {
    input.eat('back');
    audio.sfx('ui_back');
    top.onBack();
    return true;
  }
  return true;
}

export function toast(text: string): void {
  const el = h('div', { class: 'toast passive' }, text);
  uiRoot().append(el);
  setTimeout(() => el.remove(), 3300);
}

/** Small parchment popup with a message and OK. Resolves when closed. */
export function notice(title: string, body: Child, okLabel = 'OK', dark = false): Promise<void> {
  return new Promise((res) => {
    const close = (): void => {
      pop();
      res();
    };
    const el = h('div', { class: `panel loot ${dark ? 'dark' : ''}` }, h('h2', {}, title), h('div', { class: 'col' }, body), h('div', { style: 'margin-top:14px' }, btn(okLabel, close, 'btn gold', { 'data-autofocus': '1' })));
    const pop = pushLayer(el, close);
  });
}

export function confirmBox(title: string, body: string, yes = 'Yes', no = 'No'): Promise<boolean> {
  return new Promise((res) => {
    let pop: () => void = () => {};
    const done = (v: boolean): void => {
      pop();
      res(v);
    };
    const el = h('div', { class: 'panel loot' }, h('h2', {}, title), h('p', {}, body), h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' }, btn(yes, () => done(true), 'btn gold', { 'data-autofocus': '1' }), btn(no, () => done(false))));
    pop = pushLayer(el, () => done(false));
  });
}

const TUTS: Record<string, [string, string, string?]> = {
  move: ['Walking the Hem', 'Move with A/D or the arrows. Hold Shift to run. Press E (or W) to talk, open and rest.', '<kbd>A</kbd><kbd>D</kbd> move · <kbd>E</kbd> interact · <kbd>Esc</kbd> menu'],
  battle_basics: ['Turns and AP', 'Each companion acts in turn order (top of the screen). Attack is free and gives +1 AP; Skills cost AP. You also gain 1 AP at the start of each turn. Up to 9.', 'Choose with the arrows or mouse; confirm with <kbd>Space</kbd>.'],
  defense: ['Dodge, Parry, Jump', 'When an enemy attacks you, press Dodge just before each blow lands. Parry has a tighter window but gives +1 AP, and parrying every hit triggers a Counter. Ground waves (red at your feet) must be Jumped. Purple attacks can only be dodged.', '<kbd>Shift</kbd> dodge · <kbd>Space</kbd> parry · <kbd>W</kbd> jump'],
  timing: ['Timed strikes', 'Every attack and skill has timing marks: press Action when the closing ring meets the stitch. Perfect timing hits 30% harder (and sews extra Stitches for Ash). Some skills ask you to hold and release in the bright zone; hymns send arrows to press in rhythm.', '<kbd>Space</kbd> / click on the beat'],
  aim: ['Free Aim', 'Aim lets you shoot: each shot costs 1 AP and does not end your turn. Glowing weak points take double damage, crack armor and fill the Break bar faster.', 'Move the sight with the mouse or arrows · <kbd>Space</kbd> fire · <kbd>Esc</kbd> stop aiming'],
  skills: ['Skills and the tree', 'Each level gives a skill point and three attribute points. Learn skills in the party menu; up to six can be equipped at once.', '<kbd>Esc</kbd> → Party → Skills'],
  waystitch: ['Waystitches', 'Rest at a Waystitch to heal fully and refill your tinctures. Resting also brings roaming enemies back. It is also where you spend points, change gear, and travel.', ''],
  patches: ['Patches and Embroideries', 'Sew up to three Patches onto each companion. Win four battles wearing a Patch and its power is learned as an Embroidery: anyone can sew it on with Thread Points.', ''],
  classes: ['Classes', 'Tasks unlock Classes (parry 30 hits for Duelist, and so on). Anyone can wear one: it changes stats, adds a passive and adds skills as its rank grows. Your Tasks count across all your saves, and in friends\' games.', '<kbd>Esc</kbd> → Party → Class'],
  weave: ['Weave Arts', 'Perfect timing, parries and breaks fill the Weave gauge. When Ash and a companion share a deep enough bond, spend it on a duo Weave Art from Ash\'s or their turn.', ''],
  camp: ['Camp', 'At Waystitches marked with a fire you can make camp and talk with your companions. Bonds grow stats, teach skills and unlock Weave Arts.', ''],
  worldmap: ['The world map', 'The Hem is a quilt of lands sewn together. Choose where to go next; new patches appear as the story moves.', ''],
};

export function tutorial(id: string, seen: Set<string>): Promise<void> {
  const t = TUTS[id];
  if (!t || seen.has(id)) return Promise.resolve();
  seen.add(id);
  return new Promise((res) => {
    const close = (): void => {
      pop();
      res();
    };
    const el = h('div', { class: 'panel tut' }, h('h3', {}, t[0]), h('p', {}, t[1]), t[2] ? h('div', { class: 'keys', html: t[2] }) : null, h('div', { style: 'text-align:right;margin-top:10px' }, btn('Got it', close, 'btn small gold', { 'data-autofocus': '1' })));
    const pop = pushLayer(el, close);
  });
}

export function clearUi(): void {
  while (stack.length) stack.pop()!.el.remove();
  uiRoot().innerHTML = '';
}

export function fmtTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

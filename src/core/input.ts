// Action-based input from keyboard, mouse, gamepad and touch buttons. Timing-critical code (timed inputs, parries)
// reads `pressAt(action)`: the performance.now() time of the press, taken from the event itself, not the frame.

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'confirm'
  | 'back'
  | 'menu'
  | 'parry'
  | 'dodge'
  | 'jump'
  | 'strike'
  | 'interact'
  | 'run'
  | 'map'
  | 'tabL'
  | 'tabR'
  | 'aim';

export type Device = 'keyboard' | 'gamepad' | 'touch';

const KEYS: Record<string, Action[]> = {
  ArrowLeft: ['left'],
  KeyA: ['left'],
  ArrowRight: ['right'],
  KeyD: ['right'],
  ArrowUp: ['up', 'jump', 'interact'],
  KeyW: ['up', 'jump', 'interact'],
  ArrowDown: ['down'],
  KeyS: ['down'],
  Enter: ['confirm', 'interact'],
  NumpadEnter: ['confirm', 'interact'],
  Space: ['confirm', 'parry'],
  KeyZ: ['confirm', 'strike'],
  KeyJ: ['strike', 'parry'],
  KeyF: ['parry'],
  KeyK: ['parry'],
  KeyE: ['interact', 'confirm'],
  ShiftLeft: ['dodge', 'run'],
  ShiftRight: ['dodge', 'run'],
  KeyQ: ['dodge', 'tabL'],
  KeyL: ['dodge'],
  KeyX: ['back'],
  Backspace: ['back'],
  Escape: ['back', 'menu'],
  Tab: ['menu'],
  KeyM: ['map'],
  KeyR: ['tabR', 'aim'],
};

// standard gamepad mapping
const PAD: Record<number, Action[]> = {
  0: ['confirm', 'parry', 'interact', 'strike'], // A
  1: ['back', 'dodge'], // B
  2: ['strike', 'aim'], // X
  3: ['jump'], // Y
  4: ['tabL', 'dodge'], // LB
  5: ['tabR', 'parry'], // RB
  6: ['run'], // LT
  9: ['menu'], // Start
  8: ['map'], // Select
  12: ['up', 'interact'],
  13: ['down'],
  14: ['left'],
  15: ['right'],
};

interface State {
  down: number; // how many sources hold it
  pressedFrame: boolean;
  releasedFrame: boolean;
  at: number; // last press time
  relAt: number;
}

class Input {
  private st = new Map<Action, State>();
  private keysDown = new Set<string>();
  private padPrev: boolean[] = [];
  private padAxisPrev = { x: 0, y: 0 };
  /** phones and tablets (a coarse pointer and no fine one) show touch prompts from the first screen */
  device: Device =
    typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches ? 'touch' : 'keyboard';
  mouse = { x: 0, y: 0, down: false, clicked: false, clickAt: 0, rightClicked: false, moved: false, wheel: 0 };
  /** logical canvas size and the element's client rect, for converting mouse coordinates */
  private view = { w: 1280, h: 720, el: null as HTMLElement | null };
  stick = { x: 0, y: 0, rx: 0, ry: 0 };
  /** set while a text field has focus: game keys are ignored */
  typing = false;
  private listeners: ((a: Action) => void)[] = [];

  private s(a: Action): State {
    let v = this.st.get(a);
    if (!v) {
      v = { down: 0, pressedFrame: false, releasedFrame: false, at: -1e9, relAt: -1e9 };
      this.st.set(a, v);
    }
    return v;
  }

  press(a: Action, at = performance.now()): void {
    const v = this.s(a);
    if (v.down === 0) {
      v.pressedFrame = true;
      v.at = at;
      for (const l of this.listeners) l(a);
    }
    v.down++;
  }

  release(a: Action, at = performance.now()): void {
    const v = this.s(a);
    if (v.down > 0) {
      v.down--;
      if (v.down === 0) {
        v.releasedFrame = true;
        v.relAt = at;
      }
    }
  }

  /** a one-shot press from a touch button or test */
  tap(a: Action): void {
    this.press(a);
    const v = this.s(a);
    setTimeout(() => this.release(a), 60);
    v.at = performance.now();
  }

  onPress(fn: (a: Action) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  down(a: Action): boolean {
    return (this.st.get(a)?.down ?? 0) > 0;
  }
  pressed(a: Action): boolean {
    return this.st.get(a)?.pressedFrame ?? false;
  }
  released(a: Action): boolean {
    return this.st.get(a)?.releasedFrame ?? false;
  }
  pressAt(a: Action): number {
    return this.st.get(a)?.at ?? -1e9;
  }
  releaseAt(a: Action): number {
    return this.st.get(a)?.relAt ?? -1e9;
  }
  /** consume an edge so two systems don't both react to one press */
  eat(a: Action): void {
    const v = this.st.get(a);
    if (v) v.pressedFrame = false;
  }
  eatAll(): void {
    for (const v of this.st.values()) v.pressedFrame = false;
    this.mouse.clicked = false;
    this.mouse.rightClicked = false;
  }

  attach(el: HTMLElement, w: number, h: number): void {
    this.view = { w, h, el };
    // only text entry swallows game keys (a range slider or a button must not)
    const isField = (t: EventTarget | null): boolean => {
      const e = t as HTMLElement | null;
      if (!e) return false;
      if (e.tagName === 'INPUT') return !['range', 'checkbox', 'radio', 'button', 'submit'].includes((e as HTMLInputElement).type);
      return e.tagName === 'TEXTAREA' || e.isContentEditable;
    };
    window.addEventListener('keydown', (e) => {
      if (isField(e.target)) return;
      const acts = KEYS[e.code];
      if (!acts) return;
      // Space/Enter would also click the focused button natively; the UI layer clicks it itself (once)
      if (e.code === 'Tab' || e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code.startsWith('Arrow') || e.code === 'Backspace') e.preventDefault();
      this.device = 'keyboard';
      if (e.repeat || this.keysDown.has(e.code)) return;
      this.keysDown.add(e.code);
      const at = e.timeStamp > 0 ? e.timeStamp : performance.now();
      for (const a of acts) this.press(a, at);
    });
    window.addEventListener('keyup', (e) => {
      if (!this.keysDown.has(e.code)) return;
      this.keysDown.delete(e.code);
      const acts = KEYS[e.code];
      const at = e.timeStamp > 0 ? e.timeStamp : performance.now();
      if (acts) for (const a of acts) this.release(a, at);
    });
    window.addEventListener('blur', () => {
      for (const code of this.keysDown) for (const a of KEYS[code] ?? []) this.release(a);
      this.keysDown.clear();
    });
    const toLogical = (cx: number, cy: number): void => {
      const r = el.getBoundingClientRect();
      this.mouse.x = ((cx - r.left) / r.width) * this.view.w;
      this.mouse.y = ((cy - r.top) / r.height) * this.view.h;
    };
    el.addEventListener('pointermove', (e) => {
      toLogical(e.clientX, e.clientY);
      this.mouse.moved = true;
    });
    el.addEventListener('pointerdown', (e) => {
      toLogical(e.clientX, e.clientY);
      const tgt = e.target as HTMLElement | null;
      if (tgt && tgt.id !== 'ui' && tgt.closest?.('#ui')) {
        if (e.pointerType === 'touch') this.device = 'touch';
        return; // a button or panel took this click
      }
      if (e.pointerType === 'touch') this.device = 'touch';
      else if (this.device === 'touch') this.device = 'keyboard';
      if (e.button === 2) {
        this.mouse.rightClicked = true;
        this.press('dodge', e.timeStamp || performance.now());
        return;
      }
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.mouse.clickAt = e.timeStamp || performance.now();
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 2) this.release('dodge');
      this.mouse.down = false;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener(
      'wheel',
      (e) => {
        this.mouse.wheel += Math.sign(e.deltaY);
      },
      { passive: true },
    );
  }

  /** poll gamepads; call once per frame before game logic */
  poll(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    if (!pad) return;
    const at = performance.now();
    pad.buttons.forEach((b, i) => {
      const was = this.padPrev[i] ?? false;
      const now = b.pressed;
      if (now !== was) {
        this.device = 'gamepad';
        for (const a of PAD[i] ?? []) (now ? this.press(a, at) : this.release(a, at));
      }
      this.padPrev[i] = now;
    });
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    this.stick.x = Math.abs(ax) > 0.25 ? ax : 0;
    this.stick.y = Math.abs(ay) > 0.25 ? ay : 0;
    this.stick.rx = Math.abs(pad.axes[2] ?? 0) > 0.2 ? pad.axes[2] : 0;
    this.stick.ry = Math.abs(pad.axes[3] ?? 0) > 0.2 ? pad.axes[3] : 0;
    const dir = (v: number, prev: number, neg: Action, pos: Action): void => {
      const n = v < -0.5 ? -1 : v > 0.5 ? 1 : 0;
      const p = prev < -0.5 ? -1 : prev > 0.5 ? 1 : 0;
      if (n === p) return;
      if (p === -1) this.release(neg, at);
      if (p === 1) this.release(pos, at);
      if (n === -1) this.press(neg, at);
      if (n === 1) this.press(pos, at);
      this.device = 'gamepad';
    };
    dir(ax, this.padAxisPrev.x, 'left', 'right');
    dir(ay, this.padAxisPrev.y, 'up', 'down');
    this.padAxisPrev = { x: ax, y: ay };
  }

  /** clear per-frame edges; call at the end of each frame */
  endFrame(): void {
    for (const v of this.st.values()) {
      v.pressedFrame = false;
      v.releasedFrame = false;
    }
    this.mouse.clicked = false;
    this.mouse.rightClicked = false;
    this.mouse.moved = false;
    this.mouse.wheel = 0;
  }

  /** horizontal movement intent -1..1 */
  axisX(): number {
    if (this.stick.x) return this.stick.x;
    return (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
  }
}

export const input = new Input();

/** Button glyphs for prompts, by device. */
export function glyph(a: 'confirm' | 'back' | 'parry' | 'dodge' | 'jump' | 'strike' | 'interact' | 'menu' | 'aim'): string {
  const d = input.device;
  if (d === 'gamepad') return { confirm: 'A', back: 'B', parry: 'RB', dodge: 'B', jump: 'Y', strike: 'X', interact: 'A', menu: 'Start', aim: 'X' }[a];
  if (d === 'touch') return { confirm: 'Tap', back: 'Back', parry: 'Parry', dodge: 'Dodge', jump: 'Jump', strike: 'Strike', interact: 'Tap', menu: 'Menu', aim: 'Aim' }[a];
  return { confirm: 'Space', back: 'Esc', parry: 'Space', dodge: 'Shift', jump: 'W', strike: 'Z', interact: 'E', menu: 'Esc', aim: 'R' }[a];
}

// On-screen controls for phones and tablets while exploring: a left/right pad and Interact / Strike / Menu / Map.
// Battles have their own touch buttons (Dodge, Parry, Jump) and tap targets.
import { input, type Action } from '../core/input';
import { h, uiRoot } from './dom';

let pad: HTMLElement | null = null;

function hold(label: string, a: Action, title: string): HTMLButtonElement {
  const release = (): void => input.release(a);
  return h(
    'button',
    {
      title,
      'aria-label': title,
      on: {
        pointerdown: (e: Event) => {
          e.preventDefault();
          input.press(a, (e as PointerEvent).timeStamp || performance.now());
        },
        pointerup: release,
        pointerleave: release,
        pointercancel: release,
        contextmenu: (e: Event) => e.preventDefault(),
      },
    },
    label,
  );
}

function tapBtn(label: string, a: Action, title: string): HTMLButtonElement {
  return h('button', { title, 'aria-label': title, on: { pointerdown: (e: Event) => {
    e.preventDefault();
    input.tap(a);
  } } }, label);
}

/** Show the pad only on touch devices, only while walking around. Cheap to call every frame. */
export function updateTouchPad(show: boolean): void {
  const want = show && input.device === 'touch';
  if (want && !pad) {
    pad = h(
      'div',
      { class: 'touch-wrap' },
      h('div', { class: 'touch-pad left' }, hold('◀', 'left', 'Walk left'), hold('▶', 'right', 'Walk right')),
      h('div', { class: 'touch-pad right' }, tapBtn('✋', 'interact', 'Talk, open, rest'), tapBtn('⚔', 'strike', 'Strike first'), tapBtn('☰', 'menu', 'Menu'), tapBtn('🗺', 'map', 'Map')),
    );
    uiRoot().append(pad);
  }
  if (pad) pad.style.display = want ? '' : 'none';
  if (!want) {
    // never leave a direction held when the pad hides
    if (input.down('left') && pad) input.release('left');
    if (input.down('right') && pad) input.release('right');
  }
}

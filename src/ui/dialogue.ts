// The dialogue box: portrait, name, typewriter text, choices. Advance with Action/click.
import { audio } from '../audio';
import { input } from '../core/input';
import { CHARS } from '../data/characters';
import type { CharId, Expr, NpcDef } from '../data/types';
import { NPCS } from '../story';
import { figureFor, npcFigure, portrait, type Figure } from '../render/actors';
import { ctx2d, makeCanvas } from '../render/canvas';
import { drawBobbin } from '../render/enemyArt';
import { btn, h, pushLayer, uiRoot } from './dom';

export function resolveNpc(id: string): NpcDef | undefined {
  if (NPCS[id]) return NPCS[id];
  const all = Object.values(NPCS);
  return all.find((n) => n.id.endsWith(`_${id}`) || n.id.startsWith(`${id}_`)) ?? all.find((n) => n.id.includes(id));
}

export interface SpeakerInfo {
  name: string;
  fig: Figure | null;
  bobbin: boolean;
  palette?: string[];
  ghost?: boolean;
}

export function speaker(who: string, nameOverride?: string): SpeakerInfo {
  if ((CHARS as Record<string, unknown>)[who]) {
    const id = who as CharId;
    return { name: nameOverride ?? CHARS[id].short, fig: figureFor(id), bobbin: false };
  }
  if (who === 'narrator') return { name: '', fig: null, bobbin: false };
  const npc = resolveNpc(who);
  if (npc) {
    if (npc.kind === 'bobbin') return { name: nameOverride ?? npc.name, fig: null, bobbin: true, palette: npc.palette };
    const echoOf = npc.id === 'corin_echo' ? 'corin' : undefined;
    return { name: nameOverride ?? npc.name, fig: npcFigure(npc.kind, npc.palette, npc.id, echoOf as CharId | undefined), bobbin: false, ghost: npc.kind === 'ghost' };
  }
  const nice = (nameOverride ?? who).replace(/^b_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { name: nice, fig: null, bobbin: false };
}

const bobbinCache = new Map<string, HTMLCanvasElement>();
function bobbinPortrait(palette?: string[]): HTMLCanvasElement {
  const key = (palette ?? []).join(',');
  let c = bobbinCache.get(key);
  if (c) return c;
  c = makeCanvas(220, 240);
  const g = ctx2d(c);
  drawBobbin(g, 110, 250, 3.1, { t: 0.5, face: 1, palette });
  bobbinCache.set(key, c);
  return c;
}

export class Dialogue {
  private el: HTMLElement | null = null;
  private resolveFn: (() => void) | null = null;
  private full = '';
  private shown = 0;
  private typing = false;
  private lastT = 0;
  speed = 55;
  auto = false;
  private autoAt = 0;
  /** co-op: guests watch but cannot advance */
  locked = false;
  onLine: ((who: string, text: string, expr: Expr | undefined, mode: string, name?: string) => void) | null = null;

  show(who: string, text: string, expr: Expr = 'neutral', mode: 'say' | 'narrate' | 'think' = 'say', nameOverride?: string): Promise<void> {
    this.close();
    this.onLine?.(who, text, expr, mode, nameOverride);
    const info = mode === 'narrate' ? { name: '', fig: null, bobbin: false } : speaker(who, nameOverride);
    const port = h('div', { class: `portrait ${info.fig || info.bobbin ? '' : 'none'}` });
    if (info.fig) {
      const c = portrait(info.fig, expr);
      const view = makeCanvas(150, 164);
      ctx2d(view).drawImage(c, 0, 0, 150, 164);
      if (info.ghost) view.style.opacity = '0.75';
      port.append(view);
    } else if (info.bobbin) {
      const view = makeCanvas(150, 164);
      ctx2d(view).drawImage(bobbinPortrait(info.palette), 0, 0, 150, 164);
      port.append(view);
    }
    const textEl = h('div', { class: 'text' });
    const more = h('div', { class: 'more' }, this.locked ? '' : '▼');
    this.el = h(
      'div',
      { class: `dlg ${mode === 'narrate' ? 'narrate' : mode === 'think' ? 'think' : ''}`, on: { click: () => this.advance() } },
      mode !== 'narrate' ? port : null,
      h('div', { class: 'body' }, info.name ? h('div', { class: 'name' }, info.name) : null, textEl),
      more,
    );
    uiRoot().append(this.el);
    this.full = mode === 'think' ? `(${text})` : text;
    this.shown = 0;
    this.typing = this.speed > 0;
    this.lastT = performance.now();
    if (!this.typing) {
      textEl.textContent = this.full;
      this.autoAt = performance.now() + 900 + this.full.length * 35;
    }
    return new Promise((res) => {
      this.resolveFn = res;
    });
  }

  /** per frame */
  update(): void {
    if (!this.el) return;
    const textEl = this.el.querySelector('.text') as HTMLElement;
    if (this.typing) {
      const now = performance.now();
      const n = Math.floor(((now - this.lastT) / 1000) * this.speed);
      if (n > 0) {
        const prev = this.shown;
        this.shown = Math.min(this.full.length, this.shown + n);
        this.lastT = now;
        textEl.textContent = this.full.slice(0, this.shown);
        if (Math.floor(prev / 3) !== Math.floor(this.shown / 3) && /\w/.test(this.full[this.shown - 1] ?? '')) audio.sfx('ui_move', { vol: 0.12, pitch: 1.6 + Math.random() * 0.3 });
        if (this.shown >= this.full.length) {
          this.typing = false;
          this.autoAt = now + 900 + this.full.length * 35;
        }
      }
    } else if (this.auto && !this.locked && performance.now() > this.autoAt) this.advance();
    if (!this.locked && (input.pressed('confirm') || input.pressed('interact'))) {
      input.eat('confirm');
      input.eat('interact');
      this.advance();
    }
  }

  advance(): void {
    if (!this.el || this.locked) return;
    if (this.typing) {
      this.typing = false;
      this.shown = this.full.length;
      (this.el.querySelector('.text') as HTMLElement).textContent = this.full;
      this.autoAt = performance.now() + 1200;
      return;
    }
    this.finish();
  }

  /** advance from the network (guest following the host) */
  finish(): void {
    const r = this.resolveFn;
    this.resolveFn = null;
    this.close();
    r?.();
  }

  close(): void {
    this.el?.remove();
    this.el = null;
  }

  get open(): boolean {
    return !!this.el;
  }

  choose(options: string[], locked = false): Promise<number> {
    return new Promise((res) => {
      let pop: () => void = () => {};
      const box = h('div', { class: 'choices' });
      options.forEach((o, i) =>
        box.append(
          btn(
            o,
            () => {
              if (locked) return;
              pop();
              res(i);
            },
            'btn',
            i === 0 ? { 'data-autofocus': '1' } : {},
          ),
        ),
      );
      pop = pushLayer(box, undefined);
      this.pendingChoice = (i: number) => {
        pop();
        res(i);
      };
    });
  }
  pendingChoice: ((i: number) => void) | null = null;
}

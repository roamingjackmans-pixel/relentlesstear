// The world map: the Hem as a patchwork quilt, regions sewn together by gold seams. Pick where to go.
import { audio } from '../audio';
import { glyph, input } from '../core/input';
import { hashStr, rgba, rng, shade } from '../core/util';
import type { RegionSpec } from '../data/types';
import { flagOn } from '../game/state';
import type { Game } from '../game/game';
import { applyGrain, ctx2d, drawGlow, H, makeCanvas, W } from '../render/canvas';
import { THEMES } from '../render/themes';
import { REGION_LIST, SCENES } from '../world';

const MAP = { x: 90, y: 70, w: 1100, h: 560 };

export class WorldMap {
  private game: Game;
  private sel: string;
  private at: string;
  private back?: { scene: string; x: number };
  private base: HTMLCanvasElement;
  private t = 0;
  private shapes = new Map<string, [number, number][]>();

  constructor(game: Game, at: string, back?: { scene: string; x: number }) {
    this.game = game;
    this.at = REGION_LIST.some((r) => r.id === at) ? at : 'hollowmere';
    this.sel = this.at;
    this.back = back;
    for (const r of REGION_LIST) {
      const R = rng(hashStr(r.id));
      const pts: [number, number][] = [];
      const n = 9;
      const rad = r.optional ? 58 : 78;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + R() * 0.3;
        const rr = rad * (0.75 + R() * 0.4);
        pts.push([Math.cos(a) * rr * 1.25, Math.sin(a) * rr * 0.85]);
      }
      this.shapes.set(r.id, pts);
    }
    this.base = this.paintBase();
  }

  private pos(r: RegionSpec): [number, number] {
    return [MAP.x + r.mx * MAP.w, MAP.y + r.my * MAP.h];
  }

  open(r: RegionSpec): boolean {
    const s = this.game.save;
    return r.id === 'hollowmere' || s.regions.includes(r.id) || (!!r.requires && flagOn(s, r.requires));
  }

  private paintBase(): HTMLCanvasElement {
    const c = makeCanvas(W, H);
    const g = ctx2d(c);
    // quilted cloth background
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#3a2a26');
    bg.addColorStop(1, '#1e1416');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.save();
    g.fillStyle = '#e8d6b0';
    g.beginPath();
    g.roundRect(MAP.x - 30, MAP.y - 30, MAP.w + 60, MAP.h + 60, 24);
    g.fill();
    g.strokeStyle = 'rgba(160,110,40,0.8)';
    g.setLineDash([10, 7]);
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(MAP.x - 18, MAP.y - 18, MAP.w + 36, MAP.h + 36, 18);
    g.stroke();
    g.setLineDash([]);
    // faint quilt grid
    g.strokeStyle = 'rgba(120,80,40,0.12)';
    g.lineWidth = 1;
    for (let x = MAP.x; x < MAP.x + MAP.w; x += 60) {
      g.beginPath();
      g.moveTo(x, MAP.y - 10);
      g.lineTo(x, MAP.y + MAP.h + 10);
      g.stroke();
    }
    for (let y = MAP.y; y < MAP.y + MAP.h; y += 60) {
      g.beginPath();
      g.moveTo(MAP.x - 10, y);
      g.lineTo(MAP.x + MAP.w + 10, y);
      g.stroke();
    }
    g.restore();
    // seams between linked regions
    for (const r of REGION_LIST) {
      if (!this.open(r)) continue;
      const [x1, y1] = this.pos(r);
      for (const l of r.links) {
        const o = REGION_LIST.find((q) => q.id === l);
        if (!o || !this.open(o)) continue;
        const [x2, y2] = this.pos(o);
        g.strokeStyle = 'rgba(200,140,40,0.35)';
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(x1, y1);
        g.quadraticCurveTo((x1 + x2) / 2 + (y2 - y1) * 0.12, (y1 + y2) / 2 - (x2 - x1) * 0.12, x2, y2);
        g.stroke();
        g.strokeStyle = '#c8922a';
        g.lineWidth = 2.5;
        g.setLineDash([8, 6]);
        g.stroke();
        g.setLineDash([]);
      }
    }
    // patches
    for (const r of REGION_LIST) {
      const [x, y] = this.pos(r);
      const pts = this.shapes.get(r.id)!;
      const open = this.open(r);
      const theme = THEMES[SCENES[r.entry]?.theme ?? 'village_autumn'];
      g.save();
      g.translate(x, y);
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.closePath();
      if (open) {
        const gr = g.createLinearGradient(0, -80, 0, 80);
        gr.addColorStop(0, theme.sky[1]);
        gr.addColorStop(0.55, theme.sky[2]);
        gr.addColorStop(1, theme.ground.top);
        g.fillStyle = gr;
      } else g.fillStyle = 'rgba(120,100,80,0.25)';
      g.fill();
      g.clip();
      if (open) {
        // a little silhouette of the land
        const L = theme.layers[theme.layers.length - 1];
        g.fillStyle = rgba(L.color, 0.85);
        const R = rng(hashStr(r.id) + 1);
        g.beginPath();
        g.moveTo(-120, 80);
        for (let i = -110; i <= 110; i += 14) g.lineTo(i, 20 - R() * 30);
        g.lineTo(120, 80);
        g.fill();
      }
      g.restore();
      g.save();
      g.translate(x, y);
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.closePath();
      g.strokeStyle = open ? shade(theme.seam, -0.3) : 'rgba(120,90,60,0.4)';
      g.setLineDash([7, 5]);
      g.lineWidth = 2.5;
      g.stroke();
      g.setLineDash([]);
      g.restore();
    }
    // labels last, on little parchment tags, so no patch covers another's name
    for (const r of REGION_LIST) {
      const [x, y] = this.pos(r);
      const open = this.open(r);
      const label = open ? r.name : '?';
      g.font = '400 19px "IM Fell English SC", Georgia';
      g.textAlign = 'center';
      const tw = g.measureText(label).width + 18;
      g.fillStyle = open ? 'rgba(243,230,200,0.92)' : 'rgba(200,180,150,0.5)';
      g.beginPath();
      g.roundRect(x - tw / 2, y + 60, tw, 26, 8);
      g.fill();
      g.strokeStyle = 'rgba(160,110,40,0.6)';
      g.setLineDash([4, 3]);
      g.lineWidth = 1;
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = open ? '#2a1a12' : 'rgba(90,70,50,0.6)';
      g.fillText(label, x, y + 79);
    }
    applyGrain(g, W, H, 0.1);
    g.font = '400 34px "IM Fell English SC", Georgia';
    g.fillStyle = '#f3e6c8';
    g.textAlign = 'left';
    g.fillText('The Hem', 40, 46);
    return c;
  }

  update(dt: number, controls: boolean): void {
    this.t += dt;
    if (!controls) return;
    const opens = REGION_LIST.filter((r) => this.open(r));
    const cur = REGION_LIST.find((r) => r.id === this.sel)!;
    const [cx, cy] = this.pos(cur);
    const dirs: [string, number, number][] = [
      ['left', -1, 0],
      ['right', 1, 0],
      ['up', 0, -1],
      ['down', 0, 1],
    ];
    for (const [a, dx, dy] of dirs) {
      if (!input.pressed(a as 'left')) continue;
      let best: RegionSpec | null = null;
      let bd = Infinity;
      for (const r of opens) {
        if (r.id === this.sel) continue;
        const [x, y] = this.pos(r);
        const along = (x - cx) * dx + (y - cy) * dy;
        if (along <= 5) continue;
        const across = Math.abs((x - cx) * dy) + Math.abs((y - cy) * dx);
        const d = along + across * 1.8;
        if (d < bd) {
          bd = d;
          best = r;
        }
      }
      if (best) {
        this.sel = best.id;
        audio.sfx('ui_move');
      }
    }
    if (input.mouse.moved || input.mouse.clicked) {
      for (const r of opens) {
        const [x, y] = this.pos(r);
        if (Math.hypot(input.mouse.x - x, input.mouse.y - y) < 80) {
          if (this.sel !== r.id) audio.sfx('ui_move');
          this.sel = r.id;
          if (input.mouse.clicked) {
            input.mouse.clicked = false;
            void this.travel();
          }
        }
      }
    }
    if (input.pressed('confirm') || input.pressed('interact')) {
      input.eat('confirm');
      input.eat('interact');
      void this.travel();
    }
    if (input.pressed('back') || input.pressed('map')) {
      input.eat('back');
      input.eat('map');
      audio.sfx('ui_back');
      if (this.back) void this.game.gotoScene(this.back.scene, this.back.x);
      else void this.travel(this.at);
    }
  }

  private busy = false;
  private async travel(id = this.sel): Promise<void> {
    if (this.busy) return;
    const r = REGION_LIST.find((q) => q.id === id);
    if (!r || !this.open(r)) return;
    this.busy = true;
    audio.sfx('ui_ok');
    if (r.id === this.at && this.back) await this.game.gotoScene(this.back.scene, this.back.x);
    else await this.game.gotoScene(r.entry, r.entryX);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.base, 0, 0, W, H);
    // the Loom glowing over its spire, and the Tear (until the story ends)
    const spire = REGION_LIST.find((r) => r.id === 'loomspire');
    if (spire) {
      const [x, y] = this.pos(spire);
      drawGlow(ctx, x, y - 40, 120 + 10 * Math.sin(this.t * 1.5), '#fff2c8', 0.35);
      if (!flagOn(this.game.save, 'game_done')) {
        ctx.save();
        ctx.globalAlpha = 0.7 + 0.2 * Math.sin(this.t * 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 2, y - 110, 4, 90);
        drawGlow(ctx, x, y - 70, 50, '#ffffff', 0.5);
        ctx.restore();
      }
    }
    const sel = REGION_LIST.find((r) => r.id === this.sel)!;
    const [sx, sy] = this.pos(sel);
    drawGlow(ctx, sx, sy, 130 + 6 * Math.sin(this.t * 3), '#ffe08a', 0.35);
    // party marker: a needle with a red thread
    const at = REGION_LIST.find((r) => r.id === this.at)!;
    const [ax, ay] = this.pos(at);
    const bob = Math.sin(this.t * 3) * 5;
    ctx.save();
    ctx.translate(ax, ay - 30 + bob);
    ctx.fillStyle = '#e8eef4';
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(-4, -20);
    ctx.lineTo(4, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e25b3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(20, -30, 14, 4);
    ctx.stroke();
    ctx.restore();
    // info
    ctx.save();
    ctx.fillStyle = 'rgba(20,12,16,0.88)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 330, H - 92, 660, 78, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(231,183,90,0.6)';
    ctx.stroke();
    ctx.fillStyle = '#ffe08a';
    ctx.font = '400 24px "IM Fell English SC", Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(sel.name + (sel.optional ? '  (optional)' : ''), W / 2, H - 62);
    ctx.fillStyle = '#f3e6c8';
    ctx.font = '16px Spectral, Georgia';
    ctx.fillText(sel.blurb.length > 92 ? sel.blurb.slice(0, 90) + '…' : sel.blurb, W / 2, H - 36);
    ctx.font = '14px Spectral, Georgia';
    ctx.fillStyle = 'rgba(243,230,200,0.7)';
    ctx.fillText(`${glyph('confirm')} travel · ${glyph('back')} ${this.back ? 'go back' : 'stay'}`, W / 2, H - 18);
    ctx.restore();
  }

  destroy(): void {
    /* nothing to free */
  }
}

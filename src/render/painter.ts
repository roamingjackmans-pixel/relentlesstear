// Painted backdrops: sky with the Loom (or the Tear, or stars), drifting clouds, parallax silhouette layers, the
// ground with its gold seam-stitches, foreground occluders, weather, fog and darkness with light pools. Everything
// static is pre-rendered once per theme into wrapping strips; a frame is a handful of drawImage calls.
import type { ThemeId } from '../data/types';
import { rng, mix, rgba, shade, clamp } from '../core/util';
import { applyGrain, ctx2d, drawGlow, GROUND, H, isLowQuality, makeCanvas, W } from './canvas';
import { THEMES, type LayerSpec, type Theme } from './themes';

const TILE = 2560;
const TAU = Math.PI * 2;

/** periodic smooth height over the tile */
function wave(seed: number, x: number, freqs: number[]): number {
  const r = rng(seed);
  let v = 0;
  let norm = 0;
  for (const k of freqs) {
    const a = 1 / Math.sqrt(k);
    v += a * Math.sin((TAU * k * x) / TILE + r() * TAU);
    norm += a;
  }
  return v / norm; // -1..1
}

function ridge(g: CanvasRenderingContext2D, L: LayerSpec, fn: (x: number) => number, top: number): void {
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= TILE; x += 8) g.lineTo(x, fn(x) - top);
  g.lineTo(TILE, H);
  g.closePath();
  g.fillStyle = L.color;
  g.fill();
  if (L.edge) {
    g.beginPath();
    for (let x = 0; x <= TILE; x += 8) {
      const y = fn(x) - top;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokeStyle = rgba(L.edge, 0.35);
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = rgba(shade(L.color, -0.3), 0.4);
    g.lineWidth = 1.5;
    g.stroke();
  }
}

/** Draw `n` features across the tile, each also wrapped at the seam. */
function scatter(L: LayerSpec, n: number, fn: (x: number, r: () => number) => void): void {
  const r = rng(L.seed * 977);
  const xs: number[] = [];
  for (let i = 0; i < n; i++) xs.push((i + 0.2 + r() * 0.6) * (TILE / n));
  for (const x of xs) {
    const rr = rng(Math.floor(x * 13) + L.seed);
    fn(x, rr);
    if (x < 300) fn(x + TILE, rng(Math.floor(x * 13) + L.seed));
    if (x > TILE - 300) fn(x - TILE, rng(Math.floor(x * 13) + L.seed));
  }
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}

function drawLayer(g: CanvasRenderingContext2D, L: LayerSpec, top: number): void {
  const dens = L.density ?? 0.5;
  const base = L.y - top;
  const edge = L.edge ?? shade(L.color, 0.3);
  g.fillStyle = L.color;
  switch (L.kind) {
    case 'hills':
      ridge(g, L, (x) => L.y - L.h * (0.55 + 0.45 * wave(L.seed, x, [2, 3, 5, 8])), top);
      break;
    case 'mountains':
      ridge(g, L, (x) => L.y - L.h * (0.35 + 0.65 * Math.abs(wave(L.seed, x, [2, 3, 4, 7, 11]))) * 1.3, top);
      break;
    case 'waves': {
      g.fillStyle = L.color;
      g.fillRect(0, base, TILE, H - base);
      g.strokeStyle = rgba(edge, 0.5);
      g.lineWidth = 1.5;
      const r = rng(L.seed);
      for (let i = 0; i < 160; i++) {
        const x = r() * TILE;
        const y = base + 4 + r() * 30;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 20 + r() * 40, y);
        g.stroke();
      }
      break;
    }
    case 'trees':
      ridge(g, { ...L, edge: undefined }, (x) => L.y - L.h * 0.15 * (1 + wave(L.seed, x, [3, 7])), top);
      scatter(L, Math.round(60 * dens), (x, r) => {
        const h = L.h * (0.55 + r() * 0.6);
        const w = h * (0.45 + r() * 0.3);
        g.fillStyle = shade(L.color, -0.1);
        g.fillRect(x - 4, base - h * 0.45, 8, h * 0.5);
        g.fillStyle = L.color;
        for (let k = 0; k < 5; k++) blob(g, x + (r() - 0.5) * w * 0.8, base - h * (0.55 + r() * 0.35), w * (0.28 + r() * 0.15), h * (0.2 + r() * 0.12));
        g.fillStyle = rgba(edge, 0.28);
        blob(g, x - w * 0.15, base - h * 0.85, w * 0.22, h * 0.1);
      });
      break;
    case 'pines':
      scatter(L, Math.round(70 * dens), (x, r) => {
        const h = L.h * (0.6 + r() * 0.7);
        const w = h * 0.32;
        g.fillStyle = L.color;
        for (let k = 0; k < 3; k++) {
          const yy = base - h * (0.3 + k * 0.25);
          g.beginPath();
          g.moveTo(x, yy - h * 0.35);
          g.lineTo(x + w * (1 - k * 0.2), yy + h * 0.12);
          g.lineTo(x - w * (1 - k * 0.2), yy + h * 0.12);
          g.closePath();
          g.fill();
        }
        g.fillRect(x - 3, base - h * 0.2, 6, h * 0.2 + 4);
      });
      g.fillRect(0, base - 2, TILE, H - base + 2);
      break;
    case 'willows':
      g.fillRect(0, base - 6, TILE, H - base + 6);
      scatter(L, Math.round(26 * dens), (x, r) => {
        const h = L.h * (0.7 + r() * 0.5);
        g.fillStyle = L.color;
        g.beginPath();
        g.moveTo(x - 10, base);
        g.quadraticCurveTo(x - 4, base - h * 0.5, x + (r() - 0.5) * 30, base - h);
        g.lineTo(x + 14, base - h * 0.95);
        g.quadraticCurveTo(x + 8, base - h * 0.5, x + 12, base);
        g.fill();
        blob(g, x, base - h, h * 0.42, h * 0.22);
        g.strokeStyle = L.color;
        g.lineWidth = 2;
        for (let k = 0; k < 26; k++) {
          const sx = x + (r() - 0.5) * h * 0.8;
          const sy = base - h * (0.95 + (r() - 0.5) * 0.2);
          g.beginPath();
          g.moveTo(sx, sy);
          g.quadraticCurveTo(sx + 6, sy + h * 0.3, sx + (r() - 0.5) * 12, sy + h * (0.45 + r() * 0.35));
          g.stroke();
        }
        if (L.lights && r() < 0.55) {
          const lx = x + (r() - 0.5) * h * 0.5;
          const ly = base - h * (0.4 + r() * 0.3);
          g.strokeStyle = rgba('#000000', 0.5);
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(lx, ly - 30);
          g.lineTo(lx, ly);
          g.stroke();
          drawGlow(g, lx, ly + 4, 22, L.lights, 0.7);
          g.fillStyle = L.lights;
          g.fillRect(lx - 3, ly, 6, 8);
        }
      });
      break;
    case 'buildings': {
      g.fillRect(0, base - 4, TILE, H - base + 4);
      scatter(L, Math.round(30 * dens), (x, r) => {
        const w = 60 + r() * 90;
        const h = L.h * (0.45 + r() * 0.55);
        const roof = r() < 0.75;
        const y0 = base - h;
        g.fillStyle = L.color;
        g.fillRect(x - w / 2, y0, w, h + 4);
        if (roof) {
          g.beginPath();
          g.moveTo(x - w / 2 - 8, y0 + 2);
          g.lineTo(x + (r() - 0.5) * 10, y0 - h * 0.45);
          g.lineTo(x + w / 2 + 8, y0 + 2);
          g.closePath();
          g.fill();
          if (r() < 0.6) g.fillRect(x + w * 0.2, y0 - h * 0.4, 10, h * 0.3);
        } else {
          g.fillRect(x - w / 2 - 4, y0 - 6, w + 8, 8);
        }
        g.strokeStyle = rgba(edge, 0.3);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x - w / 2, y0 + h);
        g.lineTo(x - w / 2, y0);
        g.stroke();
        if (L.lights) {
          const rows = Math.max(1, Math.floor(h / 40));
          const cols = Math.max(1, Math.floor(w / 30));
          for (let a = 0; a < rows; a++)
            for (let b = 0; b < cols; b++) {
              if (r() < 0.45) continue;
              const wx = x - w / 2 + 10 + b * ((w - 20) / cols);
              const wy = y0 + 14 + a * 36;
              drawGlow(g, wx + 5, wy + 7, 16, L.lights, 0.35);
              g.fillStyle = L.lights;
              g.fillRect(wx, wy, 10, 13);
              g.fillStyle = L.color;
              g.fillRect(wx + 4, wy, 2, 13);
            }
        }
      });
      break;
    }
    case 'chimneys':
      ridge(g, { ...L, edge: undefined }, (x) => L.y - 20 - 20 * wave(L.seed, x, [3, 5]), top);
      scatter(L, Math.round(16 * dens), (x, r) => {
        const h = L.h * (0.5 + r() * 0.6);
        const w = 22 + r() * 16;
        g.fillStyle = L.color;
        g.beginPath();
        g.moveTo(x - w / 2, base);
        g.lineTo(x - w / 2 + 4, base - h);
        g.lineTo(x + w / 2 - 4, base - h);
        g.lineTo(x + w / 2, base);
        g.fill();
        for (let k = 0; k < 7; k++) {
          g.fillStyle = rgba(shade(L.color, 0.25), 0.18 - k * 0.02);
          blob(g, x + k * 14 + r() * 10, base - h - 18 - k * 22, 16 + k * 6, 12 + k * 4);
        }
      });
      break;
    case 'cliffs':
      ridge(g, L, (x) => L.y - L.h * (0.3 + 0.7 * Math.pow(Math.abs(wave(L.seed, x, [3, 4, 9, 13])), 0.7)), top);
      g.strokeStyle = rgba(shade(L.color, -0.35), 0.35);
      g.lineWidth = 2;
      scatter(L, 90, (x, r) => {
        g.beginPath();
        g.moveTo(x, base - L.h * r() * 0.8);
        g.lineTo(x + (r() - 0.5) * 20, base);
        g.stroke();
      });
      break;
    case 'spires':
      scatter(L, Math.round(24 * dens), (x, r) => {
        const h = L.h * (0.5 + r() * 0.6);
        const w = 26 + r() * 30;
        g.fillStyle = L.color;
        g.fillRect(x - w / 2, base - h, w, h + 4);
        g.beginPath();
        g.moveTo(x - w / 2 - 4, base - h);
        g.lineTo(x, base - h - w * (1.6 + r() * 1.4));
        g.lineTo(x + w / 2 + 4, base - h);
        g.fill();
        if (r() < 0.5) blob(g, x, base - h * 0.6, w * 0.8, w * 0.5);
        g.fillStyle = rgba(edge, 0.35);
        g.fillRect(x - w / 2, base - h, 3, h);
        g.fillStyle = rgba(shade(L.color, -0.25), 0.5);
        for (let k = 0; k < 4; k++) {
          const ay = base - h + 20 + k * 40;
          if (ay > base - 10) break;
          g.beginPath();
          g.arc(x, ay + 8, w * 0.18, Math.PI, 0);
          g.lineTo(x + w * 0.18, ay + 22);
          g.lineTo(x - w * 0.18, ay + 22);
          g.fill();
        }
      });
      g.fillStyle = L.color;
      g.fillRect(0, base - 2, TILE, H - base + 2);
      break;
    case 'islands':
      scatter(L, Math.round(14 * dens), (x, r) => {
        const w = 90 + r() * 160;
        const y0 = base - L.h * (0.2 + r() * 0.9);
        const d = 40 + r() * 70;
        g.fillStyle = L.color;
        g.beginPath();
        g.moveTo(x - w / 2, y0);
        g.quadraticCurveTo(x - w * 0.3, y0 + d * 0.8, x, y0 + d);
        g.quadraticCurveTo(x + w * 0.3, y0 + d * 0.8, x + w / 2, y0);
        g.closePath();
        g.fill();
        g.fillStyle = shade(L.color, 0.15);
        g.fillRect(x - w / 2, y0 - 4, w, 6);
        for (let k = 0; k < 3; k++) blob(g, x - w * 0.25 + k * w * 0.25, y0 - 14 - r() * 10, 10 + r() * 12, 14 + r() * 10);
        g.strokeStyle = rgba(edge, 0.5);
        g.lineWidth = 1;
        for (let k = 0; k < 6; k++) {
          const sx = x + (r() - 0.5) * w * 0.5;
          g.beginPath();
          g.moveTo(sx, y0 + d * 0.6);
          g.quadraticCurveTo(sx + 10, y0 + d + 30, sx - 6 + r() * 12, y0 + d + 60 + r() * 60);
          g.stroke();
        }
      });
      break;
    case 'columns':
      scatter(L, Math.round(18 * dens), (x, r) => {
        const h = L.h * (0.5 + r() * 0.5);
        const w = 26 + r() * 18;
        const broken = r() < 0.3;
        g.fillStyle = L.color;
        g.fillRect(x - w / 2, base - h, w, h);
        g.fillRect(x - w / 2 - 6, base - h - 10, w + 12, 12);
        g.fillRect(x - w / 2 - 6, base - 8, w + 12, 10);
        if (broken) {
          g.fillStyle = 'rgba(0,0,0,0)';
          g.clearRect(x - w / 2 - 8, base - h - 14, w + 16, h * 0.25);
        }
        g.fillStyle = rgba(edge, 0.3);
        for (let k = 0; k < 3; k++) g.fillRect(x - w / 2 + 4 + k * (w / 3), base - h, 2, h);
        if (r() < 0.4) {
          g.strokeStyle = L.color;
          g.lineWidth = 14;
          g.beginPath();
          g.arc(x + 90, base - h, 90, Math.PI, Math.PI * 1.5);
          g.stroke();
        }
      });
      break;
    case 'reeds':
      g.strokeStyle = L.color;
      for (let i = 0; i < 900; i++) {
        const r = rng(L.seed + i);
        const x = r() * TILE;
        const h = L.h * (0.4 + r());
        g.lineWidth = 1.5 + r() * 1.5;
        g.beginPath();
        g.moveTo(x, base + 10);
        g.quadraticCurveTo(x + 4, base - h * 0.5, x + (r() - 0.5) * 16, base - h);
        g.stroke();
        if (r() < 0.12) {
          g.fillStyle = L.color;
          g.fillRect(x + (r() - 0.5) * 6 - 2, base - h - 6, 5, 14);
        }
      }
      g.fillStyle = L.color;
      g.fillRect(0, base, TILE, H - base);
      break;
    case 'wheat':
      g.fillStyle = L.color;
      g.fillRect(0, base, TILE, H - base);
      for (let i = 0; i < 2200; i++) {
        const r = rng(L.seed + i * 7);
        const x = r() * TILE;
        const h = L.h * (0.5 + r() * 0.7);
        g.strokeStyle = i % 3 ? L.color : shade(L.color, -0.15);
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x, base + 6);
        g.quadraticCurveTo(x + 3, base - h * 0.5, x + 5, base - h);
        g.stroke();
        g.fillStyle = i % 4 ? rgba(edge, 0.7) : L.color;
        g.beginPath();
        g.ellipse(x + 5, base - h - 4, 2.2, 6, 0.2, 0, TAU);
        g.fill();
      }
      break;
    case 'thimbles':
      scatter(L, Math.round(10 * dens), (x, r) => {
        const h = L.h * (0.6 + r() * 0.6);
        const w = h * 0.75;
        const tilt = (r() - 0.5) * 0.4;
        g.save();
        g.translate(x, base + 10);
        g.rotate(tilt);
        const grad = g.createLinearGradient(-w / 2, 0, w / 2, 0);
        grad.addColorStop(0, shade(L.color, 0.2));
        grad.addColorStop(0.5, L.color);
        grad.addColorStop(1, shade(L.color, -0.25));
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(-w / 2, 0);
        g.lineTo(-w * 0.42, -h * 0.8);
        g.quadraticCurveTo(0, -h * 1.12, w * 0.42, -h * 0.8);
        g.lineTo(w / 2, 0);
        g.closePath();
        g.fill();
        g.fillStyle = rgba(shade(L.color, -0.35), 0.5);
        for (let a = 0; a < 6; a++)
          for (let b = 0; b < 5; b++) {
            const dx = -w * 0.32 + b * w * 0.16 + (a % 2) * w * 0.08;
            const dy = -h * 0.2 - a * h * 0.1;
            if (Math.abs(dx) < w * 0.4) blob(g, dx, dy, 3, 3);
          }
        g.fillStyle = rgba(edge, 0.25);
        g.fillRect(-w * 0.35, -h * 0.75, 4, h * 0.7);
        g.restore();
      });
      break;
    case 'roots': {
      const r = rng(L.seed);
      g.fillStyle = L.color;
      for (let i = 0; i < 26; i++) {
        const x = r() * TILE;
        const len = L.h * (0.4 + r() * 0.8);
        const w = 10 + r() * 30;
        const fromTop = L.y < 400;
        const y0 = fromTop ? -10 : base + 20;
        const dir = fromTop ? 1 : -1;
        g.beginPath();
        g.moveTo(x - w / 2, y0);
        g.bezierCurveTo(x - w / 2 + (r() - 0.5) * 80, y0 + dir * len * 0.4, x + (r() - 0.5) * 120, y0 + dir * len * 0.8, x + (r() - 0.5) * 40, y0 + dir * len);
        g.bezierCurveTo(x + w / 2 + (r() - 0.5) * 60, y0 + dir * len * 0.6, x + w / 2, y0 + dir * len * 0.3, x + w / 2, y0);
        g.fill();
        if (L.lights && r() < 0.5) drawGlow(g, x, y0 + dir * len * 0.9, 18, L.lights, 0.5);
      }
      if (L.y >= 400) g.fillRect(0, base, TILE, H - base);
      if (L.edge) {
        g.strokeStyle = rgba(L.edge, 0.15);
        g.lineWidth = 1;
        for (let i = 0; i < 60; i++) {
          const x = r() * TILE;
          g.beginPath();
          g.moveTo(x, 0);
          g.quadraticCurveTo(x + 30, L.h * 0.5, x - 10 + r() * 20, L.h * (0.5 + r()));
          g.stroke();
        }
      }
      break;
    }
    case 'crystals':
      g.fillRect(0, base, TILE, H - base);
      scatter(L, Math.round(30 * dens), (x, r) => {
        for (let k = 0; k < 4; k++) {
          const h = L.h * (0.3 + r() * 0.8);
          const w = 10 + r() * 18;
          const ang = (r() - 0.5) * 0.8;
          g.save();
          g.translate(x + (r() - 0.5) * 40, base + 4);
          g.rotate(ang);
          g.fillStyle = L.color;
          g.beginPath();
          g.moveTo(-w / 2, 0);
          g.lineTo(-w / 2, -h * 0.75);
          g.lineTo(0, -h);
          g.lineTo(w / 2, -h * 0.75);
          g.lineTo(w / 2, 0);
          g.fill();
          g.fillStyle = rgba(edge, 0.3);
          g.beginPath();
          g.moveTo(0, -h);
          g.lineTo(w / 2, -h * 0.75);
          g.lineTo(w / 2, 0);
          g.lineTo(0, 0);
          g.fill();
          g.restore();
        }
        if (L.lights) drawGlow(g, x, base - 30, 40, L.lights, 0.35);
      });
      break;
    case 'glasstrees':
      scatter(L, Math.round(22 * dens), (x, r) => {
        const h = L.h * (0.6 + r() * 0.5);
        g.strokeStyle = L.color;
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(x, base + 4);
        g.lineTo(x, base - h * 0.5);
        g.stroke();
        g.lineWidth = 3;
        for (let k = 0; k < 7; k++) {
          const a = -Math.PI / 2 + (r() - 0.5) * 1.8;
          const len = h * (0.25 + r() * 0.3);
          const sy = base - h * (0.35 + r() * 0.25);
          g.beginPath();
          g.moveTo(x, sy);
          g.lineTo(x + Math.cos(a) * len, sy + Math.sin(a) * len);
          g.stroke();
          g.fillStyle = rgba(edge, 0.4);
          blob(g, x + Math.cos(a) * len, sy + Math.sin(a) * len, 7, 10);
        }
      });
      g.fillStyle = L.color;
      g.fillRect(0, base, TILE, H - base);
      break;
    case 'burrow': {
      g.fillStyle = L.color;
      g.fillRect(0, 0, TILE, H);
      g.globalCompositeOperation = 'destination-out';
      const r = rng(L.seed);
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (TILE / 9);
        const w = 200 + r() * 120;
        const gr = g.createRadialGradient(x, 380, 20, x, 380, w);
        gr.addColorStop(0, 'rgba(0,0,0,0.85)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(x - w, 380 - w, w * 2, w * 2);
      }
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = rgba(edge, 0.25);
      g.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const x = r() * TILE;
        g.beginPath();
        g.arc(x, 520, 120 + r() * 200, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
      break;
    }
  }
}

interface Strip {
  canvas: HTMLCanvasElement;
  top: number;
  par: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  a: number;
  ph: number;
}

export class Backdrop {
  readonly id: ThemeId;
  readonly theme: Theme;
  private sky: HTMLCanvasElement;
  private clouds: HTMLCanvasElement;
  private strips: Strip[] = [];
  private ground: HTMLCanvasElement;
  private front: HTMLCanvasElement | null = null;
  private light: HTMLCanvasElement;
  private parts: Particle[] = [];
  private pulses: { lane: number; p: number; v: number }[] = [];
  weather: Theme['weather'];
  dark: number;
  starsMode = false;

  constructor(id: ThemeId, o: { weather?: Theme['weather']; dark?: number; stars?: boolean } = {}) {
    this.id = id;
    this.theme = THEMES[id] ?? THEMES.village_autumn;
    this.weather = o.weather ?? this.theme.weather;
    this.dark = o.dark ?? this.theme.dark;
    this.starsMode = !!o.stars;
    this.sky = this.paintSky();
    this.clouds = this.paintClouds();
    for (const L of this.theme.layers) this.strips.push(this.paintLayer(L));
    this.ground = this.paintGround();
    if (this.theme.front && !isLowQuality()) this.front = this.paintFront();
    this.light = makeCanvas(W / 4, H / 4);
    this.seedParticles();
    for (let i = 0; i < 14; i++) this.pulses.push({ lane: Math.random(), p: Math.random(), v: 0.05 + Math.random() * 0.08 });
  }

  private paintSky(): HTMLCanvasElement {
    const T = this.theme;
    const c = makeCanvas(W, H);
    const g = ctx2d(c);
    const grad = g.createLinearGradient(0, 0, 0, GROUND);
    grad.addColorStop(0, T.sky[0]);
    grad.addColorStop(0.55, T.sky[1]);
    grad.addColorStop(1, T.sky[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const r = rng(7 + this.id.length);
    const stars = this.starsMode ? 1 : T.stars ?? 0;
    if (stars > 0) {
      for (let i = 0; i < 420; i++) {
        const x = r() * W;
        const y = r() * GROUND * 0.9;
        const s = r() < 0.92 ? r() * 1.3 + 0.3 : r() * 2.5 + 1;
        g.fillStyle = rgba(r() < 0.8 ? '#ffffff' : '#ffe6c0', (0.3 + r() * 0.7) * stars);
        g.beginPath();
        g.arc(x, y, s, 0, TAU);
        g.fill();
      }
      // a faint milky band
      g.save();
      g.globalAlpha = 0.18 * stars;
      g.translate(W / 2, 200);
      g.rotate(-0.35);
      const mb = g.createLinearGradient(0, -80, 0, 80);
      mb.addColorStop(0, 'rgba(255,255,255,0)');
      mb.addColorStop(0.5, 'rgba(200,210,255,1)');
      mb.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = mb;
      g.fillRect(-900, -80, 1800, 160);
      g.restore();
    }
    if (T.sun) {
      drawGlow(g, T.sun.x, T.sun.y, T.sun.r * 6, T.sun.glow, 0.55);
      g.fillStyle = T.sun.color;
      g.beginPath();
      g.arc(T.sun.x, T.sun.y, T.sun.r, 0, TAU);
      g.fill();
    }
    const loom = this.starsMode ? 0 : T.loom;
    if (loom > 0) {
      // the Loom: a vast lattice of light hanging from a point above the sky
      const ax = W * 0.5;
      const ay = -260;
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 46; i++) {
        const f = i / 45;
        const bx = W * (-0.3 + f * 1.6);
        g.strokeStyle = rgba('#fff2c8', (0.05 + 0.08 * Math.sin(f * 40)) * loom);
        g.lineWidth = i % 5 === 0 ? 2 : 1;
        g.beginPath();
        g.moveTo(ax + (f - 0.5) * 120, ay);
        g.quadraticCurveTo(ax + (f - 0.5) * 500, GROUND * 0.4, bx, GROUND + 40);
        g.stroke();
      }
      for (let k = 0; k < 8; k++) {
        const y = 40 + k * 46;
        g.strokeStyle = rgba('#ffe8b0', 0.05 * loom);
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(ax, ay, 120 + k * 120, y - ay, 0, Math.PI * 0.08, Math.PI * 0.92);
        g.stroke();
      }
      drawGlow(g, ax, 20, 220, '#fff4d8', 0.25 * loom);
      g.restore();
    }
    const tear = this.starsMode ? 0 : T.tear ?? 0;
    if (tear > 0) {
      const tx = W * 0.72;
      g.save();
      drawGlow(g, tx, 230, 260, '#ffffff', 0.35 * tear);
      g.fillStyle = rgba('#ffffff', 0.92 * tear);
      g.beginPath();
      g.moveTo(tx, 0);
      for (let y = 0; y <= GROUND - 60; y += 20) g.lineTo(tx - 6 - Math.sin(y * 0.05) * 10 - (y / GROUND) * 22, y);
      for (let y = GROUND - 60; y >= 0; y -= 20) g.lineTo(tx + 6 + Math.cos(y * 0.04) * 9 + (y / GROUND) * 16, y);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba('#ffd8f0', 0.6 * tear);
      g.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const y = r() * (GROUND - 80);
        g.beginPath();
        g.moveTo(tx, y);
        g.quadraticCurveTo(tx + (r() - 0.5) * 120, y + 20, tx + (r() - 0.5) * 160, y + 40 + r() * 60);
        g.stroke();
      }
      g.restore();
    }
    // horizon haze
    const hz = g.createLinearGradient(0, GROUND - 220, 0, GROUND);
    hz.addColorStop(0, rgba(T.fog, 0));
    hz.addColorStop(1, rgba(T.fog, 0.35));
    g.fillStyle = hz;
    g.fillRect(0, GROUND - 220, W, 220);
    return c;
  }

  private paintClouds(): HTMLCanvasElement {
    const T = this.theme;
    const c = makeCanvas(TILE / 2, 180);
    const g = ctx2d(c);
    g.scale(0.5, 0.5);
    if (T.cloudAlpha <= 0) return c;
    const r = rng(99 + this.id.length * 3);
    for (let i = 0; i < 16; i++) {
      const cx = (i + r()) * (TILE / 16);
      const cy = 50 + r() * 230;
      const w = 120 + r() * 220;
      for (let k = 0; k < 9; k++) {
        const x = cx + (r() - 0.5) * w;
        const y = cy + (r() - 0.5) * w * 0.15;
        const rad = w * (0.15 + r() * 0.18);
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, rgba(T.cloud, 0.55 * T.cloudAlpha));
        gr.addColorStop(0.6, rgba(T.cloud, 0.25 * T.cloudAlpha));
        gr.addColorStop(1, rgba(T.cloud, 0));
        g.fillStyle = gr;
        for (const dx of [0, TILE, -TILE]) g.fillRect(x - rad + dx, y - rad, rad * 2, rad * 2);
      }
    }
    return c;
  }

  private paintLayer(L: LayerSpec): Strip {
    const top = Math.max(0, L.kind === 'roots' && L.y < 400 ? 0 : L.y - L.h * 2.2 - 60);
    const c = makeCanvas(TILE, H - top);
    const g = ctx2d(c);
    g.globalAlpha = 1;
    drawLayer(g, L, top);
    // atmospheric perspective: far layers drift toward the fog color
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = rgba(this.theme.fog, Math.max(0, 0.4 - L.par * 0.6) * (L.alpha ?? 1));
    g.fillRect(0, 0, TILE, H);
    g.globalCompositeOperation = 'source-over';
    applyGrain(g, TILE, H - top, 0.12);
    if (L.alpha != null && L.alpha < 1) {
      const c2 = makeCanvas(TILE, H - top);
      const g2 = ctx2d(c2);
      g2.globalAlpha = L.alpha;
      g2.drawImage(c, 0, 0);
      return { canvas: c2, top, par: L.par };
    }
    return { canvas: c, top, par: L.par };
  }

  private paintGround(): HTMLCanvasElement {
    const T = this.theme;
    const gr = T.ground;
    const top = GROUND - 30;
    const c = makeCanvas(TILE, H - top);
    const g = ctx2d(c);
    const y0 = GROUND - top;
    const edgeY = (x: number): number => y0 + 3 * wave(5, x, [6, 11, 17]);
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= TILE; x += 10) g.lineTo(x, edgeY(x));
    g.lineTo(TILE, H);
    g.closePath();
    const grad = g.createLinearGradient(0, y0, 0, H - top);
    grad.addColorStop(0, gr.top);
    grad.addColorStop(1, gr.bottom);
    g.fillStyle = grad;
    g.fill();
    const r = rng(77 + this.id.length);
    // texture by type
    switch (gr.detail) {
      case 'cobble':
      case 'porcelain':
        for (let row = 0; row < 7; row++) {
          const yy = y0 + 14 + row * (row + 8) * 1.6;
          for (let x = (row % 2) * 20; x < TILE; x += 40 + row * 4) {
            g.strokeStyle = rgba(shade(gr.top, gr.detail === 'porcelain' ? -0.12 : -0.3), 0.5);
            g.lineWidth = 1.2;
            g.beginPath();
            g.roundRect(x, yy, 36 + row * 4, 10 + row * 1.5, 4);
            g.stroke();
            if (gr.detail === 'porcelain' && r() < 0.25) {
              g.strokeStyle = rgba('#8aa0d0', 0.35);
              g.beginPath();
              g.arc(x + 18, yy + 6, 3, 0, TAU);
              g.stroke();
            }
          }
        }
        break;
      case 'water':
        g.strokeStyle = rgba(gr.edge, 0.25);
        for (let i = 0; i < 260; i++) {
          const x = r() * TILE;
          const y = y0 + 8 + r() * 150;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + 10 + r() * 50, y);
          g.stroke();
        }
        break;
      case 'void':
        for (let i = 0; i < 300; i++) {
          g.fillStyle = rgba('#ffffff', r() * 0.5);
          g.fillRect(r() * TILE, y0 + r() * 160, 2, 2);
        }
        break;
      case 'glass':
        g.strokeStyle = rgba('#ffffff', 0.35);
        for (let i = 0; i < 120; i++) {
          const x = r() * TILE;
          const y = y0 + 10 + r() * 140;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + (r() - 0.5) * 40, y + r() * 20);
          g.stroke();
        }
        break;
      case 'wood':
        for (let row = 0; row < 8; row++) {
          g.strokeStyle = rgba(shade(gr.top, -0.35), 0.5);
          g.beginPath();
          g.moveTo(0, y0 + 10 + row * 20);
          g.lineTo(TILE, y0 + 10 + row * 20);
          g.stroke();
        }
        break;
      default:
        for (let i = 0; i < 700; i++) {
          const x = r() * TILE;
          const y = y0 + 6 + Math.pow(r(), 1.5) * 160;
          g.fillStyle = rgba(r() < 0.5 ? shade(gr.top, -0.25) : shade(gr.top, 0.15), 0.35);
          g.beginPath();
          g.ellipse(x, y, 2 + r() * 6, 1 + r() * 2, 0, 0, TAU);
          g.fill();
        }
    }
    // tufts along the edge
    if (gr.detail === 'grass' || gr.detail === 'mud' || gr.detail === 'dirt') {
      for (let i = 0; i < 900; i++) {
        const x = r() * TILE;
        const y = edgeY(x) + 2;
        const h = 4 + r() * 12;
        g.strokeStyle = r() < 0.5 ? gr.tuft : shade(gr.tuft, -0.2);
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 2, y - h * 0.6, x + (r() - 0.5) * 8, y - h);
        g.stroke();
        if (this.id === 'village_autumn' && r() < 0.03) {
          g.fillStyle = r() < 0.5 ? '#d8503a' : '#f0c040';
          g.beginPath();
          g.arc(x, y - h, 2.2, 0, TAU);
          g.fill();
        }
      }
    }
    // rim light on the edge
    g.beginPath();
    for (let x = 0; x <= TILE; x += 10) (x === 0 ? g.moveTo(x, edgeY(x)) : g.lineTo(x, edgeY(x)));
    g.strokeStyle = rgba(gr.edge, 0.5);
    g.lineWidth = 2;
    g.stroke();
    // the seam: gold running stitches through the ground
    const sy = y0 + 34;
    g.save();
    g.lineCap = 'round';
    for (const [w, a] of [
      [9, 0.07],
      [5, 0.12],
    ] as const) {
      g.strokeStyle = rgba(T.seam, a);
      g.lineWidth = w;
      g.beginPath();
      for (let x = 0; x <= TILE; x += 20) {
        const y = sy + 6 * wave(9, x, [3, 5]);
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    g.strokeStyle = T.seam;
    g.lineWidth = 2.2;
    for (let x = 0; x < TILE; x += 26) {
      const y = sy + 6 * wave(9, x, [3, 5]);
      const y2 = sy + 6 * wave(9, x + 14, [3, 5]);
      g.beginPath();
      g.moveTo(x, y - 3);
      g.lineTo(x + 14, y2 + 3);
      g.stroke();
    }
    g.restore();
    applyGrain(g, TILE, H - top, 0.1);
    return c;
  }

  private paintFront(): HTMLCanvasElement {
    const F = this.theme.front!;
    const c = makeCanvas(TILE, 240);
    const g = ctx2d(c);
    const r = rng(555 + this.id.length);
    g.globalAlpha = 0.9;
    g.fillStyle = F.color;
    g.strokeStyle = F.color;
    const n = Math.round(F.density * 40);
    for (let i = 0; i < n; i++) {
      const x = r() * TILE;
      const base = 240;
      switch (F.kind) {
        case 'grass':
        case 'reeds':
          for (let k = 0; k < 14; k++) {
            const h = 50 + r() * (F.kind === 'reeds' ? 170 : 90);
            g.lineWidth = 2 + r() * 3;
            g.beginPath();
            const sx = x + (r() - 0.5) * 50;
            g.moveTo(sx, base);
            g.quadraticCurveTo(sx + 6, base - h * 0.6, sx + (r() - 0.5) * 30, base - h);
            g.stroke();
          }
          break;
        case 'rocks':
          g.beginPath();
          g.ellipse(x, base, 40 + r() * 70, 26 + r() * 30, 0, Math.PI, 0);
          g.fill();
          break;
        case 'threads':
          g.lineWidth = 1.5;
          for (let k = 0; k < 6; k++) {
            g.beginPath();
            g.moveTo(x, base);
            g.bezierCurveTo(x + 30, base - 60, x - 40, base - 120, x + (r() - 0.5) * 60, base - 150 - r() * 60);
            g.stroke();
          }
          break;
        case 'crystals':
          for (let k = 0; k < 3; k++) {
            const h = 40 + r() * 80;
            const w = 10 + r() * 14;
            const sx = x + (r() - 0.5) * 30;
            g.beginPath();
            g.moveTo(sx - w / 2, base);
            g.lineTo(sx, base - h);
            g.lineTo(sx + w / 2, base);
            g.fill();
          }
          break;
        case 'branches':
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(x, base);
          g.quadraticCurveTo(x + 40, base - 100, x + 10, base - 200);
          g.stroke();
          break;
      }
    }
    return c;
  }

  private seedParticles(): void {
    this.parts = [];
    const n = this.weather === 'none' ? 0 : isLowQuality() ? 50 : this.weather === 'rain' ? 170 : 110;
    for (let i = 0; i < n; i++) this.parts.push(this.spawn(true));
  }

  private spawn(anywhere: boolean): Particle {
    const w = this.weather;
    const p: Particle = { x: Math.random() * (W + 200) - 100, y: anywhere ? Math.random() * H : -20, vx: 0, vy: 0, s: 1, a: 1, ph: Math.random() * TAU };
    switch (w) {
      case 'rain':
        p.vx = -120;
        p.vy = 900 + Math.random() * 300;
        p.s = 0.6 + Math.random() * 0.8;
        p.a = 0.25 + Math.random() * 0.35;
        break;
      case 'snow':
        p.vx = -20;
        p.vy = 40 + Math.random() * 40;
        p.s = 1 + Math.random() * 2;
        break;
      case 'embers':
        p.y = anywhere ? Math.random() * H : H + 10;
        p.vx = 10 + Math.random() * 30;
        p.vy = -30 - Math.random() * 60;
        p.s = 1 + Math.random() * 2;
        break;
      case 'motes':
      case 'stars':
        p.vx = (Math.random() - 0.5) * 12;
        p.vy = -6 - Math.random() * 10;
        p.s = 1 + Math.random() * 2.5;
        p.y = anywhere ? Math.random() * H : H + 10;
        break;
      case 'petals':
        p.vx = 30 + Math.random() * 40;
        p.vy = 30 + Math.random() * 30;
        p.s = 2 + Math.random() * 3;
        break;
      case 'ash':
        p.vx = -10;
        p.vy = 20 + Math.random() * 20;
        p.s = 1 + Math.random() * 2;
        break;
      case 'threads':
        p.vx = 40 + Math.random() * 50;
        p.vy = (Math.random() - 0.5) * 20;
        p.s = 14 + Math.random() * 26;
        p.x = anywhere ? Math.random() * W : -40;
        p.y = Math.random() * H * 0.85;
        break;
    }
    return p;
  }

  /** Sky, clouds and parallax layers (behind everything). */
  drawBack(ctx: CanvasRenderingContext2D, camX: number, t: number): void {
    ctx.drawImage(this.sky, 0, 0, W, H);
    if (this.theme.loom > 0 && !this.starsMode) {
      // light traveling down the Loom's threads
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.pulses) {
        p.p = (p.p + p.v / 60) % 1;
        const f = p.lane;
        const ax = W * 0.5 + (f - 0.5) * 120;
        const bx = W * (-0.3 + f * 1.6);
        const tt = p.p;
        const cx = W * 0.5 + (f - 0.5) * 500;
        const x = (1 - tt) * (1 - tt) * ax + 2 * (1 - tt) * tt * cx + tt * tt * bx;
        const y = (1 - tt) * (1 - tt) * -260 + 2 * (1 - tt) * tt * (GROUND * 0.4) + tt * tt * (GROUND + 40);
        drawGlow(ctx, x, y, 10, '#fff2c8', 0.5 * this.theme.loom * Math.sin(tt * Math.PI));
      }
      ctx.restore();
    }
    if (this.starsMode) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 20; i++) {
        const x = (i * 197.3) % W;
        const y = (i * 73.7) % (GROUND * 0.8);
        drawGlow(ctx, x, y, 6, '#ffffff', 0.4 + 0.4 * Math.sin(t * 2 + i));
      }
      ctx.restore();
    }
    if (this.theme.cloudAlpha > 0) this.blit(ctx, this.clouds, camX * 0.04 + t * 6, 0, 0.5);
    for (const s of this.strips) this.blit(ctx, s.canvas, camX * s.par, s.top);
  }

  /** Draw a wrapping strip, copying only the part that is on screen (a whole 2560 px strip per layer per frame is
   *  the single biggest cost on software-rendered canvases). `k` is the strip's resolution relative to the screen. */
  private blit(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, scroll: number, top: number, k = 1): void {
    const tile = TILE;
    let sx = ((scroll % tile) + tile) % tile;
    let dx = 0;
    const h = c.height / k;
    while (dx < W) {
      const w = Math.min(tile - sx, W - dx);
      if (w > 0.5) ctx.drawImage(c, sx * k, 0, w * k, c.height, dx, top, w, h);
      dx += w;
      sx = 0;
    }
  }

  drawGround(ctx: CanvasRenderingContext2D, camX: number): void {
    this.blit(ctx, this.ground, camX, GROUND - 30);
  }

  /** Fog, weather and foreground occluders (in front of actors). */
  drawFront(ctx: CanvasRenderingContext2D, camX: number, t: number, dt: number): void {
    const T = this.theme;
    if (T.fogAlpha > 0) {
      const fg = ctx.createLinearGradient(0, GROUND - 160, 0, GROUND + 60);
      fg.addColorStop(0, rgba(T.fog, 0));
      fg.addColorStop(0.6, rgba(T.fog, T.fogAlpha * (0.75 + 0.25 * Math.sin(t * 0.3))));
      fg.addColorStop(1, rgba(T.fog, 0));
      ctx.fillStyle = fg;
      ctx.fillRect(0, GROUND - 160, W, 220);
    }
    this.drawWeather(ctx, camX, t, dt);
    if (this.front) this.blit(ctx, this.front, camX * 1.25, H - 200);
  }

  private lastCam = 0;
  drawWeather(ctx: CanvasRenderingContext2D, camX: number, t: number, dt: number): void {
    const dcam = camX - this.lastCam;
    this.lastCam = camX;
    const w = this.weather;
    if (w === 'none' || !this.parts.length) return;
    ctx.save();
    const lighter = w === 'embers' || w === 'motes' || w === 'stars';
    if (lighter) ctx.globalCompositeOperation = 'lighter';
    // move everything, then draw each weather as ONE path (hundreds of separate fills/strokes are slow)
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      p.x += p.vx * dt - dcam * 0.9;
      p.y += p.vy * dt;
      p.ph += dt;
      if (p.y > H + 30 || p.y < -40 || p.x < -150 || p.x > W + 150) {
        const was = p.x;
        this.parts[i] = this.spawn(false);
        if (was < -150) this.parts[i].x = W + 100;
        if (was > W + 150) this.parts[i].x = -100;
      }
    }
    const parts = this.parts;
    switch (w) {
      case 'rain':
        ctx.strokeStyle = 'rgba(200,220,255,0.38)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (const p of parts) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 4, p.y - 22);
        }
        ctx.stroke();
        break;
      case 'snow':
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        for (const p of parts) {
          const x = p.x + Math.sin(p.ph) * 10;
          ctx.moveTo(x + p.s, p.y);
          ctx.arc(x, p.y, p.s, 0, TAU);
        }
        ctx.fill();
        break;
      case 'embers':
        for (const p of parts) drawGlow(ctx, p.x + Math.sin(p.ph * 3) * 6, p.y, p.s * 4, '#ff9a3a', 0.6 + 0.4 * Math.sin(p.ph * 8));
        break;
      case 'motes':
      case 'stars':
        for (const p of parts) drawGlow(ctx, p.x + Math.sin(p.ph) * 8, p.y, p.s * 4, this.theme.seam, 0.35 + 0.3 * Math.sin(p.ph * 2));
        break;
      case 'petals':
        ctx.fillStyle = 'rgba(240,140,90,0.75)';
        ctx.beginPath();
        for (const p of parts) {
          const x = p.x + Math.sin(p.ph * 2) * 14;
          const a = p.ph * 2;
          ctx.moveTo(x + Math.cos(a) * p.s, p.y + Math.sin(a) * p.s);
          ctx.ellipse(x, p.y, p.s, p.s * 0.5, a, 0, TAU);
        }
        ctx.fill();
        break;
      case 'ash':
        ctx.fillStyle = 'rgba(80,70,70,0.6)';
        ctx.beginPath();
        for (const p of parts) ctx.rect(p.x, p.y, p.s, p.s);
        ctx.fill();
        break;
      case 'threads':
        ctx.strokeStyle = rgba(this.theme.seam, 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const p of parts) {
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x - p.s * 0.5, p.y + Math.sin(p.ph * 2) * 8, p.x - p.s, p.y + Math.sin(p.ph * 2 + 1) * 4);
        }
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  /** Darkness with pools of light (lanterns, the party's glow). lights are screen coordinates. */
  drawLight(ctx: CanvasRenderingContext2D, lights: { x: number; y: number; r: number; a?: number }[], extraDark = 0): void {
    const d = clamp(this.dark + extraDark, 0, 0.92);
    if (d <= 0.01) return;
    const g = ctx2d(this.light);
    const lw = this.light.width;
    const lh = this.light.height;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, lw, lh);
    g.fillStyle = rgba(this.theme.darkColor, d);
    g.fillRect(0, 0, lw, lh);
    g.globalCompositeOperation = 'destination-out';
    const hole = lightHole();
    for (const L of lights) {
      const r = L.r / 4;
      if (L.x / 4 + r < 0 || L.x / 4 - r > lw) continue;
      g.globalAlpha = L.a ?? 1;
      g.drawImage(hole, L.x / 4 - r, L.y / 4 - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0, W, H);
  }
}

/** A soft round hole (opaque centre fading out), cut out of the darkness for each light. */
let hole: HTMLCanvasElement | null = null;
function lightHole(): HTMLCanvasElement {
  if (hole) return hole;
  hole = makeCanvas(64, 64);
  const g = ctx2d(hole);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return hole;
}

/** Screen-space vignette, cached. */
let vig: HTMLCanvasElement | null = null;
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.45): void {
  if (!vig) {
    vig = makeCanvas(W / 2, H / 2);
    const g = ctx2d(vig);
    const gr = g.createRadialGradient(W / 4, H / 4, H * 0.18, W / 4, H / 4, W * 0.36);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W / 2, H / 2);
  }
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.drawImage(vig, 0, 0, W, H);
  ctx.restore();
}

/** Color grades for story moments. */
export function drawGrade(ctx: CanvasRenderingContext2D, mode: string, amt: number): void {
  if (amt <= 0.01 || mode === 'normal') return;
  ctx.save();
  switch (mode) {
    case 'grey':
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = `rgba(128,128,128,${amt})`;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'warm':
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(255,170,90,${amt * 0.6})`;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'cold':
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(90,140,255,${amt * 0.6})`;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'dream':
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(200,170,230,${amt * 0.35})`;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'red':
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = mix('#ffffff', '#ff7a6a', amt);
      ctx.fillRect(0, 0, W, H);
      break;
    case 'gold':
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(255,220,120,${amt * 0.7})`;
      ctx.fillRect(0, 0, W, H);
      break;
  }
  ctx.restore();
}

// Canvas helpers: the main view (1280x720 logical, scaled to the window with the device pixel ratio) and offscreen
// buffers for pre-rendered art.

export const W = 1280;
export const H = 720;
export const GROUND = 560;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
}

export interface View {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number; // backing pixels per logical pixel
}

let qualityLow = false;
export function setLowQuality(v: boolean): void {
  qualityLow = v;
}
export function isLowQuality(): boolean {
  return qualityLow;
}

/** Fit the canvas to its parent (16:9 letterbox) and set the backing resolution. */
export function fit(view: View, parent: HTMLElement): void {
  const pw = parent.clientWidth || window.innerWidth;
  const ph = parent.clientHeight || window.innerHeight;
  const s = Math.min(pw / W, ph / H);
  const cssW = Math.floor(W * s);
  const cssH = Math.floor(H * s);
  view.canvas.style.width = `${cssW}px`;
  view.canvas.style.height = `${cssH}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, qualityLow ? 1 : 2);
  const backing = Math.max(0.5, Math.min(s * dpr, qualityLow ? 1 : 2.2));
  view.scale = backing;
  view.canvas.width = Math.round(W * backing);
  view.canvas.height = Math.round(H * backing);
  document.documentElement.style.setProperty('--stage-w', `${cssW}px`);
  document.documentElement.style.setProperty('--stage-h', `${cssH}px`);
  document.documentElement.style.setProperty('--ui-scale', `${s}`);
}

/** A cached radial glow sprite (white core -> transparent), tinted by color. */
const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(color: string, size = 128): HTMLCanvasElement {
  const key = `${color}|${size}`;
  let c = glowCache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const g = ctx2d(c);
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color.length === 7 ? color + 'aa' : color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1): void {
  const s = glowSprite(color);
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a;
}

/** Paper/watercolor grain, used as a pattern over painted layers. */
let grain: HTMLCanvasElement | null = null;
export function grainCanvas(): HTMLCanvasElement {
  if (grain) return grain;
  grain = makeCanvas(256, 256);
  const g = ctx2d(grain);
  const img = g.createImageData(256, 256);
  let seed = 1234567;
  const r = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 90 + Math.sin(i * 0.0007) * 10;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // soft blotches
  for (let i = 0; i < 40; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const rad = 10 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.5;
    gr.addColorStop(0, dark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return grain;
}

/** Overlay watercolor grain on everything already drawn in a canvas (keeps transparency). */
export function applyGrain(g: CanvasRenderingContext2D, w: number, h: number, alpha = 0.14): void {
  const pat = g.createPattern(grainCanvas(), 'repeat');
  if (!pat) return;
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = alpha;
  g.fillStyle = pat;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = alpha * 0.6;
  g.fillStyle = '#000';
  // a subtle darker bottom (pigment pooling)
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.restore();
}

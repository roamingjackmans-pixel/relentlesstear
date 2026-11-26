// Shared painting kit for enemy art: colour tones (cached), glows (cached unit gradients), painted fills, rim light,
// loose threads, stitches, button eyes. Everything is drawn in an enemy's local units (origin = centre of the feet,
// y up is negative, the creature faces LEFT, size 1 ≈ a man-sized foe ~150 units tall).

export type Ctx = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;

/** Animation state handed to every drawing function. */
export interface K {
  t: number;
  seed: number;
  anim: string;
  p: number;
  /** 0..1 telegraph (windup) */
  wind: number;
  /** 0..1..0 strike curve (attack) */
  atk: number;
  /** 0..1..0 cast curve (cast) */
  cast: number;
  /** 0..1..0 recoil */
  hurt: number;
  /** 1 while broken */
  broken: number;
  /** 0..1 death progress */
  die: number;
  /** flash level 0..4 (white mix) */
  fq: number;
  /** outline width in local units (~2 px on screen) */
  lw: number;
  /** colour with the hit flash applied */
  c(hex: string): string;
  /** tone: amt -1..1 (darker..lighter), with the hit flash applied */
  s(hex: string, amt: number): string;
  /** rgba of a hex with alpha (flash applied) */
  a(hex: string, alpha: number): string;
}

// ------------------------------------------------------------------ colour

const rgbCache = new Map<string, [number, number, number]>();
export function rgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (v) return v;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h.slice(0, 6), 16);
  v = Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [200, 60, 60];
  rgbCache.set(hex, v);
  return v;
}

const toneCache = new Map<string, string>();
export function tone(hex: string, amt: number, fq: number, alpha = 1): string {
  const key = `${hex}|${amt}|${fq}|${alpha}`;
  let v = toneCache.get(key);
  if (v) return v;
  let [r, g, b] = rgb(hex);
  if (amt < 0) {
    const m = 1 + amt;
    r *= m;
    g *= m;
    b *= m;
  } else if (amt > 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  }
  if (fq > 0) {
    const f = fq / 4.5;
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  }
  v = alpha >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
  if (toneCache.size > 6000) toneCache.clear();
  toneCache.set(key, v);
  return v;
}

const shadeCache = new Map<string, string>();
/** a darker (amt < 0) or lighter (amt > 0) hex of a hex colour, for deriving base colours (no flash) */
export function shade(hex: string, amt: number): string {
  const key = `${hex}|${amt}`;
  let v = shadeCache.get(key);
  if (v) return v;
  let [r, g, b] = rgb(hex);
  if (amt < 0) {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  } else {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  }
  const h = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  v = `#${h(r)}${h(g)}${h(b)}`;
  shadeCache.set(key, v);
  return v;
}

const ease = (x: number): number => x * x * (3 - 2 * x);

export function makeK(pose: { t: number; anim: string; p: number; flash: number; seed: number }, size: number): K {
  const p = Math.max(0, Math.min(1, pose.p || 0));
  const fq = Math.max(0, Math.min(4, Math.round((pose.flash || 0) * 4)));
  const strike = p < 0.3 ? ease(p / 0.3) : 1 - ease((p - 0.3) / 0.7);
  return {
    t: pose.t || 0,
    seed: pose.seed || 0,
    anim: pose.anim,
    p,
    wind: pose.anim === 'windup' ? ease(p) : 0,
    atk: pose.anim === 'attack' ? strike : 0,
    cast: pose.anim === 'cast' ? strike : 0,
    hurt: pose.anim === 'hurt' ? Math.sin(Math.PI * p) : 0,
    broken: pose.anim === 'broken' ? 1 : 0,
    die: pose.anim === 'die' ? p : 0,
    fq,
    lw: (2 + Math.max(0, size - 1) * 0.7) / Math.max(0.2, size),
    c: (hex) => tone(hex, 0, fq),
    s: (hex, amt) => tone(hex, amt, fq),
    a: (hex, alpha) => tone(hex, 0, fq, alpha),
  };
}

// ------------------------------------------------------------------ shapes

export function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

export function circ(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
}

/** a closed smooth blob through points (quadratic midpoints) */
export function blob(ctx: Ctx, pts: number[]): void {
  const n = pts.length / 2;
  ctx.beginPath();
  const mx = (i: number): number => (pts[(i % n) * 2] + pts[((i + 1) % n) * 2]) / 2;
  const my = (i: number): number => (pts[(i % n) * 2 + 1] + pts[((i + 1) % n) * 2 + 1]) / 2;
  ctx.moveTo(mx(0), my(0));
  for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(pts[(i % n) * 2], pts[(i % n) * 2 + 1], mx(i), my(i));
  ctx.closePath();
}

export function poly(ctx: Ctx, pts: number[], close = true): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  if (close) ctx.closePath();
}

/** Fill the current path with a painted top-left-light gradient and a same-hue dark outline. */
export function paint(ctx: Ctx, k: K, base: string, x0: number, y0: number, x1: number, y1: number, outline = true, light = 0.22, dark = -0.28): void {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, k.s(base, light));
  g.addColorStop(0.55, k.c(base));
  g.addColorStop(1, k.s(base, dark));
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = k.s(base, -0.55);
    ctx.lineWidth = k.lw;
    ctx.stroke();
  }
}

/** flat fill + outline */
export function flat(ctx: Ctx, k: K, base: string, outline = true): void {
  ctx.fillStyle = k.c(base);
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = k.s(base, -0.55);
    ctx.lineWidth = k.lw;
    ctx.stroke();
  }
}

/** a soft highlight arc along the upper-left of an ellipse */
export function rim(ctx: Ctx, k: K, x: number, y: number, rx: number, ry: number, base: string, a = 0.65): void {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx * 0.82), Math.max(0.01, ry * 0.82), 0, Math.PI * 1.08, Math.PI * 1.52);
  ctx.strokeStyle = k.s(base, 0.6);
  ctx.lineWidth = k.lw * 1.6;
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ light

const glowCache = new WeakMap<object, Map<string, CanvasGradient>>();
/** additive soft glow (one cached unit gradient per colour, scaled into place) */
export function glow(ctx: Ctx, x: number, y: number, r: number, hex: string, a = 1): void {
  if (r <= 0 || a <= 0) return;
  let m = glowCache.get(ctx);
  if (!m) {
    m = new Map();
    glowCache.set(ctx, m);
  }
  let g = m.get(hex);
  if (!g) {
    const [cr, cg, cb] = rgb(hex);
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},0.9)`);
    g.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.4)`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    m.set(hex, g);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.globalAlpha *= Math.min(1, a);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** a glowing eye: halo + bright core */
export function eye(ctx: Ctx, k: K, x: number, y: number, r: number, hex: string, bright = 1): void {
  glow(ctx, x, y, r * 3.2, hex, 0.55 * bright + k.wind * 0.4);
  circ(ctx, x, y, r);
  ctx.fillStyle = k.s(hex, 0.55);
  ctx.fill();
}

/** a sewn-on button eye with four holes */
export function button(ctx: Ctx, k: K, x: number, y: number, r: number, hex: string): void {
  circ(ctx, x, y, r);
  paint(ctx, k, hex, x - r, y - r, x + r, y + r);
  ctx.fillStyle = k.s(hex, -0.6);
  const h = r * 0.32;
  for (const [dx, dy] of [
    [-h, -h],
    [h, -h],
    [-h, h],
    [h, h],
  ]) {
    circ(ctx, x + dx, y + dy, r * 0.13);
    ctx.fill();
  }
  ctx.strokeStyle = k.s(hex, 0.5);
  ctx.lineWidth = k.lw * 0.7;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.75, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
}

// ------------------------------------------------------------------ thread

/** a loose strand from (x, y), heading `ang`, swaying */
export function strand(ctx: Ctx, k: K, x: number, y: number, len: number, ang: number, hex: string, w: number, phase = 0, sway = 0.35): void {
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;
  const wob = Math.sin(k.t * 2.3 + phase + k.seed) * len * sway;
  const cx = (x + ex) / 2 - Math.sin(ang) * wob;
  const cy = (y + ey) / 2 + Math.cos(ang) * wob;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex + Math.sin(k.t * 3.1 + phase) * len * 0.12, ey);
  ctx.strokeStyle = k.c(hex);
  ctx.lineWidth = w;
  ctx.stroke();
}

/** cross-stitches along a line */
export function stitches(ctx: Ctx, k: K, x1: number, y1: number, x2: number, y2: number, n: number, s: number, hex: string, w = 1.6): void {
  ctx.beginPath();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * s;
  const ny = (dx / L) * s;
  const tx = (dx / L) * s * 0.6;
  const ty = (dy / L) * s * 0.6;
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const x = x1 + dx * f;
    const y = y1 + dy * f;
    ctx.moveTo(x - nx - tx, y - ny - ty);
    ctx.lineTo(x + nx + tx, y + ny + ty);
    ctx.moveTo(x - nx + tx, y - ny + ty);
    ctx.lineTo(x + nx - tx, y + ny - ty);
  }
  ctx.strokeStyle = k.c(hex);
  ctx.lineWidth = w;
  ctx.stroke();
}

/** a dashed running stitch along a polyline */
export function seam(ctx: Ctx, k: K, pts: number[], hex: string, w = 1.6, dash = 5): void {
  ctx.save();
  ctx.setLineDash([dash, dash * 0.8]);
  poly(ctx, pts, false);
  ctx.strokeStyle = k.c(hex);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** stable pseudo-random 0..1 for (i, seed) */
export function hash(i: number, seed = 0): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const lerp = (a: number, b: number, f: number): number => a + (b - a) * f;

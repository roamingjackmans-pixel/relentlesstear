// Small shared helpers: seeded randomness, easing, clamping, colors.

/** mulberry32: a fast seeded PRNG returning [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic hash of a string to a 32-bit seed. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const inv = (a: number, b: number, v: number): number => (b === a ? 0 : clamp((v - a) / (b - a), 0, 1));
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
export const easeIn = (t: number): number => t * t;
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Value noise in 1D (smooth, deterministic). */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number): number => {
    let v = Math.imul((n + seed * 374761393) | 0, 668265263);
    v = (v ^ (v >>> 13)) * 1274126177;
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
  };
  return lerp(h(i), h(i + 1), smooth(f));
}

/** Fractal 1D noise in [0,1). */
export function fbm1(x: number, seed = 0, oct = 4): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    v += noise1(x * f, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return v / norm;
}

/** Parse #rgb / #rrggbb into [r,g,b]. */
export function hexRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Mix two hex colors. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const bb = Math.round(lerp(b1, b2, t));
  return `#${((1 << 24) | (r << 16) | (g << 8) | bb).toString(16).slice(1)}`;
}

export const shade = (hex: string, amt: number): string => (amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt));

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function shuffle<T>(arr: T[], r: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const now = (): number => performance.now();

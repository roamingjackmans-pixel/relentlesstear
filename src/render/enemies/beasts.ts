// Beasts: thread knots, yarn hounds (and the clockwork Loomhound), thread crows (and the Seamharpy), moths (and the
// Moth Mother), needle spiders, the Seam-Eater serpent, the Bobbin Mimic, and Bobbin NPCs.
import { TAU, button, circ, ell, eye, flat, glow, hash, makeK, paint, poly, rim, seam, shade, stitches, strand, type Ctx, type K } from './kit';

// ------------------------------------------------------------------ fray (tangled knot creatures)

export interface FrayOpt {
  body: string;
  thread: string;
  eye: string;
  r: number;
  eyes: number;
  buttons?: boolean;
  hop?: boolean;
  loops?: number;
}

const EYE_SPOTS = [
  [-0.25, 0, 0.19],
  [0.3, -0.45, 0.12],
  [-0.5, -0.4, 0.1],
  [0.38, 0.22, 0.1],
  [0.02, -0.6, 0.08],
  [-0.52, 0.28, 0.08],
];

export function drawFray(ctx: Ctx, k: K, o: FrayOpt): void {
  const r = o.r;
  const hop = o.hop ? Math.abs(Math.sin(k.t * 3.2 + k.seed)) * r * 0.28 * (1 - k.broken) : Math.sin(k.t * 1.6 + k.seed) * r * 0.05;
  const sq = o.hop ? 1 + 0.12 * Math.cos(k.t * 6.4 + k.seed * 2) : 1 + 0.04 * Math.sin(k.t * 2 + k.seed);
  const cy = -r * 0.95 - hop - k.atk * r * 0.25 + k.wind * r * 0.12 - k.cast * r * 0.1;
  const n = o.loops ?? 5;
  // loops behind the body
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI + k.t * 0.35 * (i % 2 ? 1 : -1) + k.seed;
    ell(ctx, Math.cos(a * 1.3) * r * 0.22, cy + Math.sin(a) * r * 0.16, r * (0.92 + 0.16 * hash(i, k.seed)), r * (0.42 + 0.12 * hash(i + 9, k.seed)), a);
    ctx.strokeStyle = k.s(o.thread, -0.3 + 0.12 * (i % 3));
    ctx.lineWidth = k.lw * 1.5 + r * 0.03;
    ctx.stroke();
  }
  // body
  ell(ctx, 0, cy, r * 0.8 * sq, (r * 0.74) / sq);
  paint(ctx, k, o.body, -r * 0.6, cy - r * 0.7, r * 0.6, cy + r * 0.7);
  rim(ctx, k, 0, cy, r * 0.8 * sq, (r * 0.74) / sq, o.body);
  // yarn wraps across the body
  ctx.strokeStyle = k.s(o.thread, 0.15);
  ctx.lineWidth = k.lw * 0.9 + r * 0.02;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-r * 0.3 + i * r * 0.2, cy, r * 0.34, r * 0.66, 0.35 + i * 0.12, -1.2, 1.3);
    ctx.stroke();
  }
  // loops in front
  for (let i = 0; i < 2; i++) {
    const a = k.t * 0.5 * (i ? 1 : -1) + i * 2 + k.seed;
    ctx.beginPath();
    ctx.ellipse(r * 0.1, cy + r * 0.1, r * 0.95, r * 0.3, a, 0.2, 2.6);
    ctx.strokeStyle = k.s(o.thread, 0.3);
    ctx.lineWidth = k.lw * 1.2 + r * 0.025;
    ctx.stroke();
  }
  // loose strands
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.15 + i * 0.16) + (hash(i, k.seed) - 0.5) * 0.4;
    strand(ctx, k, Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.55, r * (0.4 + 0.35 * hash(i + 3, k.seed)), a, o.thread, k.lw * 0.9 + r * 0.02, i);
  }
  // eyes
  if (o.buttons) {
    button(ctx, k, -r * 0.36, cy - r * 0.12, r * 0.17, o.eye);
    button(ctx, k, r * 0.02, cy - r * 0.2, r * 0.15, o.eye);
  } else {
    for (let i = 0; i < Math.min(o.eyes, EYE_SPOTS.length); i++) {
      const [ex, ey, er] = EYE_SPOTS[i];
      const blink = hash(Math.floor(k.t * 0.8 + i * 0.37), i + k.seed) > 0.86 && !k.wind;
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(ex * r - er * r, cy + ey * r);
        ctx.lineTo(ex * r + er * r, cy + ey * r);
        ctx.strokeStyle = k.s(o.body, -0.6);
        ctx.lineWidth = k.lw;
        ctx.stroke();
      } else {
        ell(ctx, ex * r, cy + ey * r, er * r * 1.25, er * r);
        ctx.fillStyle = k.s(o.body, -0.65);
        ctx.fill();
        eye(ctx, k, ex * r - er * r * 0.15, cy + ey * r, er * r * 0.55, o.eye, 1 + k.wind);
      }
    }
  }
}

// ------------------------------------------------------------------ hounds

export interface HoundOpt {
  body: string;
  mane: string;
  eye: string;
  thread: string;
  loose: number;
  clock?: boolean;
  big?: boolean;
}

function leg(ctx: Ctx, k: K, hx: number, hy: number, ang: number, len: number, col: string, w: number, clock = false): void {
  const kx = hx + Math.sin(ang) * len * 0.55;
  const ky = hy + Math.cos(ang) * len * 0.55;
  const fx = kx + Math.sin(ang * 0.3) * len * 0.45;
  const fy = Math.min(0, ky + len * 0.45);
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.strokeStyle = k.s(col, -0.5);
  ctx.lineWidth = w + k.lw * 2;
  ctx.stroke();
  ctx.strokeStyle = k.c(col);
  ctx.lineWidth = w;
  ctx.stroke();
  if (clock) {
    circ(ctx, kx, ky, w * 0.45);
    ctx.fillStyle = k.s(col, 0.3);
    ctx.fill();
  }
  ell(ctx, fx - 3, fy - 2, w * 0.75, w * 0.4);
  flat(ctx, k, col);
}

export function drawHound(ctx: Ctx, k: K, o: HoundOpt): void {
  const breathe = Math.sin(k.t * 2.4 + k.seed) * 1.5;
  const lean = k.atk * 1;
  const run = Math.sin(k.t * (k.atk ? 14 : 2.2) + k.seed) * (k.atk ? 0.5 : 0.08);
  const bodyY = -62 + breathe * 0.5 + k.wind * 4 - (k.broken ? -8 : 0);
  const darker = shade(o.body, -0.25);
  // far legs
  leg(ctx, k, -34, bodyY + 4, -0.15 - lean * 0.5 - run, 52, darker, 9, o.clock);
  leg(ctx, k, 44, bodyY + 6, 0.2 + lean * 0.5 + run, 52, darker, 10, o.clock);
  // tail
  const wag = Math.sin(k.t * (o.clock ? 6 : 3) + k.seed) * 10;
  ctx.beginPath();
  ctx.moveTo(62, bodyY - 6);
  ctx.quadraticCurveTo(92, bodyY - 20 + wag, 100, bodyY - 44 + wag);
  ctx.strokeStyle = k.c(o.clock ? '#5b4a3a' : o.mane);
  ctx.lineWidth = o.clock ? 4 : 9;
  ctx.stroke();
  if (o.clock) {
    ell(ctx, 100, bodyY - 46 + wag, 6, 12, 0.3);
    paint(ctx, k, '#d8b46a', 94, bodyY - 58, 106, bodyY - 34);
  }
  // loose strands streaming from the back
  for (let i = 0; i < o.loose; i++) {
    const ax = -30 + (i / Math.max(1, o.loose - 1)) * 100;
    const ay = bodyY - 22 - Math.sin((ax + 30) / 30) * 4;
    const len = (o.big ? 34 : 18) + hash(i, k.seed) * (o.big ? 40 : 18);
    strand(ctx, k, ax, ay, len, -0.6 + hash(i + 5, k.seed) * 0.5, o.thread, o.big ? 2.2 : 1.6, i * 0.7);
  }
  // body
  ell(ctx, 12, bodyY, 60, 27, 0.04);
  paint(ctx, k, o.body, -40, bodyY - 30, 60, bodyY + 30);
  rim(ctx, k, 12, bodyY, 60, 27, o.body);
  if (o.clock) {
    // gear on the flank
    const gx = 18;
    const gy = bodyY;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(k.t * (k.atk ? 8 : 1.5));
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const rr = i % 2 ? 15 : 19;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    paint(ctx, k, '#c9a35a', -18, -18, 18, 18);
    circ(ctx, 0, 0, 5);
    ctx.fillStyle = k.s('#5b4a3a', 0);
    ctx.fill();
    ctx.restore();
    glow(ctx, gx, gy, 14, '#ffb347', 0.35 + k.wind * 0.5);
    for (let i = 0; i < 5; i++) {
      circ(ctx, -30 + i * 16, bodyY - 18, 1.8);
      ctx.fillStyle = k.s('#e8d9a8', 0);
      ctx.fill();
    }
  } else {
    // yarn texture
    ctx.strokeStyle = k.s(o.mane, 0.1);
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(-22 + i * 18, bodyY + 2, 12, 24, 0.35, -1.3, 1.2);
      ctx.stroke();
    }
  }
  // near legs
  leg(ctx, k, -40, bodyY + 8, -0.25 - lean * 0.7 + run, 56, o.body, 11, o.clock);
  leg(ctx, k, 50, bodyY + 10, 0.1 + lean * 0.6 - run, 56, o.body, 12, o.clock);
  // chest + neck
  ell(ctx, -40, bodyY - 8, 30, 30);
  paint(ctx, k, o.body, -70, bodyY - 38, -10, bodyY + 22);
  if (!o.clock) {
    // mane ruff
    for (let i = 0; i < 9; i++) {
      const a = -2.4 + i * 0.32;
      strand(ctx, k, -44 + Math.cos(a) * 22, bodyY - 14 + Math.sin(a) * 24, 16 + hash(i, k.seed) * 10, a + 0.4, o.mane, 4, i * 1.3, 0.2);
    }
  } else {
    ell(ctx, -44, bodyY - 26, 20, 6, -0.4);
    flat(ctx, k, '#7a2f2f');
  }
  // head
  const hx = -74 - k.atk * 10;
  const hy = bodyY - 26 - k.wind * 6 + k.atk * 6;
  const jaw = 0.08 + k.atk * 0.55 + k.wind * 0.25 + (k.broken ? 0.2 : 0);
  ctx.save();
  ctx.translate(hx, hy);
  // ears
  poly(ctx, [6, -14, 16, -40, 22, -12]);
  paint(ctx, k, o.body, 6, -40, 22, -12);
  poly(ctx, [-4, -16, 2, -40, 12, -14]);
  paint(ctx, k, o.body, -4, -40, 12, -14);
  // jaw (rotates open)
  ctx.save();
  ctx.translate(-10, 8);
  ctx.rotate(-jaw);
  poly(ctx, [0, -2, -30, 2, -27, 10, -2, 10]);
  paint(ctx, k, darker, -30, -2, 0, 10);
  ctx.fillStyle = k.c('#f4ecd8');
  for (let i = 0; i < 4; i++) {
    poly(ctx, [-6 - i * 6, -1, -9 - i * 6, -6, -12 - i * 6, -1]);
    ctx.fill();
  }
  ctx.restore();
  // skull + muzzle
  ell(ctx, 2, -2, 24, 19);
  paint(ctx, k, o.body, -20, -20, 24, 18);
  poly(ctx, [-8, -12, -38, -4, -40, 4, -10, 9]);
  paint(ctx, k, o.body, -40, -12, -8, 9);
  circ(ctx, -38, -2, 4);
  ctx.fillStyle = k.s(o.body, -0.7);
  ctx.fill();
  if (!o.clock) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = k.c('#f4ecd8');
      poly(ctx, [-14 - i * 6, 8, -17 - i * 6, 14, -20 - i * 6, 8]);
      ctx.fill();
    }
  }
  eye(ctx, k, -12, -6, 3.6, o.eye, 1.2);
  rim(ctx, k, 2, -2, 24, 19, o.body);
  ctx.restore();
  if (o.big) {
    // the loose knot at the throat
    const kx = -40;
    const ky = bodyY - 18;
    glow(ctx, kx, ky, 26, o.eye, 0.5 + k.wind * 0.4 + Math.sin(k.t * 3) * 0.1);
    for (let i = 0; i < 4; i++) {
      ell(ctx, kx, ky, 11, 5, i * 0.8 + k.t);
      ctx.strokeStyle = k.s(o.thread, 0.3);
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------------------ crows (stitchcrow, storm crow, seamharpy)

export interface CrowOpt {
  body: string;
  wing: string;
  beak: string;
  eye: string;
  harpy?: boolean;
  storm?: boolean;
}

function wing(ctx: Ctx, k: K, x: number, y: number, ang: number, s: number, col: string, threadCol: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  poly(ctx, [0, 0, 10, -26, 26, -42, 40, -46, 52, -40, 46, -30, 58, -26, 48, -16, 56, -8, 40, -4, 30, 4]);
  paint(ctx, k, col, 0, -46, 58, 4);
  ctx.strokeStyle = k.s(col, -0.5);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(12, -8);
  ctx.lineTo(44, -36);
  ctx.moveTo(14, -4);
  ctx.lineTo(48, -20);
  ctx.stroke();
  seam(ctx, k, [6, -6, 24, -28, 38, -40], threadCol, 1.2, 3);
  ctx.restore();
}

export function drawCrow(ctx: Ctx, k: K, o: CrowOpt): void {
  const big = o.harpy ? 1.45 : 1;
  const hy = (o.harpy ? -92 : -70) + Math.sin(k.t * 2.2 + k.seed) * 6 + k.atk * 26 - k.wind * 10 + (k.broken ? 40 : 0);
  const flapSpd = k.atk || k.wind ? 16 : 8;
  const f = Math.sin(k.t * flapSpd + k.seed) * (k.broken ? 0.1 : 0.7);
  // back wing
  wing(ctx, k, 4, hy - 6, -0.5 + f, 0.9 * big, shade(o.wing, -0.3), '#d4b35c');
  // tail
  poly(ctx, [18 * big, hy, 50 * big, hy - 10, 54 * big, hy + 2, 48 * big, hy + 12, 18 * big, hy + 8]);
  paint(ctx, k, o.wing, 18, hy - 10, 54 * big, hy + 12);
  // legs
  ctx.strokeStyle = k.c(o.beak);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2, hy + 14);
  ctx.lineTo(-6, hy + 30);
  ctx.lineTo(-12, hy + 33);
  ctx.moveTo(6, hy + 14);
  ctx.lineTo(4, hy + 30);
  ctx.lineTo(-2, hy + 34);
  ctx.stroke();
  // body
  ell(ctx, 0, hy, 27 * big, 18 * big, -0.2);
  paint(ctx, k, o.body, -26, hy - 18, 26, hy + 18);
  rim(ctx, k, 0, hy, 27 * big, 18 * big, o.body);
  stitches(ctx, k, -10, hy + 6, 14, hy - 2, 4, 2.5, '#d4b35c', 1.2);
  if (o.harpy) {
    // trailing hair-threads
    for (let i = 0; i < 6; i++) strand(ctx, k, -20, hy - 30 + i * 3, 50 + i * 6, -0.15 + i * 0.08, '#e9e2f5', 1.6, i);
    // porcelain mask face
    ell(ctx, -28, hy - 16, 15, 19);
    paint(ctx, k, '#f3efe8', -42, hy - 34, -14, hy + 2);
    ctx.strokeStyle = k.c('#3a2c3f');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-38, hy - 20);
    ctx.lineTo(-31, hy - 19);
    ctx.moveTo(-25, hy - 20);
    ctx.lineTo(-19, hy - 19);
    ctx.stroke();
    glow(ctx, -34, hy - 20, 6, o.eye, 0.6 + k.wind);
    glow(ctx, -22, hy - 20, 6, o.eye, 0.6 + k.wind);
    ell(ctx, -29, hy - 6, 3.5, 2 + k.atk * 3 + k.cast * 4);
    ctx.fillStyle = k.c('#9c2f45');
    ctx.fill();
    // cracks
    ctx.strokeStyle = k.c('#8a7a70');
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-28, hy - 34);
    ctx.lineTo(-26, hy - 26);
    ctx.lineTo(-30, hy - 22);
    ctx.stroke();
  } else {
    circ(ctx, -24, hy - 12, 13);
    paint(ctx, k, o.body, -37, hy - 25, -11, hy + 1);
    poly(ctx, [-34, hy - 16 - k.atk * 2, -54, hy - 10, -34, hy - 6 + k.atk * 3]);
    paint(ctx, k, o.beak, -54, hy - 16, -34, hy - 6);
    button(ctx, k, -27, hy - 14, 5, o.eye);
  }
  // front wing
  wing(ctx, k, 2, hy - 4, -0.35 + f * 1.1, big, o.wing, '#d4b35c');
  if (o.storm) {
    const flick = hash(Math.floor(k.t * 14), k.seed);
    if (flick > 0.45 || k.wind) {
      ctx.strokeStyle = k.c('#bfe4ff');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const sx = -30 + flick * 60;
      ctx.moveTo(sx, hy - 30);
      ctx.lineTo(sx + 6, hy - 18);
      ctx.lineTo(sx - 2, hy - 12);
      ctx.lineTo(sx + 8, hy);
      ctx.stroke();
      glow(ctx, sx + 3, hy - 14, 18, '#8fd0ff', 0.6);
    }
  }
}

// ------------------------------------------------------------------ moths

export interface MothOpt {
  wing: string;
  wing2: string;
  body: string;
  eye: string;
  torn?: boolean;
  mother?: boolean;
}

function mothWing(ctx: Ctx, k: K, o: MothOpt, upper: boolean, ang: number, sy: number, back: boolean): void {
  ctx.save();
  ctx.rotate(ang);
  ctx.scale(1, sy);
  const col = back ? shade(o.wing, -0.35) : o.wing;
  const L = upper ? (o.mother ? 104 : 84) : o.mother ? 70 : 56;
  const H = upper ? (o.mother ? 64 : 50) : o.mother ? 46 : 36;
  const dir = upper ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(L * 0.2, dir * H * 1.1, L * 0.8, dir * H * 1.15, L, dir * H * 0.55);
  if (o.torn) {
    // a ragged trailing edge
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      const x = L * (1 - f * 0.92);
      const y = dir * H * (0.55 - f * 0.45) + (i % 2 ? dir * 8 : -dir * 4);
      ctx.lineTo(x, y);
    }
  } else ctx.bezierCurveTo(L * 0.85, dir * H * 0.15, L * 0.3, dir * H * 0.1, 0, 0);
  ctx.closePath();
  paint(ctx, k, col, 0, dir * H, L, 0);
  // vein lines
  ctx.strokeStyle = k.s(col, -0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(4, dir * 2);
    ctx.quadraticCurveTo(L * 0.4, dir * H * (0.2 + i * 0.2), L * (0.6 + i * 0.1), dir * H * (0.3 + i * 0.12));
  }
  ctx.stroke();
  if (!back) {
    const spots = o.mother ? (upper ? 2 : 1) : upper ? 1 : 0;
    for (let i = 0; i < spots; i++) {
      const ex = L * (0.5 + i * 0.22);
      const ey = dir * H * (0.55 - i * 0.05);
      const er = (o.mother ? 13 : 11) - i * 3;
      ell(ctx, ex, ey, er, er * 0.85);
      ctx.fillStyle = k.c(o.wing2);
      ctx.fill();
      const blink = o.mother && hash(Math.floor(k.t * 0.6 + i + (upper ? 0 : 3)), k.seed) > 0.8 && !k.cast;
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(ex - er * 0.7, ey);
        ctx.lineTo(ex + er * 0.7, ey);
        ctx.strokeStyle = k.s(o.wing2, -0.6);
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        circ(ctx, ex, ey, er * 0.55);
        ctx.fillStyle = k.s(o.body, -0.5);
        ctx.fill();
        eye(ctx, k, ex - 1, ey, er * 0.28, o.eye, o.mother ? 1 + k.cast * 1.5 : 0.7);
      }
    }
    if (o.torn) for (let i = 0; i < 3; i++) strand(ctx, k, L * (0.3 + i * 0.25), dir * H * 0.2, 20 + i * 6, Math.PI * 0.5 * -dir + 0.3, '#e8e0f0', 1.2, i);
  }
  ctx.restore();
}

export function drawMoth(ctx: Ctx, k: K, o: MothOpt): void {
  const hy = (o.mother ? -84 : -92) + Math.sin(k.t * 1.7 + k.seed) * 7 - k.wind * 8 + k.atk * 18 + (k.broken ? 30 : 0);
  const flap = 0.5 + 0.5 * Math.cos(k.t * (k.atk || k.cast ? 11 : 5.5) + k.seed);
  const fl = k.broken ? 0.2 : flap;
  if (o.mother) {
    // brood: little glowing moths orbiting
    for (let i = 0; i < 7; i++) {
      const a = k.t * (0.6 + hash(i) * 0.4) + (i * TAU) / 7;
      const bx = Math.cos(a) * (110 + hash(i + 2) * 30);
      const by = hy - 20 + Math.sin(a) * 50;
      glow(ctx, bx, by, 12, '#f6e7a8', 0.5);
      ctx.fillStyle = k.c('#f8f0d0');
      ell(ctx, bx, by, 4 + Math.abs(Math.sin(k.t * 12 + i)) * 4, 2.5);
      ctx.fill();
    }
  }
  if (o.mother) {
    // the Mother herself is half again as large as her children
    ctx.save();
    ctx.translate(0, hy);
    ctx.scale(1.45, 1.45);
    ctx.translate(0, -hy);
  }
  ctx.save();
  ctx.translate(6, hy);
  mothWing(ctx, k, o, true, -0.15 - 0.55 * fl, 0.7 + 0.3 * fl, true);
  mothWing(ctx, k, o, false, 0.2 + 0.3 * fl, 0.8 + 0.2 * fl, true);
  ctx.restore();
  // abdomen
  ell(ctx, 10, hy + 22, 11, 26, -0.35);
  paint(ctx, k, o.body, 0, hy, 22, hy + 48);
  ctx.strokeStyle = k.s(o.body, -0.4);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(10 + i * 2.5, hy + 10 + i * 9, 10, 3, -0.35, 0, Math.PI);
    ctx.stroke();
  }
  // thorax (fuzzy)
  circ(ctx, 0, hy, 15);
  paint(ctx, k, o.body, -15, hy - 15, 15, hy + 15);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    strand(ctx, k, Math.cos(a) * 13, hy + Math.sin(a) * 13, 5, a, o.body, 2, i, 0.2);
  }
  // head + antennae
  circ(ctx, -15, hy - 8, 9);
  paint(ctx, k, o.body, -24, hy - 17, -6, hy + 1);
  eye(ctx, k, -20, hy - 9, 3, o.eye, 1);
  for (let s = 0; s < 2; s++) {
    const tip = -32 - s * 6;
    ctx.beginPath();
    ctx.moveTo(-16, hy - 15);
    ctx.quadraticCurveTo(-24 - s * 4, hy - 42, tip, hy - (o.mother ? 64 : 48) + Math.sin(k.t * 2 + s) * 3);
    ctx.strokeStyle = k.s(o.body, -0.2);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    for (let i = 1; i < 6; i++) {
      const f = i / 6;
      const ax = -16 + (tip + 16) * f;
      const ay = hy - 15 - (o.mother ? 49 : 33) * f;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 5, ay + 3);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + 4, ay - 4);
      ctx.stroke();
    }
  }
  if (o.mother) {
    // crown
    poly(ctx, [-24, hy - 16, -22, hy - 28, -18, hy - 20, -14, hy - 30, -10, hy - 18]);
    flat(ctx, k, '#e8c86a');
    glow(ctx, -14, hy - 24, 16, '#ffe9a0', 0.5);
    glow(ctx, 0, hy, 30, '#ffe9a0', 0.25 + k.cast * 0.5);
  }
  ctx.save();
  ctx.translate(0, hy);
  mothWing(ctx, k, o, true, -0.05 - 0.6 * fl, 0.65 + 0.35 * fl, false);
  mothWing(ctx, k, o, false, 0.3 + 0.35 * fl, 0.75 + 0.25 * fl, false);
  ctx.restore();
  if (o.mother) ctx.restore();
}

// ------------------------------------------------------------------ needle spider (seam crawler)

export function drawCrawler(ctx: Ctx, k: K, o: { cushion: string; needle: string; eye: string; thread: string }): void {
  const by = -58 + Math.sin(k.t * 5 + k.seed) * 2 - k.wind * 6 + k.atk * 4 + (k.broken ? 14 : 0);
  const walk = k.t * (k.atk ? 16 : 5) + k.seed;
  const legs = (far: boolean): void => {
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const ax = side * (10 + (i % 2) * 12);
      const ph = walk + i * 1.6 + (far ? 0.8 : 0);
      const fx = side * (52 + (i % 2) * 22) + Math.sin(ph) * 8 - k.atk * (side < 0 ? 20 : 0);
      const kx = ax + side * 22;
      const ky = by - 34 - Math.cos(ph) * 4;
      ctx.beginPath();
      ctx.moveTo(ax, by);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, -Math.max(0, Math.sin(ph)) * 6);
      ctx.strokeStyle = far ? k.s(o.needle, -0.35) : k.c(o.needle);
      ctx.lineWidth = far ? 2.4 : 3;
      ctx.stroke();
      // the needle's eye at the knee
      ell(ctx, kx, ky, 2.2, 4, side * 0.4);
      ctx.strokeStyle = k.s(o.needle, -0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  legs(true);
  // trailing thread
  strand(ctx, k, 26, by + 6, 60, 0.1, o.thread, 1.6, 0, 0.25);
  // pincushion body
  ell(ctx, 0, by, 32, 25);
  paint(ctx, k, o.cushion, -30, by - 25, 30, by + 25);
  ctx.strokeStyle = k.s(o.cushion, -0.45);
  ctx.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 10, by, 6, 24, 0, -Math.PI / 2, Math.PI / 2, i < 0);
    ctx.stroke();
  }
  rim(ctx, k, 0, by, 32, 25, o.cushion);
  // pins in the top
  const pinCols = ['#ffd84a', '#7fd1ff', '#ff7fb0', '#b7ff8a'];
  for (let i = 0; i < 5; i++) {
    const px = -18 + i * 9;
    const py = by - 20 + Math.abs(px) * 0.15;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (i - 2) * 3, py - 16);
    ctx.strokeStyle = k.c('#d9dde2');
    ctx.lineWidth = 1.4;
    ctx.stroke();
    circ(ctx, px + (i - 2) * 3, py - 17, 3);
    ctx.fillStyle = k.c(pinCols[i % 4]);
    ctx.fill();
  }
  // head
  circ(ctx, -32, by + 4, 11);
  paint(ctx, k, shade(o.cushion, -0.3), -43, by - 7, -21, by + 15);
  eye(ctx, k, -38, by + 1, 2.4, o.eye);
  eye(ctx, k, -31, by - 1, 2, o.eye);
  eye(ctx, k, -40, by + 6, 1.6, o.eye);
  // fangs (two pins)
  ctx.strokeStyle = k.c('#e6e9ee');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-38, by + 12);
  ctx.lineTo(-44 - k.atk * 6, by + 22);
  ctx.moveTo(-32, by + 13);
  ctx.lineTo(-34 - k.atk * 6, by + 24);
  ctx.stroke();
  legs(false);
}

// ------------------------------------------------------------------ the Seam-Eater (serpent of torn cloth)

const SERPENT_COLS = ['#6e3b6e', '#8a4f5e', '#4f4a7a', '#7a6a3e', '#5d3a52'];

export function drawSerpent(ctx: Ctx, k: K): void {
  const rear = k.wind * 14 - k.atk * 10;
  const segs = 22;
  // ground coils
  ell(ctx, 34, -10, 74, 15);
  ctx.strokeStyle = k.s('#5d3a52', -0.3);
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = k.c('#6e3b6e');
  ctx.lineWidth = 11;
  ctx.stroke();
  seam(ctx, k, [-36, -12, 0, -24, 40, -25, 90, -18, 108, -8], '#e8c86a', 1.4, 4);
  const pts: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const x = 104 - 168 * u + rear * u + Math.sin(u * 6 + k.t * 1.6) * 6 * (1 - u);
    const y = -10 - 102 * Math.pow(u, 1.15) + Math.sin(u * 7 + k.t * 2 + k.seed) * 9 * (1 - u * 0.6) - k.atk * 8 * u + (k.broken ? 30 * u : 0);
    pts.push(x, y);
  }
  for (let i = 0; i < segs; i++) {
    const u = i / segs;
    const x = pts[i * 2];
    const y = pts[i * 2 + 1];
    const r = 9 + 16 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.1));
    circ(ctx, x, y, r);
    paint(ctx, k, SERPENT_COLS[i % SERPENT_COLS.length], x - r, y - r, x + r, y + r);
    if (i % 2 === 0) stitches(ctx, k, x - r * 0.6, y - r * 0.6, x + r * 0.5, y + r * 0.6, 3, 2.4, '#e8c86a', 1.1);
    if (i % 3 === 1) {
      // torn fins
      const a = -Math.PI / 2 - 0.4 + Math.sin(k.t * 3 + i) * 0.25;
      poly(ctx, [x - 4, y - r * 0.8, x + Math.cos(a) * (r + 14), y + Math.sin(a) * (r + 14), x + 6, y - r * 0.7]);
      flat(ctx, k, '#b0748a');
    }
  }
  // head
  const hx = pts[segs * 2] - 6;
  const hy = pts[segs * 2 + 1] - 4;
  const jaw = 0.15 + k.atk * 0.6 + k.wind * 0.3 + k.cast * 0.4;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.save();
  ctx.translate(-6, 8);
  ctx.rotate(-jaw);
  poly(ctx, [4, -2, -42, 4, -38, 16, 0, 14]);
  paint(ctx, k, '#5d3a52', -42, -2, 4, 16);
  ctx.fillStyle = k.c('#dfe3ea');
  for (let i = 0; i < 6; i++) {
    poly(ctx, [-6 - i * 6, 2, -8 - i * 6, -8, -10 - i * 6, 2]);
    ctx.fill();
  }
  ctx.restore();
  glow(ctx, -24, 6, 22, '#ff9a6a', 0.3 + jaw * 0.6);
  ell(ctx, 0, -4, 32, 22);
  paint(ctx, k, '#7d4a6a', -32, -26, 32, 18);
  poly(ctx, [-14, -14, -52, -4, -46, 6, -10, 10]);
  paint(ctx, k, '#7d4a6a', -52, -14, -10, 10);
  ctx.fillStyle = k.c('#dfe3ea');
  for (let i = 0; i < 6; i++) {
    poly(ctx, [-14 - i * 6, 8, -16 - i * 6, 17, -18 - i * 6, 8]);
    ctx.fill();
  }
  stitches(ctx, k, -8, -22, 8, 10, 5, 3.5, '#e8c86a', 1.6);
  eye(ctx, k, -16, -10, 4.5, '#ffcf5a', 1.2);
  eye(ctx, k, 4, -14, 3.5, '#ffcf5a', 1);
  for (let i = 0; i < 5; i++) strand(ctx, k, 20, -16 + i * 6, 24 + i * 4, -0.2 + i * 0.15, '#c9a0c0', 1.6, i);
  rim(ctx, k, 0, -4, 32, 22, '#7d4a6a');
  ctx.restore();
}

// ------------------------------------------------------------------ the Bobbin Mimic

export function drawMimic(ctx: Ctx, k: K): void {
  const hop = k.wind ? 0 : Math.abs(Math.sin(k.t * 2.6 + k.seed)) * 4;
  const by = -hop;
  const open = Math.max(0, 0.06 + Math.sin(k.t * 1.3 + k.seed) * 0.05 + k.wind * 0.35 + k.atk * 0.75 + k.cast * 0.5 + (k.broken ? 0.4 : 0));
  // little peg legs
  for (const lx of [-30, -10, 14, 32]) {
    ell(ctx, lx, by - 2, 6, 4);
    flat(ctx, k, '#6b4a2e');
  }
  // the box
  poly(ctx, [-44, by - 4, 44, by - 4, 46, by - 54, -46, by - 54]);
  paint(ctx, k, '#9a6a3c', -46, by - 54, 46, by);
  // wound thread band
  ctx.strokeStyle = k.c('#c0465a');
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-44, by - 14 - i * 8);
    ctx.lineTo(44, by - 16 - i * 8);
    ctx.stroke();
  }
  // metal bands
  for (const bx of [-34, 32]) {
    poly(ctx, [bx - 4, by - 4, bx + 4, by - 4, bx + 4, by - 54, bx - 4, by - 54]);
    paint(ctx, k, '#c9a35a', bx - 4, by - 54, bx + 4, by);
  }
  // spool flanges at the ends
  for (const fx of [-48, 48]) {
    ell(ctx, fx, by - 30, 8, 34);
    paint(ctx, k, '#7a5232', fx - 8, by - 64, fx + 8, by + 4);
  }
  // mouth
  ell(ctx, -2, by - 54, 42, 6 + open * 14);
  ctx.fillStyle = k.c('#2a1018');
  ctx.fill();
  ctx.fillStyle = k.c('#eef0f2');
  for (let i = 0; i < 9; i++) {
    poly(ctx, [-38 + i * 9, by - 54, -35 + i * 9, by - 62 - open * 4, -32 + i * 9, by - 54]);
    ctx.fill();
  }
  // tongue (a ribbon)
  if (open > 0.15) {
    ctx.beginPath();
    ctx.moveTo(-6, by - 56);
    ctx.quadraticCurveTo(-30, by - 60 - open * 20 + Math.sin(k.t * 9) * 4, -48 - open * 20, by - 50 + Math.sin(k.t * 7) * 6);
    ctx.strokeStyle = k.c('#e0506e');
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  // lid (hinged at the back)
  ctx.save();
  ctx.translate(44, by - 54);
  ctx.rotate(-open * 1.1);
  poly(ctx, [0, 0, -90, 0, -88, -18, -2, -22]);
  paint(ctx, k, '#a8763f', -90, -22, 0, 0);
  ctx.fillStyle = k.c('#eef0f2');
  for (let i = 0; i < 9; i++) {
    poly(ctx, [-84 + i * 9, 0, -81 + i * 9, 7, -78 + i * 9, 0]);
    ctx.fill();
  }
  ell(ctx, -45, -10, 10, 7);
  flat(ctx, k, '#c9a35a');
  ctx.restore();
  // the eye peeking out
  if (open > 0.04) eye(ctx, k, -14, by - 56 - open * 8, 4, '#ffd24a', 1.3);
}

// ------------------------------------------------------------------ Bobbin NPCs

export function drawBobbin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, o: { t: number; face: 1 | -1; palette?: string[]; talking?: boolean; walk?: number }): void {
  const k = makeK({ t: o.t, anim: 'idle', p: 0, flash: 0, seed: (x * 0.013) % 7 }, scale);
  const [thread = '#c0465a', wood = '#c89a62', accent = '#f2d27a'] = o.palette ?? [];
  const f = o.face;
  const walking = (o.walk ?? 0) !== 0;
  const step = walking ? (o.walk ?? 0) * 9 : 0;
  const bob = walking ? -Math.abs(Math.sin(step)) * 3 : Math.sin(o.t * 2.2 + k.seed) * 0.8;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // shadow
  ell(ctx, 0, 0, 16, 3.5);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fill();
  // feet
  ell(ctx, -6 + (walking ? Math.sin(step) * 3 : 0), -2, 5, 3);
  flat(ctx, k, '#5a3d24');
  ell(ctx, 6 - (walking ? Math.sin(step) * 3 : 0), -2, 5, 3);
  flat(ctx, k, '#5a3d24');
  ctx.translate(0, bob);
  // bottom flange
  ell(ctx, 0, -7, 15, 4.5);
  paint(ctx, k, wood, -15, -12, 15, -2);
  // wound core
  poly(ctx, [-9, -8, 9, -8, 9, -31, -9, -31]);
  paint(ctx, k, thread, -9, -31, 9, -8);
  ctx.strokeStyle = k.s(thread, 0.3);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-9, -11 - i * 3.6);
    ctx.lineTo(9, -12 - i * 3.6);
    ctx.stroke();
  }
  // arms
  const wave = o.talking ? Math.sin(o.t * 8) * 0.6 : Math.sin(o.t * 1.5 + k.seed) * 0.15;
  ctx.strokeStyle = k.c(wood);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, -22);
  ctx.lineTo(-16, -14 - wave * 8);
  ctx.moveTo(9, -22);
  ctx.lineTo(16, -14 + (o.talking ? wave * 10 : 0));
  ctx.stroke();
  circ(ctx, -16, -14 - wave * 8, 2.4);
  flat(ctx, k, wood);
  circ(ctx, 16, -14 + (o.talking ? wave * 10 : 0), 2.4);
  flat(ctx, k, wood);
  // top flange
  ell(ctx, 0, -32, 15, 4.5);
  paint(ctx, k, wood, -15, -37, 15, -27);
  // head
  circ(ctx, 0, -46, 12);
  paint(ctx, k, shade(wood, 0.12), -12, -58, 12, -34);
  rim(ctx, k, 0, -46, 12, 12, wood, 0.5);
  // tuft
  for (let i = 0; i < 4; i++) strand(ctx, k, -3 + i * 2, -57, 7 + i, -Math.PI / 2 + (i - 1.5) * 0.35, accent, 1.6, i, 0.3);
  // face
  const ex = f * 4;
  button(ctx, k, ex - 4, -47, 2.6, '#2b2230');
  button(ctx, k, ex + 4, -47, 2.6, '#2b2230');
  ell(ctx, ex, -40, 2.4, o.talking ? 1 + Math.abs(Math.sin(o.t * 14)) * 1.8 : 0.8);
  ctx.fillStyle = k.c('#5a2a2a');
  ctx.fill();
  ell(ctx, ex - 7, -42, 2, 1.2);
  ctx.fillStyle = 'rgba(230,120,120,0.35)';
  ctx.fill();
  ell(ctx, ex + 7, -42, 2, 1.2);
  ctx.fill();
  ctx.restore();
}


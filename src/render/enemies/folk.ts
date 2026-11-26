// Figures: scarecrows (and Old Tatter), the drowned (and the Lamplighter), reedlurkers, Shears, echoes, frayed and
// hollow knights, gale shrouds, wisps, and the swarm of ledger pages.
import { TAU, circ, ell, eye, flat, glow, hash, paint, poly, rim, seam, shade, stitches, strand, type Ctx, type K } from './kit';

// ------------------------------------------------------------------ scarecrows

export interface ScareOpt {
  coat: string;
  sack: string;
  straw: string;
  eye: string;
  patch: string;
  lord?: boolean;
}

function miniCrow(ctx: Ctx, k: K, x: number, y: number, s: number, ph: number, dark: boolean): void {
  const f = Math.sin(k.t * 10 + ph) * 0.8;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const col = dark ? '#1c1822' : '#2c2533';
  ell(ctx, 0, 0, 9, 5, -0.2);
  ctx.fillStyle = k.c(col);
  ctx.fill();
  circ(ctx, -8, -3, 4);
  ctx.fill();
  poly(ctx, [-11, -4, -17, -2, -11, -1]);
  ctx.fillStyle = k.c('#c9a35a');
  ctx.fill();
  ctx.fillStyle = k.c(col);
  poly(ctx, [0, -1, 8, -14 - f * 8, 16, -8 - f * 6, 6, 2]);
  ctx.fill();
  circ(ctx, -9, -4, 1.1);
  ctx.fillStyle = k.c('#ffe08a');
  ctx.fill();
  ctx.restore();
}

export function drawScarecrow(ctx: Ctx, k: K, o: ScareOpt): void {
  const L = o.lord ? 1.12 : 1;
  const sway = Math.sin(k.t * 1.3 + k.seed) * 0.04 + k.wind * 0.06 - k.atk * 0.08 + (k.broken ? 0.12 : 0);
  // orbiting crows (behind)
  const crowsAt = (front: boolean): void => {
    if (!o.lord) return;
    for (let i = 0; i < 6; i++) {
      const a = k.t * (0.7 + i * 0.06) + (i * TAU) / 6 + (k.cast ? k.t * 2 : 0);
      const z = Math.sin(a);
      if (front !== z > 0) continue;
      const rx = 92 + (i % 3) * 18 + k.cast * 30;
      miniCrow(ctx, k, Math.cos(a) * rx, -150 + z * 18 + Math.sin(k.t * 3 + i) * 6, 0.9 + z * 0.25, i, !front);
    }
  };
  crowsAt(false);
  ctx.save();
  ctx.rotate(sway);
  // pole
  poly(ctx, [-4, 0, 4, 0, 3, -150 * L, -3, -150 * L]);
  paint(ctx, k, '#6b4a2e', -4, -150, 4, 0);
  if (o.lord) {
    // the great patchwork cloak
    const billow = Math.sin(k.t * 1.8 + k.seed) * 8;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-38, -138);
    ctx.quadraticCurveTo(-80 - billow, -70, -70 - billow, -4);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-70 - billow + i * 18 + billow * (i / 8) * 2, -4 - (i % 2 ? 12 : 0) + Math.sin(k.t * 3 + i) * 3);
    ctx.quadraticCurveTo(84 + billow, -70, 38, -138);
    ctx.closePath();
    paint(ctx, k, o.coat, -80, -140, 80, 0);
    ctx.clip();
    const pc = ['#7a4a3a', '#4a5a3a', '#6a4a6a', '#8a6a3a', '#3a4a6a', '#7a3a3a'];
    for (let i = 0; i < 14; i++) {
      const px = -70 + (i % 5) * 32 + hash(i, 2) * 10;
      const py = -130 + Math.floor(i / 5) * 42 + hash(i, 5) * 10;
      poly(ctx, [px, py, px + 26, py + 3, px + 24, py + 30, px - 2, py + 28]);
      flat(ctx, k, pc[i % pc.length], false);
      ctx.strokeStyle = k.c('#d9c38a');
      ctx.lineWidth = 1.1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  // coat
  const sh = -124 * L;
  poly(ctx, [-30, sh, 30, sh, 26, -62 * L, 20, -56 * L, 14, -62 * L, 6, -55 * L, -2, -62 * L, -10, -55 * L, -18, -62 * L, -26, -56 * L]);
  paint(ctx, k, o.coat, -30, sh, 30, -55);
  // patches
  poly(ctx, [10, -110 * L, 24, -108 * L, 22, -94 * L, 9, -96 * L]);
  flat(ctx, k, o.patch);
  stitches(ctx, k, 10, -110 * L, 23, -108 * L, 3, 1.8, '#e8d9a8', 1);
  // the straw heart (weak point)
  const hx = 0;
  const hy = -95 * (o.lord ? 1.16 : 1);
  glow(ctx, hx, hy, 18, '#ffb347', 0.35 + k.wind * 0.5 + Math.sin(k.t * 3) * 0.08);
  ctx.beginPath();
  ctx.moveTo(hx, hy + 9);
  ctx.bezierCurveTo(hx - 14, hy - 2, hx - 8, hy - 12, hx, hy - 5);
  ctx.bezierCurveTo(hx + 8, hy - 12, hx + 14, hy - 2, hx, hy + 9);
  flat(ctx, k, '#e8b84a');
  // rope belt
  ctx.strokeStyle = k.c('#b8955a');
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-27, -72 * L);
  ctx.lineTo(27, -74 * L);
  ctx.stroke();
  // arms on the crossbar
  ctx.strokeStyle = k.c('#6b4a2e');
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-60, sh + 6);
  ctx.lineTo(60, sh + 6);
  ctx.stroke();
  // back sleeve
  poly(ctx, [24, sh - 2, 62, sh + 2, 60, sh + 16, 24, sh + 14]);
  paint(ctx, k, shade(o.coat, -0.15), 24, sh, 62, sh + 16);
  for (let i = 0; i < 5; i++) strand(ctx, k, 61, sh + 4 + i * 3, 10, 0.3 + i * 0.15, o.straw, 2, i, 0.2);
  // front arm + scythe (rotates on windup / attack)
  const armA = -0.15 + k.wind * 0.9 - k.atk * 1.7;
  ctx.save();
  ctx.translate(-24, sh + 6);
  ctx.rotate(armA);
  poly(ctx, [0, -8, -38, -6, -38, 8, 0, 8]);
  paint(ctx, k, o.coat, -38, -8, 0, 8);
  for (let i = 0; i < 5; i++) strand(ctx, k, -38, -4 + i * 3, 9, Math.PI + 0.3 - i * 0.15, o.straw, 2, i, 0.2);
  // scythe
  const sL = o.lord ? 110 : 84;
  ctx.strokeStyle = k.c('#5a3d24');
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-34, 30);
  ctx.lineTo(-40, -sL + 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-40, -sL + 30);
  ctx.quadraticCurveTo(-90, -sL + 10, -112, -sL + 58);
  ctx.quadraticCurveTo(-84, -sL + 30, -40, -sL + 40);
  ctx.closePath();
  paint(ctx, k, '#b9c2c9', -112, -sL + 10, -40, -sL + 58);
  ctx.restore();
  // neck rope + head
  const hdY = -142 * L;
  ell(ctx, 0, hdY, 21 * L, 23 * L);
  paint(ctx, k, o.sack, -21, hdY - 23, 21, hdY + 23);
  rim(ctx, k, 0, hdY, 21 * L, 23 * L, o.sack);
  ctx.strokeStyle = k.s(o.sack, -0.25);
  ctx.lineWidth = 0.8;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, hdY - 20);
    ctx.lineTo(i * 5 + 2, hdY + 20);
    ctx.stroke();
  }
  stitches(ctx, k, -14, hdY + 10, 6, hdY + 12, 5, 2.4, '#3a2a20', 1.3);
  ell(ctx, -10, hdY - 3, 4.5, 4);
  ctx.fillStyle = k.c('#1a1214');
  ctx.fill();
  ell(ctx, 4, hdY - 4, 4, 3.6);
  ctx.fill();
  eye(ctx, k, -10, hdY - 3, 2.2, o.eye, 1.3);
  eye(ctx, k, 4, hdY - 4, 2, o.eye, 1.3);
  ctx.strokeStyle = k.c('#b8955a');
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, hdY + 20);
  ctx.lineTo(14, hdY + 20);
  ctx.stroke();
  for (let i = 0; i < 6; i++) strand(ctx, k, -10 + i * 4, hdY + 22, 8, Math.PI / 2 + (i - 2.5) * 0.2, o.straw, 1.8, i, 0.2);
  // hat
  if (o.lord) {
    poly(ctx, [-18, hdY - 18, 16, hdY - 20, 20, hdY - 66, -12, hdY - 70]);
    paint(ctx, k, '#2a2430', -18, hdY - 70, 20, hdY - 18);
    ell(ctx, 0, hdY - 18, 34, 7, -0.05);
    paint(ctx, k, '#2a2430', -34, hdY - 25, 34, hdY - 11);
    poly(ctx, [-16, hdY - 30, 18, hdY - 32, 18, hdY - 38, -16, hdY - 36]);
    flat(ctx, k, '#7a2a2a');
    // a crow perched on the brim
    miniCrow(ctx, k, 22, hdY - 26, 1.1, 9, false);
  } else {
    ell(ctx, 0, hdY - 16, 30, 6, -0.1);
    paint(ctx, k, '#c9a85a', -30, hdY - 22, 30, hdY - 10);
    poly(ctx, [-14, hdY - 18, 12, hdY - 20, 8, hdY - 38, -10, hdY - 36]);
    paint(ctx, k, '#c9a85a', -14, hdY - 38, 12, hdY - 18);
    for (let i = 0; i < 6; i++) strand(ctx, k, -26 + i * 10, hdY - 14, 7, Math.PI / 2 + 0.3, o.straw, 1.5, i, 0.3);
  }
  ctx.restore();
  crowsAt(true);
}

// ------------------------------------------------------------------ the drowned

export interface DrownedOpt {
  wrap: string;
  skin: string;
  glow: string;
  hair: string;
  lamp?: boolean;
}

function drips(ctx: Ctx, k: K, xs: number[], y0: number, fall: number, col: string): void {
  ctx.fillStyle = k.a(col, 0.7);
  for (let i = 0; i < xs.length; i++) {
    const f = (k.t * 0.8 + i * 0.37 + k.seed) % 1;
    ell(ctx, xs[i], y0 + f * fall, 1.6, 2.6);
    ctx.fill();
  }
}

export function drawDrowned(ctx: Ctx, k: K, o: DrownedOpt): void {
  if (o.lamp) return drawLamplighter(ctx, k, o);
  const sway = Math.sin(k.t * 1.2 + k.seed) * 3;
  // puddle
  ell(ctx, 0, -1, 44, 7);
  ctx.fillStyle = k.a('#1e3a44', 0.55);
  ctx.fill();
  const reach = k.atk;
  // back arm
  ctx.beginPath();
  ctx.moveTo(10, -104);
  ctx.quadraticCurveTo(-2 - reach * 30, -60, -20 - reach * 50, -28 - reach * 40);
  ctx.strokeStyle = k.c(shade(o.wrap, -0.3));
  ctx.lineWidth = 9;
  ctx.stroke();
  // hunched body
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.quadraticCurveTo(-30, -60, -24 + sway, -104);
  ctx.quadraticCurveTo(4 + sway, -134, 26 + sway, -112);
  ctx.quadraticCurveTo(38, -60, 28, 0);
  ctx.closePath();
  paint(ctx, k, o.wrap, -30, -130, 38, 0);
  // wet bands
  ctx.strokeStyle = k.s(o.wrap, 0.25);
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(-28, -12 - i * 15);
    ctx.quadraticCurveTo(0, -4 - i * 15 + sway * 0.3, 32, -22 - i * 15);
    ctx.stroke();
  }
  // head, drooping forward
  const hx = -30 + sway - reach * 8;
  const hy = -116 + k.wind * 4;
  circ(ctx, hx, hy, 15);
  paint(ctx, k, o.skin, hx - 15, hy - 15, hx + 15, hy + 15);
  for (let i = 0; i < 9; i++) strand(ctx, k, hx - 12 + i * 3.2, hy - 10, 30 + hash(i, k.seed) * 18, Math.PI / 2 + 0.15, o.hair, 2, i, 0.15);
  eye(ctx, k, hx - 7, hy + 2, 2.6, o.glow, 1.2 + k.wind);
  // front arm reaching
  ctx.beginPath();
  ctx.moveTo(-14 + sway, -100);
  ctx.quadraticCurveTo(-30 - reach * 40, -60 - reach * 20, -36 - reach * 60, -24 - reach * 50);
  ctx.strokeStyle = k.c(o.wrap);
  ctx.lineWidth = 10;
  ctx.stroke();
  for (let i = 0; i < 3; i++) strand(ctx, k, -36 - reach * 60, -24 - reach * 50, 12, Math.PI / 2 - 0.4 + i * 0.4, o.skin, 2.2, i, 0.2);
  drips(ctx, k, [-36, -20, 6, hx - 6], -60, 60, '#9fd0e0');
}

function drawLamplighter(ctx: Ctx, k: K, o: DrownedOpt): void {
  const billow = Math.sin(k.t * 1.4 + k.seed) * 6;
  const swing = Math.sin(k.t * 1.8 + k.seed) * 0.35 + k.atk * 1.2 - k.wind * 0.4;
  ell(ctx, 0, -1, 60, 9);
  ctx.fillStyle = k.a('#16303a', 0.6);
  ctx.fill();
  // long coat
  ctx.beginPath();
  ctx.moveTo(-18, -150);
  ctx.lineTo(24, -150);
  ctx.quadraticCurveTo(46, -70, 58 + billow, -6);
  for (let i = 0; i <= 6; i++) ctx.lineTo(58 + billow - i * 18 - (billow * i) / 6, -6 - (i % 2 ? 10 : 0));
  ctx.quadraticCurveTo(-40, -70, -18, -150);
  ctx.closePath();
  paint(ctx, k, o.wrap, -48, -150, 60, 0);
  seam(ctx, k, [2, -148, 4, -90, 6, -20], '#d9c38a', 1.4, 5);
  for (let i = 0; i < 6; i++) strand(ctx, k, -40 + i * 18, -8, 18 + hash(i) * 14, Math.PI / 2 + 0.2, o.hair, 1.6, i, 0.25);
  // pole: lower end behind, through the hand, up to the tip
  const hand = [-40 + k.atk * -12, -112 - k.wind * 6];
  const tip = [-92 - k.atk * 20, -200 + k.wind * 4];
  ctx.strokeStyle = k.c('#3a2a1e');
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-14, -44);
  ctx.lineTo(tip[0], tip[1]);
  ctx.stroke();
  // arm
  ctx.strokeStyle = k.c(shade(o.wrap, 0.08));
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-10, -140);
  ctx.quadraticCurveTo(-28, -128, hand[0], hand[1]);
  ctx.stroke();
  circ(ctx, hand[0], hand[1], 5);
  flat(ctx, k, o.skin);
  // soul lanterns
  const lantern = (ax: number, ay: number, len: number, ang: number, s: number, i: number): void => {
    const lx = ax + Math.sin(ang) * len;
    const ly = ay + Math.cos(ang) * len;
    ctx.strokeStyle = k.c('#8a7a6a');
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lx, ly - 10 * s);
    ctx.stroke();
    glow(ctx, lx, ly, 34 * s, o.glow, 0.55 + k.cast * 0.6 + Math.sin(k.t * 4 + i) * 0.08);
    poly(ctx, [lx - 8 * s, ly - 10 * s, lx + 8 * s, ly - 10 * s, lx + 6 * s, ly + 10 * s, lx - 6 * s, ly + 10 * s]);
    ctx.fillStyle = k.a('#dff6ff', 0.55);
    ctx.fill();
    ctx.strokeStyle = k.c('#3a2a1e');
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // a little soul inside
    circ(ctx, lx, ly, 4.5 * s);
    ctx.fillStyle = k.c('#ffffff');
    ctx.fill();
    ctx.fillStyle = k.c('#4a6a8a');
    circ(ctx, lx - 1.5 * s, ly - 0.5 * s, 0.9 * s);
    ctx.fill();
    circ(ctx, lx + 1.5 * s, ly - 0.5 * s, 0.9 * s);
    ctx.fill();
  };
  lantern(tip[0], tip[1], 40, swing, 1.2, 0);
  lantern(-66 - k.atk * 14, -158, 30, swing * 1.3 + 0.2, 1, 1);
  // head under the brim
  circ(ctx, 2, -160, 13);
  paint(ctx, k, o.skin, -11, -173, 15, -147);
  ell(ctx, 2, -160, 11, 9);
  ctx.fillStyle = k.a('#0c1418', 0.75);
  ctx.fill();
  eye(ctx, k, -3, -160, 2.2, o.glow, 1.4);
  eye(ctx, k, 6, -160, 2, o.glow, 1.4);
  ell(ctx, 2, -170, 40, 7, -0.06);
  paint(ctx, k, '#24323a', -38, -177, 42, -163);
  poly(ctx, [-14, -172, 18, -174, 14, -196, -10, -194]);
  paint(ctx, k, '#24323a', -14, -196, 18, -172);
  drips(ctx, k, [-30, 40, 20, -8, 50], -110, 100, '#9fd0e0');
}

// ------------------------------------------------------------------ reedlurker

export function drawReed(ctx: Ctx, k: K, o: { reed: string; head: string; eye: string; bind: string }): void {
  const sway = Math.sin(k.t * 1.5 + k.seed) * 4;
  const crouch = k.wind * 16 - k.atk * 6;
  const hipY = -80 + crouch;
  for (let s = -1; s <= 1; s += 2) {
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(s * 6 + j * 2, hipY);
      ctx.quadraticCurveTo(s * 18 + j, hipY + 40, s * 12 + j * 2 - k.atk * 10, 0);
      ctx.strokeStyle = k.s(o.reed, -0.15 + j * 0.1);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  // body bundle
  for (let i = 0; i < 9; i++) {
    const bx = -14 + i * 3.5;
    ctx.beginPath();
    ctx.moveTo(bx, hipY + 4);
    ctx.quadraticCurveTo(bx + sway * 0.5, hipY - 40, bx * 0.7 + sway, hipY - 82);
    ctx.strokeStyle = k.s(o.reed, -0.2 + (i % 3) * 0.12);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  for (const by of [hipY - 10, hipY - 46]) {
    ell(ctx, sway * 0.5, by, 17, 5);
    ctx.strokeStyle = k.c(o.bind);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  // leaves
  for (let i = 0; i < 4; i++) {
    const lx = i % 2 ? 10 : -10;
    const ly = hipY - 20 - i * 14;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(lx + (i % 2 ? 24 : -24), ly - 10, lx + (i % 2 ? 34 : -30) + Math.sin(k.t * 2 + i) * 6, ly - 30);
    ctx.strokeStyle = k.c('#6f8a4a');
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  // whip arms
  for (let a = 0; a < 2; a++) {
    const sx = -6 + sway;
    const sy = hipY - 70;
    const ex = -70 - k.atk * 70 + a * 14 + Math.sin(k.t * 2 + a) * 8;
    const ey = hipY - 30 - k.wind * 40 + k.atk * 30 + a * 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - 30, sy - 30 + k.wind * -20, ex, ey);
    ctx.strokeStyle = k.s(o.reed, a ? -0.25 : 0);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // cattail head
  const hx = -4 + sway;
  const hy = hipY - 98;
  ell(ctx, hx, hy, 10, 22);
  paint(ctx, k, o.head, hx - 10, hy - 22, hx + 10, hy + 22);
  ctx.strokeStyle = k.s(o.head, 0.2);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 14 + i * 7);
    ctx.lineTo(hx + 8, hy - 12 + i * 7);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(hx, hy - 22);
  ctx.lineTo(hx + 2, hy - 36);
  ctx.strokeStyle = k.c(o.reed);
  ctx.lineWidth = 2;
  ctx.stroke();
  eye(ctx, k, hx - 7, hy + 24, 2.4, o.eye, 1.2);
  eye(ctx, k, hx + 1, hy + 25, 2.2, o.eye, 1.2);
}

// ------------------------------------------------------------------ Shears (acolyte, knight)

export interface ShearOpt {
  robe: string;
  trim: string;
  metal: string;
  mask: string;
  knight?: boolean;
}

function scissors(ctx: Ctx, k: K, x: number, y: number, len: number, open: number, metal: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * open * 0.5);
    poly(ctx, [0, -3, -len, -1 * s, -len * 0.98, 2 * s, 0, 4]);
    paint(ctx, k, metal, -len, -4, 0, 4);
    ctx.beginPath();
    ctx.ellipse(16, s * 7, 9, 6, 0, 0, TAU);
    ctx.strokeStyle = k.c('#c9a35a');
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  circ(ctx, 0, 0, 3.5);
  flat(ctx, k, '#c9a35a');
  ctx.restore();
}

export function drawShear(ctx: Ctx, k: K, o: ShearOpt): void {
  const sway = Math.sin(k.t * 1.6 + k.seed) * 2;
  // robe
  ctx.beginPath();
  ctx.moveTo(-22, -128);
  ctx.lineTo(22, -128);
  ctx.quadraticCurveTo(34, -60, 36 + sway, 0);
  ctx.lineTo(-34 + sway, 0);
  ctx.quadraticCurveTo(-32, -60, -22, -128);
  ctx.closePath();
  paint(ctx, k, o.robe, -34, -128, 36, 0);
  ctx.strokeStyle = k.c(o.trim);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-33 + sway, -4);
  ctx.lineTo(35 + sway, -4);
  ctx.moveTo(-2, -126);
  ctx.lineTo(-1 + sway * 0.5, -2);
  ctx.stroke();
  stitches(ctx, k, -2, -116, -1, -14, 8, 2.4, o.trim, 1);
  if (o.knight) {
    // breastplate + pauldrons
    poly(ctx, [-24, -128, 24, -128, 20, -78, 0, -70, -20, -78]);
    paint(ctx, k, o.metal, -24, -128, 24, -70);
    rim(ctx, k, 0, -104, 24, 30, o.metal);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 24, -124, 15, 10, s * 0.3, Math.PI, TAU);
      ctx.closePath();
      paint(ctx, k, o.metal, s * 24 - 15, -134, s * 24 + 15, -118);
    }
  }
  // arms toward the scissors
  ctx.strokeStyle = k.c(shade(o.robe, -0.1));
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-14, -118);
  ctx.quadraticCurveTo(-30, -98, -40 - k.atk * 16, -92);
  ctx.moveTo(14, -118);
  ctx.quadraticCurveTo(0, -94, -30 - k.atk * 16, -86);
  ctx.stroke();
  // head: hood + porcelain mask, or a crested helm
  const hy = -144;
  if (o.knight) {
    poly(ctx, [-14, hy + 14, 14, hy + 14, 15, hy - 12, 0, hy - 20, -15, hy - 12]);
    paint(ctx, k, o.metal, -15, hy - 20, 15, hy + 14);
    for (let i = 0; i < 7; i++) strand(ctx, k, 0, hy - 18, 20 + i * 2, -Math.PI / 2 + 0.6 + i * 0.12, o.trim, 2, i, 0.15);
    ctx.fillStyle = k.c('#120c10');
    poly(ctx, [-12, hy - 2, 10, hy - 2, 10, hy + 2, -12, hy + 2]);
    ctx.fill();
    glow(ctx, -6, hy, 10, '#ffd36a', 0.6 + k.wind * 0.6);
  } else {
    poly(ctx, [-18, hy + 18, 18, hy + 18, 16, hy - 6, 0, hy - 26, -16, hy - 6]);
    paint(ctx, k, o.robe, -18, hy - 26, 18, hy + 18);
    ell(ctx, -3, hy + 2, 10, 13);
    paint(ctx, k, o.mask, -13, hy - 11, 7, hy + 15);
    ctx.fillStyle = k.c('#1a1418');
    poly(ctx, [-4, hy - 7, -2, hy - 7, -2, hy + 9, -4, hy + 9]);
    ctx.fill();
    glow(ctx, -3, hy + 1, 9, '#ffe7a0', 0.4 + k.wind * 0.7 + k.cast * 0.7);
  }
  const open = 0.15 + k.wind * 0.75 * (1 - k.atk) + Math.sin(k.t * 2 + k.seed) * 0.04;
  scissors(ctx, k, -36 - k.atk * 18, -90, o.knight ? 84 : 70, k.atk > 0.5 ? 0.02 : open, o.metal);
}

// ------------------------------------------------------------------ echoes (memories of the lost)

export function drawEcho(ctx: Ctx, k: K, o: { cloth: string; skin: string; glow: string }): void {
  const skip = hash(Math.floor(k.t * 0.7), k.seed) > 0.75 ? 4 : 0;
  ctx.save();
  ctx.globalAlpha *= 0.5 + 0.15 * Math.sin(k.t * 3 + k.seed) + (k.atk ? 0.25 : 0);
  ctx.translate(skip, 0);
  glow(ctx, 0, -80, 70, o.glow, 0.25);
  ctx.setLineDash([4, 3]);
  // dress
  ctx.beginPath();
  ctx.moveTo(-16, -102);
  ctx.lineTo(16, -102);
  ctx.lineTo(28, 0);
  ctx.lineTo(-28, 0);
  ctx.closePath();
  paint(ctx, k, o.cloth, -28, -102, 28, 0);
  // basket arm
  ctx.beginPath();
  ctx.moveTo(-12, -94);
  ctx.quadraticCurveTo(-30 - k.atk * 20, -76, -26 - k.atk * 30, -62);
  ctx.strokeStyle = k.c(o.cloth);
  ctx.lineWidth = 6;
  ctx.stroke();
  ell(ctx, -28 - k.atk * 30, -56, 13, 8);
  paint(ctx, k, '#c9b89a', -41, -64, -15, -48);
  ctx.setLineDash([]);
  // head
  circ(ctx, 0, -118, 13);
  paint(ctx, k, o.skin, -13, -131, 13, -105);
  circ(ctx, 8, -128, 7);
  paint(ctx, k, o.cloth, 1, -135, 15, -121);
  ctx.strokeStyle = k.s(o.skin, -0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(-6, -118, 2.4, 0.2, Math.PI - 0.2);
  ctx.moveTo(1, -118);
  ctx.arc(3, -118, 2.4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
  // threads drifting off
  for (let i = 0; i < 5; i++) {
    const f = (k.t * 0.25 + i * 0.2 + k.seed) % 1;
    strand(ctx, k, -14 + i * 7, -100 - f * 60, 12, -Math.PI / 2 + 0.3, o.glow, 1.2, i);
  }
}

// ------------------------------------------------------------------ knights (frayed, hollow)

export interface KnightOpt {
  metal: string;
  cloth: string;
  thread: string;
  eye: string;
  ghost?: boolean;
  weapon: 'sword' | 'needle';
}

export function drawKnight(ctx: Ctx, k: K, o: KnightOpt): void {
  ctx.save();
  if (o.ghost) {
    ctx.globalAlpha *= 0.62 + 0.1 * Math.sin(k.t * 2 + k.seed);
    glow(ctx, 0, -90, 80, o.eye, 0.25);
  }
  const sway = Math.sin(k.t * 1.4 + k.seed) * 1.5;
  // tattered cape
  ctx.beginPath();
  ctx.moveTo(-14, -136);
  ctx.lineTo(20, -136);
  ctx.quadraticCurveTo(46, -70, 50 + sway * 3, -12);
  for (let i = 0; i < 5; i++) ctx.lineTo(50 - i * 12 + sway, -12 - (i % 2 ? 14 : 0));
  ctx.closePath();
  paint(ctx, k, o.cloth, -14, -136, 50, -12);
  // legs
  for (const s of [-1, 1]) {
    poly(ctx, [s * 6 - 8, 0, s * 6 + 8, 0, s * 8 + 7, -62, s * 8 - 7, -62]);
    paint(ctx, k, o.metal, s * 6 - 8, -62, s * 6 + 8, 0);
  }
  // thread spilling at the knees and waist
  for (let i = 0; i < 4; i++) strand(ctx, k, -10 + i * 7, -64, 14 + hash(i, k.seed) * 10, Math.PI / 2 + (i - 1.5) * 0.25, o.thread, 1.6, i);
  // torso
  poly(ctx, [-26, -132, 26, -132, 22, -72, 0, -66, -22, -72]);
  paint(ctx, k, o.metal, -26, -132, 26, -66);
  rim(ctx, k, 0, -100, 26, 34, o.metal);
  ctx.strokeStyle = k.s(o.metal, -0.4);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -130);
  ctx.lineTo(0, -70);
  ctx.moveTo(-18, -108);
  ctx.lineTo(18, -108);
  ctx.stroke();
  // a breach in the breastplate with thread pouring out
  ell(ctx, 8, -96, 7, 9);
  ctx.fillStyle = k.c('#160e12');
  ctx.fill();
  for (let i = 0; i < 4; i++) strand(ctx, k, 8, -96, 16 + i * 5, 0.5 + i * 0.3, o.thread, 1.4, i + 3);
  // pauldrons
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 26, -128, 14, 10, s * 0.3, Math.PI, TAU);
    ctx.closePath();
    paint(ctx, k, o.metal, s * 26 - 14, -138, s * 26 + 14, -122);
  }
  // helm
  const hy = -150;
  poly(ctx, [-13, hy + 14, 13, hy + 14, 14, hy - 10, 0, hy - 16, -14, hy - 10]);
  paint(ctx, k, o.metal, -14, hy - 16, 14, hy + 14);
  ctx.fillStyle = k.c('#0e0a0c');
  poly(ctx, [-13, hy - 1, 8, hy - 1, 8, hy + 3, -13, hy + 3]);
  ctx.fill();
  eye(ctx, k, -6, hy + 1, 2.4, o.eye, 1.3);
  // weapon arm
  const swing = -0.4 + k.wind * 1.2 - k.atk * 2.0;
  ctx.save();
  ctx.translate(-22, -122);
  ctx.rotate(swing);
  ctx.strokeStyle = k.c(o.metal);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-20, 26);
  ctx.stroke();
  if (o.weapon === 'sword') {
    poly(ctx, [-18, 24, -24, 30, -84, -30, -80, -36]);
    paint(ctx, k, '#c9d0d8', -84, -36, -18, 30);
    ctx.strokeStyle = k.c('#c9a35a');
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, 34);
    ctx.lineTo(-30, 20);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-6, 40);
    ctx.lineTo(-96, -40);
    ctx.strokeStyle = k.c('#dfe6f0');
    ctx.lineWidth = 4;
    ctx.stroke();
    ell(ctx, -10, 36, 3, 6, -0.8);
    ctx.strokeStyle = k.c('#8a96a8');
    ctx.lineWidth = 1.4;
    ctx.stroke();
    glow(ctx, -96, -40, 12, o.eye, 0.6);
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ gale shroud

export function drawShroud(ctx: Ctx, k: K, o: { cloth: string; eye: string; wind: string }): void {
  const hy = -40 + Math.sin(k.t * 1.6 + k.seed) * 8 - k.wind * 10 + (k.broken ? 24 : 0);
  const reach = k.atk;
  ctx.beginPath();
  ctx.moveTo(-28, hy - 110);
  ctx.quadraticCurveTo(0, hy - 150, 28, hy - 110);
  ctx.quadraticCurveTo(44, hy - 60, 60, hy - 10);
  for (let i = 0; i <= 7; i++) {
    const x = 60 - i * 15 - reach * i * 6;
    ctx.lineTo(x, hy + Math.sin(k.t * 4 + i * 1.1 + k.seed) * 10 - (i % 2 ? 10 : 0));
  }
  ctx.quadraticCurveTo(-46 - reach * 40, hy - 60, -28, hy - 110);
  ctx.closePath();
  paint(ctx, k, o.cloth, -50, hy - 140, 60, hy);
  rim(ctx, k, 0, hy - 100, 30, 40, o.cloth);
  // reaching flap
  ctx.beginPath();
  ctx.moveTo(-24, hy - 80);
  ctx.quadraticCurveTo(-60 - reach * 50, hy - 90 + Math.sin(k.t * 3) * 8, -70 - reach * 60, hy - 60);
  ctx.strokeStyle = k.c(shade(o.cloth, -0.1));
  ctx.lineWidth = 8;
  ctx.stroke();
  for (const ex of [-14, 6]) {
    ell(ctx, ex, hy - 112, 6, 9);
    ctx.fillStyle = k.c('#0e1218');
    ctx.fill();
    glow(ctx, ex, hy - 112, 12, o.eye, 0.45 + k.wind * 0.7);
  }
  // wind streaks
  ctx.strokeStyle = k.a(o.wind, 0.6);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const f = (k.t * 0.9 + i * 0.25) % 1;
    const x = 70 - f * 160;
    const y = hy - 130 + i * 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 20, y - 8, x - 40, y);
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ wisps (lantern wisp, driftlight, lost thread)

export interface WispOpt {
  bell: string;
  core: string;
  tendril: string;
  lantern?: boolean;
  thin?: boolean;
}

export function drawWisp(ctx: Ctx, k: K, o: WispOpt): void {
  const hy = -88 + Math.sin(k.t * 1.8 + k.seed) * 7 - k.wind * 6 + k.atk * 10 + (k.broken ? 30 : 0);
  const w = o.thin ? 17 : 30;
  const pulse = 1 + Math.sin(k.t * 3 + k.seed) * 0.05 + k.cast * 0.12;
  glow(ctx, 0, hy, 56 * pulse, o.core, 0.35 + k.cast * 0.5 + k.wind * 0.3);
  // tendrils
  const n = o.thin ? 2 : 6;
  for (let i = 0; i < n; i++) {
    const tx = -w * 0.75 + (i / Math.max(1, n - 1)) * w * 1.5;
    strand(ctx, k, tx, hy + 8, o.thin ? 70 + i * 20 : 34 + hash(i, k.seed) * 24, Math.PI / 2 + Math.sin(k.t + i) * 0.2, o.tendril, o.thin ? 1.4 : 2.2, i, 0.3);
  }
  // bell
  ctx.save();
  ctx.globalAlpha *= 0.82;
  ctx.beginPath();
  ctx.moveTo(-w * pulse, hy + 4);
  ctx.bezierCurveTo(-w * pulse, hy - w * 1.5, w * pulse, hy - w * 1.5, w * pulse, hy + 4);
  for (let i = 0; i < 4; i++) {
    const x0 = w * pulse - (i * 2 * w * pulse) / 4;
    const x1 = w * pulse - ((i + 1) * 2 * w * pulse) / 4;
    ctx.quadraticCurveTo((x0 + x1) / 2, hy + 12 + Math.sin(k.t * 4 + i) * 2, x1, hy + 4);
  }
  ctx.closePath();
  paint(ctx, k, o.bell, -w, hy - w * 1.2, w, hy + 10, true, 0.35, -0.15);
  ctx.restore();
  rim(ctx, k, 0, hy - w * 0.5, w, w * 0.9, o.bell, 0.8);
  // core
  const cy = hy - 8;
  if (o.lantern) {
    poly(ctx, [-7, cy - 9, 7, cy - 9, 6, cy + 9, -6, cy + 9]);
    ctx.fillStyle = k.a('#fff2c0', 0.85);
    ctx.fill();
    ctx.strokeStyle = k.c('#4a3424');
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ell(ctx, 0, cy + 2 - Math.sin(k.t * 9) * 1, 3, 5);
    ctx.fillStyle = k.c('#ff9a2a');
    ctx.fill();
    glow(ctx, 0, cy, 20, '#ffb347', 0.7);
  } else {
    circ(ctx, 0, cy, o.thin ? 4 : 7);
    ctx.fillStyle = k.s(o.core, 0.6);
    ctx.fill();
    glow(ctx, 0, cy, o.thin ? 14 : 22, o.core, 0.8);
  }
  // two small eyes
  eye(ctx, k, -9, hy - w * 0.55, 1.8, '#ffffff', 0.6);
  eye(ctx, k, -2, hy - w * 0.6, 1.6, '#ffffff', 0.6);
}

// ------------------------------------------------------------------ ledger pages

export function drawPages(ctx: Ctx, k: K, o: { paper: string; ink: string; eye: string }): void {
  const cx = -k.atk * 34;
  const cy = -95 + Math.sin(k.t * 1.5 + k.seed) * 6 + (k.broken ? 30 : 0);
  const spread = 1 + k.wind * 0.35 - k.atk * 0.3;
  const page = (x: number, y: number, rot: number, flapX: number, s: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(flapX * s, s);
    poly(ctx, [-7, -9, 7, -9, 7, 9, -7, 9]);
    flat(ctx, k, o.paper);
    ctx.strokeStyle = k.a(o.ink, 0.7);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-5, -5 + i * 3.5);
      ctx.lineTo(4 - (i % 2) * 2, -5 + i * 3.5);
    }
    ctx.stroke();
    ctx.restore();
  };
  // orbit, back half first
  const N = 13;
  const order: number[] = [];
  for (let i = 0; i < N; i++) order.push(i);
  const pos = order.map((i) => {
    const a = k.t * (1.2 + (k.atk ? 2 : 0)) + (i * TAU) / N + k.seed;
    return { i, x: cx + Math.cos(a) * 56 * spread, y: cy + Math.sin(a * 2) * 12 + Math.sin(a) * 26 * spread, z: Math.sin(a) };
  });
  for (const p of pos) if (p.z < 0) page(p.x, p.y, Math.sin(k.t * 3 + p.i) * 0.5, Math.cos(k.t * 7 + p.i), 0.85);
  // the watching page
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(k.t * 1.3) * 0.08);
  poly(ctx, [-16, -20, 16, -20, 16, 20, -16, 20]);
  paint(ctx, k, o.paper, -16, -20, 16, 20);
  const blink = hash(Math.floor(k.t * 0.9), k.seed + 4) > 0.85 && !k.wind && !k.cast;
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.strokeStyle = k.c(o.ink);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ell(ctx, 0, 0, 11, 7);
    ctx.fillStyle = k.c('#fbf8ef');
    ctx.fill();
    ctx.strokeStyle = k.c(o.ink);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    circ(ctx, -1, 0, 4.4);
    ctx.fillStyle = k.c(o.eye);
    ctx.fill();
    circ(ctx, -1, 0, 2);
    ctx.fillStyle = k.c('#140e10');
    ctx.fill();
    glow(ctx, -1, 0, 12, o.eye, 0.4 + k.cast * 0.6);
  }
  ctx.strokeStyle = k.a(o.ink, 0.6);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(-12, 11 + i * 3);
    ctx.lineTo(10, 11 + i * 3);
  }
  ctx.stroke();
  ctx.restore();
  for (const p of pos) if (p.z >= 0) page(p.x, p.y, Math.sin(k.t * 3 + p.i) * 0.5, Math.cos(k.t * 7 + p.i), 1);
}


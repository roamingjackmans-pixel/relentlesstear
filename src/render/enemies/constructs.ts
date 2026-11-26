// Constructs: thimble knights, spindle drones, cinder bobbins, selvage sentinels, porcelain choir automata, winged
// wardens and seraphs, hands of light, and the fate spinner.
import { TAU, button, circ, ell, eye, flat, glow, hash, paint, poly, rim, seam, shade, stitches, strand, type Ctx, type K } from './kit';

// ------------------------------------------------------------------ thimble knight

export function drawThimble(ctx: Ctx, k: K, o: { metal: string; body: string; eye: string; shield: string }): void {
  const bob = Math.sin(k.t * 2.4 + k.seed) * 1.5;
  const thrust = k.atk;
  // legs
  for (const lx of [-12, 12]) {
    ell(ctx, lx, -9, 9, 10);
    paint(ctx, k, '#5a4a3a', lx - 9, -19, lx + 9, 1);
  }
  // spear (behind the body, held in the back arm)
  const sx = 22 - thrust * 34 + k.wind * 10;
  ctx.beginPath();
  ctx.moveTo(sx, -58);
  ctx.lineTo(sx - 100, -72 - k.wind * 10);
  ctx.strokeStyle = k.c('#d9dee6');
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ell(ctx, sx - 2, -58, 3, 5, -0.15);
  ctx.strokeStyle = k.c('#7a8494');
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // body barrel
  ell(ctx, 0, -46 + bob, 30, 32);
  paint(ctx, k, o.body, -30, -78, 30, -14);
  stitches(ctx, k, -24, -46 + bob, 24, -46 + bob, 7, 2.6, '#e8d9a8', 1.2);
  rim(ctx, k, 0, -46 + bob, 30, 32, o.body);
  // arm to spear
  ctx.strokeStyle = k.c(o.body);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(18, -60 + bob);
  ctx.lineTo(sx - 6, -60);
  ctx.stroke();
  // thimble helm
  const hy = bob - k.wind * 3;
  ctx.beginPath();
  ctx.moveTo(-27, -70 + hy);
  ctx.lineTo(-23, -110 + hy);
  ctx.quadraticCurveTo(0, -132 + hy, 23, -110 + hy);
  ctx.lineTo(27, -70 + hy);
  ctx.closePath();
  paint(ctx, k, o.metal, -27, -128 + hy, 27, -70 + hy);
  ctx.fillStyle = k.s(o.metal, -0.35);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      const dx = -18 + c * 7.2 + (r % 2) * 3.6;
      const dy = -116 + hy + r * 8;
      if (Math.abs(dx) > 22 - (r === 0 ? 8 : 0)) continue;
      circ(ctx, dx, dy, 1.6);
      ctx.fill();
    }
  }
  ell(ctx, 0, -71 + hy, 28, 5);
  paint(ctx, k, o.metal, -28, -76 + hy, 28, -66 + hy);
  rim(ctx, k, 0, -98 + hy, 26, 30, o.metal);
  // visor slit
  poly(ctx, [-22, -86 + hy, 6, -86 + hy, 6, -82 + hy, -22, -82 + hy]);
  ctx.fillStyle = k.c('#120c0c');
  ctx.fill();
  glow(ctx, -10, -84 + hy, 14, o.eye, 0.55 + k.wind * 0.6);
  // button shield in front
  const shx = -34 - thrust * 6;
  button(ctx, k, shx, -48 + bob, 23, o.shield);
}

// ------------------------------------------------------------------ spindle drone

export function drawSpindle(ctx: Ctx, k: K, o: { wood: string; thread: string; brass: string; eye: string }): void {
  const hy = -95 + Math.sin(k.t * 2 + k.seed) * 6 - k.wind * 6 + (k.broken ? 40 : 0);
  ctx.save();
  ctx.translate(0, hy);
  ctx.rotate(-0.45 * k.atk + (k.broken ? 0.5 : 0) + Math.sin(k.t * 1.3) * 0.05);
  const spin = k.t * (k.atk || k.wind ? 26 : 9);
  // propeller blades on top
  for (let i = 0; i < 2; i++) {
    const s = Math.cos(spin + i * Math.PI);
    ell(ctx, s * 14, -52, Math.abs(s) * 16 + 2, 3);
    ctx.fillStyle = k.a(o.brass, 0.85);
    ctx.fill();
  }
  // shaft
  poly(ctx, [0, -56, 4, -30, 4, 40, 0, 52, -4, 40, -4, -30]);
  paint(ctx, k, o.wood, -4, -56, 4, 52);
  // wound cop
  ell(ctx, 0, -12, 15, 25);
  paint(ctx, k, o.thread, -15, -37, 15, 13);
  ctx.strokeStyle = k.s(o.thread, 0.3);
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const yy = -32 + i * 7 + ((spin * 2) % 7);
    ctx.beginPath();
    ctx.moveTo(-13, yy);
    ctx.lineTo(13, yy - 4);
    ctx.stroke();
  }
  rim(ctx, k, 0, -12, 15, 25, o.thread);
  // whorl disc
  ell(ctx, 0, 18, 27, 7);
  paint(ctx, k, o.brass, -27, 11, 27, 25);
  ctx.strokeStyle = k.s(o.brass, -0.45);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x = Math.cos(spin + (i * Math.PI) / 2) * 25;
    ctx.moveTo(x, 13);
    ctx.lineTo(x * 0.9, 23);
  }
  ctx.stroke();
  eye(ctx, k, 0, 18, 4.5, o.eye, 1.2 + k.wind);
  // thread trailing from the tip
  strand(ctx, k, 0, 50, 40, Math.PI / 2 + 0.4, o.thread, 1.4, 0, 0.4);
  ctx.restore();
}

// ------------------------------------------------------------------ cinder bobbin (furnace golem)

export function drawGolem(ctx: Ctx, k: K, o: { iron: string; molten: string; eye: string }): void {
  const bob = Math.sin(k.t * 1.8 + k.seed) * 1.2;
  const punch = k.atk;
  // smoke puffs
  for (let i = 0; i < 4; i++) {
    const f = (k.t * 0.5 + i * 0.25 + k.seed) % 1;
    circ(ctx, 16 + f * 12, -148 - f * 60, 6 + f * 12);
    ctx.fillStyle = `rgba(70,64,66,${0.35 * (1 - f)})`;
    ctx.fill();
  }
  // back arm
  ctx.strokeStyle = k.s(o.iron, -0.3);
  ctx.lineWidth = 7;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(32, -86);
  ctx.lineTo(50, -52);
  ctx.stroke();
  ctx.setLineDash([]);
  circ(ctx, 50, -48, 12);
  paint(ctx, k, o.iron, 38, -60, 62, -36);
  // feet
  for (const fx of [-18, 18]) {
    poly(ctx, [fx - 12, 0, fx + 12, 0, fx + 10, -16, fx - 10, -16]);
    paint(ctx, k, o.iron, fx - 12, -16, fx + 12, 0);
  }
  // bottom flange
  ell(ctx, 0, -20 + bob, 50, 13);
  paint(ctx, k, o.iron, -50, -33, 50, -7);
  // core cylinder
  const cg = ctx.createLinearGradient(-32, 0, 32, 0);
  cg.addColorStop(0, k.s(o.iron, -0.35));
  cg.addColorStop(0.4, k.s(o.iron, 0.15));
  cg.addColorStop(1, k.s(o.iron, -0.45));
  poly(ctx, [-32, -22 + bob, 32, -22 + bob, 32, -118 + bob, -32, -118 + bob]);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = k.s(o.iron, -0.6);
  ctx.lineWidth = k.lw;
  ctx.stroke();
  // molten winding
  const flick = 0.75 + Math.sin(k.t * 7 + k.seed) * 0.15 + k.wind * 0.3;
  ctx.strokeStyle = k.a(o.molten, Math.min(1, flick));
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 9; i++) {
    if (i >= 3 && i <= 5) continue;
    ctx.beginPath();
    ctx.moveTo(-31, -30 - i * 9.5 + bob);
    ctx.quadraticCurveTo(0, -26 - i * 9.5 + bob, 31, -32 - i * 9.5 + bob);
    ctx.stroke();
  }
  glow(ctx, 0, -70 + bob, 56, o.molten, 0.25 * flick);
  // furnace grate (weak point)
  poly(ctx, [-16, -90 + bob, 16, -90 + bob, 16, -60 + bob, -16, -60 + bob]);
  ctx.fillStyle = k.c('#2a1208');
  ctx.fill();
  glow(ctx, 0, -75 + bob, 24, '#ffb040', 0.9 * flick);
  ctx.strokeStyle = k.c(o.iron);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(-12 + i * 8, -90 + bob);
    ctx.lineTo(-12 + i * 8, -60 + bob);
  }
  ctx.stroke();
  // top flange
  ell(ctx, 0, -120 + bob, 50, 13);
  paint(ctx, k, o.iron, -50, -133, 50, -107);
  rim(ctx, k, 0, -120 + bob, 50, 13, o.iron);
  // face slits
  eye(ctx, k, -16, -104 + bob, 3, o.eye, 1.2);
  eye(ctx, k, 2, -105 + bob, 3, o.eye, 1.2);
  // chimney
  poly(ctx, [10, -128 + bob, 22, -128 + bob, 20, -148 + bob, 12, -148 + bob]);
  paint(ctx, k, o.iron, 10, -148, 22, -128);
  // front arm + fist
  const fx = -58 - punch * 44 + k.wind * 10;
  const fy = -54 - punch * 20 - k.wind * 14;
  ctx.strokeStyle = k.c(o.iron);
  ctx.lineWidth = 8;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(-32, -88 + bob);
  ctx.lineTo(fx + 8, fy);
  ctx.stroke();
  ctx.setLineDash([]);
  circ(ctx, fx, fy, 14);
  paint(ctx, k, o.iron, fx - 14, fy - 14, fx + 14, fy + 14);
  glow(ctx, fx, fy, 18, o.molten, 0.3 + punch * 0.7);
}

// ------------------------------------------------------------------ selvage sentinel

export function drawSentinel(ctx: Ctx, k: K, o: { stone: string; thread: string; rune: string; moss: string }): void {
  const breathe = Math.sin(k.t * 1.1 + k.seed) * 1.2;
  const raise = k.wind;
  const slam = k.atk;
  // back arm
  ctx.save();
  ctx.translate(48, -140);
  ctx.rotate(0.15 - raise * 1.3 + slam * 1.6);
  poly(ctx, [-10, 0, 12, 0, 14, 70, -12, 72]);
  paint(ctx, k, shade(o.stone, -0.2), -12, 0, 14, 72);
  circ(ctx, 0, 84, 17);
  paint(ctx, k, o.stone, -17, 67, 17, 101);
  ctx.restore();
  // legs
  for (const lx of [-16, 16]) {
    poly(ctx, [lx - 12, 0, lx + 12, 0, lx + 10, -64, lx - 10, -64]);
    paint(ctx, k, o.stone, lx - 12, -64, lx + 12, 0);
  }
  // torso
  poly(ctx, [-46, -60 + breathe, 44, -62 + breathe, 60, -146 + breathe, 30, -160 + breathe, -34, -158 + breathe, -62, -144 + breathe]);
  paint(ctx, k, o.stone, -62, -160, 60, -60);
  rim(ctx, k, 0, -110, 60, 50, o.stone);
  // cracks
  ctx.strokeStyle = k.s(o.stone, -0.5);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-40, -100);
  ctx.lineTo(-28, -112);
  ctx.lineTo(-30, -126);
  ctx.moveTo(30, -80);
  ctx.lineTo(40, -98);
  ctx.stroke();
  // thread bindings
  ctx.strokeStyle = k.c(o.thread);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-58, -140 + breathe);
  ctx.quadraticCurveTo(0, -96, 52, -70 + breathe);
  ctx.moveTo(56, -142 + breathe);
  ctx.quadraticCurveTo(0, -104, -44, -66 + breathe);
  ctx.stroke();
  stitches(ctx, k, -40, -124, 30, -84, 6, 3, o.thread, 1.2);
  // moss
  for (let i = 0; i < 5; i++) {
    ell(ctx, -30 + i * 14, -156 + breathe + (i % 2) * 3, 8, 4);
    flat(ctx, k, o.moss, false);
  }
  // rune (weak point)
  const ry = -130 + breathe;
  glow(ctx, 0, ry, 30, o.rune, 0.5 + raise * 0.5 + Math.sin(k.t * 2.5) * 0.1);
  circ(ctx, 0, ry, 12);
  ctx.strokeStyle = k.s(o.rune, 0.4);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, ry - 9);
  ctx.lineTo(0, ry + 9);
  ctx.moveTo(-7, ry - 3);
  ctx.lineTo(7, ry + 3);
  ctx.stroke();
  // head
  poly(ctx, [-14, -158 + breathe, 14, -158 + breathe, 12, -180 + breathe, -12, -182 + breathe]);
  paint(ctx, k, o.stone, -14, -182, 14, -158);
  poly(ctx, [-11, -172 + breathe, 6, -172 + breathe, 6, -168 + breathe, -11, -168 + breathe]);
  ctx.fillStyle = k.c('#100c0a');
  ctx.fill();
  glow(ctx, -3, -170 + breathe, 10, o.rune, 0.7 + raise * 0.6);
  // front arm (slams)
  ctx.save();
  ctx.translate(-50, -140 + breathe);
  ctx.rotate(-0.05 + raise * 1.5 - slam * 1.4);
  poly(ctx, [-12, 0, 12, 0, 12, 76, -14, 78]);
  paint(ctx, k, o.stone, -14, 0, 12, 78);
  ctx.strokeStyle = k.c(o.thread);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-12, 30);
  ctx.lineTo(12, 22);
  ctx.moveTo(-12, 40);
  ctx.lineTo(12, 32);
  ctx.stroke();
  circ(ctx, -1, 92, 20);
  paint(ctx, k, o.stone, -21, 72, 19, 112);
  ctx.restore();
}

// ------------------------------------------------------------------ porcelain choir sentinel

export function drawPorcelain(ctx: Ctx, k: K, o: { porcelain: string; gold: string; voice: string }): void {
  const sway = Math.sin(k.t * 1.5 + k.seed) * 1.5;
  // skirt
  ctx.beginPath();
  ctx.moveTo(-18, -82);
  ctx.lineTo(18, -82);
  ctx.quadraticCurveTo(30, -40, 36 + sway, 0);
  ctx.lineTo(-36 + sway, 0);
  ctx.quadraticCurveTo(-30, -40, -18, -82);
  ctx.closePath();
  paint(ctx, k, o.porcelain, -36, -82, 36, 0, true, 0.3, -0.18);
  seam(ctx, k, [-12, -78, -18, -40, -26, -4], o.gold, 1.5, 6);
  ctx.strokeStyle = k.c(o.gold);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(8, -70);
  ctx.lineTo(14, -50);
  ctx.lineTo(10, -34);
  ctx.lineTo(20, -12);
  ctx.stroke();
  // torso
  poly(ctx, [-20, -84, 20, -84, 22, -128, -22, -128]);
  paint(ctx, k, o.porcelain, -22, -128, 22, -84, true, 0.35, -0.15);
  rim(ctx, k, 0, -106, 22, 24, o.porcelain);
  ctx.strokeStyle = k.c(o.gold);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-16, -120);
  ctx.quadraticCurveTo(0, -108, 16, -120);
  ctx.moveTo(-14, -100);
  ctx.quadraticCurveTo(0, -90, 14, -100);
  ctx.stroke();
  // back arm
  ctx.strokeStyle = k.c('#b8955a');
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(18, -122);
  ctx.lineTo(28, -96);
  ctx.lineTo(24, -76);
  ctx.stroke();
  // neck rod + hymn mask
  ctx.strokeStyle = k.c('#b8955a');
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -128);
  ctx.lineTo(0, -136);
  ctx.stroke();
  const sing = k.cast + k.wind * 0.6;
  ell(ctx, 0, -146, 16, 20);
  paint(ctx, k, o.porcelain, -16, -166, 16, -126, true, 0.35, -0.15);
  ctx.strokeStyle = k.c(o.gold);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = k.c('#4a3a40');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-6, -150, 3.4, Math.PI + 0.3, TAU - 0.3);
  ctx.moveTo(9, -150);
  ctx.arc(6, -150, 3.4, Math.PI + 0.3, TAU - 0.3);
  ctx.stroke();
  ell(ctx, 0, -137, 3 + sing * 2, 4 + sing * 4);
  ctx.fillStyle = k.c('#22161a');
  ctx.fill();
  glow(ctx, 0, -137, 12 + sing * 18, o.voice, 0.35 + sing * 0.6);
  // notes when singing
  if (sing > 0.1) {
    for (let i = 0; i < 3; i++) {
      const f = (k.t * 0.8 + i * 0.33) % 1;
      const nx = -20 - f * 40;
      const ny = -150 - f * 30 + Math.sin(f * 8 + i) * 6;
      circ(ctx, nx, ny, 3);
      ctx.fillStyle = k.a(o.voice, 1 - f);
      ctx.fill();
      ctx.strokeStyle = k.a(o.voice, 1 - f);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(nx + 3, ny);
      ctx.lineTo(nx + 3, ny - 10);
      ctx.stroke();
    }
  }
  // front arm with the hand bell
  const toll = Math.sin(k.t * 3 + k.seed) * 0.08 + k.atk * 1.1 - k.wind * 0.4;
  ctx.save();
  ctx.translate(-18, -122);
  ctx.rotate(0.3 + toll);
  ctx.strokeStyle = k.c('#b8955a');
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-12, 24);
  ctx.lineTo(-20, 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-28, 40);
  ctx.quadraticCurveTo(-30, 64, -40, 68);
  ctx.lineTo(-4, 68);
  ctx.quadraticCurveTo(-12, 64, -14, 40);
  ctx.closePath();
  paint(ctx, k, o.gold, -40, 40, -4, 68);
  ctx.restore();
}

// ------------------------------------------------------------------ winged wardens and seraphs

export interface AngelOpt {
  body: string;
  trim: string;
  wing: string;
  halo: string;
  wings: 2 | 4;
}

function featherWing(ctx: Ctx, k: K, x: number, y: number, ang: number, s: number, col: string, trim: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const len = 46 - row * 10 + i * 4;
      const a = -1.3 + i * 0.22 + row * 0.05;
      ctx.save();
      ctx.rotate(a);
      ell(ctx, len * 0.55 + row * 6, 0, len * 0.55, 6 - row);
      paint(ctx, k, row === 0 ? col : row === 1 ? col : trim, 0, -6, len, 6, true, 0.3, -0.2);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawAngel(ctx: Ctx, k: K, o: AngelOpt): void {
  const hy = -20 + Math.sin(k.t * 1.4 + k.seed) * 6 - k.wind * 8 + (k.broken ? 16 : 0);
  const flap = Math.sin(k.t * 2.4 + k.seed) * 0.14 + k.wind * 0.3 - k.atk * 0.2;
  // wings behind
  featherWing(ctx, k, 12, hy - 126, -0.3 - flap, 1.15, o.wing, o.trim);
  if (o.wings === 4) featherWing(ctx, k, 10, hy - 96, 0.5 - flap * 0.6, 0.9, o.wing, o.trim);
  // halo behind the head
  const haloY = hy - 162;
  glow(ctx, 0, haloY, 40, o.halo, 0.45 + k.cast * 0.5);
  ctx.save();
  ctx.translate(0, haloY);
  ctx.rotate(Math.sin(k.t * 0.8) * 0.1);
  ell(ctx, 0, 0, 26, 8);
  ctx.strokeStyle = k.s(o.halo, 0.5);
  ctx.lineWidth = 3.4;
  ctx.stroke();
  if (o.wings === 4) {
    ell(ctx, 0, -6, 34, 10);
    ctx.strokeStyle = k.a(o.halo, 0.6);
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  ctx.restore();
  // robe
  ctx.beginPath();
  ctx.moveTo(-20, hy - 142);
  ctx.lineTo(20, hy - 142);
  ctx.quadraticCurveTo(34, hy - 80, 30, hy - 22);
  for (let i = 0; i <= 6; i++) ctx.lineTo(30 - i * 10, hy - 22 + (i % 2 ? 10 : 0) + Math.sin(k.t * 3 + i) * 2);
  ctx.quadraticCurveTo(-34, hy - 80, -20, hy - 142);
  ctx.closePath();
  paint(ctx, k, o.body, -34, hy - 142, 34, hy - 20, true, 0.3, -0.18);
  rim(ctx, k, 0, hy - 100, 26, 44, o.body);
  ctx.strokeStyle = k.c(o.trim);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, hy - 140);
  ctx.lineTo(0, hy - 26);
  ctx.stroke();
  for (let i = 0; i < 4; i++) strand(ctx, k, -24 + i * 16, hy - 16, 14, Math.PI / 2, o.trim, 1.3, i);
  // faceless mask
  ell(ctx, 0, hy - 158, 13, 16);
  paint(ctx, k, '#f4f0ea', -13, hy - 174, 13, hy - 142, true, 0.3, -0.18);
  ctx.strokeStyle = k.c(o.trim);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, hy - 160);
  ctx.lineTo(-2, hy - 160);
  ctx.moveTo(3, hy - 160);
  ctx.lineTo(7, hy - 160);
  ctx.stroke();
  // spear of light
  const thrust = k.atk;
  const sx0 = -20 - thrust * 30;
  const sy0 = hy - 60;
  const sx1 = -80 - thrust * 60;
  const sy1 = hy - 176 + thrust * 80;
  ctx.strokeStyle = k.c('#f8f0d8');
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx0, sy0);
  ctx.lineTo(sx1, sy1);
  ctx.stroke();
  glow(ctx, sx1, sy1, 20 + k.wind * 14, o.halo, 0.8);
  // arm
  ctx.strokeStyle = k.c(o.body);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-14, hy - 132);
  ctx.quadraticCurveTo(-28, hy - 108, sx0 + (sx1 - sx0) * 0.25, sy0 + (sy1 - sy0) * 0.25);
  ctx.stroke();
  featherWing(ctx, k, 8, hy - 124, -0.6 - flap * 1.2, 1.05, o.wing, o.trim);
}

// ------------------------------------------------------------------ loomhand (a hand of light with needle fingers)

export function drawHand(ctx: Ctx, k: K, o: { light: string; needle: string; eye: string }): void {
  const cx = -k.atk * 20;
  const cy = -92 + Math.sin(k.t * 1.3 + k.seed) * 7 + (k.broken ? 30 : 0);
  const curl = k.wind * 0.9 - k.atk * 0.5;
  // marionette threads going up
  ctx.strokeStyle = k.a(o.light, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const tx of [-18, 0, 18]) {
    ctx.moveTo(cx + tx, cy - 36);
    ctx.lineTo(cx + tx * 1.6, cy - 220);
  }
  ctx.stroke();
  glow(ctx, cx, cy, 90, o.light, 0.3 + k.cast * 0.4);
  // wrist threads dangling
  for (let i = 0; i < 6; i++) strand(ctx, k, cx + 10 + i * 4, cy + 32, 30 + hash(i, k.seed) * 26, Math.PI / 2 - 0.3, o.light, 1.4, i);
  // fingers (behind palm partially)
  const fingers = [
    [-26, -30, -2.2],
    [-12, -38, -1.9],
    [4, -40, -1.6],
    [18, -34, -1.3],
  ];
  for (let i = 0; i < fingers.length; i++) {
    const [fx, fy, a0] = fingers[i];
    const a = a0 - 0.6 + curl * (0.6 + i * 0.1) + Math.sin(k.t * 2 + i) * 0.05;
    const x1 = cx + fx + Math.cos(a) * 24;
    const y1 = cy + fy + Math.sin(a) * 24;
    const a2 = a - 0.3 - curl * 0.8;
    const x2 = x1 + Math.cos(a2) * 20;
    const y2 = y1 + Math.sin(a2) * 20;
    ctx.strokeStyle = k.s(o.light, -0.2);
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(cx + fx, cy + fy);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = k.c(o.light);
    ctx.lineWidth = 7;
    ctx.stroke();
    // needle
    const nx = x2 + Math.cos(a2) * 38;
    const ny = y2 + Math.sin(a2) * 38;
    ctx.strokeStyle = k.c(o.needle);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    glow(ctx, nx, ny, 8, o.light, 0.5 + k.wind * 0.5);
  }
  // thumb
  ctx.strokeStyle = k.c(o.light);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy + 10);
  ctx.quadraticCurveTo(cx - 50, cy + 4 - curl * 10, cx - 56, cy - 14 - curl * 10);
  ctx.stroke();
  // palm
  poly(ctx, [cx - 30, cy - 34, cx + 26, cy - 36, cx + 30, cy + 20, cx + 10, cy + 36, cx - 22, cy + 30, cx - 34, cy + 6]);
  paint(ctx, k, o.light, cx - 34, cy - 36, cx + 30, cy + 36, true, 0.35, -0.12);
  // palm eye (weak point)
  const blink = hash(Math.floor(k.t * 0.7), k.seed) > 0.85 && !k.wind;
  ell(ctx, cx - 2, cy + 2, 13, blink ? 1.5 : 8);
  ctx.fillStyle = k.c('#fffaf0');
  ctx.fill();
  ctx.strokeStyle = k.s(o.light, -0.5);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  if (!blink) {
    circ(ctx, cx - 4, cy + 2, 5);
    ctx.fillStyle = k.c(o.eye);
    ctx.fill();
    circ(ctx, cx - 4, cy + 2, 2.2);
    ctx.fillStyle = k.c('#1a1208');
    ctx.fill();
    glow(ctx, cx - 4, cy + 2, 16, o.eye, 0.45 + k.wind * 0.5);
  }
}

// ------------------------------------------------------------------ fate spinner

export function drawSpinner(ctx: Ctx, k: K, o: { wood: string; thread: string; mask: string; eye: string }): void {
  const spin = k.t * (k.atk || k.cast ? 9 : 2.2) + k.seed;
  const wx = 22;
  const wy = -82 + (k.broken ? 10 : 0);
  // legs (A-frame) + treadle
  ctx.strokeStyle = k.c(o.wood);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(wx, wy);
  ctx.lineTo(54, 0);
  ctx.moveTo(-30, 0);
  ctx.lineTo(-50, -100);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-14, -8 + Math.sin(spin) * 3);
  ctx.lineTo(50, -8 - Math.sin(spin) * 3);
  ctx.stroke();
  // the wheel
  ctx.save();
  ctx.translate(wx, wy);
  ctx.strokeStyle = k.s(o.wood, -0.3);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = spin + (i * TAU) / 10;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50);
  }
  ctx.stroke();
  circ(ctx, 0, 0, 52);
  ctx.strokeStyle = k.s(o.wood, -0.5);
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = k.c(o.wood);
  ctx.lineWidth = 6;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = spin * 1 + (i * TAU) / 6;
    glow(ctx, Math.cos(a) * 52, Math.sin(a) * 52, 8, o.thread, 0.5);
  }
  circ(ctx, 0, 0, 7);
  paint(ctx, k, '#c9a35a', -7, -7, 7, 7);
  ctx.restore();
  // drive band of thread to the spindle
  const spx = -52;
  const spy = -106;
  ctx.strokeStyle = k.a(o.thread, 0.9);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(wx - 4, wy - 52);
  ctx.lineTo(spx + 6, spy - 4);
  ctx.moveTo(wx - 8, wy + 51);
  ctx.lineTo(spx + 6, spy + 4);
  ctx.stroke();
  // spindle + cop (weak point)
  ell(ctx, spx, spy, 16, 7);
  paint(ctx, k, o.thread, spx - 16, spy - 7, spx + 16, spy + 7);
  ctx.strokeStyle = k.c('#e8e0d0');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(spx - 26, spy);
  ctx.lineTo(spx + 22, spy);
  ctx.stroke();
  glow(ctx, spx, spy, 22, o.thread, 0.45 + k.cast * 0.6);
  // the mask on its rod
  ctx.strokeStyle = k.c(o.wood);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(wx, wy - 10);
  ctx.lineTo(wx - 4, wy - 70);
  ctx.stroke();
  const mx = wx - 6;
  const my = wy - 84 + Math.sin(k.t * 1.2) * 2;
  poly(ctx, [mx - 20, my + 18, mx - 16, my - 16, mx, my - 26, mx + 16, my - 16, mx + 20, my + 18]);
  paint(ctx, k, '#3a2a3a', mx - 20, my - 26, mx + 20, my + 18);
  ell(ctx, mx - 2, my, 11, 14);
  paint(ctx, k, o.mask, mx - 13, my - 14, mx + 9, my + 14, true, 0.3, -0.18);
  eye(ctx, k, mx - 7, my - 2, 2.4, o.eye, 1.2 + k.wind);
  eye(ctx, k, mx + 2, my - 2, 2.2, o.eye, 1.2 + k.wind);
  // little arms reaching to the spindle
  ctx.strokeStyle = k.c('#3a2a3a');
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(mx - 12, my + 16);
  ctx.quadraticCurveTo(mx - 40, my + 30, spx + 4 - k.atk * 20, spy - 6);
  ctx.stroke();
}

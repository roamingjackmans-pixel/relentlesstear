// Unique boss drawings: Foreman Gristle, Arbiter Seraphine (both phases), Grandmother Spool, the Glass Choir, the
// First Thread, and the Weaver (three phases). Other bosses reuse their family with boss options.
import { TAU, circ, ell, eye, flat, glow, hash, paint, poly, rim, seam, shade, stitches, strand, type Ctx, type K } from './kit';

// ------------------------------------------------------------------ Foreman Gristle

function spindleHand(ctx: Ctx, k: K, x: number, y: number, r: number, spin: number, back: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = back ? k.s('#6a6058', -0.2) : k.c('#8a7a68');
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    ell(ctx, Math.cos(a) * r, Math.sin(a) * r, 6, 4, a);
    paint(ctx, k, i % 2 ? '#c0465a' : '#4a7ac0', -6, -4, 6, 4);
  }
  circ(ctx, 0, 0, 8);
  paint(ctx, k, '#c9a35a', -8, -8, 8, 8);
  ctx.restore();
}

export function drawGristle(ctx: Ctx, k: K): void {
  const bob = Math.sin(k.t * 1.6 + k.seed) * 2;
  const fast = k.atk || k.cast || k.wind;
  const spin = k.t * (fast ? 16 : 3.5);
  // smoke from the stacks
  for (let i = 0; i < 6; i++) {
    const f = (k.t * 0.45 + i / 6 + k.seed) % 1;
    const sx = i % 2 ? 42 : 58;
    circ(ctx, sx + f * 18, -184 - f * 50, 7 + f * 14);
    ctx.fillStyle = `rgba(66,60,62,${0.4 * (1 - f)})`;
    ctx.fill();
  }
  // stacks
  poly(ctx, [32, -146 + bob, 44, -146 + bob, 46, -186 + bob, 36, -186 + bob]);
  paint(ctx, k, '#4a4448', 32, -186, 46, -146);
  poly(ctx, [50, -144 + bob, 60, -144 + bob, 64, -176 + bob, 54, -176 + bob]);
  paint(ctx, k, '#4a4448', 50, -176, 64, -144);
  // back arm
  ctx.strokeStyle = k.s('#5a5048', -0.2);
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(52, -132 + bob);
  ctx.lineTo(80, -110 + bob);
  ctx.lineTo(86, -96 + bob);
  ctx.stroke();
  spindleHand(ctx, k, 86, -96 + bob, 22, -spin, true);
  // legs
  for (const lx of [-24, 24]) {
    poly(ctx, [lx - 14, 0, lx + 14, 0, lx + 12, -44, lx - 12, -44]);
    paint(ctx, k, '#4a4448', lx - 14, -44, lx + 14, 0);
    poly(ctx, [lx - 20, 0, lx + 16, 0, lx + 14, -10, lx - 18, -10]);
    paint(ctx, k, '#3a3436', lx - 20, -10, lx + 16, 0);
  }
  // boiler belly
  ell(ctx, 0, -88 + bob, 54, 50);
  paint(ctx, k, '#6a5a50', -54, -138, 54, -38);
  rim(ctx, k, 0, -88 + bob, 54, 50, '#6a5a50');
  ctx.fillStyle = k.c('#c9a35a');
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    circ(ctx, Math.cos(a) * 46, -88 + bob + Math.sin(a) * 42, 2);
    ctx.fill();
  }
  // spinning core (weak point)
  const coreGlow = 0.5 + (fast ? 0.5 : 0) + Math.sin(k.t * 5) * 0.1;
  glow(ctx, 0, -90 + bob, 40, '#ff9a40', coreGlow);
  circ(ctx, 0, -90 + bob, 22);
  ctx.fillStyle = k.c('#2a1410');
  ctx.fill();
  ctx.save();
  ctx.translate(0, -90 + bob);
  ctx.rotate(spin * 1.4);
  ctx.strokeStyle = k.c('#ffb060');
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a + 0.6) * 12, Math.sin(a + 0.6) * 12, Math.cos(a) * 20, Math.sin(a) * 20);
  }
  ctx.stroke();
  ctx.restore();
  // shoulder plate
  poly(ctx, [-64, -128 + bob, 64, -128 + bob, 56, -152 + bob, -56, -152 + bob]);
  paint(ctx, k, '#5a5050', -64, -152, 64, -128);
  // pressure valve (weak point) on the front shoulder
  const vx = -50;
  const vy = -150 + bob;
  circ(ctx, vx, vy, 12);
  paint(ctx, k, '#c9a35a', vx - 12, vy - 12, vx + 12, vy + 12);
  circ(ctx, vx, vy, 8);
  ctx.fillStyle = k.c('#f4ecd8');
  ctx.fill();
  const needle = -2.2 + Math.sin(k.t * 3) * 0.3 + (fast ? 1.6 : 0);
  ctx.strokeStyle = k.c('#a02020');
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(vx, vy);
  ctx.lineTo(vx + Math.cos(needle) * 7, vy + Math.sin(needle) * 7);
  ctx.stroke();
  if (fast) {
    for (let i = 0; i < 3; i++) {
      const f = (k.t * 2 + i / 3) % 1;
      circ(ctx, vx - 6 - f * 20, vy - 12 - f * 18, 3 + f * 6);
      ctx.fillStyle = `rgba(240,240,240,${0.5 * (1 - f)})`;
      ctx.fill();
    }
  }
  // head
  const hy = -162 + bob - k.wind * 3;
  poly(ctx, [-18, hy + 10, 18, hy + 10, 16, hy - 16, -16, hy - 16]);
  paint(ctx, k, '#6a5a50', -18, hy - 16, 18, hy + 10);
  // foreman's cap
  poly(ctx, [-18, hy - 14, 16, hy - 14, 12, hy - 28, -14, hy - 28]);
  paint(ctx, k, '#2e3a5a', -18, hy - 28, 16, hy - 14);
  poly(ctx, [-18, hy - 16, -36, hy - 12, -18, hy - 10]);
  flat(ctx, k, '#1e2840');
  // goggles
  for (const gx of [-9, 6]) {
    circ(ctx, gx, hy - 4, 6);
    paint(ctx, k, '#c9a35a', gx - 6, hy - 10, gx + 6, hy + 2);
    eye(ctx, k, gx, hy - 4, 3.4, '#ffcf5a', 1.2 + k.wind);
  }
  // steel-wool moustache
  for (let i = 0; i < 8; i++) strand(ctx, k, -8 + i * 2, hy + 4, 8, Math.PI / 2 + (i < 4 ? 0.5 : -0.5), '#b8b8b8', 1.6, i, 0.1);
  // front arm (swings) + spindle hand
  const swing = Math.sin(k.t * 1.2) * 0.1 + k.wind * 0.6 - k.atk * 0.9;
  ctx.save();
  ctx.translate(-56, -136 + bob);
  ctx.rotate(swing);
  ctx.strokeStyle = k.c('#6a5a50');
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-24, 26);
  ctx.lineTo(-34, 42);
  ctx.stroke();
  circ(ctx, -24, 26, 7);
  flat(ctx, k, '#c9a35a');
  spindleHand(ctx, k, -34, 42, 26, spin, false);
  ctx.restore();
}

// ------------------------------------------------------------------ Arbiter Seraphine Vael

export function drawSeraphine(ctx: Ctx, k: K, cracked: boolean): void {
  const sway = Math.sin(k.t * 1.1 + k.seed) * 2;
  const robe = cracked ? '#e6e0ea' : '#f4f1ea';
  const gold = '#d8b45a';
  // halo of needles
  const hx = 0;
  const hy = -170;
  glow(ctx, hx, hy, 60, cracked ? '#b080ff' : '#ffe7a0', 0.35 + k.cast * 0.5);
  const count = cracked ? 9 : 14;
  for (let i = 0; i < count; i++) {
    let a = (i / 14) * TAU + k.t * 0.15 * (cracked ? -2 : 1);
    let r0 = 26;
    let r1 = 50 + (i % 2) * 6;
    if (cracked && i % 3 === 1) {
      a += 0.4;
      r0 += 10;
      r1 += 18;
    }
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0);
    ctx.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
    ctx.strokeStyle = k.c(cracked && i % 3 === 1 ? '#8a7aa0' : gold);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    circ(ctx, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1, 1.8);
    ctx.fillStyle = k.c('#fff6d8');
    ctx.fill();
  }
  // train behind
  ctx.beginPath();
  ctx.moveTo(10, -60);
  ctx.quadraticCurveTo(60, -20, 96 + sway * 2, -2);
  ctx.lineTo(20, 0);
  ctx.closePath();
  paint(ctx, k, shade(robe, -0.08), 10, -60, 96, 0, true, 0.2, -0.2);
  // robe
  ctx.beginPath();
  ctx.moveTo(-20, -150);
  ctx.lineTo(22, -150);
  ctx.quadraticCurveTo(34, -80, 52 + sway, 0);
  ctx.lineTo(-50 + sway, 0);
  ctx.quadraticCurveTo(-34, -80, -20, -150);
  ctx.closePath();
  paint(ctx, k, robe, -50, -150, 52, 0, true, 0.3, -0.2);
  rim(ctx, k, 0, -100, 30, 60, robe);
  // gold embroidery
  seam(ctx, k, [0, -148, -2, -100, -6, -50, -10, -4], gold, 1.8, 6);
  ctx.strokeStyle = k.c(gold);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = -40 - i * 30;
    ctx.moveTo(-26 + i * 4, y);
    ctx.quadraticCurveTo(0, y - 10, 28 - i * 4, y);
  }
  ctx.stroke();
  if (cracked) {
    for (let i = 0; i < 8; i++) strand(ctx, k, -46 + i * 12 + sway, -4, 16 + hash(i) * 16, Math.PI / 2 + 0.1, '#5a2a7a', 2, i);
    for (let i = 0; i < 4; i++) strand(ctx, k, -14 + i * 9, -120 + i * 10, 22, 0.6 + i * 0.4, '#3a1a4a', 1.8, i + 4);
  }
  // staff-needle
  const plant = -44 - k.atk * 30;
  ctx.strokeStyle = k.c(gold);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(plant, 0 - k.atk * 60);
  ctx.lineTo(plant + 8 - k.atk * 20, -190 + k.atk * 20);
  ctx.stroke();
  ell(ctx, plant + 8 - k.atk * 20, -184 + k.atk * 20, 3, 8);
  ctx.strokeStyle = k.c('#8a6a2a');
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // arms: one on the staff, one raised to cast
  ctx.strokeStyle = k.c(robe);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-14, -140);
  ctx.quadraticCurveTo(-34, -120, plant + 4 - k.atk * 10, -110 + k.atk * 20);
  ctx.stroke();
  const lift = k.cast + k.wind * 0.7;
  ctx.beginPath();
  ctx.moveTo(16, -140);
  ctx.quadraticCurveTo(30 - lift * 10, -150 - lift * 40, 18 - lift * 30, -120 - lift * 70);
  ctx.stroke();
  glow(ctx, 18 - lift * 30, -120 - lift * 70, 12 + lift * 20, cracked ? '#c080ff' : '#fff0b0', 0.4 + lift * 0.6);
  // veil + mask
  poly(ctx, [-20, -150, -16, -184, 0, -194, 16, -184, 20, -150]);
  paint(ctx, k, shade(robe, -0.05), -20, -194, 20, -150, true, 0.25, -0.15);
  ell(ctx, -2, -168, 12, 15);
  paint(ctx, k, '#fbf8f2', -14, -183, 10, -153, true, 0.3, -0.12);
  ctx.strokeStyle = k.c(gold);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = k.c('#5a4a50');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (cracked) {
    ctx.arc(1, -170, 3, Math.PI + 0.3, TAU - 0.3);
  } else {
    ctx.arc(-6, -170, 3, 0.3, Math.PI - 0.3);
    ctx.moveTo(4, -170);
    ctx.arc(1, -170, 3, 0.3, Math.PI - 0.3);
  }
  ctx.moveTo(-5, -160);
  ctx.quadraticCurveTo(-2, -158, 1, -160);
  ctx.stroke();
  if (cracked) {
    // the open eye, and the cracks
    eye(ctx, k, -6, -170, 2.6, '#c070ff', 1.6);
    ctx.strokeStyle = k.c('#2a1830');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8, -183);
    ctx.lineTo(-5, -175);
    ctx.lineTo(-9, -168);
    ctx.lineTo(-6, -160);
    ctx.lineTo(-10, -154);
    ctx.moveTo(-5, -175);
    ctx.lineTo(2, -177);
    ctx.stroke();
    for (let i = 0; i < 3; i++) strand(ctx, k, -9, -168 + i * 5, 14 + i * 4, Math.PI / 2 + 0.3, '#3a1a4a', 1.4, i + 9);
  }
}

// ------------------------------------------------------------------ Grandmother Spool

export function drawGrandmother(ctx: Ctx, k: K): void {
  const bob = Math.sin(k.t * 1.3 + k.seed) * 1.5;
  const click = Math.sin(k.t * (k.atk || k.cast ? 14 : 4));
  // bottom flange
  ell(ctx, 0, -10, 70, 16);
  paint(ctx, k, '#b0844e', -70, -26, 70, 6);
  // yarn core
  poly(ctx, [-50, -14 + bob, 50, -14 + bob, 50, -108 + bob, -50, -108 + bob]);
  paint(ctx, k, '#9a7ab8', -50, -108, 50, -14);
  ctx.strokeStyle = k.s('#9a7ab8', 0.25);
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(-50, -20 - i * 7.6 + bob);
    ctx.quadraticCurveTo(0, -16 - i * 7.6 + bob, 50, -22 - i * 7.6 + bob);
    ctx.stroke();
  }
  // shawl draped over the top
  ctx.beginPath();
  ctx.moveTo(-62, -112 + bob);
  ctx.lineTo(62, -112 + bob);
  ctx.lineTo(40, -70 + bob);
  ctx.lineTo(0, -52 + bob);
  ctx.lineTo(-40, -70 + bob);
  ctx.closePath();
  paint(ctx, k, '#b03a3a', -62, -112, 62, -52);
  for (let i = 0; i < 10; i++) strand(ctx, k, -38 + i * 8.5, -66 + Math.abs(i - 4.5) * 2.5 + bob, 9, Math.PI / 2, '#d86a5a', 1.6, i, 0.25);
  ctx.strokeStyle = k.s('#b03a3a', 0.3);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(-50, -100 + bob);
  ctx.lineTo(50, -100 + bob);
  ctx.moveTo(-36, -84 + bob);
  ctx.lineTo(36, -84 + bob);
  ctx.stroke();
  ctx.setLineDash([]);
  // top flange
  ell(ctx, 0, -114 + bob, 70, 15);
  paint(ctx, k, '#b0844e', -70, -129, 70, -99);
  rim(ctx, k, 0, -114 + bob, 70, 15, '#b0844e');
  // head
  const hy = -140 + bob - k.wind * 3;
  circ(ctx, 0, hy, 30);
  paint(ctx, k, '#d8aa72', -30, hy - 30, 30, hy + 30);
  rim(ctx, k, 0, hy, 30, 30, '#d8aa72');
  // bun of yarn with needles (weak point)
  const by = hy - 36;
  circ(ctx, 4, by, 15);
  paint(ctx, k, '#9a7ab8', -11, by - 15, 19, by + 15);
  ctx.strokeStyle = k.s('#9a7ab8', 0.3);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(4, by, 12, 5, i * 0.8, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = k.c('#c9cdd4');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, by - 16);
  ctx.lineTo(18, by + 10);
  ctx.moveTo(22, by - 18);
  ctx.lineTo(-6, by + 12);
  ctx.stroke();
  // spectacles
  for (const gx of [-14, 6]) {
    circ(ctx, gx, hy - 2, 8);
    ctx.strokeStyle = k.c('#c9a35a');
    ctx.lineWidth = 1.8;
    ctx.stroke();
    eye(ctx, k, gx, hy - 2, 2.4, '#6a3a2a', 0.2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx - 4, hy - 6);
    ctx.lineTo(gx - 1, hy - 8);
    ctx.stroke();
  }
  ctx.strokeStyle = k.c('#c9a35a');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, hy - 2);
  ctx.lineTo(-2, hy - 2);
  ctx.stroke();
  // mouth (stern, or scolding)
  ctx.strokeStyle = k.c('#6a2a2a');
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (k.cast || k.wind) ctx.ellipse(-4, hy + 14, 4, 2 + Math.abs(click) * 3, 0, 0, TAU);
  else {
    ctx.moveTo(-10, hy + 14);
    ctx.quadraticCurveTo(-4, hy + 17, 2, hy + 14);
  }
  ctx.stroke();
  ell(ctx, -20, hy + 8, 4, 2.5);
  ctx.fillStyle = 'rgba(220,110,110,0.35)';
  ctx.fill();
  ell(ctx, 10, hy + 8, 4, 2.5);
  ctx.fill();
  // arms + knitting needles
  const lx = -56 - k.atk * 20;
  const ly = -84 + bob;
  ctx.strokeStyle = k.c('#b0844e');
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-48, -80 + bob);
  ctx.lineTo(lx, ly);
  ctx.moveTo(48, -80 + bob);
  ctx.lineTo(lx + 26, ly + 6);
  ctx.stroke();
  ctx.strokeStyle = k.c('#c9cdd4');
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(lx + 4, ly + 4);
  ctx.lineTo(lx - 52, ly - 30 - click * 8);
  ctx.moveTo(lx + 22, ly + 8);
  ctx.lineTo(lx - 48, ly - 18 + click * 8);
  ctx.stroke();
  // the scarf being knitted
  ctx.beginPath();
  ctx.moveTo(lx - 10, ly);
  ctx.lineTo(lx + 10, ly + 4);
  ctx.lineTo(lx + 6 + Math.sin(k.t * 2) * 4, ly + 40);
  ctx.lineTo(lx - 12 + Math.sin(k.t * 2) * 4, ly + 36);
  ctx.closePath();
  paint(ctx, k, '#4a8a6a', lx - 12, ly, lx + 10, ly + 40);
  stitches(ctx, k, lx - 8, ly + 10, lx + 6, ly + 12, 3, 2, '#d8f0e0', 1);
}

// ------------------------------------------------------------------ the Glass Choir

export function drawGlassChoir(ctx: Ctx, k: K): void {
  const singers = [
    { x: -52, h: 138, col: '#9fe8ff', ph: 0 },
    { x: 50, h: 128, col: '#ffb0de', ph: 2 },
    { x: 0, h: 178, col: '#fff0a8', ph: 1 },
  ];
  const sing = k.cast + k.wind * 0.5 + k.atk * 0.8;
  for (const s of singers) {
    const sway = Math.sin(k.t * 1.2 + s.ph + k.seed) * 2;
    const top = -s.h;
    ctx.save();
    ctx.globalAlpha *= 0.72;
    ctx.beginPath();
    ctx.moveTo(s.x - 12, top + 34);
    ctx.lineTo(s.x + 12, top + 34);
    ctx.quadraticCurveTo(s.x + 22, top + s.h * 0.6, s.x + 30 + sway, 0);
    ctx.lineTo(s.x - 30 + sway, 0);
    ctx.quadraticCurveTo(s.x - 22, top + s.h * 0.6, s.x - 12, top + 34);
    ctx.closePath();
    paint(ctx, k, s.col, s.x - 30, top + 30, s.x + 30, 0, true, 0.45, -0.15);
    ctx.restore();
    // prismatic bands
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bands = ['#ff6a6a', '#ffd66a', '#6aff9a', '#6ab8ff', '#c06aff'];
    for (let i = 0; i < bands.length; i++) {
      const f = (k.t * 0.3 + i / bands.length + s.ph * 0.1) % 1;
      const y = top + 40 + f * (s.h - 44);
      const w = 10 + (y - top) * 0.12;
      ctx.strokeStyle = k.a(bands[i], 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x - w, y);
      ctx.lineTo(s.x + w, y - 3);
      ctx.stroke();
    }
    ctx.restore();
    // hands together
    ell(ctx, s.x - 4, top + s.h * 0.42, 6, 8);
    ctx.fillStyle = k.a(s.col, 0.8);
    ctx.fill();
    // head
    const hy = top + 18;
    ell(ctx, s.x, hy, 13, 17);
    ctx.save();
    ctx.globalAlpha *= 0.85;
    paint(ctx, k, s.col, s.x - 13, hy - 17, s.x + 13, hy + 17, true, 0.5, -0.1);
    ctx.restore();
    rim(ctx, k, s.x, hy, 13, 17, s.col, 0.9);
    ell(ctx, s.x - 3, hy + 6, 3 + sing * 2, 4 + sing * 4 + Math.abs(Math.sin(k.t * 6 + s.ph)) * 1.5);
    ctx.fillStyle = k.c('#2a2440');
    ctx.fill();
    ctx.strokeStyle = k.c('#4a4060');
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(s.x - 7, hy - 3, 2.6, Math.PI + 0.4, TAU - 0.4);
    ctx.moveTo(s.x + 3, hy - 3);
    ctx.arc(s.x + 1, hy - 3, 2.6, Math.PI + 0.4, TAU - 0.4);
    ctx.stroke();
    glow(ctx, s.x - 3, hy + 6, 14 + sing * 24, s.col, 0.35 + sing * 0.6);
  }
  // notes and rings
  for (let i = 0; i < 5; i++) {
    const f = (k.t * 0.5 + i / 5) % 1;
    const nx = -40 + hash(i, 3) * 80 - f * 30;
    const ny = -150 - f * 60;
    circ(ctx, nx, ny, 3.4);
    ctx.fillStyle = k.a('#fff6d0', 1 - f);
    ctx.fill();
    ctx.strokeStyle = k.a('#fff6d0', 1 - f);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(nx + 3.4, ny);
    ctx.lineTo(nx + 3.4, ny - 12);
    ctx.lineTo(nx + 9, ny - 9);
    ctx.stroke();
  }
  if (sing > 0.2) {
    const f = (k.t * 2) % 1;
    ell(ctx, -60 - f * 60, -120, 20 + f * 40, 40 + f * 60);
    ctx.strokeStyle = k.a('#ffffff', 0.5 * (1 - f) * sing);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ the First Thread

const FIRST_PATH: number[] = (() => {
  const p: number[] = [];
  // a spiral rising out of the ground
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    const a = u * Math.PI * 6;
    const r = 30 * (1 - u) + 4;
    p.push(Math.cos(a) * r, -u * 62 + Math.sin(a) * r * 0.25);
  }
  const line = (pts: number[], steps: number): void => {
    for (let s = 0; s < pts.length - 2; s += 2) {
      const [x0, y0, x1, y1] = [pts[s], pts[s + 1], pts[s + 2], pts[s + 3]];
      for (let i = 1; i <= steps; i++) p.push(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
    }
  };
  line([0, -62, -14, -84, -34, -110, -72, -92, -36, -104, -10, -124], 6);
  for (let i = 0; i <= 30; i++) {
    const a = Math.PI / 2 + 0.6 + (i / 30) * (TAU - 1.2);
    p.push(Math.sin(a) * 15 * -1, -142 + Math.cos(a) * 16);
  }
  line([10, -124, 36, -104, 72, -94, 34, -110, 16, -84, 0, -62], 6);
  return p;
})();

const FIRST_COLS = ['#ffffff', '#ffe9a8', '#a8e8ff', '#ffb0e0', '#c8ffb8'];

export function drawFirstThread(ctx: Ctx, k: K): void {
  const n = FIRST_PATH.length / 2;
  const prog = Math.min(1, 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(k.t * 0.6 + k.seed)) + k.wind * 0.3 + k.cast);
  const shown = Math.max(2, Math.floor(n * prog));
  const wob = (i: number): number => Math.sin(k.t * 2 + i * 0.3) * 1.6;
  glow(ctx, 0, -90, 120, '#e8f0ff', 0.25 + k.cast * 0.3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let pass = 0; pass < 2; pass++) {
    const chunk = 12;
    for (let c = 0; c < shown - 1; c += chunk) {
      const col = FIRST_COLS[(Math.floor(c / chunk) + Math.floor(k.t * 3)) % FIRST_COLS.length];
      ctx.beginPath();
      for (let i = c; i <= Math.min(shown - 1, c + chunk); i++) {
        const x = FIRST_PATH[i * 2] + wob(i);
        const y = FIRST_PATH[i * 2 + 1] + wob(i + 7) * 0.6;
        if (i === c) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = k.a(col, pass ? 1 : 0.22);
      ctx.lineWidth = pass ? 1.8 : 7;
      ctx.stroke();
    }
  }
  // the growing tip
  const tx = FIRST_PATH[(shown - 1) * 2];
  const ty = FIRST_PATH[(shown - 1) * 2 + 1];
  glow(ctx, tx, ty, 14, '#ffffff', 0.9);
  // lashing threads on attack
  if (k.atk > 0.05 || k.wind > 0.3) {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-70, -92);
      ctx.quadraticCurveTo(-120 - k.atk * 60, -120 + i * 18 + Math.sin(k.t * 9 + i) * 10, -170 - k.atk * 120, -60 + i * 20);
      ctx.strokeStyle = k.a(FIRST_COLS[i], 0.8);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }
  ctx.restore();
  // the first knot (weak point)
  const pulse = 1 + Math.sin(k.t * 3) * 0.15;
  glow(ctx, 0, -100, 26 * pulse, '#fff4c0', 0.8);
  for (let i = 0; i < 3; i++) {
    ell(ctx, 0, -100, 8 * pulse, 3.5 * pulse, i * 1.05 + k.t);
    ctx.strokeStyle = k.c('#fffaf0');
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ the Weaver

function weaverHand(ctx: Ctx, k: K, x: number, y: number, ang: number, light: string, shears: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ell(ctx, 0, 0, 8, 6);
  paint(ctx, k, light, -8, -6, 8, 6, true, 0.35, -0.1);
  ctx.strokeStyle = k.c(light);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(6, -4 + i * 2.6);
    ctx.lineTo(13, -6 + i * 3.4);
  }
  ctx.stroke();
  ctx.strokeStyle = k.c('#e6ecf4');
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (shears) {
    ctx.moveTo(10, -2);
    ctx.lineTo(34, -8);
    ctx.moveTo(10, 2);
    ctx.lineTo(34, 8);
  } else {
    ctx.moveTo(8, 0);
    ctx.lineTo(38, 0);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawWeaver(ctx: Ctx, k: K, phase: 1 | 2 | 3): void {
  const light = phase === 3 ? '#f4f0ff' : '#fff4d8';
  const edge = phase === 1 ? '#e8c86a' : phase === 2 ? '#c8a0e8' : '#8a6ad8';
  const bob = Math.sin(k.t * 0.9 + k.seed) * 3;
  const cy = -118 + bob;
  // halo: a loom-wheel of threads
  ctx.save();
  ctx.translate(0, cy);
  ctx.rotate(k.t * (phase === 3 ? -0.3 : 0.12));
  glow(ctx, 0, 0, 80, edge, 0.35 + k.cast * 0.4);
  const spokes = 28;
  ctx.strokeStyle = k.a(light, 0.75);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    if (phase >= 2 && hash(i, phase) > (phase === 2 ? 0.75 : 0.5)) continue;
    const a = (i / spokes) * TAU;
    ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
    ctx.lineTo(Math.cos(a) * 54, Math.sin(a) * 54);
  }
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = k.c(edge);
  if (phase === 1) {
    circ(ctx, 0, 0, 54);
    ctx.stroke();
  } else {
    const arcs = phase === 2 ? 5 : 7;
    for (let i = 0; i < arcs; i++) {
      const a0 = (i / arcs) * TAU + (phase === 3 ? Math.sin(k.t + i) * 0.3 : 0);
      const rr = 54 + (phase === 3 ? 8 + Math.sin(k.t * 1.5 + i) * 8 : 0);
      ctx.beginPath();
      ctx.arc(0, 0, rr, a0, a0 + (TAU / arcs) * 0.7);
      ctx.stroke();
    }
  }
  ctx.restore();
  // robe of light
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.beginPath();
  ctx.moveTo(-16, cy - 6);
  ctx.lineTo(16, cy - 6);
  ctx.quadraticCurveTo(34, -60, 44, -6);
  ctx.lineTo(-44, -6);
  ctx.quadraticCurveTo(-34, -60, -16, cy - 6);
  ctx.closePath();
  paint(ctx, k, phase === 3 ? '#d8d0f0' : '#f8ecd0', -44, cy, 44, 0, true, 0.35, -0.2);
  ctx.restore();
  // warp threads making the body
  ctx.strokeStyle = k.a(light, 0.8);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < 15; i++) {
    const f = i / 14;
    const x0 = -40 + f * 80;
    const x1 = -12 + f * 24;
    const w = Math.sin(k.t * 1.6 + i) * (phase === 3 ? 5 : 2);
    ctx.moveTo(x0, -8);
    ctx.quadraticCurveTo((x0 + x1) / 2 + w, -60, x1, cy);
  }
  ctx.stroke();
  // pointed-arch windows
  ctx.strokeStyle = k.c(edge);
  ctx.lineWidth = 1.6;
  for (const ax of [-14, 14]) {
    ctx.beginPath();
    ctx.moveTo(ax - 7, -30);
    ctx.lineTo(ax - 7, -54);
    ctx.quadraticCurveTo(ax, -68, ax + 7, -54);
    ctx.lineTo(ax + 7, -30);
    ctx.stroke();
  }
  // the heart of the loom
  if (phase >= 2) {
    const pulse = 1 + Math.sin(k.t * 4) * 0.15;
    glow(ctx, 0, -70, 26 * pulse, phase === 3 ? '#b090ff' : '#ffd98a', 0.85);
    circ(ctx, 0, -70, 7 * pulse);
    ctx.fillStyle = k.c('#ffffff');
    ctx.fill();
  }
  // unravelling (phase 3)
  if (phase === 3) {
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1;
      strand(ctx, k, side * (20 + hash(i) * 20), -20 - hash(i, 2) * 90, 40 + hash(i, 4) * 50, side > 0 ? -0.2 : Math.PI + 0.2, i % 3 ? '#e8e0ff' : '#8a6ad8', 1.4, i, 0.5);
    }
  }
  // mask with three eyes
  ell(ctx, 0, cy - 8, 15, 19);
  paint(ctx, k, light, -15, cy - 27, 15, cy + 11, true, 0.35, -0.1);
  ctx.strokeStyle = k.c(edge);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const eyeCol = phase === 3 ? '#c8a8ff' : '#ffd36a';
  eye(ctx, k, 0, cy - 14, 4, eyeCol, 1.2 + k.cast);
  eye(ctx, k, -7, cy - 4, 2.4, eyeCol, 1);
  eye(ctx, k, 7, cy - 4, 2.4, eyeCol, 1);
  if (phase === 3) {
    ctx.strokeStyle = k.a('#e8e0ff', 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const ex of [-7, 7]) {
      ctx.moveTo(ex, cy - 2);
      ctx.lineTo(ex + Math.sin(k.t * 2 + ex) * 1.5, cy + 16 + ((k.t * 20) % 10));
    }
    ctx.stroke();
  }
  // the many hands
  const n = phase === 1 ? 4 : phase === 2 ? 6 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + k.t * 0.18 + 0.3;
    const weave = Math.sin(k.t * 2 + i * 1.7) * 6;
    const hx = Math.cos(a) * (72 + weave) - k.atk * 30 * (Math.cos(a) < 0 ? 1 : 0.3);
    const hy = -78 + Math.sin(a) * 52 + weave * 0.5 + k.wind * Math.sin(a) * -10;
    ctx.strokeStyle = k.a(light, 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 18, -78 + Math.sin(a) * 20);
    ctx.quadraticCurveTo(Math.cos(a) * 46, -78 + Math.sin(a) * 30 - 10, hx, hy);
    ctx.stroke();
    weaverHand(ctx, k, hx, hy, a + Math.sin(k.t * 3 + i) * 0.4, light, i % 3 === 2);
  }
  seam(ctx, k, [-30, -10, 0, -16, 30, -10], edge, 1.6, 5);
}


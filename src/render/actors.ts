// The character rig: soft painted figures built from a skeleton (2-bone IK for arms and legs), a flowing coat with
// secondary motion, per-character hair, faces and weapons. Also NPC looks and dialogue portraits.
import { CHARS, type Look } from '../data/characters';
import { OUTFITS } from '../data/items';
import type { CharId, Expr } from '../data/types';
import { rgba, shade, clamp, hashStr, rng } from '../core/util';
import { ctx2d, drawGlow, makeCanvas } from './canvas';

export type ActorAnim =
  | 'idle'
  | 'walk'
  | 'run'
  | 'kneel'
  | 'down'
  | 'sit'
  | 'cast'
  | 'point'
  | 'look_up'
  | 'hug'
  | 'fall'
  | 'guard'
  | 'attack'
  | 'slash'
  | 'thrust'
  | 'bash'
  | 'shoot'
  | 'hurt'
  | 'victory'
  | 'reach'
  | 'parry'
  | 'dodge'
  | 'jump'
  | 'ko'
  | 'ready';

export interface ActorPose {
  anim: ActorAnim;
  t: number;
  p: number;
  face: 1 | -1;
  walk: number;
  flash: number;
  alpha: number;
  scale: number;
  ghost?: boolean;
  talking?: boolean;
  blink?: boolean;
}

export type WeaponKind = 'needle' | 'shield' | 'spool' | 'shears' | 'bell' | 'pistol' | 'blades' | 'none' | 'staff' | 'lantern';

const WEAPON_OF: Record<CharId, WeaponKind> = { ash: 'needle', corin: 'shield', wick: 'spool', orrin: 'shears', maudra: 'bell', rook: 'pistol', tess: 'blades' };

/** knee/elbow by 2-bone IK; bend: +1 bends forward (+x), -1 backward */
function ik(ax: number, ay: number, bx: number, by: number, l1: number, l2: number, bend: number): [number, number] {
  const dx = bx - ax;
  const dy = by - ay;
  let d = Math.hypot(dx, dy);
  d = clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + (dx * a) / d;
  const my = ay + (dy * a) / d;
  return [mx + (bend * -dy * h) / d, my + (bend * dx * h) / d];
}

function limb(ctx: CanvasRenderingContext2D, ax: number, ay: number, kx: number, ky: number, bx: number, by: number, w1: number, w2: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = w1;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.lineWidth = w2;
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

interface Frame {
  bob: number;
  lean: number; // radians
  hipY: number;
  feet: [number, number, number, number]; // back foot x,y, front foot x,y
  hands: [number, number, number, number]; // back hand x,y, front hand x,y
  head: number; // head tilt
  weaponAng: number;
  rot: number; // whole-body rotation (down/fall)
  crouch: number;
  coatFlow: number;
}

function frameFor(p: ActorPose, H: number): Frame {
  const t = p.t;
  const breathe = Math.sin(t * 2.2) * 0.012 * H;
  const f: Frame = {
    bob: breathe,
    lean: 0,
    hipY: -H * 0.47,
    feet: [-H * 0.07, 0, H * 0.07, 0],
    hands: [-H * 0.12, -H * 0.4, H * 0.14, -H * 0.42],
    head: 0,
    weaponAng: -0.4,
    rot: 0,
    crouch: 0,
    coatFlow: Math.sin(t * 1.7) * 0.5,
  };
  const e = p.p;
  switch (p.anim) {
    case 'walk':
    case 'run': {
      const run = p.anim === 'run';
      const ph = p.walk;
      const stride = H * (run ? 0.2 : 0.13);
      const s = Math.sin(ph);
      f.feet = [-s * stride, -Math.max(0, Math.cos(ph)) * H * (run ? 0.07 : 0.04), s * stride, -Math.max(0, -Math.cos(ph)) * H * (run ? 0.07 : 0.04)];
      f.bob = -Math.abs(Math.cos(ph)) * H * (run ? 0.03 : 0.018);
      f.hands = [-H * 0.08 + s * H * 0.12, -H * 0.42, H * 0.1 - s * H * 0.12, -H * 0.42];
      f.lean = run ? 0.16 : 0.05;
      f.coatFlow = -1.2 - Math.abs(s) * 0.6;
      break;
    }
    case 'ready':
      f.feet = [-H * 0.12, 0, H * 0.12, 0];
      f.crouch = H * 0.03;
      f.hands = [-H * 0.02, -H * 0.5, H * 0.22, -H * 0.52];
      f.weaponAng = -0.9;
      f.lean = 0.06;
      break;
    case 'slash':
    case 'attack': {
      const k = e < 0.35 ? e / 0.35 : 1;
      const sw = e < 0.35 ? 0 : Math.min(1, (e - 0.35) / 0.25);
      f.feet = [-H * 0.14, 0, H * 0.18, 0];
      f.lean = 0.12 + sw * 0.15;
      f.crouch = H * 0.04;
      const ang = -2.4 * k + 3.6 * sw;
      f.hands = [-H * 0.05, -H * 0.45, Math.cos(ang - 1.3) * H * 0.3 + H * 0.05, Math.sin(ang - 1.3) * H * 0.3 - H * 0.6];
      f.weaponAng = ang - 1.0;
      f.coatFlow = -0.8;
      break;
    }
    case 'thrust': {
      const k = e < 0.3 ? -e / 0.3 : Math.min(1, (e - 0.3) / 0.2);
      f.feet = [-H * 0.16, 0, H * 0.2, 0];
      f.lean = 0.2 * Math.max(0, k);
      f.crouch = H * 0.05;
      f.hands = [-H * 0.15, -H * 0.55, H * (0.2 + 0.22 * k), -H * 0.56];
      f.weaponAng = 0;
      break;
    }
    case 'bash': {
      const k = e < 0.3 ? -e / 0.3 : Math.min(1, (e - 0.3) / 0.25);
      f.feet = [-H * 0.15, 0, H * 0.2, 0];
      f.lean = 0.25 * Math.max(0, k);
      f.hands = [-H * 0.1, -H * 0.5, H * (0.22 + 0.18 * k), -H * 0.55];
      f.weaponAng = 0;
      break;
    }
    case 'shoot': {
      const rec = e > 0.3 && e < 0.5 ? (0.5 - e) * 5 : 0;
      f.feet = [-H * 0.12, 0, H * 0.12, 0];
      f.hands = [-H * 0.05, -H * 0.52, H * 0.38 - rec * H * 0.05, -H * 0.62 - rec * H * 0.04];
      f.weaponAng = -0.05 - rec * 0.4;
      f.lean = -rec * 0.1;
      break;
    }
    case 'cast':
      f.hands = [H * 0.12, -H * 0.72 - Math.sin(t * 6) * 2, H * 0.24, -H * 0.66];
      f.lean = -0.05;
      f.head = -0.15;
      f.weaponAng = -1.2;
      f.coatFlow = Math.sin(t * 5) * 1.2;
      break;
    case 'hurt':
      f.lean = -0.25;
      f.hands = [-H * 0.25, -H * 0.55, H * 0.05, -H * 0.62];
      f.head = 0.2;
      f.feet = [-H * 0.12, 0, H * 0.06, 0];
      break;
    case 'parry':
      f.feet = [-H * 0.14, 0, H * 0.12, 0];
      f.lean = -0.08;
      f.hands = [H * 0.0, -H * 0.62, H * 0.18, -H * 0.72];
      f.weaponAng = -1.9;
      break;
    case 'dodge':
      f.feet = [-H * 0.2, 0, H * 0.02, 0];
      f.lean = -0.35;
      f.crouch = H * 0.08;
      f.hands = [-H * 0.25, -H * 0.4, -H * 0.02, -H * 0.5];
      break;
    case 'jump':
      f.feet = [-H * 0.08, -H * 0.12, H * 0.1, -H * 0.16];
      f.hands = [-H * 0.2, -H * 0.65, H * 0.2, -H * 0.66];
      f.crouch = H * 0.04;
      break;
    case 'guard':
      f.feet = [-H * 0.12, 0, H * 0.14, 0];
      f.hands = [H * 0.0, -H * 0.5, H * 0.22, -H * 0.55];
      f.weaponAng = -1.4;
      f.crouch = H * 0.03;
      break;
    case 'kneel':
      f.feet = [-H * 0.18, 0, H * 0.12, 0];
      f.crouch = H * 0.17;
      f.hands = [-H * 0.04, -H * 0.3, H * 0.15, -H * 0.3];
      f.head = 0.15;
      break;
    case 'sit':
      f.crouch = H * 0.22;
      f.feet = [H * 0.1, 0, H * 0.2, 0];
      f.hands = [H * 0.08, -H * 0.28, H * 0.16, -H * 0.3];
      break;
    case 'down':
    case 'ko':
      f.rot = -Math.PI / 2;
      f.hands = [-H * 0.1, -H * 0.36, H * 0.1, -H * 0.4];
      break;
    case 'fall':
      f.rot = -Math.PI / 2 * Math.min(1, e);
      f.lean = -0.3;
      break;
    case 'look_up':
      f.head = -0.4;
      f.hands = [-H * 0.12, -H * 0.4, H * 0.12, -H * 0.42];
      break;
    case 'point':
      f.hands = [-H * 0.12, -H * 0.4, H * 0.36, -H * 0.82];
      f.head = -0.1;
      break;
    case 'reach':
      f.hands = [-H * 0.05, -H * 0.5, H * 0.38, -H * 0.55];
      f.lean = 0.12;
      break;
    case 'hug':
      f.hands = [H * 0.16, -H * 0.62, H * 0.22, -H * 0.6];
      f.lean = 0.08;
      break;
    case 'victory':
      f.hands = [-H * 0.15, -H * 0.42, H * 0.12, -H * 0.95];
      f.weaponAng = -1.6;
      f.head = -0.1;
      break;
  }
  return f;
}

/** Hair drawn around a head at (0,0) radius r, facing +x. */
function drawHair(ctx: CanvasRenderingContext2D, L: Look, r: number, t: number, back: boolean): void {
  ctx.fillStyle = L.hair;
  const sway = Math.sin(t * 1.8) * r * 0.08;
  switch (L.hairStyle) {
    case 'bob':
      if (back) {
        ctx.beginPath();
        ctx.moveTo(-r * 1.05, -r * 0.2);
        ctx.quadraticCurveTo(-r * 1.25 + sway, r * 0.9, -r * 0.2, r * 0.95);
        ctx.lineTo(r * 0.3, r * 0.6);
        ctx.quadraticCurveTo(-r * 0.5, 0, -r * 1.05, -r * 0.2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-r * 1.05, r * 0.1);
        ctx.quadraticCurveTo(-r * 1.1, -r * 1.2, r * 0.2, -r * 1.1);
        ctx.quadraticCurveTo(r * 1.15, -r * 0.9, r * 1.05, -r * 0.1);
        ctx.quadraticCurveTo(r * 0.6, -r * 0.55, r * 0.05, -r * 0.45);
        ctx.quadraticCurveTo(-r * 0.4, -r * 0.3, -r * 0.55, r * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'long':
      if (back) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.5);
        ctx.quadraticCurveTo(-r * 1.4 + sway, r * 1.2, -r * 0.6 + sway, r * 2.1);
        ctx.lineTo(r * 0.1, r * 1.2);
        ctx.quadraticCurveTo(-r * 0.4, 0, -r * 0.9, -r * 0.5);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, -r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
        ctx.quadraticCurveTo(r * 0.3, -r * 0.5, -r * 0.7, r * 0.3);
        ctx.fill();
      }
      break;
    case 'short':
      if (!back) {
        ctx.beginPath();
        ctx.arc(-r * 0.05, -r * 0.12, r * 1.02, Math.PI * 0.95, Math.PI * 1.92);
        ctx.quadraticCurveTo(r * 0.4, -r * 0.65, -r * 0.6, -r * 0.2);
        ctx.quadraticCurveTo(-r * 0.9, r * 0.2, -r * 0.95, r * 0.25);
        ctx.fill();
      }
      break;
    case 'messy':
      if (!back) {
        ctx.beginPath();
        ctx.arc(-r * 0.1, -r * 0.15, r * 1.05, Math.PI * 0.9, Math.PI * 1.9);
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * (0.95 + i * 0.17);
          ctx.lineTo(Math.cos(a) * r * 1.35 - r * 0.1, Math.sin(a) * r * 1.35 - r * 0.15 + (i % 2) * r * 0.2);
          ctx.lineTo(Math.cos(a + 0.08) * r * 1.0 - r * 0.1, Math.sin(a + 0.08) * r * 1.0 - r * 0.15);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'bun':
      if (back) {
        ctx.beginPath();
        ctx.arc(-r * 0.75, -r * 0.55, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 1.02, Math.PI * 1.0, Math.PI * 1.9);
        ctx.quadraticCurveTo(r * 0.2, -r * 0.6, -r * 0.8, r * 0.1);
        ctx.fill();
      }
      break;
    case 'braid':
      if (back) {
        ctx.strokeStyle = L.hair;
        ctx.lineWidth = r * 0.45;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, 0);
        ctx.quadraticCurveTo(-r * 1.2 + sway, r * 1.2, -r * 0.9 + sway * 2, r * 2.2);
        ctx.stroke();
        ctx.fillStyle = shade(L.hair, -0.25);
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(-r * 0.85 - i * r * 0.06 + sway * (i / 5), r * 0.3 + i * r * 0.38, r * 0.14, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, -r * 0.12, r * 1.03, Math.PI * 0.98, Math.PI * 1.95);
        ctx.quadraticCurveTo(r * 0.5, -r * 0.55, -r * 0.2, -r * 0.5);
        ctx.quadraticCurveTo(-r * 0.7, -r * 0.2, -r * 0.85, r * 0.3);
        ctx.fill();
      }
      break;
    case 'tuft': {
      // Wick: a ball of glowing yarn with loose loops
      if (!back) {
        ctx.strokeStyle = L.hair;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI * (0.15 + i * 0.09);
          const len = r * (0.5 + ((i * 37) % 7) / 10);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
          ctx.quadraticCurveTo(Math.cos(a) * (r + len) + Math.sin(t * 3 + i) * 3, Math.sin(a) * (r + len), Math.cos(a + 0.3) * (r + len * 0.6), Math.sin(a + 0.3) * (r + len * 0.6));
          ctx.stroke();
        }
      }
      break;
    }
    case 'bald':
    case 'hood':
      break;
  }
}

function drawWeapon(ctx: CanvasRenderingContext2D, kind: WeaponKind, x: number, y: number, ang: number, H: number, trim: string, t: number, back: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const u = H / 120;
  switch (kind) {
    case 'needle':
      if (back) break;
      ctx.strokeStyle = '#e8eef4';
      ctx.lineWidth = 2.2 * u;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(62 * u, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath();
      ctx.moveTo(4 * u, -1 * u);
      ctx.lineTo(58 * u, -0.5 * u);
      ctx.stroke();
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.arc(2 * u, 0, 5 * u, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = shade(trim, -0.3);
      ctx.fillRect(-8 * u, -1.5 * u, 8 * u, 3 * u);
      // the needle's eye with a trailing thread
      ctx.strokeStyle = '#e25b3a';
      ctx.lineWidth = 1 * u;
      ctx.beginPath();
      ctx.moveTo(60 * u, 0);
      ctx.quadraticCurveTo(40 * u, 10 * u + Math.sin(t * 4) * 4 * u, 20 * u, 6 * u);
      ctx.stroke();
      break;
    case 'shield':
      if (back) {
        // the mallet in the back hand
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 3 * u;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(24 * u, 0);
        ctx.stroke();
        ctx.fillStyle = '#7a6a5a';
        ctx.fillRect(22 * u, -7 * u, 12 * u, 14 * u);
        break;
      }
      ctx.rotate(-ang);
      {
        const g = ctx.createLinearGradient(-10 * u, -30 * u, 20 * u, 30 * u);
        g.addColorStop(0, '#9a7a4a');
        g.addColorStop(1, '#5a3e22');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(-4 * u, -34 * u, 26 * u, 58 * u, 10 * u);
        ctx.fill();
        ctx.strokeStyle = trim;
        ctx.lineWidth = 2.5 * u;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5 * u;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-2 * u, (-20 + i * 16) * u);
          ctx.lineTo(20 * u, (-20 + i * 16) * u);
          ctx.stroke();
        }
        ctx.fillStyle = trim;
        ctx.beginPath();
        ctx.arc(9 * u, -5 * u, 4 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'spool':
      if (back) break;
      ctx.strokeStyle = '#ff9a5a';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(12 * u, 10 * u + Math.sin(t * 3) * 3, 22 * u, 2 * u);
      ctx.stroke();
      ctx.fillStyle = '#b8864a';
      ctx.fillRect(18 * u, -8 * u, 4 * u, 18 * u);
      ctx.fillRect(30 * u, -8 * u, 4 * u, 18 * u);
      ctx.fillStyle = '#e25b3a';
      ctx.fillRect(22 * u, -6 * u, 8 * u, 14 * u);
      break;
    case 'shears':
      if (back) break;
      ctx.fillStyle = '#c8d0d8';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.rotate(s * 0.08);
        ctx.beginPath();
        ctx.moveTo(6 * u, -2 * u);
        ctx.lineTo(70 * u, -1 * u * s);
        ctx.lineTo(6 * u, 3 * u);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = '#3a4250';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.ellipse(-4 * u, -6 * u, 6 * u, 4 * u, 0, 0, Math.PI * 2);
      ctx.ellipse(-4 * u, 6 * u, 6 * u, 4 * u, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'bell':
      if (back) break;
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(-30 * u, 0);
      ctx.lineTo(44 * u, 0);
      ctx.stroke();
      ctx.save();
      ctx.translate(46 * u, 0);
      ctx.rotate(Math.PI / 2 - ang + Math.sin(t * 3) * 0.15);
      ctx.fillStyle = '#e0e4ea';
      ctx.beginPath();
      ctx.moveTo(-7 * u, 12 * u);
      ctx.quadraticCurveTo(-6 * u, 0, 0, -2 * u);
      ctx.quadraticCurveTo(6 * u, 0, 7 * u, 12 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9a0e0';
      ctx.beginPath();
      ctx.arc(0, 13 * u, 2 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    case 'pistol':
      if (back) break;
      ctx.fillStyle = '#2a2624';
      ctx.fillRect(0, -3 * u, 40 * u, 5 * u);
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath();
      ctx.moveTo(0, -2 * u);
      ctx.lineTo(-4 * u, 10 * u);
      ctx.lineTo(4 * u, 10 * u);
      ctx.lineTo(8 * u, 2 * u);
      ctx.fill();
      ctx.fillStyle = trim;
      ctx.fillRect(10 * u, -5 * u, 8 * u, 9 * u);
      break;
    case 'blades':
      ctx.fillStyle = '#d8e4ea';
      ctx.beginPath();
      ctx.moveTo(4 * u, -2 * u);
      ctx.lineTo(42 * u, 0);
      ctx.lineTo(4 * u, 2.5 * u);
      ctx.fill();
      ctx.fillStyle = trim;
      ctx.fillRect(-4 * u, -3 * u, 8 * u, 6 * u);
      break;
    case 'staff':
      if (back) break;
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(-34 * u, 0);
      ctx.lineTo(40 * u, 0);
      ctx.stroke();
      break;
    case 'lantern':
      if (back) break;
      drawGlow(ctx, 10 * u, 8 * u, 26 * u, '#ffc46a', 0.7);
      ctx.fillStyle = '#ffd88a';
      ctx.fillRect(6 * u, 2 * u, 8 * u, 12 * u);
      break;
    case 'none':
      break;
  }
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, L: Look, r: number, expr: Expr, blink: boolean, talking: boolean, t: number, big: boolean): void {
  const eyeY = -r * 0.05;
  const ex = r * 0.38;
  const ew = r * (big ? 0.13 : 0.12);
  const eh = r * (big ? 0.2 : 0.17);
  const glowEyes = !!L.glow;
  ctx.fillStyle = glowEyes ? L.eyes : L.eyes;
  const closed = blink || expr === 'laugh' || (expr === 'cry' && !big);
  for (const s of [-1, 1]) {
    const x = ex + s * r * 0.27;
    if (closed) {
      ctx.strokeStyle = L.eyes;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      if (expr === 'laugh') ctx.arc(x, eyeY + eh * 0.3, ew, Math.PI * 1.1, Math.PI * 1.9);
      else {
        ctx.moveTo(x - ew, eyeY);
        ctx.lineTo(x + ew, eyeY);
      }
      ctx.stroke();
    } else {
      const wide = expr === 'shock' || expr === 'afraid' ? 1.25 : expr === 'tired' ? 0.6 : 1;
      if (big && !glowEyes) {
        ctx.fillStyle = '#fbf4ea';
        ctx.beginPath();
        ctx.ellipse(x, eyeY, ew * 1.5, eh * wide, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = L.eyes;
        ctx.beginPath();
        ctx.ellipse(x + ew * 0.25, eyeY + eh * 0.1, ew * 0.95, eh * 0.85 * wide, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x + ew * 0.3, eyeY + eh * 0.15, ew * 0.45, eh * 0.45 * wide, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + ew * 0.55, eyeY - eh * 0.25, ew * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        if (glowEyes) drawGlow(ctx, x, eyeY, ew * 3, L.glow!, 0.6);
        ctx.fillStyle = L.eyes;
        ctx.beginPath();
        ctx.ellipse(x, eyeY, ew, eh * wide, 0, 0, Math.PI * 2);
        ctx.fill();
        if (big || glowEyes) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x + ew * 0.3, eyeY - eh * 0.35, ew * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // brows
    ctx.strokeStyle = glowEyes ? rgba(L.eyes, 0.7) : shade(L.hair, -0.2);
    ctx.lineWidth = Math.max(1, r * (big ? 0.07 : 0.06));
    const by = eyeY - eh * 1.5;
    let tilt = 0;
    if (expr === 'angry' || expr === 'determined') tilt = s * 0.35;
    if (expr === 'sad' || expr === 'cry' || expr === 'afraid' || expr === 'tender') tilt = -s * 0.3;
    if (expr === 'shock') tilt = 0;
    const lift = expr === 'shock' ? -eh * 0.5 : expr === 'smirk' && s > 0 ? -eh * 0.3 : 0;
    ctx.beginPath();
    ctx.moveTo(x - ew * 1.3, by + lift - tilt * ew);
    ctx.lineTo(x + ew * 1.3, by + lift + tilt * ew);
    ctx.stroke();
  }
  // mouth
  const mx = r * 0.42;
  const my = r * 0.45;
  ctx.strokeStyle = shade(L.skin, -0.45);
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.lineCap = 'round';
  const open = talking ? Math.abs(Math.sin(t * 14)) : 0;
  ctx.beginPath();
  switch (expr) {
    case 'smile':
    case 'tender':
      ctx.arc(mx, my - r * 0.12, r * 0.18, Math.PI * 0.2, Math.PI * 0.8);
      break;
    case 'laugh':
      ctx.fillStyle = shade(L.skin, -0.5);
      ctx.arc(mx, my - r * 0.05, r * 0.16, 0, Math.PI);
      ctx.fill();
      break;
    case 'smirk':
      ctx.moveTo(mx - r * 0.12, my);
      ctx.quadraticCurveTo(mx + r * 0.05, my + r * 0.04, mx + r * 0.16, my - r * 0.08);
      break;
    case 'sad':
    case 'cry':
    case 'tired':
      ctx.arc(mx, my + r * 0.14, r * 0.13, Math.PI * 1.2, Math.PI * 1.8);
      break;
    case 'angry':
    case 'determined':
      ctx.moveTo(mx - r * 0.13, my);
      ctx.lineTo(mx + r * 0.13, my - r * 0.02);
      break;
    case 'shock':
    case 'afraid':
      ctx.fillStyle = shade(L.skin, -0.5);
      ctx.ellipse(mx, my, r * 0.08, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      if (open > 0.3) {
        ctx.fillStyle = shade(L.skin, -0.5);
        ctx.ellipse(mx, my, r * 0.1, r * 0.06 * open, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(mx - r * 0.1, my);
        ctx.lineTo(mx + r * 0.1, my);
      }
  }
  ctx.stroke();
  if (talking && expr !== 'neutral' && open > 0.5) {
    ctx.fillStyle = shade(L.skin, -0.5);
    ctx.beginPath();
    ctx.ellipse(mx, my + r * 0.02, r * 0.07, r * 0.05 * open, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (expr === 'cry' || (expr === 'sad' && big)) {
    ctx.fillStyle = 'rgba(160,210,255,0.85)';
    for (const s of [-1, 1]) {
      const x = ex + s * r * 0.27;
      const ty = eyeY + eh + ((t * 30) % (r * 0.8));
      if (expr === 'cry' || s > 0) {
        ctx.beginPath();
        ctx.ellipse(x, ty, r * 0.035, r * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (expr === 'laugh' || expr === 'tender' || expr === 'smile') {
    ctx.fillStyle = 'rgba(240,120,110,0.25)';
    ctx.beginPath();
    ctx.ellipse(ex + r * 0.55, my - r * 0.15, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface Figure {
  look: Look;
  weapon: WeaponKind;
  kind?: string;
}

export function figureFor(id: CharId, outfit?: string | null): Figure {
  const base = CHARS[id].look;
  const o = outfit ? OUTFITS[outfit] : undefined;
  return { look: o ? { ...base, coat: o.coat, coat2: o.coat2, trim: o.trim } : base, weapon: WEAPON_OF[id], kind: id };
}

/** Draw a full-body figure with feet at (x, y). Size: about 120 * height * scale px tall. */
export function drawFigure(ctx: CanvasRenderingContext2D, fig: Figure, x: number, y: number, p: ActorPose, expr: Expr = 'neutral'): void {
  const L = fig.look;
  const H = 120 * L.height;
  const fr = frameFor(p, H);
  const bw = L.build;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.face * p.scale, p.scale);
  if (fr.rot) {
    ctx.translate(0, -H * 0.08);
    ctx.rotate(fr.rot);
    ctx.translate(H * 0.12, 0);
  }
  ctx.globalAlpha *= p.alpha * (p.ghost ? 0.55 : 1);
  // soft contact shadow
  if (!fr.rot) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 1, H * 0.2 * bw, H * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (L.glow) drawGlow(ctx, 0, -H * 0.55, H * 0.75, L.glow, 0.28 + 0.08 * Math.sin(p.t * 3));
  const hipY = fr.hipY + fr.crouch + fr.bob;
  ctx.rotate(fr.lean * 0.5);
  const shY = hipY - H * 0.33;
  const shX = fr.lean * H * 0.1;
  const legL = H * 0.25;
  const legW = H * 0.075 * bw;
  const pants = shade(L.coat2, -0.25);
  const boots = shade(L.coat2, -0.5);
  // back leg
  const [bfx, bfy, ffx, ffy] = fr.feet;
  const bk = ik(-H * 0.04, hipY, bfx, bfy - H * 0.02, legL, legL, 1);
  limb(ctx, -H * 0.04, hipY, bk[0], bk[1], bfx, bfy - H * 0.03, legW, legW * 0.9, shade(pants, -0.15));
  ctx.fillStyle = shade(boots, -0.1);
  ctx.beginPath();
  ctx.ellipse(bfx + H * 0.02, bfy - H * 0.02, H * 0.055, H * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  // back arm + back weapon
  const armL = H * 0.17;
  const armW = H * 0.06 * Math.min(1.3, bw);
  const [bhx, bhy, fhx, fhy] = fr.hands;
  const be = ik(shX - H * 0.05, shY + H * 0.03, bhx, bhy, armL, armL, -1);
  drawWeapon(ctx, fig.weapon, bhx, bhy, fr.weaponAng + 0.3, H, L.trim, p.t, true);
  limb(ctx, shX - H * 0.05, shY + H * 0.03, be[0], be[1], bhx, bhy, armW, armW * 0.85, shade(L.coat, -0.25));
  ctx.fillStyle = shade(L.skin, -0.15);
  ctx.beginPath();
  ctx.arc(bhx, bhy, H * 0.028, 0, Math.PI * 2);
  ctx.fill();
  // hair behind head
  const headR = H * (fig.kind === 'wick' ? 0.13 : 0.1);
  const hx = shX + H * 0.02;
  const hy = shY - H * 0.1;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(fr.head);
  drawHair(ctx, L, headR, p.t, true);
  ctx.restore();
  // coat body with flowing tails
  const flow = fr.coatFlow;
  const tail = H * (fig.kind === 'wick' ? 0.3 : 0.27);
  const coatW = H * 0.13 * bw;
  const grad = ctx.createLinearGradient(-coatW, shY, coatW, hipY + tail);
  grad.addColorStop(0, shade(L.coat, 0.12));
  grad.addColorStop(0.55, L.coat);
  grad.addColorStop(1, L.coat2);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(shX - coatW * 0.85, shY);
  ctx.quadraticCurveTo(shX + coatW * 0.2, shY - H * 0.035, shX + coatW * 0.9, shY + H * 0.01);
  ctx.lineTo(coatW * 0.75, hipY);
  ctx.quadraticCurveTo(coatW * 1.0 + flow * 3, hipY + tail * 0.6, coatW * 0.8 + flow * 6, hipY + tail);
  ctx.quadraticCurveTo(0, hipY + tail * 1.06 + Math.sin(p.t * 2.3) * 2, -coatW * 1.0 + flow * 12, hipY + tail * 0.95);
  ctx.quadraticCurveTo(-coatW * 1.1 + flow * 6, hipY + tail * 0.4, -coatW * 0.75, hipY);
  ctx.closePath();
  ctx.fill();
  // trim line and buttons
  ctx.strokeStyle = L.trim;
  ctx.lineWidth = H * 0.012;
  ctx.beginPath();
  ctx.moveTo(shX + coatW * 0.25, shY + H * 0.02);
  ctx.lineTo(coatW * 0.3, hipY + tail * 0.9);
  ctx.stroke();
  ctx.fillStyle = L.trim;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(shX * (1 - i / 3) + coatW * 0.38, shY + H * 0.05 + i * H * 0.07, H * 0.01, 0, Math.PI * 2);
    ctx.fill();
  }
  // belt
  ctx.fillStyle = shade(L.coat2, -0.4);
  ctx.fillRect(-coatW * 0.8, hipY - H * 0.03, coatW * 1.6, H * 0.03);
  // rim light on the coat's back edge
  ctx.strokeStyle = 'rgba(255,240,210,0.22)';
  ctx.lineWidth = H * 0.012;
  ctx.beginPath();
  ctx.moveTo(shX - coatW * 0.85, shY + H * 0.01);
  ctx.quadraticCurveTo(-coatW * 1.1 + flow * 6, hipY + tail * 0.4, -coatW * 1.0 + flow * 12, hipY + tail * 0.92);
  ctx.stroke();
  if (fig.kind === 'wick') {
    // threads unspooling from the coat hem
    ctx.strokeStyle = rgba(L.glow ?? '#ff9a5a', 0.8);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const sx = -coatW + i * coatW * 0.45;
      ctx.beginPath();
      ctx.moveTo(sx, hipY + tail * 0.95);
      ctx.quadraticCurveTo(sx - 6 + Math.sin(p.t * 3 + i) * 4, hipY + tail + 10, sx - 10, hipY + tail + 14 + i * 2);
      ctx.stroke();
    }
  }
  // front leg
  const fk = ik(H * 0.04, hipY, ffx, ffy - H * 0.02, legL, legL, 1);
  limb(ctx, H * 0.04, hipY + H * 0.02, fk[0], fk[1], ffx, ffy - H * 0.03, legW, legW * 0.9, pants);
  ctx.fillStyle = boots;
  ctx.beginPath();
  ctx.ellipse(ffx + H * 0.02, ffy - H * 0.02, H * 0.058, H * 0.032, 0, 0, Math.PI * 2);
  ctx.fill();
  // neck + head
  ctx.fillStyle = shade(L.skin, -0.1);
  ctx.fillRect(hx - H * 0.025, hy + headR * 0.6, H * 0.05, H * 0.05);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(fr.head);
  if (fig.kind === 'wick') {
    const yarn = ctx.createRadialGradient(-headR * 0.3, -headR * 0.3, 1, 0, 0, headR);
    yarn.addColorStop(0, shade(L.skin, 0.35));
    yarn.addColorStop(1, L.skin);
    ctx.fillStyle = yarn;
    ctx.beginPath();
    ctx.arc(0, 0, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(L.skin, -0.2);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, headR * (0.4 + i * 0.13), headR * (0.9 - i * 0.05), i * 0.6, 0, Math.PI * 1.4);
      ctx.stroke();
    }
  } else {
    const sg = ctx.createRadialGradient(headR * 0.3, -headR * 0.3, 1, 0, 0, headR * 1.1);
    sg.addColorStop(0, shade(L.skin, 0.12));
    sg.addColorStop(1, shade(L.skin, -0.08));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(0, 0, headR * 0.95, headR, 0, 0, Math.PI * 2);
    ctx.fill();
    // nose
    ctx.fillStyle = shade(L.skin, -0.12);
    ctx.beginPath();
    ctx.ellipse(headR * 0.92, headR * 0.15, headR * 0.12, headR * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (L.beard) {
    ctx.fillStyle = L.beard;
    ctx.beginPath();
    ctx.moveTo(-headR * 0.1, headR * 0.3);
    ctx.quadraticCurveTo(headR * 0.5, headR * 1.25, headR * 0.95, headR * 0.35);
    ctx.quadraticCurveTo(headR * 0.5, headR * 0.6, -headR * 0.1, headR * 0.3);
    ctx.fill();
  }
  if (p.anim !== 'down' && p.anim !== 'ko') {
    const blink = p.blink ?? Math.sin(p.t * 0.9 + (hashStr(fig.kind ?? '') % 7)) > 0.985;
    ctx.save();
    ctx.scale(0.85, 0.85);
    drawFace(ctx, L, headR * 1.05, p.anim === 'hurt' ? 'afraid' : expr, blink, !!p.talking, p.t, false);
    ctx.restore();
  } else {
    ctx.strokeStyle = shade(L.skin, -0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(headR * 0.15, -headR * 0.05);
    ctx.lineTo(headR * 0.45, -headR * 0.05);
    ctx.stroke();
  }
  drawHair(ctx, L, headR, p.t, false);
  // hats
  if (L.hat === 'wide') {
    ctx.fillStyle = shade(L.coat, -0.2);
    ctx.beginPath();
    ctx.ellipse(0, -headR * 0.6, headR * 1.9, headR * 0.35, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-headR * 0.05, -headR * 0.9, headR * 0.9, headR * 0.55, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = L.trim;
    ctx.fillRect(-headR * 0.9, -headR * 0.82, headR * 1.8, headR * 0.15);
  } else if (L.hat === 'veil') {
    ctx.fillStyle = rgba('#f4efe4', 0.95);
    ctx.beginPath();
    ctx.moveTo(-headR * 1.1, headR * 1.6);
    ctx.quadraticCurveTo(-headR * 1.3, -headR * 1.2, headR * 0.3, -headR * 1.15);
    ctx.quadraticCurveTo(headR * 1.05, -headR * 0.9, headR * 0.6, -headR * 0.35);
    ctx.quadraticCurveTo(-headR * 0.2, -headR * 0.6, -headR * 0.3, headR * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = L.trim;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (L.hat === 'hood') {
    ctx.fillStyle = shade(L.coat, -0.15);
    ctx.beginPath();
    ctx.arc(-headR * 0.1, -headR * 0.05, headR * 1.25, Math.PI * 0.7, Math.PI * 1.95);
    ctx.quadraticCurveTo(headR * 0.3, -headR * 0.4, -headR * 0.5, headR * 1.1);
    ctx.fill();
  } else if (L.hat === 'cap') {
    ctx.fillStyle = shade(L.coat, -0.2);
    ctx.beginPath();
    ctx.ellipse(0, -headR * 0.7, headR * 1.05, headR * 0.5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(0, -headR * 0.75, headR * 1.4, headR * 0.15);
  }
  ctx.restore();
  // front arm + weapon
  const fe = ik(shX + H * 0.06, shY + H * 0.03, fhx, fhy, armL, armL, -1);
  limb(ctx, shX + H * 0.06, shY + H * 0.03, fe[0], fe[1], fhx, fhy, armW, armW * 0.85, L.coat);
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.arc(fhx, fhy, H * 0.03, 0, Math.PI * 2);
  ctx.fill();
  drawWeapon(ctx, fig.weapon, fhx, fhy, fr.weaponAng, H, L.trim, p.t, false);
  if (p.anim === 'cast') drawGlow(ctx, (bhx + fhx) / 2 + H * 0.05, (bhy + fhy) / 2, H * 0.3, L.glow ?? '#fff2c8', 0.6 + 0.3 * Math.sin(p.t * 10));
  ctx.restore();
  // hit flash
  if (p.flash > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y - H * 0.5 * p.scale, H * 0.7 * p.scale, '#ffffff', p.flash * 0.7);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ NPC looks

const NPC_LOOKS: Record<string, Partial<Look> & { weapon?: WeaponKind }> = {
  villager: { coat: '#8a6a4a', coat2: '#5a4430', trim: '#d8c08a', hairStyle: 'short', hair: '#5a3a22' },
  merchant: { coat: '#6a4a7a', coat2: '#4a3456', trim: '#e0c060', hairStyle: 'bald', hair: '#3a2a22', hat: 'cap' },
  priest: { coat: '#eae4d4', coat2: '#b8ad98', trim: '#c9a050', hairStyle: 'bun', hair: '#6a6058', hat: 'veil', weapon: 'bell' },
  child: { coat: '#b8603a', coat2: '#7a3a22', trim: '#f0d080', hairStyle: 'messy', hair: '#7a4a2a', height: 0.62, build: 0.85 },
  elder: { coat: '#6a5a4a', coat2: '#4a3e32', trim: '#c8b090', hairStyle: 'bun', hair: '#e0dcd4', height: 0.9, weapon: 'staff' },
  shear: { coat: '#2a2a32', coat2: '#1a1a20', trim: '#c8c8d0', hairStyle: 'short', hair: '#1a1a1a', hat: 'hood', weapon: 'shears' },
  arbiter: { coat: '#f4f0e8', coat2: '#d8cfc0', trim: '#e0b040', hairStyle: 'long', hair: '#f0e8d8', hat: 'veil', height: 1.08 },
  ghost: { coat: '#9ab8e0', coat2: '#6a88c0', trim: '#e0f0ff', hairStyle: 'short', hair: '#c0d8f0', skin: '#c8d8f0' },
  lio: { coat: '#f0c83a', coat2: '#c89a1a', trim: '#ffffff', hairStyle: 'bob', hair: '#5a3a22', height: 0.62, build: 0.85, hat: 'hood', skin: '#f0c8a8' },
  mother: { coat: '#7a5a8a', coat2: '#5a4068', trim: '#e0c08a', hairStyle: 'long', hair: '#6b3a26', skin: '#e8b994' },
  baker: { coat: '#e8dcc8', coat2: '#b8a890', trim: '#8a5a3a', hairStyle: 'bald', hair: '#4a3020', build: 1.25, beard: '#4a3020' },
  widow: { coat: '#3a3a44', coat2: '#262630', trim: '#9a9aa8', hairStyle: 'bun', hair: '#8a8078', hat: 'veil' },
  clerk: { coat: '#5a6a7a', coat2: '#3a4652', trim: '#d0d8e0', hairStyle: 'short', hair: '#2a2a2a', build: 0.85 },
  worker: { coat: '#7a4a32', coat2: '#4a2c1e', trim: '#c08a5a', hairStyle: 'short', hair: '#2a1a12', hat: 'cap' },
};

export function npcFigure(kind: string, palette: string[] | undefined, id: string, overrideKind?: CharId): Figure {
  if (overrideKind && CHARS[overrideKind]) {
    const f = figureFor(overrideKind);
    return { ...f, look: { ...f.look, skin: '#c8d8f0', coat: '#8ab0e0', coat2: '#5a80c0', trim: '#e0f0ff' } };
  }
  const base = NPC_LOOKS[kind] ?? NPC_LOOKS.villager;
  const r = rng(hashStr(id));
  const skins = ['#e8b994', '#c98d66', '#a8714f', '#f0c8a8', '#8a5a3e', '#d9a982'];
  const look: Look = {
    skin: base.skin ?? skins[Math.floor(r() * skins.length)],
    hair: palette?.[2] ?? base.hair ?? '#4a3020',
    hairStyle: base.hairStyle ?? 'short',
    coat: palette?.[0] ?? base.coat ?? '#7a5a3a',
    coat2: palette?.[1] ?? base.coat2 ?? '#4a3420',
    trim: base.trim ?? '#d8c08a',
    height: (base.height ?? 1) * (0.94 + r() * 0.1),
    build: (base.build ?? 1) * (0.9 + r() * 0.2),
    eyes: '#2a1f14',
    beard: base.beard ?? (kind === 'villager' && r() < 0.3 ? base.hair : undefined),
    hat: base.hat ?? 'none',
  };
  return { look, weapon: base.weapon ?? 'none', kind };
}

// ------------------------------------------------------------------ portraits

const portraitCache = new Map<string, HTMLCanvasElement>();

/** A head-and-shoulders portrait (w x h), cached per figure/expression. */
export function portrait(fig: Figure, expr: Expr, w = 220, h = 240, keyExtra = ''): HTMLCanvasElement {
  const key = `${fig.kind}|${fig.look.coat}|${fig.look.hair}|${expr}|${w}|${keyExtra}`;
  const hit = portraitCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(w, h);
  const g = ctx2d(c);
  const L = fig.look;
  const r = w * (fig.kind === 'wick' ? 0.27 : 0.24);
  const cx = w * 0.48;
  const cy = h * 0.42;
  if (L.glow) drawGlow(g, cx, cy, w * 0.6, L.glow, 0.35);
  // shoulders / coat
  const grad = g.createLinearGradient(0, cy + r, 0, h);
  grad.addColorStop(0, shade(L.coat, 0.1));
  grad.addColorStop(1, L.coat2);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(cx - r * 2.0 * L.build, h);
  g.quadraticCurveTo(cx - r * 1.9 * L.build, cy + r * 1.2, cx - r * 0.4, cy + r * 1.05);
  g.lineTo(cx + r * 0.4, cy + r * 1.05);
  g.quadraticCurveTo(cx + r * 1.9 * L.build, cy + r * 1.2, cx + r * 2.0 * L.build, h);
  g.closePath();
  g.fill();
  g.strokeStyle = L.trim;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - r * 0.45, cy + r * 1.05);
  g.lineTo(cx - r * 0.2, h);
  g.moveTo(cx + r * 0.45, cy + r * 1.05);
  g.lineTo(cx + r * 0.2, h);
  g.stroke();
  // neck
  g.fillStyle = shade(L.skin, -0.12);
  g.fillRect(cx - r * 0.3, cy + r * 0.6, r * 0.6, r * 0.55);
  g.save();
  g.translate(cx, cy);
  drawHair(g, L, r, 0, true);
  if (fig.kind === 'wick') {
    const yarn = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    yarn.addColorStop(0, shade(L.skin, 0.35));
    yarn.addColorStop(1, L.skin);
    g.fillStyle = yarn;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = shade(L.skin, -0.2);
    g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(0, 0, r * (0.35 + i * 0.11), r * (0.92 - i * 0.04), i * 0.55, 0, Math.PI * 1.4);
      g.stroke();
    }
  } else {
    const sg = g.createRadialGradient(r * 0.25, -r * 0.3, 2, 0, 0, r * 1.1);
    sg.addColorStop(0, shade(L.skin, 0.14));
    sg.addColorStop(1, shade(L.skin, -0.1));
    g.fillStyle = sg;
    g.beginPath();
    g.ellipse(0, 0, r * 0.9, r * 1.02, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = shade(L.skin, -0.12);
    g.beginPath();
    g.ellipse(-r * 0.86, 0, r * 0.12, r * 0.2, 0, 0, Math.PI * 2);
    g.ellipse(r * 0.86, 0, r * 0.12, r * 0.2, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (L.beard) {
    g.fillStyle = L.beard;
    g.beginPath();
    g.moveTo(-r * 0.75, r * 0.15);
    g.quadraticCurveTo(0, r * 1.45, r * 0.75, r * 0.15);
    g.quadraticCurveTo(0, r * 0.75, -r * 0.75, r * 0.15);
    g.fill();
  }
  // face, front-on: shift the profile face helpers to center
  g.save();
  g.translate(-r * 0.42, 0);
  drawFace(g, L, r, expr, false, false, 1.5, true);
  g.restore();
  g.save();
  g.scale(1, 1);
  drawHair(g, L, r, 0, false);
  g.restore();
  if (L.hat === 'wide') {
    g.fillStyle = shade(L.coat, -0.2);
    g.beginPath();
    g.ellipse(0, -r * 0.62, r * 1.9, r * 0.32, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0, -r * 0.85, r * 0.95, r * 0.6, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = L.trim;
    g.fillRect(-r * 0.95, -r * 0.82, r * 1.9, r * 0.14);
  } else if (L.hat === 'veil') {
    g.fillStyle = rgba('#f4efe4', 0.97);
    g.beginPath();
    g.moveTo(-r * 1.25, r * 1.6);
    g.quadraticCurveTo(-r * 1.35, -r * 1.35, 0, -r * 1.2);
    g.quadraticCurveTo(r * 1.35, -r * 1.35, r * 1.25, r * 1.6);
    g.lineTo(r * 0.85, r * 1.4);
    g.quadraticCurveTo(r * 0.95, -r * 0.6, 0, -r * 0.75);
    g.quadraticCurveTo(-r * 0.95, -r * 0.6, -r * 0.85, r * 1.4);
    g.closePath();
    g.fill();
    g.strokeStyle = L.trim;
    g.lineWidth = 2;
    g.stroke();
  } else if (L.hat === 'hood') {
    g.fillStyle = shade(L.coat, -0.15);
    g.beginPath();
    g.moveTo(-r * 1.3, r * 1.4);
    g.quadraticCurveTo(-r * 1.4, -r * 1.4, 0, -r * 1.3);
    g.quadraticCurveTo(r * 1.4, -r * 1.4, r * 1.3, r * 1.4);
    g.lineTo(r * 0.95, r * 1.2);
    g.quadraticCurveTo(r * 1.0, -r * 0.8, 0, -r * 0.9);
    g.quadraticCurveTo(-r * 1.0, -r * 0.8, -r * 0.95, r * 1.2);
    g.closePath();
    g.fill();
  } else if (L.hat === 'cap') {
    g.fillStyle = shade(L.coat, -0.2);
    g.beginPath();
    g.ellipse(0, -r * 0.72, r * 1.0, r * 0.5, 0, Math.PI, 0);
    g.fill();
  }
  g.restore();
  // soft painted vignette
  const vg = g.createRadialGradient(cx, cy, r, cx, cy, w * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,10,5,0.25)');
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  portraitCache.set(key, c);
  return c;
}

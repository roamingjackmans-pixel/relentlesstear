// Scenery props, painted once per theme into a cached sprite (anchored at the bottom centre), with animated extras
// (flames, glows, blades, banners) drawn live on top.
import { hashStr, rgba, rng, shade } from '../core/util';
import type { ThemeId } from '../data/types';
import { applyGrain, ctx2d, drawGlow, makeCanvas } from './canvas';
import { THEMES } from './themes';

interface PropSprite {
  c: HTMLCanvasElement;
  w: number;
  h: number;
  ax: number; // anchor x inside the canvas
}

const cache = new Map<string, PropSprite>();
const SIZE: Record<string, [number, number]> = {
  tree: [220, 300],
  apple_tree: [220, 280],
  house: [260, 260],
  cottage: [230, 220],
  fence: [200, 70],
  lantern: [40, 150],
  lamp_post: [60, 220],
  well: [130, 150],
  windmill: [200, 360],
  haybale: [110, 80],
  giant_thimble: [220, 260],
  scarecrow_post: [120, 200],
  willow: [300, 340],
  reeds: [140, 120],
  chapel: [300, 380],
  boat: [220, 100],
  dock: [300, 80],
  gear_wall: [260, 300],
  chimney: [120, 420],
  crane: [260, 380],
  rock: [160, 100],
  cliff_pillar: [180, 460],
  banner: [90, 230],
  tent: [220, 150],
  campfire: [90, 70],
  fray_island: [260, 300],
  echo_house: [240, 240],
  porcelain_pillar: [110, 420],
  bell_tower: [190, 460],
  statue: [140, 300],
  seam_post: [70, 170],
  shield_grave: [110, 140],
  thread_tree: [240, 320],
  crystal: [140, 180],
  stairs: [220, 160],
  cart: [180, 110],
  sign: [80, 110],
  barrel: [60, 70],
  crate: [70, 66],
  loom_frame: [220, 260],
  bobbin_house: [190, 200],
  mushroom: [110, 120],
  glass_tree: [200, 300],
};

function pal(theme: ThemeId): { wood: string; stone: string; roof: string; leaf: string; light: string; dark: string; seam: string; fog: string } {
  const T = THEMES[theme];
  const near = T.layers[T.layers.length - 1]?.color ?? '#4a3a2a';
  return {
    wood: shade('#7a5232', 0),
    stone: '#8a8478',
    roof: '#8a3a2a',
    leaf: theme === 'village_autumn' ? '#c0602a' : theme === 'fields_gold' ? '#7a8a3a' : theme === 'fray_surreal' ? '#d8b8d8' : theme === 'glass' ? '#9ad0e0' : '#4a6a3a',
    light: T.ground.edge,
    dark: near,
    seam: T.seam,
    fog: T.fog,
  };
}

function paintProp(g: CanvasRenderingContext2D, kind: string, w: number, h: number, theme: ThemeId, seed: number): void {
  const P = pal(theme);
  const r = rng(seed);
  const cx = w / 2;
  const by = h; // ground
  const fillGrad = (x0: number, y0: number, x1: number, y1: number, a: string, b: string): CanvasGradient => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    return gr;
  };
  const leafBlob = (x: number, y: number, rx: number, ry: number, col: string): void => {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  };
  g.lineJoin = 'round';
  g.lineCap = 'round';
  switch (kind) {
    case 'tree':
    case 'apple_tree':
    case 'thread_tree': {
      g.fillStyle = fillGrad(cx - 14, 0, cx + 14, 0, shade(P.wood, -0.1), shade(P.wood, -0.4));
      g.beginPath();
      g.moveTo(cx - 16, by);
      g.quadraticCurveTo(cx - 8, by - h * 0.3, cx - 6, by - h * 0.55);
      g.lineTo(cx + 8, by - h * 0.55);
      g.quadraticCurveTo(cx + 10, by - h * 0.3, cx + 18, by);
      g.fill();
      const leaf = kind === 'thread_tree' ? P.seam : P.leaf;
      for (let i = 0; i < 14; i++) leafBlob(cx + (r() - 0.5) * w * 0.7, by - h * (0.55 + r() * 0.35), 30 + r() * 26, 24 + r() * 20, shade(leaf, -0.25 + r() * 0.3));
      if (kind === 'thread_tree') {
        g.strokeStyle = rgba(P.seam, 0.8);
        g.lineWidth = 1.2;
        for (let i = 0; i < 18; i++) {
          const sx = cx + (r() - 0.5) * w * 0.6;
          const sy = by - h * (0.5 + r() * 0.2);
          g.beginPath();
          g.moveTo(sx, sy);
          g.quadraticCurveTo(sx + 8, sy + 40, sx + (r() - 0.5) * 20, sy + 60 + r() * 60);
          g.stroke();
        }
      }
      if (kind === 'apple_tree') for (let i = 0; i < 16; i++) leafBlob(cx + (r() - 0.5) * w * 0.6, by - h * (0.5 + r() * 0.35), 5, 5, '#d83a2a');
      g.fillStyle = 'rgba(255,240,200,0.18)';
      leafBlob(cx - w * 0.12, by - h * 0.86, 40, 20, 'rgba(255,240,200,0.18)');
      break;
    }
    case 'house':
    case 'cottage':
    case 'echo_house':
    case 'bobbin_house': {
      const bw = kind === 'house' ? w * 0.8 : kind === 'bobbin_house' ? w * 0.6 : w * 0.72;
      const bh = kind === 'house' ? h * 0.5 : h * 0.45;
      const wall = kind === 'bobbin_house' ? '#c89a5a' : kind === 'echo_house' ? '#c8c0d8' : '#c8b08a';
      if (kind === 'bobbin_house') {
        // a giant spool turned into a house
        g.fillStyle = fillGrad(cx - bw / 2, 0, cx + bw / 2, 0, shade(wall, 0.1), shade(wall, -0.3));
        g.fillRect(cx - bw / 2, by - bh * 1.3, bw, bh * 1.3);
        g.fillStyle = '#e25b3a';
        g.fillRect(cx - bw / 2 + 6, by - bh * 1.15, bw - 12, bh * 1.0);
        g.strokeStyle = shade('#e25b3a', -0.3);
        g.lineWidth = 1;
        for (let y = by - bh * 1.12; y < by - bh * 0.18; y += 5) {
          g.beginPath();
          g.moveTo(cx - bw / 2 + 6, y);
          g.lineTo(cx + bw / 2 - 6, y + 2);
          g.stroke();
        }
        g.fillStyle = shade(wall, -0.1);
        g.beginPath();
        g.ellipse(cx, by - bh * 1.3, bw * 0.62, 14, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#3a2a1a';
        g.beginPath();
        g.arc(cx, by - 26, 18, Math.PI, 0);
        g.fillRect(cx - 18, by - 26, 36, 26);
        g.fill();
        g.fillStyle = '#ffd27a';
        g.beginPath();
        g.arc(cx + 30, by - bh * 0.7, 8, 0, Math.PI * 2);
        g.fill();
        break;
      }
      g.fillStyle = fillGrad(cx - bw / 2, 0, cx + bw / 2, 0, shade(wall, 0.08), shade(wall, -0.25));
      g.fillRect(cx - bw / 2, by - bh, bw, bh);
      // timber
      g.strokeStyle = shade(P.wood, -0.3);
      g.lineWidth = 4;
      g.strokeRect(cx - bw / 2, by - bh, bw, bh);
      g.beginPath();
      g.moveTo(cx - bw / 2, by - bh * 0.5);
      g.lineTo(cx + bw / 2, by - bh * 0.5);
      g.stroke();
      // roof
      const roofC = kind === 'echo_house' ? '#9a8ab0' : P.roof;
      g.fillStyle = fillGrad(0, by - h, 0, by - bh, shade(roofC, 0.1), shade(roofC, -0.3));
      g.beginPath();
      g.moveTo(cx - bw / 2 - 18, by - bh + 4);
      g.lineTo(cx - bw * 0.1, by - h + 8);
      g.lineTo(cx + bw * 0.05, by - h + 8);
      g.lineTo(cx + bw / 2 + 18, by - bh + 4);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba('#000000', 0.2);
      g.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        g.beginPath();
        g.moveTo(cx - bw / 2 - 18 + i * 8, by - bh + 4 - i * ((h - bh) / 7));
        g.lineTo(cx + bw / 2 + 18 - i * 8, by - bh + 4 - i * ((h - bh) / 7));
        g.stroke();
      }
      // chimney
      g.fillStyle = '#6a5a50';
      g.fillRect(cx + bw * 0.2, by - h + 10, 18, (h - bh) * 0.6);
      // door + windows
      g.fillStyle = shade(P.wood, -0.25);
      g.beginPath();
      g.roundRect(cx - 18, by - 56, 36, 56, [14, 14, 0, 0]);
      g.fill();
      for (const wx of [cx - bw * 0.32, cx + bw * 0.22]) {
        g.fillStyle = '#ffd27a';
        g.fillRect(wx, by - bh * 0.42, 26, 24);
        g.strokeStyle = shade(P.wood, -0.4);
        g.lineWidth = 3;
        g.strokeRect(wx, by - bh * 0.42, 26, 24);
        g.beginPath();
        g.moveTo(wx + 13, by - bh * 0.42);
        g.lineTo(wx + 13, by - bh * 0.42 + 24);
        g.stroke();
      }
      break;
    }
    case 'fence':
      g.strokeStyle = shade(P.wood, -0.15);
      g.lineWidth = 6;
      for (let x = 10; x < w; x += 38) {
        g.beginPath();
        g.moveTo(x, by);
        g.lineTo(x + (r() - 0.5) * 4, by - h * 0.85);
        g.stroke();
      }
      g.lineWidth = 5;
      for (const y of [0.35, 0.65]) {
        g.beginPath();
        g.moveTo(4, by - h * y);
        g.lineTo(w - 4, by - h * y + (r() - 0.5) * 6);
        g.stroke();
      }
      break;
    case 'lantern':
    case 'lamp_post':
      g.strokeStyle = '#2a2420';
      g.lineWidth = kind === 'lamp_post' ? 7 : 4;
      g.beginPath();
      g.moveTo(cx, by);
      g.lineTo(cx, by - h + 30);
      if (kind === 'lamp_post') g.quadraticCurveTo(cx, by - h + 6, cx + 20, by - h + 10);
      g.stroke();
      g.fillStyle = '#2a2420';
      g.fillRect(cx - 10 + (kind === 'lamp_post' ? 18 : 0), by - h + (kind === 'lamp_post' ? 14 : 4), 20, 26);
      break;
    case 'well':
      g.fillStyle = fillGrad(0, by - 60, 0, by, '#9a948a', '#5a564e');
      g.beginPath();
      g.ellipse(cx, by - 50, w * 0.4, 14, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(cx - w * 0.4, by - 50, w * 0.8, 50);
      g.fillStyle = '#1a1814';
      g.beginPath();
      g.ellipse(cx, by - 50, w * 0.32, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = shade(P.wood, -0.2);
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(cx - w * 0.36, by - 50);
      g.lineTo(cx - w * 0.36, by - h + 20);
      g.lineTo(cx + w * 0.36, by - h + 20);
      g.lineTo(cx + w * 0.36, by - 50);
      g.stroke();
      g.fillStyle = P.roof;
      g.beginPath();
      g.moveTo(cx - w * 0.48, by - h + 26);
      g.lineTo(cx, by - h);
      g.lineTo(cx + w * 0.48, by - h + 26);
      g.fill();
      break;
    case 'windmill':
      g.fillStyle = fillGrad(cx - 40, 0, cx + 40, 0, '#d8c8a8', '#8a7a5a');
      g.beginPath();
      g.moveTo(cx - 45, by);
      g.lineTo(cx - 28, by - h * 0.6);
      g.lineTo(cx + 28, by - h * 0.6);
      g.lineTo(cx + 45, by);
      g.fill();
      g.fillStyle = P.roof;
      g.beginPath();
      g.moveTo(cx - 34, by - h * 0.6);
      g.quadraticCurveTo(cx, by - h * 0.78, cx + 34, by - h * 0.6);
      g.fill();
      g.fillStyle = shade(P.wood, -0.3);
      g.fillRect(cx - 12, by - 40, 24, 40);
      break;
    case 'haybale':
      g.fillStyle = fillGrad(0, by - h, 0, by, '#e8c86a', '#a8822a');
      g.beginPath();
      g.roundRect(8, by - h + 10, w - 16, h - 10, 18);
      g.fill();
      g.strokeStyle = 'rgba(120,80,20,0.5)';
      g.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const x = 12 + r() * (w - 24);
        g.beginPath();
        g.moveTo(x, by - h + 14);
        g.lineTo(x + (r() - 0.5) * 10, by - 4);
        g.stroke();
      }
      break;
    case 'giant_thimble': {
      g.save();
      g.translate(cx, by + 10);
      g.rotate((r() - 0.5) * 0.3);
      g.fillStyle = fillGrad(-90, 0, 90, 0, '#e0c88a', '#7a6234');
      g.beginPath();
      g.moveTo(-90, 0);
      g.lineTo(-76, -h * 0.82);
      g.quadraticCurveTo(0, -h * 1.05, 76, -h * 0.82);
      g.lineTo(90, 0);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(60,40,10,0.35)';
      for (let a = 0; a < 9; a++)
        for (let b = 0; b < 8; b++) {
          const x = -64 + b * 18 + (a % 2) * 9;
          const y = -24 - a * 22;
          g.beginPath();
          g.arc(x, y, 4, 0, Math.PI * 2);
          g.fill();
        }
      g.fillStyle = 'rgba(255,250,220,0.3)';
      g.fillRect(-60, -h * 0.78, 10, h * 0.72);
      g.restore();
      break;
    }
    case 'scarecrow_post':
      g.strokeStyle = shade(P.wood, -0.2);
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(cx, by);
      g.lineTo(cx, by - h + 30);
      g.moveTo(cx - 44, by - h * 0.66);
      g.lineTo(cx + 44, by - h * 0.66);
      g.stroke();
      g.fillStyle = '#8a6a3a';
      g.beginPath();
      g.moveTo(cx - 34, by - h * 0.68);
      g.lineTo(cx + 34, by - h * 0.68);
      g.lineTo(cx + 26, by - h * 0.3);
      g.lineTo(cx - 26, by - h * 0.3);
      g.fill();
      g.fillStyle = '#d8c08a';
      g.beginPath();
      g.arc(cx, by - h * 0.8, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3a2a1a';
      g.beginPath();
      g.ellipse(cx, by - h * 0.9, 34, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(cx - 16, by - h * 0.98, 32, 12);
      g.fillStyle = '#2a1a10';
      g.fillRect(cx - 9, by - h * 0.81, 4, 4);
      g.fillRect(cx + 5, by - h * 0.81, 4, 4);
      g.strokeStyle = '#e25b3a';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(cx - 8, by - h * 0.74);
      g.lineTo(cx + 8, by - h * 0.74);
      g.stroke();
      break;
    case 'willow': {
      g.fillStyle = fillGrad(cx - 20, 0, cx + 20, 0, '#3a3a2a', '#1a1a12');
      g.beginPath();
      g.moveTo(cx - 24, by);
      g.quadraticCurveTo(cx - 10, by - h * 0.4, cx - 30, by - h * 0.72);
      g.lineTo(cx + 20, by - h * 0.74);
      g.quadraticCurveTo(cx + 10, by - h * 0.4, cx + 26, by);
      g.fill();
      leafBlob(cx, by - h * 0.78, w * 0.4, h * 0.16, shade(P.leaf, -0.35));
      g.strokeStyle = shade(P.leaf, -0.25);
      g.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const sx = cx + (r() - 0.5) * w * 0.8;
        const sy = by - h * (0.72 + r() * 0.12);
        g.beginPath();
        g.moveTo(sx, sy);
        g.quadraticCurveTo(sx + 6, sy + h * 0.2, sx + (r() - 0.5) * 10, sy + h * (0.3 + r() * 0.35));
        g.stroke();
      }
      break;
    }
    case 'reeds':
      for (let i = 0; i < 30; i++) {
        const x = 10 + r() * (w - 20);
        const hh = h * (0.4 + r() * 0.6);
        g.strokeStyle = shade('#4a5a2a', -0.2 + r() * 0.3);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, by);
        g.quadraticCurveTo(x + 3, by - hh * 0.6, x + (r() - 0.5) * 14, by - hh);
        g.stroke();
        if (r() < 0.3) {
          g.fillStyle = '#5a3a22';
          g.fillRect(x - 3 + (r() - 0.5) * 6, by - hh - 4, 6, 16);
        }
      }
      break;
    case 'chapel':
    case 'bell_tower': {
      const stone = theme === 'porcelain_city' || theme === 'spire_light' ? '#e8e4dc' : '#8a8478';
      const bw = kind === 'chapel' ? w * 0.7 : w * 0.5;
      g.fillStyle = fillGrad(cx - bw / 2, 0, cx + bw / 2, 0, shade(stone, 0.1), shade(stone, -0.3));
      if (kind === 'chapel') {
        g.fillRect(cx - bw / 2, by - h * 0.45, bw, h * 0.45);
        g.beginPath();
        g.moveTo(cx - bw / 2 - 10, by - h * 0.45);
        g.lineTo(cx, by - h * 0.65);
        g.lineTo(cx + bw / 2 + 10, by - h * 0.45);
        g.fill();
        g.fillRect(cx - 24, by - h * 0.85, 48, h * 0.3);
        g.beginPath();
        g.moveTo(cx - 30, by - h * 0.85);
        g.lineTo(cx, by - h);
        g.lineTo(cx + 30, by - h * 0.85);
        g.fill();
      } else {
        g.fillRect(cx - bw / 2, by - h * 0.8, bw, h * 0.8);
        g.beginPath();
        g.moveTo(cx - bw / 2 - 8, by - h * 0.8);
        g.lineTo(cx, by - h);
        g.lineTo(cx + bw / 2 + 8, by - h * 0.8);
        g.fill();
        g.fillStyle = '#1a1814';
        g.beginPath();
        g.arc(cx, by - h * 0.7, 24, Math.PI, 0);
        g.fillRect(cx - 24, by - h * 0.7, 48, 40);
        g.fill();
        g.fillStyle = '#c8a050';
        g.beginPath();
        g.moveTo(cx - 14, by - h * 0.62);
        g.quadraticCurveTo(cx - 12, by - h * 0.7, cx, by - h * 0.71);
        g.quadraticCurveTo(cx + 12, by - h * 0.7, cx + 14, by - h * 0.62);
        g.fill();
      }
      g.fillStyle = '#ffd88a';
      g.beginPath();
      g.arc(cx, by - h * 0.3, 16, Math.PI, 0);
      g.fillRect(cx - 16, by - h * 0.3, 32, 30);
      g.fill();
      g.fillStyle = shade(stone, -0.4);
      g.beginPath();
      g.roundRect(cx - 20, by - 60, 40, 60, [20, 20, 0, 0]);
      g.fill();
      break;
    }
    case 'boat':
      g.fillStyle = fillGrad(0, by - 50, 0, by, shade(P.wood, 0.1), shade(P.wood, -0.4));
      g.beginPath();
      g.moveTo(10, by - 50);
      g.quadraticCurveTo(cx, by + 10, w - 10, by - 50);
      g.lineTo(w - 30, by - 40);
      g.quadraticCurveTo(cx, by - 8, 30, by - 40);
      g.closePath();
      g.fill();
      g.strokeStyle = shade(P.wood, -0.4);
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(cx, by - 30);
      g.lineTo(cx + 10, by - h);
      g.stroke();
      break;
    case 'dock':
      g.fillStyle = shade(P.wood, -0.1);
      g.fillRect(0, by - 40, w, 12);
      g.fillStyle = shade(P.wood, -0.35);
      for (let x = 10; x < w; x += 50) g.fillRect(x, by - 40, 10, 40);
      break;
    case 'gear_wall': {
      g.fillStyle = '#4a3632';
      g.fillRect(10, by - h, w - 20, h);
      for (let i = 0; i < 4; i++) {
        const gx = 50 + r() * (w - 100);
        const gy = by - 40 - r() * (h - 80);
        const gr = 20 + r() * 40;
        g.fillStyle = shade('#8a6a4a', -0.1 + r() * 0.2);
        g.beginPath();
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const rr = k % 2 ? gr : gr * 1.2;
          g.lineTo(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr);
        }
        g.fill();
        g.fillStyle = '#2a1e1a';
        g.beginPath();
        g.arc(gx, gy, gr * 0.3, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'chimney':
      g.fillStyle = fillGrad(cx - 30, 0, cx + 30, 0, '#7a4a3a', '#3a2220');
      g.beginPath();
      g.moveTo(cx - 34, by);
      g.lineTo(cx - 24, by - h * 0.9);
      g.lineTo(cx + 24, by - h * 0.9);
      g.lineTo(cx + 34, by);
      g.fill();
      g.fillStyle = '#2a1a18';
      g.fillRect(cx - 28, by - h * 0.92, 56, 14);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 1;
      for (let y = by - 20; y > by - h * 0.85; y -= 16) {
        g.beginPath();
        g.moveTo(cx - 30, y);
        g.lineTo(cx + 30, y);
        g.stroke();
      }
      break;
    case 'crane':
      g.strokeStyle = '#3a2a22';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(cx - 40, by);
      g.lineTo(cx - 40, by - h * 0.85);
      g.lineTo(cx + 100, by - h * 0.85);
      g.stroke();
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx + 90, by - h * 0.85);
      g.lineTo(cx + 90, by - h * 0.4);
      g.stroke();
      g.fillStyle = '#6a4a32';
      g.fillRect(cx + 74, by - h * 0.4, 32, 26);
      break;
    case 'rock':
    case 'cliff_pillar': {
      const tall = kind === 'cliff_pillar';
      g.fillStyle = fillGrad(0, by - h, w, by, shade(P.stone, 0.15), shade(P.stone, -0.4));
      g.beginPath();
      g.moveTo(8, by);
      if (tall) {
        g.lineTo(cx - 50, by - h * 0.6);
        g.lineTo(cx - 30, by - h);
        g.lineTo(cx + 26, by - h * 0.92);
        g.lineTo(cx + 54, by - h * 0.5);
      } else {
        g.quadraticCurveTo(10, by - h * 0.9, cx - 10, by - h);
        g.quadraticCurveTo(w - 20, by - h * 0.9, w - 8, by);
      }
      g.lineTo(w - 8, by);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(cx + (r() - 0.5) * w * 0.5, by - r() * h * 0.9);
        g.lineTo(cx + (r() - 0.5) * w * 0.5, by - r() * h * 0.5);
        g.stroke();
      }
      g.fillStyle = rgba(P.light, 0.25);
      g.fillRect(cx - 30, by - h * (tall ? 0.95 : 0.9), 14, h * 0.6);
      break;
    }
    case 'banner':
      g.strokeStyle = shade(P.wood, -0.3);
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cx - 20, by);
      g.lineTo(cx - 20, by - h);
      g.stroke();
      break;
    case 'tent':
      g.fillStyle = fillGrad(cx - 100, 0, cx + 100, 0, '#c8a878', '#7a5a3a');
      g.beginPath();
      g.moveTo(10, by);
      g.lineTo(cx, by - h);
      g.lineTo(w - 10, by);
      g.closePath();
      g.fill();
      g.fillStyle = '#3a2a1a';
      g.beginPath();
      g.moveTo(cx - 24, by);
      g.lineTo(cx, by - h * 0.6);
      g.lineTo(cx + 24, by);
      g.fill();
      break;
    case 'campfire':
      g.fillStyle = '#4a4440';
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.ellipse(cx - 32 + i * 10.5, by - 6, 8, 6, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#5a3a22';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(cx - 24, by - 6);
      g.lineTo(cx + 20, by - 22);
      g.moveTo(cx + 24, by - 6);
      g.lineTo(cx - 20, by - 22);
      g.stroke();
      break;
    case 'fray_island': {
      const y0 = by - h * 0.75;
      g.fillStyle = fillGrad(0, y0, 0, by, '#e0c8e0', '#a888b0');
      g.beginPath();
      g.moveTo(10, y0);
      g.quadraticCurveTo(cx - 40, y0 + 80, cx, y0 + 120);
      g.quadraticCurveTo(cx + 50, y0 + 80, w - 10, y0);
      g.closePath();
      g.fill();
      g.fillStyle = '#f0e0f0';
      g.fillRect(10, y0 - 6, w - 20, 8);
      g.strokeStyle = rgba('#ff8ab0', 0.6);
      g.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) {
        const sx = cx + (r() - 0.5) * w * 0.5;
        g.beginPath();
        g.moveTo(sx, y0 + 60);
        g.quadraticCurveTo(sx + 14, y0 + 140, sx + (r() - 0.5) * 30, by);
        g.stroke();
      }
      leafBlob(cx - 30, y0 - 30, 24, 30, '#c8a8d0');
      leafBlob(cx + 34, y0 - 20, 20, 22, '#d8b8e0');
      break;
    }
    case 'porcelain_pillar':
      g.fillStyle = fillGrad(cx - 40, 0, cx + 40, 0, '#ffffff', '#b8b4ac');
      g.fillRect(cx - 32, by - h + 30, 64, h - 30);
      g.fillRect(cx - 44, by - h + 16, 88, 18);
      g.fillRect(cx - 44, by - 16, 88, 16);
      g.strokeStyle = 'rgba(90,110,180,0.45)';
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(cx - 30, by - h + 60 + i * 70);
        g.bezierCurveTo(cx - 10, by - h + 40 + i * 70, cx + 10, by - h + 90 + i * 70, cx + 30, by - h + 64 + i * 70);
        g.stroke();
      }
      break;
    case 'statue':
      g.fillStyle = fillGrad(cx - 40, 0, cx + 40, 0, '#d8d4cc', '#7a766e');
      g.fillRect(cx - 40, by - 50, 80, 50);
      g.beginPath();
      g.moveTo(cx - 28, by - 50);
      g.lineTo(cx - 18, by - h * 0.68);
      g.lineTo(cx + 18, by - h * 0.68);
      g.lineTo(cx + 28, by - 50);
      g.fill();
      g.beginPath();
      g.arc(cx, by - h * 0.76, 20, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#a8a49c';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(cx + 16, by - h * 0.62);
      g.lineTo(cx + 40, by - h * 0.95);
      g.stroke();
      break;
    case 'seam_post':
      g.strokeStyle = shade(P.wood, -0.2);
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(cx, by);
      g.lineTo(cx, by - h + 20);
      g.stroke();
      g.fillStyle = P.seam;
      g.beginPath();
      g.arc(cx, by - h + 18, 8, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = P.seam;
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(cx - 8, by - h * 0.7 + i * 16);
        g.lineTo(cx + 8, by - h * 0.7 + i * 16 + 8);
        g.stroke();
      }
      break;
    case 'shield_grave':
      g.fillStyle = fillGrad(cx - 30, 0, cx + 30, 0, '#9a7a4a', '#5a3e22');
      g.save();
      g.translate(cx, by + 6);
      g.rotate(0.06);
      g.beginPath();
      g.roundRect(-30, -h + 10, 60, h - 10, 16);
      g.fill();
      g.strokeStyle = '#c9a35a';
      g.lineWidth = 4;
      g.stroke();
      g.fillStyle = '#c9a35a';
      g.beginPath();
      g.arc(0, -h * 0.55, 8, 0, Math.PI * 2);
      g.fill();
      g.restore();
      for (let i = 0; i < 10; i++) leafBlob(cx + (r() - 0.5) * 80, by - 4, 6, 3, r() < 0.5 ? '#f0e080' : '#e8a0c0');
      break;
    case 'crystal':
    case 'glass_tree': {
      const col = theme === 'underweave_deep' ? '#6a8ae0' : theme === 'glass' ? '#a8e0f0' : '#c8a8e8';
      if (kind === 'glass_tree') {
        g.strokeStyle = rgba(col, 0.9);
        g.lineWidth = 10;
        g.beginPath();
        g.moveTo(cx, by);
        g.lineTo(cx, by - h * 0.5);
        g.stroke();
        g.lineWidth = 4;
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + (r() - 0.5) * 2;
          const len = 40 + r() * 60;
          const sy = by - h * (0.4 + r() * 0.2);
          g.beginPath();
          g.moveTo(cx, sy);
          g.lineTo(cx + Math.cos(a) * len, sy + Math.sin(a) * len);
          g.stroke();
          leafBlob(cx + Math.cos(a) * len, sy + Math.sin(a) * len, 10, 14, rgba('#ffffff', 0.6));
        }
        break;
      }
      for (let i = 0; i < 5; i++) {
        const hh = h * (0.4 + r() * 0.6);
        const ww = 16 + r() * 22;
        const x = cx + (r() - 0.5) * w * 0.5;
        g.save();
        g.translate(x, by);
        g.rotate((r() - 0.5) * 0.5);
        g.fillStyle = fillGrad(-ww, -hh, ww, 0, shade(col, 0.4), shade(col, -0.3));
        g.beginPath();
        g.moveTo(-ww / 2, 0);
        g.lineTo(-ww / 2, -hh * 0.75);
        g.lineTo(0, -hh);
        g.lineTo(ww / 2, -hh * 0.75);
        g.lineTo(ww / 2, 0);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.moveTo(-ww / 2, -hh * 0.75);
        g.lineTo(0, -hh);
        g.lineTo(0, 0);
        g.lineTo(-ww / 2, 0);
        g.fill();
        g.restore();
      }
      break;
    }
    case 'stairs':
      g.fillStyle = P.stone;
      for (let i = 0; i < 6; i++) {
        g.fillStyle = shade(P.stone, -0.05 * i);
        g.fillRect(20 + i * 30, by - (i + 1) * 24, w - 40 - i * 30, 24);
      }
      break;
    case 'cart':
      g.fillStyle = shade(P.wood, 0.05);
      g.fillRect(16, by - 70, w - 50, 36);
      g.strokeStyle = shade(P.wood, -0.3);
      g.lineWidth = 4;
      g.strokeRect(16, by - 70, w - 50, 36);
      g.beginPath();
      g.moveTo(w - 34, by - 50);
      g.lineTo(w - 4, by - 30);
      g.stroke();
      for (const wx of [44, w - 70]) {
        g.fillStyle = shade(P.wood, -0.35);
        g.beginPath();
        g.arc(wx, by - 22, 22, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = shade(P.wood, 0.1);
        g.beginPath();
        g.arc(wx, by - 22, 6, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 6; i++) leafBlob(40 + r() * (w - 90), by - 74, 12, 10, ['#d83a2a', '#e8c040', '#7a9a3a'][i % 3]);
      break;
    case 'sign':
      g.strokeStyle = shade(P.wood, -0.3);
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(cx, by);
      g.lineTo(cx, by - h + 20);
      g.stroke();
      g.fillStyle = shade(P.wood, 0.1);
      g.beginPath();
      g.moveTo(cx - 34, by - h + 10);
      g.lineTo(cx + 26, by - h + 10);
      g.lineTo(cx + 38, by - h + 26);
      g.lineTo(cx + 26, by - h + 42);
      g.lineTo(cx - 34, by - h + 42);
      g.fill();
      break;
    case 'barrel':
      g.fillStyle = fillGrad(cx - 28, 0, cx + 28, 0, shade(P.wood, 0.1), shade(P.wood, -0.4));
      g.beginPath();
      g.ellipse(cx, by - h / 2, 26, h / 2, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#3a3430';
      g.lineWidth = 3;
      for (const y of [0.25, 0.75]) {
        g.beginPath();
        g.moveTo(cx - 26, by - h * y);
        g.lineTo(cx + 26, by - h * y);
        g.stroke();
      }
      break;
    case 'crate':
      g.fillStyle = shade(P.wood, 0.1);
      g.fillRect(4, by - h, w - 8, h);
      g.strokeStyle = shade(P.wood, -0.35);
      g.lineWidth = 4;
      g.strokeRect(4, by - h, w - 8, h);
      g.beginPath();
      g.moveTo(4, by - h);
      g.lineTo(w - 4, by);
      g.stroke();
      break;
    case 'loom_frame':
      g.strokeStyle = shade(P.wood, -0.15);
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(20, by);
      g.lineTo(20, by - h + 10);
      g.lineTo(w - 20, by - h + 10);
      g.lineTo(w - 20, by);
      g.moveTo(20, by - h * 0.3);
      g.lineTo(w - 20, by - h * 0.3);
      g.stroke();
      g.lineWidth = 1;
      for (let x = 30; x < w - 26; x += 7) {
        g.strokeStyle = rgba(r() < 0.3 ? P.seam : '#d8d0c0', 0.8);
        g.beginPath();
        g.moveTo(x, by - h + 14);
        g.lineTo(x, by - h * 0.3);
        g.stroke();
      }
      g.fillStyle = rgba('#e25b3a', 0.8);
      g.fillRect(30, by - h * 0.55, w - 60, h * 0.22);
      break;
    case 'mushroom':
      g.fillStyle = '#e8dcc8';
      g.fillRect(cx - 10, by - h * 0.6, 20, h * 0.6);
      g.fillStyle = fillGrad(0, by - h, 0, by - h * 0.5, '#d85a4a', '#8a2a22');
      g.beginPath();
      g.ellipse(cx, by - h * 0.6, w * 0.45, h * 0.35, 0, Math.PI, 0);
      g.fill();
      for (let i = 0; i < 6; i++) leafBlob(cx + (r() - 0.5) * w * 0.6, by - h * (0.7 + r() * 0.2), 6, 5, '#fff4e0');
      break;
    default:
      g.fillStyle = P.dark;
      g.fillRect(cx - 20, by - h * 0.5, 40, h * 0.5);
  }
  // tie it into the scene: a touch of the theme's fog and paper grain
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = rgba(P.fog, 0.12);
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  applyGrain(g, w, h, 0.1);
}

function sprite(kind: string, theme: ThemeId, seed: number): PropSprite {
  const key = `${kind}|${theme}|${seed % 3}`;
  let s = cache.get(key);
  if (s) return s;
  const [w, h] = SIZE[kind] ?? [100, 100];
  const c = makeCanvas(w, h);
  paintProp(ctx2d(c), kind, w, h, theme, hashStr(key));
  s = { c, w, h, ax: w / 2 };
  cache.set(key, s);
  return s;
}

export function clearPropCache(): void {
  cache.clear();
}

/** Draw a prop with its base at (x, ground y). Returns a light source if it glows. */
export function drawProp(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, scale: number, theme: ThemeId, t: number, seed: number): { x: number; y: number; r: number } | null {
  const s = sprite(kind, theme, seed);
  const w = s.w * scale;
  const h = s.h * scale;
  ctx.drawImage(s.c, x - s.ax * scale, y - h, w, h);
  // live extras
  switch (kind) {
    case 'lantern': {
      const fl = 0.8 + 0.2 * Math.sin(t * 9 + seed) * Math.sin(t * 5.3 + seed * 2);
      drawGlow(ctx, x, y - h + 18 * scale, 70 * scale * fl, '#ffb04a', 0.55);
      ctx.fillStyle = '#ffd88a';
      ctx.fillRect(x - 7 * scale, y - h + 8 * scale, 14 * scale, 20 * scale);
      return { x, y: y - h + 18 * scale, r: 200 * scale };
    }
    case 'lamp_post': {
      const lx = x + 18 * scale;
      drawGlow(ctx, lx, y - h + 26 * scale, 80 * scale, '#ffc46a', 0.55);
      ctx.fillStyle = '#ffe0a0';
      ctx.fillRect(lx - 7 * scale, y - h + 17 * scale, 14 * scale, 18 * scale);
      return { x: lx, y: y - h + 26 * scale, r: 230 * scale };
    }
    case 'campfire': {
      for (let i = 0; i < 5; i++) {
        const ph = t * 6 + i * 1.7 + seed;
        const fh = (22 + 14 * Math.sin(ph)) * scale;
        ctx.fillStyle = i % 2 ? 'rgba(255,170,60,0.85)' : 'rgba(255,230,140,0.9)';
        ctx.beginPath();
        const fx = x + (i - 2) * 6 * scale;
        ctx.moveTo(fx - 7 * scale, y - 14 * scale);
        ctx.quadraticCurveTo(fx + Math.sin(ph) * 4 * scale, y - 14 * scale - fh, fx + 7 * scale, y - 14 * scale);
        ctx.fill();
      }
      drawGlow(ctx, x, y - 26 * scale, 110 * scale, '#ff9a3a', 0.6 + 0.1 * Math.sin(t * 7));
      return { x, y: y - 30 * scale, r: 320 * scale };
    }
    case 'windmill': {
      ctx.save();
      ctx.translate(x, y - h * 0.64);
      ctx.rotate(t * 0.5 + seed);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = 'rgba(230,215,180,0.95)';
        ctx.fillRect(4 * scale, -10 * scale, 110 * scale, 20 * scale);
        ctx.strokeStyle = 'rgba(90,60,30,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(4 * scale, -10 * scale, 110 * scale, 20 * scale);
      }
      ctx.fillStyle = '#5a3a22';
      ctx.beginPath();
      ctx.arc(0, 0, 9 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return null;
    }
    case 'banner': {
      const bx = x - 20 * scale;
      const top = y - h + 6 * scale;
      ctx.fillStyle = seed % 2 ? '#b83a2a' : '#2a5a8a';
      ctx.beginPath();
      ctx.moveTo(bx, top);
      for (let i = 0; i <= 10; i++) {
        const yy = top + i * 14 * scale;
        ctx.lineTo(bx + (60 + Math.sin(t * 3 + i * 0.6 + seed) * 6) * scale, yy);
      }
      ctx.lineTo(bx, top + 140 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd36a';
      ctx.lineWidth = 2;
      ctx.stroke();
      return null;
    }
    case 'chapel':
    case 'bell_tower':
    case 'house':
    case 'cottage':
      return { x, y: y - h * 0.35, r: 160 * scale };
    case 'crystal':
    case 'thread_tree':
    case 'glass_tree':
      drawGlow(ctx, x, y - h * 0.5, 90 * scale, theme === 'underweave_deep' ? '#7a9aff' : '#ffe6a0', 0.25 + 0.1 * Math.sin(t * 2 + seed));
      return { x, y: y - h * 0.5, r: 220 * scale };
    case 'seam_post':
      drawGlow(ctx, x, y - h + 18 * scale, 40 * scale, '#ffd36a', 0.6 + 0.2 * Math.sin(t * 3 + seed));
      return { x, y: y - h + 18 * scale, r: 150 * scale };
  }
  return null;
}

export function propHeight(kind: string): number {
  return SIZE[kind]?.[1] ?? 100;
}

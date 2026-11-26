// Enemy art: every enemy in the roster drawn in code, painted-storybook style. One entry per art key (the enemy id),
// built from shared families in render/enemies/*. Party-art foes ('party:<charId>') are drawn by the engine with the
// character rig; unknown keys (including those) fall back to a frayed knot here so nothing ever throws.
//
// (x, y) = the centre of the feet; enemies face LEFT; size 1 ≈ a man-sized foe about 150 px tall.
import { drawBobbin, drawCrawler, drawCrow, drawFray, drawHound, drawMimic, drawMoth, drawSerpent } from './enemies/beasts';
import { drawFirstThread, drawGlassChoir, drawGrandmother, drawGristle, drawSeraphine, drawWeaver } from './enemies/bosses';
import { drawAngel, drawGolem, drawHand, drawPorcelain, drawSentinel, drawSpindle, drawSpinner, drawThimble } from './enemies/constructs';
import { drawDrowned, drawEcho, drawKnight, drawPages, drawReed, drawScarecrow, drawShear, drawShroud, drawWisp } from './enemies/folk';
import { TAU, ell, hash, makeK, type Ctx, type K } from './enemies/kit';

export { drawBobbin };

export interface EnemyPose {
  t: number;
  anim: 'idle' | 'windup' | 'attack' | 'hurt' | 'die' | 'broken' | 'cast';
  p: number;
  flash: number;
  alpha: number;
  seed: number;
}

interface Spec {
  /** bounds above the feet in local units (size 1) */
  w: number;
  h: number;
  /** how far the generic lunge pushes it forward on attack (local units) */
  lunge: number;
  /** colour of the threads it unravels into */
  thread: string;
  fly?: boolean;
  draw(ctx: Ctx, k: K): void;
}

const S = (w: number, h: number, lunge: number, thread: string, draw: (ctx: Ctx, k: K) => void, fly = false): Spec => ({ w, h, lunge, thread, draw, fly });

const SPECS: Record<string, Spec> = {
  // ---- Prologue
  frayling: S(100, 105, 18, '#e0603a', (c, k) => drawFray(c, k, { body: '#c8462e', thread: '#e8743c', eye: '#3a2a2a', r: 50, eyes: 0, buttons: true, hop: true, loops: 4 })),
  yarn_hound: S(200, 130, 40, '#d0443a', (c, k) => drawHound(c, k, { body: '#b8362e', mane: '#e0604a', eye: '#ffd66a', thread: '#e86a50', loose: 6 })),
  unspun_hound: S(220, 140, 34, '#e8604a', (c, k) => drawHound(c, k, { body: '#a82e2a', mane: '#e85a48', eye: '#ffef9a', thread: '#f08a6a', loose: 16, big: true })),
  // ---- Ch1 Thimble Fields
  stitch_crow: S(110, 125, 30, '#3a3440', (c, k) => drawCrow(c, k, { body: '#2c2733', wing: '#3a3344', beak: '#c9a35a', eye: '#e8c84a' }), true),
  scarecrow: S(130, 185, 10, '#d8b85a', (c, k) => drawScarecrow(c, k, { coat: '#6a5a8a', sack: '#c8a878', straw: '#e8c86a', eye: '#ffb347', patch: '#a85a4a' })),
  thimble_knight: S(120, 130, 16, '#c9c2b8', (c, k) => drawThimble(c, k, { metal: '#b8bec8', body: '#7a5a3a', eye: '#ffcf5a', shield: '#d8a84a' })),
  old_tatter: S(260, 235, 8, '#d8b85a', (c, k) => drawScarecrow(c, k, { coat: '#4a3a4a', sack: '#b89a6a', straw: '#e8c86a', eye: '#ff8a3a', patch: '#8a4a3a', lord: true })),
  // ---- Ch2 Lanternmere
  lantern_wisp: S(80, 140, 10, '#ffd38a', (c, k) => drawWisp(c, k, { bell: '#7ac8c0', core: '#ffb347', tendril: '#9adcd4', lantern: true }), true),
  bog_moth: S(170, 175, 20, '#a8a070', (c, k) => drawMoth(c, k, { wing: '#6a6a4a', wing2: '#c8b070', body: '#5a4a3a', eye: '#ffd24a' }), true),
  drowned_weaver: S(110, 140, 10, '#6a9aa8', (c, k) => drawDrowned(c, k, { wrap: '#3a5a66', skin: '#9ab8b8', glow: '#9af0ff', hair: '#2a3a44' })),
  reedlurker: S(110, 215, 20, '#8a9a5a', (c, k) => drawReed(c, k, { reed: '#7a8a4a', head: '#6a4a2a', eye: '#ffe36a', bind: '#c9a35a' })),
  drowned_lamplighter: S(170, 215, 6, '#9fd8f0', (c, k) => drawDrowned(c, k, { wrap: '#26444e', skin: '#9ab8b8', glow: '#bff4ff', hair: '#1e3038', lamp: true })),
  // ---- Ch3 Cindermill
  spindle_drone: S(70, 155, 20, '#c0465a', (c, k) => drawSpindle(c, k, { wood: '#a87a4a', thread: '#c0465a', brass: '#c9a35a', eye: '#7fe0ff' }), true),
  shear_acolyte: S(100, 175, 20, '#e8e0d0', (c, k) => drawShear(c, k, { robe: '#ece6da', trim: '#d4af5a', metal: '#c8ced8', mask: '#f8f4ec' })),
  cinder_bobbin: S(120, 160, 10, '#ff8a3a', (c, k) => drawGolem(c, k, { iron: '#5a5258', molten: '#ff7a2a', eye: '#ffb84a' })),
  loomhound: S(200, 130, 40, '#c9a35a', (c, k) => drawHound(c, k, { body: '#b8904a', mane: '#8a6a3a', eye: '#ff5a3a', thread: '#c9a35a', loose: 0, clock: true })),
  foreman_gristle: S(220, 195, 0, '#c0465a', (c, k) => drawGristle(c, k)),
  // ---- Ch4 The Selvage
  seamharpy: S(160, 165, 30, '#e9e2f5', (c, k) => drawCrow(c, k, { body: '#5a5a7a', wing: '#7a7a9a', beak: '#c9a35a', eye: '#c08aff', harpy: true }), true),
  gale_shroud: S(130, 195, 20, '#d8e4ee', (c, k) => drawShroud(c, k, { cloth: '#c8d4e0', eye: '#8ad8ff', wind: '#e8f4ff' }), true),
  selvage_sentinel: S(150, 190, 0, '#d8b45a', (c, k) => drawSentinel(c, k, { stone: '#7a7a82', thread: '#d8b45a', rune: '#7ae0ff', moss: '#5a7a4a' })),
  // ---- Ch5 The Frayed Expanse
  echo_villager: S(80, 140, 30, '#c8c0f0', (c, k) => drawEcho(c, k, { cloth: '#a8a0d8', skin: '#d8d4f0', glow: '#c8c0ff' })),
  unwoven_moth: S(170, 175, 20, '#e8e0f0', (c, k) => drawMoth(c, k, { wing: '#c8c0d8', wing2: '#f0e8ff', body: '#8a8098', eye: '#a8f0ff', torn: true }), true),
  knot: S(130, 125, 14, '#8a5aa8', (c, k) => drawFray(c, k, { body: '#4a2a5a', thread: '#8a5aa8', eye: '#ff6ad0', r: 62, eyes: 6, loops: 7 })),
  driftlight: S(80, 140, 10, '#f8e8ff', (c, k) => drawWisp(c, k, { bell: '#e8d0f0', core: '#fff0c8', tendril: '#f0e0ff' }), true),
  moth_mother: S(300, 200, 10, '#f0e8d8', (c, k) => drawMoth(c, k, { wing: '#a89878', wing2: '#f0d890', body: '#6a5a48', eye: '#ffe86a', mother: true }), true),
  // ---- Ch6 Spindlehold
  choir_sentinel: S(100, 170, 14, '#d8b45a', (c, k) => drawPorcelain(c, k, { porcelain: '#f4f0e8', gold: '#d4af5a', voice: '#ffe7a0' })),
  shear_knight: S(110, 178, 22, '#d8b45a', (c, k) => drawShear(c, k, { robe: '#e0d8c8', trim: '#d4af5a', metal: '#a8b0bc', mask: '#f8f4ec', knight: true })),
  ledger_pages: S(140, 140, 0, '#efe6d0', (c, k) => drawPages(c, k, { paper: '#f2ead6', ink: '#4a3a3a', eye: '#d4a83a' }), true),
  loom_warden: S(150, 200, 20, '#f0e0b0', (c, k) => drawAngel(c, k, { body: '#f0ece4', trim: '#d4af5a', wing: '#e8e2d8', halo: '#ffe08a', wings: 2 }), true),
  seraphine: S(150, 230, 10, '#f0e8d0', (c, k) => drawSeraphine(c, k, false)),
  seraphine_2: S(150, 230, 14, '#5a2a7a', (c, k) => drawSeraphine(c, k, true)),
  // ---- Ch7 The Seam of Ages
  seam_crawler: S(150, 100, 30, '#c9a35a', (c, k) => drawCrawler(c, k, { cushion: '#b83a3a', needle: '#d8dee6', eye: '#ffd24a', thread: '#e8c86a' })),
  frayed_knight: S(110, 175, 24, '#c9a35a', (c, k) => drawKnight(c, k, { metal: '#8a8a94', cloth: '#5a3a4a', thread: '#e8c86a', eye: '#ff8a4a', weapon: 'sword' })),
  storm_crow: S(110, 125, 30, '#8fd0ff', (c, k) => drawCrow(c, k, { body: '#1e2a44', wing: '#2a3a5a', beak: '#c9a35a', eye: '#bfe4ff', storm: true }), true),
  seam_eater: S(240, 150, 0, '#c9a0c0', (c, k) => drawSerpent(c, k)),
  // ---- Ch8 The Underweave
  lost_thread: S(50, 125, 10, '#e8eef8', (c, k) => drawWisp(c, k, { bell: '#d8e0f0', core: '#f8fbff', tendril: '#e8eef8', thin: true }), true),
  grief_knot: S(130, 125, 14, '#6a8ad8', (c, k) => drawFray(c, k, { body: '#2a3a6a', thread: '#6a8ad8', eye: '#a8e8ff', r: 64, eyes: 5, loops: 7 })),
  hollow_mender: S(110, 175, 24, '#a8c8ff', (c, k) => drawKnight(c, k, { metal: '#8aa0c8', cloth: '#3a4a6a', thread: '#c8dcff', eye: '#a8e0ff', weapon: 'needle', ghost: true })),
  // ---- Ch9 The Loomspire
  loomhand: S(140, 180, 0, '#fff0c0', (c, k) => drawHand(c, k, { light: '#fbe8b8', needle: '#eef2f8', eye: '#d4a83a' }), true),
  choir_seraph: S(160, 205, 20, '#ffe08a', (c, k) => drawAngel(c, k, { body: '#f4e6b8', trim: '#c89a3a', wing: '#f0d890', halo: '#ffd860', wings: 4 }), true),
  fate_spinner: S(150, 195, 0, '#f0c8a0', (c, k) => drawSpinner(c, k, { wood: '#8a6a4a', thread: '#ffd08a', mask: '#f4f0e8', eye: '#ffb84a' })),
  weaver: S(200, 180, 0, '#fff4d8', (c, k) => drawWeaver(c, k, 1), true),
  weaver_2: S(200, 180, 0, '#e8d8ff', (c, k) => drawWeaver(c, k, 2), true),
  weaver_3: S(200, 180, 0, '#c8b0ff', (c, k) => drawWeaver(c, k, 3), true),
  // ---- optional
  bobbin_mimic: S(110, 80, 26, '#c0465a', (c, k) => drawMimic(c, k)),
  grandmother_spool: S(150, 195, 0, '#9a7ab8', (c, k) => drawGrandmother(c, k)),
  glass_choir: S(150, 180, 0, '#e0f8ff', (c, k) => drawGlassChoir(c, k)),
  first_thread: S(160, 170, 0, '#ffffff', (c, k) => drawFirstThread(c, k), true),
};

const FALLBACK: Spec = S(100, 100, 14, '#a08a9a', (c, k) => drawFray(c, k, { body: '#5a4a5a', thread: '#a08a9a', eye: '#ffd24a', r: 46, eyes: 2, loops: 5 }));

export const ART_KEYS: string[] = Object.keys(SPECS);

export function enemyBox(art: string, size: number): { w: number; h: number } {
  const s = SPECS[art] ?? FALLBACK;
  return { w: s.w * size, h: s.h * size };
}

/** dizzy stars circling a Broken enemy's head */
function dizzy(ctx: Ctx, x: number, y: number, size: number, t: number): void {
  const r = 16 * Math.sqrt(size);
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + (i * TAU) / 3;
    const sx = x + Math.cos(a) * r;
    const sy = y + Math.sin(a) * r * 0.35;
    const s = 3.5 * Math.sqrt(size) * (0.8 + 0.2 * Math.sin(a));
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const rr = j % 2 ? s * 0.45 : s;
      const aa = (j * Math.PI) / 5 - Math.PI / 2 + t;
      ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffe680';
    ctx.fill();
  }
}

/** loose threads drifting up as a beaten enemy unravels */
function unravel(ctx: Ctx, x: number, y: number, spec: Spec, size: number, k: K): void {
  const p = k.die;
  if (p <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, k.seed);
    const h1 = hash(i + 31, k.seed);
    const fade = Math.max(0, Math.min(1, (1 - p) * 1.6 - h1 * 0.3));
    if (fade <= 0) continue;
    const sx = x + (h0 - 0.5) * spec.w * size * 0.8 + Math.sin(p * 6 + i) * 10 * size;
    const sy = y - spec.h * size * (0.15 + h1 * 0.75) - p * (60 + h0 * 90) * size;
    const len = (14 + h1 * 22) * size;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + Math.sin(p * 9 + i) * len * 0.5, sy - len * 0.5, sx + Math.sin(p * 4 + i * 2) * len * 0.3, sy - len);
    ctx.strokeStyle = k.a(spec.thread, fade);
    ctx.lineWidth = 1.6 * Math.max(0.8, Math.sqrt(size));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, art: string, x: number, y: number, size: number, pose: EnemyPose): void {
  const spec = SPECS[art] ?? FALLBACK;
  const sz = size > 0 ? size : 1;
  const k = makeK(pose, sz);
  const alpha = Math.max(0, Math.min(1, pose.alpha ?? 1));
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  // ground shadow
  const sh = 0.24 * alpha * (1 - k.die) * (spec.fly ? 0.6 : 1);
  if (sh > 0.01) {
    ell(ctx, 0, 0, spec.w * 0.4 * sz * (spec.fly ? 0.7 : 1), 6 * sz);
    ctx.fillStyle = `rgba(0,0,0,${sh.toFixed(3)})`;
    ctx.fill();
  }
  const dx = (k.wind * 7 - k.atk * spec.lunge + k.hurt * 12) * sz;
  const dy = (k.broken ? 4 : 0) * sz + k.die * 12 * sz;
  ctx.translate(dx, dy);
  const rot = k.hurt * 0.07 + k.broken * 0.05 - k.atk * 0.03 + k.die * 0.08;
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha *= alpha * (k.die ? Math.pow(1 - k.die, 1.4) : 1);
  ctx.scale(sz, sz);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  spec.draw(ctx, k);
  ctx.restore();
  if (k.broken) dizzy(ctx, x, y - spec.h * sz * 0.92, sz, k.t);
  if (k.die > 0) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    unravel(ctx, x, y, spec, sz, k);
    ctx.restore();
  }
}

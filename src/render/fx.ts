// Particles, floating numbers, rings, screen shake and flashes. One pool; bounded counts.
import { drawGlow, H, isLowQuality, W } from './canvas';

interface Part {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'spark' | 'glow' | 'thread' | 'shard' | 'smoke' | 'petal' | 'note';
  rot: number;
  vr: number;
  grav: number;
}

interface Num {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  max: number;
  vy: number;
  outline: string;
  pop: number;
}

interface Ring {
  x: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

export class Fx {
  parts: Part[] = [];
  nums: Num[] = [];
  rings: Ring[] = [];
  shakeT = 0;
  shakeP = 0;
  shakeMax = 0;
  flashT = 0;
  flashMax = 0;
  flashColor = '#fff';
  slowmo = 0;
  shakeEnabled = true;
  reducedFlash = false;

  private cap(): number {
    return isLowQuality() ? 160 : 420;
  }

  add(p: Partial<Part> & { x: number; y: number }): void {
    if (this.parts.length >= this.cap()) this.parts.shift();
    this.parts.push({ vx: 0, vy: 0, life: 0.8, size: 3, color: '#fff', kind: 'spark', rot: 0, vr: 0, grav: 0, ...p, max: p.life ?? 0.8 });
  }

  burst(x: number, y: number, color: string, n = 14, speed = 260, kind: Part['kind'] = 'spark', grav = 400): void {
    const m = isLowQuality() ? Math.ceil(n / 2) : n;
    for (let i = 0; i < m; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life: 0.4 + Math.random() * 0.5, size: 2 + Math.random() * 3, color, kind, grav, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }

  threads(x: number, y: number, color: string, n = 10): void {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const s = 60 + Math.random() * 160;
      this.add({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9 + Math.random() * 0.8, size: 10 + Math.random() * 18, color, kind: 'thread', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4, grav: -20 });
    }
  }

  glowPuff(x: number, y: number, color: string, n = 8, spread = 40): void {
    for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 60, life: 0.7 + Math.random() * 0.8, size: 8 + Math.random() * 14, color, kind: 'glow', grav: -10 });
  }

  notes(x: number, y: number, color: string, n = 4): void {
    for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - 0.5) * 50, y, vx: (Math.random() - 0.5) * 50, vy: -50 - Math.random() * 40, life: 1.2, size: 14, color, kind: 'note', grav: -10 });
  }

  num(x: number, y: number, text: string, color = '#fff', size = 30, outline = 'rgba(20,10,5,0.85)'): void {
    if (this.nums.length > 40) this.nums.shift();
    this.nums.push({ x: x + (Math.random() - 0.5) * 24, y, text, color, size, life: 1.1, max: 1.1, vy: -70, outline, pop: 1 });
  }

  ring(x: number, y: number, color: string, r0 = 10, r1 = 90, life = 0.45, width = 4): void {
    if (this.rings.length > 30) this.rings.shift();
    this.rings.push({ x, y, r0, r1, life, max: life, color, width });
  }

  shake(power: number, ms: number): void {
    if (!this.shakeEnabled) return;
    this.shakeP = Math.max(this.shakeP, power);
    this.shakeT = Math.max(this.shakeT, ms / 1000);
    this.shakeMax = Math.max(this.shakeMax, ms / 1000);
  }

  flash(color: string, ms: number): void {
    this.flashColor = color;
    this.flashT = ms / 1000;
    this.flashMax = ms / 1000;
  }

  offset(): [number, number] {
    if (this.shakeT <= 0) return [0, 0];
    const k = this.shakeT / Math.max(0.001, this.shakeMax);
    return [(Math.random() - 0.5) * 2 * this.shakeP * k, (Math.random() - 0.5) * 2 * this.shakeP * k];
  }

  update(dt: number): void {
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.shakeT <= 0) {
      this.shakeP = 0;
      this.shakeMax = 0;
    }
    this.flashT = Math.max(0, this.flashT - dt);
    for (const p of this.parts) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.vx *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const n of this.nums) {
      n.life -= dt;
      n.y += n.vy * dt;
      n.vy *= 1 - 2.5 * dt;
      n.pop = Math.max(0, n.pop - dt * 5);
    }
    this.nums = this.nums.filter((n) => n.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      const k = p.life / p.max;
      switch (p.kind) {
        case 'spark':
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
          break;
        case 'glow':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1;
          drawGlow(ctx, p.x, p.y, p.size * (0.5 + k), p.color, k * 0.8);
          break;
        case 'thread':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, k * 1.4);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x + Math.cos(p.rot) * p.size * 0.5, p.y + Math.sin(p.rot * 1.3) * p.size * 0.4, p.x + Math.cos(p.rot + 1) * p.size, p.y + Math.sin(p.rot + 1) * p.size * 0.6);
          ctx.stroke();
          break;
        case 'shard':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
          ctx.restore();
          break;
        case 'smoke':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = k * 0.35;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - k), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'petal':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        case 'note':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.font = `${p.size}px "IM Fell English", Georgia, serif`;
          ctx.fillText(p.rot > 3 ? '♪' : '♫', p.x, p.y);
          break;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const n of this.nums) {
      const k = n.life / n.max;
      ctx.globalAlpha = Math.min(1, k * 2.5);
      const s = n.size * (1 + n.pop * 0.5);
      ctx.font = `700 ${Math.round(s)}px "IM Fell English SC", "IM Fell English", Georgia, serif`;
      ctx.strokeStyle = n.outline;
      ctx.lineWidth = Math.max(3, s * 0.16);
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.restore();
  }

  drawScreen(ctx: CanvasRenderingContext2D): void {
    if (this.flashT > 0) {
      ctx.save();
      ctx.globalAlpha = (this.flashT / this.flashMax) * (this.reducedFlash ? 0.25 : 0.65);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  clear(): void {
    this.parts = [];
    this.nums = [];
    this.rings = [];
  }
}

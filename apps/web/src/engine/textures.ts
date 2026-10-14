import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvasTex(w: number, h: number, draw: Draw, repeat?: number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available in this browser');
  draw(ctx, w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  t.anisotropy = 4;
  return t;
}

// basket-weave pattern with a little jitter and grime
export function weave(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  dark: string,
  light: string,
): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const n = 32;
  const s = w / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const over = (i + j) % 2 === 0;
      ctx.fillStyle = over ? light : dark;
      const jx = (Math.random() - 0.5) * 1.5;
      const jy = (Math.random() - 0.5) * 1.5;
      if (over) ctx.fillRect(i * s + 1 + jx, j * s + s * 0.18 + jy, s - 2, s * 0.64);
      else ctx.fillRect(i * s + s * 0.18 + jx, j * s + 1 + jy, s * 0.64, s - 2);
    }
  for (let k = 0; k < 900; k++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1);
  }
}

function softDot(color: string): CanvasTexture {
  return canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
}

const drawStar: Draw = (c) => {
  c.translate(128, 128);
  c.beginPath();
  for (let i = 0; i < 20; i++) {
    const r = i % 2 ? 48 : 120 - (i % 4) * 18;
    const a = (i / 20) * Math.PI * 2;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = '#ffd23f';
  c.fill();
  c.lineWidth = 10;
  c.strokeStyle = '#ff6a1a';
  c.stroke();
  c.beginPath();
  c.arc(0, 0, 34, 0, 7);
  c.fillStyle = '#fff6c0';
  c.fill();
};

const drawDrop: Draw = (c) => {
  c.fillStyle = '#7fd4ff';
  c.beginPath();
  c.moveTo(32, 6);
  c.quadraticCurveTo(54, 40, 32, 58);
  c.quadraticCurveTo(10, 40, 32, 6);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(26, 40, 5, 8, 0, 0, 7);
  c.fill();
};

export interface SharedTextures {
  /** Grey weave used as a world-space detail map and bump map. */
  weaveGrey: CanvasTexture;
  star: CanvasTexture;
  dust: CanvasTexture;
  glow: CanvasTexture;
  drop: CanvasTexture;
}

export function createWeaveGrey(): CanvasTexture {
  const t = canvasTex(256, 256, (c, w, h) => weave(c, w, h, '#888', '#6a6a6a', '#a8a8a8'));
  t.colorSpace = NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Sprite textures for impacts, dust, motes and sweat. */
export function createFxTextures(): Omit<SharedTextures, 'weaveGrey'> {
  const star = canvasTex(256, 256, drawStar);
  const dust = softDot('rgba(240,215,180,0.9)');
  const glow = softDot('rgba(255,230,190,1)');
  const drop = canvasTex(64, 64, drawDrop);
  return { star, dust, glow, drop };
}

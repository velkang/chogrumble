// Eye families painted on a 512x512 face canvas (scaled down by the caller).
// Eyes sit at x 170 and 342, y 250.
import type { EyeSpec } from '../looks/types';

type Ctx = CanvasRenderingContext2D;
export const EYE_X = [170, 342] as const;
export const EYE_Y = 250;
const INK = '#16101c';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function oval(c: Ctx, color: string, x: number, y: number, rx: number, ry: number, rot = 0) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fill();
}

function line(c: Ctx, color: string, width: number, pts: readonly (readonly [number, number])[]) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.stroke();
}

function dot(c: Ctx, x: number, y: number, tint: number | null, dx = 0, dy = 0) {
  oval(c, INK, x, y, 40, 50);
  if (tint !== null) oval(c, hex(tint), x + dx, y + dy, 24, 30);
  oval(c, '#fff', x - 12 + dx, y - 18 + dy, 12, 14);
  oval(c, '#fff', x + 14 + dx, y + 14 + dy, 5, 5);
}

function heart(c: Ctx, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(0, 30);
  c.bezierCurveTo(-60, -10, -40, -60, 0, -30);
  c.bezierCurveTo(40, -60, 60, -10, 0, 30);
  c.closePath();
  c.fillStyle = '#ff2a3d';
  c.fill();
  c.restore();
}

function lid(c: Ctx, x: number, y: number, from: number) {
  // a skin-coloured lid over the top of the eye
  c.save();
  c.beginPath();
  c.ellipse(x, y, 44, 54, 0, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#f2d7c4';
  c.fillRect(x - 50, y - 60, 100, from);
  line(c, INK, 8, [[x - 44, y - 60 + from], [x + 44, y - 60 + from]]);
  c.restore();
}

function lenses(c: Ctx, tint: number, shape: 'round' | 'square', alpha = 0.85) {
  c.globalAlpha = alpha;
  for (const x of EYE_X) {
    c.fillStyle = hex(tint);
    c.beginPath();
    if (shape === 'round') c.ellipse(x, EYE_Y, 62, 58, 0, 0, Math.PI * 2);
    else c.roundRect(x - 66, EYE_Y - 48, 132, 96, 18);
    c.fill();
  }
  c.globalAlpha = 1;
  c.strokeStyle = INK;
  c.lineWidth = 12;
  for (const x of EYE_X) {
    c.beginPath();
    if (shape === 'round') c.ellipse(x, EYE_Y, 62, 58, 0, 0, Math.PI * 2);
    else c.roundRect(x - 66, EYE_Y - 48, 132, 96, 18);
    c.stroke();
  }
  line(c, INK, 12, [[EYE_X[0] + 62, EYE_Y - 10], [EYE_X[1] - 62, EYE_Y - 10]]);
  oval(c, 'rgba(255,255,255,.7)', EYE_X[0] - 24, EYE_Y - 22, 14, 8, -0.5);
  oval(c, 'rgba(255,255,255,.7)', EYE_X[1] - 24, EYE_Y - 22, 14, 8, -0.5);
}

type Painter = (c: Ctx, tint: number | null) => void;

const PAINT: Readonly<Record<EyeSpec['family'], Painter>> = {
  round: (c, t) => EYE_X.forEach((x) => dot(c, x, EYE_Y, t)),
  up: (c, t) => EYE_X.forEach((x) => dot(c, x, EYE_Y, t, 0, -14)),
  side: (c, t) => EYE_X.forEach((x) => (dot(c, x, EYE_Y, t, 14, 0), lid(c, x, EYE_Y, 36))),
  smirk: (c, t) => EYE_X.forEach((x, i) => (dot(c, x, EYE_Y, t), lid(c, x, EYE_Y, i === 0 ? 50 : 30))),
  tired: (c, t) => EYE_X.forEach((x) => (dot(c, x, EYE_Y, t), lid(c, x, EYE_Y, 58))),
  frog: (c) =>
    EYE_X.forEach((x) => {
      oval(c, '#fff', x, EYE_Y - 10, 56, 56);
      line(c, INK, 8, [[x - 56, EYE_Y - 10], [x + 56, EYE_Y - 10]]);
      oval(c, INK, x, EYE_Y - 10, 22, 22);
    }),
  vertical: (c, t) => EYE_X.forEach((x) => (oval(c, INK, x, EYE_Y, 20, 56), t !== null && oval(c, hex(t), x, EYE_Y, 10, 30))),
  happy: (c, t) => EYE_X.forEach((x) => line(c, t !== null ? hex(t) : INK, 14, [[x - 34, EYE_Y + 14], [x, EYE_Y - 22], [x + 34, EYE_Y + 14]])),
  flat: (c, t) => EYE_X.forEach((x) => line(c, t !== null ? hex(t) : INK, 16, [[x - 38, EYE_Y], [x + 38, EYE_Y]])),
  angry: (c, t) =>
    EYE_X.forEach((x, i) => {
      dot(c, x, EYE_Y + 6, t);
      const d = i === 0 ? 1 : -1;
      line(c, INK, 16, [[x - 48 * d, EYE_Y - 62], [x + 40 * d, EYE_Y - 36]]);
    }),
  mog: (c, t) =>
    EYE_X.forEach((x, i) => {
      dot(c, x, EYE_Y + 6, t);
      lid(c, x, EYE_Y + 6, 44);
      const d = i === 0 ? 1 : -1;
      line(c, INK, 14, [[x - 46 * d, EYE_Y - 48], [x + 44 * d, EYE_Y - 40]]);
    }),
  worried: (c, t) =>
    EYE_X.forEach((x, i) => {
      dot(c, x, EYE_Y + 6, t);
      const d = i === 0 ? 1 : -1;
      line(c, INK, 12, [[x - 44 * d, EYE_Y - 40], [x + 36 * d, EYE_Y - 66]]);
    }),
  crossed: (c, t) => {
    dot(c, EYE_X[0], EYE_Y, t, 16, 4);
    dot(c, EYE_X[1], EYE_Y - 8, t, -16, -6);
  },
  x: (c) =>
    EYE_X.forEach((x) => {
      line(c, INK, 15, [[x - 32, EYE_Y - 32], [x + 32, EYE_Y + 32]]);
      line(c, INK, 15, [[x + 32, EYE_Y - 32], [x - 32, EYE_Y + 32]]);
    }),
  heart: (c) => EYE_X.forEach((x) => heart(c, x, EYE_Y, 1.35)),
  crying: (c, t) =>
    EYE_X.forEach((x) => {
      if (t === null) dot(c, x, EYE_Y, null);
      else line(c, hex(t), 14, [[x - 34, EYE_Y - 6], [x, EYE_Y + 16], [x + 34, EYE_Y - 6]]);
      oval(c, '#7fd4ff', x + 26, EYE_Y + 70, 14, 26);
    }),
  clown: (c, t) =>
    EYE_X.forEach((x) => {
      c.fillStyle = t !== null ? hex(t) : '#3a7bd5';
      c.beginPath();
      c.moveTo(x, EYE_Y - 80);
      c.lineTo(x + 44, EYE_Y);
      c.lineTo(x, EYE_Y + 80);
      c.lineTo(x - 44, EYE_Y);
      c.closePath();
      c.fill();
      dot(c, x, EYE_Y, null);
    }),
  laser: (c, t) =>
    EYE_X.forEach((x) => {
      oval(c, INK, x, EYE_Y, 40, 50);
      oval(c, hex(t ?? 0xff3cf0), x, EYE_Y, 28, 34);
      oval(c, '#fff', x, EYE_Y, 11, 14);
    }),
  visor: (c, t) => {
    const g = c.createLinearGradient(80, 0, 432, 0);
    g.addColorStop(0, hex(t ?? 0x7a5cff));
    g.addColorStop(1, '#ffffff');
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(84, EYE_Y - 52, 344, 104, 40);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 10;
    c.stroke();
    oval(c, 'rgba(255,255,255,.55)', 160, EYE_Y - 24, 50, 10);
  },
  glasses: (c, t) => {
    EYE_X.forEach((x) => dot(c, x, EYE_Y, null));
    lenses(c, t ?? 0xfff4c2, 'round', 0.45);
  },
  vr: (c, t) => {
    c.fillStyle = hex(t ?? 0xeeeeee);
    c.beginPath();
    c.roundRect(76, EYE_Y - 64, 360, 128, 26);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 10;
    c.stroke();
    oval(c, '#3de8ff', 256, EYE_Y, 120, 10);
  },
  shades: (c, t) => lenses(c, t ?? 0x111111, 'square', 1),
};

export function paintEyes(c: Ctx, spec: EyeSpec): void {
  PAINT[spec.family](c, spec.tint);
}

/** Hurt squint, used for every Chog. */
export function paintSquint(c: Ctx): void {
  for (const [x, d] of [[EYE_X[0], 1], [EYE_X[1], -1]] as const) {
    line(c, INK, 14, [[x - 32 * d, EYE_Y - 30], [x + 26 * d, EYE_Y], [x - 32 * d, EYE_Y + 30]]);
  }
}

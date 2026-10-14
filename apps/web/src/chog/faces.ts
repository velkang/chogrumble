// Chog faces are painted in a canvas and projected onto the front of the head in bind-pose space.
import type { CanvasTexture } from 'three';
import { canvasTex } from '../engine/textures';

export const FACE_NAMES = ['hearts', 'heartsOpen', 'normal', 'laser', 'hurt', 'ko'] as const;
export type FaceName = (typeof FACE_NAMES)[number];
export type Faces = Readonly<Record<FaceName, CanvasTexture>>;

type Ctx = CanvasRenderingContext2D;
const EYE_X = [170, 342] as const;
const EYE_Y = 250;
const INK = '#16101c';

function blush(c: Ctx) {
  c.fillStyle = 'rgba(255,110,150,.75)';
  for (const x of [110, 402]) {
    c.beginPath();
    c.ellipse(x, 345, 52, 30, 0, 0, 7);
    c.fill();
  }
}

function nose(c: Ctx) {
  c.fillStyle = '#e8708e';
  c.beginPath();
  c.moveTo(236, 318);
  c.lineTo(276, 318);
  c.lineTo(256, 340);
  c.closePath();
  c.fill();
}

function catMouth(c: Ctx, open: boolean) {
  c.strokeStyle = '#2a1520';
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(214, 362);
  c.quadraticCurveTo(235, 392, 256, 366);
  c.quadraticCurveTo(277, 392, 298, 362);
  c.stroke();
  if (!open) return;
  c.fillStyle = '#7a1f35';
  c.beginPath();
  c.ellipse(256, 392, 34, 26, 0, 0, 7);
  c.fill();
  c.fillStyle = '#ff7a9a';
  c.beginPath();
  c.ellipse(256, 404, 20, 12, 0, 0, 7);
  c.fill();
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
  c.lineWidth = 6 / s;
  c.strokeStyle = '#8a0f1e';
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.beginPath();
  c.ellipse(-18, -22, 10, 6, -0.6, 0, 7);
  c.fill();
  c.restore();
}

function ellipse(c: Ctx, color: string, x: number, y: number, rx: number, ry: number) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, 7);
  c.fill();
}

function dotEyes(c: Ctx, glow: boolean) {
  for (const x of EYE_X) {
    ellipse(c, INK, x, EYE_Y, 40, 50);
    if (glow) {
      ellipse(c, '#ff3cf0', x, EYE_Y, 26, 32);
      ellipse(c, '#fff', x, EYE_Y, 11, 14);
    } else {
      ellipse(c, '#fff', x - 12, EYE_Y - 18, 13, 15);
      ellipse(c, '#fff', x + 14, EYE_Y + 14, 6, 6);
    }
  }
}

function squint(c: Ctx) {
  c.strokeStyle = INK;
  c.lineWidth = 14;
  for (const [x, d] of [
    [EYE_X[0], 1],
    [EYE_X[1], -1],
  ] as const) {
    c.beginPath();
    c.moveTo(x - 32 * d, EYE_Y - 30);
    c.lineTo(x + 26 * d, EYE_Y);
    c.lineTo(x - 32 * d, EYE_Y + 30);
    c.stroke();
  }
}

function xEyes(c: Ctx) {
  c.strokeStyle = INK;
  c.lineWidth = 15;
  for (const x of EYE_X) {
    c.beginPath();
    c.moveTo(x - 32, EYE_Y - 32);
    c.lineTo(x + 32, EYE_Y + 32);
    c.moveTo(x + 32, EYE_Y - 32);
    c.lineTo(x - 32, EYE_Y + 32);
    c.stroke();
  }
}

function flatMouth(c: Ctx) {
  c.strokeStyle = '#2a1520';
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(220, 372);
  c.lineTo(292, 366);
  c.stroke();
}

const PAINTERS: Record<FaceName, (c: Ctx) => void> = {
  hearts: (c) => (
    blush(c),
    EYE_X.forEach((x) => heart(c, x, EYE_Y, 1.35)),
    nose(c),
    catMouth(c, false)
  ),
  heartsOpen: (c) => (
    blush(c),
    EYE_X.forEach((x) => heart(c, x, EYE_Y, 1.35)),
    nose(c),
    catMouth(c, true)
  ),
  normal: (c) => (blush(c), dotEyes(c, false), nose(c), catMouth(c, false)),
  laser: (c) => (blush(c), dotEyes(c, true), nose(c), flatMouth(c)),
  hurt: (c) => (blush(c), squint(c), nose(c), catMouth(c, true)),
  ko: (c) => {
    blush(c);
    xEyes(c);
    nose(c);
    catMouth(c, true);
    c.fillStyle = '#ff7a9a';
    c.beginPath();
    c.ellipse(276, 430, 22, 34, 0.3, 0, 7);
    c.fill();
  },
};

function faceCanvas(kind: FaceName): CanvasTexture {
  return canvasTex(512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    PAINTERS[kind](c);
  });
}

export function createFaces(): Faces {
  return Object.fromEntries(FACE_NAMES.map((k) => [k, faceCanvas(k)])) as Faces;
}

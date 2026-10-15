// A fighter's own faces, painted from its Eyes and Mouth traits: normal, laser, hurt and KO.
import type { CanvasTexture } from 'three';
import { canvasTex } from '../engine/textures';
import type { LookSpec } from '../looks/types';
import type { Faces } from './faces';
import { paintEyes, paintSquint } from './paint-eyes';
import { paintMouth, paintNoseAndBlush, paintOpenMouth } from './paint-mouths';

/** Fighters are small on screen, so their faces use a smaller canvas than the giant's. */
const SIZE = 256;
const DESIGN = 512;

type Expression = 'normal' | 'laser' | 'hurt' | 'ko';

function paint(look: LookSpec, expression: Expression): CanvasTexture {
  return canvasTex(SIZE, SIZE, (c) => {
    c.clearRect(0, 0, SIZE, SIZE);
    c.save();
    c.scale(SIZE / DESIGN, SIZE / DESIGN);
    if (look.mirror) {
      c.translate(DESIGN, 0);
      c.scale(-1, 1);
    }
    c.lineCap = 'round';
    c.lineJoin = 'round';
    paintNoseAndBlush(c);
    if (expression === 'normal') paintEyes(c, look.eyes);
    if (expression === 'laser') paintEyes(c, { family: 'laser', tint: look.eyes.family === 'laser' ? look.eyes.tint : null });
    if (expression === 'hurt') paintSquint(c);
    if (expression === 'ko') paintEyes(c, { family: 'x', tint: null });
    if (expression === 'normal' || expression === 'laser') paintMouth(c, look.mouth);
    else paintOpenMouth(c);
    if (expression === 'ko') {
      c.fillStyle = '#ff7a9a';
      c.beginPath();
      c.ellipse(276, 430, 22, 34, 0.3, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });
}

/** The fighter's face set. Hearts faces belong to the giant, so fighters reuse their normal face. */
export function createFaceSet(look: LookSpec): Faces {
  const normal = paint(look, 'normal');
  return { normal, hearts: normal, heartsOpen: normal, laser: paint(look, 'laser'), hurt: paint(look, 'hurt'), ko: paint(look, 'ko') };
}

export function disposeFaceSet(faces: Faces): void {
  new Set(Object.values(faces)).forEach((t) => t.dispose());
}


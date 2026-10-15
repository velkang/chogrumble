// Mouth families painted on a 512x512 face canvas. The nose sits at (256, 330).
import type { MouthSpec } from '../looks/types';

type Ctx = CanvasRenderingContext2D;
const LIP = '#2a1520';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function oval(c: Ctx, color: string, x: number, y: number, rx: number, ry: number) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

function catSmile(c: Ctx) {
  c.strokeStyle = LIP;
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(214, 362);
  c.quadraticCurveTo(235, 392, 256, 366);
  c.quadraticCurveTo(277, 392, 298, 362);
  c.stroke();
}

function arc(c: Ctx, up: boolean) {
  c.strokeStyle = LIP;
  c.lineWidth = 10;
  c.beginPath();
  c.moveTo(216, up ? 386 : 366);
  c.quadraticCurveTo(256, up ? 356 : 400, 296, up ? 386 : 366);
  c.stroke();
}

function openMouth(c: Ctx) {
  oval(c, '#7a1f35', 256, 392, 34, 26);
  oval(c, '#ff7a9a', 256, 404, 20, 12);
}

type Painter = (c: Ctx, tint: number | null) => void;

const PAINT: Readonly<Record<MouthSpec['family'], Painter>> = {
  smile: (c) => catSmile(c),
  drool: (c) => {
    catSmile(c);
    oval(c, '#9fe0ff', 290, 404, 9, 18);
  },
  sad: (c) => arc(c, true),
  worried: (c) => {
    c.strokeStyle = LIP;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(212, 378);
    for (let i = 1; i <= 6; i++) c.lineTo(212 + i * 15, 378 + (i % 2 ? -10 : 10));
    c.stroke();
  },
  flat: (c) => {
    c.strokeStyle = LIP;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(220, 374);
    c.lineTo(292, 370);
    c.stroke();
  },
  o: (c) => oval(c, '#7a1f35', 256, 384, 18, 22),
  bubblegum: (c, t) => {
    catSmile(c);
    oval(c, hex(t ?? 0xff7ec4), 290, 380, 46, 44);
    oval(c, 'rgba(255,255,255,.7)', 274, 362, 12, 8);
  },
  puke: (c) => {
    openMouth(c);
    ['#ff4d4d', '#ff9f1c', '#ffe94d', '#4dff88', '#4dc3ff', '#b04dff'].forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(226 + i * 10, 396, 10, 116);
    });
  },
  goldTooth: (c, t) => {
    arc(c, false);
    c.fillStyle = hex(t ?? 0xffc83d);
    c.fillRect(262, 372, 16, 18);
  },
  lipBite: (c) => {
    arc(c, false);
    c.fillStyle = '#fff';
    c.fillRect(244, 378, 24, 14);
  },
  coin: (c, t) => {
    catSmile(c);
    oval(c, hex(t ?? 0xf7931a), 256, 392, 30, 30);
    oval(c, 'rgba(255,255,255,.35)', 248, 384, 14, 14);
  },
  clown: (c, t) => {
    c.fillStyle = hex(t ?? 0xe0303a);
    c.beginPath();
    c.moveTo(190, 360);
    c.quadraticCurveTo(256, 450, 322, 360);
    c.quadraticCurveTo(256, 400, 190, 360);
    c.fill();
  },
  grit: (c) => {
    c.fillStyle = '#fff';
    c.fillRect(214, 364, 84, 30);
    c.strokeStyle = LIP;
    c.lineWidth = 6;
    c.strokeRect(214, 364, 84, 30);
    for (let x = 228; x < 298; x += 14) {
      c.beginPath();
      c.moveTo(x, 364);
      c.lineTo(x, 394);
      c.stroke();
    }
  },
};

export function paintMouth(c: Ctx, spec: MouthSpec): void {
  PAINT[spec.family](c, spec.tint);
}

export function paintOpenMouth(c: Ctx): void {
  catSmile(c);
  openMouth(c);
}

export function paintNoseAndBlush(c: Ctx): void {
  c.fillStyle = 'rgba(255,110,150,.75)';
  for (const x of [110, 402]) {
    c.beginPath();
    c.ellipse(x, 345, 52, 30, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#e8708e';
  c.beginPath();
  c.moveTo(236, 318);
  c.lineTo(276, 318);
  c.lineTo(256, 340);
  c.closePath();
  c.fill();
}

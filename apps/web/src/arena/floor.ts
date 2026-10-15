// Burlap floor and the pink blush circles painted on it (the giant's blush trait).
import { CircleGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { Scene } from 'three';
import { canvasTex } from '../engine/textures';
import { ARENA_SCALE } from './constants';

type Ctx = CanvasRenderingContext2D;

function weaveThreads(c: Ctx, w: number) {
  const n = 48;
  const s = w / n;
  for (let k = 0; k < 2; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const lum = 0.82 + Math.random() * 0.3;
        const over = (i + j + k) % 2 === 0;
        c.fillStyle = `rgba(${Math.round(176 * lum)},${Math.round(142 * lum)},${Math.round(98 * lum)},${over ? 0.95 : 0.55})`;
        c.beginPath();
        if (k === 0)
          c.ellipse(
            i * s + s / 2,
            j * s + s / 2,
            s * 0.5,
            s * 0.3,
            (Math.random() - 0.5) * 0.15,
            0,
            7,
          );
        else
          c.ellipse(
            i * s + s / 2,
            j * s + s / 2,
            s * 0.3,
            s * 0.5,
            (Math.random() - 0.5) * 0.15,
            0,
            7,
          );
        c.fill();
      }
}

function strayFibres(c: Ctx, w: number, h: number) {
  for (let f = 0; f < 2500; f++) {
    c.strokeStyle = `rgba(${Math.random() < 0.5 ? '60,40,20' : '210,180,130'},${Math.random() * 0.35})`;
    c.lineWidth = 1;
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * 6.3;
    const L = 6 + Math.random() * 22;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(
      x + (Math.cos(a + 0.5) * L) / 2,
      y + (Math.sin(a + 0.5) * L) / 2,
      x + Math.cos(a) * L,
      y + Math.sin(a) * L,
    );
    c.stroke();
  }
}

export function addFloor(scene: Scene): Mesh {
  const floorTex = canvasTex(
    1024,
    1024,
    (c, w, h) => {
      c.fillStyle = '#93744e';
      c.fillRect(0, 0, w, h);
      weaveThreads(c, w);
      strayFibres(c, w, h);
    },
    3,
  );
  // creation order matters for seeded comparisons: material, then geometry
  const floorMat = new MeshStandardMaterial({ map: floorTex, roughness: 1 });
  const floor = new Mesh(new CircleGeometry(1, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(11 * ARENA_SCALE, 9.6 * ARENA_SCALE, 1);
  floor.position.set(1.0 * ARENA_SCALE, 0.04, 0.0);
  floor.receiveShadow = true;
  scene.add(floor);
  return floor;
}

const BLUSH_SPOTS = [
  [-5.6, 3.2, 1.6],
  [6.4, 3.4, 1.5],
  [-1.2, 5.6, 1.1],
] as const;

export function addBlush(scene: Scene): void {
  const blushMat = new MeshBasicMaterial({
    color: 0xff6f9e,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  for (const [x, z, r] of BLUSH_SPOTS) {
    const d = new Mesh(new CircleGeometry(r * ARENA_SCALE, 48), blushMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(x * ARENA_SCALE, 0.1, z * ARENA_SCALE);
    scene.add(d);
  }
}

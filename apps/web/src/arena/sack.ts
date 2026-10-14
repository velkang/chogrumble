// The sack interior: the real sack model blown up and cut open at the neck, with a twisted rope rim.
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Plane,
  RepeatWrapping,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Scene, Texture } from 'three';
import { canvasTex } from '../engine/textures';
import type { Models } from '../engine/assets';
import { RIM_FRAC, RIM_Y, SACK_DY, SACK_SCALE_XZ, SACK_SCALE_Y } from './constants';
import { addWeave } from './weave-shader';

export interface Rim {
  /** Centre of the sack opening, in world space. */
  center: Vector3;
  radius: number;
}

const RIM_BAND = 0.012;

/** Measures the neck's centre and mean radius from the vertices near the cut height. */
function measureRim(models: Models): Rim {
  const p = models.sack.geometry.getAttribute('position');
  const ring: number[] = [];
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - RIM_FRAC) < RIM_BAND) ring.push(i);
  const cx = ring.reduce((s, i) => s + p.getX(i), 0) / ring.length;
  const cz = ring.reduce((s, i) => s + p.getZ(i), 0) / ring.length;
  const mean =
    ring.reduce((s, i) => s + Math.hypot(p.getX(i) - cx, p.getZ(i) - cz), 0) / ring.length;
  return {
    center: new Vector3(cx * SACK_SCALE_XZ, RIM_Y, cz * SACK_SCALE_XZ),
    radius: mean * SACK_SCALE_XZ,
  };
}

export function addSack(scene: Scene, models: Models, weaveGrey: Texture): Rim {
  const src = models.sack.material as MeshStandardMaterial;
  const sackMat = src.clone();
  sackMat.side = DoubleSide;
  sackMat.clippingPlanes = [new Plane(new Vector3(0, -1, 0), RIM_Y)];
  sackMat.color = new Color(0.95, 0.9, 1.0);
  const sack = new Mesh(models.sack.geometry, sackMat);
  sack.scale.set(SACK_SCALE_XZ, SACK_SCALE_Y, SACK_SCALE_XZ);
  sack.position.y = SACK_DY;
  sack.receiveShadow = true;
  scene.add(sack);
  const rim = measureRim(models);
  // the model is a solid lump, so cut away everything inside the neck to hollow it out
  addWeave(sackMat, weaveGrey, 0.55, 0.55, [rim.center.x, rim.center.z, rim.radius * 0.82]);
  return rim;
}

function ropeTexture(): CanvasTexture {
  const t = canvasTex(
    256,
    64,
    (c, w, h) => {
      c.fillStyle = '#c9a66b';
      c.fillRect(0, 0, w, h);
      for (let i = -8; i < 40; i++) {
        c.strokeStyle = i % 2 ? '#a8854f' : '#d4b67e';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(i * 8, 0);
        c.lineTo(i * 8 + 32, h);
        c.stroke();
      }
    },
    0,
  );
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(140, 1);
  return t;
}

/** Two twisted strands around the sack opening. */
export function addRope(scene: Scene, rim: Rim): Group {
  const map = ropeTexture();
  const rope = new Group();
  const ropeMat = new MeshStandardMaterial({ map, roughness: 0.9 });
  for (let k = 0; k < 2; k++) {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 400; i++) {
      const a = (i / 400) * Math.PI * 2;
      const tw = a * 26 + k * Math.PI;
      const r = rim.radius + 0.15 + Math.cos(tw) * 0.32;
      pts.push(new Vector3(Math.cos(a) * r, Math.sin(tw) * 0.32, Math.sin(a) * r));
    }
    const tube = new Mesh(
      new TubeGeometry(new CatmullRomCurve3(pts, true), 800, 0.42, 10, true),
      ropeMat,
    );
    tube.castShadow = true;
    rope.add(tube);
  }
  rope.position.copy(rim.center);
  scene.add(rope);
  return rope;
}

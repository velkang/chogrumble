// Follow mode frames both fighters every frame; shot() takes over for set pieces.
import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { Tweens } from '../engine/tween';
import type { FxState } from '../fx/fx';
import { RIM_Y } from '../arena/constants';
import type { Chog } from '../chog/chog';

export type Vec3Tuple = readonly [number, number, number];
export type Shot = readonly [pos: Vec3Tuple, look: Vec3Tuple];

export const SHOTS = {
  /** Looking up from the sack floor at the giant peering in. */
  up: [
    [0.6, 1.2, 4.6],
    [1.2, RIM_Y + 6, -2.5],
  ],
} as const satisfies Record<string, Shot>;

export interface CameraRig {
  shot(pos: Vec3Tuple, look: Vec3Tuple, dur?: number): Promise<void>;
  follow(): void;
  /** Sets the follow target pair (or clears it). */
  track(a: Chog | null, b: Chog | null): void;
  /** Per frame: follow, smooth, sway, shake, and aim the camera. */
  update(dt: number, time: number): void;
}

// the camera stays inside the open side of the sack
const BOUNDS = { cx: 1.0, rx: 6.4, rz: 6.9 } as const;

function framePair(a: Vector3, b: Vector3): { pos: Vector3; look: Vector3 } {
  const m = a.clone().add(b).multiplyScalar(0.5);
  const d = Math.min(9, a.distanceTo(b));
  const y = Math.max(a.y, b.y) * 0.6;
  // look across the line between them so both are seen side-on, from the open side of the sack
  const n = new Vector3(-(b.z - a.z), 0, b.x - a.x);
  if (n.lengthSq() < 1e-4) n.set(0, 0, 1);
  n.normalize();
  if (n.z < 0) n.negate();
  n.lerp(new Vector3(0, 0, 1), 0.35).normalize();
  const dist = 3.6 + d * 0.5;
  let px = m.x + n.x * dist;
  let pz = m.z + n.z * dist;
  const ex = (px - BOUNDS.cx) / BOUNDS.rx;
  const ez = pz / BOUNDS.rz;
  const er = Math.hypot(ex, ez);
  if (er > 1) {
    px = BOUNDS.cx + (ex / er) * BOUNDS.rx;
    pz = (ez / er) * BOUNDS.rz;
  }
  return {
    pos: new Vector3(px, 1.9 + d * 0.12 + y * 0.5, pz),
    look: new Vector3(m.x, 1.2 + y * 0.8, m.z),
  };
}

export function createCameraRig(camera: PerspectiveCamera, tw: Tweens, fx: FxState): CameraRig {
  const cam = { pos: new Vector3(), look: new Vector3(), follow: false };
  const smooth = { pos: new Vector3(), look: new Vector3(), cut: true };
  let pair: [Chog, Chog] | null = null;

  const shot = (pos: Vec3Tuple, look: Vec3Tuple, dur = 0) => {
    cam.follow = false;
    const p0 = cam.pos.clone();
    const l0 = cam.look.clone();
    const p1 = new Vector3(...pos);
    const l1 = new Vector3(...look);
    if (!dur) {
      cam.pos.copy(p1);
      cam.look.copy(l1);
      smooth.cut = true;
      return Promise.resolve();
    }
    return tw.tween(dur, (e) => {
      cam.pos.lerpVectors(p0, p1, e);
      cam.look.lerpVectors(l0, l1, e);
    });
  };

  const update = (dt: number, time: number) => {
    if (cam.follow && pair) {
      const framed = framePair(
        pair[0].g.getWorldPosition(new Vector3()),
        pair[1].g.getWorldPosition(new Vector3()),
      );
      cam.pos.copy(framed.pos);
      cam.look.copy(framed.look);
    }
    const k = smooth.cut ? 1 : 1 - Math.exp(-5 * dt);
    smooth.cut = false;
    smooth.pos.lerp(cam.pos, k);
    smooth.look.lerp(cam.look, k);
    camera.position
      .copy(smooth.pos)
      .add(new Vector3(Math.sin(time * 0.6) * 0.04, Math.sin(time * 0.9) * 0.03, 0));
    if (fx.shakeAmt > 0.001) {
      camera.position.add(
        new Vector3((Math.random() - 0.5) * fx.shakeAmt, (Math.random() - 0.5) * fx.shakeAmt, 0),
      );
      fx.shakeAmt *= Math.pow(0.002, dt);
    }
    camera.lookAt(smooth.look);
  };

  return {
    shot,
    follow: () => {
      cam.follow = true;
    },
    track: (a, b) => {
      pair = a && b ? [a, b] : null;
    },
    update,
  };
}

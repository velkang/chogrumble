// Follow mode frames a group of Chogs every frame; shot() takes over for set pieces.
import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { Tweens } from '../engine/tween';
import type { FxState } from '../fx/fx';
import { ARENA_SCALE, RIM_Y } from '../arena/constants';
import type { Chog } from '../chog/chog';
import { frameGroup } from './framing';

export type Vec3Tuple = readonly [number, number, number];
export type Shot = readonly [pos: Vec3Tuple, look: Vec3Tuple];

export const SHOTS = {
  /** Looking up from the sack floor at the giant peering in. */
  up: [
    [0.6, 1.2, 4.6],
    [1.2, RIM_Y + 6, -2.5],
  ],
  /** The whole sack floor from the open side. */
  // stays inside the sack wall (the opening's radius is about 10 units)
  wide: [
    [1.0 * ARENA_SCALE, 8.2, 7.4],
    [0.6 * ARENA_SCALE, 0.4, -1.4],
  ],
} as const satisfies Record<string, Shot>;

export interface CameraRig {
  shot(pos: Vec3Tuple, look: Vec3Tuple, dur?: number): Promise<void>;
  /** Frames these Chogs every frame until the next shot(). */
  focus(chogs: readonly Chog[]): void;
  /** Seconds since a set piece last took the camera (shot or focus). */
  sinceDirected(time: number): number;
  /** Frames a group without counting as a set piece, so set pieces can still take over. */
  follow(chogs: readonly Chog[]): void;
  /** Per frame: follow, smooth, sway, shake, and aim the camera. */
  update(dt: number, time: number): void;
}

export function createCameraRig(camera: PerspectiveCamera, tw: Tweens, fx: FxState): CameraRig {
  const cam = { pos: new Vector3(), look: new Vector3() };
  const smooth = { pos: new Vector3(), look: new Vector3(), cut: true };
  let group: readonly Chog[] = [];
  let directedAt = -Infinity;

  const shot = (pos: Vec3Tuple, look: Vec3Tuple, dur = 0) => {
    group = [];
    directedAt = tw.now() + dur;
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
    const visible = group.filter((c) => c.g.visible);
    if (visible.length > 0) {
      const framed = frameGroup(visible.map((c) => c.g.getWorldPosition(new Vector3())));
      cam.pos.copy(framed.pos);
      cam.look.copy(framed.look);
    }
    const k = smooth.cut ? 1 : 1 - Math.exp(-4 * dt);
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
    focus: (chogs) => {
      group = chogs;
      directedAt = tw.now();
    },
    follow: (chogs) => {
      group = chogs;
    },
    sinceDirected: (time) => time - directedAt,
    update,
  };
}

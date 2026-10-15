// Moving Chogs around the sack: facing, walking, hopping, squash and knockback.
import { Vector3 } from 'three';
import { ease } from '../engine/tween';
import type { Chog } from '../chog/chog';
import type { StageCtx } from './context';

export function faceTo(c: Chog, x: number, z: number): void {
  c.g.rotation.y = Math.atan2(x - c.g.position.x, z - c.g.position.z);
}

export function faceEachOther(a: Chog, b: Chog): void {
  faceTo(a, b.g.position.x, b.g.position.z);
  faceTo(b, a.g.position.x, a.g.position.z);
}

export function walkTo(ctx: StageCtx, c: Chog, x: number, z: number, dur: number, y = 0): Promise<void> {
  const p0 = c.g.position.clone();
  faceTo(c, x, z);
  c.walking = 1.3;
  return ctx.tw
    .tween(dur, (e) => c.g.position.set(p0.x + (x - p0.x) * e, p0.y + (y - p0.y) * e, p0.z + (z - p0.z) * e))
    .then(() => {
      c.walking = 0;
    });
}

export function squash(ctx: StageCtx, c: Chog): Promise<void> {
  return ctx.tw.tween(
    0.35,
    (_e, p) => {
      const s = 1 - Math.sin(p * Math.PI) * 0.22;
      c.body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    },
    ease.lin,
  );
}

export function hop(ctx: StageCtx, c: Chog, to: Vector3, dur: number, h = 2.5): Promise<void> {
  const p0 = c.g.position.clone();
  faceTo(c, to.x, to.z);
  c.setPose('flail', 12);
  return ctx.tw
    .tween(
      dur,
      (e, p) => c.g.position.set(p0.x + (to.x - p0.x) * e, p0.y + (to.y - p0.y) * e + Math.sin(p * Math.PI) * h, p0.z + (to.z - p0.z) * e),
      ease.lin,
    )
    .then(() => {
      c.setPose('guard', 8);
      void squash(ctx, c);
      ctx.fx.puff(to.clone().setY(to.y + 0.1), 8, 1.2);
    });
}

/** A quick forward lunge and back, for punches and headbutts. */
export function lunge(ctx: StageCtx, c: Chog, dist: number, dur: number): Promise<void> {
  const p0 = c.g.position.clone();
  const d = new Vector3(Math.sin(c.g.rotation.y), 0, Math.cos(c.g.rotation.y));
  return ctx.tw.tween(dur, (_e, p) => c.g.position.copy(p0).addScaledVector(d, Math.sin(p * Math.PI) * dist), ease.lin);
}

/** Pushes a Chog away from `from` along the floor. */
export function knock(ctx: StageCtx, c: Chog, from: Vector3, dist: number, dur: number): Promise<void> {
  const p0 = c.g.position.clone();
  const d = p0.clone().sub(from).setY(0);
  if (d.lengthSq() < 1e-6) d.set(0, 0, 1);
  d.setLength(dist);
  return ctx.tw.tween(dur, (e) => c.g.position.set(p0.x + d.x * e, p0.y, p0.z + d.z * e), ease.out);
}

/** Steps toward `target` until `gap` units apart (no-op if already close). */
export function closeIn(ctx: StageCtx, c: Chog, target: Chog, gap: number, dur: number): Promise<void> {
  const d = target.g.position.clone().sub(c.g.position).setY(0);
  const len = d.length();
  if (len <= gap + 0.1) {
    faceTo(c, target.g.position.x, target.g.position.z);
    return Promise.resolve();
  }
  d.multiplyScalar((len - gap) / len);
  return walkTo(ctx, c, c.g.position.x + d.x, c.g.position.z + d.z, dur).then(() =>
    faceTo(c, target.g.position.x, target.g.position.z),
  );
}

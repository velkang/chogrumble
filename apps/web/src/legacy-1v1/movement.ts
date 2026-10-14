// Moving fighters around the sack floor: runs, dashes, hops, knockback, gum, circling.
import { Vector3 } from 'three';
import { ease } from '../engine/tween';
import type { Chog } from '../chog/chog';
import type { Fighter } from '../arena/world';
import { clampFloor as clampToFloor } from './floor-bounds';
import type { Game } from './game';

export function clampFloor(game: Game, x: number, z: number): [number, number] {
  return clampToFloor(x, z, game.world.platform.group.position);
}

export function faceTo(f: Chog, x: number, z: number): void {
  f.g.rotation.y = Math.atan2(x - f.g.position.x, z - f.g.position.z);
}

export function runTo(
  game: Game,
  f: Chog,
  tx: number,
  tz: number,
  dur: number,
  floorY = 0,
): Promise<void> {
  const [x, z] = clampFloor(game, tx, tz);
  const p0 = f.g.position.clone();
  faceTo(f, x, z);
  f.walking = 1.3;
  return game.tw
    .tween(
      dur,
      (e) => {
        f.g.position.set(
          p0.x + (x - p0.x) * e,
          floorY + (p0.y - floorY) * (1 - e),
          p0.z + (z - p0.z) * e,
        );
      },
      ease.inOut,
    )
    .then(() => {
      f.walking = 0;
    });
}

/** Closes the gap to `gap` units in front of the target. */
export function dashAt(game: Game, f: Chog, t: Chog, gap = 1.45, dur = 0.32): Promise<void> {
  const d = t.g.position.clone().sub(f.g.position);
  d.y = 0;
  const len = d.length();
  if (len < gap + 0.15) {
    faceTo(f, t.g.position.x, t.g.position.z);
    return Promise.resolve();
  }
  d.multiplyScalar((len - gap) / len);
  return runTo(game, f, f.g.position.x + d.x, f.g.position.z + d.z, dur).then(() =>
    faceTo(f, t.g.position.x, t.g.position.z),
  );
}

export function squash(game: Game, f: Chog): Promise<void> {
  return game.tw.tween(
    0.35,
    (_e, p) => {
      const s = 1 - Math.sin(p * Math.PI) * 0.22;
      f.body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    },
    ease.lin,
  );
}

export function hop(
  game: Game,
  f: Chog,
  x: number,
  y: number,
  z: number,
  dur: number,
  h = 2.5,
): Promise<void> {
  const p0 = f.g.position.clone();
  faceTo(f, x, z);
  f.setPose('flail', 12);
  return game.tw
    .tween(
      dur,
      (e, p) => {
        f.g.position.set(
          p0.x + (x - p0.x) * e,
          p0.y + (y - p0.y) * e + Math.sin(p * Math.PI) * h,
          p0.z + (z - p0.z) * e,
        );
      },
      ease.lin,
    )
    .then(() => {
      f.setPose('guard', 8);
      squash(game, f);
      game.fx.puff(new Vector3(x, y + 0.1, z), 8, 1.2);
    });
}

export function lunge(game: Game, f: Chog, dist: number, dur: number): Promise<void> {
  const p0 = f.g.position.clone();
  const d = new Vector3(Math.sin(f.g.rotation.y), 0, Math.cos(f.g.rotation.y));
  return game.tw.tween(
    dur,
    (_e, p) => {
      f.g.position.copy(p0).addScaledVector(d, Math.sin(p * Math.PI) * dist);
    },
    ease.lin,
  );
}

export function inGum(game: Game, f: Chog): boolean {
  const p = f.g.position;
  const g = game.world.gumBlob.position;
  return Math.hypot((p.x - g.x) / 1.9, (p.z - g.z) / 1.4) < 1;
}

export function checkGum(game: Game, f: Fighter): void {
  if (inGum(game, f) && !f.stuck) {
    f.stuck = 1;
    f.u.gumMask.value = 0.6;
  }
}

/** Pushes a fighter `dist` away from `from` (or backwards), then checks for gum. */
export function knock(
  game: Game,
  f: Fighter,
  dist: number,
  dur: number,
  from?: Vector3,
): Promise<void> {
  const p0 = f.g.position.clone();
  const d = from
    ? p0.clone().sub(from).setY(0).normalize()
    : new Vector3(-Math.sin(f.g.rotation.y), 0, -Math.cos(f.g.rotation.y));
  const [x, z] = clampFloor(game, p0.x + d.x * dist, p0.z + d.z * dist);
  return game.tw
    .tween(
      dur,
      (e) => f.g.position.set(p0.x + (x - p0.x) * e, p0.y, p0.z + (z - p0.z) * e),
      ease.out,
    )
    .then(() => checkGum(game, f));
}

const CIRCLE_GAP = 2.8;

/** Between moves both fighters circle each other instead of standing still. */
export function updateCircling(game: Game, dt: number): void {
  const { me, foe } = game.match;
  if (!me || !foe) return;
  for (const [f, o] of [
    [me, foe],
    [foe, me],
  ] as const) {
    if (!f.free || f.hp <= 0 || f.stuck) continue;
    const p = f.g.position;
    const q = o.g.position;
    const d = new Vector3(p.x - q.x, 0, p.z - q.z);
    const len = d.length() || 1;
    d.divideScalar(len);
    const tang = new Vector3(-d.z, 0, d.x).multiplyScalar(f.circleDir);
    const v = tang.multiplyScalar(1.1).addScaledVector(d, (CIRCLE_GAP - len) * 1.4);
    const [x, z] = clampFloor(game, p.x + v.x * dt, p.z + v.z * dt);
    const blocked = x !== p.x + v.x * dt || z !== p.z + v.z * dt;
    if (blocked && Math.random() < 0.02) f.circleDir *= -1;
    p.x = x;
    p.z = z;
    p.y += (0 - p.y) * Math.min(1, dt * 8);
    faceTo(f, q.x, q.z);
    f.walking = Math.min(1, v.length() * 0.5);
  }
}

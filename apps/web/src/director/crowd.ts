// Between blows: Chogs keep a little distance from each other, stay on the (shrinking) floor,
// and square up to the nearest rival instead of standing frozen.
import type { Chog } from '../chog/chog';
import { floorAt, PLATFORM } from '../playback/slots';
import { HAT_CLEARANCE } from '../playback/layout';
import { POSES } from '../chog/poses';
import type { PoseName } from '../chog/poses';
import type { StageCtx } from './context';

const PERSONAL_SPACE = 1.25;
/** Chance per second that a Chog with nothing to do throws a taunt. */
const TAUNT_RATE = 0.18;
const TAUNTS: readonly PoseName[] = ['point', 'drum', 'flex', 'victory'];
const TAUNT_HOLD = 0.9;
const taunting = new WeakSet<Chog>();

/** Cosmetic only: idle Chogs show off instead of standing still. */
function maybeTaunt(ctx: StageCtx, c: Chog, dt: number): void {
  if (taunting.has(c) || Math.random() > TAUNT_RATE * dt) return;
  const pose = TAUNTS[Math.floor(Math.random() * TAUNTS.length)]!;
  taunting.add(c);
  c.setPose(pose, 12);
  ctx.tw.wait(TAUNT_HOLD).then(
    () => {
      taunting.delete(c);
      // a swing may have taken over meanwhile; only drop the taunt if it is still showing
      if (c.target === POSES[pose]) c.setPose('guard', 9);
    },
    () => taunting.delete(c),
  );
}

const PUSH = 3.5;
const TURN = 8;
/** Home spots sit on this share of the floor ellipse, so fights happen in pockets around the sack. */
const HOME_RING = 0.62;
const HOME_SLACK = 0.9;
const JOG_SPEED = 2.4;

/** Where each standing Chog's home spot is, spread evenly by seat around the shrinking floor. */
export function homeSpots(seats: readonly string[], out: ReadonlySet<string>, round: number): Map<string, { x: number; z: number }> {
  const f = floorAt(round);
  const ring = seats.filter((id) => !out.has(id));
  return new Map(
    ring.map((id, i) => {
      const a = (i / Math.max(1, ring.length)) * Math.PI * 2 + 0.4;
      return [id, { x: f.cx + Math.cos(a) * f.rx * HOME_RING, z: f.cz + Math.sin(a) * f.rz * HOME_RING }];
    }),
  );
}

/** Jogs a free Chog back toward its home spot. */
function jogHome(c: Chog, home: { x: number; z: number }, dt: number): boolean {
  const dx = home.x - c.g.position.x;
  const dz = home.z - c.g.position.z;
  const d = Math.hypot(dx, dz);
  if (d < HOME_SLACK) return false;
  const step = Math.min(d, JOG_SPEED * dt);
  c.g.position.x += (dx / d) * step;
  c.g.position.z += (dz / d) * step;
  c.g.rotation.y = Math.atan2(dx, dz);
  c.walking = 1;
  return true;
}

function nearest(c: Chog, others: readonly Chog[]): Chog | null {
  let best: Chog | null = null;
  let bestD = Infinity;
  for (const o of others) {
    const d = c.g.position.distanceToSquared(o.g.position);
    if (o !== c && d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

function clampToFloor(c: Chog, round: number): void {
  const f = floorAt(round);
  const p = c.g.position;
  const dx = (p.x - f.cx) / f.rx;
  const dz = (p.z - f.cz) / f.rz;
  const r = Math.hypot(dx, dz);
  if (r > 0.95) {
    p.x = f.cx + (dx / r) * 0.95 * f.rx;
    p.z = f.cz + (dz / r) * 0.95 * f.rz;
  }
  const hx = p.x - PLATFORM.x;
  const hz = p.z - PLATFORM.z;
  const hr = Math.hypot(hx, hz);
  if (hr < HAT_CLEARANCE && p.y < 0.5) {
    p.x = PLATFORM.x + (hx / (hr || 1)) * HAT_CLEARANCE;
    p.z = PLATFORM.z + (hz / (hr || 1)) * HAT_CLEARANCE;
  }
}

export function keepApart(ctx: StageCtx, out: ReadonlySet<string>, round: number, dt: number, seats: readonly string[]): void {
  const homes = homeSpots(seats, out, round);
  const active = [...ctx.cast].filter(([id, c]) => c.g.visible && !out.has(id)).map(([, c]) => c);
  for (const [id, c] of ctx.cast) {
    if (!c.g.visible || out.has(id)) continue;
    const p = c.g.position;
    for (const o of active) {
      if (o === c) continue;
      const dx = p.x - o.g.position.x;
      const dz = p.z - o.g.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.001 && d < PERSONAL_SPACE) {
        const k = ((PERSONAL_SPACE - d) / PERSONAL_SPACE) * PUSH * dt;
        p.x += (dx / d) * k;
        p.z += (dz / d) * k;
      }
    }
    if (ctx.busy.has(id)) continue;
    clampToFloor(c, round);
    const home = homes.get(id);
    if (home && jogHome(c, home, dt)) continue;
    const rival = nearest(c, active);
    if (rival) {
      const want = Math.atan2(rival.g.position.x - p.x, rival.g.position.z - p.z);
      const diff = Math.atan2(Math.sin(want - c.g.rotation.y), Math.cos(want - c.g.rotation.y));
      c.g.rotation.y += diff * Math.min(1, dt * TURN);
    }
    if (c.walking) {
      c.walking = 0;
      c.setPose('guard', 8);
    }
    maybeTaunt(ctx, c, dt);
  }
}

import { POSES, BONES, springAxis, springGains } from './poses';
import type { Chog } from './chog';

const WALK_RATE = 11;
const GUARD_RATE = 5;
const IDLE_RATE = 2.2;

/** Moves each bone along its spring toward the target pose. */
function stepSprings(f: Chog, dt: number): void {
  const { K, D } = springGains(f.k);
  for (const b of BONES) {
    const t = f.target[b];
    const c = f.cur[b];
    const v = f.vel[b];
    for (let i = 0; i < 3; i++) {
      const [angle, vel] = springAxis(c[i]!, v[i]!, t[i]!, K, D, dt);
      c[i] = angle;
      v[i] = vel;
    }
    f.B[b].rotation.set(c[0], c[1], c[2], 'YXZ');
  }
}

/** Walk cycle while moving; otherwise a bounce in guard and a slow breath. */
function stepIdleMotion(f: Chog, dt: number): void {
  const guarding = f.target === POSES.guard;
  f.phase += dt * (f.walking ? WALK_RATE : guarding ? GUARD_RATE : IDLE_RATE);
  const s = Math.sin(f.phase);
  if (f.walking) {
    f.B.legL.rotation.x += s * 0.7 * f.walking;
    f.B.legR.rotation.x -= s * 0.7 * f.walking;
    f.B.armL.rotation.x -= s * 0.5 * f.walking;
    f.B.armR.rotation.x += s * 0.5 * f.walking;
    f.B.hips.position.y = 0.14 + Math.abs(s) * 0.025 * f.walking;
    return;
  }
  // fighters keep bouncing on their toes in guard, so nobody freezes between beats
  const g = guarding ? 1 : 0;
  f.B.hips.position.y = 0.14 + Math.abs(Math.sin(f.phase * 1.6)) * 0.03 * g;
  f.B.spine.rotation.z += Math.sin(f.phase * 0.8) * 0.04 * g * f.bob;
  f.B.spine.scale.y = 1 + s * 0.015 * f.bob;
}

/** Per-frame update: joints follow their target pose on an underdamped spring, plus idle motion. */
export function updateChog(f: Chog, dt: number): void {
  stepSprings(f, dt);
  stepIdleMotion(f, dt);
}

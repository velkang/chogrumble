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
    // a bouncy hop-run: big leg swing, pumping arms, leaning into it
    const w = f.walking;
    f.B.legL.rotation.x += s * 0.85 * w;
    f.B.legR.rotation.x -= s * 0.85 * w;
    f.B.armL.rotation.x -= s * 0.8 * w;
    f.B.armR.rotation.x += s * 0.8 * w;
    f.B.spine.rotation.x += 0.22 * w;
    f.B.spine.rotation.z += Math.cos(f.phase) * 0.06 * w;
    f.B.hips.position.y = 0.14 + Math.abs(s) * 0.06 * w;
    f.body.scale.y = 1 + Math.abs(s) * 0.05 * w;
    return;
  }
  // fighters keep bouncing on their toes in guard, so nobody freezes between beats
  const g = guarding ? 1 : 0;
  f.body.scale.y += (1 - f.body.scale.y) * Math.min(1, dt * 10);
  f.B.hips.position.y = 0.14 + Math.abs(Math.sin(f.phase * 1.6)) * 0.035 * g;
  f.B.spine.rotation.z += Math.sin(f.phase * 0.8) * 0.05 * g * f.bob;
  f.B.spine.rotation.y += Math.sin(f.phase * 0.5) * 0.08 * g * f.bob;
  f.B.head.rotation.y += Math.sin(f.phase * 0.37) * 0.12 * (1 - g) * f.bob;
  // breathing
  f.B.spine.scale.y = 1 + s * 0.02 * f.bob;
}

/** Per-frame update: joints follow their target pose on an underdamped spring, plus idle motion. */
export function updateChog(f: Chog, dt: number): void {
  stepSprings(f, dt);
  stepIdleMotion(f, dt);
}

// A quick bright arc in front of the attacker: the swing's motion trail.
import { AdditiveBlending, Mesh, MeshBasicMaterial, TorusGeometry, Vector3 } from 'three';
import { ease } from '../engine/tween';
import type { Chog } from '../chog/chog';
import type { StageCtx } from './context';

const ARC = new TorusGeometry(0.55, 0.045, 6, 24, Math.PI * 0.75);

/** `low` sweeps at kick height, otherwise at fist height. */
export function swoosh(ctx: StageCtx, c: Chog, color: number, low = false): void {
  const m = new Mesh(ARC, new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
  const yaw = c.g.rotation.y;
  m.position.copy(c.g.position).add(new Vector3(Math.sin(yaw) * 0.55, low ? 0.45 : 0.95, Math.cos(yaw) * 0.55));
  m.rotation.set(Math.PI / 2, 0, -yaw + Math.PI * 0.6);
  m.renderOrder = 9;
  ctx.scene.add(m);
  ctx.tw
    .tween(0.2, (_e, p) => {
      m.rotation.z -= 0.25;
      (m.material as MeshBasicMaterial).opacity = 0.9 * (1 - p);
      m.scale.setScalar(1 + p * 0.4);
    }, ease.out)
    .then(
      () => ctx.scene.remove(m),
      () => ctx.scene.remove(m),
    )
    .finally(() => (m.material as MeshBasicMaterial).dispose());
}

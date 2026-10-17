import type { BufferGeometry } from 'three';
import { BONE_INDEX, smoothstep, vertexWeights } from './skin-weights';

// Fighter-only proportions. The source mesh and its texture/face coordinates stay intact.
export const FIGHTER_SHAPE = {
  armStretch: 2.1,
  legStretch: 3.8,
  shoulderX: 0.24,
  hipY: 0.13,
  elbowLength: 0.1 * 2.1,
  kneeLength: 0.06 * 3.8,
  fistLength: 0.14 * 2.1,
  soleLength: 0.07 * 3.8,
  lift: 0.13 * 2.8,
} as const;

/** Deform only the existing limbs, smoothly blending into the unchanged torso. */
export function fighterVertex(x: number, y: number, z: number): [number, number, number] {
  const w = vertexWeights(x, y);
  const arm = w[BONE_INDEX.armL]! + w[BONE_INDEX.armR]! + w[BONE_INDEX.forearmL]! + w[BONE_INDEX.forearmR]!;
  const leg = w[BONE_INDEX.legL]! + w[BONE_INDEX.legR]! + w[BONE_INDEX.shinL]! + w[BONE_INDEX.shinR]!;
  const hand = arm * smoothstep(0.36, 0.405, Math.abs(x));
  const foot = leg * (1 - smoothstep(0.025, 0.055, y));
  const result: [number, number, number] = [
    x + Math.sign(x) * Math.max(0, Math.abs(x) - FIGHTER_SHAPE.shoulderX) * (FIGHTER_SHAPE.armStretch - 1) * arm + (x - Math.sign(x) * 0.09) * 0.15 * foot,
    y - Math.max(0, FIGHTER_SHAPE.hipY - y) * (FIGHTER_SHAPE.legStretch - 1) * leg + (y - 0.47) * 0.18 * hand,
    z + z * 0.18 * hand + (z - 0.02) * 0.15 * foot,
  ];
  // The source hands taper to points. Gather their existing vertices into round mitts,
  // so a closed fist has visible knuckles instead of becoming an elongated flipper.
  const dx = (Math.abs(x) - 0.435) / 0.06;
  const dy = (y - 0.485) / 0.05;
  const dz = (z - 0.045) / 0.095;
  const length = Math.hypot(dx, dy, dz) || 1;
  const fist = [Math.sign(x) * (0.66 + dx / length * 0.09), 0.485 + dy / length * 0.08, 0.045 + dz / length * 0.085];
  for (let i = 0; i < 3; i++) result[i] = result[i]! + (fist[i]! - result[i]!) * hand;
  return result;
}

/** Skin weights are calculated before this deformation, in the original bind space. */
export function shapeFighter(geometry: BufferGeometry): void {
  const positions = geometry.getAttribute('position');
  geometry.setAttribute('appearancePosition', positions.clone());
  for (let i = 0; i < positions.count; i++) {
    positions.setXYZ(i, ...fighterVertex(positions.getX(i), positions.getY(i), positions.getZ(i)));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

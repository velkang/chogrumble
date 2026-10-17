import { Bone } from 'three';
import { BONES } from './poses';
import type { BoneName } from './poses';
import { BONE_INDEX } from './skin-weights';
import { FIGHTER_SHAPE } from './fighter-shape';

// Bind-space joint locations measured on the existing T-pose; attachments keep their old parents.
const OFFSETS: Record<BoneName, readonly [BoneName | 'root', number, number, number]> = {
  hips: ['root', 0, 0.14, 0], spine: ['hips', 0, 0.2, 0], head: ['spine', 0, 0.22, 0.02],
  armL: ['spine', 0.24, 0.13, 0], armR: ['spine', -0.24, 0.13, 0],
  legL: ['hips', 0.09, -0.01, 0], legR: ['hips', -0.09, -0.01, 0],
  forearmL: ['armL', 0.1, 0, 0], forearmR: ['armR', -0.1, 0, 0],
  shinL: ['legL', 0, -0.06, 0], shinR: ['legR', 0, -0.06, 0],
};
export function buildSkeleton(fighter = false) {
  const root = new Bone(); root.name = 'root';
  const B = {} as Record<BoneName, Bone>;
  for (const name of BONES) {
    const [parent, x, y, z] = OFFSETS[name];
    const bone = new Bone(); bone.name = name; bone.position.set(x, y, z);
    if (fighter && name.startsWith('forearm')) bone.position.x = Math.sign(x) * FIGHTER_SHAPE.elbowLength;
    if (fighter && name.startsWith('shin')) bone.position.y = -FIGHTER_SHAPE.kneeLength;
    (parent === 'root' ? root : B[parent]).add(bone); B[name] = bone;
  }
  const bones = Object.entries({ root, ...B }).sort(([a], [b]) => BONE_INDEX[a as keyof typeof BONE_INDEX] - BONE_INDEX[b as keyof typeof BONE_INDEX]).map(([, bone]) => bone);
  return { root, B, bones };
}

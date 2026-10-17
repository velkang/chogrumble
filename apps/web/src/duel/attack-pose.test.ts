import { describe, expect, it } from 'vitest';
import { DUEL_MOVES } from '@chog/sim';
import type { DuelMove } from '@chog/sim';
import { BONES, POSES } from '../chog/poses';
import { buildSkeleton } from '../chog/skeleton';
import { sampleAttackPose, combatYaw } from './attack-pose';
import { Vector3 } from 'three';

describe('frame-driven attacks', () => {
  it('anticipates, extends on contact, holds active frames and recovers without spring delay', () => {
    for (const [move, data] of Object.entries(DUEL_MOVES)) {
      const sample = (frame: number) => sampleAttackPose({ move: move as DuelMove, frame }, true);
      const rest = move === 'sweep' ? POSES.crouch : move === 'airLight' || move === 'airHeavy' ? POSES.flail : POSES.guard;
      expect(sample(0)).toEqual(rest);
      expect(sample(Math.floor(data.startup * 0.4))).not.toEqual(sample(data.startup));
      expect(sample(data.startup + data.active - 1)).toEqual(sample(data.startup));
      expect(sample(data.startup + data.active + Math.max(10, data.recovery))).toEqual(rest);
      for (const bone of BONES) expect(sample(data.startup)[bone].every(Number.isFinite)).toBe(true);
    }
  });
  it('alternates fists and straightens only the striking elbow', () => {
    const right = sampleAttackPose({ move: 'light', frame: 6 }, true);
    const left = sampleAttackPose({ move: 'light', frame: 6 }, false);
    expect(right).toEqual(POSES.punchR); expect(left).toEqual(POSES.punchL);
    expect(Math.abs(right.forearmR[1])).toBeLessThan(0.1);
    expect(Math.abs(left.forearmL[1])).toBeLessThan(0.1);
    expect(Math.abs(right.forearmL[2])).toBeGreaterThan(1);
  });
  it('chambers a knee before extending a kick; normal attacks keep the head steady', () => {
    const chamber = sampleAttackPose({ move: 'heavy', frame: 5 }, true);
    const kick = sampleAttackPose({ move: 'heavy', frame: 14 }, true);
    expect(chamber.shinR[0]).toBeGreaterThan(1);
    expect(kick.shinR[0]).toBeLessThan(0.1);
    expect(Math.abs(kick.head[0])).toBeLessThan(0.15);
    expect(sampleAttackPose({ move: 'airHeavy', frame: 8 }, true)).toEqual(POSES.airKick);
    expect(POSES.airKick.legL).not.toEqual(kick.legL);
    expect(sampleAttackPose({ move: 'sweep', frame: 12 }, true)).not.toEqual(kick);
  });
  it('mirrors the extended fist toward either opponent', () => {
    for (const facing of [-1, 1]) {
      const { root, B } = buildSkeleton();
      const pose = sampleAttackPose({ move: 'light', frame: 6 }, true);
      for (const name of BONES) B[name].rotation.set(...pose[name], 'YXZ');
      root.rotation.y = combatYaw(facing as -1 | 1, { move: 'light', frame: 6, chain: 1, connected: false, resolved: false }, true); root.updateMatrixWorld(true);
      const fist = B.forearmR.localToWorld(new Vector3(-0.14, 0, 0));
      expect(fist.x * facing).toBeGreaterThan(0.1);
    }
  });
});

import { Group } from 'three';
import { applyPose, updateChog } from '../chog/animate';
import type { Chog } from '../chog/chog';
it('starts interruption recovery from the displayed pose without residual spring velocity', () => {
  const { B } = buildSkeleton();
  const chog = {
    B, body: new Group(), cur: Object.fromEntries(BONES.map((b) => [b, [0, 0, 0]])),
    vel: Object.fromEntries(BONES.map((b) => [b, [4, 4, 4]])),
    k: 18, phase: 0, walking: 0, bob: 0, target: POSES.hurt,
  } as Chog;
  applyPose(chog, sampleAttackPose({ move: 'light', frame: 6 }, true));
  expect(chog.cur.armR).toEqual(POSES.punchR.armR); expect(chog.vel.armR).toEqual([0, 0, 0]);
  updateChog(chog, 1 / 60);
  expect(chog.cur.armR[1]).toBeLessThan(POSES.punchR.armR[1]);
  expect(chog.cur.armR[1]).toBeGreaterThan(POSES.hurt.armR[1]);
});

import { describe, expect, it } from 'vitest';
import { BoxGeometry, Vector3 } from 'three';
import { fighterVertex, shapeFighter, FIGHTER_SHAPE } from './fighter-shape';
import { buildSkeleton } from './skeleton';
import { BONES } from './poses';
import { sampleAttackPose, combatYaw } from '../duel/attack-pose';
import { DUEL_MOVES } from '@chog/sim';

describe('fighter proportions', () => {
  it('preserves the torso, face and head silhouette exactly', () => {
    for (const p of [[0, 0.3, 0.15], [0.1, 0.7, 0.2], [-0.3, 0.8, -0.1], [0, 0.98, 0]] as const) {
      expect(fighterVertex(p[0], p[1], p[2])).toEqual(p);
    }
  });
  it('lengthens limbs symmetrically and gives the hands thickness', () => {
    const left = fighterVertex(0.47, 0.49, 0.04);
    const right = fighterVertex(-0.47, 0.49, 0.04);
    expect(left[0]).toBeGreaterThan(0.7);
    expect(right).toEqual([-left[0], left[1], left[2]]);
    expect(fighterVertex(0.435, 0.52, 0.045)[1]).toBeGreaterThan(0.55);
    expect(fighterVertex(0.09, 0, 0)[1]).toBeCloseTo(-FIGHTER_SHAPE.lift);
  });
  it('keeps texture and appearance coordinates unchanged while updating bounds', () => {
    const g = new BoxGeometry(0.9, 0.1, 0.1).translate(0, 0.47, 0);
    const original = g.getAttribute('position').array.slice();
    const uv = g.getAttribute('uv').array.slice();
    shapeFighter(g);
    expect(g.getAttribute('appearancePosition').array).toEqual(original);
    expect(g.getAttribute('uv').array).toEqual(uv);
    expect(g.getAttribute('position').array).not.toEqual(original);
    expect([...g.getAttribute('normal').array].every(Number.isFinite)).toBe(true);
    expect(g.boundingSphere!.radius).toBeGreaterThan(0.6);
    g.dispose();
  });
  it('moves only fighter elbows/knees; spectator and accessory anchors stay put', () => {
    const normal = buildSkeleton(); const fighter = buildSkeleton(true);
    for (const name of ['head', 'spine', 'armL', 'armR', 'legL', 'legR'] as const) expect(fighter.B[name].position).toEqual(normal.B[name].position);
    expect(fighter.B.forearmL.position.x).toBe(FIGHTER_SHAPE.elbowLength);
    expect(fighter.B.shinR.position.y).toBe(-FIGHTER_SHAPE.kneeLength);
    expect(normal.B.forearmL.position.x).toBe(0.1);
    expect(normal.B.shinR.position.y).toBe(-0.06);
  });
  it('extends fists and feet beyond the body on both facing directions and retracts them', () => {
    for (const facing of [-1, 1] as const) for (const right of [false, true]) for (const move of ['light', 'heavy', 'sweep', 'airLight', 'airHeavy'] as const) {
      const { root, B } = buildSkeleton(true);
      const kick = move === 'heavy' || move === 'sweep' || move === 'airHeavy';
      const limb = kick ? B.shinR : right ? B.forearmR : B.forearmL;
      const tip = kick ? new Vector3(0, -FIGHTER_SHAPE.soleLength, 0.045) : new Vector3((right ? -1 : 1) * FIGHTER_SHAPE.fistLength, 0, 0);
      const at = (frame: number) => {
        const attack = { move, frame, chain: 1 as const, connected: false, resolved: false };
        const pose = sampleAttackPose(attack, right);
        for (const name of BONES) B[name].rotation.set(...pose[name], 'YXZ');
        root.rotation.y = combatYaw(facing, attack, right); root.updateMatrixWorld(true);
        return limb.localToWorld(tip.clone());
      };
      const rest = at(0); const contact = at(DUEL_MOVES[move].startup);
      expect(contact.x * facing).toBeGreaterThan(0.28);
      expect(contact.x * facing).toBeGreaterThan(rest.x * facing + 0.04);
      const recovered = at(DUEL_MOVES[move].startup + DUEL_MOVES[move].active + Math.max(10, DUEL_MOVES[move].recovery));
      expect(recovered.distanceTo(rest)).toBeLessThan(1e-8);
    }
  });
});

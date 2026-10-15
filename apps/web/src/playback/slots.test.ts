import { describe, expect, it } from 'vitest';
import type { Zone } from '@chog/sim';
import { HAT, MIN_SPACING, allocateSlots, floorAt } from './slots';

const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
const zonesOf = (pick: (i: number) => Zone) => Object.fromEntries(ids.map((id, i) => [id, pick(i)]));
const ZONES: Zone[] = ['floor', 'rim', 'gum', 'hat', 'pad'];

const insideFloor = (round: number, x: number, z: number) => {
  const f = floorAt(round);
  return ((x - f.cx) / f.rx) ** 2 + ((z - f.cz) / f.rz) ** 2 <= 1.0001;
};

describe('allocateSlots', () => {
  // the pacing curve leaves about 12 standing early and only a handful by the last rounds
  for (const [round, count] of [[0, 12], [3, 8], [5, 4]] as const) {
    it(`keeps ${count} Chogs apart and on the floor in round ${round}`, () => {
      const some = ids.slice(0, count);
      const slots = allocateSlots(Object.fromEntries(some.map((id, i) => [id, ZONES[i % ZONES.length]!])), round);
      const pts = some.map((id) => slots[id]!);
      for (let a = 0; a < pts.length; a++) {
        if (!pts[a]!.onHat) expect(insideFloor(round, pts[a]!.x, pts[a]!.z)).toBe(true);
        for (let b = a + 1; b < pts.length; b++) {
          expect(Math.hypot(pts[a]!.x - pts[b]!.x, pts[a]!.z - pts[b]!.z)).toBeGreaterThanOrEqual(MIN_SPACING - 1e-6);
        }
      }
    });
  }

  it('puts the first hat-zone Chog on top of the hat and the rest beside it', () => {
    const slots = allocateSlots(zonesOf(() => 'hat'), 0);
    const onHat = ids.filter((id) => slots[id]!.onHat);
    expect(onHat).toHaveLength(1);
    expect(slots[onHat[0]!]).toMatchObject({ x: HAT.x, z: HAT.z });
  });

  it('is deterministic', () => {
    const zones = zonesOf((i) => ZONES[(i * 3) % ZONES.length]!);
    expect(allocateSlots(zones, 2)).toEqual(allocateSlots(zones, 2));
  });

  it('keeps a Chog where it was if that spot is still fine', () => {
    const zones = zonesOf(() => 'floor');
    const first = allocateSlots(zones, 0);
    const again = allocateSlots(zones, 0, first);
    expect(again).toEqual(first);
  });

  it('moves Chogs inward when the drawstring tightens', () => {
    const few = Object.fromEntries(ids.slice(0, 4).map((id) => [id, 'rim' as const]));
    const early = allocateSlots(few, 0);
    const late = allocateSlots(few, 5, early);
    for (const id of Object.keys(few)) expect(insideFloor(5, late[id]!.x, late[id]!.z)).toBe(true);
  });

  it('never fails when the floor is overcrowded', () => {
    const slots = allocateSlots(zonesOf(() => 'floor'), 5);
    expect(Object.keys(slots)).toHaveLength(12);
  });
});

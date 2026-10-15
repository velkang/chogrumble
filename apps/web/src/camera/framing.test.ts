import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CAMERA_BOUNDS, frameGroup } from './framing';

const inBounds = (p: Vector3) =>
  ((p.x - CAMERA_BOUNDS.cx) / CAMERA_BOUNDS.rx) ** 2 + (p.z / CAMERA_BOUNDS.rz) ** 2 <= 1.0001;

describe('frameGroup', () => {
  it('looks at the middle of the group', () => {
    const { look } = frameGroup([new Vector3(-1, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 2)]);
    expect(look.x).toBeCloseTo(0);
    expect(look.z).toBeCloseTo(2 / 3);
  });

  it('pulls back further for a wider group', () => {
    const tight = frameGroup([new Vector3(0, 0, 0), new Vector3(1, 0, 0)]);
    const wide = frameGroup([new Vector3(-3, 0, 0), new Vector3(3, 0, 1), new Vector3(0, 0, -2)]);
    expect(wide.pos.distanceTo(wide.look)).toBeGreaterThan(tight.pos.distanceTo(tight.look));
  });

  it('keeps the camera inside the open side of the sack', () => {
    for (const pts of [
      [new Vector3(6, 0, 5), new Vector3(7, 0, 4)],
      [new Vector3(-5, 0, -4), new Vector3(-6, 0, 3)],
      [new Vector3(0, 0, 0)],
    ]) {
      expect(inBounds(frameGroup(pts).pos)).toBe(true);
    }
  });

  it('handles a single point and throws on none', () => {
    expect(frameGroup([new Vector3(1, 0, 1)]).look.x).toBeCloseTo(1);
    expect(() => frameGroup([])).toThrow(/at least one/);
  });
});

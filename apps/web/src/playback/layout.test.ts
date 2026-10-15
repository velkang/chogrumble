import { describe, expect, it } from 'vitest';
import { FLOOR, clampFloor } from './layout';

const hat = { x: -3.4, z: -2.6 };

describe('clampFloor', () => {
  it('leaves points inside the floor alone', () => {
    expect(clampFloor(2, 1, hat)).toEqual([2, 1]);
  });

  it('pulls points outside the floor ellipse back onto its edge', () => {
    const [x, z] = clampFloor(40, 0, hat);
    expect(x).toBeCloseTo(FLOOR.cx + FLOOR.rx);
    expect(z).toBeCloseTo(0);
  });

  it('pushes points out of the bucket-hat platform', () => {
    const [x, z] = clampFloor(hat.x + 0.5, hat.z, hat);
    expect(Math.hypot(x - hat.x, z - hat.z)).toBeCloseTo(2.9);
  });

  it('handles a point exactly at the hat centre', () => {
    const [x, z] = clampFloor(hat.x, hat.z, hat);
    expect(Number.isFinite(x) && Number.isFinite(z)).toBe(true);
  });
});

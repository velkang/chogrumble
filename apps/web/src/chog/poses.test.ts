import { describe, expect, it } from 'vitest';
import { BONES, POSES, springAxis, springGains } from './poses';

describe('POSES', () => {
  it('defines every bone for every pose', () => {
    for (const pose of Object.values(POSES)) {
      for (const bone of BONES) expect(pose[bone]).toHaveLength(3);
    }
  });
});

describe('springGains', () => {
  it('is slightly underdamped so moves settle with follow-through', () => {
    const { K, D } = springGains(10);
    expect(K).toBeCloseTo(169);
    expect(D / (2 * Math.sqrt(K))).toBeCloseTo(0.62);
  });
});

describe('springAxis', () => {
  const { K, D } = springGains(10);

  it('moves toward the target without mutating anything', () => {
    const [c, v] = springAxis(0, 0, 1, K, D, 1 / 60);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
    expect(v).toBeGreaterThan(0);
  });

  it('settles on the target over time', () => {
    let state: [number, number] = [0, 0];
    for (let i = 0; i < 300; i++) state = springAxis(state[0], state[1], 1, K, D, 1 / 60);
    expect(state[0]).toBeCloseTo(1, 3);
  });

  it('overshoots a little before settling', () => {
    let state: [number, number] = [0, 0];
    let peak = 0;
    for (let i = 0; i < 120; i++) {
      state = springAxis(state[0], state[1], 1, K, D, 1 / 60);
      peak = Math.max(peak, state[0]);
    }
    expect(peak).toBeGreaterThan(1);
  });

  it('snaps straight to the target on a long frame', () => {
    expect(springAxis(0, 3, 1, K, D, 0.5)).toEqual([1, 0]);
  });
});

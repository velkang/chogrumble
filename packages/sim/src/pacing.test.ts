import { describe, expect, it } from 'vitest';
import { PACING, damageScale, targetAlive, urgency } from './pacing';

describe('targetAlive', () => {
  it('starts with everyone and ends with one', () => {
    expect(targetAlive(0, 12)).toBe(12);
    expect(targetAlive(PACING.killEndMs, 12)).toBe(1);
    expect(targetAlive(PACING.killEndMs + 10_000, 12)).toBe(1);
  });

  it('never goes up as time passes', () => {
    for (const n of [8, 10, 12]) {
      let prev = n;
      for (let t = 0; t <= PACING.killEndMs; t += 1000) {
        const v = targetAlive(t, n);
        expect(v).toBeLessThanOrEqual(prev);
        prev = v;
      }
    }
  });

  it('holds everyone until the drop is over', () => {
    expect(targetAlive(PACING.graceMs - 1, 10)).toBe(10);
  });
});

describe('urgency and damageScale', () => {
  it('is zero when on the curve and grows when too many are alive', () => {
    expect(urgency(0, 12, 12)).toBe(0);
    expect(urgency(PACING.killEndMs, 4, 12)).toBe(3);
  });

  it('hits harder once only a few are left, so the final duel drains HP', () => {
    const crowded = damageScale({ urgency: 0, t: 30_000, standing: 10 });
    const fewLeft = damageScale({ urgency: 0, t: 120_000, standing: 3 });
    expect(fewLeft).toBeGreaterThan(crowded);
  });

  it('boosts damage when behind the curve, up to the cap', () => {
    expect(damageScale({ urgency: 2, t: 60_000, standing: 8 })).toBeGreaterThan(100);
    expect(damageScale({ urgency: 50, t: 60_000, standing: 60 })).toBe(PACING.maxScale);
  });

  it('goes all out once the kill window has opened', () => {
    expect(damageScale({ urgency: 1, t: PACING.killEndMs, standing: 2 })).toBe(PACING.finaleScale);
  });
});

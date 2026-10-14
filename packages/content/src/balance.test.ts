import { describe, expect, it } from 'vitest';
import { runBalance } from './balance';

describe('balance', () => {
  // seeded, so this is a stable gate rather than a flaky statistical test
  const report = runBalance(4000, 'balance-gate');

  it('keeps every special within 3 points of a fair win rate', () => {
    const specials = report.groups.filter((g) => g.group.startsWith('special='));
    expect(specials.length).toBe(5);
    for (const g of specials) expect(Math.abs(g.edgePp), g.group).toBeLessThanOrEqual(3);
  });

  it('keeps common tiers within 3 points of a fair win rate', () => {
    const tiers = report.groups.filter((g) => g.group.startsWith('tier=') && g.appearances >= 1000);
    expect(tiers.length).toBeGreaterThan(0);
    for (const g of tiers) expect(Math.abs(g.edgePp), g.group).toBeLessThanOrEqual(3);
  });

  it('reports a fair rate of 1 in 12', () => {
    expect(report.fairRatePct).toBeCloseTo(100 / 12);
  });
});

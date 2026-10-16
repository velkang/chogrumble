import { describe, expect, it } from 'vitest';
import { pickHouseChogs } from './roster';

describe('pickHouseChogs', () => {
  it('is deterministic for a seed', () => {
    expect(pickHouseChogs('picks-1', 5, new Set())).toEqual(
      pickHouseChogs('picks-1', 5, new Set()),
    );
  });

  it('never repeats a Chog and never picks an excluded one', () => {
    const exclude = new Set([1, 2, 3, 4, 5]);
    const picks = pickHouseChogs('picks-2', 12, exclude);
    expect(new Set(picks.map((p) => p.tokenId)).size).toBe(12);
    for (const p of picks) expect(exclude.has(p.tokenId!)).toBe(false);
    for (const p of picks) expect(p.house).toBe(true);
  });

  it('returns nothing when asked for nothing', () => {
    expect(pickHouseChogs('x', 0, new Set())).toEqual([]);
  });
});

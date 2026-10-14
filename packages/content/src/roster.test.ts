import { describe, expect, it } from 'vitest';
import { MAX_ROSTER, MIN_ROSTER, buildRoster, pickHouseChogs } from './roster';

describe('pickHouseChogs', () => {
  it('is deterministic for a seed', () => {
    expect(pickHouseChogs('lobby-1', 5, new Set())).toEqual(
      pickHouseChogs('lobby-1', 5, new Set()),
    );
  });

  it('never repeats a Chog and never picks an excluded one', () => {
    const exclude = new Set([1, 2, 3, 4, 5]);
    const picks = pickHouseChogs('lobby-2', 12, exclude);
    expect(new Set(picks.map((p) => p.tokenId)).size).toBe(12);
    for (const p of picks) expect(exclude.has(p.tokenId!)).toBe(false);
    for (const p of picks) expect(p.house).toBe(true);
  });

  it('returns nothing when asked for nothing', () => {
    expect(pickHouseChogs('x', 0, new Set())).toEqual([]);
  });
});

describe('buildRoster', () => {
  it('fills an empty lobby with house Chogs up to the minimum', () => {
    const r = buildRoster([], 'empty');
    expect(r).toHaveLength(MIN_ROSTER);
    expect(r.every((f) => f.house)).toBe(true);
  });

  it('keeps entrants first and tops up with house Chogs', () => {
    const r = buildRoster([10, 20, 30], 'three');
    expect(r).toHaveLength(MIN_ROSTER);
    expect(r.slice(0, 3).map((f) => f.tokenId)).toEqual([10, 20, 30]);
    expect(r.slice(0, 3).every((f) => !f.house)).toBe(true);
    expect(r.slice(3).every((f) => f.house)).toBe(true);
  });

  it('does not add house Chogs when entrants already fill the minimum', () => {
    const entrants = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const r = buildRoster(entrants, 'ten');
    expect(r).toHaveLength(10);
    expect(r.some((f) => f.house)).toBe(false);
  });

  it('rejects more entrants than a match holds, duplicates and unknown tokens', () => {
    expect(() =>
      buildRoster(
        Array.from({ length: MAX_ROSTER + 1 }, (_, i) => i + 1),
        'x',
      ),
    ).toThrow(/at most/);
    expect(() => buildRoster([5, 5], 'x')).toThrow(/twice/);
    expect(() => buildRoster([99999], 'x')).toThrow(/Unknown/);
  });
});

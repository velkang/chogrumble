import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng('match-1');
    const b = createRng('match-1');
    const seq = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(seq);
  });

  it('gives different sequences for different seeds', () => {
    expect(createRng('a').next()).not.toBe(createRng('b').next());
  });

  it('returns unsigned 32-bit integers', () => {
    const r = createRng('u32');
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(2 ** 32);
    }
  });

  it('int(n) stays in [0, n) and hits every value', () => {
    const r = createRng('int');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('range(lo, hi) is inclusive on both ends', () => {
    const r = createRng('range');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.range(4, 7));
    expect([...seen].sort()).toEqual([4, 5, 6, 7]);
  });

  it('chance(permille) is roughly that often', () => {
    const r = createRng('chance');
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (r.chance(250)) hits++;
    expect(hits).toBeGreaterThan(2300);
    expect(hits).toBeLessThan(2700);
    expect(createRng('x').chance(0)).toBe(false);
    expect(createRng('x').chance(1000)).toBe(true);
  });

  it('pick chooses an element and throws on an empty list', () => {
    const r = createRng('pick');
    expect(['a', 'b', 'c']).toContain(r.pick(['a', 'b', 'c']));
    expect(() => r.pick([])).toThrow(/empty/);
  });

  it('weighted respects weights and never picks zero weights', () => {
    const r = createRng('weighted');
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 8000; i++)
      counts[
        r.weighted([
          ['a', 1],
          ['b', 3],
          ['c', 0],
        ] as const)
      ]++;
    expect(counts.c).toBe(0);
    expect(counts.b / counts.a).toBeGreaterThan(2.6);
    expect(counts.b / counts.a).toBeLessThan(3.4);
    expect(() => r.weighted([['a', 0]])).toThrow(/weight/);
  });
});

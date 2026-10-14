import { describe, expect, it } from 'vitest';
import { statsFromTraits } from '@chog/sim';
import { CHOGS, chogByToken, toFighter, traitCoverage } from './chogs';

describe('CHOGS', () => {
  it('has every Chog Genesis token once', () => {
    expect(CHOGS).toHaveLength(1969);
    expect(new Set(CHOGS.map((c) => c.tokenId)).size).toBe(1969);
    expect(Math.min(...CHOGS.map((c) => c.tokenId))).toBe(1);
    expect(Math.max(...CHOGS.map((c) => c.tokenId))).toBe(1969);
  });

  it('keeps the shuffled reveal: token 964 is CHOG #456', () => {
    expect(chogByToken(964)?.name).toBe('CHOG #456');
  });

  it('returns undefined for tokens that do not exist', () => {
    expect(chogByToken(0)).toBeUndefined();
    expect(chogByToken(5000)).toBeUndefined();
  });

  it('gives every Chog valid stats, including the 1:1s with only two traits', () => {
    for (const c of CHOGS) {
      const s = statsFromTraits(c.traits);
      expect(s.maxHp).toBeGreaterThan(0);
    }
    const oneOfOnes = CHOGS.filter((c) => c.traits['Base'] === '1:1');
    expect(oneOfOnes).toHaveLength(10);
  });
});

describe('toFighter', () => {
  it('turns a Chog into a sim fighter keyed by token', () => {
    const c = chogByToken(1)!;
    expect(toFighter(c)).toEqual({ id: 'token:1', name: c.name, tokenId: 1, traits: c.traits });
    expect(toFighter(c, { house: true }).house).toBe(true);
  });
});

describe('traitCoverage', () => {
  it('reports how many Chogs get a special and which trait values change stats', () => {
    const cov = traitCoverage();
    expect(cov.total).toBe(1969);
    expect(cov.withSpecial).toBeGreaterThan(0);
    expect(cov.withSpecial).toBeLessThan(cov.total);
    expect(cov.mappedValues).toBeGreaterThan(30);
  });
});

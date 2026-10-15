import { describe, expect, it } from 'vitest';
import { OWNERS_BLOCK, ownerAtSnapshot, tokensOwnedBy } from './owners';

describe('owners snapshot', () => {
  it('knows an owner for every token', () => {
    for (let id = 1; id <= 1969; id++) expect(ownerAtSnapshot(id)).toMatch(/^0x[0-9a-f]{40}$/);
    expect(OWNERS_BLOCK).toBeGreaterThan(0);
  });

  it('finds a wallet’s tokens, ignoring address case', () => {
    const owner = ownerAtSnapshot(1)!;
    expect(tokensOwnedBy(owner)).toContain(1);
    expect(tokensOwnedBy(owner.toUpperCase().replace('0X', '0x'))).toContain(1);
  });

  it('returns nothing for unknown or malformed addresses', () => {
    expect(tokensOwnedBy('0x0000000000000000000000000000000000000001')).toEqual([]);
    expect(tokensOwnedBy('not an address')).toEqual([]);
  });
});

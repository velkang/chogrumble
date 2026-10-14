import { describe, expect, it } from 'vitest';
import { BASE_STATS, STAT_CAPS, statsFromTraits } from './stats';

describe('statsFromTraits', () => {
  it('gives base stats to a Chog with no special traits', () => {
    expect(statsFromTraits({})).toEqual(BASE_STATS);
  });

  it('ignores unknown traits and values', () => {
    expect(statsFromTraits({ Mystery: 'Thing', Eyes: 'Never Seen' })).toEqual(BASE_STATS);
  });

  it('turns laser eyes into the laser special', () => {
    for (const eyes of ['Purple laser', 'fire laser', 'Green laser', 'cyan laser']) {
      expect(statsFromTraits({ Eyes: eyes }).special).toBe('laser');
    }
  });

  it('turns mouths into specials', () => {
    expect(statsFromTraits({ Mouth: 'Bubblegum' }).special).toBe('bubble');
    expect(statsFromTraits({ Mouth: 'Rainbow Puke' }).special).toBe('puke');
    expect(statsFromTraits({ Mouth: 'BTC Coin' }).special).toBe('coin');
    expect(statsFromTraits({ Mouth: 'Mon coin' }).special).toBe('coin');
  });

  it('prefers the eyes special over the mouth special', () => {
    expect(statsFromTraits({ Eyes: 'fire laser', Mouth: 'Bubblegum' }).special).toBe('laser');
  });

  it('gives armour defence and royalty extra HP', () => {
    expect(statsFromTraits({ Body: 'Golden Armor' }).defense).toBeGreaterThan(BASE_STATS.defense);
    expect(statsFromTraits({ Head: 'Spartan Helmet' }).defense).toBeGreaterThan(BASE_STATS.defense);
    expect(statsFromTraits({ Head: 'Crown' }).maxHp).toBeGreaterThan(BASE_STATS.maxHp);
    expect(statsFromTraits({ Body: 'Kings Robe' }).maxHp).toBeGreaterThan(BASE_STATS.maxHp);
  });

  it('gives the knife accessory extra crit', () => {
    expect(statsFromTraits({ Accessory: 'Knife' }).crit).toBeGreaterThan(BASE_STATS.crit);
  });

  it('keeps tiers as sidegrades: no tier is strictly better on every stat', () => {
    for (const tier of ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']) {
      const s = statsFromTraits({ Tier: tier });
      const better = (['maxHp', 'power', 'defense', 'speed', 'crit', 'dodge'] as const).filter(
        (k) => s[k] > BASE_STATS[k],
      );
      const worse = (['maxHp', 'power', 'defense', 'speed', 'crit', 'dodge'] as const).filter(
        (k) => s[k] < BASE_STATS[k],
      );
      if (better.length > 0) expect(worse.length).toBeGreaterThan(0);
    }
  });

  it('never exceeds the stat caps, even with every bonus stacked', () => {
    const s = statsFromTraits({
      Head: 'Crown',
      Body: 'Golden Armor',
      Accessory: 'Knife',
      Tier: 'Legendary',
      Eyes: 'fire laser',
      Base: 'Skull',
    });
    for (const [k, [lo, hi]] of Object.entries(STAT_CAPS)) {
      const v = s[k as keyof typeof STAT_CAPS];
      expect(v).toBeGreaterThanOrEqual(lo);
      expect(v).toBeLessThanOrEqual(hi);
    }
  });

  it('returns whole numbers only', () => {
    const s = statsFromTraits({ Head: 'Crown', Tier: 'Epic', Accessory: 'Knife' });
    for (const k of ['maxHp', 'power', 'defense', 'speed', 'crit', 'dodge'] as const)
      expect(Number.isInteger(s[k])).toBe(true);
  });
});

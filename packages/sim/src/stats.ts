import { TRAIT_MODS, TRAIT_ORDER } from './data/trait-mods';

export type SpecialKey = 'laser' | 'bubble' | 'puke' | 'coin' | 'none';
export type StatKey = 'maxHp' | 'power' | 'defense' | 'speed' | 'crit' | 'dodge';

/** crit and dodge are per-mille chances; power scales damage (10 = 100%). */
export interface Stats {
  maxHp: number;
  power: number;
  defense: number;
  speed: number;
  crit: number;
  dodge: number;
  special: SpecialKey;
}

export const BASE_STATS: Readonly<Stats> = {
  maxHp: 100,
  power: 10,
  defense: 0,
  speed: 10,
  crit: 60,
  dodge: 90,
  special: 'none',
};

export const STAT_CAPS: Readonly<Record<StatKey, readonly [number, number]>> = {
  maxHp: [80, 115],
  power: [8, 12],
  defense: [0, 3],
  speed: [7, 13],
  crit: [30, 140],
  dodge: [40, 150],
};

const STAT_KEYS = Object.keys(STAT_CAPS) as StatKey[];
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));

/** A fighter's stats from its NFT traits. Unknown traits change nothing. */
export function statsFromTraits(traits: Readonly<Record<string, string>>): Stats {
  const mods = TRAIT_ORDER.flatMap((type) => {
    const value = traits[type];
    const mod = value === undefined ? undefined : TRAIT_MODS[type]?.[value];
    return mod ? [mod] : [];
  });
  const special = mods.find((m) => m.special)?.special ?? BASE_STATS.special;
  const totals = Object.fromEntries(
    STAT_KEYS.map((k) => [
      k,
      clamp(
        mods.reduce((s, m) => s + (m[k] ?? 0), BASE_STATS[k]),
        STAT_CAPS[k],
      ),
    ]),
  ) as Record<StatKey, number>;
  return { ...totals, special };
}

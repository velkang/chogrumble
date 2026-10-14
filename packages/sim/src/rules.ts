// Tunable game rules. Changing any of these changes outcomes, so bump SIM_VERSION with them.
import type { BasicMove, MeddleKind, MoveKey, Zone } from './types';

/** Damage range [lo, hi] before power, scaling, crits and defence. */
export const MOVE_DAMAGE: Readonly<Record<Exclude<MoveKey, 'recoil'>, readonly [number, number]>> =
  {
    jab: [7, 10],
    kick: [11, 15],
    headbutt: [9, 12],
    dive: [12, 16],
    laser: [11, 15],
    bubble: [9, 12],
    puke: [10, 13],
    coin: [10, 14],
    counter: [4, 7],
  };

export const BASIC_MOVES: readonly (readonly [BasicMove, number])[] = [
  ['jab', 40],
  ['kick', 25],
  ['headbutt', 20],
  ['dive', 15],
];

/** Per-mille chances. */
export const CHANCE = {
  special: 350,
  counter: 200,
  headbuttRecoil: 350,
  /** A gum shot sticks the target only some of the time; always sticking made Bubblegum too strong. */
  bubbleStick: 500,
  revive: 450,
} as const;

export const DURATION = {
  drop: 6000,
  fightBase: 2200,
  /** The final duel gets a longer stare-down before the first blow. */
  duelBase: 3000,
  brawlBase: 2600,
  perHit: 950,
  mishap: 3200,
  meddle: { heart: 5200, gum: 4600, flick: 4000, pluck: 3600 } satisfies Record<MeddleKind, number>,
  zone: 3400,
  elimination: 2600,
  revive: 4200,
  winner: 8000,
} as const;

export const LIMITS = {
  fightExchanges: [2, 4] as const,
  fightMaxHits: 6,
  brawlHits: [3, 6] as const,
  brawlMaxHits: 6,
  reviveHp: 35,
  reviveMinAlive: 4,
  reviveBeforeMs: 120_000,
  stuckTurns: 2,
  bubbleStuckTurns: 1,
  recoilDamage: 3,
} as const;

export const EVENT_WEIGHTS = { fight: 55, brawl: 15, mishap: 10, meddle: 14, revive: 6 } as const;
export const MEDDLE_WEIGHTS: readonly (readonly [Exclude<MeddleKind, 'pluck'>, number])[] = [
  ['heart', 35],
  ['gum', 35],
  ['flick', 30],
];

/** Drawstring rounds: when the zone tightens, and how hard it squeezes. */
export const ZONE_AT_MS = [36_000, 66_000, 96_000, 126_000, 152_000] as const;
export const ZONE_DAMAGE = { base: 3, perRound: 3 } as const;

export const ZONE_WEIGHTS: readonly (readonly [Zone, number])[] = [
  ['floor', 50],
  ['rim', 20],
  ['gum', 10],
  ['hat', 10],
  ['pad', 10],
];

// Timing for live matches, in ms. Changing these changes outcomes (bump SIM_VERSION).
import type { MoveKey } from '../types';

export const TICK_MS = 50;

/** Time to step in before the wind-up starts. */
export const APPROACH_MS = 600;
/** Wind-up before each move lands (matches the 3D animations). */
export const LEAD_MS: Readonly<Record<Exclude<MoveKey, 'recoil'>, number>> = {
  jab: 220,
  counter: 200,
  kick: 300,
  headbutt: 300,
  dive: 620,
  laser: 420,
  bubble: 480,
  puke: 500,
  coin: 400,
};
/** How long a strike's impact moment lasts on screen. */
export const STRIKE_MS = 400;
/** Pause after a swing lands before that Chog can swing again. */
export const SWING_GAP_MS = [2000, 3600] as const;
/** At most this many Chogs swing at the same target at once. */
export const MAX_ATTACKERS = 2;
/** Chance (per mille) that a basic blow is blocked: keeps fights busy while landed hits stay punchy. */
export const BLOCK_CHANCE = 450;
/** Chance (per mille) that an AI swing uses its trait special. */
export const AI_SPECIAL_CHANCE = 300;

export const PLAYER = {
  specialCooldownMs: 6000,
  /** The player's special skips most of the approach. */
  specialApproachMs: 250,
  dodgeWindowMs: 900,
  dodgeCooldownMs: 3500,
  rollMs: 600,
} as const;

export const MEDDLE_EVERY_MS = [14_000, 22_000] as const;
export const MISHAP_EVERY_MS = [18_000, 30_000] as const;
/** If more than one Chog is still up here, the giant plucks all but the healthiest. */
export const SUDDEN_DEATH_MS = 172_000;
/** Being stuck in gum costs this much swing time. */
export const STUCK_DELAY_MS = 1500;

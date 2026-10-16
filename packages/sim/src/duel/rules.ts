/** Duel tuning uses integer 60 Hz frames. Coordinates are arena world units. */
export const DUEL_RULES = {
  hz: 60, health: 100, meterMax: 100, specialCost: 50, hitMeter: 10, hurtMeter: 5,
  roundFrames: 60 * 60, introFrames: 120, resultFrames: 150, winsRequired: 2,
  stageEdge: 6, bodyWidth: 1.1, bodyHeight: 2.15, crouchHeight: 1.15,
  walkSpeed: 0.075, jumpSpeed: 0.19, gravity: 0.009,
  inputBufferFrames: 7, blockstun: 10, aiReactionFrames: 12,
} as const;
export type DuelMove = 'light' | 'heavy' | 'sweep' | 'airLight' | 'airHeavy' | 'laser' | 'bubble' | 'puke' | 'coin' | 'dive';
export interface MoveData {
  startup: number; active: number; recovery: number; damage: number;
  reach: number; bottom: number; top: number; stun: number; push: number;
  guard: 'either' | 'low' | 'high'; special?: true; projectileSpeed?: number;
}
export const DUEL_MOVES: Readonly<Record<DuelMove, MoveData>> = {
  light: { startup: 6, active: 3, recovery: 12, damage: 6, reach: 1.05, bottom: 0.55, top: 1.8, stun: 16, push: 0.025, guard: 'either' },
  heavy: { startup: 14, active: 4, recovery: 24, damage: 12, reach: 1.5, bottom: 0.55, top: 1.9, stun: 24, push: 0.12, guard: 'either' },
  sweep: { startup: 12, active: 4, recovery: 24, damage: 10, reach: 1.5, bottom: 0.05, top: 0.6, stun: 22, push: 0.1, guard: 'low' },
  airLight: { startup: 8, active: 4, recovery: 0, damage: 8, reach: 1.2, bottom: -0.65, top: 1.4, stun: 18, push: 0.06, guard: 'high' },
  airHeavy: { startup: 8, active: 4, recovery: 0, damage: 12, reach: 1.5, bottom: -0.9, top: 1.3, stun: 24, push: 0.1, guard: 'high' },
  laser: { startup: 30, active: 1, recovery: 30, damage: 18, reach: 0.6, bottom: 0.8, top: 1.3, stun: 28, push: 0.12, guard: 'either', special: true, projectileSpeed: 0.32 },
  coin: { startup: 30, active: 1, recovery: 30, damage: 18, reach: 0.5, bottom: 0.65, top: 1.2, stun: 28, push: 0.12, guard: 'either', special: true, projectileSpeed: 0.18 },
  bubble: { startup: 30, active: 1, recovery: 30, damage: 18, reach: 0.65, bottom: 0.5, top: 1.35, stun: 42, push: 0.06, guard: 'either', special: true, projectileSpeed: 0.12 },
  puke: { startup: 30, active: 8, recovery: 30, damage: 18, reach: 2.35, bottom: 0.4, top: 1.8, stun: 28, push: 0.14, guard: 'either', special: true },
  dive: { startup: 30, active: 12, recovery: 30, damage: 18, reach: 1.1, bottom: 0.2, top: 1.9, stun: 28, push: 0.14, guard: 'either', special: true },
};

import type { FighterSpec } from '../types';
import type { DuelMove } from './rules';
export type DuelSide = 0 | 1;
export type DuelSpecial = 'laser' | 'bubble' | 'puke' | 'coin' | 'dive';
/** Directions/block are held; jump and attacks are presses, consumed once per tick. */
export interface DuelInput {
  /** Horizontal analog movement, clamped to -1..1; digital directions take precedence. */
  moveX?: number;
  left?: boolean; right?: boolean; crouch?: boolean; jump?: boolean;
  light?: boolean; heavy?: boolean; special?: boolean; block?: boolean;
}
export interface DuelAttack {
  move: DuelMove; frame: number; connected: boolean; resolved: boolean; chain: number;
}
export interface DuelFighter {
  id: string; x: number; y: number; vx: number; vy: number; facing: -1 | 1;
  hp: number; meter: number; crouching: boolean; blocking: boolean;
  stun: number; blockstun: number; attack: DuelAttack | null;
  special: DuelSpecial; combo: number; comboUntil: number;
}
export interface DuelProjectile {
  id: number; owner: DuelSide; move: 'laser' | 'bubble' | 'coin';
  x: number; y: number; facing: -1 | 1;
}
export type DuelPhase = 'intro' | 'fight' | 'roundResult' | 'matchResult';
export interface DuelState {
  frame: number; round: number; phase: DuelPhase; phaseFrame: number; remaining: number;
  fighters: [DuelFighter, DuelFighter]; projectiles: DuelProjectile[];
  wins: [number, number]; roundWinner: DuelSide | null; winner: DuelSide | null;
  finish: 'ko' | 'timeout' | 'draw' | null; paused: boolean;
}
export type DuelEvent =
  | { type: 'attack'; side: DuelSide; move: DuelMove }
  | { type: 'hit'; side: DuelSide; target: DuelSide; move: DuelMove; blocked: boolean; damage: number; combo: number }
  | { type: 'round'; round: number }
  | { type: 'fight' }
  | { type: 'roundEnd'; winner: DuelSide | null }
  | { type: 'matchEnd'; winner: DuelSide };
export interface Duel {
  readonly roster: readonly [FighterSpec, FighterSpec];
  /** Snapshots never alias the mutable simulation or earlier snapshots. */
  state(): DuelState;
  step(player?: DuelInput, opponent?: DuelInput): { state: DuelState; events: DuelEvent[] };
  pause(): void;
  resume(): void;
}

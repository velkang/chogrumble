import type { SpecialKey } from './stats';

/** Abstract spots in the sack; the 3D director turns them into floor positions. */
export type Zone = 'floor' | 'rim' | 'gum' | 'hat' | 'pad';
export type BasicMove = 'jab' | 'kick' | 'headbutt' | 'dive';
/** 'recoil' is the self-damage of a headbutt: attacker and target are the same fighter. */
export type MoveKey = BasicMove | Exclude<SpecialKey, 'none'> | 'counter' | 'recoil';
export type MishapKind = 'gumSlip' | 'hatFall' | 'ropeBurn' | 'trip';
export type MeddleKind = 'heart' | 'gum' | 'flick' | 'pluck';
export type EliminationCause = 'fight' | 'giant' | 'zone' | 'mishap';

export interface FighterSpec {
  id: string;
  name: string;
  traits: Readonly<Record<string, string>>;
  tokenId?: number;
  house?: boolean;
}

/** A blow from one fighter to another. Dodged blows have dmg 0. */
export interface AttackHit {
  attacker: string;
  target: string;
  move: MoveKey;
  dmg: number;
  crit: boolean;
  dodged: boolean;
  /** Live matches: the target guarded instead of dodging (dmg 0). */
  blocked?: boolean;
  hpAfter: number;
}

/** Damage from the arena or the giant rather than another fighter. */
export interface EnvHit {
  target: string;
  dmg: number;
  hpAfter: number;
}

export interface Moved {
  id: string;
  zone: Zone;
}

interface Timed {
  /** Start time in ms from the match start. */
  at: number;
  /** Duration in ms; the next event starts when this one ends. */
  dur: number;
  /** Where fighters end up after this event. */
  moved: Moved[];
}

export type MatchEvent = Timed &
  (
    | { type: 'drop'; ids: string[] }
    | { type: 'fight'; a: string; b: string; hits: AttackHit[] }
    /** Live matches: a Chog starts a swing that lands at `landsAt` (outcome decided then). */
    | { type: 'swing'; attacker: string; target: string; move: MoveKey; landsAt: number }
    /** Live matches: the swing lands; `hits` holds the blow (and a headbutt's recoil). */
    | { type: 'strike'; hits: AttackHit[] }
    /** Live matches: the player dodge-rolls. */
    | { type: 'roll'; id: string }
    | { type: 'brawl'; ids: string[]; hits: AttackHit[] }
    | { type: 'mishap'; kind: MishapKind; hits: EnvHit[] }
    | { type: 'meddle'; kind: MeddleKind; hits: EnvHit[] }
    | { type: 'zone'; round: number; hits: EnvHit[] }
    | {
        type: 'elimination';
        id: string;
        by: string | null;
        cause: EliminationCause;
        placement: number;
      }
    | { type: 'revive'; id: string; hp: number; aliveBefore: number }
    | { type: 'winner'; id: string }
  );

export type EventType = MatchEvent['type'];

export interface Timeline {
  simVersion: number;
  seed: string;
  roster: FighterSpec[];
  events: MatchEvent[];
  /** End of the last event, in ms. */
  duration: number;
  winner: string;
  /** Fighter ids from 1st to last. */
  placements: string[];
}

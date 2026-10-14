// Match state and the immutable helpers that change it. Damage goes through hurt(), which
// enforces the pacing rule: nobody drops below 1 HP unless an elimination is allowed right now.
import type { Rng } from './rng';
import { damageScale, targetAlive, urgency } from './pacing';
import { statsFromTraits } from './stats';
import type { Stats } from './stats';
import type { FighterSpec, Zone } from './types';

export interface Fighter {
  id: string;
  stats: Stats;
  hp: number;
  zone: Zone;
  stuck: number;
  kills: number;
}

export interface State {
  /** Current sim time, ms. */
  t: number;
  n: number;
  fighters: Readonly<Record<string, Fighter>>;
  /** Ids still standing, in roster order. */
  alive: readonly string[];
  /** Eliminated ids, first out first. */
  out: readonly string[];
  revives: number;
}

export function initialState(roster: readonly FighterSpec[]): State {
  const fighters = Object.fromEntries(
    roster.map((r) => {
      const stats = statsFromTraits(r.traits);
      return [
        r.id,
        { id: r.id, stats, hp: stats.maxHp, zone: 'floor' as Zone, stuck: 0, kills: 0 },
      ];
    }),
  );
  return { t: 0, n: roster.length, fighters, alive: roster.map((r) => r.id), out: [], revives: 0 };
}

export const fighter = (s: State, id: string): Fighter => {
  const f = s.fighters[id];
  if (!f) throw new Error(`Unknown fighter ${id}`);
  return f;
};

export const isUp = (s: State, id: string) => fighter(s, id).hp > 0;
export const standing = (s: State) => s.alive.filter((id) => isUp(s, id));

export function patch(s: State, id: string, changes: Partial<Fighter>): State {
  return { ...s, fighters: { ...s.fighters, [id]: { ...fighter(s, id), ...changes } } };
}

/** Current damage multiplier in percent. */
export const scaleNow = (s: State) => {
  const up = standing(s).length;
  return damageScale({ urgency: urgency(s.t, up, s.n), t: s.t, standing: up });
};

/** Applies damage; returns the new state and the HP left (0 only if an elimination is allowed). */
export function hurt(s: State, id: string, dmg: number): { state: State; hpAfter: number } {
  const f = fighter(s, id);
  const raw = Math.max(0, f.hp - dmg);
  const canDrop = standing(s).length > targetAlive(s.t, s.n);
  const hpAfter = raw === 0 && !canDrop ? 1 : raw;
  return { state: patch(s, id, { hp: hpAfter }), hpAfter };
}

/** Picks a target, favouring the weakest when the match is behind schedule. */
export function pickTarget(s: State, rng: Rng, among: readonly string[]): string {
  const u = urgency(s.t, standing(s).length, s.n);
  if (u === 0) return rng.pick(among);
  return rng.weighted(
    among.map((id) => [id, fighter(s, id).stats.maxHp - fighter(s, id).hp + 10] as const),
  );
}

// A live match: a fixed-tick game loop where every Chog fights at once and the player's buttons
// feed straight in. Same seed + same inputs on the same ticks = the same match.
import { createRng } from '../rng';
import type { Rng } from '../rng';
import { BASIC_MOVES, DURATION, ZONE_AT_MS } from '../rules';
import { fighter, initialState, isUp, patch, standing } from '../state';
import type { State } from '../state';
import { strike } from '../events/combat';
import { meddle, mishap, suddenDeath, zoneSqueeze } from '../events/arena';
import type { Outcome } from '../events/combat';
import { PACING, urgency } from '../pacing';
import { MAX_FIGHTERS, MIN_FIGHTERS } from '../match';
import type { AttackHit, EliminationCause, FighterSpec, MatchEvent, MoveKey } from '../types';
import {
  AI_SPECIAL_CHANCE, APPROACH_MS, BLOCK_CHANCE, LEAD_MS, MAX_ATTACKERS, MEDDLE_EVERY_MS, MISHAP_EVERY_MS, PLAYER,
  STRIKE_MS, STUCK_DELAY_MS, SUDDEN_DEATH_MS, SWING_GAP_MS, TICK_MS,
} from './live-rules';

export { TICK_MS } from './live-rules';

export interface LiveInput {
  special?: boolean;
  dodge?: boolean;
}

export interface PlayerView {
  id: string;
  special: Exclude<MoveKey, 'recoil' | 'counter'>;
  specialReadyIn: number;
  dodgeReadyIn: number;
  dodgingAt(t: number): boolean;
}

export interface LiveMatch {
  readonly roster: readonly FighterSpec[];
  readonly seed: string;
  now(): number;
  /** Advances the match; returns the events that started during this step. */
  step(dtMs: number, input?: LiveInput): MatchEvent[];
  events(): readonly MatchEvent[];
  done(): boolean;
  winner(): string | null;
  /** Fighter ids, winner first (only complete once the match is done). */
  placements(): string[];
  player(): PlayerView | null;
  /** Fighter ids in their seat order around the arena; rivals are mostly picked from nearby seats. */
  seats(): readonly string[];
}

interface Swing {
  attacker: string;
  target: string;
  move: Exclude<MoveKey, 'recoil'>;
  landsAt: number;
}

/**
 * Live matches swing far more often than the turn-based sim. Instead of a fixed softening, damage
 * follows the field's total HP: if the field is ahead of the 3-minute curve, blows soften; behind
 * it, they sharpen. The elimination clamp in hurt() is then only a safety net.
 */
const DAMAGE = { base: 70, gain: 4, min: 8, max: 160 } as const;
const KILL_END_MS = PACING.killEndMs;

/** Share (0..1) of the field's total HP that should be left at time t. */
function hpCurve(t: number): number {
  return Math.min(1, Math.max(0, 1 - (t - DURATION.drop) / (KILL_END_MS - DURATION.drop)));
}

function adaptDamage(rt: Rt): void {
  const all = rt.state.alive.map((id) => fighter(rt.state, id));
  const max = rt.state.n * 100;
  const left = all.reduce((s, f) => s + f.hp, 0) / max;
  const pct = DAMAGE.base * (1 + DAMAGE.gain * (left - hpCurve(rt.t)));
  rt.state = { ...rt.state, damagePct: Math.round(Math.min(DAMAGE.max, Math.max(DAMAGE.min, pct))) };
}
const toTick = (ms: number) => Math.ceil(ms / TICK_MS) * TICK_MS;

interface Rt {
  rng: Rng;
  state: State;
  t: number;
  log: MatchEvent[];
  fresh: MatchEvent[];
  swings: Swing[];
  nextSwingAt: Map<string, number>;
  busyUntil: Map<string, number>;
  downCause: Map<string, { by: string | null; cause: EliminationCause }>;
  pluckQueue: string[];
  lastPluckEnd: number;
  round: number;
  nextMeddleAt: number;
  nextMishapAt: number;
  suddenDeathDone: boolean;
  winner: string | null;
  endAt: number | null;
  player: { id: string; specialReadyAt: number; dodgeReadyAt: number; dodgeFrom: number; dodgeUntil: number } | null;
  seats: readonly string[];
}

/** How much closer seats are preferred as rivals (by steps around the ring of standing Chogs). */
const SEAT_WEIGHT = [0, 4, 4, 2] as const;
const FAR_WEIGHT = 0.4;

/** Steps between two Chogs around the ring of those still standing. */
function seatGap(rt: Rt, a: string, b: string): number {
  const ring = rt.seats.filter((id) => isUp(rt.state, id) && !rt.downCause.has(id));
  const ia = ring.indexOf(a);
  const ib = ring.indexOf(b);
  if (ia < 0 || ib < 0) return ring.length;
  const d = Math.abs(ia - ib);
  return Math.min(d, ring.length - d);
}

function emit(rt: Rt, e: MatchEvent): void {
  rt.log.push(e);
  rt.fresh.push(e);
}

const busy = (rt: Rt, id: string) => (rt.busyUntil.get(id) ?? 0) > rt.t;
const swingingNow = (rt: Rt, id: string) => rt.swings.some((s) => s.attacker === id);
const attackersOn = (rt: Rt, id: string) => rt.swings.filter((s) => s.target === id).length;

function specialOf(rt: Rt, id: string): PlayerView['special'] {
  const s = fighter(rt.state, id).stats.special;
  return s === 'none' ? 'dive' : s;
}

function startSwing(rt: Rt, attacker: string, target: string, move: Swing['move'], approach: number): void {
  const landsAt = rt.t + toTick(approach + LEAD_MS[move]);
  rt.swings.push({ attacker, target, move, landsAt });
  emit(rt, { type: 'swing', at: rt.t, dur: landsAt - rt.t, moved: [], attacker, target, move, landsAt });
}

/** Records who is newly down (HP 0) after an outcome, so the giant can pluck them in turn. */
function noteDowns(rt: Rt, hits: readonly { target: string; hpAfter: number; attacker?: string }[], cause: EliminationCause): void {
  for (const h of hits) {
    if (h.hpAfter !== 0 || rt.downCause.has(h.target)) continue;
    const by = cause === 'fight' && h.attacker && h.attacker !== h.target ? h.attacker : null;
    rt.downCause.set(h.target, { by, cause });
    rt.pluckQueue.push(h.target);
    rt.swings = rt.swings.filter((s) => s.attacker !== h.target && s.target !== h.target);
  }
}

function applyOutcome(rt: Rt, o: Outcome, cause: EliminationCause, busyIds: readonly string[]): void {
  rt.state = o.state;
  emit(rt, o.event);
  const end = o.event.at + o.event.dur;
  for (const id of busyIds) {
    rt.busyUntil.set(id, end);
    rt.swings = rt.swings.filter((s) => s.attacker !== id && s.target !== id);
  }
  if ('hits' in o.event) noteDowns(rt, o.event.hits, cause);
}

function land(rt: Rt, s: Swing): void {
  if (!isUp(rt.state, s.attacker) || !isUp(rt.state, s.target)) return;
  const p = rt.player;
  let hits: AttackHit[];
  const miss = (blocked: boolean): AttackHit[] => [
    { attacker: s.attacker, target: s.target, move: s.move, dmg: 0, crit: false, dodged: !blocked, ...(blocked ? { blocked: true } : {}), hpAfter: fighter(rt.state, s.target).hp },
  ];
  const basic = s.move === 'jab' || s.move === 'kick' || s.move === 'headbutt' || s.move === 'counter';
  if (p && s.target === p.id && rt.t >= p.dodgeFrom && rt.t <= p.dodgeUntil) {
    hits = miss(false);
  } else if (basic && rt.t < KILL_END_MS && rt.rng.chance(BLOCK_CHANCE)) {
    hits = miss(true);
  } else {
    const r = strike(rt.state, rt.rng, s.attacker, s.target, s.move);
    rt.state = r.state;
    hits = r.hits;
  }
  emit(rt, { type: 'strike', at: rt.t, dur: STRIKE_MS, moved: [], hits });
  rt.nextSwingAt.set(s.attacker, rt.t + rt.rng.range(...SWING_GAP_MS));
  noteDowns(rt, hits, 'fight');
}

function chooseTarget(rt: Rt, id: string): string | null {
  const options = standing(rt.state).filter((o) => o !== id && !busy(rt, o) && !rt.downCause.has(o) && attackersOn(rt, o) < MAX_ATTACKERS);
  if (options.length === 0) return null;
  // finishing off the wounded spreads knock-outs through the match instead of bunching them late
  const behind = urgency(rt.t, standing(rt.state).length, rt.state.n) > 0;
  return rt.rng.weighted(
    options.map((o) => {
      const f = fighter(rt.state, o);
      const retaliate = rt.swings.some((s) => s.attacker === o && s.target === id) ? 20 : 0;
      const wounded = Math.floor((f.stats.maxHp - f.hp) * (behind ? 1 : 0.6));
      const gap = seatGap(rt, id, o);
      const near = gap < SEAT_WEIGHT.length ? SEAT_WEIGHT[gap]! : FAR_WEIGHT;
      return [o, Math.max(1, Math.round((10 + retaliate + wounded) * near))] as const;
    }),
  );
}

/** Every free, standing Chog that is off cooldown picks a rival and swings. */
function aiSwings(rt: Rt): void {
  for (const id of standing(rt.state)) {
    if (busy(rt, id) || swingingNow(rt, id) || rt.downCause.has(id) || (rt.nextSwingAt.get(id) ?? 0) > rt.t) continue;
    if (fighter(rt.state, id).stuck > 0) {
      rt.state = patch(rt.state, id, { stuck: 0 });
      rt.nextSwingAt.set(id, rt.t + STUCK_DELAY_MS);
      continue;
    }
    const target = chooseTarget(rt, id);
    if (!target) continue;
    const special = fighter(rt.state, id).stats.special;
    const move = special !== 'none' && rt.rng.chance(AI_SPECIAL_CHANCE) ? special : rt.rng.weighted(BASIC_MOVES);
    startSwing(rt, id, target, move, APPROACH_MS);
  }
}

function playerInput(rt: Rt, input: LiveInput | undefined): void {
  const p = rt.player;
  if (!p || !input || !isUp(rt.state, p.id) || rt.downCause.has(p.id) || busy(rt, p.id)) return;
  if (input.dodge && p.dodgeReadyAt <= rt.t) {
    p.dodgeFrom = rt.t;
    p.dodgeUntil = rt.t + PLAYER.dodgeWindowMs;
    p.dodgeReadyAt = rt.t + PLAYER.dodgeCooldownMs;
    emit(rt, { type: 'roll', at: rt.t, dur: PLAYER.rollMs, moved: [], id: p.id });
  }
  if (input.special && p.specialReadyAt <= rt.t) {
    const current = rt.swings.find((s) => s.attacker === p.id);
    rt.swings = rt.swings.filter((s) => s.attacker !== p.id);
    const target = current && isUp(rt.state, current.target) ? current.target : chooseTarget(rt, p.id);
    if (!target) return;
    startSwing(rt, p.id, target, specialOf(rt, p.id), PLAYER.specialApproachMs);
    p.specialReadyAt = rt.t + PLAYER.specialCooldownMs;
  }
}

function arenaEvents(rt: Rt): void {
  const up = standing(rt.state).filter((id) => !rt.downCause.has(id));
  const zoneAt = ZONE_AT_MS[rt.round];
  if (zoneAt !== undefined && rt.t >= zoneAt) {
    rt.round++;
    applyOutcome(rt, zoneSqueeze(rt.state, rt.rng, rt.round), 'zone', []);
  }
  if (up.length > 2 && rt.t >= rt.nextMeddleAt) {
    const o = meddle(rt.state, rt.rng);
    applyOutcome(rt, o, 'giant', 'hits' in o.event ? o.event.hits.map((h) => h.target) : []);
    rt.nextMeddleAt = rt.t + rt.rng.range(...MEDDLE_EVERY_MS);
  }
  if (up.length > 2 && rt.t >= rt.nextMishapAt) {
    const o = mishap(rt.state, rt.rng);
    applyOutcome(rt, o, 'mishap', 'hits' in o.event ? o.event.hits.map((h) => h.target) : []);
    rt.nextMishapAt = rt.t + rt.rng.range(...MISHAP_EVERY_MS);
  }
  if (!rt.suddenDeathDone && rt.t >= SUDDEN_DEATH_MS && up.length > 1) {
    rt.suddenDeathDone = true;
    rt.swings = [];
    applyOutcome(rt, suddenDeath(rt.state, 1), 'giant', []);
  }
}

/** The giant plucks downed Chogs one at a time, then crowns the last one standing. */
function plucksAndWinner(rt: Rt): void {
  while (rt.pluckQueue.length > 0 && rt.lastPluckEnd <= rt.t) {
    const id = rt.pluckQueue.shift()!;
    const { by, cause } = rt.downCause.get(id)!;
    emit(rt, { type: 'elimination', at: rt.t, dur: DURATION.elimination, moved: [], id, by, cause, placement: rt.state.alive.length });
    rt.state = { ...rt.state, alive: rt.state.alive.filter((x) => x !== id), out: [...rt.state.out, id] };
    rt.lastPluckEnd = rt.t + DURATION.elimination;
  }
  const up = standing(rt.state);
  if (rt.winner === null && up.length === 1 && rt.pluckQueue.length === 0 && rt.lastPluckEnd <= rt.t) {
    rt.winner = up[0]!;
    rt.swings = [];
    emit(rt, { type: 'winner', at: rt.t, dur: DURATION.winner, moved: [{ id: rt.winner, zone: 'hat' }], id: rt.winner });
    rt.endAt = rt.t + DURATION.winner;
  }
}

function tick(rt: Rt, input: LiveInput | undefined): void {
  rt.t += TICK_MS;
  rt.state = { ...rt.state, t: rt.t };
  if (rt.t < DURATION.drop || rt.winner !== null) return;
  playerInput(rt, input);
  adaptDamage(rt);
  const due = rt.swings.filter((s) => s.landsAt <= rt.t);
  rt.swings = rt.swings.filter((s) => s.landsAt > rt.t);
  due.forEach((s) => land(rt, s));
  arenaEvents(rt);
  plucksAndWinner(rt);
  if (rt.winner === null) aiSwings(rt);
}

function validate(roster: readonly FighterSpec[], playerId: string | null): void {
  if (roster.length < MIN_FIGHTERS || roster.length > MAX_FIGHTERS) {
    throw new Error(`A match needs ${MIN_FIGHTERS} to ${MAX_FIGHTERS} fighters, got ${roster.length}`);
  }
  if (new Set(roster.map((r) => r.id)).size !== roster.length) throw new Error('Roster has duplicate fighter ids');
  if (playerId !== null && !roster.some((r) => r.id === playerId)) throw new Error(`The player ${playerId} is not in the roster`);
}

export function createLiveMatch(opts: { roster: readonly FighterSpec[]; seed: string; playerId: string | null }): LiveMatch {
  validate(opts.roster, opts.playerId);
  const rng = createRng(`live:${opts.seed}`);
  const ids = opts.roster.map((r) => r.id);
  const pool = [...ids];
  const seats = ids.map(() => pool.splice(rng.int(pool.length), 1)[0]!);
  const rt: Rt = {
    rng,
    state: { ...initialState(opts.roster), damagePct: DAMAGE.base },
    t: 0,
    log: [],
    fresh: [],
    swings: [],
    nextSwingAt: new Map(ids.map((id) => [id, DURATION.drop + rng.range(0, 1500)])),
    busyUntil: new Map(),
    downCause: new Map(),
    pluckQueue: [],
    lastPluckEnd: 0,
    round: 0,
    nextMeddleAt: DURATION.drop + rng.range(...MEDDLE_EVERY_MS),
    nextMishapAt: DURATION.drop + rng.range(...MISHAP_EVERY_MS),
    suddenDeathDone: false,
    winner: null,
    endAt: null,
    player: opts.playerId === null ? null : { id: opts.playerId, specialReadyAt: DURATION.drop, dodgeReadyAt: DURATION.drop, dodgeFrom: -1, dodgeUntil: -1 },
    seats,
  };
  emit(rt, { type: 'drop', at: 0, dur: DURATION.drop, moved: ids.map((id) => ({ id, zone: 'floor' })), ids });
  rt.fresh = [];
  const roster = opts.roster.map((r) => ({ ...r, traits: { ...r.traits } }));

  return {
    roster,
    seed: opts.seed,
    now: () => rt.t,
    step(dtMs, input) {
      rt.fresh = [];
      const ticks = Math.max(1, Math.round(dtMs / TICK_MS));
      for (let i = 0; i < ticks && !(rt.endAt !== null && rt.t >= rt.endAt); i++) tick(rt, i === 0 ? input : undefined);
      return rt.fresh;
    },
    events: () => rt.log,
    seats: () => rt.seats,
    done: () => rt.endAt !== null && rt.t >= rt.endAt,
    winner: () => rt.winner,
    placements: () => (rt.winner ? [rt.winner, ...[...rt.state.out].reverse()] : [...rt.state.out].reverse()),
    player() {
      const p = rt.player;
      if (!p) return null;
      return {
        id: p.id,
        special: specialOf(rt, p.id),
        specialReadyIn: Math.max(0, p.specialReadyAt - rt.t),
        dodgeReadyIn: Math.max(0, p.dodgeReadyAt - rt.t),
        dodgingAt: (t) => t >= p.dodgeFrom && t <= p.dodgeUntil,
      };
    },
  };
}

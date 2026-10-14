// simulate(roster, seed) → the whole match as a timeline of events. Pure and deterministic:
// the same roster and seed always produce the same timeline, on every machine.
import { createRng } from './rng';
import type { Rng } from './rng';
import { PACING } from './pacing';
import { CHANCE, DURATION, EVENT_WEIGHTS, ZONE_AT_MS } from './rules';
import { fighter, initialState, standing } from './state';
import type { State } from './state';
import type { EliminationCause, FighterSpec, MatchEvent, Timeline } from './types';
import { brawl, duel, fight, pairUp } from './events/combat';
import type { Outcome } from './events/combat';
import { canRevive, meddle, mishap, revive, suddenDeath, zoneSqueeze } from './events/arena';
import { SIM_VERSION } from './version';

export const MIN_FIGHTERS = 2;
export const MAX_FIGHTERS = 12;
const MAX_EVENTS = 2000;

function validate(roster: readonly FighterSpec[]): void {
  if (roster.length < MIN_FIGHTERS || roster.length > MAX_FIGHTERS) {
    throw new Error(
      `A match needs ${MIN_FIGHTERS} to ${MAX_FIGHTERS} fighters, got ${roster.length}`,
    );
  }
  if (new Set(roster.map((r) => r.id)).size !== roster.length)
    throw new Error('Roster has duplicate fighter ids');
}

type Kind = 'fight' | 'brawl' | 'mishap' | 'meddle' | 'revive';

function chooseKind(s: State, rng: Rng): Kind {
  const up = standing(s).length;
  return rng.weighted<Kind>([
    ['fight', EVENT_WEIGHTS.fight],
    ['brawl', up >= 3 ? EVENT_WEIGHTS.brawl : 0],
    ['mishap', EVENT_WEIGHTS.mishap],
    ['meddle', EVENT_WEIGHTS.meddle],
    ['revive', canRevive(s) && rng.chance(CHANCE.revive) ? EVENT_WEIGHTS.revive : 0],
  ]);
}

/** Shortest duel worth staging; with less time than this left, the giant ends it. */
const MIN_DUEL_HITS = 2;

/**
 * Once the kill window opens: the giant thins the field to two, then a duel to the finish, sized
 * to end (with its elimination and the winner's moment) before the hard cap.
 */
function finale(s: State, rng: Rng): Outcome {
  const up = standing(s);
  if (up.length > 2) return suddenDeath(s, 2);
  const budget = PACING.endCapMs - DURATION.winner - DURATION.elimination - s.t;
  const maxHits = Math.floor((budget - DURATION.duelBase) / DURATION.perHit);
  if (maxHits < MIN_DUEL_HITS) return suddenDeath(s, 1);
  return duel(s, rng, up[0]!, up[1]!, maxHits);
}

function nextOutcome(s: State, rng: Rng, round: number): { outcome: Outcome; round: number } {
  if (s.t >= PACING.killEndMs) return { outcome: finale(s, rng), round };
  const zoneAt = ZONE_AT_MS[round];
  if (zoneAt !== undefined && s.t >= zoneAt)
    return { outcome: zoneSqueeze(s, rng, round + 1), round: round + 1 };
  const kind = chooseKind(s, rng);
  if (kind === 'fight') {
    const pair = pairUp(s, rng);
    return { outcome: pair ? fight(s, rng, pair[0], pair[1]) : meddle(s, rng), round };
  }
  const run = { brawl, mishap, meddle, revive: (st: State) => revive(st) }[kind];
  return { outcome: run(s, rng), round };
}

/** Who knocked a fighter out, and how, judging by the event that did it. */
function causeOf(e: MatchEvent, id: string): { by: string | null; cause: EliminationCause } {
  if (e.type === 'fight' || e.type === 'brawl') {
    const blow = [...e.hits].reverse().find((h) => h.target === id && h.hpAfter === 0);
    const by = blow && blow.attacker !== id ? blow.attacker : null;
    return { by, cause: 'fight' };
  }
  if (e.type === 'zone') return { by: null, cause: 'zone' };
  if (e.type === 'mishap') return { by: null, cause: 'mishap' };
  return { by: null, cause: 'giant' };
}

/** Removes everyone at 0 HP, emitting an elimination event for each (in order of the hits). */
function eliminate(s0: State, e: MatchEvent): { state: State; events: MatchEvent[] } {
  const order = 'hits' in e ? [...new Set(e.hits.map((h) => h.target))] : [];
  const fallen = order.filter((id) => s0.alive.includes(id) && fighter(s0, id).hp === 0);
  return fallen.reduce(
    (acc, id) => {
      const placement = acc.state.alive.length;
      const ev: MatchEvent = {
        type: 'elimination',
        at: acc.state.t,
        dur: DURATION.elimination,
        moved: [],
        id,
        placement,
        ...causeOf(e, id),
      };
      const state: State = {
        ...acc.state,
        t: acc.state.t + ev.dur,
        alive: acc.state.alive.filter((x) => x !== id),
        out: [...acc.state.out, id],
      };
      return { state, events: [...acc.events, ev] };
    },
    { state: s0, events: [] as MatchEvent[] },
  );
}

export function simulate(roster: readonly FighterSpec[], seed: string): Timeline {
  validate(roster);
  const rng = createRng(seed);
  const ids = roster.map((r) => r.id);
  let state: State = { ...initialState(roster), t: DURATION.drop };
  const events: MatchEvent[] = [
    {
      type: 'drop',
      at: 0,
      dur: DURATION.drop,
      moved: ids.map((id) => ({ id, zone: 'floor' })),
      ids,
    },
  ];
  let round = 0;
  while (standing(state).length > 1) {
    if (events.length > MAX_EVENTS)
      throw new Error(`Match did not finish within ${MAX_EVENTS} events`);
    const next = nextOutcome(state, rng, round);
    round = next.round;
    const { event } = next.outcome;
    events.push(event);
    const out = eliminate({ ...next.outcome.state, t: state.t + event.dur }, event);
    events.push(...out.events);
    state = out.state;
  }
  const winner = standing(state)[0]!;
  events.push({
    type: 'winner',
    at: state.t,
    dur: DURATION.winner,
    moved: [{ id: winner, zone: 'hat' }],
    id: winner,
  });
  return {
    simVersion: SIM_VERSION,
    seed,
    roster: roster.map((r) => ({ ...r, traits: { ...r.traits } })),
    events,
    duration: state.t + DURATION.winner,
    winner,
    placements: [winner, ...[...state.out].reverse()],
  };
}

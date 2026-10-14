// Fighter-on-fighter events: one-on-one fights and three-way brawls.
import type { Rng } from '../rng';
import { PACING } from '../pacing';
import { BASIC_MOVES, CHANCE, DURATION, LIMITS, MOVE_DAMAGE, ZONE_WEIGHTS } from '../rules';
import { fighter, hurt, isUp, patch, pickTarget, scaleNow, standing } from '../state';
import type { State } from '../state';
import type { AttackHit, MatchEvent, MoveKey, Moved } from '../types';

export interface Outcome {
  state: State;
  event: MatchEvent;
}

function chooseMove(s: State, rng: Rng, attacker: string): Exclude<MoveKey, 'counter' | 'recoil'> {
  const special = fighter(s, attacker).stats.special;
  if (special !== 'none' && rng.chance(CHANCE.special)) return special;
  return rng.weighted(BASIC_MOVES);
}

/** Raw damage for a move: rolled, scaled by power and pacing, crit, minus defence (min 1). */
function rollDamage(
  s: State,
  rng: Rng,
  attacker: string,
  target: string,
  move: Exclude<MoveKey, 'recoil'>,
): { dmg: number; crit: boolean } {
  const [lo, hi] = MOVE_DAMAGE[move];
  const a = fighter(s, attacker).stats;
  const base = Math.floor((rng.range(lo, hi) * a.power * scaleNow(s)) / 1000);
  const crit = rng.chance(a.crit);
  const dmg = Math.max(
    1,
    (crit ? Math.floor((base * 3) / 2) : base) - fighter(s, target).stats.defense,
  );
  return { dmg, crit };
}

/** One blow. Stuck fighters can't dodge, and nobody dodges in the finale; gum sticks the target; a headbutt can hurt both. */
export function strike(
  s: State,
  rng: Rng,
  attacker: string,
  target: string,
  move: Exclude<MoveKey, 'recoil'>,
): { state: State; hits: AttackHit[] } {
  const t = fighter(s, target);
  const canDodge = t.stuck === 0 && s.t < PACING.killEndMs;
  if (canDodge && rng.chance(t.stats.dodge)) {
    return {
      state: s,
      hits: [{ attacker, target, move, dmg: 0, crit: false, dodged: true, hpAfter: t.hp }],
    };
  }
  const { dmg, crit } = rollDamage(s, rng, attacker, target, move);
  const hit = hurt(s, target, dmg);
  const sticks = move === 'bubble' && rng.chance(CHANCE.bubbleStick);
  let state = sticks
    ? patch(hit.state, target, { stuck: LIMITS.bubbleStuckTurns, zone: 'gum' })
    : hit.state;
  const hits: AttackHit[] = [
    { attacker, target, move, dmg, crit, dodged: false, hpAfter: hit.hpAfter },
  ];
  if (hit.hpAfter === 0)
    state = patch(state, attacker, { kills: fighter(state, attacker).kills + 1 });
  if (move === 'headbutt' && rng.chance(CHANCE.headbuttRecoil) && isUp(state, attacker)) {
    const recoil = hurt(state, attacker, LIMITS.recoilDamage);
    state = recoil.state;
    hits.push({
      attacker,
      target: attacker,
      move: 'recoil',
      dmg: LIMITS.recoilDamage,
      crit: false,
      dodged: false,
      hpAfter: recoil.hpAfter,
    });
  }
  return { state, hits };
}

const wander = (rng: Rng, ids: readonly string[]): Moved[] =>
  ids.map((id) => ({ id, zone: rng.weighted(ZONE_WEIGHTS) }));

function settle(s: State, moved: readonly Moved[]): State {
  return moved.reduce(
    (st, m) =>
      isUp(st, m.id)
        ? patch(st, m.id, { zone: m.zone, stuck: Math.max(0, fighter(st, m.id).stuck - 1) })
        : st,
    s,
  );
}

/** Who swings next: faster fighters swing more often; stuck fighters can't swing. */
function nextAttacker(s: State, rng: Rng, a: string, b: string): string {
  const fa = fighter(s, a);
  const fb = fighter(s, b);
  if (fa.stuck > 0 && fb.stuck === 0) return b;
  if (fb.stuck > 0 && fa.stuck === 0) return a;
  return rng.weighted([
    [a, fa.stats.speed],
    [b, fb.stats.speed],
  ] as const);
}

export function fight(s0: State, rng: Rng, a: string, b: string): Outcome {
  let s = s0;
  const hits: AttackHit[] = [];
  const exchanges = rng.range(...LIMITS.fightExchanges);
  for (let i = 0; i < exchanges && hits.length < LIMITS.fightMaxHits; i++) {
    if (!isUp(s, a) || !isUp(s, b)) break;
    const attacker = nextAttacker(s, rng, a, b);
    const target = attacker === a ? b : a;
    const blow = strike(s, rng, attacker, target, chooseMove(s, rng, attacker));
    s = blow.state;
    hits.push(...blow.hits);
    const roomForCounter = hits.length < LIMITS.fightMaxHits;
    if (
      roomForCounter &&
      isUp(s, target) &&
      isUp(s, attacker) &&
      fighter(s, target).stuck === 0 &&
      rng.chance(CHANCE.counter)
    ) {
      const back = strike(s, rng, target, attacker, 'counter');
      s = back.state;
      hits.push(...back.hits);
    }
  }
  const moved = wander(rng, [a, b]);
  return {
    state: settle(s, moved),
    event: {
      type: 'fight',
      at: s0.t,
      dur: DURATION.fightBase + hits.length * DURATION.perHit,
      moved,
      a,
      b,
      hits,
    },
  };
}

export function brawl(s0: State, rng: Rng): Outcome {
  const pool = [...standing(s0)];
  const ids = [0, 1, 2].map(() => pool.splice(rng.int(pool.length), 1)[0]!);
  let s = s0;
  const hits: AttackHit[] = [];
  const count = rng.range(...LIMITS.brawlHits);
  for (let i = 0; i < count && hits.length < LIMITS.brawlMaxHits; i++) {
    const up = ids.filter((id) => isUp(s, id));
    const free = up.filter((id) => fighter(s, id).stuck === 0);
    if (up.length < 2 || free.length === 0) break;
    const attacker = rng.pick(free);
    const target = pickTarget(
      s,
      rng,
      up.filter((id) => id !== attacker),
    );
    const blow = strike(s, rng, attacker, target, chooseMove(s, rng, attacker));
    s = blow.state;
    hits.push(...blow.hits);
  }
  const moved = wander(rng, ids);
  return {
    state: settle(s, moved),
    event: {
      type: 'brawl',
      at: s0.t,
      dur: DURATION.brawlBase + hits.length * DURATION.perHit,
      moved,
      ids,
      hits,
    },
  };
}

/** The final duel: blows until one fighter drops or `maxHits` is reached. Nobody dodges in the finale. */
export function duel(s0: State, rng: Rng, a: string, b: string, maxHits: number): Outcome {
  let s = s0;
  const hits: AttackHit[] = [];
  while (hits.length < maxHits && isUp(s, a) && isUp(s, b)) {
    const attacker = nextAttacker(s, rng, a, b);
    const blow = strike(s, rng, attacker, attacker === a ? b : a, chooseMove(s, rng, attacker));
    s = blow.state;
    hits.push(...blow.hits);
  }
  return {
    state: s,
    event: {
      type: 'fight',
      at: s0.t,
      dur: DURATION.duelBase + hits.length * DURATION.perHit,
      moved: [],
      a,
      b,
      hits,
    },
  };
}

/** Picks a fight pairing: a target (weakest-first when behind schedule) and a free attacker. */
export function pairUp(s: State, rng: Rng): [string, string] | null {
  const up = standing(s);
  const target = pickTarget(s, rng, up);
  const attackers = up.filter((id) => id !== target && fighter(s, id).stuck === 0);
  if (attackers.length === 0) return null;
  return [rng.pick(attackers), target];
}

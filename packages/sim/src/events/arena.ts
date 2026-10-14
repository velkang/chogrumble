// Events the arena and the giant cause: mishaps, meddling, the drawstring zone, revives, sudden death.
import type { Rng } from '../rng';
import { DURATION, LIMITS, MEDDLE_WEIGHTS, ZONE_DAMAGE } from '../rules';
import { fighter, hurt, patch, pickTarget, scaleNow, standing } from '../state';
import type { State } from '../state';
import type { EnvHit, MishapKind, Moved } from '../types';
import type { Outcome } from './combat';

const scaled = (s: State, dmg: number) => Math.max(1, Math.floor((dmg * scaleNow(s)) / 100));

/** Damages each target in turn; returns the new state and the hits. */
function hitAll(
  s0: State,
  targets: readonly string[],
  dmgFor: (s: State) => number,
): { state: State; hits: EnvHit[] } {
  return targets.reduce(
    (acc, id) => {
      const dmg = dmgFor(acc.state);
      const r = hurt(acc.state, id, dmg);
      return { state: r.state, hits: [...acc.hits, { target: id, dmg, hpAfter: r.hpAfter }] };
    },
    { state: s0, hits: [] as EnvHit[] },
  );
}

const MISHAP_BY_ZONE: Readonly<Record<string, MishapKind>> = {
  gum: 'gumSlip',
  hat: 'hatFall',
  rim: 'ropeBurn',
};

export function mishap(s0: State, rng: Rng): Outcome {
  const id = pickTarget(s0, rng, standing(s0));
  const kind = MISHAP_BY_ZONE[fighter(s0, id).zone] ?? 'trip';
  const { state, hits } = hitAll(s0, [id], (s) => scaled(s, rng.range(4, 8)));
  const moved: Moved[] = [{ id, zone: kind === 'gumSlip' ? 'gum' : 'floor' }];
  const stuck =
    kind === 'gumSlip' && hits[0]!.hpAfter > 0 ? LIMITS.stuckTurns : fighter(state, id).stuck;
  return {
    state: patch(state, id, { zone: moved[0]!.zone, stuck }),
    event: { type: 'mishap', at: s0.t, dur: DURATION.mishap, moved, kind, hits },
  };
}

export function meddle(s0: State, rng: Rng): Outcome {
  const kind = rng.weighted(MEDDLE_WEIGHTS);
  const up = standing(s0);
  if (kind === 'gum') {
    const pool = [...up];
    const count = Math.min(pool.length, rng.range(2, 4));
    const targets = Array.from({ length: count }, () => pool.splice(rng.int(pool.length), 1)[0]!);
    const { state, hits } = hitAll(s0, targets, (s) => scaled(s, rng.range(5, 8)));
    const moved = targets.map((id) => ({ id, zone: 'gum' as const }));
    const stuckState = moved.reduce(
      (st, m) => (fighter(st, m.id).hp > 0 ? patch(st, m.id, { zone: 'gum', stuck: 1 }) : st),
      state,
    );
    return {
      state: stuckState,
      event: { type: 'meddle', at: s0.t, dur: DURATION.meddle.gum, moved, kind, hits },
    };
  }
  const target = pickTarget(s0, rng, up);
  const [lo, hi] = kind === 'heart' ? [12, 17] : [7, 11];
  const { state, hits } = hitAll(s0, [target], (s) => scaled(s, rng.range(lo, hi)));
  const moved: Moved[] = [{ id: target, zone: kind === 'heart' ? 'gum' : 'rim' }];
  return {
    state: patch(state, target, { zone: moved[0]!.zone }),
    event: { type: 'meddle', at: s0.t, dur: DURATION.meddle[kind], moved, kind, hits },
  };
}

/** The drawstring tightens: fighters near the rim (and a few unlucky others) get squeezed. */
export function zoneSqueeze(s0: State, rng: Rng, round: number): Outcome {
  const up = standing(s0);
  const count = Math.ceil(up.length / 4);
  const atRim = up.filter((id) => fighter(s0, id).zone === 'rim');
  const others = up.filter((id) => fighter(s0, id).zone !== 'rim');
  const extra = Array.from(
    { length: Math.max(0, count - atRim.length) },
    () => others.splice(rng.int(others.length), 1)[0],
  ).filter((id): id is string => id !== undefined);
  const targets = [...atRim, ...extra];
  const { state, hits } = hitAll(s0, targets, (s) =>
    scaled(s, ZONE_DAMAGE.base + ZONE_DAMAGE.perRound * round),
  );
  const moved = targets.map((id) => ({ id, zone: 'floor' as const }));
  return {
    state: moved.reduce((st, m) => patch(st, m.id, { zone: 'floor' }), state),
    event: { type: 'zone', at: s0.t, dur: DURATION.zone, moved, round, hits },
  };
}

export function canRevive(s: State): boolean {
  return (
    s.revives === 0 &&
    s.out.length > 0 &&
    standing(s).length >= LIMITS.reviveMinAlive &&
    s.t < LIMITS.reviveBeforeMs
  );
}

/** The giant drops the most recently plucked Chog back into the sack. */
export function revive(s0: State): Outcome {
  const id = s0.out[s0.out.length - 1]!;
  const aliveBefore = standing(s0).length;
  const state: State = {
    ...patch(s0, id, { hp: LIMITS.reviveHp, zone: 'floor', stuck: 0 }),
    alive: [...s0.alive, id],
    out: s0.out.slice(0, -1),
    revives: s0.revives + 1,
  };
  return {
    state,
    event: {
      type: 'revive',
      at: s0.t,
      dur: DURATION.revive,
      moved: [{ id, zone: 'floor' }],
      id,
      hp: LIMITS.reviveHp,
      aliveBefore,
    },
  };
}

/** The giant plucks everyone but the `keep` healthiest fighters (ties go to roster order). */
export function suddenDeath(s0: State, keep: number): Outcome {
  const up = standing(s0);
  const ranked = [...up].sort(
    (a, b) => fighter(s0, b).hp - fighter(s0, a).hp || up.indexOf(a) - up.indexOf(b),
  );
  const kept = new Set(ranked.slice(0, keep));
  const targets = up.filter((id) => !kept.has(id));
  const { state, hits } = targets.reduce(
    (acc, id) => ({
      state: patch(acc.state, id, { hp: 0 }),
      hits: [...acc.hits, { target: id, dmg: fighter(acc.state, id).hp, hpAfter: 0 }],
    }),
    { state: s0, hits: [] as EnvHit[] },
  );
  return {
    state,
    event: { type: 'meddle', at: s0.t, dur: DURATION.meddle.pluck, moved: [], kind: 'pluck', hits },
  };
}

// What the HUD shows at any moment of a match: HP, who is out, placements, kills, the round.
// Pure: derived from the events so far and a time, so late joiners and replays land on the same state.
import { statsFromTraits } from '@chog/sim';
import type { FighterSpec, MatchEvent, Zone } from '@chog/sim';

/** A finished timeline, or a live match's events so far (duration Infinity until it ends). */
export interface MatchLog {
  roster: readonly FighterSpec[];
  events: readonly MatchEvent[];
  duration: number;
}
import { hitTime } from '@chog/content';

export interface FighterView {
  id: string;
  name: string;
  tokenId: number | null;
  house: boolean;
  hp: number;
  maxHp: number;
  out: boolean;
  /** Final place once decided (1 = winner). */
  placement: number | null;
  kills: number;
  zone: Zone;
}

export interface PlaybackState {
  /** Match time in ms. */
  t: number;
  /** Index of the event running at t (-1 before the match). */
  event: number;
  round: number;
  alive: number;
  fighters: FighterView[];
  winner: string | null;
  done: boolean;
}

/** Index of the event running at time t: the last event that has started. */
export function eventIndexAt(timeline: MatchLog, t: number): number {
  const { events } = timeline;
  let lo = 0;
  let hi = events.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid]!.at <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

type Views = Map<string, FighterView>;

function startViews(timeline: MatchLog): Views {
  return new Map(
    timeline.roster.map((r) => {
      const maxHp = statsFromTraits(r.traits).maxHp;
      const view: FighterView = {
        id: r.id,
        name: r.name,
        tokenId: r.tokenId ?? null,
        house: r.house ?? false,
        hp: maxHp,
        maxHp,
        out: false,
        placement: null,
        kills: 0,
        zone: 'floor',
      };
      return [r.id, view];
    }),
  );
}

function update(views: Views, id: string, changes: Partial<FighterView>): void {
  const v = views.get(id);
  if (v) views.set(id, { ...v, ...changes });
}

/** Applies one event's effects that have happened by time t. */
function applyEvent(views: Views, e: MatchEvent, t: number): { round?: number; winner?: string } {
  if ('hits' in e) {
    e.hits.forEach((h, i) => {
      if (hitTime(e, i, e.hits.length) <= t) update(views, h.target, { hp: h.hpAfter });
    });
  }
  if (t >= e.at + e.dur) for (const m of e.moved) update(views, m.id, { zone: m.zone });
  switch (e.type) {
    case 'elimination':
      update(views, e.id, { out: true, hp: 0, placement: e.placement });
      if (e.by) update(views, e.by, { kills: (views.get(e.by)?.kills ?? 0) + 1 });
      return {};
    case 'revive':
      update(views, e.id, { out: false, hp: e.hp, placement: null });
      return {};
    case 'zone':
      return { round: e.round };
    case 'winner':
      update(views, e.id, { placement: 1 });
      return { winner: e.id };
    default:
      return {};
  }
}

export function foldTo(timeline: MatchLog, t: number): PlaybackState {
  const views = startViews(timeline);
  let round = 0;
  let winner: string | null = null;
  const last = eventIndexAt(timeline, t);
  for (let i = 0; i <= last; i++) {
    const r = applyEvent(views, timeline.events[i]!, t);
    if (r.round !== undefined) round = r.round;
    if (r.winner !== undefined) winner = r.winner;
  }
  const fighters = timeline.roster.map((r) => views.get(r.id)!);
  return {
    t,
    event: last,
    round,
    alive: fighters.filter((f) => !f.out).length,
    fighters,
    winner,
    done: t >= timeline.duration,
  };
}
